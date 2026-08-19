// Parse story text into a tiny, safe subset of Markdown: paragraphs made of
// emphasis runs. We deliberately support ONLY *italic* and **bold**; block
// structure the model still emits despite prompt instructions (headings,
// horizontal rules, blockquotes) is neutralised to plain text rather than
// rendered. Single underscores are left untouched — usernames contain them
// (e.g. "commander_admin"). Rendering only ever produces text nodes and
// <em>/<strong>, so it is inherently XSS-safe (no dangerouslySetInnerHTML).

const HR_LINE = /^\s*([-*_])(?:\s*\1){2,}\s*$/; // ---, ***, ___

function cleanLine(line) {
    return line
        .replace(/^\s*#{1,6}\s*/, '') // heading markers → plain line
        .replace(/^\s*>\s?/, ''); // blockquote marker
}

// Split a paragraph string into emphasis runs. Asterisk emphasis only.
function parseInline(paragraph) {
    const runs = [];
    const re = /\*\*([^*]+)\*\*|\*([^*\n]+)\*/g;
    let last = 0;
    let match;
    while ((match = re.exec(paragraph)) !== null) {
        if (match.index > last) {
            runs.push({ text: paragraph.slice(last, match.index), bold: false, italic: false });
        }
        if (match[1] !== undefined) {
            runs.push({ text: match[1], bold: true, italic: false });
        } else {
            runs.push({ text: match[2], bold: false, italic: true });
        }
        last = re.lastIndex;
    }
    if (last < paragraph.length) {
        runs.push({ text: paragraph.slice(last), bold: false, italic: false });
    }
    return runs.length > 0 ? runs : [{ text: '', bold: false, italic: false }];
}

export function parseStoryMarkup(text) {
    const safe = typeof text === 'string' ? text : '';
    const cleanedLines = safe
        .split('\n')
        .filter((line) => !HR_LINE.test(line))
        .map(cleanLine);

    // Re-join and split into paragraphs on blank lines; collapse soft-wraps.
    const paragraphs = cleanedLines
        .join('\n')
        .split(/\n{2,}/)
        .map((block) => block.replace(/\n/g, ' ').trim())
        .filter((block) => block.length > 0)
        .map(parseInline);

    const plainText = paragraphs
        .map((runs) => runs.map((run) => run.text).join(''))
        .join('\n\n');

    return { paragraphs, plainText };
}

// Truncate parsed paragraphs to the first `visibleCount` characters, counting a
// 2-char separator between paragraphs so the count lines up with plainText
// length (which the typewriter uses to drive its reveal). `visibleCount == null`
// returns everything.
export function sliceParagraphs(paragraphs, visibleCount) {
    if (visibleCount == null) return paragraphs;

    const out = [];
    let remaining = visibleCount;
    for (let p = 0; p < paragraphs.length; p++) {
        if (p > 0) {
            remaining -= 2; // the "\n\n" between paragraphs in plainText
            if (remaining <= 0) break;
        }
        const runsOut = [];
        for (const run of paragraphs[p]) {
            if (remaining <= 0) break;
            if (run.text.length <= remaining) {
                runsOut.push(run);
                remaining -= run.text.length;
            } else {
                runsOut.push({ ...run, text: run.text.slice(0, remaining) });
                remaining = 0;
                break;
            }
        }
        if (runsOut.length > 0) out.push(runsOut);
        if (remaining <= 0) break;
    }
    return out;
}
