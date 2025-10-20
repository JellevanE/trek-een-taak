import { useState, useEffect, useCallback } from 'react';

export const usePlayerStats = ({ token, getAuthHeaders, pushToast }) => {
    const [playerStats, setPlayerStats] = useState(null);
    const [dailyLoading, setDailyLoading] = useState(false);

    useEffect(() => {
        if (!token) {
            setPlayerStats(null);
            return;
        }
        const headers = { Authorization: `Bearer ${token}` };
        fetch('/api/users/me', { headers })
            .then((res) => (res.ok ? res.json() : null))
            .then((data) => {
                if (data && data.user && data.user.rpg) {
                    setPlayerStats(data.user.rpg);
                }
            })
            .catch((error) => {
                console.error('Error fetching player stats:', error);
            });
    }, [token]);

    const handleXpPayload = useCallback((payload) => {
        if (!payload) return;
        if (payload.player_rpg) {
            setPlayerStats(payload.player_rpg);
        }
        const events = Array.isArray(payload.xp_events)
            ? payload.xp_events
            : (payload.xp_event ? [payload.xp_event] : []);
        events.forEach((event) => {
            if (!event) return;
            const message = event.message || `Gained ${event.amount} XP`;
            pushToast(message, 'success', 4000);
            if (event.leveled_up && event.level_after) {
                pushToast(`Level up! Reached level ${event.level_after}`, 'success', 5000);
            }
        });
    }, [pushToast]);

    const claimDailyReward = useCallback(() => {
        if (dailyLoading) return;
        setDailyLoading(true);
        fetch('/api/rpg/daily-reward', { method: 'POST', headers: getAuthHeaders() })
            .then(async (res) => {
                const data = await res.json().catch(() => ({}));
                if (!res.ok) {
                    const message = data && data.error ? data.error : 'Unable to claim daily reward';
                    pushToast(message, 'error', 4000);
                    return null;
                }
                return data;
            })
            .then((data) => {
                if (!data) return;
                handleXpPayload(data);
            })
            .catch((error) => {
                console.error('Error claiming daily reward:', error);
                pushToast('Failed to claim daily reward', 'error', 4000);
            })
            .finally(() => setDailyLoading(false));
    }, [dailyLoading, getAuthHeaders, handleXpPayload, pushToast]);

    return {
        playerStats,
        setPlayerStats,
        dailyLoading,
        setDailyLoading,
        handleXpPayload,
        claimDailyReward
    };
};
