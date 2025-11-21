import { useCallback, useMemo, useRef } from 'react';
import { useToasts } from './useToasts.js';
import { useCampaigns } from './useCampaigns.js';
import { usePlayerStats } from './usePlayerStats.js';
import { useQuests } from './useQuests.js';

export const useQuestBoard = ({ token, setToken, soundFx = null }) => {
    const { toasts, pushToast, dismissToast } = useToasts();

    const getAuthHeaders = useCallback((extra = {}) => {
        const base = { 'Content-Type': 'application/json' };
        if (token) base.Authorization = `Bearer ${token}`;
        return { ...base, ...extra };
    }, [token]);

    const onUnauthorized = useCallback(() => {
        setToken(null);
    }, [setToken]);

    const playerStatsApi = usePlayerStats({ token, getAuthHeaders, pushToast, onUnauthorized });
    const { playerStats } = playerStatsApi;

    const reloadTasksRef = useRef(() => Promise.resolve());

    const campaignApi = useCampaigns({
        token,
        getAuthHeaders,
        pushToast,
        onUnauthorized,
        reloadTasksRef
    });

    const questsApi = useQuests({
        token,
        getAuthHeaders,
        onUnauthorized,
        pushToast,
        campaignApi,
        playerStatsApi,
        reloadTasksRef,
        soundFx
    });

    const todayKey = useMemo(() => new Date().toISOString().split('T')[0], [questsApi.quests]);
    const dailyClaimed = !!(playerStats && playerStats.last_daily_reward_at === todayKey);
    const xpPercent = playerStats ? Math.round((playerStats.xp_progress || 0) * 100) : 0;

    return {
        ...campaignApi,
        ...playerStatsApi,
        ...questsApi,
        toasts,
        dismissToast,
        todayKey,
        dailyClaimed,
        xpPercent
    };
};
