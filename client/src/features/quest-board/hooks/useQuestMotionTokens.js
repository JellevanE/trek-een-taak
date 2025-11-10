import { useEffect, useMemo, useState } from 'react';
import { DEFAULT_THEME_ID, getThemeProfile } from '../../../theme';

const REDUCED_MOTION_SCALE = 0.5;

const usePrefersReducedMotion = () => {
    const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

    useEffect(() => {
        if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
            return undefined;
        }
        const query = window.matchMedia('(prefers-reduced-motion: reduce)');
        const handler = (event) => setPrefersReducedMotion(event.matches);
        setPrefersReducedMotion(query.matches);
        if (typeof query.addEventListener === 'function') {
            query.addEventListener('change', handler);
            return () => query.removeEventListener('change', handler);
        }
        query.addListener(handler);
        return () => query.removeListener(handler);
    }, []);

    return prefersReducedMotion;
};

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
    const prefersReducedMotion = usePrefersReducedMotion();

    return useMemo(() => {
        const preset = getThemeProfile(themeName)?.motion ?? getThemeProfile(DEFAULT_THEME_ID).motion;
        return prefersReducedMotion ? clampProfile(preset) : preset;
    }, [prefersReducedMotion, themeName]);
};
