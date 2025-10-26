import { useCallback, useMemo, useRef } from 'react';
import { SmoothDraggableList, SmoothDraggableSideQuests } from '../components/SmoothDraggable';

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

    // Create stable wrapper components
    // These are created ONCE and never change
    const components = useMemo(() => {
        return {
            // Component function reads from questsRef to get latest quests
            QuestList: ({ renderItem, itemHeight = 100, itemGap = 0 }) => {
                const currentQuests = questsRef.current;
                return (
                    <SmoothDraggableList
                        items={currentQuests}
                        onReorder={handleQuestReorder}
                        renderItem={renderItem}
                        itemHeight={itemHeight}
                        itemGap={itemGap}
                    />
                );
            },

            SideQuestList: ({ questId, sideQuests, renderItem, itemHeight = 60, itemGap = 0 }) => {
                return (
                    <SmoothDraggableSideQuests
                        items={sideQuests}
                        onReorder={(reordered) => handleSideQuestReorder(questId, reordered)}
                        renderItem={renderItem}
                        itemHeight={itemHeight}
                        itemGap={itemGap}
                    />
                );
            },
        };
    }, [handleQuestReorder, handleSideQuestReorder]);

    // Return the stable components directly
    // No need to create new wrappers - components read from questsRef
    return components;
};
