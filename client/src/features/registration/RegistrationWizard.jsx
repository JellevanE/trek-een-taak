import PropTypes from 'prop-types';
import React, { useEffect, useRef, useState } from 'react';
import { apiUrl } from '../../utils/api.js';
import ProgressIndicator from './components/ProgressIndicator.jsx';
import RegistrationErrorBoundary from './components/RegistrationErrorBoundary.jsx';
import AccountDetailsStep from './steps/AccountDetailsStep.jsx';
import ConfirmationStep from './steps/ConfirmationStep.jsx';
import ProfileSetupStep from './steps/ProfileSetupStep.jsx';
import WelcomeStep from './steps/WelcomeStep.jsx';

export const STEPS = [
    { id: 'welcome', label: 'Welcome' },
    { id: 'account', label: 'Account' },
    { id: 'profile', label: 'Profile' },
    { id: 'done', label: 'Ready' },
];

const STEP_INDEX = STEPS.reduce((acc, step, index) => ({ ...acc, [step.id]: index }), {});

const INITIAL_FORM = {
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    displayName: '',
    avatar: null,
    class: 'adventurer',
    bio: '',
};

// Failures whose root cause is account-step data (username / email /
// password). These send the user back to that step so the wizard's progress
// reflects what actually failed — including the race where a username is
// claimed between the availability check and the final submit. Transient
// failures (rate limit, server error) are not step-specific and stay put.
export function isAccountDetailsError(err) {
    const status = err && err.status;
    if (status === 429 || status === 500) {
        return false;
    }
    const message = ((err && err.message) || '').toLowerCase();
    return (
        message.includes('username') ||
        message.includes('email') ||
        message.includes('password')
    );
}

// Maps a failed registration into a message that's safe and useful to show.
export function friendlyRegistrationError(err) {
    const status = err && err.status;
    if (status === 429) {
        return 'Too many registration attempts. Please wait a moment and try again.';
    }
    if (status === 500) {
        return 'Something went wrong creating your account. Please try again.';
    }
    return (err && err.message) || 'Registration failed. Please try again.';
}

/**
 * RegistrationWizard
 * ------------------
 * Welcome → Account → Profile → Ready. Owns the form state and the register
 * call; each step owns its own validation.
 */
export default function RegistrationWizard({ onSuccess, onCancel }) {
    const [stepIndex, setStepIndex] = useState(0);
    const [maxReached, setMaxReached] = useState(0);
    const [direction, setDirection] = useState('forward');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [formData, setFormData] = useState(INITIAL_FORM);
    const [registration, setRegistration] = useState(null);

    const contentRef = useRef(null);
    const prevStepRef = useRef(stepIndex);

    const step = STEPS[stepIndex];
    const registered = registration !== null;

    const goTo = (index) => {
        const clamped = Math.max(0, Math.min(STEPS.length - 1, index));
        setDirection(clamped >= stepIndex ? 'forward' : 'back');
        setStepIndex(clamped);
        setMaxReached((prev) => Math.max(prev, clamped));
    };

    // Move focus to the new step's heading so keyboard and screen-reader
    // users land on the content rather than wherever focus was left.
    useEffect(() => {
        // Compare against the previous step rather than a "mounted" flag so
        // StrictMode's double-invoked effects don't steal focus on open.
        if (prevStepRef.current === stepIndex) return;
        prevStepRef.current = stepIndex;
        const heading = contentRef.current && contentRef.current.querySelector('h2');
        if (heading && typeof heading.focus === 'function') {
            heading.focus({ preventScroll: true });
        }
    }, [stepIndex]);

    const handleAccountNext = () => {
        // Auto-populate display name with username if empty.
        if (!formData.displayName) {
            setFormData((prev) => ({ ...prev, displayName: prev.username }));
        }
        goTo(STEP_INDEX.profile);
    };

    const handleSubmit = async () => {
        setLoading(true);
        setError('');

        try {
            const username = formData.username.trim();
            const registrationData = {
                username,
                password: formData.password,
                email: formData.email.trim() || undefined,
                profile: {
                    display_name: formData.displayName.trim() || username,
                    class: formData.class,
                    bio: formData.bio.trim(),
                    ...(formData.avatar ? { avatar: formData.avatar } : {}),
                },
            };

            const response = await fetch(apiUrl('/api/users/register'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(registrationData),
            });

            const data = await response.json().catch(() => ({}));

            if (!response.ok) {
                const err = new Error(data.error || 'Registration failed');
                err.status = response.status;
                throw err;
            }

            setRegistration({ token: data.token, user: data.user || null });
            goTo(STEP_INDEX.done);
        } catch (err) {
            console.error('Registration error:', err);
            // Send the user back to the step that owns the problem so the
            // progress indicator never overstates how far they actually got.
            if (isAccountDetailsError(err)) {
                goTo(STEP_INDEX.account);
            }
            setError(friendlyRegistrationError(err));
        } finally {
            setLoading(false);
        }
    };

    const handleFinish = () => {
        if (registration) onSuccess(registration.token, registration.user);
    };

    const renderStep = () => {
        switch (step.id) {
            case 'welcome':
                return <WelcomeStep onNext={() => goTo(STEP_INDEX.account)} />;
            case 'account':
                return (
                    <AccountDetailsStep
                        formData={formData}
                        setFormData={setFormData}
                        onNext={handleAccountNext}
                        loading={loading}
                    />
                );
            case 'profile':
                return (
                    <ProfileSetupStep
                        formData={formData}
                        setFormData={setFormData}
                        onNext={handleSubmit}
                        onBack={() => goTo(STEP_INDEX.account)}
                        loading={loading}
                    />
                );
            case 'done':
                return (
                    <ConfirmationStep
                        user={registration && registration.user}
                        onFinish={handleFinish}
                    />
                );
            default:
                return null;
        }
    };

    return (
        <div className='registration-wizard' data-step={step.id}>
            <div className='wizard-header'>
                <h1>Welcome to Quest Tracker</h1>
                <ProgressIndicator
                    steps={STEPS}
                    currentIndex={stepIndex}
                    maxReachedIndex={registered ? STEPS.length - 1 : maxReached}
                    onSelect={goTo}
                    locked={registered || loading}
                />
            </div>

            {error && (
                <div className='error-banner' role='alert'>
                    <div className='error-content'>
                        {error}
                        <button
                            type='button'
                            onClick={() => setError('')}
                            className='error-dismiss'
                            aria-label='Dismiss error'
                        >
                            ×
                        </button>
                    </div>
                </div>
            )}

            <div className='wizard-content' ref={contentRef}>
                <RegistrationErrorBoundary onCancel={registered ? undefined : onCancel}>
                    <div key={step.id} className={`wizard-step-shell slide-${direction}`}>
                        {renderStep()}
                    </div>
                </RegistrationErrorBoundary>
            </div>

            {!registered && (
                <div className='wizard-footer'>
                    <button
                        type='button'
                        onClick={onCancel}
                        className='btn-ghost btn-sm'
                        disabled={loading}
                    >
                        Already have an account? Sign in
                    </button>
                </div>
            )}
        </div>
    );
}

RegistrationWizard.propTypes = {
    onSuccess: PropTypes.func.isRequired,
    onCancel: PropTypes.func.isRequired,
};
