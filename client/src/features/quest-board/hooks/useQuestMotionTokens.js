import { useEffect, useMemo, useState } from 'react';

const MOTION_PROFILES = {
    dark: {
        durations: {
            drag: 0.28,
            hover: 0.18,
            release: 0.32
        },
        easing: {
            drag: [0.25, 0.1, 0.25, 1],
            hover: [0.4, 0, 0.2, 1]
        },
        drag: {
            scale: 1.02,
            shadow: '0 14px 24px rgba(57, 255, 20, 0.25)',
            glow: '0 0 18px rgba(57, 255, 20, 0.45)'
        },
        idle: {
            shadow: '0 8px 14px rgba(0, 0, 0, 0.35)'
        }
    },
    light: {
        durations: {
            drag: 0.24,
            hover: 0.16,
            release: 0.26
        },
        easing: {
            drag: [0.4, 0, 0.2, 1],
            hover: [0.25, 0.1, 0.25, 1]
        },
        drag: {
            scale: 1.015,
            shadow: '0 10px 18px rgba(111, 0, 255, 0.25)',
            glow: '0 0 14px rgba(111, 0, 255, 0.35)'
        },
        idle: {
            shadow: '0 6px 12px rgba(0, 0, 0, 0.15)'
        }
    }
};

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

export const useQuestMotionTokens = (themeName = 'dark') => {
    const prefersReducedMotion = usePrefersReducedMotion();

    return useMemo(() => {
        const preset = MOTION_PROFILES[themeName] || MOTION_PROFILES.dark;
        return prefersReducedMotion ? clampProfile(preset) : preset;
    }, [prefersReducedMotion, themeName]);
};
