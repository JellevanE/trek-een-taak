import { useCallback, useMemo, useRef } from 'react';
import { useToasts } from './useToasts';
import { useCampaigns } from './useCampaigns';
import { usePlayerStats } from './usePlayerStats';
import { useQuests } from './useQuests';

export const useQuestBoard = ({ token, setToken }) => {
    const { toasts, pushToast, dismissToast } = useToasts();

    const getAuthHeaders = useCallback((extra = {}) => {
        const base = { 'Content-Type': 'application/json' };
        if (token) base.Authorization = `Bearer ${token}`;
        return { ...base, ...extra };
    }, [token]);

    const playerStatsApi = usePlayerStats({ token, getAuthHeaders, pushToast });
    const { playerStats, setPlayerStats } = playerStatsApi;

    const reloadTasksRef = useRef(() => Promise.resolve());

    const onUnauthorized = useCallback(() => {
        setToken(null);
        setPlayerStats(null);
    }, [setPlayerStats, setToken]);

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
        reloadTasksRef
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
