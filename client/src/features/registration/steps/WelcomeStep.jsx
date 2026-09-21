import PropTypes from 'prop-types';
import React from 'react';
import Icon from '../../../components/Icon.jsx';

const HIGHLIGHTS = [
    {
        icon: 'star',
        title: 'Quests earn XP',
        text: 'Every task is a quest. Finish it, level up, keep your streak alive.',
    },
    {
        icon: 'book',
        title: 'Campaigns tell a story',
        text: 'Group quests into campaigns and let the storyline unfold as you progress.',
    },
    {
        icon: 'bell',
        title: 'Daily bonus',
        text: 'Check in each day for bonus XP. Consistency is the real boss fight.',
    },
];

/**
 * WelcomeStep
 * -----------
 * Sets expectations before asking for anything: what the app is, what it
 * asks for, and why that's safe.
 */
export default function WelcomeStep({ onNext }) {
    return (
        <div className='registration-step welcome-step'>
            <div className='step-header'>
                <h2 tabIndex={-1}>Welcome, adventurer</h2>
                <p>Set up your account in two short steps. It takes about a minute.</p>
            </div>

            <ul className='welcome-highlights'>
                {HIGHLIGHTS.map((item) => (
                    <li key={item.title} className='welcome-highlight'>
                        <span className='welcome-highlight-icon'>
                            <Icon name={item.icon} size={18} />
                        </span>
                        <div>
                            <div className='welcome-highlight-title'>{item.title}</div>
                            <div className='welcome-highlight-text'>{item.text}</div>
                        </div>
                    </li>
                ))}
            </ul>

            <div className='welcome-privacy'>
                <Icon name='octagon-check' size={14} />
                <span>
                    Your password is stored hashed, never in plain text. Email is optional and
                    only kept on your account.
                </span>
            </div>

            <div className='form-actions form-actions--center'>
                <button type='button' className='btn-primary btn-lg' onClick={onNext}>
                    Get Started
                </button>
            </div>
        </div>
    );
}

WelcomeStep.propTypes = {
    onNext: PropTypes.func.isRequired,
};
