import { useState, useEffect, useCallback, useMemo } from 'react';
import {
    DEFAULT_THEME_ID,
    getNextThemeId,
    getThemeCssVariables,
    getThemeProfile,
    resolveThemeId
} from '../theme';

const getStoredTheme = (fallback) => {
    try {
        const stored = localStorage.getItem('theme');
        if (stored) return resolveThemeId(stored);
    } catch {
        // ignore storage errors
    }
    return resolveThemeId(fallback);
};

export const useTheme = (defaultTheme = DEFAULT_THEME_ID) => {
    const [theme, setThemeState] = useState(() => getStoredTheme(defaultTheme));

    const themeProfile = useMemo(() => getThemeProfile(theme), [theme]);

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
            }
            const cssVars = getThemeCssVariables(themeProfile);
            Object.entries(cssVars).forEach(([key, value]) => {
                if (value !== undefined && value !== null) {
                    root.style.setProperty(key, value);
                }
            });
        } catch {
            // ignore DOM access errors (e.g., SSR)
        }
    }, [theme, themeProfile]);

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

    return {
        theme,
        themeLabel: themeProfile?.label ?? 'Neon Arcade',
        themeProfile,
        appearance: themeProfile?.appearance ?? 'dark',
        setTheme,
        toggleTheme
    };
};
