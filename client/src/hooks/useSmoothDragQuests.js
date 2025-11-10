import { useCallback, useMemo, useRef, useState } from 'react';
import { FramerQuestList, FramerSideQuestList } from '../features/quest-board/components';

/**
 * useSmoothDragQuests - Integration layer for smooth drag & drop
 * 
 * This hook provides the smooth drag components configured for your quest system.
 * It bridges the gap between the smooth drag library and your existing quest state.
 * 
 * Usage in your useQuests hook:
 * 
 * import { useSmoothDragQuests } from './useSmoothDragQuests';
 * 
 * // In your useQuests hook:
 * const smoothDrag = useSmoothDragQuests({ quests, setQuests });
 * 
 * // Return it along with other quest functions:
 * return {
 *   ...otherQuestStuff,
 *   smoothDrag,
 * }
 */

export const useSmoothDragQuests = ({ quests, setQuests }) => {
    // Store quests in a ref so we can read the latest value without triggering re-memoization
    const questsRef = useRef(quests);
    questsRef.current = quests;
    const [refreshToken, setRefreshToken] = useState(0);
    const refreshTokenRef = useRef(refreshToken);
    refreshTokenRef.current = refreshToken;
    
    // Handle quest reordering
    const handleQuestReorder = useCallback((reorderedQuests) => {
        setQuests(reorderedQuests);
    }, [setQuests]);

    // Handle side quest reordering within a parent quest
    const handleSideQuestReorder = useCallback((questId, reorderedSideQuests) => {
        setQuests((prevQuests) =>
            prevQuests.map((quest) =>
                quest.id === questId
                    ? { ...quest, side_quests: reorderedSideQuests }
                    : quest
            )
        );
    }, [setQuests]);

    const refreshLayouts = useCallback(() => {
        setRefreshToken((prev) => prev + 1);
    }, []);

    // Create stable wrapper components
    // These are created ONCE and never change
    const QuestList = useCallback(({
        renderItem,
        itemHeight = 100,
        itemGap = 0,
        themeName = 'dark'
    }) => {
        const currentQuests = questsRef.current;
        return (
            <FramerQuestList
                items={currentQuests}
                onReorder={handleQuestReorder}
                renderItem={renderItem}
                itemHeight={itemHeight}
                itemGap={itemGap}
                refreshToken={refreshTokenRef.current}
                themeName={themeName}
            />
        );
    }, [handleQuestReorder]);

    const SideQuestList = useCallback(({
        questId,
        sideQuests,
        renderItem,
        itemHeight = 60,
        itemGap = 0,
        maxContainerHeight = null,
        themeName = 'dark'
    }) => (
        <FramerSideQuestList
            questId={questId}
            sideQuests={Array.isArray(sideQuests) ? sideQuests : []}
            onReorder={(reordered) => handleSideQuestReorder(questId, reordered)}
            renderItem={renderItem}
            itemHeight={itemHeight}
            itemGap={itemGap}
            refreshToken={refreshTokenRef.current}
            maxContainerHeight={maxContainerHeight}
            themeName={themeName}
        />
    ), [handleSideQuestReorder]);

    // Return the stable components directly
    // No need to create new wrappers - components read from questsRef
    return useMemo(() => ({
        QuestList,
        SideQuestList,
        refresh: refreshLayouts,
    }), [QuestList, SideQuestList, refreshLayouts]);
};
