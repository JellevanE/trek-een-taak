import React from 'react';
import { useReducedMotionPreference } from '../hooks/useReducedMotionPreference.js';

const PUNCTUATION = new Set(['.', ',', '!', '?', ';', ':']);

export const TypewriterText = ({
    text,
    speed = 30,
    punctuationPause = 150,
    onComplete,
    className,
    renderControls,
}) => {
    const prefersReducedMotion = useReducedMotionPreference();
    const [charIndex, setCharIndex] = React.useState(0);
    const timeoutRef = React.useRef(null);
    const onCompleteRef = React.useRef(onComplete);
    onCompleteRef.current = onComplete;

    // With reduced motion the whole text is shown at once (no per-char reveal,
    // no blinking cursor) and onComplete fires immediately.
    const isComplete = prefersReducedMotion || charIndex >= text.length;

    React.useEffect(() => {
        setCharIndex(0);
    }, [text]);

    React.useEffect(() => {
        if (isComplete) {
            onCompleteRef.current?.();
            return;
        }
        const char = text[charIndex];
        const delay = PUNCTUATION.has(char) ? speed + punctuationPause : speed;
        timeoutRef.current = setTimeout(() => setCharIndex((i) => i + 1), delay);
        return () => clearTimeout(timeoutRef.current);
    }, [charIndex, isComplete, text, speed, punctuationPause]);

    const skip = React.useCallback(() => {
        clearTimeout(timeoutRef.current);
        setCharIndex(text.length);
    }, [text.length]);

    const visibleText = isComplete ? text : text.slice(0, charIndex);

    return (
        <span className={className}>
            {visibleText}
            {!isComplete && <span className='typewriter-cursor' />}
            {renderControls?.({ skip, isComplete })}
        </span>
    );
};
