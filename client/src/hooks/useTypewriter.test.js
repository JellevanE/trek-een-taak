import { act, renderHook } from '@testing-library/react';
import { useTypewriter } from './useTypewriter';

const originalMatchMedia = global.matchMedia;

const mockMatchMedia = (matches = false) => {
    global.matchMedia = jest.fn().mockImplementation(() => ({
        matches,
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        addListener: jest.fn(),
        removeListener: jest.fn(),
    }));
};

afterEach(() => {
    global.matchMedia = originalMatchMedia;
    jest.useRealTimers();
    jest.restoreAllMocks();
});

describe('reduced motion', () => {
    beforeEach(() => mockMatchMedia(true));

    test('completes immediately and reveals everything', () => {
        const onComplete = jest.fn();
        const { result } = renderHook(() =>
            useTypewriter({ text: 'A short tale.', onComplete }));
        expect(result.current.isComplete).toBe(true);
        expect(result.current.visibleCount).toBe('A short tale.'.length);
        expect(onComplete).toHaveBeenCalled();
    });
});

describe('animated reveal', () => {
    beforeEach(() => {
        mockMatchMedia(false);
        jest.useFakeTimers();
    });

    test('reveals character by character and then completes', () => {
        const text = 'Hi there.';
        const onComplete = jest.fn();
        const { result } = renderHook(() => useTypewriter({ text, onComplete }));

        expect(result.current.visibleCount).toBe(0);
        expect(result.current.isComplete).toBe(false);

        // Advance generously per step so any dynamic per-char delay fires.
        for (let i = 0; i <= text.length; i++) {
            act(() => {
                jest.advanceTimersByTime(2000);
            });
        }

        expect(result.current.isComplete).toBe(true);
        expect(result.current.visibleCount).toBe(text.length);
        expect(onComplete).toHaveBeenCalled();
    });

    test('skip jumps straight to the end', () => {
        const text = 'A longer sentence to reveal.';
        const { result } = renderHook(() => useTypewriter({ text }));

        act(() => {
            result.current.skip();
        });

        expect(result.current.isComplete).toBe(true);
        expect(result.current.visibleCount).toBe(text.length);
    });
});
