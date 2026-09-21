import PropTypes from 'prop-types';
import React, { useEffect, useState } from 'react';

/**
 * LoadingSpinner
 * --------------
 * One loading indicator for the whole client: a labelled spinner that turns
 * into a "taking longer than expected" notice (with an optional cancel) once
 * `timeoutMs` has passed. Announces itself to screen readers via role=status.
 */
export default function LoadingSpinner({
    label = 'Loading…',
    size = 'md',
    inline = false,
    timeoutMs = 10000,
    timeoutMessage = 'This is taking longer than expected.',
    onTimeout,
    onCancel,
    cancelLabel = 'Cancel',
    className = '',
}) {
    const [timedOut, setTimedOut] = useState(false);

    useEffect(() => {
        setTimedOut(false);
        if (!timeoutMs || timeoutMs <= 0) return undefined;
        const timer = setTimeout(() => {
            setTimedOut(true);
            if (onTimeout) onTimeout();
        }, timeoutMs);
        return () => clearTimeout(timer);
    }, [timeoutMs, onTimeout]);

    const classes = [
        'loading-spinner',
        `loading-spinner--${size}`,
        inline ? 'loading-spinner--inline' : '',
        timedOut ? 'loading-spinner--slow' : '',
        className,
    ]
        .filter(Boolean)
        .join(' ');

    return (
        <div className={classes} role='status' aria-live='polite'>
            <span className='loading-spinner__ring' aria-hidden='true' />
            <span className='loading-spinner__label'>{label}</span>
            {timedOut && (
                <span className='loading-spinner__slow'>
                    {timeoutMessage}
                    {onCancel && (
                        <button
                            type='button'
                            className='btn-ghost btn-small'
                            onClick={onCancel}
                        >
                            {cancelLabel}
                        </button>
                    )}
                </span>
            )}
        </div>
    );
}

LoadingSpinner.propTypes = {
    label: PropTypes.node,
    size: PropTypes.oneOf(['sm', 'md', 'lg']),
    inline: PropTypes.bool,
    timeoutMs: PropTypes.number,
    timeoutMessage: PropTypes.node,
    onTimeout: PropTypes.func,
    onCancel: PropTypes.func,
    cancelLabel: PropTypes.node,
    className: PropTypes.string,
};
