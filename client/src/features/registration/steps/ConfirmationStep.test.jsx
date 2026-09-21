import { fireEvent, render, screen } from '@testing-library/react';
import ConfirmationStep from './ConfirmationStep.jsx';

test('summarises the new profile and hands off on the CTA', () => {
    const onFinish = jest.fn();
    render(
        <ConfirmationStep
            user={{
                username: 'newhero',
                profile: { display_name: 'New Hero', class: 'rogue', avatar: 'preset:tinker' },
            }}
            onFinish={onFinish}
        />,
    );
    expect(screen.getByRole('status')).toHaveTextContent(/first steps/i);
    expect(screen.getByRole('heading', { name: /welcome, new hero/i })).toBeInTheDocument();
    expect(screen.getByText('@newhero')).toBeInTheDocument();
    expect(screen.getByText('Rogue')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /tinker avatar/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /enter the quest board/i }));
    expect(onFinish).toHaveBeenCalledTimes(1);
});

test('falls back gracefully when the server returned no user object', () => {
    render(<ConfirmationStep user={null} onFinish={jest.fn()} />);
    expect(screen.getByRole('heading', { name: /welcome, adventurer/i })).toBeInTheDocument();
});
