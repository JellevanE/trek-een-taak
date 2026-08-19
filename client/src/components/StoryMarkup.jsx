import React from 'react';
import { sliceParagraphs } from '../utils/storyMarkup.js';

// Renders parsed story paragraphs as <p> blocks with <em>/<strong> emphasis.
// `visibleCount` (from useTypewriter) truncates the reveal; omit it to render
// everything. `showCursor` appends the blinking caret to the last visible
// paragraph during a reveal. Only ever emits text nodes + <em>/<strong>.
export const StoryMarkup = ({ paragraphs, visibleCount, showCursor = false, className }) => {
    const slices = sliceParagraphs(paragraphs, visibleCount);

    return (
        <div className={className}>
            {slices.map((runs, pIndex) => {
                const isLastParagraph = pIndex === slices.length - 1;
                return (
                    <p key={pIndex} className='story-paragraph'>
                        {runs.map((run, rIndex) => {
                            if (run.bold) {
                                return <strong key={rIndex}>{run.text}</strong>;
                            }
                            if (run.italic) {
                                return <em key={rIndex}>{run.text}</em>;
                            }
                            return (
                                <React.Fragment key={rIndex}>{run.text}</React.Fragment>
                            );
                        })}
                        {showCursor && isLastParagraph && (
                            <span className='typewriter-cursor' />
                        )}
                    </p>
                );
            })}
        </div>
    );
};
