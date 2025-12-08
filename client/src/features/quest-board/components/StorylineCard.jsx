import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export const StorylineCard = ({ storyline, hasUpdate, onCheckUpdate, isGenerating }) => {
    const [expanded, setExpanded] = React.useState(false);

    if (!storyline) return null;

    const { narrativeState, updates } = storyline;
    const latestUpdate = updates && updates.length > 0 ? updates[updates.length - 1] : null;

    return (
        <motion.div
            className="storyline-card"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
                background: 'var(--surface-color)', // Fallback if css var not set
                backgroundColor: 'rgba(255, 255, 255, 0.03)', // Glassy
                borderRadius: 12,
                padding: 16,
                marginBottom: 20,
                border: '1px solid rgba(255, 255, 255, 0.08)',
                position: 'relative',
                overflow: 'hidden'
            }}
        >
            {/* Header / Objective */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <div>
                    <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: 'var(--text-primary)' }}>
                        Current Objective
                    </h3>
                    <div style={{ fontSize: 14, color: 'var(--text-secondary)', marginTop: 4 }}>
                        {narrativeState.currentObjective}
                    </div>
                </div>
                <button
                    className="btn-ghost btn-small"
                    onClick={() => setExpanded(!expanded)}
                >
                    {expanded ? 'Hide History' : 'Show History'}
                </button>
            </div>

            {/* Latest Update */}
            {latestUpdate && (
                <div style={{
                    fontSize: 14,
                    lineHeight: 1.5,
                    color: 'var(--text-primary)',
                    background: 'rgba(0,0,0,0.2)',
                    padding: 12,
                    borderRadius: 8,
                    marginBottom: 12
                }}>
                    <div style={{ fontSize: 11, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 4 }}>
                        Latest Update
                    </div>
                    {latestUpdate.text}
                </div>
            )}

            {/* Actions */}
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <button
                    className="btn-primary btn-small"
                    onClick={onCheckUpdate}
                    disabled={isGenerating}
                >
                    {isGenerating ? 'Consulting the Oracle...' : 'Check for Updates'}
                </button>
                {hasUpdate && (
                    <span style={{ fontSize: 12, color: 'var(--success-color, #4caf50)' }}>
                        New developments available!
                    </span>
                )}
            </div>

            {/* Expanded History */}
            <AnimatePresence>
                {expanded && updates && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        style={{ marginTop: 16, borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 12 }}
                    >
                        <h4 style={{ margin: '0 0 12px 0', fontSize: 14 }}>Adventure Log</h4>
                        <div style={{ display: 'flex', flexDirection: 'column-reverse', gap: 12 }}>
                            {updates.map(update => (
                                <div key={update.id} style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                                        {new Date(update.generatedAt).toLocaleDateString()}
                                    </div>
                                    <div>{update.text}</div>
                                </div>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};
