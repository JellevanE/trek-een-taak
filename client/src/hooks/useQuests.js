import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useQuestData } from '../features/quest-board/hooks/useQuestData.js';
import {
    normalizeQuest,
    getQuestStatus,
    getQuestStatusLabel,
    getQuestSideQuests,
    getSideQuestStatus,
    getSideQuestStatusLabel,
    idsMatch,
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
import { SOUND_EVENT_KEYS } from '../theme';

export const useQuests = ({
    token,
    getAuthHeaders,
    onUnauthorized,
    pushToast,
    campaignApi,
    playerStatsApi,
    reloadTasksRef,
    soundFx = null
}) => {
    const {
        activeCampaignFilter,
        taskCampaignSelection,
        refreshCampaigns,
        getTasksEndpoint
    } = campaignApi;
    const [editingQuest, setEditingQuest] = useState(null);
    const editingQuestInputRef = useRef(null);
    const questData = useQuestData({
        token,
        getAuthHeaders,
        onUnauthorized,
        pushToast,
        campaignApi,
        playerStatsApi,
        reloadTasksRef
    });

    const {
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
        addTask: createQuest,
        deleteQuest,
        updateQuest,
        setTaskStatus: mutateTaskStatus,
        addSideQuest: createSideQuest,
        setSideQuestStatus: mutateSideQuestStatus,
        updateSideQuest: updateSideQuestRequest,
        deleteSideQuest: deleteSideQuestRequest,
        clearAllQuests,
        seedDemoQuests,
        grantXp,
        resetRpgStats,
        createQuestSnapshot
    } = questData;

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
    const playSound = useCallback((eventKey) => {
        if (!soundFx || typeof soundFx.play !== 'function' || !eventKey) return;
        soundFx.play(eventKey);
    }, [soundFx]);

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

    const addTask = useCallback(async () => {
        const created = await createQuest();
        if (created && created.id !== undefined && created.id !== null) {
            const questId = created.id;
            playSound(SOUND_EVENT_KEYS.QUEST_ADD);
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
    }, [createQuest, playSound]);

    const addSideQuest = useCallback(async (questId) => {
        const value = sideQuestDescriptionMap[questId] || '';
        if (!value || value.trim() === '') return;
        const updatedQuest = await createSideQuest(questId, value);
        if (updatedQuest) {
            setSideQuestDescriptionMap((prev) => ({ ...prev, [questId]: '' }));
            playSound(SOUND_EVENT_KEYS.SIDE_QUEST_ADD);
            setTimeout(() => {
                if (addInputRefs.current && addInputRefs.current[questId]) {
                    try {
                        addInputRefs.current[questId].focus();
                    } catch (error) {
                        console.error(error);
                    }
                }
            }, 10);
            if (refreshLayout) {
                setTimeout(() => refreshLayout(), 50);
            }
        }
    }, [createSideQuest, playSound, refreshLayout, sideQuestDescriptionMap]);

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
        const snapshot = createQuestSnapshot(quest.id) || quest;
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
        if (!questToDelete) return;
        setQuests((prev) => prev.filter((quest) => !idsMatch(quest.id, id)));
        if (editingQuest && idsMatch(editingQuest.id, id)) {
            setEditingQuest(null);
        }
        scheduleQuestUndo(questToDelete);
        await deleteQuest(id);
    }, [deleteQuest, editingQuest, quests, scheduleQuestUndo, setQuests]);

    const updateTask = useCallback(async (id, updatedTask) => {
        const payload = { ...updatedTask };
        if (Object.prototype.hasOwnProperty.call(payload, 'task_level')) {
            payload.task_level = Number(payload.task_level) || 1;
        }
        await updateQuest(id, payload);
        setEditingQuest(null);
    }, [setEditingQuest, updateQuest]);

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
        const updatedQuest = await mutateTaskStatus(id, status, note);
        if (!updatedQuest) return;
        setPulsingQuests((prev) => ({ ...prev, [id]: 'full' }));
        setTimeout(() => setPulsingQuests((prev) => {
            const copy = { ...prev };
            delete copy[id];
            return copy;
        }), 700);
        if (status === 'done') {
            playSound(SOUND_EVENT_KEYS.QUEST_COMPLETE);
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
    }, [mutateTaskStatus, playSound, scheduleCollapseAndMove]);

    const setSideQuestStatus = useCallback(async (taskId, subTaskId, status, note) => {
        const normalized = await mutateSideQuestStatus(taskId, subTaskId, status, note);
        if (!normalized) return;
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
        if (refreshLayout) {
            setTimeout(() => refreshLayout(), 50);
        }
    }, [ensureQuestExpanded, findSideQuestById, getSideQuestStatus, mutateSideQuestStatus, refreshLayout]);

    const updateSideQuest = useCallback(async (taskId, subTaskId, payload) => {
        const normalized = await updateSideQuestRequest(taskId, subTaskId, payload);
        if (normalized && refreshLayout) {
            setTimeout(() => refreshLayout(), 50);
        }
        return normalized;
    }, [refreshLayout, updateSideQuestRequest]);

    const deleteSideQuest = useCallback(async (taskId, subTaskId) => {
        const normalized = await deleteSideQuestRequest(taskId, subTaskId);
        if (!normalized) return;
        if (selectedSideQuest && idsMatch(selectedSideQuest.questId, taskId) && idsMatch(selectedSideQuest.sideQuestId, subTaskId)) {
            setSelectedSideQuest(null);
        }
        if (editingSideQuest && idsMatch(editingSideQuest.questId, taskId) && idsMatch(editingSideQuest.sideQuestId, subTaskId)) {
            setEditingSideQuest(null);
        }
        if (refreshLayout) {
            setTimeout(() => refreshLayout(), 50);
        }
    }, [deleteSideQuestRequest, editingSideQuest, refreshLayout, selectedSideQuest]);

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
        playSound(SOUND_EVENT_KEYS.PRIORITY_CYCLE);
        setPriority((prev) => getNextPriority(prev));
    }, [playSound]);

    const cycleTaskLevel = useCallback(() => {
        playSound(SOUND_EVENT_KEYS.LEVEL_UP);
        setTaskLevel((prev) => getNextLevel(prev));
    }, [playSound]);

    const cycleEditingPriority = useCallback(() => {
        playSound(SOUND_EVENT_KEYS.PRIORITY_CYCLE);
        setEditingQuest((prev) => (prev ? { ...prev, priority: getNextPriority(prev.priority || 'low') } : prev));
    }, [playSound]);

    const cycleEditingLevel = useCallback(() => {
        playSound(SOUND_EVENT_KEYS.LEVEL_UP);
        setEditingQuest((prev) => (prev ? { ...prev, task_level: getNextLevel(prev.task_level || 1) } : prev));
    }, [playSound]);


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
