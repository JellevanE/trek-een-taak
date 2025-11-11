import React from 'react';
import { THEME_PROFILES } from '.';
import './theme-preview.css';

const PREVIEW_STATES = [
    { id: 'active', label: 'Active Quest', className: 'quest started', progress: 42, status: 'In progress' },
    { id: 'completed', label: 'Completed Quest', className: 'quest completed glow', progress: 100, status: 'Completed' },
    { id: 'editing', label: 'Editing', className: 'quest selected', progress: 68, status: 'Editing' },
    { id: 'dragging', label: 'Dragging', className: 'quest dragging', progress: 15, status: 'Reordering' },
    { id: 'pulsing', label: 'Pulsing', className: 'quest pulse', progress: 55, status: 'Status ping' },
    { id: 'spawning', label: 'Spawning', className: 'quest spawn', progress: 5, status: 'New arrival' }
];

const buildStateClass = (className = '') => ['quest-card-preview', className].filter(Boolean).join(' ');

export const ThemePreviewPage = ({
    currentThemeId,
    themeLabel,
    toggleTheme,
    soundVolume,
    setSoundVolume,
    soundFxMeta
}) => {
    const handleExit = () => {
        if (typeof window !== 'undefined') {
            window.history.replaceState({}, '', '/');
            window.location.assign('/');
        }
    };

    return (
        <div className="theme-preview-wrapper">
            <header className="theme-preview-header">
                <div>
                    <p className="theme-preview-eyebrow">Theme audit route</p>
                    <h1>Quest Board Theme Preview</h1>
                    <p className="theme-preview-subtitle">
                        Verify every quest state (active, completed, editing, dragging, glowing, pulsing) before shipping theme tokens.
                    </p>
                </div>
                <div className="theme-preview-actions">
                    <button className="btn-ghost" onClick={handleExit}>
                        ← Back to board
                    </button>
                    <button className="btn-ghost" onClick={toggleTheme}>
                        Toggle theme (current: {themeLabel})
                    </button>
                    <label className="theme-audio-control theme-audio-control-inline" htmlFor="theme-preview-sound">
                        <span>FX {soundVolume}%</span>
                        <input
                            id="theme-preview-sound"
                            type="range"
                            min="0"
                            max="100"
                            value={soundVolume}
                            onChange={(event) => setSoundVolume(Number(event.target.value))}
                        />
                    </label>
                </div>
            </header>
            <section className="theme-preview-meta">
                <div>
                    <h2>Theme snapshot instructions</h2>
                    <ul>
                        <li>Load this page and capture screenshots per theme for Percy/Chromatic uploads.</li>
                        <li>Confirm reduced-motion preference removes glow/pulse + mutes the soundtrack.</li>
                        <li>Use the FX slider to validate volume persistence (0-100%).</li>
                    </ul>
                </div>
                <div>
                    <h2>Sound FX requirements</h2>
                    <p>
                        Formats: {(soundFxMeta?.formats || ['audio/webm', 'audio/mpeg']).join(', ')} · Max file size: {soundFxMeta?.maxFileSizeKb ?? 50}kb per clip.
                    </p>
                    <p className="theme-preview-note">
                        Provide WebM + MP3 fallbacks and respect reduced-motion → mute automatically.
                    </p>
                </div>
            </section>
            <section className="theme-preview-grid">
                {Object.values(THEME_PROFILES).map((profile) => (
                    <article key={profile.id} className="theme-preview-column" data-theme-id={profile.id}>
                        <div className="theme-preview-column-header">
                            <h3>{profile.label}</h3>
                            <p>{profile.appearance === 'light' ? 'Light appearance' : 'Dark appearance'}</p>
                        </div>
                        <div className="theme-preview-state-grid">
                            {PREVIEW_STATES.map((state) => (
                                <div key={state.id} className={buildStateClass(state.className)} data-theme-card={profile.id}>
                                    <div className="theme-preview-state-meta">
                                        <p className="theme-preview-state-label">{state.label}</p>
                                        <p className="theme-preview-state-status">{state.status}</p>
                                    </div>
                                    <div className="quest-progress-bar">
                                        <div
                                            className="quest-progress-fill"
                                            style={{ width: `${state.progress}%` }}
                                        />
                                    </div>
                                    <div className="theme-preview-actions-row">
                                        <button className="btn-start btn-small" type="button">Start</button>
                                        <button className="btn-complete btn-small" type="button">Complete</button>
                                        <span className="theme-preview-progress">{state.progress}%</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </article>
                ))}
            </section>
            <footer className="theme-preview-footer">
                <p>Route: /themes · Current theme: {currentThemeId}</p>
                <p>Run `npm test -- ThemePreview` to refresh snapshot coverage.</p>
            </footer>
        </div>
    );
};

export default ThemePreviewPage;
