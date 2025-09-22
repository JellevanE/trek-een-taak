import React, { useState, useEffect } from 'react';
import RegistrationWizard from './RegistrationWizard';

export default function Profile({ token, onLogin, onLogout }) {
    const [profile, setProfile] = useState({ display_name: '', avatar: '', class: '', bio: '' });
    const [editing, setEditing] = useState(false);
    const [loading, setLoading] = useState(false);
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showRegistrationWizard, setShowRegistrationWizard] = useState(false);

    useEffect(() => {
        if (!token) return;
        setLoading(true);
        fetch('/api/users/me', { headers: { Authorization: `Bearer ${token}` } })
            .then(r => r.json())
            .then(data => {
                setProfile(data.user.profile || {});
            })
            .catch(() => {})
            .finally(() => setLoading(false));
    }, [token]);

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
                setEditing(false);
            })
            .catch(() => {})
            .finally(() => setLoading(false));
    };

    const handleRegister = () => {
        if (!username || !password) return;
        setLoading(true);
        fetch('/api/users/register', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        })
            .then(r => r.json())
            .then(data => { if (data.token) onLogin(data.token); })
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
            .then(data => { if (data.token) onLogin(data.token); })
            .catch(() => {})
            .finally(() => setLoading(false));
    };

    if (!token) {
        // Show registration wizard
        if (showRegistrationWizard) {
            return (
                <RegistrationWizard
                    onSuccess={(token, user) => {
                        onLogin(token);
                        setShowRegistrationWizard(false);
                    }}
                    onCancel={() => setShowRegistrationWizard(false)}
                />
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
            <h3>Profile</h3>
            {loading ? <div>Loading...</div> : (
                <div>
                    {!editing ? (
                        <div>
                            <div><strong>Name:</strong> {profile.display_name || ''}</div>
                            <div><strong>Class:</strong> {profile.class || ''}</div>
                            <div><strong>Bio:</strong> {profile.bio || ''}</div>
                            <div style={{ marginTop: 8 }}>
                                <button onClick={() => setEditing(true)}>Edit</button>
                                <button onClick={() => { onLogout(); }}>Logout</button>
                            </div>
                        </div>
                    ) : (
                        <div>
                            <div>
                                <label>Name</label>
                                <input value={profile.display_name || ''} onChange={e => setProfile(p => ({ ...p, display_name: e.target.value }))} />
                            </div>
                            <div>
                                <label>Class</label>
                                <input value={profile.class || ''} onChange={e => setProfile(p => ({ ...p, class: e.target.value }))} />
                            </div>
                            <div>
                                <label>Bio</label>
                                <textarea value={profile.bio || ''} onChange={e => setProfile(p => ({ ...p, bio: e.target.value }))} />
                            </div>
                            <div style={{ marginTop: 8 }}>
                                <button onClick={handleSave} disabled={loading}>Save</button>
                                <button onClick={() => setEditing(false)}>Cancel</button>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
