import PropTypes from 'prop-types';
import React from 'react';

export const QuestActions = ({
    questSelected,
    questStatus,
    onEdit,
    onDelete,
    onStart,
    onComplete,
    onUndo,
    ctaTokens,
    soundFx
}) => {
    const ctaStyle = React.useMemo(() => {
        if (!ctaTokens) return undefined;
        const vars = {};
        if (ctaTokens.transition) vars['--cta-transition'] = ctaTokens.transition;
        if (ctaTokens.hoverShadow) vars['--cta-hover-shadow'] = ctaTokens.hoverShadow;
        if (ctaTokens.hoverTranslate) vars['--cta-hover-translate'] = ctaTokens.hoverTranslate;
        if (ctaTokens.pressShadow) vars['--cta-press-shadow'] = ctaTokens.pressShadow;
        if (ctaTokens.pressTranslate) vars['--cta-press-translate'] = ctaTokens.pressTranslate;
        if (ctaTokens.focusRing) vars['--cta-focus-ring-color'] = ctaTokens.focusRing;
        return Object.keys(vars).length > 0 ? vars : undefined;
    }, [ctaTokens]);

    const handle = (fn) => (event) => {
        event.stopPropagation();
        fn();
    };

    return (
        <div
            className="quest-actions"
            style={ctaStyle}
            data-sound-enabled={soundFx?.enabled ? 'true' : undefined}
        >
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
    onUndo: PropTypes.func.isRequired,
    ctaTokens: PropTypes.shape({
        transition: PropTypes.string,
        hoverShadow: PropTypes.string,
        hoverTranslate: PropTypes.string,
        pressShadow: PropTypes.string,
        pressTranslate: PropTypes.string,
        focusRing: PropTypes.string
    }),
    soundFx: PropTypes.shape({
        enabled: PropTypes.bool,
        volume: PropTypes.number
    })
};

QuestActions.defaultProps = {
    questSelected: false,
    ctaTokens: null,
    soundFx: null
};

export default QuestActions;
