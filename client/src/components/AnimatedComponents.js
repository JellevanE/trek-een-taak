import { useEffect } from 'react';
import { AnimatePresence, motion, useAnimation } from 'framer-motion';

export const AnimatedQuestCard = ({ children, isNew = false, isCompleting = false }) => (
    <motion.div
        layout
        initial={isNew ? { opacity: 0, y: -20, scale: 0.85 } : { opacity: 1, y: 0, scale: 1 }}
        animate={{ opacity: 1, y: 0, scale: isCompleting ? 1.05 : 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 24 }}
    >
        {children}
    </motion.div>
);

export const AnimatedProgressBar = ({
    percent = 0,
    color = '#00d4ff',
    className = 'quest-progress-bar',
    style = {},
    ariaProps = {},
    children = null
}) => (
    <div
        className={className}
        style={{
            height: '10px',
            background: 'rgba(255,255,255,0.05)',
            borderRadius: '999px',
            overflow: 'hidden',
            position: 'relative',
            ...style
        }}
        {...ariaProps}
    >
        <motion.div
            layout
            style={{
                height: '100%',
                borderRadius: '999px'
            }}
            animate={{ width: `${percent}%`, backgroundColor: color }}
            transition={{ duration: 0.35, ease: 'easeInOut' }}
        />
        {children}
    </div>
);

export const AnimatedToast = ({ message, type = 'info', onDismiss }) => {
    const typeColors = {
        success: '#22c55e',
        error: '#ef4444',
        info: '#3b82f6',
    };

    return (
        <motion.div
            layout
            initial={{ opacity: 0, x: 72, scale: 0.85 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 64, scale: 0.85 }}
            transition={{ type: 'spring', stiffness: 320, damping: 24 }}
            style={{
                background: 'rgba(0,0,0,0.85)',
                color: 'white',
                padding: '12px 18px',
                borderRadius: '12px',
                marginBottom: '12px',
                border: `1px solid ${typeColors[type] ?? typeColors.info}`,
                boxShadow: `0 10px 30px rgba(0,0,0,0.35), 0 0 25px ${(typeColors[type] ?? typeColors.info)}33`,
                cursor: 'pointer'
            }}
            onClick={onDismiss}
        >
            {message}
        </motion.div>
    );
};

export const AnimatedLevelUp = ({ level, onComplete }) => {
    const controls = useAnimation();

    useEffect(() => {
        let mounted = true;
        const runSequence = async () => {
            await controls.start({ scale: 1.2, opacity: 1, rotate: 0 });
            await controls.start({ scale: 1 });
            await new Promise((resolve) => setTimeout(resolve, 1500));
            await controls.start({ opacity: 0, scale: 0.8 });
            if (mounted) onComplete?.();
        };
        runSequence();
        return () => {
            mounted = false;
        };
    }, [controls, onComplete]);

    return (
        <motion.div
            initial={{ scale: 0.5, opacity: 0, rotate: -180 }}
            animate={controls}
            transition={{ type: 'spring', stiffness: 180, damping: 20 }}
            style={{
                position: 'fixed',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                zIndex: 9999,
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                padding: '32px 48px',
                borderRadius: '16px',
                fontSize: '32px',
                fontWeight: 'bold',
                color: 'white',
                boxShadow: '0 20px 60px rgba(0,0,0,0.5), 0 0 40px rgba(102,126,234,0.6)',
                textShadow: '0 2px 10px rgba(0,0,0,0.3)',
            }}
        >
            🎉 Level {level}! 🎉
        </motion.div>
    );
};

export const AnimatedCollapse = ({ children, isOpen }) => (
    <motion.div
        layout
        initial={false}
        animate={{ height: isOpen ? 'auto' : 0, opacity: isOpen ? 1 : 0 }}
        transition={{ duration: 0.25, ease: 'easeInOut' }}
        style={{ overflow: 'hidden' }}
    >
        {children}
    </motion.div>
);

export const AnimatedXPGain = ({ amount, color = '#fbbf24' }) => (
    <AnimatePresence>
        <motion.div
            initial={{ opacity: 1, y: 0, scale: 0.8 }}
            animate={{ y: -40, scale: 1.2, opacity: [1, 1, 0] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.2, ease: 'easeOut' }}
            style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                fontSize: '20px',
                fontWeight: 'bold',
                color,
                textShadow: `0 0 10px ${color}, 0 2px 5px rgba(0,0,0,0.5)`,
                pointerEvents: 'none',
                zIndex: 100,
            }}
        >
            +{amount} XP
        </motion.div>
    </AnimatePresence>
);
