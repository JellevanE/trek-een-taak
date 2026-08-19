import React from 'react';
import { motion } from 'framer-motion';
import { StoryMarkup } from '../../../components/StoryMarkup.jsx';
import { useTypewriter } from '../../../hooks/useTypewriter.js';
import { parseStoryMarkup } from '../../../utils/storyMarkup.js';

export const StoryUpdateModal = ({ update, onDismiss }) => {
    const [canContinue, setCanContinue] = React.useState(false);

    const parsed = React.useMemo(() => parseStoryMarkup(update.text), [update.text]);
    const { visibleCount, isComplete, skip } = useTypewriter({
        text: parsed.plainText,
        onComplete: () => setCanContinue(true),
    });

    React.useEffect(() => {
        const handleKey = (e) => {
            if (e.key === 'Escape') onDismiss();
        };
        window.addEventListener('keydown', handleKey);
        return () => window.removeEventListener('keydown', handleKey);
    }, [onDismiss]);

    const formattedDate = new Date(update.generatedAt).toLocaleDateString(undefined, {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });

    return (
        <motion.div
            className='story-update-overlay'
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            role='presentation'
            onClick={onDismiss}
        >
            <motion.div
                className='story-update-panel'
                initial={{ opacity: 0, y: 24, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 16, scale: 0.97 }}
                transition={{ duration: 0.25 }}
                onClick={(e) => e.stopPropagation()}
            >
                <div className='story-update-header'>
                    <span className='story-update-title'>New Development</span>
                    <span className='story-update-date'>{formattedDate}</span>
                </div>

                <div className='story-update-body'>
                    <StoryMarkup
                        paragraphs={parsed.paragraphs}
                        visibleCount={isComplete ? undefined : visibleCount}
                        showCursor={!isComplete}
                    />
                </div>

                <div className='story-update-footer'>
                    {!isComplete && (
                        <button
                            type='button'
                            className='btn-ghost btn-small'
                            onClick={skip}
                        >
                            Skip
                        </button>
                    )}
                    <button
                        type='button'
                        className='btn-primary btn-small'
                        disabled={!canContinue}
                        onClick={onDismiss}
                    >
                        Continue
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
};
