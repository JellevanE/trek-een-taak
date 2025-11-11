import React from 'react';
import { motion } from 'framer-motion';
import { PixelButtonShowcase } from './PixelButton.jsx';
import { GlitchTextShowcase } from './GlitchText.jsx';
import { PowerUpShowcase } from './PowerUpEffect.jsx';
import { CRTOverlayShowcase } from './CRTOverlay.jsx';
import { HealthBarShowcase } from './HealthBar.jsx';
import { RetroLoadingShowcase } from './RetroLoadingSpinner.jsx';
import { ArcadeModalShowcase } from './ArcadeModal.jsx';
import { RetroInputShowcase } from './RetroInput.jsx';
import { RetroSelectShowcase } from './RetroSelect.jsx';
import { CounterBadgeShowcase } from './CounterBadge.jsx';
import { EmptyStateShowcase } from './EmptyState.jsx';
import { ToastShowcase } from './ToastNotification.jsx';
import './showcase.css';

/**
 * ShowcasePage - Main page showcasing all retro gaming components
 * 
 * To use this:
 * 1. Temporarily import in App.js
 * 2. Navigate to /showcase or render conditionally
 * 3. Remove import when done exploring
 * 
 * This does NOT affect your production app!
 */
export const ShowcasePage = () => {
    const [activeSection, setActiveSection] = React.useState('all');

    const sections = [
        { id: 'all', label: 'ALL', component: null },
        { id: 'buttons', label: 'BUTTONS', component: PixelButtonShowcase },
        { id: 'inputs', label: 'INPUTS', component: RetroInputShowcase },
        { id: 'selects', label: 'SELECTS', component: RetroSelectShowcase },
        { id: 'text', label: 'TEXT', component: GlitchTextShowcase },
        { id: 'badges', label: 'BADGES', component: CounterBadgeShowcase },
        { id: 'effects', label: 'EFFECTS', component: PowerUpShowcase },
        { id: 'overlay', label: 'CRT', component: CRTOverlayShowcase },
        { id: 'bars', label: 'BARS', component: HealthBarShowcase },
        { id: 'loading', label: 'LOADING', component: RetroLoadingShowcase },
        { id: 'modals', label: 'MODALS', component: ArcadeModalShowcase },
        { id: 'empty', label: 'EMPTY', component: EmptyStateShowcase },
        { id: 'toasts', label: 'TOASTS', component: ToastShowcase }
    ];

    const renderSection = (Section, index) => (
        <motion.div
            key={index}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            style={{
                background: 'var(--bg-secondary, #1a1a2e)',
                border: '2px solid var(--dark-gray, #444)',
                borderRadius: '8px',
                overflow: 'hidden',
                marginBottom: '20px'
            }}
        >
            <Section />
        </motion.div>
    );

    return (
        <div style={{
            minHeight: '100vh',
            background: 'var(--bg-dark, #0a0a0f)',
            padding: '40px 20px'
        }}>
            {/* Header */}
            <motion.div
                initial={{ opacity: 0, y: -50 }}
                animate={{ opacity: 1, y: 0 }}
                style={{
                    textAlign: 'center',
                    marginBottom: '40px'
                }}
            >
                <h1 style={{
                    fontFamily: "'Press Start 2P', cursive",
                    fontSize: '32px',
                    color: 'var(--neon-cyan, #00ffff)',
                    textShadow: `
                        0 0 10px var(--neon-cyan),
                        0 0 20px var(--neon-cyan),
                        0 0 30px var(--neon-cyan)
                    `,
                    marginBottom: '10px'
                }}>
                    [ RETRO ARCADE ]
                </h1>
                <p style={{
                    fontFamily: 'VT323, monospace',
                    fontSize: '20px',
                    color: 'var(--muted, #888)',
                    marginTop: '10px'
                }}>
                    React 19 + Framer Motion Component Showcase
                </p>
                <p style={{
                    fontFamily: 'VT323, monospace',
                    fontSize: '18px',
                    color: 'var(--neon-yellow, #ffff00)',
                    marginTop: '10px'
                }}>
                    ⚠️ Not part of main app - Safe to explore!
                </p>
            </motion.div>

            {/* Navigation */}
            <div style={{
                display: 'flex',
                gap: '10px',
                justifyContent: 'center',
                flexWrap: 'wrap',
                marginBottom: '40px',
                maxWidth: '800px',
                margin: '0 auto 40px'
            }}>
                {sections.map((section) => (
                    <motion.button
                        key={section.id}
                        type="button"
                        onClick={() => setActiveSection(section.id)}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        style={{
                            padding: '12px 20px',
                            background: activeSection === section.id 
                                ? 'var(--neon-cyan, #00ffff)' 
                                : 'var(--bg-secondary, #1a1a2e)',
                            color: activeSection === section.id 
                                ? 'var(--bg-dark, #0a0a0f)' 
                                : 'white',
                            border: `2px solid var(--neon-cyan, #00ffff)`,
                            fontFamily: "'Press Start 2P', cursive",
                            fontSize: '10px',
                            cursor: 'pointer',
                            boxShadow: activeSection === section.id 
                                ? '0 0 20px rgba(0, 255, 255, 0.5)' 
                                : 'none',
                            transition: 'all 0.2s'
                        }}
                    >
                        {section.label}
                    </motion.button>
                ))}
            </div>

            {/* Content */}
            <div style={{
                maxWidth: '1200px',
                margin: '0 auto'
            }}>
                {activeSection === 'all' ? (
                    sections
                        .filter(s => s.component)
                        .map((section, index) => renderSection(section.component, index))
                ) : (
                    (() => {
                        const section = sections.find(s => s.id === activeSection);
                        return section && section.component ? renderSection(section.component, 0) : null;
                    })()
                )}
            </div>

            {/* Footer */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                style={{
                    textAlign: 'center',
                    marginTop: '60px',
                    padding: '30px',
                    borderTop: '2px solid var(--dark-gray, #444)',
                    color: 'var(--muted, #888)',
                    fontFamily: 'VT323, monospace',
                    fontSize: '18px'
                }}
            >
                <p>🎮 Built with React 19 + Framer Motion</p>
                <p style={{ marginTop: '10px' }}>
                    Copy any component you like into your quest board!
                </p>
                <p style={{ marginTop: '20px', fontSize: '14px', color: 'var(--dark-gray, #444)' }}>
                    See showcase/README.md for usage instructions
                </p>
            </motion.div>
        </div>
    );
};

export default ShowcasePage;
