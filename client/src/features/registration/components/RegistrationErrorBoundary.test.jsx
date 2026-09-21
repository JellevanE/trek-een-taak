import { fireEvent, render, screen } from '@testing-library/react';
import RegistrationErrorBoundary from './RegistrationErrorBoundary.jsx';

// React logs caught render errors even when a boundary handles them; keep
// the test output readable.
beforeEach(() => jest.spyOn(console, 'error').mockImplementation(() => {}));
afterEach(() => jest.restoreAllMocks());

function Bomb({ shouldThrow }) {
    if (shouldThrow) throw new Error('kaboom');
    return <div>all good</div>;
}

test('renders children when nothing throws', () => {
    render(
        <RegistrationErrorBoundary>
            <Bomb shouldThrow={false} />
        </RegistrationErrorBoundary>,
    );
    expect(screen.getByText('all good')).toBeInTheDocument();
});

test('shows the fallback with retry + cancel when a child throws, and recovers', () => {
    const onError = jest.fn();
    const onCancel = jest.fn();
    let shouldThrow = true;
    const { rerender } = render(
        <RegistrationErrorBoundary onError={onError} onCancel={onCancel}>
            <Bomb shouldThrow={shouldThrow} />
        </RegistrationErrorBoundary>,
    );

    expect(screen.getByRole('alert')).toHaveTextContent(/something went sideways/i);
    expect(onError).toHaveBeenCalledWith(expect.any(Error), expect.anything());

    fireEvent.click(screen.getByRole('button', { name: /back to sign in/i }));
    expect(onCancel).toHaveBeenCalled();

    shouldThrow = false;
    rerender(
        <RegistrationErrorBoundary onError={onError} onCancel={onCancel}>
            <Bomb shouldThrow={shouldThrow} />
        </RegistrationErrorBoundary>,
    );
    fireEvent.click(screen.getByRole('button', { name: /try again/i }));
    expect(screen.getByText('all good')).toBeInTheDocument();
});
