import React from 'react';
import { motion } from 'framer-motion';
import './showcase.css';

/**
 * RetroLoadingSpinner - 8-bit style loading animations
 */
export const RetroLoadingSpinner = ({ 
    type = 'squares', // squares, dots, bars, spinner
    color = 'var(--neon-cyan, #00ffff)',
    size = 'medium' // small, medium, large
}) => {
    const sizes = {
        small: 24,
        medium: 40,
        large: 60
    };

    const dimension = sizes[size];

    const renderSquares = () => (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px', width: dimension, height: dimension }}>
            {[0, 1, 2, 3].map((i) => (
                <motion.div
                    key={i}
                    animate={{
                        opacity: [0.3, 1, 0.3],
                        scale: [0.8, 1, 0.8]
                    }}
                    transition={{
                        duration: 1.2,
                        repeat: Infinity,
                        delay: i * 0.2,
                        ease: 'easeInOut'
                    }}
                    style={{
                        background: color,
                        boxShadow: `0 0 10px ${color}`
                    }}
                />
            ))}
        </div>
    );

    const renderDots = () => (
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {[0, 1, 2].map((i) => (
                <motion.div
                    key={i}
                    animate={{
                        y: [0, -dimension / 3, 0],
                        opacity: [0.3, 1, 0.3]
                    }}
                    transition={{
                        duration: 0.8,
                        repeat: Infinity,
                        delay: i * 0.2,
                        ease: 'easeInOut'
                    }}
                    style={{
                        width: dimension / 4,
                        height: dimension / 4,
                        background: color,
                        boxShadow: `0 0 10px ${color}`
                    }}
                />
            ))}
        </div>
    );

    const renderBars = () => (
        <div style={{ display: 'flex', gap: '4px', alignItems: 'flex-end', height: dimension }}>
            {[0, 1, 2, 3, 4].map((i) => (
                <motion.div
                    key={i}
                    animate={{
                        height: ['30%', '100%', '30%']
                    }}
                    transition={{
                        duration: 1,
                        repeat: Infinity,
                        delay: i * 0.1,
                        ease: 'easeInOut'
                    }}
                    style={{
                        width: dimension / 6,
                        background: color,
                        boxShadow: `0 0 10px ${color}`
                    }}
                />
            ))}
        </div>
    );

    const renderSpinner = () => (
        <motion.div
            animate={{
                rotate: [0, 90, 180, 270, 360]
            }}
            transition={{
                duration: 1.2,
                repeat: Infinity,
                ease: 'linear',
                times: [0, 0.25, 0.5, 0.75, 1]
            }}
            style={{
                width: dimension,
                height: dimension,
                border: `4px solid transparent`,
                borderTopColor: color,
                borderRightColor: color,
                boxShadow: `0 0 15px ${color}`
            }}
        />
    );

    const renderLoading = () => {
        switch (type) {
            case 'dots':
                return renderDots();
            case 'bars':
                return renderBars();
            case 'spinner':
                return renderSpinner();
            case 'squares':
            default:
                return renderSquares();
        }
    };

    return (
        <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
            {renderLoading()}
        </div>
    );
};

// Example usage showcase
export const RetroLoadingShowcase = () => {
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
                marginBottom: '40px',
                textAlign: 'center'
            }}>
                LOADING ANIMATIONS
            </h3>

            <div style={{ 
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '40px',
                maxWidth: '800px',
                margin: '0 auto'
            }}>
                {/* Squares */}
                <div style={{ textAlign: 'center' }}>
                    <RetroLoadingSpinner type="squares" color="var(--neon-cyan)" size="medium" />
                    <p style={{ 
                        marginTop: '15px',
                        fontFamily: 'VT323, monospace',
                        color: 'white',
                        fontSize: '18px'
                    }}>
                        SQUARES
                    </p>
                </div>

                {/* Dots */}
                <div style={{ textAlign: 'center' }}>
                    <RetroLoadingSpinner type="dots" color="var(--neon-pink)" size="medium" />
                    <p style={{ 
                        marginTop: '15px',
                        fontFamily: 'VT323, monospace',
                        color: 'white',
                        fontSize: '18px'
                    }}>
                        DOTS
                    </p>
                </div>

                {/* Bars */}
                <div style={{ textAlign: 'center' }}>
                    <RetroLoadingSpinner type="bars" color="var(--neon-green)" size="medium" />
                    <p style={{ 
                        marginTop: '15px',
                        fontFamily: 'VT323, monospace',
                        color: 'white',
                        fontSize: '18px'
                    }}>
                        BARS
                    </p>
                </div>

                {/* Spinner */}
                <div style={{ textAlign: 'center' }}>
                    <RetroLoadingSpinner type="spinner" color="var(--neon-yellow)" size="medium" />
                    <p style={{ 
                        marginTop: '15px',
                        fontFamily: 'VT323, monospace',
                        color: 'white',
                        fontSize: '18px'
                    }}>
                        SPINNER
                    </p>
                </div>
            </div>

            {/* Size variations */}
            <div style={{ 
                marginTop: '60px',
                textAlign: 'center',
                display: 'flex',
                gap: '30px',
                justifyContent: 'center',
                alignItems: 'center'
            }}>
                <div>
                    <RetroLoadingSpinner type="squares" color="var(--neon-purple)" size="small" />
                    <p style={{ 
                        marginTop: '10px',
                        fontFamily: 'VT323, monospace',
                        color: 'white',
                        fontSize: '14px'
                    }}>
                        SMALL
                    </p>
                </div>
                <div>
                    <RetroLoadingSpinner type="squares" color="var(--neon-purple)" size="medium" />
                    <p style={{ 
                        marginTop: '10px',
                        fontFamily: 'VT323, monospace',
                        color: 'white',
                        fontSize: '14px'
                    }}>
                        MEDIUM
                    </p>
                </div>
                <div>
                    <RetroLoadingSpinner type="squares" color="var(--neon-purple)" size="large" />
                    <p style={{ 
                        marginTop: '10px',
                        fontFamily: 'VT323, monospace',
                        color: 'white',
                        fontSize: '14px'
                    }}>
                        LARGE
                    </p>
                </div>
            </div>
        </div>
    );
};
