import React from 'react';
import { useQuestBoardContext } from '../features/quest-board/context/QuestBoardContext.jsx';
import { getSideQuestMaxHeight, QUEST_LAYOUT_TOKENS } from '../features/quest-board/tokens/spacing.js';
import { QuestCardShell } from './quest-card/QuestCardShell.jsx';
import { QuestHeader } from './quest-card/QuestHeader.jsx';
import { QuestProgress } from './quest-card/QuestProgress.jsx';
import { QuestActions } from './quest-card/QuestActions.jsx';
import { SideQuestList } from './quest-card/SideQuestList.jsx';
import { ActionButton } from './ActionButton.jsx';
import { AddSideQuestForm, QuestEditForm } from '../features/quest-board/components/forms';

import './../styles/quest-card-refresh.css';

/**
 * QuestCard - Memoized quest card component to prevent unnecessary re-renders
 * This component is wrapped in React.memo to ensure it only re-renders when its
 * props actually change, not when unrelated state in the parent component changes.
 */
const QuestCard = React.memo(({
    quest,
    isDragging,
    dragMeta = {},
    visualRefresh = false
}) => {
    const {
        themeName = 'dark',
        themeProfile,
        selectedQuestId,
        selectedSideQuest,
        editingQuest,
        editingSideQuest,
        addingSideQuestTo,
        loadingSideQuestAdds = new Set(),
        collapsedMap,
        pulsingQuests,
        pulsingSideQuests,
        glowQuests,
        celebratingQuests,
        spawnQuests,
        campaignLookup,
        hasCampaigns,
        campaigns,
        sideQuestDescriptionMap,
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
        setSideQuestDescriptionMap,
        addSideQuest,
        smoothDrag,
        addInputRefs,
        editingQuestInputRef,
        handleEditChange,
        updateTask,
        cycleEditingPriority,
        cycleEditingLevel,
        sideQuestItemHeight,
        soundFxEnabled
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
    const soundFxTokens = React.useMemo(() => {
        if (!themeProfile?.soundFx) return null;
        if (soundFxEnabled === false) {
            return { ...themeProfile.soundFx, enabled: false };
        }
        return themeProfile.soundFx;
    }, [soundFxEnabled, themeProfile]);

    // Extract this quest's specific value to avoid depending on entire map
    const currentValue = sideQuestDescriptionMap[quest.id] || '';
    const isAddingToThisQuest = addingSideQuestTo === quest.id;
    const isLoading = loadingSideQuestAdds.has(quest.id);

    const sideQuestFooter = React.useMemo(() => (
        <div className="side-quest-footer">
            {isAddingToThisQuest ? (
                <AddSideQuestForm
                    key={`add-sidequest-${quest.id}`}
                    questId={quest.id}
                    value={currentValue}
                    inputRef={(el) => {
                        if (!addInputRefs.current) addInputRefs.current = {};
                        if (el) {
                            addInputRefs.current[quest.id] = el;
                        } else {
                            delete addInputRefs.current[quest.id];
                        }
                    }}
                    onChange={(value) => {
                        setSideQuestDescriptionMap((prev) => ({ ...prev, [quest.id]: value }));
                    }}
                    onAdd={() => {
                        addSideQuest(quest.id);
                    }}
                    onCancel={() => {
                        setSideQuestDescriptionMap((prev) => ({ ...prev, [quest.id]: '' }));
                        setAddingSideQuestTo(null);
                    }}
                    onFocus={() => setAddingSideQuestTo(quest.id)}
                    onBlur={() => {
                        setTimeout(() => {
                            setAddingSideQuestTo((prev) => (prev === quest.id ? null : prev));
                        }, 100);
                    }}
                />
            ) : (
                <ActionButton
                    variant="primary"
                    size="large"
                    className="add-side-quest-button"
                    loading={isLoading}
                    onClick={() => {
                        handleSelectQuest(quest.id);
                        setAddingSideQuestTo(quest.id);
                    }}
                >
                    + Add Side Quest
                </ActionButton>
            )}
        </div>
        // eslint-disable-next-line react-hooks/exhaustive-deps
    ), [
        isAddingToThisQuest,
        currentValue,
        isLoading,
        quest.id,
        addInputRefs,
        setSideQuestDescriptionMap,
        addSideQuest,
        setAddingSideQuestTo,
        handleSelectQuest
    ]);

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
        isDragging ? 'dragging' : '',
        visualRefresh ? 'quest-card-refresh' : ''
    ].filter(Boolean).join(' ');
    const isNewQuest = !!spawnQuests[quest.id];
    const isCelebrating = !!celebratingQuests[quest.id];
    const isEditingThisQuest = editingQuest && idsMatch(editingQuest.id, quest.id);

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
            {isEditingThisQuest ? (
                <QuestEditForm
                    key={`edit-quest-${quest.id}`}
                    quest={quest}
                    editingQuest={editingQuest}
                    inputRef={editingQuestInputRef}
                    campaigns={campaigns}
                    hasCampaigns={hasCampaigns}
                    onChange={handleEditChange}
                    onCancel={() => setEditingQuest(null)}
                    onSave={(finalData) => updateTask(quest.id, finalData)}
                    onCyclePriority={cycleEditingPriority}
                    onCycleLevel={cycleEditingLevel}
                />
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
