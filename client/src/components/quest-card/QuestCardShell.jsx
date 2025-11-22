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
    children,
    cardTokens
}) => {
    const questHandleProps = dragMeta?.handleProps || {};

    // Merge styles: card tokens + drag cursor
    const cardStyle = React.useMemo(() => {
        const styleVars = {};

        // Apply card tokens
        if (cardTokens) {
            if (cardTokens.depth?.resting) {
                styleVars['--quest-card-shadow-resting'] = cardTokens.depth.resting;
            }
            if (cardTokens.depth?.active) {
                styleVars['--quest-card-shadow-active'] = cardTokens.depth.active;
            }
            if (cardTokens.transition) {
                styleVars['--quest-card-shadow-transition'] = cardTokens.transition;
            }
            if (cardTokens.focusRing) {
                styleVars['--quest-card-focus-outline'] = cardTokens.focusRing;
            }
        }

        // Apply drag cursor
        if (dragMeta?.handleStyle?.cursor) {
            styleVars.cursor = dragMeta.handleStyle.cursor;
        } else {
            styleVars.cursor = 'grab';
        }

        return styleVars;
    }, [cardTokens, dragMeta?.handleStyle]);

    const handleRootInteraction = (event) => {
        if (isInteractiveTarget(event.target)) return;
        handleSelectQuest(quest.id);
    };

    return (
        <AnimatedQuestCard
            isNew={isNew}
            isCompleting={isCelebrating}
            whileHover={!isDragging ? { scale: 1.015, transition: { duration: 0.2 } } : undefined}
            whileTap={!isDragging ? { scale: 0.985 } : undefined}
        >
            <div
                role="button"
                tabIndex={0}
                className={questClassName}
                data-dragging={isDragging ? 'true' : undefined}
                style={cardStyle}
                onClick={handleRootInteraction}
                onFocus={handleRootInteraction}
                onKeyDown={(event) => {
                    if (isInteractiveTarget(event.target)) return;
                    if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        handleSelectQuest(quest.id);
                    }
                }}
                // Spread drag handle props (contains onPointerDown)
                {...questHandleProps}
            >
                <div className="quest-card-shell">
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
    children: PropTypes.node.isRequired,
    cardTokens: PropTypes.shape({
        depth: PropTypes.shape({
            resting: PropTypes.string,
            active: PropTypes.string
        }),
        transition: PropTypes.string,
        focusRing: PropTypes.string
    })
};

QuestCardShell.defaultProps = {
    isDragging: false,
    dragMeta: {},
    isNew: false,
    isCelebrating: false,
    cardTokens: null
};

export default QuestCardShell;
