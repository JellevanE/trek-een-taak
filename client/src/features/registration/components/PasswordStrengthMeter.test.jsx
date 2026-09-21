import { render, screen, within } from '@testing-library/react';
import PasswordStrengthMeter from './PasswordStrengthMeter.jsx';

test('renders nothing until there is a password', () => {
    const { container } = render(<PasswordStrengthMeter password='' />);
    expect(container).toBeEmptyDOMElement();
});

test('exposes the level through an accessible meter and the checklist', () => {
    render(<PasswordStrengthMeter password='Abcdefghij1' />);
    const meter = screen.getByRole('meter', { name: /password strength/i });
    expect(meter).toHaveAttribute('aria-valuenow', '3');
    expect(meter).toHaveAttribute('aria-valuetext', 'Good');
    expect(screen.getByText('Good')).toBeInTheDocument();

    const list = screen.getByRole('list', { name: /password requirements/i });
    const met = within(list).getAllByRole('listitem').filter((item) =>
        item.className.includes('is-met')
    );
    expect(met).toHaveLength(3);
    expect(screen.getByText(/add a symbol/i)).toBeInTheDocument();
});

test('hides suggestions once the password is strong', () => {
    render(<PasswordStrengthMeter password='Abcdefghij1!x' />);
    expect(screen.getByText('Strong')).toBeInTheDocument();
    expect(screen.queryByText(/add a|mix upper|go to 12/i)).not.toBeInTheDocument();
});
