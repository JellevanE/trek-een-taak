import { useState, useCallback } from 'react';

export const useToasts = () => {
    const [toasts, setToasts] = useState([]);

    const pushToast = useCallback((message, type = 'info', timeout = 3000) => {
        const id = Date.now() + Math.random();
        setToasts((prev) => [...prev, { id, msg: message, type }]);
        setTimeout(() => {
            setToasts((prev) => prev.filter((toast) => toast.id !== id));
        }, timeout);
    }, []);

    return { toasts, pushToast };
};
