import PropTypes from 'prop-types';
import React from 'react';

export const QuestActions = ({
    questSelected,
    questStatus,
    onEdit,
    onDelete,
    onStart,
    onComplete,
    onUndo
}) => {
    const handle = (fn) => (event) => {
        event.stopPropagation();
        fn();
    };

    return (
        <div className="quest-actions">
            {questSelected && (
                <>
                    <button className="btn-ghost btn-small" onClick={handle(onEdit)}>
                        Edit
                    </button>
                    <button className="btn-danger btn-small" onClick={handle(onDelete)}>
                        Delete
                    </button>
                </>
            )}
            {questStatus !== 'in_progress' && (
                <button className="btn-start btn-small" onClick={handle(onStart)}>
                    Start
                </button>
            )}
            {questStatus !== 'done' && (
                <button className="btn-complete btn-small" onClick={handle(onComplete)}>
                    Complete
                </button>
            )}
            {questStatus === 'done' && (
                <button className="btn-ghost btn-small" onClick={handle(onUndo)}>
                    Undo
                </button>
            )}
        </div>
    );
};

QuestActions.propTypes = {
    questSelected: PropTypes.bool,
    questStatus: PropTypes.string.isRequired,
    onEdit: PropTypes.func.isRequired,
    onDelete: PropTypes.func.isRequired,
    onStart: PropTypes.func.isRequired,
    onComplete: PropTypes.func.isRequired,
    onUndo: PropTypes.func.isRequired
};

QuestActions.defaultProps = {
    questSelected: false
};

export default QuestActions;
