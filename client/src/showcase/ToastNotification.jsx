import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import './showcase.css';

/**
 * Toast - Retro-styled toast notification
 * Individual toast component
 */
const Toast = ({ id, message, type = 'info', onClose, duration = 3000 }) => {
    const [progress, setProgress] = React.useState(100);

    React.useEffect(() => {
        if (duration) {
            const startTime = Date.now();
            const timer = setInterval(() => {
                const elapsed = Date.now() - startTime;
                const remaining = Math.max(0, 100 - (elapsed / duration) * 100);
                setProgress(remaining);
                
                if (remaining === 0) {
                    clearInterval(timer);
                    onClose(id);
                }
            }, 16);

            return () => clearInterval(timer);
        }
    }, [duration, id, onClose]);

    const typeConfig = {
        success: {
            icon: '✅',
            color: 'var(--neon-green, #00ff00)',
            bg: 'rgba(0, 255, 0, 0.1)'
        },
        error: {
            icon: '❌',
            color: 'var(--neon-red, #ff0040)',
            bg: 'rgba(255, 0, 64, 0.1)'
        },
        warning: {
            icon: '⚠️',
            color: 'var(--neon-yellow, #ffff00)',
            bg: 'rgba(255, 255, 0, 0.1)'
        },
        info: {
            icon: 'ℹ️',
            color: 'var(--neon-cyan, #00ffff)',
            bg: 'rgba(0, 255, 255, 0.1)'
        }
    };

    const config = typeConfig[type];

    return (
        <motion.div
            layout
            initial={{ x: 400, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 400, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            style={{
                position: 'relative',
                width: '320px',
                background: 'var(--bg-secondary, #1a1a2e)',
                border: `2px solid ${config.color}`,
                borderRadius: '8px',
                padding: '16px',
                marginBottom: '12px',
                boxShadow: `
                    0 4px 12px rgba(0, 0, 0, 0.3),
                    0 0 20px ${config.color}40
                `,
                overflow: 'hidden'
            }}
        >
            {/* Content */}
            <div style={{ 
                display: 'flex', 
                alignItems: 'center',
                gap: '12px',
                position: 'relative',
                zIndex: 1
            }}>
                <span style={{ 
                    fontSize: '24px',
                    filter: `drop-shadow(0 0 8px ${config.color})`
                }}>
                    {config.icon}
                </span>
                <p style={{
                    fontFamily: "'VT323', monospace",
                    fontSize: '18px',
                    color: 'var(--white, #ffffff)',
                    flex: 1,
                    margin: 0,
                    letterSpacing: '0.5px'
                }}>
                    {message}
                </p>
                <motion.button
                    type="button"
                    onClick={() => onClose(id)}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    style={{
                        background: 'transparent',
                        border: 'none',
                        color: config.color,
                        fontSize: '20px',
                        cursor: 'pointer',
                        padding: '4px',
                        lineHeight: 1
                    }}
                >
                    ×
                </motion.button>
            </div>

            {/* Progress Bar */}
            {duration && (
                <motion.div
                    style={{
                        position: 'absolute',
                        bottom: 0,
                        left: 0,
                        height: '4px',
                        background: config.color,
                        width: `${progress}%`,
                        boxShadow: `0 0 10px ${config.color}`
                    }}
                    initial={{ width: '100%' }}
                />
            )}

            {/* Background glow */}
            <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: config.bg,
                pointerEvents: 'none',
                zIndex: 0
            }} />
        </motion.div>
    );
};

/**
 * ToastContainer - Container for managing multiple toasts
 */
export const ToastContainer = ({ toasts, onClose, position = 'top-right' }) => {
    const positions = {
        'top-right': { top: '20px', right: '20px' },
        'top-left': { top: '20px', left: '20px' },
        'bottom-right': { bottom: '20px', right: '20px' },
        'bottom-left': { bottom: '20px', left: '20px' },
        'top-center': { top: '20px', left: '50%', transform: 'translateX(-50%)' },
        'bottom-center': { bottom: '20px', left: '50%', transform: 'translateX(-50%)' }
    };

    return (
        <div style={{
            position: 'fixed',
            ...positions[position],
            zIndex: 9999,
            pointerEvents: 'none'
        }}>
            <div style={{ pointerEvents: 'auto' }}>
                <AnimatePresence>
                    {toasts.map((toast) => (
                        <Toast
                            key={toast.id}
                            {...toast}
                            onClose={onClose}
                        />
                    ))}
                </AnimatePresence>
            </div>
        </div>
    );
};

/**
 * useToast - Hook for managing toast notifications
 */
export const useToast = () => {
    const [toasts, setToasts] = React.useState([]);

    const addToast = React.useCallback((message, type = 'info', duration = 3000) => {
        const id = Date.now() + Math.random();
        setToasts(prev => [...prev, { id, message, type, duration }]);
        return id;
    }, []);

    const removeToast = React.useCallback((id) => {
        setToasts(prev => prev.filter(toast => toast.id !== id));
    }, []);

    const success = React.useCallback((message, duration) => 
        addToast(message, 'success', duration), [addToast]);
    
    const error = React.useCallback((message, duration) => 
        addToast(message, 'error', duration), [addToast]);
    
    const warning = React.useCallback((message, duration) => 
        addToast(message, 'warning', duration), [addToast]);
    
    const info = React.useCallback((message, duration) => 
        addToast(message, 'info', duration), [addToast]);

    return {
        toasts,
        addToast,
        removeToast,
        success,
        error,
        warning,
        info
    };
};

// Showcase component
export const ToastShowcase = () => {
    const toast = useToast();
    const [position, setPosition] = React.useState('top-right');

    return (
        <div style={{ padding: '40px' }}>
            <h3 style={{ 
                fontFamily: "'Press Start 2P', cursive",
                color: 'var(--neon-cyan)',
                fontSize: '14px',
                marginBottom: '30px',
                textAlign: 'center'
            }}>
                TOAST NOTIFICATIONS
            </h3>

            <div style={{ 
                display: 'flex', 
                flexDirection: 'column', 
                gap: '30px',
                maxWidth: '800px',
                margin: '0 auto'
            }}>
                {/* Toast Types */}
                <div>
                    <h4 style={{
                        fontFamily: "'Press Start 2P', cursive",
                        fontSize: '10px',
                        color: 'var(--neon-cyan)',
                        marginBottom: '15px'
                    }}>
                        NOTIFICATION TYPES
                    </h4>
                    <div style={{ 
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                        gap: '12px'
                    }}>
                        <button
                            type="button"
                            onClick={() => toast.success('Quest completed! +50 XP')}
                            style={{
                                padding: '12px 16px',
                                background: 'var(--neon-green)',
                                color: 'var(--bg-dark)',
                                border: 'none',
                                fontFamily: "'Press Start 2P', cursive",
                                fontSize: '10px',
                                cursor: 'pointer',
                                boxShadow: '0 0 10px rgba(0, 255, 0, 0.5)'
                            }}
                        >
                            SUCCESS
                        </button>
                        <button
                            type="button"
                            onClick={() => toast.error('Quest failed! Try again')}
                            style={{
                                padding: '12px 16px',
                                background: 'var(--neon-red)',
                                color: 'white',
                                border: 'none',
                                fontFamily: "'Press Start 2P', cursive",
                                fontSize: '10px',
                                cursor: 'pointer',
                                boxShadow: '0 0 10px rgba(255, 0, 64, 0.5)'
                            }}
                        >
                            ERROR
                        </button>
                        <button
                            type="button"
                            onClick={() => toast.warning('Quest expires in 5 minutes!')}
                            style={{
                                padding: '12px 16px',
                                background: 'var(--neon-yellow)',
                                color: 'var(--bg-dark)',
                                border: 'none',
                                fontFamily: "'Press Start 2P', cursive",
                                fontSize: '10px',
                                cursor: 'pointer',
                                boxShadow: '0 0 10px rgba(255, 255, 0, 0.5)'
                            }}
                        >
                            WARNING
                        </button>
                        <button
                            type="button"
                            onClick={() => toast.info('New quest available!')}
                            style={{
                                padding: '12px 16px',
                                background: 'var(--neon-cyan)',
                                color: 'var(--bg-dark)',
                                border: 'none',
                                fontFamily: "'Press Start 2P', cursive",
                                fontSize: '10px',
                                cursor: 'pointer',
                                boxShadow: '0 0 10px rgba(0, 255, 255, 0.5)'
                            }}
                        >
                            INFO
                        </button>
                    </div>
                </div>

                {/* Position Controls */}
                <div>
                    <h4 style={{
                        fontFamily: "'Press Start 2P', cursive",
                        fontSize: '10px',
                        color: 'var(--neon-cyan)',
                        marginBottom: '15px'
                    }}>
                        TOAST POSITION
                    </h4>
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(3, 1fr)',
                        gap: '8px',
                        maxWidth: '400px'
                    }}>
                        {['top-left', 'top-center', 'top-right', 
                          'bottom-left', 'bottom-center', 'bottom-right'].map((pos) => (
                            <button
                                key={pos}
                                type="button"
                                onClick={() => setPosition(pos)}
                                style={{
                                    padding: '8px',
                                    background: position === pos ? 'var(--neon-cyan)' : 'var(--bg-secondary)',
                                    color: position === pos ? 'var(--bg-dark)' : 'var(--white)',
                                    border: `2px solid ${position === pos ? 'var(--neon-cyan)' : 'var(--dark-gray)'}`,
                                    fontFamily: "'VT323', monospace",
                                    fontSize: '14px',
                                    cursor: 'pointer',
                                    textTransform: 'uppercase'
                                }}
                            >
                                {pos.replace('-', ' ')}
                            </button>
                        ))}
                    </div>
                    <p style={{
                        marginTop: '12px',
                        fontSize: '14px',
                        color: 'var(--muted)',
                        fontFamily: "'VT323', monospace"
                    }}>
                        Current: {position}
                    </p>
                </div>

                {/* Duration Controls */}
                <div>
                    <h4 style={{
                        fontFamily: "'Press Start 2P', cursive",
                        fontSize: '10px',
                        color: 'var(--neon-cyan)',
                        marginBottom: '15px'
                    }}>
                        CUSTOM DURATIONS
                    </h4>
                    <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                        <button
                            type="button"
                            onClick={() => toast.info('Quick message!', 1500)}
                            style={{
                                padding: '8px 16px',
                                background: 'var(--bg-secondary)',
                                color: 'var(--white)',
                                border: '2px solid var(--neon-cyan)',
                                fontFamily: "'Press Start 2P', cursive",
                                fontSize: '8px',
                                cursor: 'pointer'
                            }}
                        >
                            1.5s TOAST
                        </button>
                        <button
                            type="button"
                            onClick={() => toast.info('Standard duration', 3000)}
                            style={{
                                padding: '8px 16px',
                                background: 'var(--bg-secondary)',
                                color: 'var(--white)',
                                border: '2px solid var(--neon-cyan)',
                                fontFamily: "'Press Start 2P', cursive",
                                fontSize: '8px',
                                cursor: 'pointer'
                            }}
                        >
                            3s TOAST
                        </button>
                        <button
                            type="button"
                            onClick={() => toast.warning('Long message stays visible', 6000)}
                            style={{
                                padding: '8px 16px',
                                background: 'var(--bg-secondary)',
                                color: 'var(--white)',
                                border: '2px solid var(--neon-cyan)',
                                fontFamily: "'Press Start 2P', cursive",
                                fontSize: '8px',
                                cursor: 'pointer'
                            }}
                        >
                            6s TOAST
                        </button>
                        <button
                            type="button"
                            onClick={() => toast.info('This stays forever!', null)}
                            style={{
                                padding: '8px 16px',
                                background: 'var(--bg-secondary)',
                                color: 'var(--white)',
                                border: '2px solid var(--neon-pink)',
                                fontFamily: "'Press Start 2P', cursive",
                                fontSize: '8px',
                                cursor: 'pointer'
                            }}
                        >
                            PERSISTENT
                        </button>
                    </div>
                </div>

                {/* Stress Test */}
                <div>
                    <h4 style={{
                        fontFamily: "'Press Start 2P', cursive",
                        fontSize: '10px',
                        color: 'var(--neon-yellow)',
                        marginBottom: '15px'
                    }}>
                        STRESS TEST
                    </h4>
                    <button
                        type="button"
                        onClick={() => {
                            const types = ['success', 'error', 'warning', 'info'];
                            const messages = [
                                'Quest completed!',
                                'Level up!',
                                'New achievement!',
                                'Item collected!',
                                'Boss defeated!'
                            ];
                            for (let i = 0; i < 5; i++) {
                                setTimeout(() => {
                                    const type = types[Math.floor(Math.random() * types.length)];
                                    const message = messages[Math.floor(Math.random() * messages.length)];
                                    toast[type](message);
                                }, i * 200);
                            }
                        }}
                        style={{
                            padding: '12px 24px',
                            background: 'var(--neon-purple)',
                            color: 'white',
                            border: 'none',
                            fontFamily: "'Press Start 2P', cursive",
                            fontSize: '10px',
                            cursor: 'pointer',
                            boxShadow: '0 0 20px rgba(148, 0, 211, 0.5)'
                        }}
                    >
                        SPAM 5 TOASTS
                    </button>
                </div>
            </div>

            {/* Toast Container */}
            <ToastContainer 
                toasts={toast.toasts} 
                onClose={toast.removeToast}
                position={position}
            />
        </div>
    );
};
