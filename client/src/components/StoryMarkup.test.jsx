import { render } from '@testing-library/react';
import { StoryMarkup } from './StoryMarkup.jsx';
import { parseStoryMarkup } from '../utils/storyMarkup.js';

const renderText = (text, props = {}) => {
    const { paragraphs } = parseStoryMarkup(text);
    return render(<StoryMarkup paragraphs={paragraphs} {...props} />);
};

test('renders bold and italic as <strong>/<em>', () => {
    const { container } = renderText('A **bold** and *soft* word.');
    expect(container.querySelector('strong')).toHaveTextContent('bold');
    expect(container.querySelector('em')).toHaveTextContent('soft');
});

test('renders a heading as plain paragraph text, not an <h1>', () => {
    const { container } = renderText('# The Obsidian Vigil\n\nBody.');
    expect(container.querySelector('h1')).toBeNull();
    expect(container.textContent).toContain('The Obsidian Vigil');
    expect(container.textContent).not.toContain('#');
});

test('splits into multiple paragraphs', () => {
    const { container } = renderText('One.\n\nTwo.\n\nThree.');
    expect(container.querySelectorAll('p.story-paragraph')).toHaveLength(3);
});

test('visibleCount truncates the reveal and shows a cursor', () => {
    const { container } = renderText('A **bold** tale.', { visibleCount: 3, showCursor: true });
    // "A b" revealed (3 visible chars)
    expect(container.textContent.replace('', '')).toContain('A b');
    expect(container.querySelector('.typewriter-cursor')).not.toBeNull();
});

test('does not inject raw HTML from the text', () => {
    const { container } = renderText('Beware <script>alert(1)</script> the dark.');
    expect(container.querySelector('script')).toBeNull();
    expect(container.textContent).toContain('<script>alert(1)</script>');
});
