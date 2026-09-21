import { useCallback, useEffect, useRef, useState } from 'react';
import { apiUrl } from '../../../utils/api.js';

export const AVAILABILITY_DEBOUNCE_MS = 500;

const IDLE = { status: 'idle', suggestions: [], username: '' };

/**
 * useUsernameAvailability
 * -----------------------
 * Debounced live check against `/api/users/check-username/:username`.
 *
 * @param {string} username - the raw input value
 * @param {{ enabled?: boolean, delay?: number }} [options]
 *   `enabled` should be false while local validation fails, so we never hit
 *   the server with a username it would reject anyway.
 * @returns {{
 *   status: 'idle'|'checking'|'available'|'taken'|'reserved'|'error',
 *   suggestions: string[],
 *   username: string,   // the (trimmed) value the current status refers to
 *   recheck: () => void,
 * }}
 */
export function useUsernameAvailability(username, { enabled = true, delay } = {}) {
    const wait = typeof delay === 'number' ? delay : AVAILABILITY_DEBOUNCE_MS;
    const [state, setState] = useState(IDLE);
    const [nonce, setNonce] = useState(0);
    const controllerRef = useRef(null);
    const trimmed = (username || '').trim();

    useEffect(() => {
        if (controllerRef.current) {
            controllerRef.current.abort();
            controllerRef.current = null;
        }

        if (!enabled || !trimmed) {
            setState(IDLE);
            return undefined;
        }

        setState({ status: 'checking', suggestions: [], username: trimmed });

        const timer = setTimeout(async () => {
            const controller = typeof AbortController === 'function'
                ? new AbortController()
                : null;
            controllerRef.current = controller;
            try {
                const res = await fetch(
                    apiUrl(`/api/users/check-username/${encodeURIComponent(trimmed)}`),
                    controller ? { signal: controller.signal } : undefined,
                );
                const data = await res.json().catch(() => ({}));
                if (controller && controller.signal.aborted) return;
                if (!res.ok) {
                    setState({ status: 'error', suggestions: [], username: trimmed });
                    return;
                }
                const suggestions = Array.isArray(data.suggestions) ? data.suggestions : [];
                setState({
                    status: data.available ? 'available' : data.reserved ? 'reserved' : 'taken',
                    suggestions,
                    username: trimmed,
                });
            } catch (err) {
                if (err && err.name === 'AbortError') return;
                setState({ status: 'error', suggestions: [], username: trimmed });
            }
        }, wait);

        return () => {
            clearTimeout(timer);
            if (controllerRef.current) {
                controllerRef.current.abort();
                controllerRef.current = null;
            }
        };
    }, [trimmed, enabled, wait, nonce]);

    const recheck = useCallback(() => setNonce((n) => n + 1), []);

    return { ...state, recheck };
}

export default useUsernameAvailability;
