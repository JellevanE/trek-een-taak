import { useCallback, useMemo, useRef, useEffect } from 'react';
import { useToasts } from './useToasts.js';
import { useCampaigns } from './useCampaigns.js';
import { usePlayerStats } from './usePlayerStats.js';
import { useQuests } from './useQuests.js';
import { useStorylineStore } from '../store/storylineStore.js';

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

    // Storyline Integration
    const { fetchStoryline, checkForUpdate, currentStoryline, hasNewUpdate, isGenerating } = useStorylineStore();
    const { activeCampaignFilter } = campaignApi;

    useEffect(() => {
        if (typeof activeCampaignFilter === 'number') {
            fetchStoryline(activeCampaignFilter);
            checkForUpdate(activeCampaignFilter);
        }
    }, [activeCampaignFilter, fetchStoryline, checkForUpdate]);

    // Fetch storyline when a specific campaign is selected
    // Use a ref to prevent double-firing if strict mode is on or other rerenders, though zustand handles it well.
    // Also, we want to check for updates when we enter the campaign.

    // We need useEffect to react to activeCampaignFilter changes
    // import useEffect if not present (it used useMemo, useCallback, useRef above, need to add useEffect)

    const todayKey = useMemo(() => new Date().toISOString().split('T')[0], []);
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
        xpPercent,
        // Storyline exports
        storyline: currentStoryline,
        storylineHasUpdate: hasNewUpdate,
        storylineIsGenerating: isGenerating,
        fetchStoryline, // might need to manually refresh
        checkStorylineUpdate: checkForUpdate
    };
};
