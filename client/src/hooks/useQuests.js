import { useMemo, useCallback, useRef, useEffect } from 'react';
import { useQuestData } from '../features/quest-board/hooks/useQuestData.js';
import { useQuestSelection } from '../features/quest-board/hooks/useQuestSelection.js';
import { useQuestAnimations } from '../features/quest-board/hooks/useQuestAnimations.js';
import { useQuestInteractions } from '../features/quest-board/hooks/useQuestInteractions.js';
import {
    getQuestStatus,
    getQuestStatusLabel,
    getQuestSideQuests,
    getSideQuestStatus,
    getSideQuestStatusLabel,
    idsMatch,
    isInteractiveTarget,
    getQuestProgress,
    progressColor,
    getProgressAura,
    calculateGlobalProgress
} from './questHelpers.js';
import { useSmoothDragQuests } from './useSmoothDragQuests.js';

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

    const soundFxRef = useRef(soundFx);
    useEffect(() => {
        soundFxRef.current = soundFx;
    }, [soundFx]);

    const playSound = useCallback((eventKey) => {
        const fx = soundFxRef.current;
        if (!fx || typeof fx.play !== 'function' || !eventKey) return;
        fx.play(eventKey);
    }, []);

    const smoothDrag = useSmoothDragQuests({ quests, setQuests, playSound });
    const refreshLayout = smoothDrag && typeof smoothDrag.refresh === 'function'
        ? smoothDrag.refresh
        : null;

    const selection = useQuestSelection({ quests, refreshLayout });
    const animations = useQuestAnimations({
        quests,
        setQuests,
        setCollapsedMap: selection.setCollapsedMap,
        refreshLayout,
        ensureQuestExpanded: selection.ensureQuestExpanded,
        mutateTaskStatus,
        mutateSideQuestStatus,
        playSound
    });
    const interactions = useQuestInteractions({
        quests,
        setQuests,
        selection,
        animations,
        refreshLayout,
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
    });

    const {
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
    } = selection;

    const {
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
        completedCollapseTimersRef,
        scheduleCollapseAndMove
    } = animations;

    const {
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
    } = interactions;

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
