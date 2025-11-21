import React from 'react';
import { motion } from 'framer-motion';
import './showcase.css';

/**
 * CRTOverlay - Optional scanline and CRT screen effect
 * Add this as an overlay to give the entire app a retro CRT monitor feel
 */
export const CRTOverlay = ({ 
    intensity = 'medium', // low, medium, high
    enabled = true,
    initialGlitch = false // Add glitch effect on mount
}) => {
    const [isGlitching, setIsGlitching] = React.useState(initialGlitch);

    React.useEffect(() => {
        if (initialGlitch) {
            // Glitch sequence on mount
            setTimeout(() => setIsGlitching(false), 800);
        }
    }, [initialGlitch]);

    if (!enabled) return null;

    const intensities = {
        low: { opacity: 0.02, lineHeight: '6px', blur: '1px' },
        medium: { opacity: 0.05, lineHeight: '4px', blur: '2px' },
        high: { opacity: 0.1, lineHeight: '2px', blur: '3px' }
    };

    const settings = intensities[intensity];

    return (
        <div 
            className="crt-overlay"
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                pointerEvents: 'none',
                zIndex: 9999,
                overflow: 'hidden'
            }}
        >
            {/* Scanlines */}
            <motion.div
                animate={{
                    y: [0, 10, 0]
                }}
                transition={{
                    duration: 8,
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
                        0deg,
                        rgba(0, 0, 0, ${settings.opacity}) 0px,
                        transparent 1px,
                        transparent ${settings.lineHeight}
                    )`
                }}
            />

            {/* CRT screen curve vignette */}
            <div
                style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: `radial-gradient(
                        ellipse at center,
                        transparent 0%,
                        transparent 70%,
                        rgba(0, 0, 0, 0.3) 100%
                    )`,
                    backdropFilter: `blur(${settings.blur})`
                }}
            />

            {/* Subtle screen flicker */}
            <motion.div
                animate={{
                    opacity: isGlitching ? [0, 0.1, 0, 0.15, 0.05, 0] : [0, 0.02, 0]
                }}
                transition={isGlitching ? {
                    duration: 0.8,
                    times: [0, 0.1, 0.2, 0.4, 0.7, 1]
                } : {
                    duration: 0.1,
                    repeat: Infinity,
                    repeatDelay: Math.random() * 5 + 3
                }}
                style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'white'
                }}
            />

            {/* Glitch distortion on mount */}
            {isGlitching && (
                <motion.div
                    animate={{
                        x: [0, -10, 5, -8, 3, 0],
                        scaleX: [1, 0.95, 1.05, 0.98, 1.02, 1]
                    }}
                    transition={{
                        duration: 0.8,
                        times: [0, 0.2, 0.4, 0.6, 0.8, 1]
                    }}
                    style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: `repeating-linear-gradient(
                            90deg,
                            rgba(255, 0, 0, 0.1) 0px,
                            rgba(0, 255, 0, 0.1) 2px,
                            rgba(0, 0, 255, 0.1) 4px
                        )`
                    }}
                />
            )}
        </div>
    );
};

// Example usage showcase
export const CRTOverlayShowcase = () => {
    const [enabled, setEnabled] = React.useState(true);
    const [intensity, setIntensity] = React.useState('medium');

    return (
        <div style={{ 
            padding: '40px', 
            background: 'var(--bg-secondary, #1a1a2e)',
            minHeight: '400px',
            position: 'relative'
        }}>
            <CRTOverlay enabled={enabled} intensity={intensity} />

            <h3 style={{ 
                fontFamily: "'Press Start 2P', cursive",
                color: 'var(--neon-cyan)',
                fontSize: '14px',
                marginBottom: '30px',
                textAlign: 'center'
            }}>
                CRT OVERLAY
            </h3>

            <div style={{ 
                display: 'flex', 
                flexDirection: 'column',
                gap: '20px', 
                alignItems: 'center',
                position: 'relative',
                zIndex: 1
            }}>
                <label style={{ 
                    color: 'white',
                    fontFamily: 'VT323, monospace',
                    fontSize: '20px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px'
                }}>
                    <input 
                        type="checkbox" 
                        checked={enabled}
                        onChange={(e) => setEnabled(e.target.checked)}
                        style={{ width: '20px', height: '20px' }}
                    />
                    Enable CRT Effect
                </label>

                <div style={{ display: 'flex', gap: '10px' }}>
                    {['low', 'medium', 'high'].map(level => (
                        <button
                            key={level}
                            type="button"
                            onClick={() => setIntensity(level)}
                            style={{
                                padding: '12px 20px',
                                background: intensity === level ? 'var(--neon-cyan)' : 'var(--bg-dark)',
                                color: intensity === level ? 'var(--bg-dark)' : 'white',
                                border: `2px solid var(--neon-cyan)`,
                                fontFamily: "'Press Start 2P', cursive",
                                fontSize: '10px',
                                cursor: 'pointer',
                                textTransform: 'uppercase'
                            }}
                        >
                            {level}
                        </button>
                    ))}
                </div>

                <div style={{
                    marginTop: '30px',
                    padding: '30px',
                    background: 'var(--bg-dark)',
                    border: '2px solid var(--neon-pink)',
                    color: 'white',
                    fontFamily: 'VT323, monospace',
                    fontSize: '18px',
                    textAlign: 'center',
                    maxWidth: '400px'
                }}>
                    Look at this text and the background.
                    <br/><br/>
                    Notice the subtle scanlines moving across the screen?
                    <br/><br/>
                    That's the CRT effect! 📺
                </div>
            </div>
        </div>
    );
};
