import React from 'react';
import { useReducedMotionPreference } from './useReducedMotionPreference.js';
import { buildRevealDelays } from '../utils/typewriterTiming.js';

// Drives a character-by-character reveal over `text` with a dynamic cadence
// (per-sentence tempo, punctuation breathing, a hold after each paragraph — see
// buildRevealDelays). Returns the number of visible characters, whether the
// reveal is complete, and a `skip` to jump to the end. Respects
// prefers-reduced-motion (reveals everything at once and fires onComplete
// immediately). Callers render the visible slice however they like — plain text
// or parsed markup — using `visibleCount`.
export function useTypewriter({ text, speed = 20, onComplete }) {
    const prefersReducedMotion = useReducedMotionPreference();
    const [charIndex, setCharIndex] = React.useState(0);
    const timeoutRef = React.useRef(null);
    const onCompleteRef = React.useRef(onComplete);
    onCompleteRef.current = onComplete;

    const delays = React.useMemo(() => buildRevealDelays(text, { speed }), [text, speed]);

    const isComplete = prefersReducedMotion || charIndex >= text.length;

    React.useEffect(() => {
        setCharIndex(0);
    }, [text]);

    React.useEffect(() => {
        if (isComplete) {
            onCompleteRef.current?.();
            return;
        }
        const delay = delays[charIndex] ?? speed;
        timeoutRef.current = setTimeout(() => setCharIndex((i) => i + 1), delay);
        return () => clearTimeout(timeoutRef.current);
    }, [charIndex, isComplete, delays, speed]);

    const skip = React.useCallback(() => {
        clearTimeout(timeoutRef.current);
        setCharIndex(text.length);
    }, [text.length]);

    return {
        visibleCount: isComplete ? text.length : charIndex,
        isComplete,
        skip,
    };
}
