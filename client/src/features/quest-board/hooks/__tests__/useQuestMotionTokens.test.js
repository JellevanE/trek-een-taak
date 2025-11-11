import { renderHook } from '@testing-library/react';
import { THEME_PROFILES } from '../../../../theme';
import { useQuestMotionTokens } from '../useQuestMotionTokens.js';

const originalMatchMedia = global.matchMedia;

const mockMatchMedia = (matches = false) => {
    global.matchMedia = jest.fn().mockImplementation(() => ({
        matches,
        addEventListener: jest.fn(),
        removeEventListener: jest.fn()
    }));
};

describe('useQuestMotionTokens', () => {
    beforeEach(() => {
        mockMatchMedia(false);
    });

    afterEach(() => {
        global.matchMedia = originalMatchMedia;
        jest.restoreAllMocks();
    });

    it('returns the Neon Arcade motion profile by default', () => {
        const { result } = renderHook(() => useQuestMotionTokens());
        expect(result.current).toMatchObject(THEME_PROFILES.neon_arcade.motion);
    });

    it('returns the Classic motion profile when requested', () => {
        const { result } = renderHook(() => useQuestMotionTokens('classic'));
        expect(result.current).toMatchObject(THEME_PROFILES.classic.motion);
    });

    it('clamps durations and glow when reduced motion is enabled', () => {
        mockMatchMedia(true);
        const { result } = renderHook(() => useQuestMotionTokens());
        const baseProfile = THEME_PROFILES.neon_arcade.motion;
        expect(result.current.durations.drag).toBeCloseTo(baseProfile.durations.drag * 0.5);
        expect(result.current.drag.glow).toBe('none');
        expect(result.current.drag.scale).toBe(1.005);
    });
});
