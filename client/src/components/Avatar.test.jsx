import { render, screen } from '@testing-library/react';
import Avatar from './Avatar.jsx';

test('renders a preset avatar with its hue and label', () => {
    render(<Avatar avatar='preset:starborn' name='Hero' />);
    expect(screen.getByRole('img', { name: 'Starborn avatar' })).toHaveClass('avatar--cyan');
});

test('renders an image for URL avatars', () => {
    render(<Avatar avatar='https://example.com/me.png' name='Hero' />);
    expect(screen.getByRole('img', { name: "Hero's avatar" })).toHaveAttribute(
        'src',
        'https://example.com/me.png',
    );
});

test('falls back to the first letter of the name, or U', () => {
    const { rerender } = render(<Avatar avatar={null} name='zelda' />);
    expect(screen.getByRole('img', { name: "zelda's avatar" })).toHaveTextContent('Z');
    rerender(<Avatar avatar='preset:does-not-exist' name='' />);
    expect(screen.getByRole('img', { name: 'Avatar' })).toHaveTextContent('U');
});
