import { motion } from 'framer-motion';

export const AnimatedQuestCard = ({ children, isNew = false, isCompleting = false, ...props }) => (
    <motion.div
        initial={isNew ? { opacity: 0, y: -20, scale: 0.85 } : { opacity: 1, y: 0, scale: 1 }}
        animate={{ opacity: 1, y: 0, scale: isCompleting ? 1.05 : 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 24 }}
        {...props}
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
