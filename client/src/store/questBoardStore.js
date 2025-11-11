import { create } from 'zustand';
import { devtools, persist, createJSONStorage } from 'zustand/middleware';
import { getQuestSideQuests, idsMatch } from '../hooks/questHelpers.js';

const memoryStorage = {
    getItem: () => null,
    setItem: () => {},
    removeItem: () => {}
};

const safeStorage = () => {
    try {
        if (typeof window !== 'undefined' && window.localStorage) {
            return window.localStorage;
        }
    } catch (error) {
        console.warn('QuestBoardStore localStorage unavailable, falling back to memory storage.', error);
    }
    return memoryStorage;
};

const resolveNextValue = (updater, current) => (
    typeof updater === 'function' ? updater(current) : updater
);

const createSetter = (set, key, action) => (updater) => set(
    (state) => ({ [key]: resolveNextValue(updater, state[key]) }),
    false,
    `questBoard/${action}`
);

const baseInitialState = () => ({
    quests: [],
    description: '',
    priority: 'medium',
    taskLevel: 1,
    debugBusy: false,
    showDebugTools: false,
    selectedQuestId: null,
    selectedSideQuest: null,
    editingQuest: null,
    editingSideQuest: null,
    sideQuestDescriptionMap: {},
    addingSideQuestTo: null,
    collapsedMap: {},
    pulsingQuests: {},
    pulsingSideQuests: {},
    glowQuests: {},
    celebratingQuests: {},
    spawnQuests: {},
    undoQueue: []
});

export const getQuestBoardInitialState = () => ({
    ...baseInitialState()
});

const mergePersistedState = (persistedState, currentState) => ({
    ...currentState,
    collapsedMap: {
        ...currentState.collapsedMap,
        ...(persistedState?.collapsedMap || {})
    }
});

const createQuestBoardStore = (set, get) => {
    const setQuests = createSetter(set, 'quests', 'setQuests');
    const setDescription = createSetter(set, 'description', 'setDescription');
    const setPriority = createSetter(set, 'priority', 'setPriority');
    const setTaskLevel = createSetter(set, 'taskLevel', 'setTaskLevel');
    const setDebugBusy = createSetter(set, 'debugBusy', 'setDebugBusy');
    const setShowDebugTools = createSetter(set, 'showDebugTools', 'setShowDebugTools');
    const setSelectedQuestId = createSetter(set, 'selectedQuestId', 'setSelectedQuestId');
    const setSelectedSideQuest = createSetter(set, 'selectedSideQuest', 'setSelectedSideQuest');
    const setEditingQuest = createSetter(set, 'editingQuest', 'setEditingQuest');
    const setEditingSideQuest = createSetter(set, 'editingSideQuest', 'setEditingSideQuest');
    const setSideQuestDescriptionMap = createSetter(set, 'sideQuestDescriptionMap', 'setSideQuestDescriptionMap');
    const setAddingSideQuestTo = createSetter(set, 'addingSideQuestTo', 'setAddingSideQuestTo');
    const setCollapsedMap = createSetter(set, 'collapsedMap', 'setCollapsedMap');
    const setPulsingQuests = createSetter(set, 'pulsingQuests', 'setPulsingQuests');
    const setPulsingSideQuests = createSetter(set, 'pulsingSideQuests', 'setPulsingSideQuests');
    const setGlowQuests = createSetter(set, 'glowQuests', 'setGlowQuests');
    const setCelebratingQuests = createSetter(set, 'celebratingQuests', 'setCelebratingQuests');
    const setSpawnQuests = createSetter(set, 'spawnQuests', 'setSpawnQuests');
    const setUndoQueue = createSetter(set, 'undoQueue', 'setUndoQueue');

    return {
        ...getQuestBoardInitialState(),
        setQuests,
        setDescription,
        setPriority,
        setTaskLevel,
        setDebugBusy,
        setShowDebugTools,
        setSelectedQuestId,
        setSelectedSideQuest,
        setEditingQuest,
        setEditingSideQuest,
        setSideQuestDescriptionMap,
        setAddingSideQuestTo,
        setCollapsedMap,
        setPulsingQuests,
        setPulsingSideQuests,
        setGlowQuests,
        setCelebratingQuests,
        setSpawnQuests,
        setUndoQueue,
        resetSelection: () => {
            set({
                selectedQuestId: null,
                selectedSideQuest: null,
                editingSideQuest: null
            }, false, 'questBoard/resetSelection');
        },
        resetEditingQuest: () => {
            set({ editingQuest: null }, false, 'questBoard/resetEditingQuest');
        },
        resetSideQuestDraft: (questId = null) => {
            if (questId === null || questId === undefined) {
                set({ sideQuestDescriptionMap: {} }, false, 'questBoard/resetSideQuestDraftAll');
                return;
            }
            set((state) => {
                const next = { ...state.sideQuestDescriptionMap };
                delete next[questId];
                return { sideQuestDescriptionMap: next };
            }, false, 'questBoard/resetSideQuestDraft');
        },
        collapseQuest: (questId, collapsed = true) => {
            if (questId === null || questId === undefined) return;
            set((state) => ({
                collapsedMap: {
                    ...state.collapsedMap,
                    [questId]: collapsed
                }
            }), false, 'questBoard/collapseQuest');
        },
        getQuestById: (questId) => get().quests.find((quest) => idsMatch(quest?.id, questId)) || null,
        getSideQuestSubset: (questId) => {
            const quest = get().quests.find((q) => idsMatch(q?.id, questId));
            return quest ? getQuestSideQuests(quest) : [];
        },
        resetTransientState: () => {
            set({
                editingQuest: null,
                editingSideQuest: null,
                addingSideQuestTo: null,
                selectedSideQuest: null
            }, false, 'questBoard/resetTransientState');
        }
    };
};

export const useQuestBoardStore = create(
    devtools(
        persist(
            createQuestBoardStore,
            {
                name: 'quest-board-store',
                version: 1,
                storage: createJSONStorage(safeStorage),
                partialize: (state) => ({
                    collapsedMap: state.collapsedMap
                }),
                merge: mergePersistedState
            }
        ),
        { name: 'QuestBoardStore' }
    )
);

export const questBoardSelectors = {
    quests: (state) => state.quests,
    questById: (questId) => (state) => state.quests.find((quest) => idsMatch(quest?.id, questId)) || null,
    sideQuestsFor: (questId) => (state) => {
        const quest = state.quests.find((item) => idsMatch(item?.id, questId));
        return quest ? getQuestSideQuests(quest) : [];
    },
    collapsedMap: (state) => state.collapsedMap,
    animationFlags: (state) => ({
        pulsingQuests: state.pulsingQuests,
        pulsingSideQuests: state.pulsingSideQuests,
        glowQuests: state.glowQuests,
        celebratingQuests: state.celebratingQuests,
        spawnQuests: state.spawnQuests
    }),
    undoQueue: (state) => state.undoQueue
};

export const resetQuestBoardStore = async ({ clearPersisted = false } = {}) => {
    useQuestBoardStore.setState((state) => ({
        ...state,
        ...getQuestBoardInitialState(),
        collapsedMap: clearPersisted ? {} : state.collapsedMap
    }));
    if (clearPersisted && useQuestBoardStore.persist?.clearStorage) {
        await useQuestBoardStore.persist.clearStorage();
    }
};

export default useQuestBoardStore;
