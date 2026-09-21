import PropTypes from 'prop-types';
import React from 'react';
import Icon from '../../../components/Icon.jsx';
import { assessPassword } from '../validation.js';

/**
 * PasswordStrengthMeter
 * ---------------------
 * Four-segment meter + requirement checklist + concrete suggestions.
 * Everything derives from `assessPassword`, so the UI can't disagree with
 * the rule set.
 */
export default function PasswordStrengthMeter({ password, username = '', id }) {
    if (!password) return null;

    const result = assessPassword(password, { username });
    const topSuggestions = result.suggestions.slice(0, 2);

    return (
        <div className={`password-strength password-strength--${result.level}`} id={id}>
            <div className='strength-row'>
                <div
                    className='strength-meter'
                    role='meter'
                    aria-label='Password strength'
                    aria-valuemin={0}
                    aria-valuemax={4}
                    aria-valuenow={result.segments}
                    aria-valuetext={result.label}
                >
                    {[1, 2, 3, 4].map((segment) => (
                        <span
                            key={segment}
                            className={`strength-segment ${
                                segment <= result.segments ? 'is-filled' : ''
                            }`}
                        />
                    ))}
                </div>
                <div className='strength-text'>{result.label}</div>
            </div>

            <ul className='strength-checklist' aria-label='Password requirements'>
                {result.checks.map((check) => (
                    <li
                        key={check.id}
                        className={`strength-check ${check.passed ? 'is-met' : ''} ${
                            check.bonus ? 'is-bonus' : ''
                        }`}
                    >
                        <Icon name={check.passed ? 'check-circle' : 'times-circle'} size={12} />
                        <span>{check.label}</span>
                    </li>
                ))}
            </ul>

            {topSuggestions.length > 0 && result.level !== 'strong' && (
                <div className='strength-suggestions'>
                    {topSuggestions.join(' · ')}
                </div>
            )}
        </div>
    );
}

PasswordStrengthMeter.propTypes = {
    password: PropTypes.string,
    username: PropTypes.string,
    id: PropTypes.string,
};
