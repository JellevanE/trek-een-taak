import React from 'react';
import { motion } from 'framer-motion';
import './showcase.css';

/**
 * PixelButton - Retro arcade-style button with press animation
 * Inspired by the add-btn from inspiration.html but using Framer Motion
 */
export const PixelButton = ({
    children,
    onClick,
    variant = 'primary', // primary, danger, success
    size = 'medium', // small, medium, large
    disabled = false,
    soundEnabled = false
}) => {
    const [isPressed, setIsPressed] = React.useState(false);

    const variants = {
        primary: {
            bg: 'var(--neon-green, #00ff00)',
            shadow: '0 0 10px rgba(0, 255, 0, 0.3)',
            color: 'var(--bg-dark, #0a0a0f)'
        },
        danger: {
            bg: 'var(--neon-red, #ff0040)',
            shadow: '0 0 10px rgba(255, 0, 64, 0.3)',
            color: '#ffffff'
        },
        success: {
            bg: 'var(--neon-cyan, #00ffff)',
            shadow: '0 0 10px rgba(0, 255, 255, 0.3)',
            color: 'var(--bg-dark, #0a0a0f)'
        }
    };

    const sizes = {
        small: { padding: '8px 16px', fontSize: '10px' },
        medium: { padding: '12px 24px', fontSize: '12px' },
        large: { padding: '16px 32px', fontSize: '14px' }
    };

    const style = variants[variant];
    const sizeStyle = sizes[size];

    const handleClick = (e) => {
        if (disabled) return;
        
        setIsPressed(true);
        setTimeout(() => setIsPressed(false), 150);
        
        if (soundEnabled) {
            // Hook for sound effect - implement with Web Audio API
            console.log('🔊 Play button press sound');
        }
        
        if (onClick) onClick(e);
    };

    return (
        <motion.button
            className="pixel-button"
            onClick={handleClick}
            disabled={disabled}
            style={{
                background: style.bg,
                color: style.color,
                padding: sizeStyle.padding,
                fontSize: sizeStyle.fontSize,
                border: `2px solid ${style.bg}`,
                fontFamily: "'Press Start 2P', cursive",
                cursor: disabled ? 'not-allowed' : 'pointer',
                textTransform: 'uppercase',
                boxShadow: isPressed 
                    ? `0 0 5px ${style.bg}` 
                    : `2px 2px 0 var(--bg-dark), ${style.shadow}`,
                opacity: disabled ? 0.5 : 1,
                userSelect: 'none'
            }}
            whileHover={!disabled && !isPressed ? { 
                scale: 1.05,
                boxShadow: `4px 4px 0 var(--bg-dark), 0 0 15px ${style.shadow}, 0 0 25px ${style.shadow.replace('0.3', '0.15')}`
            } : {}}
            whileTap={!disabled ? { 
                scale: 0.98,
                x: 4,
                y: 4
            } : {}}
            transition={{
                type: 'spring',
                stiffness: 400,
                damping: 17
            }}
        >
            {children}
        </motion.button>
    );
};

// Example usage showcase
export const PixelButtonShowcase = () => {
    return (
        <div style={{ 
            padding: '40px', 
            background: 'var(--bg-secondary, #1a1a2e)',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
            alignItems: 'center'
        }}>
            <h3 style={{ 
                fontFamily: "'Press Start 2P', cursive",
                color: 'var(--neon-cyan)',
                fontSize: '14px',
                marginBottom: '20px'
            }}>
                PIXEL BUTTONS
            </h3>
            
            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                <PixelButton variant="primary" onClick={() => console.log('Primary clicked')}>
                    START
                </PixelButton>
                <PixelButton variant="success" onClick={() => console.log('Success clicked')}>
                    CONTINUE
                </PixelButton>
                <PixelButton variant="danger" onClick={() => console.log('Danger clicked')}>
                    CANCEL
                </PixelButton>
            </div>

            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                <PixelButton variant="primary" size="small">SMALL</PixelButton>
                <PixelButton variant="success" size="medium">MEDIUM</PixelButton>
                <PixelButton variant="danger" size="large">LARGE</PixelButton>
            </div>

            <PixelButton variant="primary" disabled>DISABLED</PixelButton>
        </div>
    );
};
