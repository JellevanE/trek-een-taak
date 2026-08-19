import { parseStoryMarkup, sliceParagraphs } from './storyMarkup';

const runsToText = (paragraphs) =>
    paragraphs.map((runs) => runs.map((r) => r.text).join('')).join('\n\n');

test('splits paragraphs and keeps plain text', () => {
    const { paragraphs, plainText } = parseStoryMarkup('First para.\n\nSecond para.');
    expect(paragraphs).toHaveLength(2);
    expect(plainText).toBe('First para.\n\nSecond para.');
});

test('parses bold and italic emphasis into runs', () => {
    const { paragraphs } = parseStoryMarkup('A **bold** and *italic* tale.');
    const runs = paragraphs[0];
    expect(runs).toEqual([
        { text: 'A ', bold: false, italic: false },
        { text: 'bold', bold: true, italic: false },
        { text: ' and ', bold: false, italic: false },
        { text: 'italic', bold: false, italic: true },
        { text: ' tale.', bold: false, italic: false },
    ]);
});

test('plainText excludes the emphasis markers', () => {
    const { plainText } = parseStoryMarkup('A **bold** and *italic* tale.');
    expect(plainText).toBe('A bold and italic tale.');
});

test('neutralises headings to plain text (no markers)', () => {
    const { paragraphs, plainText } = parseStoryMarkup('# The Obsidian Vigil\n\nBody text.');
    expect(runsToText(paragraphs)).toBe('The Obsidian Vigil\n\nBody text.');
    expect(plainText).not.toContain('#');
});

test('drops horizontal rules', () => {
    const { plainText } = parseStoryMarkup('Intro.\n\n---\n\nAfter the rule.');
    expect(plainText).toBe('Intro.\n\nAfter the rule.');
});

test('leaves single underscores (usernames) untouched', () => {
    const { paragraphs, plainText } = parseStoryMarkup('Hail commander_admin, hero.');
    expect(plainText).toBe('Hail commander_admin, hero.');
    expect(paragraphs[0]).toEqual([
        { text: 'Hail commander_admin, hero.', bold: false, italic: false },
    ]);
});

test('sliceParagraphs returns all when count is null', () => {
    const { paragraphs } = parseStoryMarkup('A **bold** tale.\n\nSecond.');
    expect(sliceParagraphs(paragraphs, null)).toBe(paragraphs);
});

test('sliceParagraphs reveals up to the visible-character count', () => {
    const { paragraphs } = parseStoryMarkup('A **bold** tale.');
    // "A bold" = 6 visible chars → "A " + "bold"
    const sliced = sliceParagraphs(paragraphs, 6);
    expect(runsToText(sliced)).toBe('A bold');
    expect(sliced[0][1]).toEqual({ text: 'bold', bold: true, italic: false });
});

test('sliceParagraphs partial-reveals a run mid-word', () => {
    const { paragraphs } = parseStoryMarkup('**bold**');
    const sliced = sliceParagraphs(paragraphs, 2);
    expect(runsToText(sliced)).toBe('bo');
    expect(sliced[0][0].bold).toBe(true);
});

test('sliceParagraphs accounts for the paragraph separator', () => {
    const { paragraphs, plainText } = parseStoryMarkup('AB\n\nCD');
    // Full length reveals everything.
    expect(runsToText(sliceParagraphs(paragraphs, plainText.length))).toBe('AB\n\nCD');
    // Only the first paragraph plus the separator → second paragraph not shown.
    expect(runsToText(sliceParagraphs(paragraphs, 3))).toBe('AB');
});
