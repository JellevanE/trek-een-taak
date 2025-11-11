import React from 'react';
import { motion } from 'framer-motion';
import './showcase.css';

/**
 * GlitchText - Arcade-style text with glitch effect
 * Inspired by the title animation in inspiration.html
 */
export const GlitchText = ({ 
    children, 
    glitchOnHover = false,
    continuous = false,
    color = 'var(--neon-cyan, #00ffff)'
}) => {
    const [isGlitching, setIsGlitching] = React.useState(false);

    React.useEffect(() => {
        if (continuous) {
            const interval = setInterval(() => {
                setIsGlitching(true);
                setTimeout(() => setIsGlitching(false), 200);
            }, 3000);
            return () => clearInterval(interval);
        }
    }, [continuous]);

    const glitchVariants = {
        normal: {
            x: 0,
            skewX: 0,
            textShadow: `
                1px 1px 0 ${color},
                -1px -1px 0 var(--neon-pink, #ff00ff),
                0 0 15px ${color}
            `
        },
        glitch1: {
            x: [-4, 6, -3, 4],
            skewX: [-5, 8, -3],
            textShadow: `
                4px 0 0 var(--neon-red, #ff0040),
                -4px 0 0 var(--neon-cyan, #00ffff),
                0 0 20px ${color}
            `
        },
        glitch2: {
            x: [4, -6, 5, -2],
            skewX: [5, -8, 4],
            textShadow: `
                -4px 0 0 var(--neon-pink, #ff00ff),
                4px 0 0 var(--neon-yellow, #ffff00),
                0 0 20px ${color}
            `
        }
    };

    return (
        <motion.span
            className="glitch-text"
            style={{
                fontFamily: "'Press Start 2P', cursive",
                color: color,
                display: 'inline-block',
                userSelect: 'none'
            }}
            animate={isGlitching ? ['glitch1', 'glitch2', 'glitch1', 'normal'] : 'normal'}
            variants={glitchVariants}
            transition={{
                duration: 0.3,
                times: [0, 0.33, 0.66, 1],
                ease: 'easeInOut'
            }}
            onHoverStart={glitchOnHover ? () => setIsGlitching(true) : undefined}
            onHoverEnd={glitchOnHover ? () => setIsGlitching(false) : undefined}
        >
            {children}
        </motion.span>
    );
};

// Example usage showcase
export const GlitchTextShowcase = () => {
    return (
        <div style={{ 
            padding: '40px', 
            background: 'var(--bg-secondary, #1a1a2e)',
            display: 'flex',
            flexDirection: 'column',
            gap: '30px',
            alignItems: 'center',
            minHeight: '300px'
        }}>
            <GlitchText continuous>
                [ QUEST TRACKER ]
            </GlitchText>

            <GlitchText glitchOnHover color="var(--neon-pink, #ff00ff)">
                HOVER ME
            </GlitchText>

            <div style={{ fontSize: '14px', color: 'var(--muted, #888)', fontFamily: 'VT323, monospace' }}>
                <GlitchText color="var(--neon-yellow, #ffff00)">
                    LEVEL UP!
                </GlitchText>
            </div>

            <div style={{ fontSize: '16px', textAlign: 'center' }}>
                <GlitchText continuous color="var(--neon-green, #00ff00)">
                    QUEST COMPLETE
                </GlitchText>
            </div>
        </div>
    );
};
