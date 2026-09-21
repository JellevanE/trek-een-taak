import PropTypes from 'prop-types';
import React, { useRef } from 'react';
import Avatar from '../../../components/Avatar.jsx';
import { AVATAR_PRESETS, avatarPresetFromValue, avatarValueFor } from '../avatars.js';

/**
 * AvatarPicker
 * ------------
 * A radiogroup of preset avatars plus an "initials" option. Follows the
 * WAI-ARIA radio pattern: one tab stop, arrow keys move (and select), Home /
 * End jump to the ends.
 */
export default function AvatarPicker({ value, onChange, name = '', labelId }) {
    const options = [
        { key: 'none', value: null, label: 'Initials', preset: null },
        ...AVATAR_PRESETS.map((preset) => ({
            key: preset.id,
            value: avatarValueFor(preset),
            label: preset.label,
            preset,
        })),
    ];

    // Unknown / non-preset values (e.g. a future image URL) fall back to
    // "Initials" rather than leaving the group with no checked radio.
    const selectedValue = avatarPresetFromValue(value) ? value : null;
    const selectedIndex = Math.max(
        0,
        options.findIndex((option) => option.value === selectedValue),
    );

    const buttonRefs = useRef([]);

    const select = (index) => {
        const next = options[(index + options.length) % options.length];
        onChange(next.value);
        const button = buttonRefs.current[options.indexOf(next)];
        if (button) button.focus();
    };

    const handleKeyDown = (event, index) => {
        switch (event.key) {
            case 'ArrowRight':
            case 'ArrowDown':
                event.preventDefault();
                select(index + 1);
                break;
            case 'ArrowLeft':
            case 'ArrowUp':
                event.preventDefault();
                select(index - 1);
                break;
            case 'Home':
                event.preventDefault();
                select(0);
                break;
            case 'End':
                event.preventDefault();
                select(options.length - 1);
                break;
            case ' ':
            case 'Enter':
                event.preventDefault();
                select(index);
                break;
            default:
                break;
        }
    };

    return (
        <div className='avatar-picker' role='radiogroup' aria-labelledby={labelId}>
            {options.map((option, index) => {
                const checked = index === selectedIndex;
                return (
                    <button
                        key={option.key}
                        ref={(el) => {
                            buttonRefs.current[index] = el;
                        }}
                        type='button'
                        role='radio'
                        aria-checked={checked}
                        aria-label={option.label}
                        title={option.label}
                        tabIndex={checked ? 0 : -1}
                        className={`avatar-option ${checked ? 'is-selected' : ''}`}
                        onClick={() => onChange(option.value)}
                        onKeyDown={(event) => handleKeyDown(event, index)}
                    >
                        <Avatar avatar={option.value} name={name} size={40} />
                        <span className='avatar-option-label'>{option.label}</span>
                    </button>
                );
            })}
        </div>
    );
}

AvatarPicker.propTypes = {
    value: PropTypes.string,
    onChange: PropTypes.func.isRequired,
    name: PropTypes.string,
    labelId: PropTypes.string,
};
