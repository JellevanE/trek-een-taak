import { useState, useCallback, useRef, useEffect } from 'react';

export const useToasts = () => {
    const [toasts, setToasts] = useState([]);
    const timersRef = useRef({});

    const pushToast = useCallback((message, type = 'info', timeout = 3000) => {
        const id = Date.now() + Math.random();
        setToasts((prev) => [...prev, { id, msg: message, type }]);
        const timeoutId = window.setTimeout(() => {
            setToasts((prev) => prev.filter((toast) => toast.id !== id));
            if (timersRef.current[id]) delete timersRef.current[id];
        }, timeout);
        timersRef.current[id] = timeoutId;
    }, []);

    const dismissToast = useCallback((id) => {
        setToasts((prev) => prev.filter((toast) => toast.id !== id));
        if (timersRef.current[id]) {
            clearTimeout(timersRef.current[id]);
            delete timersRef.current[id];
        }
    }, []);

    useEffect(() => () => {
        Object.values(timersRef.current || {}).forEach((timeoutId) => {
            clearTimeout(timeoutId);
        });
        timersRef.current = {};
    }, []);

    return { toasts, pushToast, dismissToast };
};
