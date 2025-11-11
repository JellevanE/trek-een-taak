import React from 'react';
import { useQuestBoardContext } from '../features/quest-board/context/QuestBoardContext.jsx';
import { getSideQuestMaxHeight, QUEST_LAYOUT_TOKENS } from '../features/quest-board/tokens/spacing.js';
import { QuestCardShell } from './quest-card/QuestCardShell.jsx';
import { QuestHeader } from './quest-card/QuestHeader.jsx';
import { QuestProgress } from './quest-card/QuestProgress.jsx';
import { QuestActions } from './quest-card/QuestActions.jsx';
import { SideQuestList } from './quest-card/SideQuestList.jsx';

/**
 * QuestCard - Memoized quest card component to prevent unnecessary re-renders
 * This component is wrapped in React.memo to ensure it only re-renders when its
 * props actually change, not when unrelated state in the parent component changes.
 */
const QuestCard = React.memo(({
    quest,
    isDragging,
    dragMeta = {}
}) => {
    const {
        themeName = 'dark',
        themeProfile,
        selectedQuestId,
        selectedSideQuest,
        editingQuest,
        editingSideQuest,
        addingSideQuestTo,
        collapsedMap,
        pulsingQuests,
        pulsingSideQuests,
        glowQuests,
        celebratingQuests,
        spawnQuests,
        campaignLookup,
        hasCampaigns,
        getQuestStatus,
        getQuestStatusLabel,
        getQuestSideQuests,
        getSideQuestStatus,
        getSideQuestStatusLabel,
        isInteractiveTarget,
        idsMatch,
        getQuestProgress,
        progressColor,
        handleSelectQuest,
        handleSelectSideQuest,
        setEditingQuest,
        deleteTask,
        setTaskStatus,
        setSideQuestStatus,
        deleteSideQuest,
        startEditingSideQuest,
        handleSideQuestEditChange,
        cancelSideQuestEdit,
        saveSideQuestEdit,
        toggleCollapse,
        setAddingSideQuestTo,
        renderEditForm,
        renderAddSideQuestForm,
        smoothDrag,
        addInputRefs,
        sideQuestItemHeight
    } = useQuestBoardContext();

    const SIDE_QUEST_ITEM_HEIGHT = sideQuestItemHeight ?? QUEST_LAYOUT_TOKENS.sideQuestItemHeight;
    const questStatus = getQuestStatus(quest);
    const questStatusLabel = getQuestStatusLabel(quest);
    const questSelected = selectedQuestId !== null && idsMatch(selectedQuestId, quest.id);
    const questSideQuests = getQuestSideQuests(quest);
    const questProgress = getQuestProgress(quest);
    const questHasCampaign = quest.campaign_id !== null && quest.campaign_id !== undefined;
    const campaign = questHasCampaign && typeof quest.campaign_id === 'number'
        ? (campaignLookup.get(quest.campaign_id) || null)
        : null;
    const sideQuestGap = QUEST_LAYOUT_TOKENS.sideQuestGap;
    const sideQuestMaxHeight = getSideQuestMaxHeight(questSideQuests.length, {
        itemHeight: SIDE_QUEST_ITEM_HEIGHT,
        gap: sideQuestGap
    });
    const cardTokens = themeProfile?.card || null;
    const ctaTokens = themeProfile?.cta || null;
    const soundFxTokens = themeProfile?.soundFx || null;
    
    const sideQuestFooter = (
        <div className="side-quest-footer">
            {addingSideQuestTo === quest.id ? (
                renderAddSideQuestForm(quest.id)
            ) : (
                <button
                    className="add-side-quest-button large"
                    onClick={() => {
                        handleSelectQuest(quest.id);
                        setAddingSideQuestTo(quest.id);
                    }}
                >
                    + Add Side Quest
                </button>
            )}
        </div>
    );

    const questClassName = [
        'quest',
        questStatus === 'done' ? 'completed' : '',
        collapsedMap[quest.id] ? 'collapsed' : '',
        questStatus === 'in_progress' ? 'started' : '',
        pulsingQuests[quest.id] === 'full' ? 'pulse' : '',
        pulsingQuests[quest.id] === 'subtle' ? 'pulse-subtle' : '',
        pulsingQuests[quest.id] === 'spawn' ? 'pulse-spawn' : '',
        glowQuests[quest.id] ? 'glow' : '',
        spawnQuests[quest.id] ? 'spawn' : '',
        questSelected ? 'selected' : '',
        isDragging ? 'dragging' : ''
    ].filter(Boolean).join(' ');

    const isNewQuest = !!spawnQuests[quest.id];
    const isCelebrating = !!celebratingQuests[quest.id];

    return (
        <QuestCardShell
            quest={quest}
            questClassName={questClassName}
            isDragging={isDragging}
            dragMeta={dragMeta}
            isNew={isNewQuest}
            isCelebrating={isCelebrating}
            handleSelectQuest={handleSelectQuest}
            isInteractiveTarget={isInteractiveTarget}
            cardTokens={cardTokens}
        >
            {editingQuest && editingQuest.id === quest.id ? (
                renderEditForm(quest)
            ) : (
                <>
                    <QuestHeader
                        description={quest.description}
                        priority={quest.priority}
                        level={quest.task_level}
                        campaign={campaign}
                        questHasCampaign={questHasCampaign}
                        hasCampaigns={hasCampaigns}
                        isCollapsed={collapsedMap[quest.id]}
                        onToggleCollapse={() => toggleCollapse(quest.id)}
                    />
                    {!collapsedMap[quest.id] && (
                        <>
                            <QuestProgress
                                progress={questProgress}
                                progressColor={progressColor}
                                statusLabel={questStatusLabel}
                                dueDate={quest.due_date}
                            />
                            <QuestActions
                                questSelected={questSelected}
                                questStatus={questStatus}
                                onEdit={() => setEditingQuest({ ...quest })}
                                onDelete={() => deleteTask(quest.id)}
                                onStart={() => setTaskStatus(quest.id, 'in_progress')}
                                onComplete={() => setTaskStatus(quest.id, 'done')}
                                onUndo={() => setTaskStatus(quest.id, 'todo')}
                                ctaTokens={ctaTokens}
                                soundFx={soundFxTokens}
                            />
                            <SideQuestList
                                quest={quest}
                                sideQuests={questSideQuests}
                                smoothDrag={smoothDrag}
                                themeName={themeName}
                                sideQuestItemHeight={SIDE_QUEST_ITEM_HEIGHT}
                                sideQuestGap={sideQuestGap}
                                sideQuestMaxHeight={sideQuestMaxHeight}
                                sideQuestFooter={sideQuestFooter}
                                selectedSideQuest={selectedSideQuest}
                                editingSideQuest={editingSideQuest}
                                idsMatch={idsMatch}
                                handleSelectSideQuest={handleSelectSideQuest}
                                isInteractiveTarget={isInteractiveTarget}
                                getSideQuestStatus={getSideQuestStatus}
                                getSideQuestStatusLabel={getSideQuestStatusLabel}
                                setSideQuestStatus={setSideQuestStatus}
                                deleteSideQuest={deleteSideQuest}
                                startEditingSideQuest={startEditingSideQuest}
                                handleSideQuestEditChange={handleSideQuestEditChange}
                                cancelSideQuestEdit={cancelSideQuestEdit}
                                saveSideQuestEdit={saveSideQuestEdit}
                                addInputRefs={addInputRefs}
                                pulsingSideQuests={pulsingSideQuests}
                            />
                        </>
                    )}
                </>
            )}
        </QuestCardShell>
    );
});

QuestCard.displayName = 'QuestCard';

export default QuestCard;
