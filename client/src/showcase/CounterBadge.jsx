import React from 'react';
import { motion } from 'framer-motion';
import './showcase.css';

/**
 * CounterBadge - Animated counter badge for quest counts
 * Inspired by the .task-count from inspiration.html
 */
export const CounterBadge = ({
    count = 0,
    color = 'var(--neon-cyan, #00ffff)',
    size = 'medium', // small, medium, large
    animated = true,
    maxDisplay = 99, // Show "99+" for values over this
    pulseOnChange = true
}) => {
    const [prevCount, setPrevCount] = React.useState(count);
    const [shouldPulse, setShouldPulse] = React.useState(false);

    React.useEffect(() => {
        if (pulseOnChange && count !== prevCount) {
            setShouldPulse(true);
            setTimeout(() => setShouldPulse(false), 600);
            setPrevCount(count);
        }
    }, [count, prevCount, pulseOnChange]);

    const sizes = {
        small: { 
            padding: '4px 8px', 
            fontSize: '10px',
            minWidth: '24px'
        },
        medium: { 
            padding: '6px 12px', 
            fontSize: '12px',
            minWidth: '32px'
        },
        large: { 
            padding: '8px 16px', 
            fontSize: '14px',
            minWidth: '40px'
        }
    };

    const sizeStyle = sizes[size];
    const displayValue = count > maxDisplay ? `${maxDisplay}+` : count;

    return (
        <motion.span
            animate={shouldPulse ? {
                scale: [1, 1.3, 1],
                rotate: [0, -5, 5, 0]
            } : {
                scale: 1,
                rotate: 0
            }}
            transition={{
                duration: 0.6,
                ease: [0.34, 1.56, 0.64, 1]
            }}
            style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: sizeStyle.padding,
                minWidth: sizeStyle.minWidth,
                background: color,
                color: 'var(--bg-dark, #0a0a0f)',
                fontFamily: "'Press Start 2P', cursive",
                fontSize: sizeStyle.fontSize,
                fontWeight: 'bold',
                borderRadius: '4px',
                boxShadow: `
                    0 0 10px ${color}80,
                    0 0 20px ${color}40,
                    inset 0 -2px 0 rgba(0, 0, 0, 0.3)
                `,
                textShadow: '1px 1px 0 rgba(0, 0, 0, 0.3)',
                border: `2px solid ${color}`,
                letterSpacing: '1px'
            }}
        >
            {animated && (
                <motion.span
                    key={count}
                    initial={{ y: -10, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ duration: 0.2 }}
                >
                    {displayValue}
                </motion.span>
            )}
            {!animated && displayValue}
        </motion.span>
    );
};

/**
 * StatCounter - Full stat display with label, useful for player stats
 */
export const StatCounter = ({
    label = 'QUESTS',
    count = 0,
    icon = '⚔️',
    color = 'var(--neon-cyan, #00ffff)',
    layout = 'horizontal' // horizontal or vertical
}) => {
    const isHorizontal = layout === 'horizontal';

    return (
        <div style={{
            display: 'flex',
            flexDirection: isHorizontal ? 'row' : 'column',
            alignItems: 'center',
            gap: isHorizontal ? '12px' : '8px',
            padding: '12px 16px',
            background: 'var(--bg-secondary, #1a1a2e)',
            border: `2px solid ${color}40`,
            borderRadius: '8px',
            minWidth: isHorizontal ? '150px' : '100px'
        }}>
            <div style={{
                fontSize: '24px',
                filter: `drop-shadow(0 0 8px ${color})`
            }}>
                {icon}
            </div>
            <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: isHorizontal ? 'flex-start' : 'center',
                gap: '4px'
            }}>
                <span style={{
                    fontFamily: "'Press Start 2P', cursive",
                    fontSize: '10px',
                    color: 'var(--muted, #888)',
                    letterSpacing: '1px'
                }}>
                    {label}
                </span>
                <CounterBadge 
                    count={count} 
                    color={color}
                    size="medium"
                />
            </div>
        </div>
    );
};

// Showcase component
export const CounterBadgeShowcase = () => {
    const [count1, setCount1] = React.useState(5);
    const [count2, setCount2] = React.useState(12);
    const [count3, setCount3] = React.useState(150);

    return (
        <div style={{ padding: '40px' }}>
            <h3 style={{ 
                fontFamily: "'Press Start 2P', cursive",
                color: 'var(--neon-cyan)',
                fontSize: '14px',
                marginBottom: '30px',
                textAlign: 'center'
            }}>
                COUNTER BADGES
            </h3>

            <div style={{ 
                display: 'flex', 
                flexDirection: 'column', 
                gap: '40px',
                maxWidth: '800px',
                margin: '0 auto'
            }}>
                {/* Interactive Demo */}
                <div style={{
                    background: 'var(--bg-secondary, #1a1a2e)',
                    padding: '30px',
                    borderRadius: '8px',
                    border: '2px solid var(--dark-gray)'
                }}>
                    <h4 style={{
                        fontFamily: "'Press Start 2P', cursive",
                        fontSize: '10px',
                        color: 'var(--neon-yellow)',
                        marginBottom: '20px'
                    }}>
                        INTERACTIVE DEMO
                    </h4>
                    
                    <div style={{ 
                        display: 'flex', 
                        gap: '20px',
                        flexWrap: 'wrap',
                        alignItems: 'center'
                    }}>
                        <CounterBadge count={count1} color="var(--neon-cyan)" />
                        <button
                            type="button"
                            onClick={() => setCount1(count1 + 1)}
                            style={{
                                padding: '8px 16px',
                                background: 'var(--neon-cyan)',
                                color: 'var(--bg-dark)',
                                border: 'none',
                                fontFamily: "'Press Start 2P', cursive",
                                fontSize: '10px',
                                cursor: 'pointer'
                            }}
                        >
                            +1
                        </button>
                        <button
                            type="button"
                            onClick={() => setCount1(Math.max(0, count1 - 1))}
                            style={{
                                padding: '8px 16px',
                                background: 'var(--neon-red)',
                                color: 'white',
                                border: 'none',
                                fontFamily: "'Press Start 2P', cursive",
                                fontSize: '10px',
                                cursor: 'pointer'
                            }}
                        >
                            -1
                        </button>
                        <button
                            type="button"
                            onClick={() => setCount1(0)}
                            style={{
                                padding: '8px 16px',
                                background: 'var(--dark-gray)',
                                color: 'white',
                                border: 'none',
                                fontFamily: "'Press Start 2P', cursive",
                                fontSize: '10px',
                                cursor: 'pointer'
                            }}
                        >
                            RESET
                        </button>
                    </div>
                </div>

                {/* Sizes */}
                <div>
                    <h4 style={{
                        fontFamily: "'Press Start 2P', cursive",
                        fontSize: '10px',
                        color: 'var(--neon-cyan)',
                        marginBottom: '15px'
                    }}>
                        DIFFERENT SIZES
                    </h4>
                    <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                        <CounterBadge count={5} size="small" color="var(--neon-cyan)" />
                        <CounterBadge count={5} size="medium" color="var(--neon-pink)" />
                        <CounterBadge count={5} size="large" color="var(--neon-green)" />
                    </div>
                </div>

                {/* Colors */}
                <div>
                    <h4 style={{
                        fontFamily: "'Press Start 2P', cursive",
                        fontSize: '10px',
                        color: 'var(--neon-cyan)',
                        marginBottom: '15px'
                    }}>
                        DIFFERENT COLORS
                    </h4>
                    <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
                        <CounterBadge count={count2} color="var(--neon-cyan)" />
                        <CounterBadge count={count2} color="var(--neon-pink)" />
                        <CounterBadge count={count2} color="var(--neon-green)" />
                        <CounterBadge count={count2} color="var(--neon-yellow)" />
                        <CounterBadge count={count2} color="var(--neon-orange)" />
                        <CounterBadge count={count2} color="var(--neon-purple)" />
                    </div>
                    <button
                        type="button"
                        onClick={() => setCount2(count2 + 1)}
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
                        INCREMENT ALL
                    </button>
                </div>

                {/* Max Display */}
                <div>
                    <h4 style={{
                        fontFamily: "'Press Start 2P', cursive",
                        fontSize: '10px',
                        color: 'var(--neon-cyan)',
                        marginBottom: '15px'
                    }}>
                        MAX DISPLAY (99+)
                    </h4>
                    <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                        <CounterBadge count={count3} color="var(--neon-red)" maxDisplay={99} />
                        <span style={{ fontSize: '14px', color: 'var(--muted)' }}>
                            Actual count: {count3}
                        </span>
                    </div>
                    <button
                        type="button"
                        onClick={() => setCount3(count3 + 10)}
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
                        +10
                    </button>
                </div>

                {/* StatCounter Component */}
                <div>
                    <h4 style={{
                        fontFamily: "'Press Start 2P', cursive",
                        fontSize: '10px',
                        color: 'var(--neon-cyan)',
                        marginBottom: '15px'
                    }}>
                        STAT COUNTERS
                    </h4>
                    <div style={{ 
                        display: 'grid', 
                        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                        gap: '15px'
                    }}>
                        <StatCounter 
                            label="ACTIVE" 
                            count={8} 
                            icon="⚔️" 
                            color="var(--neon-cyan)" 
                        />
                        <StatCounter 
                            label="COMPLETED" 
                            count={42} 
                            icon="✅" 
                            color="var(--neon-green)" 
                        />
                        <StatCounter 
                            label="FAILED" 
                            count={3} 
                            icon="💀" 
                            color="var(--neon-red)" 
                        />
                        <StatCounter 
                            label="LEVEL" 
                            count={12} 
                            icon="⭐" 
                            color="var(--neon-yellow)" 
                        />
                    </div>
                </div>

                {/* Vertical Layout */}
                <div>
                    <h4 style={{
                        fontFamily: "'Press Start 2P', cursive",
                        fontSize: '10px',
                        color: 'var(--neon-cyan)',
                        marginBottom: '15px'
                    }}>
                        VERTICAL LAYOUT
                    </h4>
                    <div style={{ display: 'flex', gap: '15px' }}>
                        <StatCounter 
                            label="XP" 
                            count={2450} 
                            icon="💎" 
                            color="var(--neon-purple)" 
                            layout="vertical"
                        />
                        <StatCounter 
                            label="STREAK" 
                            count={15} 
                            icon="🔥" 
                            color="var(--neon-orange)" 
                            layout="vertical"
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};
