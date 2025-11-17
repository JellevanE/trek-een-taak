import { useRef, useEffect, useCallback } from 'react';
import { useShallow } from 'zustand/react/shallow';
import {
    getNextLevel,
    getNextPriority,
    getQuestSideQuests,
    getQuestStatus,
    idsMatch,
    isInteractiveTarget
} from '../../../hooks/questHelpers.js';
import { SOUND_EVENT_KEYS } from '../../../theme';
import { useQuestBoardStore } from '../../../store/questBoardStore.js';

/**
 * Packages higher-level quest interactions: keyboard shortcuts, undo queue,
 * layout refresh scheduling, and CRUD helpers that wrap `useQuestData`.
 */
export const useQuestInteractions = ({
    quests,
    setQuests,
    selection,
    animations,
    refreshLayout = null,
    playSound,
    pushToast,
    createQuest,
    deleteQuest,
    updateQuest,
    createSideQuest,
    updateSideQuestRequest,
    deleteSideQuestRequest,
    createQuestSnapshot,
    setPriority,
    setTaskLevel
}) => {
    const {
        selectedQuestId,
        setSelectedQuestId,
        selectedSideQuest,
        setSelectedSideQuest,
        editingQuest,
        setEditingQuest,
        editingSideQuest,
        setEditingSideQuest,
        sideQuestDescriptionMap,
        setSideQuestDescriptionMap,
        addingSideQuestTo,
        setAddingSideQuestTo,
        loadingSideQuestAdds,
        setLoadingSideQuestAdds,
        collapsedMap,
        addInputRefs,
        ensureQuestExpanded,
        handleSelectQuest,
        handleSelectSideQuest,
        clearSelection,
        findQuestById,
        moveQuestSelection,
        selectFirstSideQuest
    } = selection;

    const {
        triggerQuestSpawn,
        setTaskStatus,
        setSideQuestStatus
    } = animations;

    const undoTimersRef = useRef({});
    const { undoQueue, setUndoQueue } = useQuestBoardStore(useShallow((state) => ({
        undoQueue: state.undoQueue,
        setUndoQueue: state.setUndoQueue
    })));
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
        if (layoutRefreshRaf.current && typeof window !== 'undefined') {
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

    const addTask = useCallback(async () => {
        const created = await createQuest();
        if (created && created.id !== undefined && created.id !== null) {
            playSound(SOUND_EVENT_KEYS.QUEST_ADD);
            triggerQuestSpawn(created.id);
        }
    }, [createQuest, playSound, triggerQuestSpawn]);

    const addSideQuest = useCallback(async (questId) => {
        const rawValue = sideQuestDescriptionMap[questId] || '';
        const value = rawValue.trim();
        if (!value) return;

        // Mark this quest as loading
        setLoadingSideQuestAdds((prev) => {
            const next = new Set(prev);
            next.add(questId);
            return next;
        });

        const optimisticId = `optimistic-${questId}-${Date.now()}`;
        const optimisticSideQuest = {
            id: optimisticId,
            description: value,
            status: 'todo',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            optimistic: true
        };

        setQuests((prev) => prev.map((quest) => {
            if (!idsMatch(quest.id, questId)) return quest;
            const nextSideQuests = [...getQuestSideQuests(quest), optimisticSideQuest];
            return { ...quest, side_quests: nextSideQuests };
        }));

        const clearOptimistic = () => {
            setQuests((prev) => prev.map((quest) => {
                if (!idsMatch(quest.id, questId)) return quest;
                const filtered = getQuestSideQuests(quest).filter((sub) => !idsMatch(sub.id, optimisticId));
                return { ...quest, side_quests: filtered };
            }));
        };

        setSideQuestDescriptionMap((prev) => ({ ...prev, [questId]: '' }));

        try {
            const updatedQuest = await createSideQuest(questId, value);
            if (!updatedQuest) {
                clearOptimistic();
                pushToast('Failed to add side quest', 'error');
                return;
            }
            setQuests((prev) => prev.map((quest) => (
                idsMatch(quest.id, updatedQuest.id) ? updatedQuest : quest
            )));
            playSound(SOUND_EVENT_KEYS.SIDE_QUEST_ADD);
        } catch (error) {
            console.error('Error adding side quest:', error);
            clearOptimistic();
            pushToast('Failed to add side quest', 'error');
        } finally {
            // Clear loading state
            setLoadingSideQuestAdds((prev) => {
                const next = new Set(prev);
                next.delete(questId);
                return next;
            });

            setTimeout(() => {
                if (addInputRefs.current && addInputRefs.current[questId]) {
                    try {
                        addInputRefs.current[questId].focus();
                    } catch (focusError) {
                        console.error(focusError);
                    }
                }
            }, 10);
            if (refreshLayout) {
                setTimeout(() => refreshLayout(), 50);
            }
        }
    }, [
        addInputRefs,
        createSideQuest,
        playSound,
        pushToast,
        refreshLayout,
        setLoadingSideQuestAdds,
        setQuests,
        setSideQuestDescriptionMap,
        sideQuestDescriptionMap
    ]);

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
    }, [createQuestSnapshot, setUndoQueue]);

    const dismissUndoEntry = useCallback((entryId) => {
        if (undoTimersRef.current && undoTimersRef.current[entryId]) {
            clearTimeout(undoTimersRef.current[entryId]);
            delete undoTimersRef.current[entryId];
        }
        setUndoQueue((prev) => prev.filter((entry) => entry.id !== entryId));
    }, [setUndoQueue]);

    const restoreQuestFromSnapshot = useCallback((snapshot) => {
        if (!snapshot) return;
        setQuests((prev) => {
            const next = [...prev];
            const index = next.findIndex((quest) => idsMatch(quest.id, snapshot.id));
            if (index === -1) {
                next.unshift(snapshot);
            } else {
                next[index] = snapshot;
            }
            return next;
        });
    }, [setQuests]);

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
        if (
            selectedSideQuest
            && idsMatch(selectedSideQuest.questId, taskId)
            && idsMatch(selectedSideQuest.sideQuestId, subTaskId)
        ) {
            setSelectedSideQuest(null);
        }
        if (
            editingSideQuest
            && idsMatch(editingSideQuest.questId, taskId)
            && idsMatch(editingSideQuest.sideQuestId, subTaskId)
        ) {
            setEditingSideQuest(null);
        }
        if (refreshLayout) {
            setTimeout(() => refreshLayout(), 50);
        }
    }, [
        deleteSideQuestRequest,
        editingSideQuest,
        refreshLayout,
        selectedSideQuest,
        setEditingSideQuest,
        setSelectedSideQuest
    ]);

    const saveSideQuestEdit = useCallback((questId, subTaskId) => {
        if (
            !editingSideQuest
            || !idsMatch(editingSideQuest.questId, questId)
            || !idsMatch(editingSideQuest.sideQuestId, subTaskId)
        ) return;
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
    }, [editingSideQuest, pushToast, setEditingSideQuest, updateSideQuest]);

    const cyclePriority = useCallback(() => {
        playSound(SOUND_EVENT_KEYS.PRIORITY_CYCLE);
        setPriority((prev) => getNextPriority(prev));
    }, [playSound, setPriority]);

    const cycleTaskLevel = useCallback(() => {
        playSound(SOUND_EVENT_KEYS.LEVEL_UP);
        setTaskLevel((prev) => getNextLevel(prev));
    }, [playSound, setTaskLevel]);

    const cycleEditingPriority = useCallback(() => {
        playSound(SOUND_EVENT_KEYS.PRIORITY_CYCLE);
        setEditingQuest((prev) => (prev ? { ...prev, priority: getNextPriority(prev.priority || 'low') } : prev));
    }, [playSound, setEditingQuest]);

    const cycleEditingLevel = useCallback(() => {
        playSound(SOUND_EVENT_KEYS.LEVEL_UP);
        setEditingQuest((prev) => (prev ? { ...prev, task_level: getNextLevel(prev.task_level || 1) } : prev));
    }, [playSound, setEditingQuest]);

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
        cyclePriority,
        cycleTaskLevel,
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
        setSelectedSideQuest,
        setTaskStatus
    ]);

    return {
        undoTimersRef,
        undoQueue,
        setUndoQueue,
        addTask,
        addSideQuest,
        scheduleQuestUndo,
        dismissUndoEntry,
        restoreQuestFromSnapshot,
        handleUndoDelete,
        deleteTask,
        updateTask,
        updateSideQuest,
        deleteSideQuest,
        saveSideQuestEdit,
        setTaskStatus,
        setSideQuestStatus,
        cyclePriority,
        cycleTaskLevel,
        cycleEditingPriority,
        cycleEditingLevel
    };
};
