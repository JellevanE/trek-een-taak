import { renderHook, act } from '@testing-library/react';
import { useSoundFx } from '../useSoundFx.js';

describe('useSoundFx', () => {
    let mockAudioContext;
    let mockOscillator;
    let mockGainNode;

    beforeEach(() => {
        // Reset all mocks before each test
        jest.clearAllMocks();

        // Mock AudioContext
        mockGainNode = {
            gain: { value: 0 },
            connect: jest.fn().mockReturnThis()
        };

        mockOscillator = {
            type: 'sine',
            frequency: { value: 440 },
            connect: jest.fn().mockReturnValue(mockGainNode),
            start: jest.fn(),
            stop: jest.fn()
        };

        mockAudioContext = {
            createOscillator: jest.fn(() => mockOscillator),
            createGain: jest.fn(() => mockGainNode),
            destination: {},
            currentTime: 0,
            resume: jest.fn().mockResolvedValue(undefined),
            close: jest.fn().mockResolvedValue(undefined)
        };

        // Mock global AudioContext to prevent real instances from being created
        // Always return the SAME mock instance to prevent reference issues
        global.AudioContext = jest.fn(() => mockAudioContext);
        global.webkitAudioContext = jest.fn(() => mockAudioContext);

        // Mock HTMLAudioElement prototype to prevent real audio elements
        jest.spyOn(window.HTMLAudioElement.prototype, 'play').mockResolvedValue(undefined);
        jest.spyOn(window.HTMLAudioElement.prototype, 'load').mockImplementation(() => { });

        // Store the original createElement before mocking
        const originalCreateElement = document.createElement.bind(document);
        jest.spyOn(document, 'createElement').mockImplementation((tagName) => {
            if (tagName === 'audio') {
                const audioElement = {
                    preload: '',
                    volume: 0,
                    appendChild: jest.fn(),
                    load: jest.fn(),
                    play: jest.fn().mockResolvedValue(undefined),
                    cloneNode: jest.fn(function () {
                        return {
                            preload: this.preload,
                            volume: this.volume,
                            appendChild: jest.fn(),
                            load: jest.fn(),
                            play: jest.fn().mockResolvedValue(undefined),
                            cloneNode: jest.fn()
                        };
                    })
                };
                return audioElement;
            }
            if (tagName === 'source') {
                return { src: '', type: '' };
            }
            // Fall back to real createElement for other elements
            return originalCreateElement(tagName);
        });
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('should initialize with disabled state when no profile provided', () => {
        const { result } = renderHook(() => useSoundFx());

        expect(result.current.enabled).toBe(false);
    });

    it('should initialize with disabled state when profile is disabled', () => {
        const soundFxProfile = { enabled: false };
        const { result } = renderHook(() => useSoundFx({
            soundFxProfile,
            volumePercent: 100
        }));

        expect(result.current.enabled).toBe(false);
    });

    it('should initialize with disabled state when volume is 0', () => {
        const soundFxProfile = { enabled: true, events: {} };
        const { result } = renderHook(() => useSoundFx({
            soundFxProfile,
            volumePercent: 0
        }));

        expect(result.current.enabled).toBe(false);
    });

    it('should initialize with disabled state when prefersReducedMotion is true', () => {
        const soundFxProfile = { enabled: true, events: {} };
        const { result } = renderHook(() => useSoundFx({
            soundFxProfile,
            volumePercent: 100,
            prefersReducedMotion: true
        }));

        expect(result.current.enabled).toBe(false);
    });

    it('should clamp volume to 0-100 range', () => {
        const soundFxProfile = { enabled: true, events: {} };
        const { result: resultHigh } = renderHook(() => useSoundFx({
            soundFxProfile,
            volumePercent: 150
        }));

        expect(resultHigh.current.volumePercent).toBe(100);

        const { result: resultLow } = renderHook(() => useSoundFx({
            soundFxProfile,
            volumePercent: -50
        }));

        expect(resultLow.current.volumePercent).toBe(0);
    });

    it('should handle NaN volume', () => {
        const soundFxProfile = { enabled: true, events: {} };
        const { result } = renderHook(() => useSoundFx({
            soundFxProfile,
            volumePercent: NaN
        }));

        expect(result.current.volumePercent).toBe(0);
    });

    it('should create tone player for events with tone config', () => {
        const soundFxProfile = {
            enabled: true,
            events: {
                testSound: {
                    tone: {
                        frequency: 880,
                        duration: 0.5,
                        type: 'square',
                        volumePercent: 80
                    }
                }
            }
        };

        const { result } = renderHook(() => useSoundFx({
            soundFxProfile,
            volumePercent: 100
        }));

        expect(result.current.enabled).toBe(true);

        act(() => {
            result.current.play('testSound');
        });

        expect(mockAudioContext.createOscillator).toHaveBeenCalled();
        expect(mockOscillator.frequency.value).toBe(880);
        expect(mockOscillator.type).toBe('square');
    });

    it('should create sample player for events with sources', () => {
        const soundFxProfile = {
            enabled: true,
            events: {
                clickSound: {
                    sources: [
                        { src: '/sounds/click.mp3', type: 'audio/mpeg' },
                        { src: '/sounds/click.ogg', type: 'audio/ogg' }
                    ]
                }
            }
        };

        const { result } = renderHook(() => useSoundFx({
            soundFxProfile,
            volumePercent: 100
        }));

        expect(result.current.enabled).toBe(true);
        expect(document.createElement).toHaveBeenCalledWith('audio');
    });

    it('should not create player if event config is null', () => {
        const soundFxProfile = {
            enabled: true,
            events: {
                invalidSound: null
            }
        };

        const { result } = renderHook(() => useSoundFx({
            soundFxProfile,
            volumePercent: 100
        }));

        expect(result.current.enabled).toBe(false);
    });

    it('should play sound when event key is valid', () => {
        const soundFxProfile = {
            enabled: true,
            events: {
                beep: {
                    tone: { frequency: 440 }
                }
            }
        };

        const { result } = renderHook(() => useSoundFx({
            soundFxProfile,
            volumePercent: 100
        }));

        act(() => {
            result.current.play('beep');
        });

        expect(mockOscillator.start).toHaveBeenCalled();
    });

    it('should not play sound when muted', () => {
        const soundFxProfile = {
            enabled: true,
            events: {
                beep: {
                    tone: { frequency: 440 }
                }
            }
        };

        const { result } = renderHook(() => useSoundFx({
            soundFxProfile,
            volumePercent: 0
        }));

        act(() => {
            result.current.play('beep');
        });

        expect(mockOscillator.start).not.toHaveBeenCalled();
    });

    it('should not play sound when event key is missing', () => {
        const soundFxProfile = {
            enabled: true,
            events: {
                beep: {
                    tone: { frequency: 440 }
                }
            }
        };

        const { result } = renderHook(() => useSoundFx({
            soundFxProfile,
            volumePercent: 100
        }));

        act(() => {
            result.current.play(null);
        });

        expect(mockOscillator.start).not.toHaveBeenCalled();

        act(() => {
            result.current.play(undefined);
        });

        expect(mockOscillator.start).not.toHaveBeenCalled();
    });

    it('should not play sound when event key does not exist', () => {
        const soundFxProfile = {
            enabled: true,
            events: {
                beep: {
                    tone: { frequency: 440 }
                }
            }
        };

        const { result } = renderHook(() => useSoundFx({
            soundFxProfile,
            volumePercent: 100
        }));

        act(() => {
            result.current.play('nonexistent');
        });

        expect(mockOscillator.start).not.toHaveBeenCalled();
    });

    it('should clear players when muted', () => {
        const soundFxProfile = {
            enabled: true,
            events: {
                beep: { tone: { frequency: 440 } }
            }
        };

        const { result, rerender } = renderHook(
            ({ volumePercent }) => useSoundFx({
                soundFxProfile,
                volumePercent
            }),
            { initialProps: { volumePercent: 100 } }
        );

        expect(result.current.enabled).toBe(true);

        rerender({ volumePercent: 0 });

        expect(result.current.enabled).toBe(false);
    });

    it('should use default tone values when not specified', () => {
        const soundFxProfile = {
            enabled: true,
            events: {
                defaultTone: {
                    tone: {}
                }
            }
        };

        const { result } = renderHook(() => useSoundFx({
            soundFxProfile,
            volumePercent: 100
        }));

        act(() => {
            result.current.play('defaultTone');
        });

        expect(mockOscillator.frequency.value).toBe(440);
        expect(mockOscillator.type).toBe('sine');
    });

    it('should apply per-event volume percentage', () => {
        const soundFxProfile = {
            enabled: true,
            events: {
                quietSound: {
                    tone: { frequency: 440 },
                    volumePercent: 50
                }
            }
        };

        const { result } = renderHook(() => useSoundFx({
            soundFxProfile,
            volumePercent: 100
        }));

        act(() => {
            result.current.play('quietSound');
        });

        // Volume should be 1.0 * 0.5 = 0.5
        expect(mockGainNode.gain.value).toBe(0.5);
    });

    it('should clean up audio context on unmount', () => {
        const soundFxProfile = {
            enabled: true,
            events: {
                beep: { tone: { frequency: 440 } }
            }
        };

        const { result, unmount } = renderHook(() => useSoundFx({
            soundFxProfile,
            volumePercent: 100
        }));

        // Actually play a sound to create the AudioContext
        act(() => {
            result.current.play('beep');
        });

        unmount();

        expect(mockAudioContext.close).toHaveBeenCalled();
    });

    it('should handle audio context close error gracefully', () => {
        mockAudioContext.close.mockRejectedValueOnce(new Error('Close failed'));

        const soundFxProfile = {
            enabled: true,
            events: {
                beep: { tone: { frequency: 440 } }
            }
        };

        const { unmount } = renderHook(() => useSoundFx({
            soundFxProfile,
            volumePercent: 100
        }));

        expect(() => unmount()).not.toThrow();
    });

    it('should return requirements from soundFxProfile', () => {
        const soundFxProfile = {
            enabled: true,
            events: {},
            requirements: { webAudio: true }
        };

        const { result } = renderHook(() => useSoundFx({
            soundFxProfile,
            volumePercent: 100
        }));

        expect(result.current.requirements).toEqual({ webAudio: true });
    });

    it('should return null requirements when not provided', () => {
        const soundFxProfile = {
            enabled: true,
            events: {}
        };

        const { result } = renderHook(() => useSoundFx({
            soundFxProfile,
            volumePercent: 100
        }));

        expect(result.current.requirements).toBeNull();
    });

    it('should handle sample player with missing sources gracefully', () => {
        const soundFxProfile = {
            enabled: true,
            events: {
                noSources: {
                    sources: []
                }
            }
        };

        const { result } = renderHook(() => useSoundFx({
            soundFxProfile,
            volumePercent: 100
        }));

        expect(result.current.enabled).toBe(false);
    });

    it('should handle sample player with invalid sources', () => {
        const soundFxProfile = {
            enabled: true,
            events: {
                invalidSources: {
                    sources: [null, undefined, { src: null }]
                }
            }
        };

        const { result } = renderHook(() => useSoundFx({
            soundFxProfile,
            volumePercent: 100
        }));

        // Should still create player but sources won't be added
        expect(document.createElement).toHaveBeenCalledWith('audio');
    });

    it('should handle audio load error gracefully', () => {
        jest.spyOn(window.HTMLAudioElement.prototype, 'load').mockImplementationOnce(() => {
            throw new Error('Load failed');
        });

        const soundFxProfile = {
            enabled: true,
            events: {
                sound: {
                    sources: [{ src: '/test.mp3' }]
                }
            }
        };

        expect(() => {
            renderHook(() => useSoundFx({
                soundFxProfile,
                volumePercent: 100
            }));
        }).not.toThrow();
    });

    it('should handle audio play error gracefully', () => {
        jest.spyOn(window.HTMLAudioElement.prototype, 'play').mockRejectedValueOnce(new Error('Play failed'));

        const soundFxProfile = {
            enabled: true,
            events: {
                sound: {
                    sources: [{ src: '/test.mp3' }]
                }
            }
        };

        const { result } = renderHook(() => useSoundFx({
            soundFxProfile,
            volumePercent: 100
        }));

        expect(() => {
            act(() => {
                result.current.play('sound');
            });
        }).not.toThrow();
    });

    it('should handle audio context resume error gracefully', () => {
        mockAudioContext.resume.mockRejectedValueOnce(new Error('Resume failed'));

        const soundFxProfile = {
            enabled: true,
            events: {
                beep: { tone: { frequency: 440 } }
            }
        };

        const { result } = renderHook(() => useSoundFx({
            soundFxProfile,
            volumePercent: 100
        }));

        expect(() => {
            act(() => {
                result.current.play('beep');
            });
        }).not.toThrow();
    });
});
