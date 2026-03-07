import React from 'react';
import { motion } from 'framer-motion';
import { TypewriterText } from '../../../components/TypewriterText.jsx';

export const StoryUpdateModal = ({ update, onDismiss }) => {
    const [canContinue, setCanContinue] = React.useState(false);
    const [skipped, setSkipped] = React.useState(false);
    const skipRef = React.useRef(null);

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
                    {skipped ? update.text : (
                        <TypewriterText
                            text={update.text}
                            onComplete={() => setCanContinue(true)}
                            renderControls={({ skip: doSkip }) => {
                                skipRef.current = doSkip;
                                return null;
                            }}
                        />
                    )}
                </div>

                <div className='story-update-footer'>
                    {!canContinue && !skipped && (
                        <button
                            type='button'
                            className='btn-ghost btn-small'
                            onClick={() => {
                                skipRef.current?.();
                                setSkipped(true);
                                setCanContinue(true);
                            }}
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
