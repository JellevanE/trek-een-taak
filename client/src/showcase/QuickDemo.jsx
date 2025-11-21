import React from 'react';
import { motion } from 'framer-motion';
import { PixelButton } from './PixelButton.jsx';
import { GlitchText } from './GlitchText.jsx';
import { QuestCardWrapper } from './QuestCompleteAnimation.jsx';
import { HealthBar } from './HealthBar.jsx';
import './showcase.css';

/**
 * QuickDemo - Minimal demo showing the most useful components
 * 
 * Drop this into your App.js temporarily to see the effects:
 * 
 * import QuickDemo from './showcase/QuickDemo';
 * 
 * // Then somewhere in your JSX:
 * {showDemo && <QuickDemo onClose={() => setShowDemo(false)} />}
 */
export const QuickDemo = ({ onClose }) => {
    const [questProgress, setQuestProgress] = React.useState(45);
    const [questComplete, setQuestComplete] = React.useState(false);
    const [showGlitch, setShowGlitch] = React.useState(true);

    React.useEffect(() => {
        // Stop glitch after initial animation
        const timer = setTimeout(() => setShowGlitch(false), 600);
        return () => clearTimeout(timer);
    }, []);

    const handleCompleteQuest = () => {
        setQuestComplete(true);
        setQuestProgress(100);
        setTimeout(() => setQuestComplete(false), 600);
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'rgba(0, 0, 0, 0.95)',
                zIndex: 10000,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '20px',
                overflow: 'auto'
            }}
        >
            <motion.div
                initial={{ scale: 0.8, y: 50, opacity: 0 }}
                animate={{ 
                    scale: 1, 
                    y: 0, 
                    opacity: 1,
                    x: showGlitch ? [-3, 3, -2, 2, 0] : 0,
                    filter: showGlitch ? [
                        'hue-rotate(0deg)',
                        'hue-rotate(90deg)',
                        'hue-rotate(-90deg)',
                        'hue-rotate(0deg)'
                    ] : 'hue-rotate(0deg)'
                }}
                transition={{
                    scale: { duration: 0.4, ease: 'easeOut' },
                    y: { duration: 0.4, ease: 'easeOut' },
                    opacity: { duration: 0.3 },
                    x: { duration: 0.6, times: [0, 0.2, 0.4, 0.6, 1] },
                    filter: { duration: 0.6, times: [0, 0.3, 0.6, 1] }
                }}
                style={{
                    maxWidth: '600px',
                    width: '100%',
                    background: 'var(--bg-secondary, #1a1a2e)',
                    border: '2px solid var(--neon-cyan, #00ffff)',
                    padding: '40px',
                    boxShadow: '0 0 15px rgba(0, 255, 255, 0.2)',
                    position: 'relative'
                }}
            >
                {/* Close button */}
                {onClose && (
                    <button
                        type="button"
                        onClick={onClose}
                        style={{
                            position: 'absolute',
                            top: '15px',
                            right: '15px',
                            background: 'transparent',
                            border: '2px solid var(--neon-cyan)',
                            color: 'var(--neon-cyan)',
                            width: '32px',
                            height: '32px',
                            fontSize: '20px',
                            cursor: 'pointer',
                            fontFamily: "'Press Start 2P', cursive"
                        }}
                    >
                        ×
                    </button>
                )}

                {/* Title */}
                <div style={{ textAlign: 'center', marginBottom: '30px' }}>
                    <GlitchText continuous>
                        RETRO SHOWCASE
                    </GlitchText>
                </div>

                {/* Description */}
                <p style={{
                    fontFamily: 'VT323, monospace',
                    fontSize: '20px',
                    color: 'white',
                    textAlign: 'center',
                    marginBottom: '30px',
                    lineHeight: '1.6'
                }}>
                    Here's a quick preview of retro gaming components
                    built with React + Framer Motion.
                </p>

                {/* Interactive Demo */}
                <QuestCardWrapper isComplete={questComplete} glowColor="var(--neon-green)">
                    <div style={{
                        background: 'var(--bg-dark, #0a0a0f)',
                        padding: '30px',
                        border: '2px solid var(--dark-gray, #444)'
                    }}>
                        <h3 style={{
                            fontFamily: "'Press Start 2P', cursive",
                            fontSize: '12px',
                            color: 'var(--neon-yellow, #ffff00)',
                            marginBottom: '20px',
                            textAlign: 'center'
                        }}>
                            ACTIVE QUEST
                        </h3>

                        {/* Progress bar */}
                        <HealthBar
                            current={questProgress}
                            max={100}
                            style="neon"
                            color="auto"
                            height={40}
                        />

                        {/* Slider to adjust progress */}
                        <div style={{ marginTop: '20px', marginBottom: '25px' }}>
                            <input
                                type="range"
                                min="0"
                                max="100"
                                value={questProgress}
                                onChange={(e) => setQuestProgress(parseInt(e.target.value))}
                                style={{ width: '100%', cursor: 'pointer' }}
                            />
                            <p style={{
                                textAlign: 'center',
                                color: 'var(--muted, #888)',
                                fontFamily: 'VT323, monospace',
                                fontSize: '16px',
                                marginTop: '10px'
                            }}>
                                Adjust progress: {questProgress}%
                            </p>
                        </div>

                        {/* Action buttons */}
                        <div style={{
                            display: 'flex',
                            gap: '15px',
                            justifyContent: 'center',
                            marginTop: '25px'
                        }}>
                            <PixelButton
                                variant="success"
                                onClick={handleCompleteQuest}
                            >
                                COMPLETE
                            </PixelButton>
                            <PixelButton
                                variant="danger"
                                onClick={() => setQuestProgress(0)}
                            >
                                RESET
                            </PixelButton>
                        </div>
                    </div>
                </QuestCardWrapper>

                {/* Info */}
                <div style={{
                    marginTop: '25px',
                    padding: '20px',
                    background: 'rgba(0, 255, 255, 0.1)',
                    border: '1px solid var(--neon-cyan)',
                    borderRadius: '4px'
                }}>
                    <p style={{
                        fontFamily: 'VT323, monospace',
                        fontSize: '18px',
                        color: 'var(--neon-cyan)',
                        textAlign: 'center',
                        lineHeight: '1.8'
                    }}>
                        💡 Click "COMPLETE" to see the spring animation!
                        <br />
                        <br />
                        All components are in <strong>client/src/showcase/</strong>
                        <br />
                        See USAGE.md for integration tips
                    </p>
                </div>

                {/* Navigation */}
                {onClose && (
                    <div style={{ textAlign: 'center', marginTop: '30px' }}>
                        <PixelButton variant="primary" onClick={onClose}>
                            BACK TO APP
                        </PixelButton>
                    </div>
                )}
            </motion.div>
        </motion.div>
    );
};

export default QuickDemo;
