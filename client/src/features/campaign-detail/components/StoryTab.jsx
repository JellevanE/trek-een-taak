import React from 'react';
import { AnimatePresence } from 'framer-motion';
import { QuestLog } from './QuestLog.jsx';
import { StoryUpdateModal } from './StoryUpdateModal.jsx';

export const StoryTab = ({
    storyline,
    hasNewUpdate,
    isGenerating,
    onCheckUpdate,
    onMarkAsRead,
}) => {
    const [showModal, setShowModal] = React.useState(false);

    // Show modal automatically when a new update arrives
    React.useEffect(() => {
        if (hasNewUpdate) setShowModal(true);
    }, [hasNewUpdate]);

    if (!storyline) {
        return <div className='story-empty'>No story has begun yet.</div>;
    }

    const { narrativeState, updates } = storyline;
    const latestUpdate = updates && updates.length > 0 ? updates[updates.length - 1] : null;

    const handleDismiss = () => {
        setShowModal(false);
        onMarkAsRead();
    };

    return (
        <div>
            {/* Narrative summary */}
            <div className='story-narrative-summary'>
                <div className='story-narrative-label'>Current Objective</div>
                <div className='story-narrative-objective'>
                    {narrativeState.currentObjective}
                </div>
                <div className='story-narrative-meta'>
                    <span>Chapter {narrativeState.chapter}</span>
                    <span>{narrativeState.progressPercentage}% complete</span>
                </div>
            </div>

            {/* Actions */}
            <div className='story-actions'>
                <button
                    type='button'
                    className='btn-primary btn-small'
                    onClick={onCheckUpdate}
                    disabled={isGenerating}
                >
                    {isGenerating ? 'Consulting the Oracle...' : 'Check for Updates'}
                </button>
                {hasNewUpdate && (
                    <span style={{ fontSize: 12, color: 'var(--success-color, #4caf50)' }}>
                        New developments available!
                    </span>
                )}
            </div>

            {/* Quest log timeline */}
            <QuestLog updates={updates} />

            {/* Story update modal */}
            <AnimatePresence>
                {showModal && latestUpdate && (
                    <StoryUpdateModal
                        update={latestUpdate}
                        onDismiss={handleDismiss}
                    />
                )}
            </AnimatePresence>
        </div>
    );
};
