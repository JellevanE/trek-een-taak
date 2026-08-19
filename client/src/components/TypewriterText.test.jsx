import { act, render, screen } from '@testing-library/react';
import { TypewriterText } from './TypewriterText.jsx';

const originalMatchMedia = global.matchMedia;

const mockMatchMedia = (matches = false) => {
    global.matchMedia = jest.fn().mockImplementation(() => ({
        matches,
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        addListener: jest.fn(),
        removeListener: jest.fn(),
    }));
};

afterEach(() => {
    global.matchMedia = originalMatchMedia;
    jest.useRealTimers();
    jest.restoreAllMocks();
});

describe('TypewriterText with reduced motion', () => {
    beforeEach(() => mockMatchMedia(true));

    test('renders the full text immediately and calls onComplete', () => {
        const onComplete = jest.fn();
        render(<TypewriterText text='A hero rides at dawn.' onComplete={onComplete} />);

        expect(screen.getByText('A hero rides at dawn.')).toBeInTheDocument();
        expect(onComplete).toHaveBeenCalled();
    });

    test('does not render the blinking cursor', () => {
        const { container } = render(<TypewriterText text='No cursor here.' />);
        expect(container.querySelector('.typewriter-cursor')).toBeNull();
    });
});

describe('TypewriterText without reduced motion', () => {
    beforeEach(() => {
        mockMatchMedia(false);
        jest.useFakeTimers();
    });

    test('reveals text character-by-character and shows a cursor mid-reveal', () => {
        const text = 'Slow reveal.';
        const onComplete = jest.fn();
        const { container } = render(
            <TypewriterText text={text} speed={10} punctuationPause={0} onComplete={onComplete} />,
        );

        // Mid-reveal: cursor present, not yet complete.
        expect(container.querySelector('.typewriter-cursor')).not.toBeNull();
        expect(onComplete).not.toHaveBeenCalled();

        // Drive one character per tick; a separate act() per step flushes the
        // effect that schedules the next timer.
        for (let i = 0; i <= text.length; i++) {
            act(() => {
                jest.advanceTimersByTime(10);
            });
        }

        expect(screen.getByText(text)).toBeInTheDocument();
        expect(onComplete).toHaveBeenCalled();
        expect(container.querySelector('.typewriter-cursor')).toBeNull();
    });
});
