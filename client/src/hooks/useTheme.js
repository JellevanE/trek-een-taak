import { useState, useEffect, useCallback } from 'react';

export const useTheme = (defaultTheme = 'dark') => {
    const [theme, setTheme] = useState(() => {
        try {
            return localStorage.getItem('theme') || defaultTheme;
        } catch {
            return defaultTheme;
        }
    });

    useEffect(() => {
        try {
            localStorage.setItem('theme', theme);
        } catch {
            // ignore storage errors
        }
        try {
            document.documentElement.setAttribute('data-theme', theme);
        } catch {
            // ignore DOM access errors (e.g., SSR)
        }
    }, [theme]);

    const toggleTheme = useCallback(() => {
        setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
    }, []);

    return { theme, setTheme, toggleTheme };
};
