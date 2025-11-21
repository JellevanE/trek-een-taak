import React from 'react';
import { motion } from 'framer-motion';
import './showcase.css';

/**
 * EmptyState - Retro-styled empty state component
 * Inspired by the .empty-state from inspiration.html
 */
export const EmptyState = ({
    message = 'NO QUESTS AVAILABLE',
    icon = '📭',
    subMessage,
    glitchEffect = true,
    pulseEffect = false,
    color = 'var(--muted, #888)'
}) => {
    const [showGlitch, setShowGlitch] = React.useState(false);

    React.useEffect(() => {
        if (glitchEffect) {
            const interval = setInterval(() => {
                setShowGlitch(true);
                setTimeout(() => setShowGlitch(false), 200);
            }, 5000);
            return () => clearInterval(interval);
        }
    }, [glitchEffect]);

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '60px 40px',
                textAlign: 'center',
                minHeight: '200px'
            }}
        >
            {/* Icon */}
            <motion.div
                animate={pulseEffect ? {
                    scale: [1, 1.1, 1],
                    opacity: [0.6, 1, 0.6]
                } : {}}
                transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: 'easeInOut'
                }}
                style={{
                    fontSize: '64px',
                    marginBottom: '20px',
                    filter: `drop-shadow(0 0 10px ${color})`
                }}
            >
                {icon}
            </motion.div>

            {/* Main Message */}
            <motion.h3
                animate={showGlitch ? {
                    x: [0, -2, 2, -2, 2, 0],
                    textShadow: [
                        'none',
                        '2px 0 var(--neon-red), -2px 0 var(--neon-cyan)',
                        '-2px 0 var(--neon-red), 2px 0 var(--neon-cyan)',
                        'none'
                    ]
                } : {}}
                transition={{ duration: 0.2 }}
                style={{
                    fontFamily: "'Press Start 2P', cursive",
                    fontSize: '12px',
                    color: color,
                    letterSpacing: '2px',
                    marginBottom: '12px',
                    textTransform: 'uppercase'
                }}
            >
                {message}
            </motion.h3>

            {/* Sub Message */}
            {subMessage && (
                <p style={{
                    fontFamily: "'VT323', monospace",
                    fontSize: '18px',
                    color: 'var(--muted, #888)',
                    maxWidth: '400px',
                    lineHeight: '1.5',
                    marginTop: '8px'
                }}>
                    {subMessage}
                </p>
            )}

            {/* Decorative line */}
            <motion.div
                initial={{ width: 0 }}
                animate={{ width: '200px' }}
                transition={{ delay: 0.3, duration: 0.5 }}
                style={{
                    height: '2px',
                    background: `linear-gradient(90deg, transparent, ${color}, transparent)`,
                    marginTop: '30px'
                }}
            />
        </motion.div>
    );
};

/**
 * LoadingState - Similar to empty state but for loading
 */
export const LoadingState = ({
    message = 'LOADING...',
    color = 'var(--neon-cyan, #00ffff)'
}) => {
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '60px 40px',
                minHeight: '200px'
            }}
        >
            {/* Animated dots */}
            <div style={{
                display: 'flex',
                gap: '12px',
                marginBottom: '30px'
            }}>
                {[0, 1, 2].map((i) => (
                    <motion.div
                        key={i}
                        animate={{
                            y: [0, -15, 0],
                            opacity: [0.3, 1, 0.3]
                        }}
                        transition={{
                            duration: 1,
                            repeat: Infinity,
                            delay: i * 0.2,
                            ease: 'easeInOut'
                        }}
                        style={{
                            width: '16px',
                            height: '16px',
                            background: color,
                            borderRadius: '2px',
                            boxShadow: `0 0 10px ${color}`
                        }}
                    />
                ))}
            </div>

            {/* Message */}
            <motion.h3
                animate={{
                    opacity: [0.5, 1, 0.5]
                }}
                transition={{
                    duration: 1.5,
                    repeat: Infinity,
                    ease: 'easeInOut'
                }}
                style={{
                    fontFamily: "'Press Start 2P', cursive",
                    fontSize: '12px',
                    color: color,
                    letterSpacing: '2px'
                }}
            >
                {message}
            </motion.h3>
        </motion.div>
    );
};

/**
 * ErrorState - Error variant of empty state
 */
export const ErrorState = ({
    message = 'ERROR OCCURRED',
    errorCode = '404',
    subMessage = 'Something went wrong. Please try again.',
    onRetry
}) => {
    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '60px 40px',
                textAlign: 'center',
                minHeight: '200px'
            }}
        >
            {/* Error Code */}
            <motion.div
                animate={{
                    rotate: [0, -5, 5, -5, 0]
                }}
                transition={{
                    duration: 0.5,
                    repeat: 3
                }}
                style={{
                    fontFamily: "'Press Start 2P', cursive",
                    fontSize: '48px',
                    color: 'var(--neon-red, #ff0040)',
                    marginBottom: '20px',
                    textShadow: `
                        0 0 10px var(--neon-red),
                        0 0 20px var(--neon-red)
                    `
                }}
            >
                {errorCode}
            </motion.div>

            {/* Message */}
            <h3 style={{
                fontFamily: "'Press Start 2P', cursive",
                fontSize: '14px',
                color: 'var(--neon-red)',
                letterSpacing: '2px',
                marginBottom: '12px'
            }}>
                {message}
            </h3>

            {/* Sub Message */}
            <p style={{
                fontFamily: "'VT323', monospace",
                fontSize: '18px',
                color: 'var(--muted, #888)',
                maxWidth: '400px',
                lineHeight: '1.5',
                marginTop: '8px',
                marginBottom: '30px'
            }}>
                {subMessage}
            </p>

            {/* Retry Button */}
            {onRetry && (
                <motion.button
                    type="button"
                    onClick={onRetry}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    style={{
                        padding: '12px 24px',
                        background: 'var(--neon-red)',
                        color: 'white',
                        border: '2px solid var(--neon-red)',
                        fontFamily: "'Press Start 2P', cursive",
                        fontSize: '10px',
                        cursor: 'pointer',
                        boxShadow: '0 0 20px rgba(255, 0, 64, 0.5)'
                    }}
                >
                    RETRY
                </motion.button>
            )}
        </motion.div>
    );
};

// Showcase component
export const EmptyStateShowcase = () => {
    const [showError, setShowError] = React.useState(false);
    const [showLoading, setShowLoading] = React.useState(false);

    return (
        <div style={{ padding: '40px' }}>
            <h3 style={{ 
                fontFamily: "'Press Start 2P', cursive",
                color: 'var(--neon-cyan)',
                fontSize: '14px',
                marginBottom: '30px',
                textAlign: 'center'
            }}>
                EMPTY & STATE COMPONENTS
            </h3>

            <div style={{ 
                display: 'flex', 
                flexDirection: 'column', 
                gap: '40px',
                maxWidth: '800px',
                margin: '0 auto'
            }}>
                {/* Basic Empty State */}
                <div style={{
                    background: 'var(--bg-secondary, #1a1a2e)',
                    border: '2px solid var(--dark-gray)',
                    borderRadius: '8px',
                    overflow: 'hidden'
                }}>
                    <EmptyState
                        message="NO QUESTS AVAILABLE"
                        icon="📭"
                        subMessage="Complete your current quests to unlock new ones!"
                    />
                </div>

                {/* Different Icons & Messages */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                    gap: '20px'
                }}>
                    <div style={{
                        background: 'var(--bg-secondary)',
                        border: '2px solid var(--dark-gray)',
                        borderRadius: '8px'
                    }}>
                        <EmptyState
                            message="NO RESULTS FOUND"
                            icon="🔍"
                            color="var(--neon-yellow)"
                            subMessage="Try adjusting your search"
                        />
                    </div>

                    <div style={{
                        background: 'var(--bg-secondary)',
                        border: '2px solid var(--dark-gray)',
                        borderRadius: '8px'
                    }}>
                        <EmptyState
                            message="ALL CLEAR!"
                            icon="✅"
                            color="var(--neon-green)"
                            subMessage="You've completed everything!"
                            pulseEffect
                        />
                    </div>

                    <div style={{
                        background: 'var(--bg-secondary)',
                        border: '2px solid var(--dark-gray)',
                        borderRadius: '8px'
                    }}>
                        <EmptyState
                            message="LOCKED"
                            icon="🔒"
                            color="var(--muted)"
                            subMessage="Complete previous quests"
                            glitchEffect={false}
                        />
                    </div>
                </div>

                {/* Loading State */}
                <div>
                    <h4 style={{
                        fontFamily: "'Press Start 2P', cursive",
                        fontSize: '10px',
                        color: 'var(--neon-cyan)',
                        marginBottom: '15px'
                    }}>
                        LOADING STATE
                    </h4>
                    <button
                        type="button"
                        onClick={() => {
                            setShowLoading(true);
                            setTimeout(() => setShowLoading(false), 3000);
                        }}
                        style={{
                            padding: '8px 16px',
                            background: 'var(--neon-cyan)',
                            color: 'var(--bg-dark)',
                            border: 'none',
                            fontFamily: "'Press Start 2P', cursive",
                            fontSize: '10px',
                            cursor: 'pointer',
                            marginBottom: '20px'
                        }}
                    >
                        SHOW LOADING (3s)
                    </button>
                    {showLoading && (
                        <div style={{
                            background: 'var(--bg-secondary)',
                            border: '2px solid var(--dark-gray)',
                            borderRadius: '8px'
                        }}>
                            <LoadingState message="FETCHING QUESTS..." />
                        </div>
                    )}
                </div>

                {/* Error State */}
                <div>
                    <h4 style={{
                        fontFamily: "'Press Start 2P', cursive",
                        fontSize: '10px',
                        color: 'var(--neon-red)',
                        marginBottom: '15px'
                    }}>
                        ERROR STATE
                    </h4>
                    <button
                        type="button"
                        onClick={() => setShowError(!showError)}
                        style={{
                            padding: '8px 16px',
                            background: 'var(--neon-red)',
                            color: 'white',
                            border: 'none',
                            fontFamily: "'Press Start 2P', cursive",
                            fontSize: '10px',
                            cursor: 'pointer',
                            marginBottom: '20px'
                        }}
                    >
                        {showError ? 'HIDE ERROR' : 'SHOW ERROR'}
                    </button>
                    {showError && (
                        <div style={{
                            background: 'var(--bg-secondary)',
                            border: '2px solid var(--neon-red)',
                            borderRadius: '8px'
                        }}>
                            <ErrorState
                                message="CONNECTION FAILED"
                                errorCode="500"
                                subMessage="Unable to reach the server. Please check your connection."
                                onRetry={() => alert('Retry clicked!')}
                            />
                        </div>
                    )}
                </div>

                {/* Different Error Codes */}
                <div>
                    <h4 style={{
                        fontFamily: "'Press Start 2P', cursive",
                        fontSize: '10px',
                        color: 'var(--neon-cyan)',
                        marginBottom: '15px'
                    }}>
                        COMMON ERROR CODES
                    </h4>
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                        gap: '15px'
                    }}>
                        <div style={{
                            background: 'var(--bg-secondary)',
                            border: '2px solid var(--dark-gray)',
                            borderRadius: '8px',
                            minHeight: '200px'
                        }}>
                            <ErrorState
                                errorCode="404"
                                message="NOT FOUND"
                                subMessage="Quest does not exist"
                            />
                        </div>
                        <div style={{
                            background: 'var(--bg-secondary)',
                            border: '2px solid var(--dark-gray)',
                            borderRadius: '8px',
                            minHeight: '200px'
                        }}>
                            <ErrorState
                                errorCode="403"
                                message="FORBIDDEN"
                                subMessage="Access denied"
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
