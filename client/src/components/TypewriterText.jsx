import React from 'react';

const PUNCTUATION = new Set(['.', ',', '!', '?', ';', ':']);

export const TypewriterText = ({
    text,
    speed = 30,
    punctuationPause = 150,
    onComplete,
    className,
    renderControls,
}) => {
    const [charIndex, setCharIndex] = React.useState(0);
    const timeoutRef = React.useRef(null);
    const onCompleteRef = React.useRef(onComplete);
    onCompleteRef.current = onComplete;

    const isComplete = charIndex >= text.length;

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

    return (
        <span className={className}>
            {text.slice(0, charIndex)}
            {!isComplete && <span className='typewriter-cursor' />}
            {renderControls?.({ skip, isComplete })}
        </span>
    );
};
