import PropTypes from 'prop-types';
import React from 'react';
import Icon from './Icon.jsx';
import {
    avatarPresetFromValue,
    isAvatarImageUrl,
} from '../features/registration/avatars.js';

/**
 * Avatar
 * ------
 * Renders a user's avatar from the stored profile string: a pixel-icon preset
 * (`preset:<id>`), an image URL, or — when neither applies — the first letter
 * of their display name.
 */
export default function Avatar({ avatar, name = '', size = 48, className = '' }) {
    const preset = avatarPresetFromValue(avatar);
    const style = { width: size, height: size };
    const classes = ['avatar', className].filter(Boolean);

    if (preset) {
        classes.push(`avatar--${preset.hue}`);
        return (
            <span
                className={classes.join(' ')}
                style={style}
                role='img'
                aria-label={`${preset.label} avatar`}
            >
                <Icon name={preset.icon} size={Math.round(size * 0.5)} />
            </span>
        );
    }

    if (isAvatarImageUrl(avatar)) {
        return (
            <span className={`${classes.join(' ')} avatar--image`} style={style}>
                <img src={avatar} alt={name ? `${name}'s avatar` : 'Avatar'} />
            </span>
        );
    }

    const initial = (name || '').trim().charAt(0).toUpperCase() || 'U';
    return (
        <span
            className={`${classes.join(' ')} avatar--initial`}
            style={{ ...style, fontSize: Math.round(size * 0.5) }}
            role='img'
            aria-label={name ? `${name}'s avatar` : 'Avatar'}
        >
            {initial}
        </span>
    );
}

Avatar.propTypes = {
    avatar: PropTypes.string,
    name: PropTypes.string,
    size: PropTypes.number,
    className: PropTypes.string,
};
