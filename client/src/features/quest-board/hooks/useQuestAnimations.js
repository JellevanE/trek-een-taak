import { useRef, useCallback } from 'react';
import { useShallow } from 'zustand/react/shallow';
import {
    findSideQuestById,
    getQuestStatus,
    getSideQuestStatus,
    idsMatch
} from '../../../hooks/questHelpers.js';
import { SOUND_EVENT_KEYS } from '../../../theme';
import { useQuestBoardStore } from '../../../store/questBoardStore.js';

/**
 * Handles quest/side quest animation flags (pulse, glow, spawn) plus collapse timers.
 * Keeps sensory feedback colocated so orchestration code can stay declarative.
 */
export const useQuestAnimations = ({
    quests,
    setQuests,
    setCollapsedMap,
    refreshLayout = null,
    ensureQuestExpanded,
    mutateTaskStatus,
    mutateSideQuestStatus,
    playSound
}) => {
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
        setSpawnQuests
    } = useQuestBoardStore(useShallow((state) => ({
        pulsingQuests: state.pulsingQuests,
        setPulsingQuests: state.setPulsingQuests,
        pulsingSideQuests: state.pulsingSideQuests,
        setPulsingSideQuests: state.setPulsingSideQuests,
        glowQuests: state.glowQuests,
        setGlowQuests: state.setGlowQuests,
        celebratingQuests: state.celebratingQuests,
        setCelebratingQuests: state.setCelebratingQuests,
        spawnQuests: state.spawnQuests,
        setSpawnQuests: state.setSpawnQuests
    })));
    const completedCollapseTimersRef = useRef({});

    const triggerQuestSpawn = useCallback((questId) => {
        if (questId === undefined || questId === null) return;
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
    }, [setPulsingQuests, setSpawnQuests]);

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
            if (shouldCollapse && typeof setCollapsedMap === 'function') {
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
    }, [setCollapsedMap, setQuests]);

    const setTaskStatusWithFx = useCallback(async (id, status, note) => {
        const updatedQuest = await mutateTaskStatus(id, status, note);
        if (!updatedQuest) return;
        setQuests((prev) => prev.map((quest) => (
            idsMatch(quest.id, updatedQuest.id) ? updatedQuest : quest
        )));
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
    }, [
        mutateTaskStatus,
        playSound,
        scheduleCollapseAndMove,
        setCelebratingQuests,
        setGlowQuests,
        setPulsingQuests,
        setQuests
    ]);

    const setSideQuestStatusWithFx = useCallback(async (taskId, subTaskId, status, note) => {
        const normalized = await mutateSideQuestStatus(taskId, subTaskId, status, note);
        if (!normalized) return;
        setQuests((prev) => prev.map((quest) => (
            idsMatch(quest.id, normalized.id) ? normalized : quest
        )));
        const subStatus = getSideQuestStatus(findSideQuestById(normalized, subTaskId), normalized);
        setPulsingSideQuests((prev) => ({
            ...prev,
            [`${taskId}:${subTaskId}`]: subStatus === 'done' ? 'full' : 'subtle'
        }));
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
    }, [ensureQuestExpanded, mutateSideQuestStatus, refreshLayout, setPulsingSideQuests, setQuests]);

    return {
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
        triggerQuestSpawn,
        scheduleCollapseAndMove,
        setTaskStatus: setTaskStatusWithFx,
        setSideQuestStatus: setSideQuestStatusWithFx
    };
};
