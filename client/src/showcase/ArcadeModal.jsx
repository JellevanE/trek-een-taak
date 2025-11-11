import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import './showcase.css';

/**
 * ArcadeModal - Modal dialog with arcade cabinet styling
 * Inspired by the arcade aesthetic with corner decorations
 */
export const ArcadeModal = ({
    isOpen = false,
    onClose,
    title = 'NOTIFICATION',
    children,
    showCorners = true,
    borderColor = 'var(--neon-cyan, #00ffff)'
}) => {
    // Close on escape key
    React.useEffect(() => {
        const handleEscape = (e) => {
            if (e.key === 'Escape' && isOpen && onClose) {
                onClose();
            }
        };
        
        if (isOpen) {
            document.addEventListener('keydown', handleEscape);
            return () => document.removeEventListener('keydown', handleEscape);
        }
    }, [isOpen, onClose]);

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    className="arcade-modal-backdrop"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: 'rgba(0, 0, 0, 0.85)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 1000,
                        backdropFilter: 'blur(4px)'
                    }}
                >
                    <motion.div
                        className="arcade-modal"
                        initial={{ scale: 0, rotate: -10 }}
                        animate={{ scale: 1, rotate: 0 }}
                        exit={{ scale: 0, rotate: 10 }}
                        transition={{
                            type: 'spring',
                            stiffness: 300,
                            damping: 20
                        }}
                        onClick={(e) => e.stopPropagation()}
                        style={{
                            position: 'relative',
                            maxWidth: '600px',
                            width: '90%',
                            background: 'var(--bg-secondary, #1a1a2e)',
                            border: `4px solid ${borderColor}`,
                            boxShadow: `
                                0 0 20px ${borderColor}80,
                                0 0 40px ${borderColor}50,
                                inset 0 0 20px ${borderColor}20
                            `,
                            padding: '30px'
                        }}
                    >
                        {/* Corner decorations */}
                        {showCorners && (
                            <>
                                <span className="arcade-corner" style={{ top: '10px', left: '10px' }}>+</span>
                                <span className="arcade-corner" style={{ top: '10px', right: '10px' }}>+</span>
                                <span className="arcade-corner" style={{ bottom: '10px', left: '10px' }}>+</span>
                                <span className="arcade-corner" style={{ bottom: '10px', right: '10px' }}>+</span>
                            </>
                        )}

                        {/* Close button */}
                        {onClose && (
                            <motion.button
                                type="button"
                                onClick={onClose}
                                whileHover={{ scale: 1.1, rotate: 90 }}
                                whileTap={{ scale: 0.9 }}
                                style={{
                                    position: 'absolute',
                                    top: '15px',
                                    right: '15px',
                                    background: 'transparent',
                                    border: `2px solid ${borderColor}`,
                                    color: borderColor,
                                    width: '32px',
                                    height: '32px',
                                    fontSize: '18px',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontFamily: "'Press Start 2P', cursive",
                                    boxShadow: `0 0 10px ${borderColor}50`
                                }}
                            >
                                ×
                            </motion.button>
                        )}

                        {/* Title */}
                        <motion.h2
                            initial={{ y: -20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.1 }}
                            style={{
                                fontFamily: "'Press Start 2P', cursive",
                                fontSize: '16px',
                                color: borderColor,
                                textAlign: 'center',
                                marginBottom: '20px',
                                textShadow: `0 0 10px ${borderColor}`
                            }}
                        >
                            [ {title} ]
                        </motion.h2>

                        {/* Content */}
                        <motion.div
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.2 }}
                            style={{
                                color: 'white',
                                fontFamily: 'VT323, monospace',
                                fontSize: '20px',
                                lineHeight: '1.6'
                            }}
                        >
                            {children}
                        </motion.div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

// Example usage showcase
export const ArcadeModalShowcase = () => {
    const [modal1Open, setModal1Open] = React.useState(false);
    const [modal2Open, setModal2Open] = React.useState(false);
    const [modal3Open, setModal3Open] = React.useState(false);

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
                ARCADE MODALS
            </h3>

            <div style={{ 
                display: 'flex', 
                gap: '20px', 
                justifyContent: 'center',
                flexWrap: 'wrap'
            }}>
                <button
                    type="button"
                    onClick={() => setModal1Open(true)}
                    style={{
                        padding: '16px 24px',
                        background: 'var(--neon-cyan)',
                        border: '3px solid var(--neon-cyan)',
                        color: 'var(--bg-dark)',
                        fontFamily: "'Press Start 2P', cursive",
                        fontSize: '10px',
                        cursor: 'pointer',
                        boxShadow: '0 0 20px rgba(0, 255, 255, 0.5)'
                    }}
                >
                    CYAN MODAL
                </button>

                <button
                    type="button"
                    onClick={() => setModal2Open(true)}
                    style={{
                        padding: '16px 24px',
                        background: 'var(--neon-pink)',
                        border: '3px solid var(--neon-pink)',
                        color: 'white',
                        fontFamily: "'Press Start 2P', cursive",
                        fontSize: '10px',
                        cursor: 'pointer',
                        boxShadow: '0 0 20px rgba(255, 0, 255, 0.5)'
                    }}
                >
                    PINK MODAL
                </button>

                <button
                    type="button"
                    onClick={() => setModal3Open(true)}
                    style={{
                        padding: '16px 24px',
                        background: 'var(--neon-yellow)',
                        border: '3px solid var(--neon-yellow)',
                        color: 'var(--bg-dark)',
                        fontFamily: "'Press Start 2P', cursive",
                        fontSize: '10px',
                        cursor: 'pointer',
                        boxShadow: '0 0 20px rgba(255, 255, 0, 0.5)'
                    }}
                >
                    YELLOW MODAL
                </button>
            </div>

            {/* Modal examples */}
            <ArcadeModal
                isOpen={modal1Open}
                onClose={() => setModal1Open(false)}
                title="QUEST COMPLETED"
                borderColor="var(--neon-cyan)"
            >
                <div style={{ textAlign: 'center' }}>
                    <p>🎮 Congratulations, brave warrior!</p>
                    <p style={{ marginTop: '15px' }}>
                        You have successfully completed the quest
                        and earned <strong style={{ color: 'var(--neon-yellow)' }}>+500 XP</strong>!
                    </p>
                    <motion.div
                        animate={{ scale: [1, 1.1, 1] }}
                        transition={{ duration: 1, repeat: Infinity }}
                        style={{ 
                            marginTop: '20px',
                            fontSize: '48px'
                        }}
                    >
                        ⭐
                    </motion.div>
                </div>
            </ArcadeModal>

            <ArcadeModal
                isOpen={modal2Open}
                onClose={() => setModal2Open(false)}
                title="WARNING"
                borderColor="var(--neon-pink)"
            >
                <div style={{ textAlign: 'center' }}>
                    <p>⚠️ Are you sure you want to delete this quest?</p>
                    <p style={{ marginTop: '15px', color: 'var(--muted, #888)' }}>
                        This action cannot be undone!
                    </p>
                    <div style={{ 
                        marginTop: '25px',
                        display: 'flex',
                        gap: '15px',
                        justifyContent: 'center'
                    }}>
                        <button
                            type="button"
                            onClick={() => setModal2Open(false)}
                            style={{
                                padding: '12px 20px',
                                background: 'var(--neon-green)',
                                border: '2px solid var(--neon-green)',
                                color: 'var(--bg-dark)',
                                fontFamily: "'Press Start 2P', cursive",
                                fontSize: '10px',
                                cursor: 'pointer'
                            }}
                        >
                            CANCEL
                        </button>
                        <button
                            type="button"
                            onClick={() => setModal2Open(false)}
                            style={{
                                padding: '12px 20px',
                                background: 'var(--neon-red)',
                                border: '2px solid var(--neon-red)',
                                color: 'white',
                                fontFamily: "'Press Start 2P', cursive",
                                fontSize: '10px',
                                cursor: 'pointer'
                            }}
                        >
                            DELETE
                        </button>
                    </div>
                </div>
            </ArcadeModal>

            <ArcadeModal
                isOpen={modal3Open}
                onClose={() => setModal3Open(false)}
                title="LEVEL UP"
                borderColor="var(--neon-yellow)"
                showCorners={false}
            >
                <div style={{ textAlign: 'center' }}>
                    <motion.div
                        animate={{
                            rotate: [0, 360],
                            scale: [1, 1.2, 1]
                        }}
                        transition={{
                            duration: 2,
                            repeat: Infinity,
                            ease: 'easeInOut'
                        }}
                        style={{ fontSize: '64px', marginBottom: '20px' }}
                    >
                        👑
                    </motion.div>
                    <p style={{ fontSize: '24px', color: 'var(--neon-yellow)' }}>
                        LEVEL 10 ACHIEVED!
                    </p>
                    <p style={{ marginTop: '15px' }}>
                        You are now a <strong>Quest Master</strong>
                    </p>
                </div>
            </ArcadeModal>
        </div>
    );
};
