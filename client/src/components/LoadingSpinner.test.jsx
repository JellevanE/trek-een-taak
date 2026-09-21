import { act, fireEvent, render, screen } from '@testing-library/react';
import LoadingSpinner from './LoadingSpinner.jsx';

beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

test('announces its label via role=status', () => {
    render(<LoadingSpinner label='Loading registration…' />);
    expect(screen.getByRole('status')).toHaveTextContent('Loading registration…');
    expect(screen.queryByText(/taking longer/i)).not.toBeInTheDocument();
});

test('surfaces a slow notice with cancel after the timeout', () => {
    const onTimeout = jest.fn();
    const onCancel = jest.fn();
    render(
        <LoadingSpinner label='Saving…' timeoutMs={2000} onTimeout={onTimeout} onCancel={onCancel} />,
    );
    act(() => jest.advanceTimersByTime(1999));
    expect(screen.queryByText(/taking longer/i)).not.toBeInTheDocument();

    act(() => jest.advanceTimersByTime(1));
    expect(onTimeout).toHaveBeenCalledTimes(1);
    expect(screen.getByText(/taking longer than expected/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
    expect(onCancel).toHaveBeenCalledTimes(1);
});

test('timeoutMs of 0 never shows the slow notice', () => {
    render(<LoadingSpinner timeoutMs={0} />);
    act(() => jest.advanceTimersByTime(60000));
    expect(screen.queryByText(/taking longer/i)).not.toBeInTheDocument();
});
