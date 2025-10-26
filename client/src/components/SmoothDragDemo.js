import React, { useState } from 'react';
import { SmoothDraggableList, SmoothDraggableSideQuests } from './SmoothDraggable';

/**
 * SmoothDragDemo - Interactive demo of smooth drag & drop
 * 
 * Add this to your App.js temporarily to test the smooth dragging:
 * 
 * import { SmoothDragDemo } from './components/SmoothDragDemo';
 * 
 * // In your JSX:
 * <SmoothDragDemo />
 */
export const SmoothDragDemo = () => {
    const [quests, setQuests] = useState([
        { id: 1, description: 'Complete dashboard redesign', priority: 'high' },
        { id: 2, description: 'Fix authentication bug', priority: 'medium' },
        { id: 3, description: 'Write documentation', priority: 'low' },
        { id: 4, description: 'Deploy to staging', priority: 'high' },
        { id: 5, description: 'Code review', priority: 'medium' },
    ]);

    const [sideQuests, setSideQuests] = useState([
        { id: 1, description: 'Research design patterns' },
        { id: 2, description: 'Create wireframes' },
        { id: 3, description: 'Get stakeholder feedback' },
        { id: 4, description: 'Implement design system' },
    ]);

    return (
        <div style={{ padding: '40px', maxWidth: '800px', margin: '0 auto' }}>
            <h2>🎪 Smooth Drag & Drop Demo</h2>
            <p style={{ color: 'var(--muted)', marginBottom: '30px' }}>
                Try dragging the cards below. Notice the smooth physics and automatic reordering!
            </p>

            <div style={{ marginBottom: '60px' }}>
                <h3 style={{ marginBottom: '20px' }}>Main Quests</h3>
                <SmoothDraggableList
                    items={quests}
                    onReorder={(newOrder) => {
                        setQuests(newOrder);
                        console.log('New quest order:', newOrder);
                    }}
                    itemHeight={80}
                    renderItem={(quest, isDragging) => (
                        <div
                            style={{
                                padding: '16px 20px',
                                background: isDragging
                                    ? 'rgba(155, 92, 255, 0.15)'
                                    : 'rgba(255, 255, 255, 0.03)',
                                border: isDragging
                                    ? '2px solid rgba(155, 92, 255, 0.5)'
                                    : '1px solid rgba(255, 255, 255, 0.1)',
                                borderRadius: '8px',
                                marginBottom: '8px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '12px',
                                transition: 'background 0.2s, border 0.2s',
                            }}
                        >
                            <div
                                style={{
                                    fontSize: '16px',
                                    opacity: 0.5,
                                    userSelect: 'none',
                                }}
                            >
                                ⋮⋮
                            </div>
                            <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: 500 }}>{quest.description}</div>
                                <div
                                    style={{
                                        fontSize: '12px',
                                        color: 'var(--muted)',
                                        marginTop: '4px',
                                    }}
                                >
                                    Priority: {quest.priority}
                                </div>
                            </div>
                            {isDragging && (
                                <div
                                    style={{
                                        fontSize: '12px',
                                        color: 'rgba(155, 92, 255, 0.8)',
                                    }}
                                >
                                    Dragging...
                                </div>
                            )}
                        </div>
                    )}
                />
            </div>

            <div>
                <h3 style={{ marginBottom: '20px' }}>Side Quests (Subtasks)</h3>
                <div
                    style={{
                        background: 'rgba(255, 255, 255, 0.02)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: '8px',
                        padding: '16px',
                    }}
                >
                    <SmoothDraggableSideQuests
                        items={sideQuests}
                        onReorder={(newOrder) => {
                            setSideQuests(newOrder);
                            console.log('New side quest order:', newOrder);
                        }}
                        itemHeight={50}
                        renderItem={(sideQuest, isDragging) => (
                            <div
                                style={{
                                    padding: '10px 16px',
                                    background: isDragging
                                        ? 'rgba(0, 212, 255, 0.1)'
                                        : 'rgba(255, 255, 255, 0.02)',
                                    border: isDragging
                                        ? '1px solid rgba(0, 212, 255, 0.4)'
                                        : '1px solid rgba(255, 255, 255, 0.05)',
                                    borderRadius: '6px',
                                    marginBottom: '6px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    fontSize: '14px',
                                    transition: 'background 0.2s, border 0.2s',
                                }}
                            >
                                <div
                                    style={{
                                        fontSize: '12px',
                                        opacity: 0.4,
                                        userSelect: 'none',
                                    }}
                                >
                                    ⋮
                                </div>
                                <div style={{ flex: 1 }}>{sideQuest.description}</div>
                                {isDragging && (
                                    <div
                                        style={{
                                            fontSize: '10px',
                                            color: 'rgba(0, 212, 255, 0.8)',
                                        }}
                                    >
                                        Moving...
                                    </div>
                                )}
                            </div>
                        )}
                    />
                </div>
            </div>

            <div
                style={{
                    marginTop: '40px',
                    padding: '20px',
                    background: 'rgba(155, 92, 255, 0.1)',
                    border: '1px solid rgba(155, 92, 255, 0.3)',
                    borderRadius: '8px',
                }}
            >
                <h4 style={{ marginBottom: '10px' }}>✨ What's Different?</h4>
                <ul style={{ textAlign: 'left', color: 'var(--muted)', fontSize: '14px' }}>
                    <li>Smooth physics-based dragging (no more stuttering!)</li>
                    <li>Items automatically shift as you drag</li>
                    <li>Satisfying spring animation on release</li>
                    <li>Better touch support for mobile</li>
                    <li>Elevation shadow during drag</li>
                    <li>No browser ghost images</li>
                </ul>
            </div>
        </div>
    );
};
