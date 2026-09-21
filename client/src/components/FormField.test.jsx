import { render, screen } from '@testing-library/react';
import FormField from './FormField.jsx';

test('wires label, hint and error to the control via aria attributes', () => {
    render(
        <FormField id='username' label='Username' required hint='3–20 chars' error='Too short'>
            {(a11y) => <input {...a11y} />}
        </FormField>,
    );
    const input = screen.getByLabelText(/username/i);
    expect(input).toHaveAttribute('id', 'username');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveClass('error');
    expect(input.getAttribute('aria-describedby').split(' ').sort()).toEqual([
        'username-error',
        'username-hint',
    ]);
    expect(screen.getByRole('alert')).toHaveTextContent('Too short');
    expect(screen.getByText('3–20 chars')).toHaveAttribute('id', 'username-hint');
});

test('shows success only when there is no error, and marks optional fields', () => {
    const { rerender } = render(
        <FormField id='email' label='Email' optional success='Looks good'>
            {(a11y) => <input {...a11y} />}
        </FormField>,
    );
    expect(screen.getByText('(Optional)')).toBeInTheDocument();
    expect(screen.getByText('Looks good')).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toHaveClass('success');

    rerender(
        <FormField id='email' label='Email' optional success='Looks good' error='Nope'>
            {(a11y) => <input {...a11y} />}
        </FormField>,
    );
    expect(screen.queryByText('Looks good')).not.toBeInTheDocument();
    expect(screen.getByText('Nope')).toBeInTheDocument();
});

test('accepts plain children and a status slot', () => {
    render(
        <FormField id='bio' label='Bio' status={<span>0/200</span>}>
            <textarea id='bio' />
        </FormField>,
    );
    expect(screen.getByLabelText('Bio')).toBeInTheDocument();
    expect(screen.getByText('0/200')).toBeInTheDocument();
});
