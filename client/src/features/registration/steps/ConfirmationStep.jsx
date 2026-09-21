import PropTypes from 'prop-types';
import React from 'react';
import Avatar from '../../../components/Avatar.jsx';
import Icon from '../../../components/Icon.jsx';
import { CLASSES } from './ProfileSetupStep.jsx';

const NEXT_STEPS = [
    { icon: 'plus', text: 'Add your first quest — anything on your list counts.' },
    { icon: 'book', text: 'Start a campaign to group quests and unlock the storyline.' },
    { icon: 'bell', text: 'Claim your daily bonus from the profile drawer.' },
];

/**
 * ConfirmationStep
 * ----------------
 * Shown once the account exists on the server. The wizard holds the session
 * token until the user presses the CTA, so this screen is the hand-off into
 * the app rather than a modal they might miss.
 */
export default function ConfirmationStep({ user, onFinish }) {
    const profile = (user && user.profile) || {};
    const displayName = profile.display_name || (user && user.username) || 'adventurer';
    const cls = CLASSES.find((c) => c.id === profile.class) || CLASSES[0];

    return (
        <div className='registration-step confirmation-step'>
            <div className='achievement-banner' role='status'>
                <span className='achievement-icon'>
                    <Icon name='star' size={20} />
                </span>
                <div>
                    <div className='achievement-kicker'>Achievement unlocked</div>
                    <div className='achievement-title'>First Steps</div>
                </div>
            </div>

            <div className='step-header'>
                <h2 tabIndex={-1}>Welcome, {displayName}!</h2>
                <p>Your account is ready. Here's how you'll appear on the quest board.</p>
            </div>

            <div className='profile-summary'>
                <Avatar avatar={profile.avatar} name={displayName} size={56} />
                <div className='profile-summary-text'>
                    <div className='profile-summary-name'>{displayName}</div>
                    {user && user.username && (
                        <div className='profile-summary-username'>@{user.username}</div>
                    )}
                    <div className='profile-summary-class'>
                        <Icon name={cls.icon} size={12} />
                        {cls.name}
                    </div>
                </div>
            </div>

            <div className='next-steps'>
                <div className='next-steps-title'>What's next</div>
                <ul>
                    {NEXT_STEPS.map((item) => (
                        <li key={item.text}>
                            <Icon name={item.icon} size={14} />
                            <span>{item.text}</span>
                        </li>
                    ))}
                </ul>
            </div>

            <div className='form-actions form-actions--center'>
                <button type='button' className='btn-primary btn-lg' onClick={onFinish}>
                    Enter the Quest Board
                </button>
            </div>
        </div>
    );
}

ConfirmationStep.propTypes = {
    user: PropTypes.shape({
        username: PropTypes.string,
        profile: PropTypes.shape({
            display_name: PropTypes.string,
            avatar: PropTypes.string,
            class: PropTypes.string,
        }),
    }),
    onFinish: PropTypes.func.isRequired,
};
