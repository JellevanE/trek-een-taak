import React, { useState } from 'react';
import { useSpring, animated, config } from '@react-spring/web';

/**
 * SimpleSpringDemo - A minimal example showing React Spring basics
 * 
 * Add this to your App.js temporarily to test React Spring is working:
 * 
 * import { SimpleSpringDemo } from './components/SimpleSpringDemo';
 * 
 * // Somewhere in your JSX:
 * <SimpleSpringDemo />
 */
export const SimpleSpringDemo = () => {
    const [isActive, setIsActive] = useState(false);

    // Define the spring animation
    const spring = useSpring({
        transform: isActive ? 'scale(1.2) rotate(5deg)' : 'scale(1) rotate(0deg)',
        backgroundColor: isActive ? '#a78bfa' : '#3b82f6',
        config: config.wobbly, // Makes it bouncy!
    });

    return (
        <div style={{ padding: '40px', textAlign: 'center' }}>
            <h3>React Spring Test</h3>
            <animated.div
                onClick={() => setIsActive(!isActive)}
                style={{
                    ...spring,
                    width: '200px',
                    height: '200px',
                    margin: '20px auto',
                    borderRadius: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontSize: '24px',
                    cursor: 'pointer',
                    boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
                }}
            >
                Click Me!
            </animated.div>
            <p style={{ color: 'var(--muted)', fontSize: '14px' }}>
                {isActive ? '🎉 Spring animation active!' : '👆 Click the box'}
            </p>
        </div>
    );
};

/**
 * ProgressBarDemo - Shows how spring-based progress feels
 */
export const ProgressBarDemo = () => {
    const [progress, setProgress] = useState(0);

    const spring = useSpring({
        width: `${progress}%`,
        config: config.molasses, // Slow and smooth
    });

    const addProgress = () => {
        setProgress(Math.min(100, progress + 20));
    };

    const reset = () => {
        setProgress(0);
    };

    return (
        <div style={{ padding: '40px' }}>
            <h3>Spring Progress Bar</h3>
            <div
                style={{
                    width: '100%',
                    height: '20px',
                    background: 'rgba(255,255,255,0.1)',
                    borderRadius: '10px',
                    overflow: 'hidden',
                    marginBottom: '20px',
                }}
            >
                <animated.div
                    style={{
                        ...spring,
                        height: '100%',
                        background: 'linear-gradient(90deg, #00d4ff, #9b5cff)',
                        borderRadius: '10px',
                    }}
                />
            </div>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                <button onClick={addProgress} className="btn-primary">
                    Add Progress
                </button>
                <button onClick={reset} className="btn-ghost">
                    Reset
                </button>
            </div>
            <p style={{ color: 'var(--muted)', fontSize: '14px', marginTop: '10px' }}>
                Notice how smoothly the bar fills? That's React Spring physics!
            </p>
        </div>
    );
};

/**
 * ToastDemo - Shows animated toast notifications
 */
export const ToastDemo = () => {
    const [toasts, setToasts] = useState([]);

    const addToast = (type) => {
        const id = Date.now();
        const messages = {
            success: '✅ Quest completed!',
            error: '❌ Something went wrong',
            info: 'ℹ️ Here\'s some info',
        };

        setToasts([...toasts, { id, type, msg: messages[type] }]);

        // Auto-dismiss after 3 seconds
        setTimeout(() => {
            setToasts((current) => current.filter((t) => t.id !== id));
        }, 3000);
    };

    return (
        <div style={{ padding: '40px' }}>
            <h3>Animated Toasts</h3>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                <button onClick={() => addToast('success')} className="btn-primary">
                    Success
                </button>
                <button onClick={() => addToast('error')} className="btn-danger">
                    Error
                </button>
                <button onClick={() => addToast('info')} className="btn-ghost">
                    Info
                </button>
            </div>

            <div
                style={{
                    position: 'fixed',
                    top: '80px',
                    right: '20px',
                    zIndex: 9999,
                    maxWidth: '300px',
                }}
            >
                {toasts.map((toast) => (
                    <Toast key={toast.id} {...toast} />
                ))}
            </div>
        </div>
    );
};

const Toast = ({ type, msg }) => {
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

    const colors = {
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
                background: 'rgba(0,0,0,0.9)',
                border: `2px solid ${colors[type]}`,
                color: 'white',
                boxShadow: `0 4px 12px rgba(0,0,0,0.3), 0 0 20px ${colors[type]}40`,
            }}
        >
            {msg}
        </animated.div>
    );
};

/**
 * All-in-one Demo Component
 * Shows all examples in one place for easy testing
 */
export const AllSpringDemos = () => {
    return (
        <div style={{ marginTop: '40px', marginBottom: '40px' }}>
            <div
                style={{
                    maxWidth: '800px',
                    margin: '0 auto',
                    padding: '20px',
                    background: 'rgba(255,255,255,0.02)',
                    borderRadius: '12px',
                    border: '1px solid rgba(255,255,255,0.05)',
                }}
            >
                <h2 style={{ textAlign: 'center', marginBottom: '30px' }}>
                    🎪 React Spring Demos
                </h2>
                <SimpleSpringDemo />
                <hr style={{ margin: '40px 0', border: '1px solid rgba(255,255,255,0.1)' }} />
                <ProgressBarDemo />
                <hr style={{ margin: '40px 0', border: '1px solid rgba(255,255,255,0.1)' }} />
                <ToastDemo />
            </div>
        </div>
    );
};
