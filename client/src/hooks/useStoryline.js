import { useCallback, useEffect, useState } from 'react';
import { apiFetch, getAuthHeaders as getAuthHeadersUtil } from '../utils/api.js';

export const useStoryline = ({
    token,
    getAuthHeaders,
    onUnauthorized,
    pushToast,
    activeCampaignFilter,
}) => {
    const [currentStoryline, setCurrentStoryline] = useState(null);
    const [hasNewUpdate, setHasNewUpdate] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Reset all state on logout
    useEffect(() => {
        if (!token) {
            setCurrentStoryline(null);
            setHasNewUpdate(false);
            setIsGenerating(false);
            setLoading(false);
            setError(null);
        }
    }, [token]);

    const fetchStoryline = useCallback(async (campaignId) => {
        if (!token) return null;
        setLoading(true);
        setError(null);

        try {
            const data = await apiFetch(
                `/api/storylines/${campaignId}`,
                { headers: getAuthHeadersUtil(token) },
                onUnauthorized,
            );
            setCurrentStoryline(data);
            setLoading(false);
            return data;
        } catch (err) {
            // 404 means no storyline exists yet — not an error
            if (err.status === 404) {
                setCurrentStoryline(null);
                setLoading(false);
                return null;
            }
            console.error('Failed to fetch storyline', err);
            setError(err.message);
            setLoading(false);
            return null;
        }
    }, [token, onUnauthorized]);

    const checkForUpdate = useCallback(async (campaignId) => {
        if (!token) return;
        setIsGenerating(true);

        try {
            const data = await apiFetch(
                `/api/storylines/${campaignId}/check-update`,
                { headers: getAuthHeadersUtil(token) },
                onUnauthorized,
            );
            const { updates } = data;

            if (updates && updates.length > 0) {
                setHasNewUpdate(true);
                setCurrentStoryline((prev) => {
                    if (prev && prev.campaignId === campaignId) {
                        return { ...prev, updates };
                    }
                    return prev;
                });
            }
            setIsGenerating(false);
        } catch (err) {
            // 404 is expected when no storyline exists
            if (err.status !== 404) {
                console.error('Failed to check for updates', err);
                setError(err.message);
            }
            setIsGenerating(false);
        }
    }, [token, onUnauthorized]);

    const markUpdateAsRead = useCallback(() => {
        setHasNewUpdate(false);
    }, []);

    // Auto-fetch + check when campaign selection changes
    useEffect(() => {
        if (typeof activeCampaignFilter === 'number') {
            fetchStoryline(activeCampaignFilter);
            checkForUpdate(activeCampaignFilter);
        } else {
            setCurrentStoryline(null);
            setHasNewUpdate(false);
        }
    }, [activeCampaignFilter, fetchStoryline, checkForUpdate]);

    return {
        currentStoryline,
        hasNewUpdate,
        isGenerating,
        loading,
        error,
        fetchStoryline,
        checkForUpdate,
        markUpdateAsRead,
    };
};
