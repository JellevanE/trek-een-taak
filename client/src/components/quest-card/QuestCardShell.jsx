import PropTypes from 'prop-types';
import React from 'react';
import { AnimatedQuestCard } from '../AnimatedComponents';

export const QuestCardShell = ({
    quest,
    questClassName,
    isDragging,
    dragMeta,
    isNew,
    isCelebrating,
    handleSelectQuest,
    isInteractiveTarget,
    children
}) => {
    const questHandleProps = dragMeta?.handleProps || {};
    const questHandleStyle = { cursor: 'grab', ...dragMeta?.handleStyle };

    const handleRootInteraction = (event) => {
        if (isInteractiveTarget(event.target)) return;
        handleSelectQuest(quest.id);
    };

    return (
        <AnimatedQuestCard isNew={isNew} isCompleting={isCelebrating}>
            <div
                role="button"
                tabIndex={0}
                className={questClassName}
                data-dragging={isDragging ? 'true' : undefined}
                onClick={handleRootInteraction}
                onFocus={handleRootInteraction}
                onKeyDown={(event) => {
                    if (isInteractiveTarget(event.target)) return;
                    if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        handleSelectQuest(quest.id);
                    }
                }}
            >
                <div className="quest-card-shell">
                    <button
                        type="button"
                        className="drag-handle top"
                        tabIndex={-1}
                        data-drag-handle="true"
                        aria-label="Reorder quest"
                        {...questHandleProps}
                        style={{
                            width: 32,
                            height: 32,
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 18,
                            ...questHandleStyle
                        }}
                        onFocus={(event) => {
                            event.stopPropagation();
                            if (typeof questHandleProps.onFocus === 'function') {
                                questHandleProps.onFocus(event);
                            }
                        }}
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            if (typeof questHandleProps.onClick === 'function') {
                                questHandleProps.onClick(event);
                            }
                        }}
                    >
                        ≡
                    </button>
                    <div className="quest-card-body">
                        {children}
                    </div>
                </div>
                {isCelebrating && (
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
};

QuestCardShell.propTypes = {
    quest: PropTypes.shape({
        id: PropTypes.oneOfType([PropTypes.number, PropTypes.string]).isRequired
    }).isRequired,
    questClassName: PropTypes.string.isRequired,
    isDragging: PropTypes.bool,
    dragMeta: PropTypes.object,
    isNew: PropTypes.bool,
    isCelebrating: PropTypes.bool,
    handleSelectQuest: PropTypes.func.isRequired,
    isInteractiveTarget: PropTypes.func.isRequired,
    children: PropTypes.node.isRequired
};

QuestCardShell.defaultProps = {
    isDragging: false,
    dragMeta: {},
    isNew: false,
    isCelebrating: false
};

export default QuestCardShell;
