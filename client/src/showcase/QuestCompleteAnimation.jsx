import React from 'react';
import { motion } from 'framer-motion';
import './showcase.css';

/**
 * QuestCompleteAnimation - Subtle spring-based animation for quest card completion
 * Provides a satisfying bounce/scale effect without being overly distracting
 */
export const QuestCompleteAnimation = ({ 
    children, 
    isComplete = false,
    onAnimationComplete 
}) => {
    const [triggerAnimation, setTriggerAnimation] = React.useState(false);

    React.useEffect(() => {
        if (isComplete) {
            setTriggerAnimation(true);
        }
    }, [isComplete]);

    return (
        <motion.div
            animate={triggerAnimation ? {
                scale: [1, 1.08, 0.95, 1],
                rotateZ: [0, -1.5, 1, 0]
            } : {
                scale: 1,
                rotateZ: 0
            }}
            transition={{
                duration: 0.5,
                times: [0, 0.3, 0.6, 1],
                ease: [0.34, 1.56, 0.64, 1] // Custom ease for spring-like bounce
            }}
            onAnimationComplete={() => {
                if (triggerAnimation) {
                    setTriggerAnimation(false);
                    if (onAnimationComplete) onAnimationComplete();
                }
            }}
            style={{
                display: 'inline-block',
                width: '100%'
            }}
        >
            {children}
        </motion.div>
    );
};

// Wrapper component that adds a glow effect on completion
export const QuestCardWrapper = ({ 
    children, 
    isComplete = false,
    glowColor = 'var(--neon-green, #00ff00)'
}) => {
    return (
        <QuestCompleteAnimation isComplete={isComplete}>
            <motion.div
                animate={{
                    boxShadow: isComplete 
                        ? `0 0 15px ${glowColor}, 0 0 25px ${glowColor}40`
                        : '0 0 0px transparent'
                }}
                transition={{
                    duration: 0.3
                }}
                style={{
                    borderRadius: '8px',
                    overflow: 'hidden'
                }}
            >
                {children}
            </motion.div>
        </QuestCompleteAnimation>
    );
};

// Example usage showcase
export const QuestCompleteAnimationShowcase = () => {
    const [complete1, setComplete1] = React.useState(false);
    const [complete2, setComplete2] = React.useState(false);

    return (
        <div style={{ 
            padding: '40px', 
            background: 'var(--bg-secondary, #1a1a2e)',
            minHeight: '400px'
        }}>
            <h3 style={{ 
                fontFamily: "'Press Start 2P', cursive",
                color: 'var(--neon-cyan)',
                fontSize: '14px',
                marginBottom: '30px',
                textAlign: 'center'
            }}>
                QUEST COMPLETE ANIMATION
            </h3>

            <div style={{ 
                display: 'flex', 
                flexDirection: 'column',
                gap: '20px',
                maxWidth: '500px',
                margin: '0 auto'
            }}>
                {/* Example with just animation */}
                <QuestCompleteAnimation isComplete={complete1}>
                    <div style={{
                        padding: '20px',
                        background: 'var(--bg-dark, #0a0a0f)',
                        border: '2px solid var(--neon-cyan)',
                        borderRadius: '8px',
                        color: 'white',
                        fontFamily: 'VT323, monospace',
                        fontSize: '18px'
                    }}>
                        <div style={{ marginBottom: '10px', fontWeight: 'bold' }}>
                            🎯 Defeat the Boss
                        </div>
                        <div style={{ color: 'var(--muted, #888)' }}>
                            A legendary battle awaits
                        </div>
                        <button
                            type="button"
                            onClick={() => setComplete1(true)}
                            style={{
                                marginTop: '15px',
                                padding: '8px 16px',
                                background: 'var(--neon-green)',
                                color: 'var(--bg-dark)',
                                border: 'none',
                                fontFamily: "'Press Start 2P', cursive",
                                fontSize: '10px',
                                cursor: 'pointer'
                            }}
                        >
                            COMPLETE
                        </button>
                    </div>
                </QuestCompleteAnimation>

                {/* Example with wrapper (animation + glow) */}
                <QuestCardWrapper isComplete={complete2} glowColor="var(--neon-cyan)">
                    <div style={{
                        padding: '20px',
                        background: 'var(--bg-dark, #0a0a0f)',
                        border: '2px solid var(--neon-pink)',
                        color: 'white',
                        fontFamily: 'VT323, monospace',
                        fontSize: '18px'
                    }}>
                        <div style={{ marginBottom: '10px', fontWeight: 'bold' }}>
                            ⚔️ Complete 10 Quests
                        </div>
                        <div style={{ color: 'var(--muted, #888)' }}>
                            With wrapper (animation + glow)
                        </div>
                        <button
                            type="button"
                            onClick={() => setComplete2(true)}
                            style={{
                                marginTop: '15px',
                                padding: '8px 16px',
                                background: 'var(--neon-cyan)',
                                color: 'var(--bg-dark)',
                                border: 'none',
                                fontFamily: "'Press Start 2P', cursive",
                                fontSize: '10px',
                                cursor: 'pointer'
                            }}
                        >
                            COMPLETE
                        </button>
                    </div>
                </QuestCardWrapper>

                <button
                    type="button"
                    onClick={() => {
                        setComplete1(false);
                        setComplete2(false);
                    }}
                    style={{
                        marginTop: '20px',
                        padding: '12px 24px',
                        background: 'var(--bg-dark)',
                        color: 'white',
                        border: '2px solid var(--neon-yellow)',
                        fontFamily: "'Press Start 2P', cursive",
                        fontSize: '10px',
                        cursor: 'pointer',
                        alignSelf: 'center'
                    }}
                >
                    RESET ALL
                </button>
            </div>
        </div>
    );
};

export default QuestCompleteAnimation;
