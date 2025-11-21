import { useMemo } from 'react';
import { DEFAULT_THEME_ID, getThemeProfile } from '../../../theme';
import { useReducedMotionPreference } from '../../../hooks/useReducedMotionPreference.js';

const REDUCED_MOTION_SCALE = 0.5;

const clampProfile = (profile) => ({
    ...profile,
    durations: {
        drag: profile.durations.drag * REDUCED_MOTION_SCALE,
        hover: profile.durations.hover * REDUCED_MOTION_SCALE,
        release: profile.durations.release * REDUCED_MOTION_SCALE
    },
    drag: {
        ...profile.drag,
        scale: 1.005,
        glow: 'none',
        shadow: profile.idle.shadow
    }
});

export const useQuestMotionTokens = (themeName = DEFAULT_THEME_ID) => {
    const prefersReducedMotion = useReducedMotionPreference();

    return useMemo(() => {
        const preset = getThemeProfile(themeName)?.motion ?? getThemeProfile(DEFAULT_THEME_ID).motion;
        return prefersReducedMotion ? clampProfile(preset) : preset;
    }, [prefersReducedMotion, themeName]);
};
