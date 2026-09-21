import { fireEvent, render, screen } from '@testing-library/react';
import ProgressIndicator from './ProgressIndicator.jsx';

const STEPS = [
    { id: 'a', label: 'Welcome' },
    { id: 'b', label: 'Account' },
    { id: 'c', label: 'Profile' },
];

test('marks the current step and disables steps not yet reached', () => {
    render(
        <ProgressIndicator steps={STEPS} currentIndex={1} maxReachedIndex={1} onSelect={jest.fn()} />,
    );
    const current = screen.getByRole('button', { name: /step 2 of 3: account/i });
    expect(current).toHaveAttribute('aria-current', 'step');
    expect(current).toBeDisabled();
    expect(screen.getByRole('button', { name: /step 3 of 3/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /step 1 of 3/i })).toBeEnabled();
    expect(screen.getByText(/step 2 of 3/i, { selector: '.progress-text' })).toBeInTheDocument();
});

test('completed steps call onSelect with their index', () => {
    const onSelect = jest.fn();
    render(
        <ProgressIndicator steps={STEPS} currentIndex={2} maxReachedIndex={2} onSelect={onSelect} />,
    );
    fireEvent.click(screen.getByRole('button', { name: /step 1 of 3/i }));
    expect(onSelect).toHaveBeenCalledWith(0);
});

test('a previously reached later step stays clickable after going back', () => {
    const onSelect = jest.fn();
    render(
        <ProgressIndicator steps={STEPS} currentIndex={0} maxReachedIndex={2} onSelect={onSelect} />,
    );
    fireEvent.click(screen.getByRole('button', { name: /step 3 of 3/i }));
    expect(onSelect).toHaveBeenCalledWith(2);
});

test('locked disables every step', () => {
    render(
        <ProgressIndicator
            steps={STEPS}
            currentIndex={2}
            maxReachedIndex={2}
            onSelect={jest.fn()}
            locked
        />,
    );
    screen.getAllByRole('button').forEach((button) => expect(button).toBeDisabled());
});

test('fills the bar proportionally to the current step', () => {
    render(
        <ProgressIndicator steps={STEPS} currentIndex={1} maxReachedIndex={1} onSelect={jest.fn()} />,
    );
    expect(screen.getByTestId('progress-fill')).toHaveStyle({ width: '50%' });
});
