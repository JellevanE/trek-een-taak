export const ARCADE_SPACE = Object.freeze({
    xxs: 4,
    xs: 8,
    sm: 12,
    md: 16,
    lg: 24,
    xl: 32
});

export const QUEST_LAYOUT_TOKENS = Object.freeze({
    cardPaddingBlock: 20,
    cardPaddingInline: 24,
    cardGap: ARCADE_SPACE.md,
    cardBodyGap: ARCADE_SPACE.md,
    cardStackGap: ARCADE_SPACE.lg,
    cardMaxWidth: 560,
    sideQuestGap: ARCADE_SPACE.sm,
    minSideQuestRows: 3,
    maxSideQuestRows: 6,
    sideQuestItemHeight: 80
});

export const getSideQuestMaxHeight = (count, {
    itemHeight = QUEST_LAYOUT_TOKENS.sideQuestItemHeight,
    gap = QUEST_LAYOUT_TOKENS.sideQuestGap,
    minRows = QUEST_LAYOUT_TOKENS.minSideQuestRows,
    maxRows = QUEST_LAYOUT_TOKENS.maxSideQuestRows
} = {}) => {
    if (!count || count <= 0) return null;
    const rows = Math.min(Math.max(count, minRows), maxRows);
    return (itemHeight * rows) + (gap * Math.max(rows - 1, 0));
};
