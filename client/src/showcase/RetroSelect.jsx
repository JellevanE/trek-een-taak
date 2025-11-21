import React from 'react';
import { motion } from 'framer-motion';
import './showcase.css';

/**
 * RetroSelect - Retro-styled dropdown/select component
 * Inspired by the .priority-select from inspiration.html
 */
export const RetroSelect = ({
    value,
    onChange,
    options = [],
    placeholder = 'Select...',
    disabled = false,
    glowColor = 'var(--neon-cyan, #00ffff)',
    size = 'medium' // small, medium, large
}) => {
    const [isFocused, setIsFocused] = React.useState(false);

    const sizes = {
        small: { padding: '8px 16px', fontSize: '16px' },
        medium: { padding: '12px 16px', fontSize: '20px' },
        large: { padding: '16px 20px', fontSize: '24px' }
    };

    const sizeStyle = sizes[size];

    return (
        <motion.div
            animate={{
                boxShadow: isFocused 
                    ? `0 0 10px ${glowColor}, 0 0 20px ${glowColor}40`
                    : '0 0 0px transparent'
            }}
            transition={{ duration: 0.2 }}
            style={{
                position: 'relative',
                width: '100%'
            }}
        >
            <select
                value={value}
                onChange={onChange}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                disabled={disabled}
                style={{
                    width: '100%',
                    padding: sizeStyle.padding,
                    background: 'var(--bg-dark, #0a0a0f)',
                    border: `2px solid ${isFocused ? glowColor : 'var(--dark-gray, #444)'}`,
                    color: value ? 'var(--white, #ffffff)' : 'var(--gray, #888)',
                    fontFamily: "'VT323', monospace",
                    fontSize: sizeStyle.fontSize,
                    outline: 'none',
                    cursor: disabled ? 'not-allowed' : 'pointer',
                    transition: 'border-color 0.2s',
                    letterSpacing: '1px',
                    appearance: 'none',
                    backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='${encodeURIComponent(glowColor)}' stroke-width='2' stroke-linecap='square' stroke-linejoin='miter'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e")`,
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'right 12px center',
                    backgroundSize: '20px',
                    paddingRight: '40px',
                    opacity: disabled ? 0.5 : 1
                }}
            >
                {placeholder && (
                    <option value="" disabled>
                        {placeholder}
                    </option>
                )}
                {options.map((option, index) => (
                    <option 
                        key={index} 
                        value={option.value}
                        style={{
                            background: 'var(--bg-dark)',
                            color: 'var(--white)'
                        }}
                    >
                        {option.label}
                    </option>
                ))}
            </select>
        </motion.div>
    );
};

// Showcase component
export const RetroSelectShowcase = () => {
    const [priority, setPriority] = React.useState('');
    const [difficulty, setDifficulty] = React.useState('medium');
    const [category, setCategory] = React.useState('');

    const priorityOptions = [
        { value: 'low', label: '⬇️ LOW PRIORITY' },
        { value: 'medium', label: '➡️ MEDIUM PRIORITY' },
        { value: 'high', label: '⬆️ HIGH PRIORITY' },
        { value: 'urgent', label: '🔥 URGENT' }
    ];

    const difficultyOptions = [
        { value: 'easy', label: '😊 EASY' },
        { value: 'medium', label: '😐 MEDIUM' },
        { value: 'hard', label: '😰 HARD' },
        { value: 'expert', label: '💀 EXPERT' }
    ];

    const categoryOptions = [
        { value: 'work', label: '💼 WORK' },
        { value: 'personal', label: '🏠 PERSONAL' },
        { value: 'health', label: '💪 HEALTH' },
        { value: 'learning', label: '📚 LEARNING' },
        { value: 'social', label: '👥 SOCIAL' }
    ];

    return (
        <div style={{ padding: '40px' }}>
            <h3 style={{ 
                fontFamily: "'Press Start 2P', cursive",
                color: 'var(--neon-cyan)',
                fontSize: '14px',
                marginBottom: '30px',
                textAlign: 'center'
            }}>
                RETRO SELECT DROPDOWNS
            </h3>

            <div style={{ 
                display: 'flex', 
                flexDirection: 'column', 
                gap: '30px',
                maxWidth: '600px',
                margin: '0 auto'
            }}>
                {/* Priority Select */}
                <div>
                    <label style={{
                        display: 'block',
                        marginBottom: '10px',
                        fontFamily: "'Press Start 2P', cursive",
                        fontSize: '10px',
                        color: 'var(--neon-cyan)'
                    }}>
                        SELECT PRIORITY
                    </label>
                    <RetroSelect
                        value={priority}
                        onChange={(e) => setPriority(e.target.value)}
                        options={priorityOptions}
                        placeholder="Choose priority level..."
                        glowColor="var(--neon-cyan)"
                    />
                    <p style={{
                        marginTop: '8px',
                        fontSize: '14px',
                        color: 'var(--muted, #888)'
                    }}>
                        Selected: {priority || '(none)'}
                    </p>
                </div>

                {/* Difficulty Select */}
                <div>
                    <label style={{
                        display: 'block',
                        marginBottom: '10px',
                        fontFamily: "'Press Start 2P', cursive",
                        fontSize: '10px',
                        color: 'var(--neon-pink)'
                    }}>
                        SELECT DIFFICULTY
                    </label>
                    <RetroSelect
                        value={difficulty}
                        onChange={(e) => setDifficulty(e.target.value)}
                        options={difficultyOptions}
                        glowColor="var(--neon-pink)"
                    />
                    <p style={{
                        marginTop: '8px',
                        fontSize: '14px',
                        color: 'var(--muted, #888)'
                    }}>
                        Selected: {difficulty}
                    </p>
                </div>

                {/* Category Select */}
                <div>
                    <label style={{
                        display: 'block',
                        marginBottom: '10px',
                        fontFamily: "'Press Start 2P', cursive",
                        fontSize: '10px',
                        color: 'var(--neon-green)'
                    }}>
                        SELECT CATEGORY
                    </label>
                    <RetroSelect
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        options={categoryOptions}
                        placeholder="Choose a category..."
                        glowColor="var(--neon-green)"
                    />
                </div>

                {/* Different Sizes */}
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '15px'
                }}>
                    <label style={{
                        fontFamily: "'Press Start 2P', cursive",
                        fontSize: '10px',
                        color: 'var(--neon-yellow)'
                    }}>
                        DIFFERENT SIZES
                    </label>
                    
                    <RetroSelect
                        options={[
                            { value: '1', label: 'SMALL SIZE' },
                            { value: '2', label: 'OPTION 2' }
                        ]}
                        size="small"
                        placeholder="Small..."
                        glowColor="var(--neon-yellow)"
                    />
                    
                    <RetroSelect
                        options={[
                            { value: '1', label: 'MEDIUM SIZE' },
                            { value: '2', label: 'OPTION 2' }
                        ]}
                        size="medium"
                        placeholder="Medium..."
                        glowColor="var(--neon-cyan)"
                    />
                    
                    <RetroSelect
                        options={[
                            { value: '1', label: 'LARGE SIZE' },
                            { value: '2', label: 'OPTION 2' }
                        ]}
                        size="large"
                        placeholder="Large..."
                        glowColor="var(--neon-pink)"
                    />
                </div>

                {/* Disabled State */}
                <div>
                    <label style={{
                        display: 'block',
                        marginBottom: '10px',
                        fontFamily: "'Press Start 2P', cursive",
                        fontSize: '10px',
                        color: 'var(--muted)'
                    }}>
                        DISABLED STATE
                    </label>
                    <RetroSelect
                        value="locked"
                        options={[
                            { value: 'locked', label: '🔒 LOCKED' }
                        ]}
                        disabled
                        glowColor="var(--muted)"
                    />
                </div>
            </div>
        </div>
    );
};
