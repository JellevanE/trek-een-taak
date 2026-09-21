import PropTypes from 'prop-types';
import React from 'react';
import Icon from '../../../components/Icon.jsx';
import LoadingSpinner from '../../../components/LoadingSpinner.jsx';

/**
 * UsernameAvailability
 * --------------------
 * Inline status for the live username check. Renders nothing while idle so
 * the label row stays quiet until there's something worth saying.
 */
export default function UsernameAvailability({ status }) {
    if (status === 'idle') return null;

    if (status === 'checking') {
        return (
            <span className='availability availability--checking'>
                <LoadingSpinner size='sm' inline label='Checking…' timeoutMs={0} />
            </span>
        );
    }

    if (status === 'available') {
        return (
            <span className='availability availability--available' role='status'>
                <Icon name='check-circle' size={12} />
                Available
            </span>
        );
    }

    if (status === 'error') {
        return (
            <span className='availability availability--error' role='status'>
                <Icon name='exclaimation' size={12} />
                Couldn't check
            </span>
        );
    }

    const message = status === 'reserved' ? 'Not allowed' : 'Taken';
    return (
        <span className='availability availability--taken' role='status'>
            <Icon name='times-circle' size={12} />
            {message}
        </span>
    );
}

/**
 * UsernameSuggestions
 * -------------------
 * Clickable alternatives from the server, rendered under the input (the
 * label row is too narrow for chips once the form goes two-column).
 */
export function UsernameSuggestions({ suggestions = [], onPick }) {
    if (!suggestions.length) return null;
    return (
        <span className='availability-suggestions'>
            <span className='availability-try'>Try</span>
            {suggestions.map((suggestion) => (
                <button
                    key={suggestion}
                    type='button'
                    className='suggestion-chip'
                    onClick={() => onPick && onPick(suggestion)}
                >
                    {suggestion}
                </button>
            ))}
        </span>
    );
}

UsernameSuggestions.propTypes = {
    suggestions: PropTypes.arrayOf(PropTypes.string),
    onPick: PropTypes.func,
};

UsernameAvailability.propTypes = {
    status: PropTypes.oneOf(['idle', 'checking', 'available', 'taken', 'reserved', 'error'])
        .isRequired,
};
