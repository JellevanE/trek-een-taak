import PropTypes from 'prop-types';
import React from 'react';

const SideQuestItem = ({
    quest,
    sideQuest,
    isDragging,
    dragMeta,
    selectedSideQuest,
    editingSideQuest,
    idsMatch,
    handleSelectSideQuest,
    isInteractiveTarget,
    getSideQuestStatus,
    getSideQuestStatusLabel,
    setSideQuestStatus,
    deleteSideQuest,
    startEditingSideQuest,
    handleSideQuestEditChange,
    cancelSideQuestEdit,
    saveSideQuestEdit,
    addInputRefs,
    pulsingSideQuests
}) => {
    const sideStatus = getSideQuestStatus(sideQuest, quest);
    const sideStatusLabel = getSideQuestStatusLabel(sideQuest, quest);
    const sideSelected = !!(selectedSideQuest
        && idsMatch(selectedSideQuest.questId, quest.id)
        && idsMatch(selectedSideQuest.sideQuestId, sideQuest.id));
    const sideEditing = !!(editingSideQuest
        && idsMatch(editingSideQuest.questId, quest.id)
        && idsMatch(editingSideQuest.sideQuestId, sideQuest.id));
    const sideKey = `${quest.id}:${sideQuest.id}`;
    const sideHandleProps = dragMeta?.handleProps || {};
    const sideHandleStyle = { cursor: 'grab', ...dragMeta?.handleStyle };
    const pulsingClass = pulsingSideQuests?.[sideKey] ? 'pulse-subtle' : '';

    const withStop = (fn) => (event) => {
        event.stopPropagation();
        fn(event);
    };

    const handleStatusChange = (status) => withStop(() => setSideQuestStatus(quest.id, sideQuest.id, status));

    return (
        <div
            className={[
                sideStatus === 'done' ? 'completed' : '',
                sideSelected ? 'selected' : '',
                isDragging ? 'dragging' : ''
            ].filter(Boolean).join(' ')}
            role="listitem"
            data-dragging={isDragging ? 'true' : undefined}
        >
            <div
                className={`task-row ${sideEditing ? 'editing' : ''}`}
                role="button"
                tabIndex={0}
                onClick={(event) => {
                    event.stopPropagation();
                    if (isInteractiveTarget(event.target)) return;
                    handleSelectSideQuest(quest.id, sideQuest.id);
                }}
                onFocus={(event) => {
                    event.stopPropagation();
                    if (isInteractiveTarget(event.target)) return;
                    handleSelectSideQuest(quest.id, sideQuest.id);
                }}
                onKeyDown={(event) => {
                    if (isInteractiveTarget(event.target)) return;
                    if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        event.stopPropagation();
                        handleSelectSideQuest(quest.id, sideQuest.id);
                    }
                }}
            >
                <div className="side-quest-main">
                    <button
                        type="button"
                        className="drag-handle"
                        tabIndex={-1}
                        data-drag-handle="true"
                        aria-label="Reorder side quest"
                        {...sideHandleProps}
                        style={{
                            width: 24,
                            height: 24,
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 12,
                            ...sideHandleStyle
                        }}
                        onFocus={(event) => {
                            event.stopPropagation();
                            if (typeof sideHandleProps.onFocus === 'function') {
                                sideHandleProps.onFocus(event);
                            }
                        }}
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={(event) => {
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
                                ref={(element) => {
                                    if (!addInputRefs) return;
                                    if (!addInputRefs.current) addInputRefs.current = {};
                                    const refKey = `${quest.id}:${sideQuest.id}:edit`;
                                    if (element) {
                                        addInputRefs.current[refKey] = element;
                                    } else {
                                        delete addInputRefs.current[refKey];
                                    }
                                }}
                                onChange={handleSideQuestEditChange}
                                onClick={(event) => event.stopPropagation()}
                                onKeyDown={(event) => {
                                    if (event.key === 'Enter') {
                                        event.preventDefault();
                                        saveSideQuestEdit(quest.id, sideQuest.id);
                                    } else if (event.key === 'Escape') {
                                        event.preventDefault();
                                        cancelSideQuestEdit();
                                    }
                                }}
                            />
                        </div>
                    ) : (
                        <div
                            className={[
                                'side-quest-desc',
                                sideStatus === 'in_progress' ? 'in-progress' : '',
                            sideStatus === 'done' ? 'started' : '',
                                pulsingClass
                            ].filter(Boolean).join(' ')}
                            style={{ flex: 1 }}
                        >
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
                                onClick={withStop(() => saveSideQuestEdit(quest.id, sideQuest.id))}
                            >
                                Save
                            </button>
                            <button
                                className="btn-ghost btn-small"
                                onClick={withStop(() => cancelSideQuestEdit())}
                            >
                                Cancel
                            </button>
                        </>
                    ) : sideSelected ? (
                        <>
                            <button
                                className="btn-ghost btn-small"
                                onClick={withStop(() => startEditingSideQuest(quest.id, sideQuest))}
                            >
                                Edit
                            </button>
                            <button
                                className="btn-danger btn-small"
                                onClick={withStop(() => deleteSideQuest(quest.id, sideQuest.id))}
                            >
                                Delete
                            </button>
                        </>
                    ) : (
                        <>
                            {sideStatus !== 'in_progress' && (
                                <button
                                    className="btn-start btn-small"
                                    onClick={handleStatusChange('in_progress')}
                                >
                                    Start
                                </button>
                            )}
                            {sideStatus !== 'done' && (
                                <button
                                    className="btn-complete btn-small"
                                    onClick={handleStatusChange('done')}
                                >
                                    Complete
                                </button>
                            )}
                            {sideStatus === 'done' && (
                                <button
                                    className="btn-ghost btn-small"
                                    onClick={handleStatusChange('todo')}
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
};

SideQuestItem.propTypes = {
    quest: PropTypes.object.isRequired,
    sideQuest: PropTypes.object.isRequired,
    isDragging: PropTypes.bool,
    dragMeta: PropTypes.object,
    selectedSideQuest: PropTypes.shape({
        questId: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
        sideQuestId: PropTypes.oneOfType([PropTypes.number, PropTypes.string])
    }),
    editingSideQuest: PropTypes.shape({
        questId: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
        sideQuestId: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
        description: PropTypes.string
    }),
    idsMatch: PropTypes.func.isRequired,
    handleSelectSideQuest: PropTypes.func.isRequired,
    isInteractiveTarget: PropTypes.func.isRequired,
    getSideQuestStatus: PropTypes.func.isRequired,
    getSideQuestStatusLabel: PropTypes.func.isRequired,
    setSideQuestStatus: PropTypes.func.isRequired,
    deleteSideQuest: PropTypes.func.isRequired,
    startEditingSideQuest: PropTypes.func.isRequired,
    handleSideQuestEditChange: PropTypes.func.isRequired,
    cancelSideQuestEdit: PropTypes.func.isRequired,
    saveSideQuestEdit: PropTypes.func.isRequired,
    addInputRefs: PropTypes.shape({ current: PropTypes.object }),
    pulsingSideQuests: PropTypes.object
};

SideQuestItem.defaultProps = {
    isDragging: false,
    dragMeta: {},
    selectedSideQuest: null,
    editingSideQuest: null,
    addInputRefs: null,
    pulsingSideQuests: null
};

export const SideQuestList = ({
    quest,
    sideQuests,
    smoothDrag,
    themeName,
    sideQuestItemHeight,
    sideQuestGap,
    sideQuestMaxHeight,
    sideQuestFooter,
    ...itemProps
}) => {
    if (!sideQuests || sideQuests.length === 0) {
        return (
            <div className="side-quest-empty">
                {sideQuestFooter}
            </div>
        );
    }

    const SideQuestListComponent = smoothDrag?.SideQuestList || null;

    const scrollStyle = sideQuestMaxHeight
        ? { maxHeight: sideQuestMaxHeight }
        : undefined;

    return (
        <div className="side-quest-panel">
            <h4>Side-quests:</h4>
            <div
                className="side-quest-scroll"
                role="list"
                style={scrollStyle}
                data-scrollable={sideQuestMaxHeight ? 'true' : undefined}
            >
                {SideQuestListComponent ? (
                    <SideQuestListComponent
                        questId={quest.id}
                        sideQuests={sideQuests}
                        itemHeight={sideQuestItemHeight}
                        itemGap={sideQuestGap}
                        maxContainerHeight={sideQuestMaxHeight}
                        themeName={themeName}
                        renderItem={(sideQuest, isDragging, dragMeta = {}) => (
                            <SideQuestItem
                                quest={quest}
                                sideQuest={sideQuest}
                                isDragging={isDragging}
                                dragMeta={dragMeta}
                                {...itemProps}
                            />
                        )}
                    />
                ) : (
                    sideQuests.map((sideQuest) => (
                        <SideQuestItem
                            key={`${quest.id}:${sideQuest.id}`}
                            quest={quest}
                            sideQuest={sideQuest}
                            {...itemProps}
                        />
                    ))
                )}
            </div>
            <div className="side-quest-footer-wrapper">
                {sideQuestFooter}
            </div>
        </div>
    );
};

SideQuestList.propTypes = {
    quest: PropTypes.object.isRequired,
    sideQuests: PropTypes.arrayOf(PropTypes.object).isRequired,
    smoothDrag: PropTypes.shape({
        SideQuestList: PropTypes.elementType
    }),
    themeName: PropTypes.string,
    sideQuestItemHeight: PropTypes.number,
    sideQuestGap: PropTypes.number,
    sideQuestMaxHeight: PropTypes.number,
    sideQuestFooter: PropTypes.node
};

SideQuestList.defaultProps = {
    smoothDrag: null,
    themeName: 'dark',
    sideQuestItemHeight: 60,
    sideQuestGap: 8,
    sideQuestMaxHeight: null,
    sideQuestFooter: null
};

export default SideQuestList;
