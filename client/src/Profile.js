import React, { useState, useEffect } from 'react';

const RegistrationWizard = React.lazy(() => import('./RegistrationWizard'));

export default function Profile({ token, onLogin, onLogout, onClose }) {
    const [profile, setProfile] = useState({ display_name: '', avatar: '', class: '', bio: '' });
    const [rpg, setRpg] = useState(null);
    const [editing, setEditing] = useState(false);
    const [loading, setLoading] = useState(false);
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showRegistrationWizard, setShowRegistrationWizard] = useState(false);
    const [saved, setSaved] = useState(false);

    useEffect(() => {
        if (!token) {
            setRpg(null);
            return;
        }

        let cancelled = false;
        const defaultProfile = { display_name: '', avatar: '', class: '', bio: '' };

        const loadProfile = async () => {
            setLoading(true);
            try {
                const res = await fetch('/api/users/me', { headers: { Authorization: `Bearer ${token}` } });
                let payload = null;
                try {
                    payload = await res.json();
                } catch (err) {
                    payload = null;
                }

                if (!res.ok) {
                    if (res.status === 401 && typeof onLogout === 'function') {
                        onLogout();
                    }
                    const message = payload && payload.error ? payload.error : `Failed to load profile (${res.status})`;
                    throw new Error(message);
                }

                if (!payload || !payload.user) {
                    throw new Error('Profile payload missing user');
                }

                if (!cancelled) {
                    setProfile(payload.user.profile || defaultProfile);
                    setRpg(payload.user.rpg || null);
                }
            } catch (error) {
                console.error('Error fetching profile:', error);
                if (!cancelled) {
                    setProfile(defaultProfile);
                    setRpg(null);
                }
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        };

        loadProfile();
        return () => { cancelled = true; };
    }, [token, onLogout]);

    const handleSave = () => {
        if (!token) return;
        setLoading(true);
        fetch('/api/users/me', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify(profile)
        })
            .then(r => r.json())
            .then(data => {
                setProfile(data.user.profile || {});
                setRpg(data.user.rpg || rpg);
                setEditing(false);
                setSaved(true);
                setTimeout(() => setSaved(false), 2000);
            })
            .catch(() => {})
            .finally(() => setLoading(false));
    };

    const handleLogin = () => {
        if (!username || !password) return;
        setLoading(true);
        fetch('/api/users/login', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        })
            .then(r => r.json())
            .then(data => {
                if (data.token) {
                    if (data.user && data.user.rpg) setRpg(data.user.rpg);
                    onLogin(data.token, data.user);
                }
            })
            .catch(() => {})
            .finally(() => setLoading(false));
    };

    if (!token) {
        // Show registration wizard
        if (showRegistrationWizard) {
            return (
                <React.Suspense fallback={<div className="profile-box">Loading registration…</div>}>
                    <RegistrationWizard
                        onSuccess={(token, user) => {
                            if (user && user.rpg) setRpg(user.rpg);
                            onLogin(token, user);
                            setShowRegistrationWizard(false);
                        }}
                        onCancel={() => setShowRegistrationWizard(false)}
                    />
                </React.Suspense>
            );
        }

        // Show simple login form
        return (
            <div className="profile-box">
                <h3>Sign In</h3>
                <div className="login-form">
                    <input 
                        placeholder="username" 
                        value={username} 
                        onChange={e => setUsername(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleLogin()}
                    />
                    <input 
                        placeholder="password" 
                        type="password" 
                        value={password} 
                        onChange={e => setPassword(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleLogin()}
                    />
                    <button onClick={handleLogin} disabled={loading} className="btn-primary">
                        {loading ? 'Signing In...' : 'Sign In'}
                    </button>
                </div>
                <div className="auth-divider">
                    <span>Don't have an account?</span>
                </div>
                <button 
                    onClick={() => setShowRegistrationWizard(true)} 
                    className="btn-ghost btn-full-width"
                    disabled={loading}
                >
                    Create Account
                </button>
            </div>
        );
    }

    return (
        <div className="profile-box">
            <button onClick={onClose} className="close-button">X</button>
            {saved && <div className="saved-message">Saved!</div>}
            <h3>Profile</h3>
            {loading ? <div className="spinner"></div> : (
                <div>
                    {!editing ? (
                        <div>
                            <div className="profile-header">
                                <div className="avatar-placeholder">{profile.display_name ? profile.display_name.charAt(0).toUpperCase() : 'U'}</div>
                                <div><strong>Name:</strong> {profile.display_name || ''}</div>
                            </div>
                            <div><strong>Class:</strong> {profile.class || ''}</div>
                            <div><strong>Bio:</strong> {profile.bio || ''}</div>
                            {rpg && (
                                <div className="profile-rpg-stats" style={{marginTop:12}}>
                                    <div style={{marginBottom:4}}><strong>Level:</strong> {rpg.level}</div>
                                    <div style={{fontSize:12, color:'var(--text-muted)'}}>
                                        {rpg.xp_into_level} / {rpg.xp_for_level} XP toward next level
                                    </div>
                                    <div style={{marginTop:6, height:6, borderRadius:4, background:'var(--border-soft, rgba(255,255,255,0.12))', overflow:'hidden'}}>
                                        <div style={{width: `${Math.max(0, Math.min(100, Math.round((rpg.xp_progress || 0) * 100)))}%`, height:'100%', background:'linear-gradient(90deg, #6dd5fa, #2980b9)'}} />
                                    </div>
                                    <div style={{marginTop:6, fontSize:11, color:'var(--text-muted)'}}>
                                        Last daily bonus: {rpg.last_daily_reward_at ? rpg.last_daily_reward_at : '—'}
                                    </div>
                                </div>
                            )}
                            <div style={{ marginTop: 8 }}>
                                <button onClick={() => setEditing(true)} className="btn-ghost">Edit</button>
                                <button onClick={() => { setRpg(null); onLogout(); }} className="btn-ghost">Logout</button>
                            </div>
                        </div>
                    ) : (
                        <div className="profile-edit-form">
                            <div className="form-group">
                                <label>Name</label>
                                <input value={profile.display_name || ''} onChange={e => setProfile(p => ({ ...p, display_name: e.target.value }))} />
                            </div>
                            <div className="form-group">
                                <label>Class</label>
                                <input value={profile.class || ''} onChange={e => setProfile(p => ({ ...p, class: e.target.value }))} />
                            </div>
                            <div className="form-group">
                                <label>Bio</label>
                                <textarea value={profile.bio || ''} onChange={e => setProfile(p => ({ ...p, bio: e.target.value }))} />
                            </div>
                            <div className="form-actions">
                                <button onClick={() => setEditing(false)} className="btn-ghost">Cancel</button>
                                <button onClick={handleSave} disabled={loading} className="btn-primary">Save</button>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
