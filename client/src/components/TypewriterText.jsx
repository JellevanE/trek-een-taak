import React from 'react';
import { useTypewriter } from '../hooks/useTypewriter.js';

// Plain-text typewriter. For formatted (emphasis) story text, use useTypewriter
// directly with StoryMarkup — a <span> can't wrap block-level paragraphs.
export const TypewriterText = ({
    text,
    speed = 30,
    punctuationPause = 150,
    onComplete,
    className,
    renderControls,
}) => {
    const { visibleCount, isComplete, skip } = useTypewriter({
        text,
        speed,
        punctuationPause,
        onComplete,
    });

    return (
        <span className={className}>
            {text.slice(0, visibleCount)}
            {!isComplete && <span className='typewriter-cursor' />}
            {renderControls?.({ skip, isComplete })}
        </span>
    );
};
