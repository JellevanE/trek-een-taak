import { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '../../../utils/api.js';
import {
    normalizeQuest,
    normalizeQuestList,
    cloneQuestSnapshot
} from '../../../hooks/questHelpers.js';

/**
 * useQuestData
 * ------------
 * Encapsulates quest CRUD operations, campaign-scoped fetching, and RPG debug utilities.
 * Returns quest state alongside mutation helpers so higher-level hooks can stay
 * focused on interaction logic.
 */
export const useQuestData = ({
    token,
    getAuthHeaders,
    onUnauthorized,
    pushToast,
    campaignApi,
    playerStatsApi,
    reloadTasksRef,
    skipInitialFetch = false
}) => {
    const {
        activeCampaignFilter,
        taskCampaignSelection,
        refreshCampaigns,
        getTasksEndpoint
    } = campaignApi;
    const { setPlayerStats, handleXpPayload } = playerStatsApi;

    const [quests, setQuests] = useState([]);
    const [description, setDescription] = useState('');
    const [priority, setPriority] = useState('medium');
    const [taskLevel, setTaskLevel] = useState(1);
    const [debugBusy, setDebugBusy] = useState(false);
    const [showDebugTools, setShowDebugTools] = useState(false);

    const reloadTasks = useCallback(async (filterOverride = activeCampaignFilter) => {
        if (!token) return;

        const url = getTasksEndpoint(filterOverride);
        try {
            const data = await apiFetch(
                url,
                { headers: { Authorization: `Bearer ${token}` } },
                onUnauthorized
            );

            if (data) {
                const payload = data.tasks || data.quests || [];
                setQuests(normalizeQuestList(payload));
                refreshCampaigns();
            }
        } catch (error) {
            console.error('Error reloading quests:', error);
            pushToast('Failed to refresh quests', 'error');
            setQuests([]);
        }
    }, [activeCampaignFilter, getTasksEndpoint, onUnauthorized, pushToast, refreshCampaigns, token]);

    reloadTasksRef.current = reloadTasks;

    useEffect(() => {
        if (skipInitialFetch) return;
        if (!token) {
            setQuests([]);
            setPlayerStats(null);
            return;
        }

        const fetchQuests = async () => {
            const url = getTasksEndpoint();
            try {
                const data = await apiFetch(
                    url,
                    { headers: { Authorization: `Bearer ${token}` } },
                    onUnauthorized
                );

                if (data) {
                    const payload = data.tasks || data.quests || [];
                    setQuests(normalizeQuestList(payload));
                }
            } catch (error) {
                console.error('Error fetching quests:', error);
                setQuests([]);
            }
        };

        fetchQuests();
    }, [getTasksEndpoint, onUnauthorized, setPlayerStats, skipInitialFetch, token]);

    const addTask = useCallback(async () => {
        if (!description || description.trim() === '') return null;
        const payload = { description, priority, task_level: taskLevel };
        if (taskCampaignSelection !== null) {
            payload.campaign_id = taskCampaignSelection;
        }

        try {
            const newQuest = await apiFetch(
                '/api/tasks',
                {
                    method: 'POST',
                    headers: getAuthHeaders(),
                    body: JSON.stringify(payload)
                },
                onUnauthorized
            );

            if (!newQuest) return null;
            const normalized = normalizeQuest(newQuest);
            const matchesFilter =
                activeCampaignFilter === null
                || (activeCampaignFilter === 'uncategorized' && !normalized.campaign_id)
                || (typeof activeCampaignFilter === 'number' && normalized.campaign_id === activeCampaignFilter);
            if (matchesFilter) {
                setQuests((prev) => [normalized, ...prev]);
            } else {
                await reloadTasks();
            }
            refreshCampaigns();
            setDescription('');
            setPriority('medium');
            setTaskLevel(1);
            return normalized;
        } catch (error) {
            console.error('Error adding quest:', error);
            return null;
        }
    }, [
        activeCampaignFilter,
        description,
        getAuthHeaders,
        onUnauthorized,
        priority,
        refreshCampaigns,
        reloadTasks,
        taskCampaignSelection,
        taskLevel
    ]);

    const patchQuest = useCallback(async (questId, updates) => {
        try {
            const updatedTask = await apiFetch(
                `/api/tasks/${questId}`,
                {
                    method: 'PATCH',
                    headers: getAuthHeaders(),
                    body: JSON.stringify(updates)
                },
                onUnauthorized
            );
            if (updatedTask) {
                const normalized = normalizeQuest(updatedTask);
                setQuests((prev) => prev.map((quest) => (quest.id === questId ? normalized : quest)));
                refreshCampaigns();
                return normalized;
            }
        } catch (error) {
            console.error('Error updating quest:', error);
        }
        return null;
    }, [getAuthHeaders, onUnauthorized, refreshCampaigns]);

    const deleteQuest = useCallback(async (questId) => {
        try {
            await apiFetch(
                `/api/tasks/${questId}`,
                {
                    method: 'DELETE',
                    headers: getAuthHeaders()
                },
                onUnauthorized
            );
            setQuests((prev) => prev.filter((quest) => quest.id !== questId));
            refreshCampaigns();
            return true;
        } catch (error) {
            console.error('Error deleting quest:', error);
            return false;
        }
    }, [getAuthHeaders, onUnauthorized, refreshCampaigns]);

    const addSideQuest = useCallback(async (questId, descriptionText) => {
        if (!descriptionText || descriptionText.trim() === '') return null;
        try {
            const updatedTask = await apiFetch(
                `/api/tasks/${questId}/subtasks`,
                {
                    method: 'POST',
                    headers: getAuthHeaders(),
                    body: JSON.stringify({ description: descriptionText })
                },
                onUnauthorized
            );
            if (updatedTask) {
                const normalized = normalizeQuest(updatedTask);
                setQuests((prev) => prev.map((quest) => (quest.id === questId ? normalized : quest)));
                refreshCampaigns();
                return normalized;
            }
        } catch (error) {
            console.error('Error adding side-quest:', error);
        }
        return null;
    }, [getAuthHeaders, onUnauthorized, refreshCampaigns]);

    const setTaskStatus = useCallback(async (questId, status, note) => {
        try {
            const updatedQuest = await apiFetch(
                `/api/tasks/${questId}/status`,
                {
                    method: 'PATCH',
                    headers: getAuthHeaders(),
                    body: JSON.stringify({ status, note })
                },
                onUnauthorized
            );
            if (updatedQuest) {
                handleXpPayload(updatedQuest);
                const normalized = normalizeQuest(updatedQuest);
                setQuests((prev) => prev.map((quest) => (quest.id === questId ? normalized : quest)));
                refreshCampaigns();
                return normalized;
            }
        } catch (error) {
            console.error('Error updating quest status:', error);
        }
        return null;
    }, [getAuthHeaders, handleXpPayload, onUnauthorized, refreshCampaigns]);
    const updateQuest = patchQuest;

    const setSideQuestStatus = useCallback(async (questId, sideQuestId, status, note) => {
        try {
            const updatedTask = await apiFetch(
                `/api/tasks/${questId}/subtasks/${sideQuestId}/status`,
                {
                    method: 'PATCH',
                    headers: getAuthHeaders(),
                    body: JSON.stringify({ status, note })
                },
                onUnauthorized
            );
            if (updatedTask) {
                const normalized = normalizeQuest(updatedTask);
                setQuests((prev) => prev.map((quest) => (quest.id === questId ? normalized : quest)));
                refreshCampaigns();
                return normalized;
            }
        } catch (error) {
            console.error('Error updating side quest status:', error);
        }
        return null;
    }, [getAuthHeaders, onUnauthorized, refreshCampaigns]);

    const updateSideQuest = useCallback(async (questId, sideQuestId, payload) => {
        try {
            const updatedTask = await apiFetch(
                `/api/tasks/${questId}/subtasks/${sideQuestId}`,
                {
                    method: 'PATCH',
                    headers: getAuthHeaders(),
                    body: JSON.stringify(payload)
                },
                onUnauthorized
            );
            if (updatedTask) {
                const normalized = normalizeQuest(updatedTask);
                setQuests((prev) => prev.map((quest) => (quest.id === questId ? normalized : quest)));
                refreshCampaigns();
                return normalized;
            }
        } catch (error) {
            console.error('Error updating side quest:', error);
        }
        return null;
    }, [getAuthHeaders, onUnauthorized, refreshCampaigns]);

    const deleteSideQuest = useCallback(async (questId, sideQuestId) => {
        try {
            const updatedTask = await apiFetch(
                `/api/tasks/${questId}/subtasks/${sideQuestId}`,
                {
                    method: 'DELETE',
                    headers: getAuthHeaders()
                },
                onUnauthorized
            );
            if (updatedTask) {
                const normalized = normalizeQuest(updatedTask);
                setQuests((prev) => prev.map((quest) => (quest.id === questId ? normalized : quest)));
                refreshCampaigns();
                return normalized;
            }
        } catch (error) {
            console.error('Error deleting side quest:', error);
        }
        return null;
    }, [getAuthHeaders, onUnauthorized, refreshCampaigns]);

    const clearAllQuests = useCallback(async () => {
        if (debugBusy) return;
        setDebugBusy(true);
        try {
            await apiFetch(
                '/api/debug/clear-tasks',
                {
                    method: 'POST',
                    headers: getAuthHeaders()
                },
                onUnauthorized
            );
            setQuests([]);
            refreshCampaigns();
            pushToast('Cleared all quests', 'success');
        } catch (error) {
            console.error('Error clearing quests:', error);
            pushToast('Failed to clear quests', 'error');
        } finally {
            setDebugBusy(false);
        }
    }, [debugBusy, getAuthHeaders, onUnauthorized, pushToast, refreshCampaigns]);

    const seedDemoQuests = useCallback(async () => {
        if (debugBusy) return;
        setDebugBusy(true);
        try {
            const data = await apiFetch(
                '/api/debug/seed-demo-tasks',
                {
                    method: 'POST',
                    headers: getAuthHeaders()
                },
                onUnauthorized
            );
            if (Array.isArray(data?.tasks)) {
                setQuests(normalizeQuestList(data.tasks));
                pushToast('Seeded demo quests', 'success');
            }
        } catch (error) {
            console.error('Error seeding demo quests:', error);
            pushToast('Failed to seed demo quests', 'error');
        } finally {
            setDebugBusy(false);
        }
    }, [debugBusy, getAuthHeaders, onUnauthorized, pushToast]);

    const grantXp = useCallback(async (amount) => {
        if (debugBusy) return;
        setDebugBusy(true);

        try {
            const data = await apiFetch(
                '/api/debug/grant-xp',
                {
                    method: 'POST',
                    headers: getAuthHeaders(),
                    body: JSON.stringify({ amount })
                },
                onUnauthorized
            );

            handleXpPayload(data);
            const msg = data && data.xp_event && data.xp_event.message
                ? data.xp_event.message
                : `Adjusted XP by ${amount}`;
            pushToast(msg, 'success');
        } catch (error) {
            console.error('Error granting XP:', error);
            pushToast('Failed to grant XP', 'error');
        } finally {
            setDebugBusy(false);
        }
    }, [debugBusy, getAuthHeaders, handleXpPayload, onUnauthorized, pushToast]);

    const resetRpgStats = useCallback(async () => {
        if (debugBusy) return;
        setDebugBusy(true);

        try {
            const data = await apiFetch(
                '/api/debug/reset-rpg',
                {
                    method: 'POST',
                    headers: getAuthHeaders()
                },
                onUnauthorized
            );

            handleXpPayload(data);
            pushToast('Reset RPG stats', 'success');
        } catch (error) {
            console.error('Error resetting RPG stats:', error);
            pushToast('Failed to reset RPG stats', 'error');
        } finally {
            setDebugBusy(false);
        }
    }, [debugBusy, getAuthHeaders, handleXpPayload, onUnauthorized, pushToast]);

    const createQuestSnapshot = useCallback((questId) => {
        const quest = quests.find((q) => q.id === questId);
        return quest ? cloneQuestSnapshot(quest) : null;
    }, [quests]);

    return {
        quests,
        setQuests,
        description,
        setDescription,
        priority,
        setPriority,
        taskLevel,
        setTaskLevel,
        debugBusy,
        setDebugBusy,
        showDebugTools,
        setShowDebugTools,
        reloadTasks,
        addTask,
        deleteQuest,
        updateQuest,
        setTaskStatus,
        addSideQuest,
        setSideQuestStatus,
        updateSideQuest,
        deleteSideQuest,
        clearAllQuests,
        seedDemoQuests,
        grantXp,
        resetRpgStats,
        createQuestSnapshot
    };
};
