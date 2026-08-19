import { buildRevealDelays } from './typewriterTiming';

test('base delay tracks the speed option', () => {
    const delays = buildRevealDelays('abcd', { speed: 20 });
    // First sentence factor is 1, so every plain char is the base speed.
    expect(delays).toEqual([20, 20, 20, 20]);
});

test('clause punctuation adds a shorter pause than a sentence end', () => {
    // "a, " → the space after the comma pauses; "a. " → the space after the period pauses more.
    const clause = buildRevealDelays('a, b', { speed: 20, clausePause: 130, sentencePause: 360 });
    const sentence = buildRevealDelays('a. b', { speed: 20, clausePause: 130, sentencePause: 360 });
    const spaceAfterComma = clause[2]; // char before it is ',' (still sentence 0 → base 20)
    const spaceAfterPeriod = sentence[2]; // char before it is '.'
    expect(spaceAfterComma).toBe(20 + 130);
    expect(spaceAfterPeriod).toBeGreaterThan(spaceAfterComma);
    expect(spaceAfterPeriod).toBeGreaterThanOrEqual(360); // at least the sentence pause
});

test('paragraph break holds before the next paragraph and reveals newlines instantly', () => {
    const text = 'End.\n\nNext'; // indexes: E0 n1 d2 .3 \n4 \n5 N6 e7 x8 t9
    const delays = buildRevealDelays(text, { speed: 20, paragraphHold: 800 });
    expect(delays[4]).toBe(0); // first newline (invisible)
    expect(delays[5]).toBe(0); // second newline (invisible)
    expect(delays[6]).toBe(800); // 'N' — first char of the next paragraph
});

test('the paragraph hold is the longest pause', () => {
    const delays = buildRevealDelays('One, two. End.\n\nMore', {
        speed: 20,
        clausePause: 130,
        sentencePause: 360,
        paragraphHold: 800,
    });
    expect(Math.max(...delays)).toBe(800);
});

test('sentences get different base tempos', () => {
    // Isolate the base by zeroing the sentence pause; each sentence's chars then
    // reflect only their tempo factor.
    const delays = buildRevealDelays('a.b.c.d.e.f', { speed: 100, sentencePause: 0 });
    const firstOfSentence2 = delays[2]; // 'b', sentenceIndex 1 → factor 0.85 → 85
    const firstOfSentence3 = delays[4]; // 'c', sentenceIndex 2 → factor 1.14 → 114
    expect(firstOfSentence2).toBe(85);
    expect(firstOfSentence3).toBe(114);
    expect(firstOfSentence2).not.toBe(firstOfSentence3);
});
