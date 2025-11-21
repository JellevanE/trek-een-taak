import React from 'react';
import { motion } from 'framer-motion';
import './showcase.css';

/**
 * RetroInput - Retro-styled text input with pixel border and glow effects
 * Inspired by the .task-input from inspiration.html
 */
export const RetroInput = ({
    value,
    onChange,
    placeholder = 'Enter text...',
    type = 'text',
    disabled = false,
    glowColor = 'var(--neon-cyan, #00ffff)',
    maxLength,
    onEnter,
    autoFocus = false
}) => {
    const [isFocused, setIsFocused] = React.useState(false);

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && onEnter) {
            onEnter(e);
        }
    };

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
            <input
                type={type}
                value={value}
                onChange={onChange}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                onKeyDown={handleKeyDown}
                placeholder={placeholder}
                disabled={disabled}
                maxLength={maxLength}
                autoFocus={autoFocus}
                style={{
                    width: '100%',
                    padding: '12px 16px',
                    background: 'var(--bg-dark, #0a0a0f)',
                    border: `2px solid ${isFocused ? glowColor : 'var(--dark-gray, #444)'}`,
                    color: 'var(--white, #ffffff)',
                    fontFamily: "'VT323', monospace",
                    fontSize: '20px',
                    outline: 'none',
                    transition: 'border-color 0.2s',
                    letterSpacing: '1px',
                    opacity: disabled ? 0.5 : 1,
                    cursor: disabled ? 'not-allowed' : 'text'
                }}
            />
            {isFocused && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    style={{
                        position: 'absolute',
                        right: '12px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        color: glowColor,
                        fontFamily: "'Press Start 2P', cursive",
                        fontSize: '10px',
                        animation: 'blink 1s infinite'
                    }}
                >
                    _
                </motion.div>
            )}
        </motion.div>
    );
};

// Textarea variant
export const RetroTextArea = ({
    value,
    onChange,
    placeholder = 'Enter text...',
    disabled = false,
    glowColor = 'var(--neon-cyan, #00ffff)',
    rows = 4,
    maxLength
}) => {
    const [isFocused, setIsFocused] = React.useState(false);

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
            <textarea
                value={value}
                onChange={onChange}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                placeholder={placeholder}
                disabled={disabled}
                rows={rows}
                maxLength={maxLength}
                style={{
                    width: '100%',
                    padding: '12px 16px',
                    background: 'var(--bg-dark, #0a0a0f)',
                    border: `2px solid ${isFocused ? glowColor : 'var(--dark-gray, #444)'}`,
                    color: 'var(--white, #ffffff)',
                    fontFamily: "'VT323', monospace",
                    fontSize: '20px',
                    outline: 'none',
                    transition: 'border-color 0.2s',
                    letterSpacing: '1px',
                    resize: 'vertical',
                    minHeight: '100px',
                    opacity: disabled ? 0.5 : 1,
                    cursor: disabled ? 'not-allowed' : 'text'
                }}
            />
        </motion.div>
    );
};

// Showcase component
export const RetroInputShowcase = () => {
    const [inputValue, setInputValue] = React.useState('');
    const [textAreaValue, setTextAreaValue] = React.useState('');
    const [passwordValue, setPasswordValue] = React.useState('');

    return (
        <div style={{ padding: '40px' }}>
            <h3 style={{ 
                fontFamily: "'Press Start 2P', cursive",
                color: 'var(--neon-cyan)',
                fontSize: '14px',
                marginBottom: '30px',
                textAlign: 'center'
            }}>
                RETRO INPUT FIELDS
            </h3>

            <div style={{ 
                display: 'flex', 
                flexDirection: 'column', 
                gap: '30px',
                maxWidth: '600px',
                margin: '0 auto'
            }}>
                {/* Standard Input */}
                <div>
                    <label style={{
                        display: 'block',
                        marginBottom: '10px',
                        fontFamily: "'Press Start 2P', cursive",
                        fontSize: '10px',
                        color: 'var(--neon-cyan)'
                    }}>
                        STANDARD INPUT
                    </label>
                    <RetroInput
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        placeholder="Enter quest name..."
                        glowColor="var(--neon-cyan)"
                    />
                    <p style={{
                        marginTop: '8px',
                        fontSize: '14px',
                        color: 'var(--muted, #888)'
                    }}>
                        Value: {inputValue || '(empty)'}
                    </p>
                </div>

                {/* Password Input */}
                <div>
                    <label style={{
                        display: 'block',
                        marginBottom: '10px',
                        fontFamily: "'Press Start 2P', cursive",
                        fontSize: '10px',
                        color: 'var(--neon-pink)'
                    }}>
                        PASSWORD INPUT
                    </label>
                    <RetroInput
                        type="password"
                        value={passwordValue}
                        onChange={(e) => setPasswordValue(e.target.value)}
                        placeholder="Enter password..."
                        glowColor="var(--neon-pink)"
                    />
                </div>

                {/* TextArea */}
                <div>
                    <label style={{
                        display: 'block',
                        marginBottom: '10px',
                        fontFamily: "'Press Start 2P', cursive",
                        fontSize: '10px',
                        color: 'var(--neon-green)'
                    }}>
                        TEXTAREA
                    </label>
                    <RetroTextArea
                        value={textAreaValue}
                        onChange={(e) => setTextAreaValue(e.target.value)}
                        placeholder="Enter quest description..."
                        glowColor="var(--neon-green)"
                        rows={4}
                    />
                    <p style={{
                        marginTop: '8px',
                        fontSize: '14px',
                        color: 'var(--muted, #888)'
                    }}>
                        Characters: {textAreaValue.length}
                    </p>
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
                    <RetroInput
                        value="Cannot edit this"
                        disabled
                        glowColor="var(--muted)"
                    />
                </div>

                {/* Different Colors */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '15px'
                }}>
                    <RetroInput
                        placeholder="Cyan glow"
                        glowColor="var(--neon-cyan)"
                    />
                    <RetroInput
                        placeholder="Pink glow"
                        glowColor="var(--neon-pink)"
                    />
                    <RetroInput
                        placeholder="Green glow"
                        glowColor="var(--neon-green)"
                    />
                    <RetroInput
                        placeholder="Yellow glow"
                        glowColor="var(--neon-yellow)"
                    />
                </div>
            </div>
        </div>
    );
};
