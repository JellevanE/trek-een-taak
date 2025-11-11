import { useState, useEffect, useRef, useCallback } from 'react';
import {
    getQuestSideQuests,
    idsMatch,
    isInteractiveTarget
} from '../../../hooks/questHelpers.js';

/**
 * Coordinates quest/side quest selection, collapsed panels, and edit focus state.
 * Isolating this logic keeps the orchestration hook (`useQuests`) lightweight while
 * still exposing the same state the UI expects.
 */
export const useQuestSelection = ({
    quests,
    refreshLayout = null
}) => {
    const [editingQuest, setEditingQuest] = useState(null);
    const editingQuestInputRef = useRef(null);
    const [selectedQuestId, setSelectedQuestId] = useState(null);
    const [selectedSideQuest, setSelectedSideQuest] = useState(null);
    const [editingSideQuest, setEditingSideQuest] = useState(null);
    const [sideQuestDescriptionMap, setSideQuestDescriptionMap] = useState({});
    const [addingSideQuestTo, setAddingSideQuestTo] = useState(null);
    const [collapsedMap, setCollapsedMap] = useState({});
    const addInputRefs = useRef({});

    const ensureQuestExpanded = useCallback((questId) => {
        if (questId === undefined || questId === null) return;
        setCollapsedMap((prev) => {
            if (!prev || !prev[questId]) return prev;
            const next = { ...prev };
            next[questId] = false;
            return next;
        });
        if (refreshLayout) {
            setTimeout(() => refreshLayout(), 300);
        }
    }, [refreshLayout]);

    const toggleCollapse = useCallback((questId) => {
        setCollapsedMap((prev) => ({ ...prev, [questId]: !prev[questId] }));
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
        if (
            questId === undefined
            || questId === null
            || sideQuestId === undefined
            || sideQuestId === null
        ) return;
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
        return quests.find((quest) => idsMatch(quest.id, questId)) || null;
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

    const startEditingSideQuest = useCallback((questId, sideQuest) => {
        if (!sideQuest) return;
        setEditingSideQuest({
            questId,
            sideQuestId: sideQuest.id,
            description: sideQuest.description || ''
        });
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

    useEffect(() => {
        if (selectedQuestId !== null) {
            const exists = quests.some((quest) => idsMatch(quest.id, selectedQuestId));
            if (!exists) {
                setSelectedQuestId(null);
                setSelectedSideQuest(null);
            }
        }
    }, [quests, selectedQuestId]);

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

    return {
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
        ensureQuestExpanded,
        toggleCollapse,
        handleSelectQuest,
        handleSelectSideQuest,
        clearSelection,
        findQuestById,
        moveQuestSelection,
        selectFirstSideQuest,
        startEditingSideQuest,
        handleSideQuestEditChange,
        cancelSideQuestEdit,
        handleEditChange
    };
};
