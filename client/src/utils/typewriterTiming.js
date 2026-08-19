// Builds a per-character delay schedule for the story typewriter so the reveal
// feels alive rather than metronomic: each sentence gets a slightly different
// base cadence, punctuation breathes, and the reveal holds after a paragraph.
//
// delays[i] is the pause (ms) BEFORE character i is revealed, decided by what
// was just shown (text[i-1]). Paragraph breaks in the source are the "\n\n"
// separators that StoryMarkup uses between paragraphs; the newline characters
// themselves are invisible, so they reveal instantly and the hold lands right
// before the next paragraph's first character.

const SENTENCE_END = new Set(['.', '!', '?']);
const CLAUSE = new Set([',', ';', ':']);

// Per-sentence multipliers on the base speed, cycled by sentence index. Gives
// each sentence its own tempo without randomness (keeps the reveal reproducible).
const SENTENCE_FACTORS = [1, 0.85, 1.14, 0.92, 1.06];

export function buildRevealDelays(text, options = {}) {
    const {
        speed = 20, // base ms per character
        clausePause = 130, // extra ms after , ; :
        sentencePause = 360, // extra ms after . ! ?
        paragraphHold = 800, // ms held after a paragraph before the next begins
    } = options;

    const delays = new Array(text.length);
    let sentenceIndex = 0;

    for (let i = 0; i < text.length; i++) {
        const base = Math.max(
            1,
            Math.round(speed * SENTENCE_FACTORS[sentenceIndex % SENTENCE_FACTORS.length]),
        );
        const prev = text[i - 1];
        const prev2 = text[i - 2];

        let delay;
        if (prev === '\n' && prev2 === '\n') {
            // First real character after a paragraph break.
            delay = paragraphHold;
        } else if (text[i] === '\n') {
            // The invisible newline characters themselves.
            delay = 0;
        } else if (SENTENCE_END.has(prev)) {
            delay = base + sentencePause;
        } else if (CLAUSE.has(prev)) {
            delay = base + clausePause;
        } else {
            delay = base;
        }

        delays[i] = delay;

        if (SENTENCE_END.has(text[i])) sentenceIndex += 1;
    }

    return delays;
}
