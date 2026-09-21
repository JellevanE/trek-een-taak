import PropTypes from 'prop-types';
import React from 'react';
import FormField from '../../../components/FormField.jsx';
import Icon from '../../../components/Icon.jsx';
import LoadingSpinner from '../../../components/LoadingSpinner.jsx';
import AvatarPicker from '../components/AvatarPicker.jsx';

export const CLASSES = [
    {
        id: 'adventurer',
        name: 'Adventurer',
        icon: 'user',
        description: 'Balanced approach to tasks',
    },
    {
        id: 'warrior',
        name: 'Warrior',
        icon: 'octagon-check',
        description: 'Focus on completing difficult tasks',
    },
    {
        id: 'mage',
        name: 'Mage',
        icon: 'book',
        description: 'Strategic planning and organization',
    },
    {
        id: 'rogue',
        name: 'Rogue',
        icon: 'shuffle',
        description: 'Quick completion and efficiency',
    },
];

const BIO_MAX = 200;

/**
 * ProfileSetupStep
 * ----------------
 * Display name, avatar, class and bio. Nothing here is required; every field
 * can be changed later from the profile drawer.
 */
export default function ProfileSetupStep({ formData, setFormData, onNext, onBack, loading }) {
    const update = (patch) => setFormData((prev) => ({ ...prev, ...patch }));

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!loading) onNext();
    };

    return (
        <div className='registration-step'>
            <div className='step-header'>
                <h2 tabIndex={-1}>Set Up Your Profile</h2>
                <p>Customize your adventurer profile (you can change this later)</p>
            </div>

            <form onSubmit={handleSubmit} className='registration-form' noValidate>
                <FormField id='displayName' label='Display Name'>
                    {(a11y) => (
                        <input
                            {...a11y}
                            type='text'
                            name='displayName'
                            value={formData.displayName}
                            onChange={(e) => update({ displayName: e.target.value })}
                            placeholder='How others will see your name'
                            maxLength={50}
                            autoComplete='nickname'
                        />
                    )}
                </FormField>

                <div className='form-group'>
                    <div className='form-label-row'>
                        <span className='form-label' id='avatar-label'>
                            Choose Your Avatar
                        </span>
                    </div>
                    <AvatarPicker
                        labelId='avatar-label'
                        value={formData.avatar}
                        name={formData.displayName || formData.username}
                        onChange={(avatar) => update({ avatar })}
                    />
                </div>

                <fieldset className='form-group class-fieldset'>
                    <legend className='form-label'>Choose Your Class</legend>
                    <div className='class-selection'>
                        {CLASSES.map((cls) => (
                            <label key={cls.id} className='class-option'>
                                <input
                                    type='radio'
                                    name='class'
                                    value={cls.id}
                                    checked={formData.class === cls.id}
                                    onChange={(e) => update({ class: e.target.value })}
                                />
                                <div className='class-card'>
                                    <span className='class-icon'>
                                        <Icon name={cls.icon} size={16} />
                                    </span>
                                    <div>
                                        <div className='class-name'>{cls.name}</div>
                                        <div className='class-description'>{cls.description}</div>
                                    </div>
                                </div>
                            </label>
                        ))}
                    </div>
                </fieldset>

                <FormField
                    id='bio'
                    label='Bio'
                    optional
                    status={
                        <span className='char-counter' aria-live='polite'>
                            {formData.bio.length}/{BIO_MAX}
                        </span>
                    }
                >
                    {(a11y) => (
                        <textarea
                            {...a11y}
                            name='bio'
                            value={formData.bio}
                            onChange={(e) => update({ bio: e.target.value })}
                            placeholder='Tell others about yourself...'
                            maxLength={BIO_MAX}
                            rows={3}
                        />
                    )}
                </FormField>

                <div className='form-actions'>
                    <button
                        type='button'
                        onClick={onBack}
                        className='btn-ghost'
                        disabled={loading}
                    >
                        Back
                    </button>
                    <button
                        type='submit'
                        className='btn-primary'
                        disabled={loading}
                        data-loading={loading || undefined}
                    >
                        {loading
                            ? (
                                <LoadingSpinner
                                    size='sm'
                                    inline
                                    label='Creating account…'
                                    timeoutMs={0}
                                />
                            )
                            : 'Complete Registration'}
                    </button>
                </div>
            </form>
        </div>
    );
}

ProfileSetupStep.propTypes = {
    formData: PropTypes.shape({
        username: PropTypes.string,
        displayName: PropTypes.string,
        avatar: PropTypes.string,
        class: PropTypes.string,
        bio: PropTypes.string,
    }).isRequired,
    setFormData: PropTypes.func.isRequired,
    onNext: PropTypes.func.isRequired,
    onBack: PropTypes.func.isRequired,
    loading: PropTypes.bool,
};
