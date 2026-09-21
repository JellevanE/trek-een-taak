import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { AVATAR_PRESETS } from '../avatars.js';
import AvatarPicker from './AvatarPicker.jsx';

function Harness({ initial = null, onChange = () => {} }) {
    const [value, setValue] = useState(initial);
    return (
        <AvatarPicker
            value={value}
            name='Hero'
            onChange={(next) => {
                setValue(next);
                onChange(next);
            }}
        />
    );
}

test('renders the initials option plus every preset as radios with one tab stop', () => {
    render(<Harness />);
    const radios = screen.getAllByRole('radio');
    expect(radios).toHaveLength(AVATAR_PRESETS.length + 1);
    expect(screen.getByRole('radio', { name: 'Initials' })).toHaveAttribute(
        'aria-checked',
        'true',
    );
    expect(radios.filter((r) => r.tabIndex === 0)).toHaveLength(1);
});

test('clicking a preset selects it and reports the stored value', () => {
    const onChange = jest.fn();
    render(<Harness onChange={onChange} />);
    fireEvent.click(screen.getByRole('radio', { name: 'Tinker' }));
    expect(onChange).toHaveBeenCalledWith('preset:tinker');
    expect(screen.getByRole('radio', { name: 'Tinker' })).toHaveAttribute('aria-checked', 'true');
});

test('arrow keys move the selection and wrap; Home/End jump to the ends', () => {
    render(<Harness />);
    const initials = screen.getByRole('radio', { name: 'Initials' });
    initials.focus();

    fireEvent.keyDown(initials, { key: 'ArrowRight' });
    const first = screen.getByRole('radio', { name: AVATAR_PRESETS[0].label });
    expect(first).toHaveAttribute('aria-checked', 'true');
    expect(first).toHaveFocus();

    fireEvent.keyDown(first, { key: 'ArrowLeft' });
    fireEvent.keyDown(screen.getByRole('radio', { name: 'Initials' }), { key: 'ArrowUp' });
    const last = screen.getByRole('radio', { name: AVATAR_PRESETS.at(-1).label });
    expect(last).toHaveAttribute('aria-checked', 'true');

    fireEvent.keyDown(last, { key: 'Home' });
    expect(screen.getByRole('radio', { name: 'Initials' })).toHaveAttribute(
        'aria-checked',
        'true',
    );
    fireEvent.keyDown(screen.getByRole('radio', { name: 'Initials' }), { key: 'End' });
    expect(last).toHaveAttribute('aria-checked', 'true');
});

test('an unknown stored value falls back to the initials option', () => {
    render(<Harness initial='https://example.com/me.png' />);
    expect(screen.getByRole('radio', { name: 'Initials' })).toHaveAttribute(
        'aria-checked',
        'true',
    );
});
