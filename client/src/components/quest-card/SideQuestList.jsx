import PropTypes from 'prop-types';
import React from 'react';
import { DEFAULT_THEME_ID } from '../../theme';

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

    // DEBUG: Trace side quest editing
    if (sideEditing) {
        console.log(`[SideQuestItem:${sideQuest.id}] editing. Value: '${editingSideQuest?.description}'`);
    }

    const sideKey = `${quest.id}:${sideQuest.id}`;
    const sideHandleProps = dragMeta?.handleProps || {};
    const sideHandleStyle = {
        width: 'var(--side-quest-handle-size)',
        height: 'var(--side-quest-handle-size)',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 'var(--side-quest-handle-font-size)',
        cursor: 'grab',
        ...dragMeta?.handleStyle
    };
    const pulsingClass = pulsingSideQuests?.[sideKey] ? 'pulse-subtle' : '';
    const safeSideDescription = typeof sideQuest.description === 'string'
        && sideQuest.description.trim().length
        ? sideQuest.description.trim()
        : 'Untitled side quest';

    const withStop = (fn) => (event) => {
        event.stopPropagation();
        fn(event);
    };

    const handleStatusChange = (status) => withStop(() => setSideQuestStatus(quest.id, sideQuest.id, status));
    const descriptionClasses = [
        'side-quest-desc',
        sideStatus === 'in_progress' ? 'in-progress' : '',
        sideStatus === 'done' ? 'completed' : '',
        pulsingClass
    ].filter(Boolean).join(' ');

    const inputRef = React.useRef(null);

    React.useEffect(() => {
        if (sideEditing && inputRef.current && addInputRefs && addInputRefs.current) {
            const refKey = `${quest.id}:${sideQuest.id}:edit`;
            addInputRefs.current[refKey] = inputRef.current;
            return () => {
                if (addInputRefs.current) {
                    delete addInputRefs.current[refKey];
                }
            };
        }
    }, [sideEditing, quest.id, sideQuest.id, addInputRefs]);

    return (
        <div
            className={[
                sideStatus === 'done' ? 'completed' : '',
                sideSelected ? 'selected' : '',
                isDragging ? 'dragging' : ''
            ].filter(Boolean).join(' ')}
            role="listitem"
            data-dragging={isDragging ? 'true' : undefined}
            data-status={sideStatus}
            style={{ maxWidth: '100%' }}
        >
            <div
                className={`task-row ${sideEditing ? 'editing' : ''}`}
                role="button"
                tabIndex={0}
                onClick={(event) => {
                    if (isInteractiveTarget(event.target)) return;
                    handleSelectSideQuest(quest.id, sideQuest.id);
                }}
                onFocus={(event) => {
                    if (isInteractiveTarget(event.target)) return;
                    handleSelectSideQuest(quest.id, sideQuest.id);
                }}
                onKeyDown={(event) => {
                    if (isInteractiveTarget(event.target)) return;
                    if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        handleSelectSideQuest(quest.id, sideQuest.id);
                    }
                }}
                {...sideHandleProps}
                style={{
                    ...sideHandleProps.style,
                    cursor: isDragging ? 'grabbing' : 'grab'
                }}
            >
                <div className="side-quest-main" style={{ flex: 1, minWidth: 0, display: 'flex' }}>
                    {sideEditing ? (
                        <div className="side-quest-edit">
                            <input
                                type="text"
                                autoFocus
                                data-subtask-edit={sideKey}
                                value={editingSideQuest?.description || ''}
                                ref={inputRef}
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
                            className={descriptionClasses}
                            style={{
                                flex: 1,
                                minWidth: 0,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                paddingLeft: '12px',
                                cursor: 'pointer'
                            }}
                            title={safeSideDescription}
                            onClick={(e) => {
                                e.stopPropagation();
                                if (!isDragging) {
                                    startEditingSideQuest(quest.id, sideQuest);
                                }
                            }}
                        >
                            {safeSideDescription}
                            <small className="small"> - {sideStatusLabel}</small>
                        </div>
                    )}
                </div>
                <div className="task-row-actions">
                    {sideEditing ? (
                        <>
                            <button
                                type="button"
                                className="btn-primary btn-small"
                                onClick={withStop(() => saveSideQuestEdit(quest.id, sideQuest.id))}
                            >
                                Save
                            </button>
                            <button
                                type="button"
                                className="btn-ghost btn-small"
                                onClick={withStop(() => cancelSideQuestEdit())}
                            >
                                Cancel
                            </button>
                        </>
                    ) : sideSelected ? (
                        <>
                            <button
                                type="button"
                                className="btn-ghost btn-small"
                                onClick={withStop(() => startEditingSideQuest(quest.id, sideQuest))}
                            >
                                Edit
                            </button>
                            <button
                                type="button"
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
                                    type="button"
                                    className="btn-start btn-small"
                                    onClick={handleStatusChange('in_progress')}
                                >
                                    Start
                                </button>
                            )}
                            {sideStatus !== 'done' && (
                                <button
                                    type="button"
                                    className="btn-complete btn-small"
                                    onClick={handleStatusChange('done')}
                                >
                                    Complete
                                </button>
                            )}
                            {sideStatus === 'done' && (
                                <button
                                    type="button"
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
    // Memoize renderItem to prevent unnecessary re-renders
    const renderItem = React.useCallback((sideQuest, isDragging, dragMeta = {}) => (
        <SideQuestItem
            quest={quest}
            sideQuest={sideQuest}
            isDragging={isDragging}
            dragMeta={dragMeta}
            {...itemProps}
        />
    ), [quest, itemProps]);

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
                        renderItem={renderItem}
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
    themeName: DEFAULT_THEME_ID,
    sideQuestItemHeight: 60,
    sideQuestGap: 8,
    sideQuestMaxHeight: null,
    sideQuestFooter: null
};

export default SideQuestList;
