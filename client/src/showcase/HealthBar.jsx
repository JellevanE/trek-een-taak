import React from 'react';
import { motion } from 'framer-motion';
import './showcase.css';

/**
 * HealthBar - Retro-style progress/health bar with multiple visual styles
 * Can be used for quest progress, XP bars, daily streaks, etc.
 */
export const HealthBar = ({
    current = 50,
    max = 100,
    label = '',
    showPercentage = true,
    style = 'neon', // neon, pixel, gradient, classic
    height = 32,
    animated = true,
    color = 'auto' // auto (dynamic based on percentage), green, red, cyan, yellow, purple
}) => {
    const percentage = Math.round((current / max) * 100);

    // Dynamic color based on percentage if 'auto' is selected
    const getAutoColor = () => {
        if (percentage < 30) return 'red';
        if (percentage < 70) return 'yellow';
        return 'green';
    };

    const actualColor = color === 'auto' ? getAutoColor() : color;

    const colorMap = {
        green: {
            primary: 'var(--neon-green, #00ff00)',
            shadow: 'rgba(0, 255, 0, 0.3)',
            glow: 'rgba(0, 255, 0, 0.15)'
        },
        red: {
            primary: 'var(--neon-red, #ff0040)',
            shadow: 'rgba(255, 0, 64, 0.3)',
            glow: 'rgba(255, 0, 64, 0.15)'
        },
        cyan: {
            primary: 'var(--neon-cyan, #00ffff)',
            shadow: 'rgba(0, 255, 255, 0.3)',
            glow: 'rgba(0, 255, 255, 0.15)'
        },
        yellow: {
            primary: 'var(--neon-yellow, #ffff00)',
            shadow: 'rgba(255, 255, 0, 0.3)',
            glow: 'rgba(255, 255, 0, 0.15)'
        },
        purple: {
            primary: 'var(--neon-purple, #9400d3)',
            shadow: 'rgba(148, 0, 211, 0.3)',
            glow: 'rgba(148, 0, 211, 0.15)'
        }
    };

    const colors = colorMap[actualColor];

    const getBarStyle = () => {
        switch (style) {
            case 'pixel':
                return {
                    background: `repeating-linear-gradient(
                        90deg,
                        ${colors.primary} 0px,
                        ${colors.primary} 8px,
                        transparent 8px,
                        transparent 10px
                    )`,
                    border: `2px solid ${colors.primary}`,
                    boxShadow: `0 0 5px ${colors.shadow}`
                };
            case 'gradient':
                return {
                    background: `linear-gradient(90deg, 
                        ${colors.primary}, 
                        var(--neon-cyan, #00ffff)
                    )`,
                    border: `1px solid ${colors.primary}`,
                    boxShadow: `0 0 8px ${colors.shadow}, inset 0 0 5px ${colors.glow}`
                };
            case 'classic':
                return {
                    background: colors.primary,
                    border: 'none',
                    boxShadow: 'none'
                };
            case 'neon':
            default:
                return {
                    background: colors.primary,
                    border: `1px solid ${colors.primary}`,
                    boxShadow: `
                        0 0 8px ${colors.shadow},
                        0 0 12px ${colors.glow},
                        inset 0 0 10px rgba(255, 255, 255, 0.2)
                    `
                };
        }
    };

    const barStyle = getBarStyle();

    return (
        <div className="health-bar-container" style={{ width: '100%' }}>
            <div style={{
                position: 'relative',
                width: '100%',
                height: `${height}px`,
                background: 'var(--bg-dark, #0a0a0f)',
                border: '2px solid var(--dark-gray, #444)',
                boxShadow: 'inset 0 0 10px rgba(0, 0, 0, 0.5)',
                overflow: 'hidden'
            }}>
                <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${percentage}%` }}
                    transition={{
                        duration: animated ? 0.8 : 0,
                        ease: 'easeOut'
                    }}
                    style={{
                        height: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0 12px',
                        position: 'relative',
                        ...barStyle
                    }}
                >
                    {/* Animated flowing pattern */}
                    {animated && style === 'neon' && (
                        <motion.div
                            animate={{
                                backgroundPosition: ['0% 0%', '200% 0%']
                            }}
                            transition={{
                                duration: 2,
                                repeat: Infinity,
                                ease: 'linear'
                            }}
                            style={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                right: 0,
                                bottom: 0,
                                background: `repeating-linear-gradient(
                                    90deg,
                                    transparent,
                                    transparent 10px,
                                    rgba(255, 255, 255, 0.1) 10px,
                                    rgba(255, 255, 255, 0.1) 20px
                                )`,
                                backgroundSize: '200% 100%'
                            }}
                        />
                    )}

                    {/* Percentage display */}
                    {showPercentage && percentage > 10 && (
                        <span
                            style={{
                                fontFamily: "'Press Start 2P', cursive",
                                fontSize: `${Math.max(10, height * 0.35)}px`,
                                color: 'white',
                                textShadow: '2px 2px 4px rgba(0, 0, 0, 0.8)',
                                position: 'relative',
                                zIndex: 1,
                                fontWeight: 'bold'
                            }}
                        >
                            {percentage}%
                        </span>
                    )}
                </motion.div>
            </div>
        </div>
    );
};

// Example usage showcase
export const HealthBarShowcase = () => {
    const [progress, setProgress] = React.useState(65);

    return (
        <div style={{ 
            padding: '40px', 
            background: 'var(--bg-secondary, #1a1a2e)',
            minHeight: '500px'
        }}>
            <h3 style={{ 
                fontFamily: "'Press Start 2P', cursive",
                color: 'var(--neon-cyan)',
                fontSize: '14px',
                marginBottom: '30px',
                textAlign: 'center'
            }}>
                HEALTH / PROGRESS BARS
            </h3>

            <div style={{ maxWidth: '600px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '30px' }}>
                {/* Control slider */}
                <div style={{ textAlign: 'center' }}>
                    <label style={{ 
                        color: 'white',
                        fontFamily: 'VT323, monospace',
                        fontSize: '18px',
                        display: 'block',
                        marginBottom: '10px'
                    }}>
                        Adjust Progress: {progress}%
                    </label>
                    <input 
                        type="range" 
                        min="0" 
                        max="100" 
                        value={progress}
                        onChange={(e) => setProgress(parseInt(e.target.value))}
                        style={{ width: '100%' }}
                    />
                </div>

                {/* Different styles */}
                <HealthBar 
                    current={progress} 
                    max={100} 
                    label="NEON STYLE"
                    style="neon"
                    color="green"
                />

                <HealthBar 
                    current={progress} 
                    max={100} 
                    label="PIXEL STYLE"
                    style="pixel"
                    color="cyan"
                />

                <HealthBar 
                    current={progress} 
                    max={100} 
                    label="GRADIENT STYLE"
                    style="gradient"
                    color="purple"
                />

                <HealthBar 
                    current={progress} 
                    max={100} 
                    label="CLASSIC STYLE"
                    style="classic"
                    color="yellow"
                    showPercentage={false}
                />

                {/* Different sizes */}
                <HealthBar 
                    current={progress} 
                    max={100} 
                    label="SMALL (24px)"
                    height={24}
                    color="red"
                />

                <HealthBar 
                    current={progress} 
                    max={100} 
                    label="LARGE (48px)"
                    height={48}
                    color="cyan"
                    emoji="⚡"
                />
            </div>
        </div>
    );
};
