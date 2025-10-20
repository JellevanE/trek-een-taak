import { useState, useEffect } from 'react';

export const useAuth = () => {
    const [token, setToken] = useState(() => {
        try {
            return localStorage.getItem('auth_token') || null;
        } catch {
            return null;
        }
    });
    const [showProfile, setShowProfile] = useState(false);

    useEffect(() => {
        try {
            if (token) {
                localStorage.setItem('auth_token', token);
            } else {
                localStorage.removeItem('auth_token');
            }
        } catch {
            // ignore storage errors
        }
    }, [token]);

    return { token, setToken, showProfile, setShowProfile };
};
