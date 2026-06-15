import { useCallback, useEffect, useState } from 'react';
import { apiFetch, getAuthHeaders as getAuthHeadersUtil } from '../utils/api.js';
import {
    computeHasNewUpdate,
    setLastSeenUpdateId,
} from '../utils/storylineReadState.js';

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
            setHasNewUpdate(computeHasNewUpdate(data));
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

        const applyStoryline = (storyline) => {
            setCurrentStoryline((prev) =>
                prev && prev.campaignId !== campaignId ? prev : storyline);
            setHasNewUpdate(computeHasNewUpdate(storyline));
        };

        try {
            const data = await apiFetch(
                `/api/storylines/${campaignId}/check-update`,
                { headers: getAuthHeadersUtil(token) },
                onUnauthorized,
            );

            const startingCount = data.updates ? data.updates.length : 0;

            if (data.status === 'generating') {
                // Poll the storyline until the new update lands (or we give up).
                const MAX_ATTEMPTS = 10;
                const INTERVAL_MS = 3000;
                for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
                    // eslint-disable-next-line no-await-in-loop
                    await new Promise((r) => setTimeout(r, INTERVAL_MS));
                    // eslint-disable-next-line no-await-in-loop
                    const fresh = await apiFetch(
                        `/api/storylines/${campaignId}`,
                        { headers: getAuthHeadersUtil(token) },
                        onUnauthorized,
                    );
                    if (fresh && Array.isArray(fresh.updates) && fresh.updates.length > startingCount) {
                        applyStoryline(fresh);
                        break;
                    }
                }
            } else if (data.updates) {
                setCurrentStoryline((prev) => {
                    const next = prev && prev.campaignId === campaignId
                        ? { ...prev, updates: data.updates }
                        : prev;
                    setHasNewUpdate(computeHasNewUpdate(next));
                    return next;
                });
            }
            setIsGenerating(false);
        } catch (err) {
            if (err.status !== 404) {
                console.error('Failed to check for updates', err);
                setError(err.message);
            }
            setIsGenerating(false);
        }
    }, [token, onUnauthorized]);

    const markUpdateAsRead = useCallback(() => {
        setHasNewUpdate(false);
        setCurrentStoryline((prev) => {
            if (prev && Array.isArray(prev.updates) && prev.updates.length > 0) {
                const latest = prev.updates[prev.updates.length - 1];
                setLastSeenUpdateId(prev.campaignId, latest.id);
            }
            return prev;
        });
    }, []);

    // Admin/dev-only: force-generate a storyline update of a given type for the
    // selected campaign via the debug endpoint (bypasses the new-day gate and
    // daily quota) so multiple updates can be previewed on demand.
    const generateDebugUpdate = useCallback(async (type) => {
        if (!token) return;
        if (typeof activeCampaignFilter !== 'number') {
            if (pushToast) pushToast('Select a campaign first', 'error');
            return;
        }
        setIsGenerating(true);
        try {
            const updated = await apiFetch(
                '/api/debug/generate-storyline-update',
                {
                    method: 'POST',
                    headers: getAuthHeadersUtil(token),
                    body: JSON.stringify({ campaign_id: activeCampaignFilter, type }),
                },
                onUnauthorized,
            );
            if (updated) {
                setCurrentStoryline(updated);
                setHasNewUpdate(computeHasNewUpdate(updated));
            }
            if (pushToast) pushToast(`Generated ${type} update`, 'success');
        } catch (err) {
            console.error('Debug storyline generation failed', err);
            if (pushToast) pushToast('Failed to generate story update', 'error');
        } finally {
            setIsGenerating(false);
        }
    }, [token, activeCampaignFilter, onUnauthorized, pushToast]);

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
        generateDebugUpdate,
    };
};
