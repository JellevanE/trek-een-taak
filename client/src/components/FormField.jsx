import PropTypes from 'prop-types';
import React from 'react';
import Icon from './Icon.jsx';

/**
 * FormField
 * ---------
 * Label + control + feedback, with the ARIA wiring done once.
 *
 * Pass the control either as plain children or as a render function that
 * receives the accessibility props to spread on the input:
 *
 *   <FormField id='email' label='Email' optional error={errors.email}>
 *       {(a11y) => <input type='email' {...a11y} value={...} onChange={...} />}
 *   </FormField>
 *
 * `error` wins over `success`; `hint` is always shown when provided.
 */
export default function FormField({
    id,
    label,
    required = false,
    optional = false,
    hint,
    error,
    success,
    status,
    className = '',
    children,
}) {
    const hintId = hint ? `${id}-hint` : null;
    const errorId = error ? `${id}-error` : null;
    const successId = !error && success ? `${id}-success` : null;
    const describedBy = [hintId, errorId, successId].filter(Boolean).join(' ') || undefined;

    const a11y = {
        id,
        'aria-describedby': describedBy,
        'aria-invalid': error ? true : undefined,
        className: error ? 'error' : success ? 'success' : undefined,
    };

    const stateClass = error ? 'has-error' : success ? 'has-success' : '';

    return (
        <div className={`form-group ${stateClass} ${className}`.replace(/\s+/g, ' ').trim()}>
            <div className='form-label-row'>
                <label htmlFor={id}>
                    {label}
                    {required && (
                        <span className='form-required' aria-hidden='true'>
                            {' '}*
                        </span>
                    )}
                    {optional && <span className='form-optional'> (Optional)</span>}
                </label>
                {status && <div className='form-status'>{status}</div>}
            </div>

            {typeof children === 'function' ? children(a11y) : children}

            {hint && (
                <div id={hintId} className='form-hint'>
                    {hint}
                </div>
            )}
            {error && (
                <div id={errorId} className='error-message' role='alert'>
                    <Icon name='times-circle' size={12} />
                    <span>{error}</span>
                </div>
            )}
            {!error && success && (
                <div id={successId} className='success-message'>
                    <Icon name='check-circle' size={12} />
                    <span>{success}</span>
                </div>
            )}
        </div>
    );
}

FormField.propTypes = {
    id: PropTypes.string.isRequired,
    label: PropTypes.node.isRequired,
    required: PropTypes.bool,
    optional: PropTypes.bool,
    hint: PropTypes.node,
    error: PropTypes.node,
    success: PropTypes.node,
    status: PropTypes.node,
    className: PropTypes.string,
    children: PropTypes.oneOfType([PropTypes.node, PropTypes.func]).isRequired,
};
