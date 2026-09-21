import PropTypes from 'prop-types';
import React, { useState } from 'react';
import { apiUrl } from '../../../utils/api.js';
import FormField from '../../../components/FormField.jsx';
import Icon from '../../../components/Icon.jsx';
import LoadingSpinner from '../../../components/LoadingSpinner.jsx';
import PasswordStrengthMeter from '../components/PasswordStrengthMeter.jsx';
import UsernameAvailability, {
    UsernameSuggestions,
} from '../components/UsernameAvailability.jsx';
import { useUsernameAvailability } from '../hooks/useUsernameAvailability.js';
import {
    USERNAME_MAX,
    USERNAME_MIN,
    validateAccountField,
    validateAccountStep,
    validateUsername,
} from '../validation.js';

/**
 * AccountDetailsStep
 * ------------------
 * Username / email / password. Validates locally as the user goes, checks
 * the username live, and re-verifies with the server before advancing so the
 * wizard only moves on when this step actually succeeded.
 */
export default function AccountDetailsStep({ formData, setFormData, onNext, loading }) {
    const [errors, setErrors] = useState({});
    const [showPassword, setShowPassword] = useState(false);
    const [checking, setChecking] = useState(false);

    const usernameValid = !validateUsername(formData.username);
    const availability = useUsernameAvailability(formData.username, {
        enabled: usernameValid,
    });

    const setField = (name, value) => {
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const validateOne = (name, value, nextData) => {
        const message = validateAccountField(name, value, nextData);
        setErrors((prev) => {
            const next = { ...prev };
            if (message) next[name] = message;
            else delete next[name];
            return next;
        });
        return !message;
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        const nextData = { ...formData, [name]: value };
        setField(name, value);

        // Clear (or update) an error as soon as the user is fixing that field,
        // but don't nag about fields they haven't finished yet.
        if (errors[name]) validateOne(name, value, nextData);
        if (name === 'password' && (errors.confirmPassword || nextData.confirmPassword)) {
            validateOne('confirmPassword', nextData.confirmPassword, nextData);
        }
    };

    const handleBlur = (e) => {
        const { name, value } = e.target;
        if (name === 'email' && !value) return;
        if (!value && name !== 'username') return;
        validateOne(name, value, formData);
    };

    const pickSuggestion = (suggestion) => {
        setField('username', suggestion);
        setErrors((prev) => {
            const next = { ...prev };
            delete next.username;
            return next;
        });
    };

    const focusFirstInvalid = (errorMap) => {
        const first = ['username', 'email', 'password', 'confirmPassword'].find(
            (field) => errorMap[field],
        );
        if (!first) return;
        const el = document.getElementById(first);
        if (el && typeof el.focus === 'function') el.focus();
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        const localErrors = validateAccountStep(formData);
        if (Object.keys(localErrors).length > 0) {
            setErrors(localErrors);
            focusFirstInvalid(localErrors);
            return;
        }

        const username = formData.username.trim();

        // Verify against the server BEFORE advancing, so the wizard only
        // progresses when this step actually succeeded. The live check may be
        // stale (or still pending), so re-check unless it just confirmed this
        // exact value.
        setChecking(true);
        try {
            const liveConfirmed = availability.status === 'available' &&
                availability.username === username;

            if (!liveConfirmed) {
                const res = await fetch(
                    apiUrl(`/api/users/check-username/${encodeURIComponent(username)}`),
                );
                const data = await res.json().catch(() => ({}));

                if (!res.ok || !data.available) {
                    const suggestion = Array.isArray(data.suggestions) && data.suggestions.length
                        ? ` Try ${data.suggestions.join(' or ')}.`
                        : '';
                    setErrors((prev) => ({
                        ...prev,
                        username: data.reserved
                            ? `That username isn't allowed.${suggestion}`
                            : `That username is already taken.${suggestion}`,
                    }));
                    focusFirstInvalid({ username: true });
                    return;
                }
            }

            if (formData.email) {
                const emailRes = await fetch(apiUrl('/api/users/validate-email'), {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email: formData.email.trim() }),
                });
                const emailData = await emailRes.json().catch(() => ({}));
                if (!emailRes.ok || !emailData.valid) {
                    setErrors((prev) => ({
                        ...prev,
                        email: 'Please enter a valid email address',
                    }));
                    focusFirstInvalid({ email: true });
                    return;
                }
            }

            onNext();
        } catch (err) {
            setErrors((prev) => ({
                ...prev,
                username:
                    'Could not verify your details. Please check your connection and try again.',
            }));
        } finally {
            setChecking(false);
        }
    };

    const showSuggestions = (availability.status === 'taken' ||
        availability.status === 'reserved') && availability.suggestions.length > 0;

    const passwordsMatch = Boolean(
        formData.confirmPassword &&
            formData.password &&
            formData.confirmPassword === formData.password,
    );

    const passwordToggle = (
        <button
            type='button'
            className='password-toggle'
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
            aria-pressed={showPassword}
        >
            <Icon name={showPassword ? 'eye-cross' : 'eye'} size={16} />
        </button>
    );

    return (
        <div className='registration-step'>
            <div className='step-header'>
                <h2 tabIndex={-1}>Create Your Account</h2>
                <p>Choose a username and secure password to get started</p>
            </div>

            <form onSubmit={handleSubmit} className='registration-form' noValidate>
                <div className='form-row'>
                    <FormField
                        id='username'
                        label='Username'
                        required
                        error={errors.username}
                        hint={showSuggestions
                            ? (
                                <UsernameSuggestions
                                    suggestions={availability.suggestions}
                                    onPick={pickSuggestion}
                                />
                            )
                            : `${USERNAME_MIN}–${USERNAME_MAX} characters: letters, numbers, underscores`}
                        status={<UsernameAvailability status={availability.status} />}
                    >
                        {(a11y) => (
                            <input
                                {...a11y}
                                type='text'
                                name='username'
                                value={formData.username}
                                onChange={handleChange}
                                onBlur={handleBlur}
                                placeholder='Enter your username'
                                required
                                autoComplete='username'
                                autoCapitalize='none'
                                spellCheck={false}
                                maxLength={USERNAME_MAX + 5}
                            />
                        )}
                    </FormField>

                    <FormField id='email' label='Email' optional error={errors.email}>
                        {(a11y) => (
                            <input
                                {...a11y}
                                type='email'
                                name='email'
                                value={formData.email}
                                onChange={handleChange}
                                onBlur={handleBlur}
                                placeholder='Enter your email'
                                autoComplete='email'
                                inputMode='email'
                            />
                        )}
                    </FormField>
                </div>

                <div className='form-row'>
                    <FormField id='password' label='Password' required error={errors.password}>
                        {(a11y) => (
                            <>
                                <div className='password-input-container'>
                                    <input
                                        {...a11y}
                                        aria-describedby={[
                                            a11y['aria-describedby'],
                                            formData.password ? 'password-strength' : null,
                                        ]
                                            .filter(Boolean)
                                            .join(' ') || undefined}
                                        type={showPassword ? 'text' : 'password'}
                                        name='password'
                                        value={formData.password}
                                        onChange={handleChange}
                                        onBlur={handleBlur}
                                        placeholder='Enter your password'
                                        required
                                        autoComplete='new-password'
                                    />
                                    {passwordToggle}
                                </div>
                                <PasswordStrengthMeter
                                    id='password-strength'
                                    password={formData.password}
                                    username={formData.username}
                                />
                            </>
                        )}
                    </FormField>

                    <FormField
                        id='confirmPassword'
                        label='Confirm Password'
                        required
                        error={errors.confirmPassword}
                        success={passwordsMatch ? 'Passwords match' : undefined}
                    >
                        {(a11y) => (
                            <div className='password-input-container'>
                                <input
                                    {...a11y}
                                    type={showPassword ? 'text' : 'password'}
                                    name='confirmPassword'
                                    value={formData.confirmPassword}
                                    onChange={handleChange}
                                    onBlur={handleBlur}
                                    placeholder='Confirm your password'
                                    required
                                    autoComplete='new-password'
                                />
                                {passwordToggle}
                            </div>
                        )}
                    </FormField>
                </div>

                <div className='form-actions'>
                    <button
                        type='submit'
                        className='btn-primary'
                        disabled={loading || checking}
                        data-loading={checking || undefined}
                    >
                        {checking
                            ? <LoadingSpinner size='sm' inline label='Checking…' timeoutMs={0} />
                            : 'Continue'}
                    </button>
                </div>
            </form>
        </div>
    );
}

AccountDetailsStep.propTypes = {
    formData: PropTypes.shape({
        username: PropTypes.string,
        email: PropTypes.string,
        password: PropTypes.string,
        confirmPassword: PropTypes.string,
    }).isRequired,
    setFormData: PropTypes.func.isRequired,
    onNext: PropTypes.func.isRequired,
    loading: PropTypes.bool,
};
