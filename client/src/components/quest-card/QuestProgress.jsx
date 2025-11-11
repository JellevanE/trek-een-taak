import PropTypes from 'prop-types';
import React from 'react';
import { AnimatedProgressBar } from '../AnimatedComponents';

export const QuestProgress = ({
    progress,
    progressColor,
    statusLabel,
    dueDate
}) => (
    <>
        <div className="quest-progress-wrap">
            <div className="quest-progress">
                <AnimatedProgressBar
                    percent={progress}
                    color={progressColor(progress)}
                    ariaProps={{
                        role: 'progressbar',
                        'aria-valuemin': 0,
                        'aria-valuemax': 100,
                        'aria-valuenow': progress,
                        title: `${progress}%`
                    }}
                >
                    <div className="tooltip">{progress}%</div>
                </AnimatedProgressBar>
                <div className="quest-progress-meta">{progress}%</div>
            </div>
        </div>
        <div className="quest-details">
            <div>
                <div className="muted small">Due:</div>
                <div className="muted">{dueDate || '—'}</div>
            </div>
            <div>
                <div className="muted small">Status:</div>
                <div className="muted">{statusLabel}</div>
            </div>
        </div>
    </>
);

QuestProgress.propTypes = {
    progress: PropTypes.number.isRequired,
    progressColor: PropTypes.func.isRequired,
    statusLabel: PropTypes.string.isRequired,
    dueDate: PropTypes.string
};

QuestProgress.defaultProps = {
    dueDate: null
};

export default QuestProgress;
