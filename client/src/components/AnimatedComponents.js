import { useSpring, animated, config } from '@react-spring/web';

/**
 * AnimatedQuestCard - Wraps quest cards with entrance/exit animations
 * 
 * Usage:
 * <AnimatedQuestCard isNew={spawnQuests[quest.id]}>
 *   {your existing quest card JSX}
 * </AnimatedQuestCard>
 */
export const AnimatedQuestCard = ({ children, isNew = false, isCompleting = false }) => {
    // Entrance animation for new quests
    const entranceSpring = useSpring({
        from: { 
            opacity: 0, 
            transform: 'scale(0.85) translateY(-20px)',
        },
        to: { 
            opacity: 1, 
            transform: 'scale(1) translateY(0px)',
        },
        config: config.wobbly, // Bouncy, playful
    });

    // Celebration animation for completing
    const celebrationSpring = useSpring({
        from: { scale: 1 },
        to: { scale: isCompleting ? 1.05 : 1 },
        config: config.gentle,
    });

    // Combine animations
    const style = {
        ...entranceSpring,
        ...(isCompleting && {
            transform: entranceSpring.transform.to(
                t => `${t} scale(${celebrationSpring.scale.get()})`
            )
        })
    };

    return <animated.div style={style}>{children}</animated.div>;
};

/**
 * AnimatedProgressBar - Spring-based progress bar fill
 * 
 * Usage:
 * <AnimatedProgressBar percent={questProgress} color={progressColor(questProgress)} />
 */
export const AnimatedProgressBar = ({ percent = 0, color = '#00d4ff' }) => {
    const spring = useSpring({
        width: `${percent}%`,
        background: color,
        config: config.molasses, // Slow and smooth
    });

    return (
        <div className="quest-progress-bar" style={{ 
            height: '10px', 
            background: 'rgba(255,255,255,0.05)', 
            borderRadius: '999px', 
            overflow: 'hidden',
            position: 'relative',
        }}>
            <animated.div 
                style={{
                    ...spring,
                    height: '100%',
                    borderRadius: '999px',
                }}
            />
        </div>
    );
};

/**
 * AnimatedToast - Toast notification with spring entrance/exit
 * 
 * Usage in your useToasts hook:
 * <AnimatedToast message={toast.msg} type={toast.type} onDismiss={() => ...} />
 */
export const AnimatedToast = ({ message, type = 'info', onDismiss }) => {
    const spring = useSpring({
        from: { 
            opacity: 0, 
            transform: 'translateX(100%) scale(0.8)',
        },
        to: { 
            opacity: 1, 
            transform: 'translateX(0%) scale(1)',
        },
        config: config.gentle,
    });

    const typeColors = {
        success: '#22c55e',
        error: '#ef4444',
        info: '#3b82f6',
    };

    return (
        <animated.div
            style={{
                ...spring,
                padding: '12px 16px',
                marginBottom: '8px',
                borderRadius: '8px',
                background: 'rgba(0,0,0,0.85)',
                border: `2px solid ${typeColors[type] || typeColors.info}`,
                color: 'white',
                cursor: 'pointer',
                boxShadow: `0 4px 12px rgba(0,0,0,0.3), 0 0 20px ${typeColors[type]}40`,
            }}
            onClick={onDismiss}
        >
            {message}
        </animated.div>
    );
};

/**
 * AnimatedLevelUp - Celebratory animation for level ups
 * 
 * Usage when level increases:
 * {showLevelUp && <AnimatedLevelUp level={playerStats.level} onComplete={() => setShowLevelUp(false)} />}
 */
export const AnimatedLevelUp = ({ level, onComplete }) => {
    const spring = useSpring({
        from: { 
            scale: 0.5, 
            opacity: 0,
            rotate: -180,
        },
        to: async (next) => {
            // Bounce in
            await next({ scale: 1.2, opacity: 1, rotate: 0 });
            // Settle
            await next({ scale: 1 });
            // Wait
            await new Promise(resolve => setTimeout(resolve, 1500));
            // Fade out
            await next({ opacity: 0, scale: 0.8 });
            onComplete?.();
        },
        config: config.wobbly,
    });

    return (
        <animated.div
            style={{
                ...spring,
                position: 'fixed',
                top: '50%',
                left: '50%',
                transform: spring.scale.to(s => `translate(-50%, -50%) scale(${s}) rotate(${spring.rotate.get()}deg)`),
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
        </animated.div>
    );
};

/**
 * AnimatedCollapse - Smooth accordion animation for side quests
 * 
 * Usage:
 * <AnimatedCollapse isOpen={!collapsedMap[quest.id]}>
 *   {side quest list}
 * </AnimatedCollapse>
 */
export const AnimatedCollapse = ({ children, isOpen }) => {
    const spring = useSpring({
        height: isOpen ? 'auto' : 0,
        opacity: isOpen ? 1 : 0,
        config: config.gentle,
    });

    return (
        <animated.div
            style={{
                ...spring,
                overflow: 'hidden',
            }}
        >
            {children}
        </animated.div>
    );
};

/**
 * AnimatedXPGain - Floating +XP indicator
 * 
 * Usage when XP is gained:
 * <AnimatedXPGain amount={50} />
 */
export const AnimatedXPGain = ({ amount, color = '#fbbf24' }) => {
    const spring = useSpring({
        from: { 
            opacity: 1, 
            transform: 'translateY(0px) scale(0.8)',
        },
        to: async (next) => {
            await next({ transform: 'translateY(-40px) scale(1.2)', opacity: 1 });
            await next({ opacity: 0 });
        },
        config: config.slow,
    });

    return (
        <animated.div
            style={{
                ...spring,
                position: 'absolute',
                top: '50%',
                left: '50%',
                fontSize: '20px',
                fontWeight: 'bold',
                color: color,
                textShadow: `0 0 10px ${color}, 0 2px 5px rgba(0,0,0,0.5)`,
                pointerEvents: 'none',
                zIndex: 100,
            }}
        >
            +{amount} XP
        </animated.div>
    );
};
