import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { apiFetch } from '../utils/api.js';
import {
    normalizeQuest,
    normalizeQuestList,
    getQuestStatus,
    getQuestStatusLabel,
    getQuestSideQuests,
    getSideQuestStatus,
    getSideQuestStatusLabel,
    idsMatch,
    cloneQuestSnapshot,
    findSideQuestById,
    isInteractiveTarget,
    getQuestProgress,
    progressColor,
    getProgressAura,
    calculateGlobalProgress,
    getNextPriority,
    getNextLevel
} from './questHelpers.js';
import { useSmoothDragQuests } from './useSmoothDragQuests.js';

export const useQuests = ({
    token,
    getAuthHeaders,
    onUnauthorized,
    pushToast,
    campaignApi,
    playerStatsApi,
    reloadTasksRef
}) => {
    const {
        activeCampaignFilter,
        taskCampaignSelection,
        refreshCampaigns,
        getTasksEndpoint,
        campaigns = [],
        hasCampaigns = false
    } = campaignApi;
    const { setPlayerStats, handleXpPayload } = playerStatsApi;

    const [quests, setQuests] = useState([]);
    const [description, setDescription] = useState('');
    const [priority, setPriority] = useState('medium');
    const [taskLevel, setTaskLevel] = useState(1);
    const [debugBusy, setDebugBusy] = useState(false);
    const [showDebugTools, setShowDebugTools] = useState(false);
    const [editingQuest, setEditingQuest] = useState(null);
    const editingQuestInputRef = useRef(null);
    const [selectedQuestId, setSelectedQuestId] = useState(null);
    const [selectedSideQuest, setSelectedSideQuest] = useState(null);
    const [editingSideQuest, setEditingSideQuest] = useState(null);
    const [sideQuestDescriptionMap, setSideQuestDescriptionMap] = useState({});
    const [addingSideQuestTo, setAddingSideQuestTo] = useState(null);
    const [collapsedMap, setCollapsedMap] = useState({});
    const addInputRefs = useRef({});
    const undoTimersRef = useRef({});
    const completedCollapseTimersRef = useRef({});
    const [undoQueue, setUndoQueue] = useState([]);
    const [pulsingQuests, setPulsingQuests] = useState({});
    const [pulsingSideQuests, setPulsingSideQuests] = useState({});
    const [glowQuests, setGlowQuests] = useState({});
    const [celebratingQuests, setCelebratingQuests] = useState({});
    const [spawnQuests, setSpawnQuests] = useState({});
    const smoothDrag = useSmoothDragQuests({ quests, setQuests });
    const { refresh: refreshLayout } = smoothDrag || {};
    const layoutRefreshRaf = useRef(null);

    const scheduleLayoutRefresh = useCallback(() => {
        if (typeof refreshLayout !== 'function') return;
        if (typeof window === 'undefined' || typeof window.requestAnimationFrame !== 'function') {
            refreshLayout();
            return;
        }
        if (layoutRefreshRaf.current) {
            window.cancelAnimationFrame(layoutRefreshRaf.current);
        }
        layoutRefreshRaf.current = window.requestAnimationFrame(() => {
            layoutRefreshRaf.current = null;
            refreshLayout();
        });
    }, [refreshLayout]);

    useEffect(() => () => {
        if (layoutRefreshRaf.current) {
            window.cancelAnimationFrame(layoutRefreshRaf.current);
        }
    }, []);

    useEffect(() => {
        scheduleLayoutRefresh();
    }, [
        scheduleLayoutRefresh,
        quests,
        collapsedMap,
        selectedQuestId,
        selectedSideQuest,
        editingQuest,
        editingSideQuest,
        addingSideQuestTo
    ]);

    useEffect(() => {
        if (selectedQuestId !== null) {
            const exists = quests.some((quest) => idsMatch(quest.id, selectedQuestId));
            if (!exists) {
                setSelectedQuestId(null);
                setSelectedSideQuest(null);
            }
        }
    }, [quests, selectedQuestId]);

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
    }, [getTasksEndpoint, onUnauthorized, setPlayerStats, token]);

    const addTask = useCallback(async () => {
        if (!description || description.trim() === '') return;
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
            
            if (!newQuest) return;
            const normalized = normalizeQuest(newQuest);
            const matchesFilter =
                activeCampaignFilter === null
                || (activeCampaignFilter === 'uncategorized' && !normalized.campaign_id)
                || (typeof activeCampaignFilter === 'number' && normalized.campaign_id === activeCampaignFilter);
            if (matchesFilter) {
                setQuests((prev) => [normalized, ...prev]);
                if (normalized && normalized.id !== undefined && normalized.id !== null) {
                    const questId = normalized.id;
                    setSpawnQuests((prev) => ({ ...prev, [questId]: true }));
                    setPulsingQuests((prev) => ({ ...prev, [questId]: 'spawn' }));
                    setTimeout(() => {
                        setSpawnQuests((prev) => {
                            const copy = { ...prev };
                            delete copy[questId];
                            return copy;
                        });
                        setPulsingQuests((prev) => {
                            const copy = { ...prev };
                            delete copy[questId];
                            return copy;
                        });
                    }, 650);
                }
            } else {
                await reloadTasks();
            }
            refreshCampaigns();
            setDescription('');
            setPriority('medium');
            setTaskLevel(1);
        } catch (error) {
            console.error('Error adding quest:', error);
        }
    }, [
        activeCampaignFilter,
        description,
        getAuthHeaders,
        onUnauthorized,
        priority,
        refreshCampaigns,
        reloadTasks,
        setPriority,
        taskCampaignSelection,
        taskLevel
    ]);

    const addSideQuest = useCallback(async (questId) => {
        const value = sideQuestDescriptionMap[questId] || '';
        if (!value || value.trim() === '') return;
        
        try {
            const updatedTask = await apiFetch(
                `/api/tasks/${questId}/subtasks`,
                {
                    method: 'POST',
                    headers: getAuthHeaders(),
                    body: JSON.stringify({ description: value })
                },
                onUnauthorized
            );
            
            const normalized = normalizeQuest(updatedTask);
            setQuests((prev) => prev.map((quest) => (quest.id === questId ? normalized : quest)));
            setSideQuestDescriptionMap((prev) => ({ ...prev, [questId]: '' }));
            setTimeout(() => {
                if (addInputRefs.current && addInputRefs.current[questId]) {
                    try {
                        addInputRefs.current[questId].focus();
                    } catch (error) {
                        console.error(error);
                    }
                }
            }, 10);
            refreshCampaigns();
            // Refresh layout to remeasure quest card heights after adding side quest
            if (refreshLayout) {
                setTimeout(() => refreshLayout(), 50);
            }
        } catch (error) {
            console.error('Error adding side-quest:', error);
        }
    }, [getAuthHeaders, onUnauthorized, refreshCampaigns, refreshLayout, sideQuestDescriptionMap]);

    const toggleCollapse = useCallback((questId) => {
        setCollapsedMap((prev) => ({ ...prev, [questId]: !prev[questId] }));
        // Refresh layout after collapse/expand animation
        if (refreshLayout) {
            setTimeout(() => refreshLayout(), 300);
        }
    }, [refreshLayout]);

    const ensureQuestExpanded = useCallback((questId) => {
        setCollapsedMap((prev) => {
            if (!prev || !prev[questId]) return prev;
            const copy = { ...prev };
            copy[questId] = false;
            return copy;
        });
        // Refresh layout after expansion
        if (refreshLayout) {
            setTimeout(() => refreshLayout(), 300);
        }
    }, [refreshLayout]);

    const handleSelectQuest = useCallback((questId) => {
        if (questId === undefined || questId === null) return;
        setSelectedQuestId(questId);
        setSelectedSideQuest(null);
        setEditingSideQuest(null);
        ensureQuestExpanded(questId);
    }, [ensureQuestExpanded]);

    const handleSelectSideQuest = useCallback((questId, sideQuestId) => {
        if (questId === undefined || questId === null || sideQuestId === undefined || sideQuestId === null) return;
        setSelectedQuestId(questId);
        setSelectedSideQuest({ questId, sideQuestId });
        ensureQuestExpanded(questId);
    }, [ensureQuestExpanded]);

    const clearSelection = useCallback(() => {
        setSelectedQuestId(null);
        setSelectedSideQuest(null);
        setEditingSideQuest(null);
    }, []);

    const findQuestById = useCallback((questId) => {
        if (questId === undefined || questId === null) return null;
        return quests.find((q) => idsMatch(q.id, questId)) || null;
    }, [quests]);

    const moveQuestSelection = useCallback((offset) => {
        if (!Array.isArray(quests) || quests.length === 0) return false;
        const currentIndex = selectedQuestId !== null
            ? quests.findIndex((q) => idsMatch(q.id, selectedQuestId))
            : -1;
        let nextIndex;
        if (currentIndex === -1) {
            nextIndex = offset >= 0 ? 0 : quests.length - 1;
        } else {
            nextIndex = currentIndex + offset;
            if (nextIndex < 0) nextIndex = 0;
            if (nextIndex >= quests.length) nextIndex = quests.length - 1;
        }
        if (nextIndex === currentIndex || nextIndex < 0 || nextIndex >= quests.length) return false;
        const nextQuest = quests[nextIndex];
        if (nextQuest) {
            handleSelectQuest(nextQuest.id);
            return true;
        }
        return false;
    }, [handleSelectQuest, quests, selectedQuestId]);

    const selectFirstSideQuest = useCallback((questId) => {
        const quest = findQuestById(questId);
        const subs = getQuestSideQuests(quest);
        if (!quest || subs.length === 0) return;
        ensureQuestExpanded(questId);
        const first = subs[0];
        if (first) {
            handleSelectSideQuest(questId, first.id);
        }
    }, [ensureQuestExpanded, findQuestById, handleSelectSideQuest]);

    const scheduleQuestUndo = useCallback((quest) => {
        if (!quest) return;
        const snapshot = cloneQuestSnapshot(quest);
        if (!snapshot) return;
        const entryId = `${quest.id}-${Date.now()}`;
        if (typeof window === 'undefined') return;
        const timer = window.setTimeout(() => {
            setUndoQueue((prev) => prev.filter((entry) => entry.id !== entryId));
            if (undoTimersRef.current && undoTimersRef.current[entryId]) {
                delete undoTimersRef.current[entryId];
            }
        }, 7000);
        if (!undoTimersRef.current) undoTimersRef.current = {};
        undoTimersRef.current[entryId] = timer;
        setUndoQueue((prev) => [...prev, { id: entryId, quest: snapshot }]);
    }, []);

    const dismissUndoEntry = useCallback((entryId) => {
        if (undoTimersRef.current && undoTimersRef.current[entryId]) {
            clearTimeout(undoTimersRef.current[entryId]);
            delete undoTimersRef.current[entryId];
        }
        setUndoQueue((prev) => prev.filter((entry) => entry.id !== entryId));
    }, []);

    const restoreQuestFromSnapshot = useCallback((snapshot) => {
        if (!snapshot) return;
        const payload = normalizeQuest(snapshot);
        setQuests((prev) => {
            const next = [...prev];
            const index = next.findIndex((quest) => idsMatch(quest.id, payload.id));
            if (index === -1) {
                next.unshift(payload);
            } else {
                next[index] = payload;
            }
            return next;
        });
    }, []);

    const handleUndoDelete = useCallback((entryId) => {
        const entry = undoQueue.find((item) => item.id === entryId);
        if (!entry) return;
        restoreQuestFromSnapshot(entry.quest);
        dismissUndoEntry(entryId);
    }, [dismissUndoEntry, restoreQuestFromSnapshot, undoQueue]);

    const deleteTask = useCallback(async (id) => {
        const questToDelete = quests.find((quest) => idsMatch(quest.id, id));
        
        try {
            await apiFetch(
                `/api/tasks/${id}`,
                {
                    method: 'DELETE',
                    headers: getAuthHeaders()
                },
                onUnauthorized
            );
            
            setQuests((prev) => prev.filter((quest) => !idsMatch(quest.id, id)));
            if (editingQuest && idsMatch(editingQuest.id, id)) {
                setEditingQuest(null);
            }
            if (questToDelete) scheduleQuestUndo(questToDelete);
            refreshCampaigns();
        } catch (error) {
            console.error('Error deleting quest:', error);
        }
    }, [editingQuest, getAuthHeaders, onUnauthorized, quests, refreshCampaigns, scheduleQuestUndo]);

    const updateTask = useCallback(async (id, updatedTask) => {
        const payload = { ...updatedTask };
        if (Object.prototype.hasOwnProperty.call(payload, 'task_level')) {
            payload.task_level = Number(payload.task_level) || 1;
        }
        
        try {
            const updatedQuest = await apiFetch(
                `/api/tasks/${id}`,
                {
                    method: 'PUT',
                    headers: getAuthHeaders(),
                    body: JSON.stringify(payload)
                },
                onUnauthorized
            );
            
            const normalized = normalizeQuest(updatedQuest);
            setQuests((prev) => prev.map((quest) => (quest.id === id ? normalized : quest)));
            setEditingQuest(null);
            refreshCampaigns();
        } catch (error) {
            console.error('Error updating quest:', error);
        }
    }, [getAuthHeaders, onUnauthorized, refreshCampaigns]);

    const scheduleCollapseAndMove = useCallback((questId, delay = 600) => {
        const ensureAtBottomCollapsed = () => {
            let shouldCollapse = false;
            setQuests((prev) => {
                const index = prev.findIndex((quest) => idsMatch(quest.id, questId));
                if (index === -1) return prev;
                const quest = prev[index];
                if (getQuestStatus(quest) !== 'done') return prev;
                shouldCollapse = true;
                const next = [...prev];
                const [item] = next.splice(index, 1);
                next.push(item);
                return next;
            });
            if (shouldCollapse) {
                setCollapsedMap((prev) => ({ ...prev, [questId]: true }));
            }
        };
        if (typeof window !== 'undefined') {
            if (completedCollapseTimersRef.current && typeof completedCollapseTimersRef.current[questId] === 'number') {
                clearTimeout(completedCollapseTimersRef.current[questId]);
                delete completedCollapseTimersRef.current[questId];
            }
            if (!completedCollapseTimersRef.current) completedCollapseTimersRef.current = {};
            completedCollapseTimersRef.current[questId] = window.setTimeout(() => {
                ensureAtBottomCollapsed();
                if (completedCollapseTimersRef.current) {
                    delete completedCollapseTimersRef.current[questId];
                }
            }, delay);
        } else {
            ensureAtBottomCollapsed();
        }
    }, []);

    const setTaskStatus = useCallback(async (id, status, note) => {
        try {
            const updatedQuest = await apiFetch(
                `/api/tasks/${id}/status`,
                {
                    method: 'PATCH',
                    headers: getAuthHeaders(),
                    body: JSON.stringify({ status, note })
                },
                onUnauthorized
            );
            
            handleXpPayload(updatedQuest);
            const normalized = normalizeQuest(updatedQuest);
            setQuests((prev) => prev.map((task) => (task.id === id ? normalized : task)));
            setPulsingQuests((prev) => ({ ...prev, [id]: 'full' }));
            setTimeout(() => setPulsingQuests((prev) => {
                const copy = { ...prev };
                delete copy[id];
                return copy;
            }), 700);
            if (status === 'done') {
                setGlowQuests((prev) => ({ ...prev, [id]: true }));
                setTimeout(() => setGlowQuests((prev) => {
                    const copy = { ...prev };
                    delete copy[id];
                    return copy;
                }), 1400);
                setCelebratingQuests((prev) => ({ ...prev, [id]: true }));
                setTimeout(() => setCelebratingQuests((prev) => {
                    const copy = { ...prev };
                    delete copy[id];
                    return copy;
                }), 1400);
                scheduleCollapseAndMove(id);
            }
            refreshCampaigns();
        } catch (error) {
            console.error('Error updating quest status:', error);
        }
    }, [getAuthHeaders, handleXpPayload, onUnauthorized, refreshCampaigns, scheduleCollapseAndMove]);

    const setSideQuestStatus = useCallback(async (taskId, subTaskId, status, note) => {
        try {
            const updatedTask = await apiFetch(
                `/api/tasks/${taskId}/subtasks/${subTaskId}/status`,
                {
                    method: 'PATCH',
                    headers: getAuthHeaders(),
                    body: JSON.stringify({ status, note })
                },
                onUnauthorized
            );
            
            const normalized = normalizeQuest(updatedTask);
            setQuests((prev) => prev.map((task) => (task.id === taskId ? normalized : task)));
            const subStatus = getSideQuestStatus(findSideQuestById(normalized, subTaskId), normalized);
            setPulsingSideQuests((prev) => ({ ...prev, [`${taskId}:${subTaskId}`]: subStatus === 'done' ? 'full' : 'subtle' }));
            setTimeout(() => setPulsingSideQuests((prev) => {
                const copy = { ...prev };
                delete copy[`${taskId}:${subTaskId}`];
                return copy;
            }), 700);
            if (subStatus === 'done') {
                ensureQuestExpanded(taskId);
            }
            refreshCampaigns();
            // Refresh layout to remeasure quest card heights after status change
            if (refreshLayout) {
                setTimeout(() => refreshLayout(), 50);
            }
        } catch (error) {
            console.error('Error updating side-quest status:', error);
        }
    }, [ensureQuestExpanded, getAuthHeaders, onUnauthorized, refreshCampaigns, refreshLayout]);

    const updateSideQuest = useCallback(async (taskId, subTaskId, payload) => {
        try {
            const updatedTask = await apiFetch(
                `/api/tasks/${taskId}/subtasks/${subTaskId}`,
                {
                    method: 'PUT',
                    headers: getAuthHeaders(),
                    body: JSON.stringify(payload)
                },
                onUnauthorized
            );
            
            const normalized = normalizeQuest(updatedTask);
            setQuests((prev) => prev.map((quest) => (quest.id === taskId ? normalized : quest)));
            refreshCampaigns();
            // Refresh layout to remeasure quest card heights after update
            if (refreshLayout) {
                setTimeout(() => refreshLayout(), 50);
            }
            return normalized;
        } catch (error) {
            console.error('Error updating side-quest:', error);
            throw error;
        }
    }, [getAuthHeaders, onUnauthorized, refreshCampaigns, refreshLayout]);

    const deleteSideQuest = useCallback(async (taskId, subTaskId) => {
        try {
            const updatedTask = await apiFetch(
                `/api/tasks/${taskId}/subtasks/${subTaskId}`,
                {
                    method: 'DELETE',
                    headers: getAuthHeaders()
                },
                onUnauthorized
            );
            
            const normalized = normalizeQuest(updatedTask);
            setQuests((prev) => prev.map((quest) => (quest.id === taskId ? normalized : quest)));
            if (selectedSideQuest && idsMatch(selectedSideQuest.questId, taskId) && idsMatch(selectedSideQuest.sideQuestId, subTaskId)) {
                setSelectedSideQuest(null);
            }
            if (editingSideQuest && idsMatch(editingSideQuest.questId, taskId) && idsMatch(editingSideQuest.sideQuestId, subTaskId)) {
                setEditingSideQuest(null);
            }
            refreshCampaigns();
            // Refresh layout to remeasure quest card heights after deletion
            if (refreshLayout) {
                setTimeout(() => refreshLayout(), 50);
            }
        } catch (error) {
            console.error('Error deleting side-quest:', error);
        }
    }, [editingSideQuest, getAuthHeaders, onUnauthorized, refreshCampaigns, refreshLayout, selectedSideQuest]);

    const startEditingSideQuest = useCallback((questId, sideQuest) => {
        if (!sideQuest) return;
        setEditingSideQuest({ questId, sideQuestId: sideQuest.id, description: sideQuest.description || '' });
        setTimeout(() => {
            const ref = addInputRefs.current && addInputRefs.current[`${questId}:${sideQuest.id}:edit`];
            if (ref) {
                try {
                    ref.focus();
                } catch (error) {
                    console.error(error);
                }
            }
        }, 0);
    }, []);

    const handleSideQuestEditChange = useCallback((input) => {
        const nextValue = typeof input === 'string'
            ? input
            : (input && input.target ? input.target.value : '');
        setEditingSideQuest((prev) => (prev ? { ...prev, description: nextValue } : prev));
    }, []);

    const cancelSideQuestEdit = useCallback(() => {
        setEditingSideQuest(null);
    }, []);

    const saveSideQuestEdit = useCallback((questId, subTaskId) => {
        if (!editingSideQuest || !idsMatch(editingSideQuest.questId, questId) || !idsMatch(editingSideQuest.sideQuestId, subTaskId)) return;
        const nextDescription = (editingSideQuest.description || '').trim();
        if (!nextDescription) {
            pushToast('Description cannot be empty', 'error');
            return;
        }
        updateSideQuest(questId, subTaskId, { description: nextDescription })
            .then(() => {
                setEditingSideQuest(null);
                pushToast('Side-quest updated', 'success');
            })
            .catch((error) => {
                console.error('Error updating side-quest:', error);
                pushToast('Failed to update side-quest', 'error');
            });
    }, [editingSideQuest, pushToast, updateSideQuest]);

    const handleEditChange = useCallback((event) => {
        const { name, value } = event.target;
        setEditingQuest((prevQuest) => {
            if (!prevQuest) return prevQuest;
            let nextValue = value;
            if (name === 'task_level') {
                nextValue = Number(value) || 1;
            } else if (name === 'campaign_id') {
                nextValue = value === '' ? null : Number(value);
            }
            return { ...prevQuest, [name]: nextValue };
        });
    }, []);

    const cyclePriority = useCallback(() => {
        setPriority((prev) => getNextPriority(prev));
    }, []);

    const cycleTaskLevel = useCallback(() => {
        setTaskLevel((prev) => getNextLevel(prev));
    }, []);

    const cycleEditingPriority = useCallback(() => {
        setEditingQuest((prev) => (prev ? { ...prev, priority: getNextPriority(prev.priority || 'low') } : prev));
    }, []);

    const cycleEditingLevel = useCallback(() => {
        setEditingQuest((prev) => (prev ? { ...prev, task_level: getNextLevel(prev.task_level || 1) } : prev));
    }, []);

    const renderEditForm = useCallback((quest) => {
        const currentPriority = editingQuest?.priority || 'medium';
        const currentLevel = editingQuest?.task_level || 1;
        const currentCampaignId = editingQuest && editingQuest.campaign_id !== null && editingQuest.campaign_id !== undefined
            ? String(editingQuest.campaign_id)
            : '';
        return (
            <div className="edit-quest-form" key={quest.id}>
                <input
                    type="text"
                    name="description"
                    value={editingQuest?.description || ''}
                    onChange={handleEditChange}
                    ref={editingQuestInputRef}
                />
                <div className="edit-quest-footer">
                    <div className="edit-quest-meta">
                        <div className="edit-quest-toggles">
                            <button type="button" className="btn-ghost" onClick={cycleEditingPriority}>
                                Priority: {currentPriority}
                            </button>
                            <button type="button" className="btn-ghost" onClick={cycleEditingLevel}>
                                Level: {currentLevel}
                            </button>
                        </div>
                        <label className="edit-quest-campaign" htmlFor={`edit-campaign-${quest.id}`}>
                            <span>Campaign</span>
                            <div className="campaign-select compact">
                                <select
                                    id={`edit-campaign-${quest.id}`}
                                    name="campaign_id"
                                    value={currentCampaignId}
                                    onChange={handleEditChange}
                                >
                                    <option value="">{hasCampaigns ? 'No campaign' : 'No campaigns yet'}</option>
                                    {campaigns.map((campaign) => (
                                        <option key={campaign.id} value={campaign.id}>
                                            {campaign.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </label>
                    </div>
                    <div className="edit-actions">
                        <button type="button" className="btn-secondary" onClick={() => setEditingQuest(null)}>Cancel</button>
                        <button
                            type="button"
                            className="btn-primary"
                            onClick={() => updateTask(quest.id, editingQuest)}
                        >
                            Save
                        </button>
                    </div>
                </div>
            </div>
        );
    }, [campaigns, cycleEditingLevel, cycleEditingPriority, editingQuest, handleEditChange, hasCampaigns, updateTask]);

    const renderAddSideQuestForm = useCallback((questId) => (
        <div className="add-side-quest">
            <input
                ref={(el) => { if (!addInputRefs.current) addInputRefs.current = {}; addInputRefs.current[questId] = el; }}
                type="text"
                placeholder="Add a side-quest"
                value={sideQuestDescriptionMap[questId] || ''}
                onChange={(event) => setSideQuestDescriptionMap((prev) => ({ ...prev, [questId]: event.target.value }))}
                onFocus={() => setAddingSideQuestTo(questId)}
                onBlur={() => {
                    setTimeout(() => {
                        setAddingSideQuestTo((prev) => (prev === questId ? null : prev));
                    }, 100);
                }}
                onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                        event.preventDefault();
                        addSideQuest(questId);
                    }
                    if (event.key === 'Escape') {
                        setSideQuestDescriptionMap((prev) => ({ ...prev, [questId]: '' }));
                        setAddingSideQuestTo(null);
                    }
                }}
            />
            <button type="button" className="btn-link" onClick={() => addSideQuest(questId)}>Add</button>
        </div>
    ), [addSideQuest, sideQuestDescriptionMap]);

    useEffect(() => {
        const handleClick = (event) => {
            if (!editingQuest) return;
            if (isInteractiveTarget(event.target)) return;
            if (event.target && typeof event.target.closest === 'function' && event.target.closest('.edit-quest-form')) return;
            setEditingQuest(null);
        };
        document.addEventListener('click', handleClick);
        return () => document.removeEventListener('click', handleClick);
    }, [editingQuest]);

    useEffect(() => {
        if (!editingQuestInputRef.current) return;
        try {
            editingQuestInputRef.current.focus();
        } catch (error) {
            console.error(error);
        }
    }, [editingQuest]);

    useEffect(() => {
        const handleKeyDown = (event) => {
            if (isInteractiveTarget(event.target)) return;
            if (event.target && typeof event.target.closest === 'function' && event.target.closest('[data-skip-shortcuts="true"]')) return;
            if (!quests.length) return;
            const currentQuest = selectedQuestId !== null ? findQuestById(selectedQuestId) : null;
            switch (event.key) {
                case 'j':
                case 'J':
                case 'ArrowDown': {
                    event.preventDefault();
                    moveQuestSelection(1);
                    break;
                }
                case 'k':
                case 'K':
                case 'ArrowUp': {
                    event.preventDefault();
                    moveQuestSelection(-1);
                    break;
                }
                case ' ':
                case 'Enter': {
                    if (!currentQuest) break;
                    event.preventDefault();
                    const nextStatus = getQuestStatus(currentQuest) === 'done' ? 'in_progress' : 'done';
                    setTaskStatus(currentQuest.id, nextStatus);
                    break;
                }
                case 'c':
                case 'C': {
                    event.preventDefault();
                    cyclePriority();
                    break;
                }
                case 'l':
                case 'L': {
                    event.preventDefault();
                    cycleTaskLevel();
                    break;
                }
                case 'Escape': {
                    clearSelection();
                    break;
                }
                case 'Tab': {
                    if (!currentQuest) break;
                    if (event.shiftKey) {
                        event.preventDefault();
                        const subs = getQuestSideQuests(currentQuest);
                        const idx = selectedSideQuest
                            ? subs.findIndex((sub) => idsMatch(sub.id, selectedSideQuest.sideQuestId))
                            : subs.length - 1;
                        if (idx > 0) {
                            handleSelectSideQuest(currentQuest.id, subs[idx - 1].id);
                            return;
                        }
                        setSelectedSideQuest(null);
                        handleSelectQuest(currentQuest.id);
                        return;
                    }
                    event.preventDefault();
                    if (selectedSideQuest) {
                        const subs = getQuestSideQuests(currentQuest);
                        const idx = subs.findIndex((sub) => idsMatch(sub.id, selectedSideQuest.sideQuestId));
                        if (idx !== -1 && idx < subs.length - 1) {
                            handleSelectSideQuest(currentQuest.id, subs[idx + 1].id);
                            return;
                        }
                        const next = quests.findIndex((quest) => idsMatch(quest.id, currentQuest.id));
                        if (next !== -1 && next < quests.length - 1) {
                            handleSelectQuest(quests[next + 1].id);
                        }
                        setSelectedSideQuest(null);
                        return;
                    }
                    selectFirstSideQuest(currentQuest.id);
                    break;
                }
                case 'ArrowRight': {
                    if (selectedSideQuest) break;
                    if (currentQuest) {
                        ensureQuestExpanded(currentQuest.id);
                        const subs = Array.isArray(currentQuest.side_quests) ? currentQuest.side_quests : [];
                        if (subs.length > 0) {
                            event.preventDefault();
                            selectFirstSideQuest(currentQuest.id);
                        }
                    }
                    break;
                }
                case 'ArrowLeft': {
                    if (selectedSideQuest) {
                        event.preventDefault();
                        setSelectedSideQuest(null);
                        if (currentQuest) handleSelectQuest(currentQuest.id);
                    }
                    break;
                }
                case 'Delete':
                case 'Backspace': {
                    if (selectedSideQuest && currentQuest) {
                        event.preventDefault();
                        const subs = getQuestSideQuests(currentQuest);
                        const match = subs.find((sub) => idsMatch(sub.id, selectedSideQuest.sideQuestId));
                        const label = match && match.description ? match.description : 'this side-quest';
                        if (window.confirm(`Delete ${label}?`)) {
                            deleteSideQuest(selectedSideQuest.questId, selectedSideQuest.sideQuestId);
                        }
                    } else if (selectedQuestId !== null && currentQuest) {
                        event.preventDefault();
                        const label = currentQuest.description || 'this quest';
                        if (window.confirm(`Delete ${label}?`)) {
                            deleteTask(currentQuest.id);
                        }
                    }
                    break;
                }
                default:
                    break;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [
        clearSelection,
        deleteSideQuest,
        deleteTask,
        ensureQuestExpanded,
        findQuestById,
        handleSelectQuest,
        handleSelectSideQuest,
        moveQuestSelection,
        quests,
        selectFirstSideQuest,
        selectedQuestId,
        selectedSideQuest,
        setTaskStatus
    ]);

    const globalProgress = useMemo(() => calculateGlobalProgress(quests), [quests]);
    const globalAura = useMemo(() => getProgressAura(globalProgress.percent), [globalProgress.percent]);
    const globalLabel = globalProgress.weightingToday
        ? `Today (${globalProgress.todayCount} quest${globalProgress.todayCount === 1 ? '' : 's'}${globalProgress.backlogCount ? ` + ${globalProgress.backlogCount} backlog` : ''})`
        : `All quests (${globalProgress.totalCount})`;

    const clearAllQuests = useCallback(async () => {
        if (debugBusy) return;
        setDebugBusy(true);
        
        try {
            const data = await apiFetch(
                '/api/debug/clear-tasks',
                {
                    method: 'POST',
                    headers: getAuthHeaders()
                },
                onUnauthorized
            );
            
            setQuests([]);
            pushToast(`Cleared ${data.removed || 0} quests`, 'success');
            refreshCampaigns();
        } catch (error) {
            console.error('Error clearing quests:', error);
            pushToast('Failed to clear quests', 'error');
        } finally {
            setDebugBusy(false);
        }
    }, [debugBusy, getAuthHeaders, onUnauthorized, pushToast, refreshCampaigns]);

    const seedDemoQuests = useCallback(async (count = 5) => {
        if (debugBusy) return;
        setDebugBusy(true);
        
        try {
            const data = await apiFetch(
                '/api/debug/seed-tasks',
                {
                    method: 'POST',
                    headers: getAuthHeaders(),
                    body: JSON.stringify({ count })
                },
                onUnauthorized
            );
            
            pushToast(`Seeded ${data.created || 0} demo quests`, 'success');
            await reloadTasks();
        } catch (error) {
            console.error('Error seeding quests:', error);
            pushToast('Failed to seed quests', 'error');
        } finally {
            setDebugBusy(false);
        }
    }, [debugBusy, getAuthHeaders, onUnauthorized, pushToast, reloadTasks]);

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
        editingQuest,
        setEditingQuest,
        editingQuestInputRef,
        selectedQuestId,
        setSelectedQuestId,
        selectedSideQuest,
        setSelectedSideQuest,
        editingSideQuest,
        setEditingSideQuest,
        sideQuestDescriptionMap,
        setSideQuestDescriptionMap,
        addingSideQuestTo,
        setAddingSideQuestTo,
        collapsedMap,
        setCollapsedMap,
        addInputRefs,
        undoTimersRef,
        completedCollapseTimersRef,
        undoQueue,
        setUndoQueue,
        pulsingQuests,
        setPulsingQuests,
        pulsingSideQuests,
        setPulsingSideQuests,
        glowQuests,
        setGlowQuests,
        celebratingQuests,
        setCelebratingQuests,
        spawnQuests,
        setSpawnQuests,
        smoothDrag,
        addTask,
        addSideQuest,
        toggleCollapse,
        ensureQuestExpanded,
        handleSelectQuest,
        handleSelectSideQuest,
        clearSelection,
        findQuestById,
        moveQuestSelection,
        selectFirstSideQuest,
        scheduleQuestUndo,
        dismissUndoEntry,
        restoreQuestFromSnapshot,
        handleUndoDelete,
        deleteTask,
        updateTask,
        setTaskStatus,
        setSideQuestStatus,
        updateSideQuest,
        deleteSideQuest,
        startEditingSideQuest,
        handleSideQuestEditChange,
        cancelSideQuestEdit,
        saveSideQuestEdit,
        handleEditChange,
        cyclePriority,
        cycleTaskLevel,
        cycleEditingPriority,
        cycleEditingLevel,
        renderEditForm,
        renderAddSideQuestForm,
        calculateGlobalProgress,
        globalProgress,
        globalAura,
        globalLabel,
        getQuestProgress,
        getQuestStatus,
        getQuestStatusLabel,
        getQuestSideQuests,
        getSideQuestStatus,
        getSideQuestStatusLabel,
        idsMatch,
        isInteractiveTarget,
        reloadTasks,
        scheduleCollapseAndMove,
        clearAllQuests,
        seedDemoQuests,
        grantXp,
        resetRpgStats,
        progressColor
    };
};
