import { useState, useEffect, useCallback } from 'react';
import { apiFetch, getAuthHeaders as getAuthHeadersUtil } from '../utils/api.js';

export const usePlayerStats = ({ token, getAuthHeaders, pushToast, onUnauthorized }) => {
    const [playerStats, setPlayerStats] = useState(null);
    const [dailyLoading, setDailyLoading] = useState(false);

    useEffect(() => {
        if (!token) {
            setPlayerStats(null);
            return;
        }
        
        const fetchPlayerStats = async () => {
            try {
                const data = await apiFetch(
                    '/api/users/me',
                    { headers: getAuthHeadersUtil(token) },
                    onUnauthorized
                );
                if (data && data.user && data.user.rpg) {
                    setPlayerStats(data.user.rpg);
                }
            } catch (error) {
                console.error('Error fetching player stats:', error);
            }
        };
        
        fetchPlayerStats();
    }, [token, onUnauthorized]);

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

    const claimDailyReward = useCallback(async () => {
        if (dailyLoading) return;
        setDailyLoading(true);
        
        try {
            const data = await apiFetch(
                '/api/rpg/daily-reward',
                {
                    method: 'POST',
                    headers: getAuthHeaders()
                },
                onUnauthorized
            );
            handleXpPayload(data);
        } catch (error) {
            console.error('Error claiming daily reward:', error);
            const message = error.message || 'Failed to claim daily reward';
            pushToast(message, 'error', 4000);
        } finally {
            setDailyLoading(false);
        }
    }, [dailyLoading, getAuthHeaders, handleXpPayload, pushToast, onUnauthorized]);

    return {
        playerStats,
        setPlayerStats,
        dailyLoading,
        setDailyLoading,
        handleXpPayload,
        claimDailyReward
    };
};
