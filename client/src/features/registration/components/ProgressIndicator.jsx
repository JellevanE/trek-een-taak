import PropTypes from 'prop-types';
import React from 'react';
import Icon from '../../../components/Icon.jsx';

/**
 * ProgressIndicator
 * -----------------
 * Stepper for the wizard. Completed steps are buttons the user can click to
 * go back; the current step is marked with aria-current; steps not reached
 * yet are disabled. `locked` turns every step off (used once the account has
 * actually been created, when going back would be meaningless).
 */
export default function ProgressIndicator({
    steps,
    currentIndex,
    maxReachedIndex,
    onSelect,
    locked = false,
}) {
    const total = steps.length;
    const percent = total > 1 ? (currentIndex / (total - 1)) * 100 : 100;

    return (
        <nav className='progress-indicator' aria-label='Registration progress'>
            <div className='progress-bar' aria-hidden='true'>
                <div
                    className='progress-fill'
                    data-testid='progress-fill'
                    style={{ width: `${percent}%` }}
                />
            </div>

            <ol className='progress-steps'>
                {steps.map((step, index) => {
                    const isCurrent = index === currentIndex;
                    const isDone = index < currentIndex;
                    const reachable = !locked && !isCurrent && index <= maxReachedIndex;
                    const stateClass = isCurrent ? 'is-current' : isDone ? 'is-done' : 'is-upcoming';
                    return (
                        <li key={step.id} className={`progress-step ${stateClass}`}>
                            <button
                                type='button'
                                className='progress-step-button'
                                onClick={() => reachable && onSelect(index)}
                                disabled={!reachable}
                                aria-current={isCurrent ? 'step' : undefined}
                                aria-label={`Step ${index + 1} of ${total}: ${step.label}`}
                            >
                                <span className='progress-step-marker' aria-hidden='true'>
                                    {isDone ? <Icon name='check-circle' size={12} /> : index + 1}
                                </span>
                                <span className='progress-step-label'>{step.label}</span>
                            </button>
                        </li>
                    );
                })}
            </ol>

            <div className='progress-text'>
                Step {currentIndex + 1} of {total}
                <span className='progress-text-label'>: {steps[currentIndex].label}</span>
            </div>
        </nav>
    );
}

ProgressIndicator.propTypes = {
    steps: PropTypes.arrayOf(
        PropTypes.shape({
            id: PropTypes.string.isRequired,
            label: PropTypes.string.isRequired,
        }),
    ).isRequired,
    currentIndex: PropTypes.number.isRequired,
    maxReachedIndex: PropTypes.number.isRequired,
    onSelect: PropTypes.func.isRequired,
    locked: PropTypes.bool,
};
