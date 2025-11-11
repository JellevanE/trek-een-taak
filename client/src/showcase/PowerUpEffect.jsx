import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import './showcase.css';

/**
 * PowerUpEffect - Celebration animation for quest completion
 * Spawns particles with arcade-style effects
 */
export const PowerUpEffect = ({ 
    active = false, 
    position = { x: 0, y: 0 },
    particleCount = 12,
    particleSymbol = '✨',
    duration = 1.5
}) => {
    const particles = React.useMemo(() => {
        return Array.from({ length: particleCount }).map((_, i) => ({
            id: i,
            angle: (360 / particleCount) * i,
            distance: 80 + Math.random() * 40,
            symbol: particleSymbol,
            rotation: Math.random() * 360,
            scale: 0.8 + Math.random() * 0.4
        }));
    }, [particleCount, particleSymbol]);

    return (
        <AnimatePresence>
            {active && (
                <div 
                    className="power-up-effect"
                    style={{
                        position: 'absolute',
                        left: position.x,
                        top: position.y,
                        pointerEvents: 'none',
                        zIndex: 1000
                    }}
                >
                    {particles.map((particle) => (
                        <motion.div
                            key={particle.id}
                            className="power-up-particle"
                            initial={{
                                x: 0,
                                y: 0,
                                opacity: 1,
                                scale: 0,
                                rotate: 0
                            }}
                            animate={{
                                x: Math.cos(particle.angle * Math.PI / 180) * particle.distance,
                                y: Math.sin(particle.angle * Math.PI / 180) * particle.distance,
                                opacity: 0,
                                scale: particle.scale,
                                rotate: particle.rotation
                            }}
                            transition={{
                                duration: duration,
                                ease: 'easeOut'
                            }}
                            style={{
                                position: 'absolute',
                                fontSize: '24px',
                                filter: 'drop-shadow(0 0 8px var(--neon-yellow))'
                            }}
                        >
                            {particle.symbol}
                        </motion.div>
                    ))}
                    
                    {/* Center burst ring */}
                    <motion.div
                        initial={{ scale: 0, opacity: 1 }}
                        animate={{ scale: 3, opacity: 0 }}
                        transition={{ duration: duration * 0.7, ease: 'easeOut' }}
                        style={{
                            position: 'absolute',
                            width: '40px',
                            height: '40px',
                            border: '3px solid var(--neon-cyan)',
                            borderRadius: '50%',
                            left: '-20px',
                            top: '-20px',
                            boxShadow: '0 0 20px var(--neon-cyan)'
                        }}
                    />
                </div>
            )}
        </AnimatePresence>
    );
};

/**
 * LevelUpAnimation - Full-screen level up celebration
 */
export const LevelUpAnimation = ({ active = false, level = 1, onComplete }) => {
    React.useEffect(() => {
        if (active && onComplete) {
            const timer = setTimeout(onComplete, 2000);
            return () => clearTimeout(timer);
        }
    }, [active, onComplete]);

    return (
        <AnimatePresence>
            {active && (
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
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: 'rgba(0, 0, 0, 0.8)',
                        zIndex: 9999,
                        pointerEvents: 'none'
                    }}
                >
                    <motion.div
                        initial={{ scale: 0, rotate: -180 }}
                        animate={{ 
                            scale: [0, 1.2, 1],
                            rotate: 0
                        }}
                        transition={{
                            duration: 0.6,
                            times: [0, 0.6, 1],
                            ease: 'easeOut'
                        }}
                        style={{
                            fontFamily: "'Press Start 2P', cursive",
                            fontSize: '48px',
                            color: 'var(--neon-yellow)',
                            textAlign: 'center',
                            textShadow: `
                                0 0 20px var(--neon-yellow),
                                0 0 40px var(--neon-yellow),
                                0 0 60px var(--neon-yellow)
                            `
                        }}
                    >
                        <motion.div
                            animate={{
                                textShadow: [
                                    '0 0 20px var(--neon-yellow)',
                                    '0 0 60px var(--neon-yellow)',
                                    '0 0 20px var(--neon-yellow)'
                                ]
                            }}
                            transition={{
                                duration: 1,
                                repeat: Infinity,
                                ease: 'easeInOut'
                            }}
                        >
                            LEVEL {level}
                        </motion.div>
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.4 }}
                            style={{
                                fontSize: '16px',
                                marginTop: '20px',
                                color: 'var(--neon-cyan)'
                            }}
                        >
                            [ QUEST COMPLETE ]
                        </motion.div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

// Example usage showcase
export const PowerUpShowcase = () => {
    const [showEffect, setShowEffect] = React.useState(false);
    const [showLevelUp, setShowLevelUp] = React.useState(false);
    const [position, setPosition] = React.useState({ x: 300, y: 200 });

    const triggerEffect = (e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        setPosition({
            x: rect.left + rect.width / 2,
            y: rect.top + rect.height / 2
        });
        setShowEffect(true);
        setTimeout(() => setShowEffect(false), 1500);
    };

    return (
        <div style={{ 
            padding: '40px', 
            background: 'var(--bg-secondary, #1a1a2e)',
            minHeight: '400px',
            position: 'relative'
        }}>
            <h3 style={{ 
                fontFamily: "'Press Start 2P', cursive",
                color: 'var(--neon-cyan)',
                fontSize: '14px',
                marginBottom: '30px',
                textAlign: 'center'
            }}>
                POWER-UP EFFECTS
            </h3>

            <div style={{ 
                display: 'flex', 
                gap: '20px', 
                justifyContent: 'center',
                flexWrap: 'wrap',
                marginBottom: '40px'
            }}>
                <button
                    onClick={triggerEffect}
                    style={{
                        padding: '16px 32px',
                        background: 'var(--neon-green)',
                        border: '3px solid var(--neon-green)',
                        color: 'var(--bg-dark)',
                        fontFamily: "'Press Start 2P', cursive",
                        fontSize: '12px',
                        cursor: 'pointer',
                        boxShadow: '0 0 20px rgba(0, 255, 0, 0.5)'
                    }}
                >
                    TRIGGER EFFECT
                </button>

                <button
                    onClick={() => setShowLevelUp(true)}
                    style={{
                        padding: '16px 32px',
                        background: 'var(--neon-yellow)',
                        border: '3px solid var(--neon-yellow)',
                        color: 'var(--bg-dark)',
                        fontFamily: "'Press Start 2P', cursive",
                        fontSize: '12px',
                        cursor: 'pointer',
                        boxShadow: '0 0 20px rgba(255, 255, 0, 0.5)'
                    }}
                >
                    LEVEL UP
                </button>
            </div>

            <PowerUpEffect 
                active={showEffect} 
                position={position}
                particleSymbol="⭐"
                particleCount={16}
            />

            <LevelUpAnimation 
                active={showLevelUp} 
                level={5}
                onComplete={() => setShowLevelUp(false)}
            />
        </div>
    );
};
