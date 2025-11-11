import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
    DEFAULT_THEME_ID,
    getNextThemeId,
    getThemeCssVariables,
    getThemeProfile,
    resolveThemeId
} from '../theme';

const SOUND_VOLUME_STORAGE_KEY = 'theme:soundVolume';

const getStoredTheme = (fallback) => {
    try {
        const stored = localStorage.getItem('theme');
        if (stored) return resolveThemeId(stored);
    } catch {
        // ignore storage errors
    }
    return resolveThemeId(fallback);
};

const clampVolume = (value) => {
    if (Number.isNaN(value)) return 0;
    return Math.min(100, Math.max(0, Math.round(value)));
};

const getStoredSoundVolume = (fallback = 65) => {
    try {
        const stored = localStorage.getItem(SOUND_VOLUME_STORAGE_KEY);
        if (stored !== null && stored !== undefined) {
            return clampVolume(Number(stored));
        }
    } catch {
        // ignore storage errors
    }
    return clampVolume(fallback);
};

export const useTheme = (defaultTheme = DEFAULT_THEME_ID) => {
    const [theme, setThemeState] = useState(() => getStoredTheme(defaultTheme));
    const [soundVolume, setSoundVolumeState] = useState(() => {
        const baseProfile = getThemeProfile(getStoredTheme(defaultTheme));
        return getStoredSoundVolume(baseProfile?.soundFx?.volumePercent ?? 65);
    });

    const themeProfile = useMemo(() => getThemeProfile(theme), [theme]);
    const cssVarFrame = useRef(null);

    useEffect(() => {
        try {
            localStorage.setItem('theme', theme);
        } catch {
            // ignore storage errors
        }
    }, [theme]);

    useEffect(() => {
        try {
            const root = document.documentElement;
            root.setAttribute('data-theme', theme);
            if (themeProfile?.appearance) {
                root.setAttribute('data-theme-appearance', themeProfile.appearance);
            } else {
                root.removeAttribute('data-theme-appearance');
            }
            root.setAttribute('data-theme-ready', 'false');
            const cssVars = getThemeCssVariables(themeProfile);
            Object.entries(cssVars).forEach(([key, value]) => {
                if (value !== undefined && value !== null) {
                    root.style.setProperty(key, value);
                }
            });
            if (cssVarFrame.current && typeof cancelAnimationFrame === 'function') {
                cancelAnimationFrame(cssVarFrame.current);
            }
            if (typeof requestAnimationFrame === 'function') {
                cssVarFrame.current = requestAnimationFrame(() => {
                    root.setAttribute('data-theme-ready', 'true');
                    cssVarFrame.current = null;
                });
            } else {
                root.setAttribute('data-theme-ready', 'true');
            }
        } catch {
            // ignore DOM access errors (e.g., SSR)
        }
    }, [theme, themeProfile]);

    useEffect(() => () => {
        if (cssVarFrame.current && typeof cancelAnimationFrame === 'function') {
            cancelAnimationFrame(cssVarFrame.current);
            cssVarFrame.current = null;
        }
    }, []);

    useEffect(() => {
        try {
            localStorage.setItem(SOUND_VOLUME_STORAGE_KEY, String(soundVolume));
        } catch {
            // ignore storage errors
        }
    }, [soundVolume]);

    const setTheme = useCallback((updater) => {
        setThemeState((prev) => {
            const previous = resolveThemeId(prev);
            const nextValue = typeof updater === 'function'
                ? updater(previous)
                : updater;
            return resolveThemeId(nextValue ?? previous);
        });
    }, []);

    const toggleTheme = useCallback(() => {
        setThemeState((prev) => getNextThemeId(prev));
    }, []);

    const setSoundVolume = useCallback((value) => {
        setSoundVolumeState((prev) => {
            const nextValue = clampVolume(typeof value === 'function' ? value(prev) : value);
            return nextValue;
        });
    }, []);

    return {
        theme,
        themeLabel: themeProfile?.label ?? 'Neon Arcade',
        themeProfile,
        appearance: themeProfile?.appearance ?? 'dark',
        setTheme,
        toggleTheme,
        soundVolume,
        setSoundVolume
    };
};
