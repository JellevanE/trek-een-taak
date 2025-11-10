import React from 'react';
import { AnimatedQuestCard, AnimatedProgressBar } from './AnimatedComponents';
import { useQuestBoardContext } from '../features/quest-board/context/QuestBoardContext.jsx';

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

    const SIDE_QUEST_ITEM_HEIGHT = sideQuestItemHeight ?? 80;
    const questHandleProps = dragMeta.handleProps || {};
    const questHandleStyle = { cursor: 'grab', ...dragMeta.handleStyle };
    const questStatus = getQuestStatus(quest);
    const questStatusLabel = getQuestStatusLabel(quest);
    const questSelected = selectedQuestId !== null && idsMatch(selectedQuestId, quest.id);
    const questSideQuests = getQuestSideQuests(quest);
    const questProgress = getQuestProgress(quest);
    const questHasCampaign = quest.campaign_id !== null && quest.campaign_id !== undefined;
    const campaign = questHasCampaign && typeof quest.campaign_id === 'number'
        ? (campaignLookup.get(quest.campaign_id) || null)
        : null;
    const sideQuestGap = 8;
    const visibleSideQuestRows = questSideQuests.length
        ? Math.min(Math.max(questSideQuests.length, 3), 6)
        : 0;
    const sideQuestMaxHeight = visibleSideQuestRows > 0
        ? (SIDE_QUEST_ITEM_HEIGHT * visibleSideQuestRows) + (sideQuestGap * Math.max(visibleSideQuestRows - 1, 0))
        : null;
    
    const campaignChip = (() => {
        if (questHasCampaign && campaign) {
            return (
                <div className="campaign-chip" title={`Campaign: ${campaign.name}`}>
                    <div className="chip-avatar">
                        {campaign.image_url ? (
                            <img src={campaign.image_url} alt="" />
                        ) : (
                            (campaign.name || '?').charAt(0).toUpperCase()
                        )}
                    </div>
                    <div className="chip-content">
                        <span className="chip-name">{campaign.name}</span>
                        {(campaign.progress_summary || (campaign.stats && typeof campaign.stats.quests_total === 'number')) && (
                            <span className="chip-progress">
                                {campaign.progress_summary || `${campaign.stats?.quests_completed || 0}/${campaign.stats?.quests_total || 0}`}
                            </span>
                        )}
                    </div>
                </div>
            );
        }
        if (questHasCampaign && !campaign) {
            return (
                <div className="campaign-chip archived" title="Campaign archived">
                    Archived
                </div>
            );
        }
        if (!questHasCampaign && hasCampaigns) {
            return (
                <div className="campaign-chip unassigned" title="No campaign">
                    Unassigned
                </div>
            );
        }
        return null;
    })();

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
        <AnimatedQuestCard isNew={isNewQuest} isCompleting={isCelebrating}>
            <div
                role="button"
                tabIndex={0}
                className={questClassName}
                data-dragging={isDragging ? 'true' : undefined}
                onClick={e => {
                    if (isInteractiveTarget(e.target)) return;
                    handleSelectQuest(quest.id);
                }}
                onFocus={e => {
                    if (isInteractiveTarget(e.target)) return;
                    handleSelectQuest(quest.id);
                }}
                onKeyDown={e => {
                    if (isInteractiveTarget(e.target)) return;
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleSelectQuest(quest.id);
                    }
                }}
            >
                <div style={{display:'flex', alignItems:'center'}}>
                    <button
                        type="button"
                        className="drag-handle top"
                        tabIndex={-1}
                        data-drag-handle="true"
                        aria-label="Reorder quest"
                        {...questHandleProps}
                        style={{ width:32, height:32, display:'inline-flex', alignItems:'center', justifyContent:'center', fontSize:18, ...questHandleStyle }}
                        onFocus={event => {
                            event.stopPropagation();
                            if (typeof questHandleProps.onFocus === 'function') {
                                questHandleProps.onFocus(event);
                            }
                        }}
                        onMouseDown={event => event.preventDefault()}
                        onClick={event => {
                            event.preventDefault();
                            event.stopPropagation();
                            if (typeof questHandleProps.onClick === 'function') {
                                questHandleProps.onClick(event);
                            }
                        }}
                    >
                        ≡
                    </button>
                    <div style={{flex:1}}>
                        {editingQuest && editingQuest.id === quest.id ? (
                            renderEditForm(quest)
                        ) : (
                            <>
                                <div className="quest-header">
                                    <div className="left">
                                        <div className="quest-title-row">
                                            <h3>{quest.description}</h3>
                                            <div className="quest-meta-tags">
                                                <span className={`priority-pill ${quest.priority}`}>{quest.priority}</span>
                                                <span className="level-pill">Lv. {quest.task_level || 1}</span>
                                                {campaignChip}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="right">
                                        <div className="quest-controls">
                                            <button
                                                className="btn-ghost"
                                                onClick={e => { e.stopPropagation(); toggleCollapse(quest.id); }}
                                                aria-label="toggle details"
                                            >
                                                {collapsedMap[quest.id] ? 'Expand' : 'Minimize'}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                                {!collapsedMap[quest.id] && (
                                    <>
                                        <div className="quest-progress-wrap">
                                            <div className="quest-progress">
                                                <AnimatedProgressBar
                                                    percent={questProgress}
                                                    color={progressColor(questProgress)}
                                                    ariaProps={{
                                                        role: 'progressbar',
                                                        'aria-valuemin': 0,
                                                        'aria-valuemax': 100,
                                                        'aria-valuenow': questProgress,
                                                        title: `${questProgress}%`
                                                    }}
                                                >
                                                    <div className="tooltip">{questProgress}%</div>
                                                </AnimatedProgressBar>
                                                <div className="quest-progress-meta">{questProgress}%</div>
                                            </div>
                                        </div>
                                        <div className="quest-details">
                                            <div>
                                                <div className="muted small">Due:</div>
                                                <div className="muted">{quest.due_date || '—'}</div>
                                            </div>
                                            <div>
                                                <div className="muted small">Status:</div>
                                                <div className="muted">{questStatusLabel}</div>
                                            </div>
                                            <div style={{marginLeft:'auto', display:'flex', gap:6, flexWrap:'wrap'}}>
                                                {questSelected && (
                                                    <>
                                                        <button
                                                            className="btn-ghost btn-small"
                                                            onClick={e => {
                                                                e.stopPropagation();
                                                                setEditingQuest({ ...quest });
                                                            }}
                                                        >
                                                            Edit
                                                        </button>
                                                        <button
                                                            className="btn-danger btn-small"
                                                            onClick={e => {
                                                                e.stopPropagation();
                                                                deleteTask(quest.id);
                                                            }}
                                                        >
                                                            Delete
                                                        </button>
                                                    </>
                                                )}
                                                {questStatus !== 'in_progress' && (
                                                    <button
                                                        className="btn-start btn-small"
                                                        onMouseDown={e => e.stopPropagation()}
                                                        onDragStart={e => e.stopPropagation()}
                                                        onClick={e => { e.stopPropagation(); setTaskStatus(quest.id, 'in_progress'); }}
                                                    >
                                                        Start
                                                    </button>
                                                )}
                                                {questStatus !== 'done' && (
                                                    <button
                                                        className="btn-complete btn-small"
                                                        onMouseDown={e => e.stopPropagation()}
                                                        onDragStart={e => e.stopPropagation()}
                                                        onClick={e => { e.stopPropagation(); setTaskStatus(quest.id, 'done'); }}
                                                    >
                                                        Complete
                                                    </button>
                                                )}
                                                {questStatus === 'done' && (
                                                    <button
                                                        className="btn-ghost btn-small"
                                                        onMouseDown={e => e.stopPropagation()}
                                                        onDragStart={e => e.stopPropagation()}
                                                        onClick={e => { e.stopPropagation(); setTaskStatus(quest.id, 'todo'); }}
                                                    >
                                                        Undo
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                        {questSideQuests.length > 0 ? (
                                            <div>
                                                <h4>Side-quests:</h4>
                                                <div className="side-quest-list" role="list">
                                                    <smoothDrag.SideQuestList
                                                        questId={quest.id}
                                                        sideQuests={questSideQuests}
                                                        itemHeight={SIDE_QUEST_ITEM_HEIGHT}
                                                        itemGap={sideQuestGap}
                                                        maxContainerHeight={sideQuestMaxHeight}
                                                        themeName={themeName}
                                                        renderItem={(sideQuest, isSideDragging, sideDragMeta = {}) => {
                                                            const sideHandleProps = sideDragMeta.handleProps || {};
                                                            const sideHandleStyle = { cursor: 'grab', ...sideDragMeta.handleStyle };
                                                            const sideStatus = getSideQuestStatus(sideQuest, quest);
                                                            const sideStatusLabel = getSideQuestStatusLabel(sideQuest, quest);
                                                            const sideSelected = selectedSideQuest
                                                                && idsMatch(selectedSideQuest.questId, quest.id)
                                                                && idsMatch(selectedSideQuest.sideQuestId, sideQuest.id);
                                                            const sideEditing = editingSideQuest
                                                                && idsMatch(editingSideQuest.questId, quest.id)
                                                                && idsMatch(editingSideQuest.sideQuestId, sideQuest.id);
                                                            const sideKey = `${quest.id}:${sideQuest.id}`;
                                                            const sideClassName = [
                                                                sideStatus === 'done' ? 'completed' : '',
                                                                sideSelected ? 'selected' : '',
                                                                isSideDragging ? 'dragging' : ''
                                                            ].filter(Boolean).join(' ');
                                                            return (
                                                                <div className={sideClassName} role="listitem" data-dragging={isSideDragging ? 'true' : undefined}>
                                                                    <div
                                                                        className={`task-row ${sideEditing ? 'editing' : ''}`}
                                                                        role="button"
                                                                        tabIndex={0}
                                                                        onClick={e => {
                                                                            e.stopPropagation();
                                                                            if (isInteractiveTarget(e.target)) return;
                                                                            handleSelectSideQuest(quest.id, sideQuest.id);
                                                                        }}
                                                                        onFocus={e => {
                                                                            e.stopPropagation();
                                                                            if (isInteractiveTarget(e.target)) return;
                                                                            handleSelectSideQuest(quest.id, sideQuest.id);
                                                                        }}
                                                                        onKeyDown={e => {
                                                                            if (isInteractiveTarget(e.target)) return;
                                                                            if (e.key === 'Enter' || e.key === ' ') {
                                                                                e.preventDefault();
                                                                                e.stopPropagation();
                                                                                handleSelectSideQuest(quest.id, sideQuest.id);
                                                                            }
                                                                        }}
                                                                    >
                                                                        <div style={{display:'flex', alignItems:'center', gap:8, flex:1, minWidth:0, flexWrap:'wrap'}}>
                                                                            <button
                                                                                type="button"
                                                                                className="drag-handle"
                                                                                tabIndex={-1}
                                                                                data-drag-handle="true"
                                                                                aria-label="Reorder side quest"
                                                                                {...sideHandleProps}
                                                                                style={{ width:24, height:24, display:'inline-flex', alignItems:'center', justifyContent:'center', fontSize:12, ...sideHandleStyle }}
                                                                                onFocus={event => {
                                                                                    event.stopPropagation();
                                                                                    if (typeof sideHandleProps.onFocus === 'function') {
                                                                                        sideHandleProps.onFocus(event);
                                                                                    }
                                                                                }}
                                                                                onMouseDown={event => event.preventDefault()}
                                                                                onClick={event => {
                                                                                    event.preventDefault();
                                                                                    event.stopPropagation();
                                                                                    if (typeof sideHandleProps.onClick === 'function') {
                                                                                        sideHandleProps.onClick(event);
                                                                                    }
                                                                                }}
                                                                            >
                                                                                ⋮
                                                                            </button>
                                                                            {sideEditing ? (
                                                                                <div className="side-quest-edit">
                                                                                    <input
                                                                                        type="text"
                                                                                        data-subtask-edit={sideKey}
                                                                                        value={editingSideQuest?.description || ''}
                                                                                        ref={el => {
                                                                                            if (!addInputRefs) return;
                                                                                            if (!addInputRefs.current) addInputRefs.current = {};
                                                                                            const refKey = `${quest.id}:${sideQuest.id}:edit`;
                                                                                            if (el) {
                                                                                                addInputRefs.current[refKey] = el;
                                                                                            } else {
                                                                                                delete addInputRefs.current[refKey];
                                                                                            }
                                                                                        }}
                                                                                        onChange={handleSideQuestEditChange}
                                                                                        onClick={e => e.stopPropagation()}
                                                                                        onKeyDown={e => {
                                                                                            if (e.key === 'Enter') {
                                                                                                e.preventDefault();
                                                                                                saveSideQuestEdit(quest.id, sideQuest.id);
                                                                                            } else if (e.key === 'Escape') {
                                                                                                e.preventDefault();
                                                                                                cancelSideQuestEdit();
                                                                                            }
                                                                                        }}
                                                                                    />
                                                                                </div>
                                                                            ) : (
                                                                                <div className={`side-quest-desc ${(sideStatus === 'in_progress') ? 'in-progress' : ''} ${(sideStatus === 'done') ? 'started' : ''} ${pulsingSideQuests[sideKey] ? 'pulse-subtle' : ''}`} style={{flex:1}}>
                                                                                    {sideQuest.description}
                                                                                    <small className="small"> - {sideStatusLabel}</small>
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                        <div className="task-row-actions">
                                                                            {sideEditing ? (
                                                                                <>
                                                                                    <button
                                                                                        className="btn-primary btn-small"
                                                                                        onClick={e => {
                                                                                            e.stopPropagation();
                                                                                            saveSideQuestEdit(quest.id, sideQuest.id);
                                                                                        }}
                                                                                    >
                                                                                        Save
                                                                                    </button>
                                                                                    <button
                                                                                        className="btn-ghost btn-small"
                                                                                        onClick={e => {
                                                                                            e.stopPropagation();
                                                                                            cancelSideQuestEdit();
                                                                                        }}
                                                                                    >
                                                                                        Cancel
                                                                                    </button>
                                                                                </>
                                                                            ) : sideSelected ? (
                                                                                <>
                                                                                    <button
                                                                                        className="btn-ghost btn-small"
                                                                                        onClick={e => {
                                                                                            e.stopPropagation();
                                                                                            startEditingSideQuest(quest.id, sideQuest);
                                                                                        }}
                                                                                    >
                                                                                        Edit
                                                                                    </button>
                                                                                    <button
                                                                                        className="btn-danger btn-small"
                                                                                        onClick={e => {
                                                                                            e.stopPropagation();
                                                                                            deleteSideQuest(quest.id, sideQuest.id);
                                                                                        }}
                                                                                    >
                                                                                        Delete
                                                                                    </button>
                                                                                </>
                                                                            ) : (
                                                                                <>
                                                                                    {sideStatus !== 'in_progress' && (
                                                                                        <button
                                                                                            className="btn-start btn-small"
                                                                                            onMouseDown={e => e.stopPropagation()}
                                                                                            onDragStart={e => e.stopPropagation()}
                                                                                            onClick={e => { e.stopPropagation(); setSideQuestStatus(quest.id, sideQuest.id, 'in_progress'); }}
                                                                                        >
                                                                                            Start
                                                                                        </button>
                                                                                    )}
                                                                                    {sideStatus !== 'done' && (
                                                                                        <button
                                                                                            className="btn-complete btn-small"
                                                                                            onMouseDown={e => e.stopPropagation()}
                                                                                            onDragStart={e => e.stopPropagation()}
                                                                                            onClick={e => { e.stopPropagation(); setSideQuestStatus(quest.id, sideQuest.id, 'done'); }}
                                                                                        >
                                                                                            Complete
                                                                                        </button>
                                                                                    )}
                                                                                    {sideStatus === 'done' && (
                                                                                        <button
                                                                                            className="btn-ghost btn-small"
                                                                                            onMouseDown={e => e.stopPropagation()}
                                                                                            onDragStart={e => e.stopPropagation()}
                                                                                            onClick={e => { e.stopPropagation(); setSideQuestStatus(quest.id, sideQuest.id, 'todo'); }}
                                                                                        >
                                                                                            Undo
                                                                                        </button>
                                                                                    )}
                                                                                </>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            );
                                                        }}
                                                    />
                                                </div>
                                                <div className="side-quest-footer-wrapper">
                                                    {sideQuestFooter}
                                                </div>
                                            </div>
                                        ) : (
                                            <div style={{ marginTop: 12 }}>
                                                {sideQuestFooter}
                                            </div>
                                        )}
                                    </>
                                )}
                            </>
                        )}
                    </div>
                </div>
                {celebratingQuests[quest.id] && (
                    <div className="level-up-burst" aria-hidden="true">
                        <div className="burst-ring" />
                        <div className="burst-copy">
                            <span className="burst-emoji">✦</span>
                            <span className="burst-text">Level Up!</span>
                        </div>
                    </div>
                )}
            </div>
        </AnimatedQuestCard>
    );
});

QuestCard.displayName = 'QuestCard';

export default QuestCard;
