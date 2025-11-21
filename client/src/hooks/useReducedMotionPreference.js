import { useEffect, useState } from 'react';

export const useReducedMotionPreference = () => {
    const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

    useEffect(() => {
        if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
            return undefined;
        }
        const query = window.matchMedia('(prefers-reduced-motion: reduce)');
        const update = (event) => setPrefersReducedMotion(event.matches);
        setPrefersReducedMotion(query.matches);
        if (typeof query.addEventListener === 'function') {
            query.addEventListener('change', update);
            return () => query.removeEventListener('change', update);
        }
        query.addListener(update);
        return () => query.removeListener(update);
    }, []);

    return prefersReducedMotion;
};

export default useReducedMotionPreference;
