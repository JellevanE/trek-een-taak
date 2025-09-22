import React, { useState } from 'react';

// Simple progress indicator component
function ProgressIndicator({ currentStep, totalSteps }) {
    return (
        <div className="progress-indicator">
            <div className="progress-bar">
                <div 
                    className="progress-fill" 
                    style={{ width: `${(currentStep / totalSteps) * 100}%` }}
                />
            </div>
            <div className="progress-text">
                Step {currentStep} of {totalSteps}
            </div>
        </div>
    );
}

// Account details step component
function AccountDetailsStep({ formData, setFormData, onNext, loading }) {
    const [errors, setErrors] = useState({});
    const [showPassword, setShowPassword] = useState(false);

    const validateField = (name, value) => {
        const newErrors = { ...errors };
        
        switch (name) {
            case 'username':
                if (!value.trim()) {
                    newErrors.username = 'Username is required';
                } else if (value.length < 3) {
                    newErrors.username = 'Username must be at least 3 characters';
                } else if (value.length > 20) {
                    newErrors.username = 'Username must be less than 20 characters';
                } else if (!/^[a-zA-Z0-9_]+$/.test(value)) {
                    newErrors.username = 'Username can only contain letters, numbers, and underscores';
                } else {
                    delete newErrors.username;
                }
                break;
                
            case 'password':
                if (!value) {
                    newErrors.password = 'Password is required';
                } else if (value.length < 6) {
                    newErrors.password = 'Password must be at least 6 characters';
                } else {
                    delete newErrors.password;
                    // Also validate confirm password if it exists
                    if (formData.confirmPassword && value !== formData.confirmPassword) {
                        newErrors.confirmPassword = 'Passwords do not match';
                    } else if (formData.confirmPassword) {
                        delete newErrors.confirmPassword;
                    }
                }
                break;
                
            case 'confirmPassword':
                if (!value) {
                    newErrors.confirmPassword = 'Please confirm your password';
                } else if (value !== formData.password) {
                    newErrors.confirmPassword = 'Passwords do not match';
                } else {
                    delete newErrors.confirmPassword;
                }
                break;
                
            case 'email':
                // Email is optional, but if provided must be valid
                if (value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
                    newErrors.email = 'Please enter a valid email address';
                } else {
                    delete newErrors.email;
                }
                break;
                
            default:
                break;
        }
        
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        
        // Real-time validation
        setTimeout(() => validateField(name, value), 300);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        
        // Validate all fields
        const fields = ['username', 'password', 'confirmPassword'];
        if (formData.email) fields.push('email');
        
        let isValid = true;
        fields.forEach(field => {
            if (!validateField(field, formData[field])) {
                isValid = false;
            }
        });

        if (isValid) {
            onNext();
        }
    };

    return (
        <div className="registration-step">
            <div className="step-header">
                <h2>Create Your Account</h2>
                <p>Choose a username and secure password to get started</p>
            </div>
            
            <form onSubmit={handleSubmit} className="registration-form">
                <div className="form-group">
                    <label htmlFor="username">Username *</label>
                    <input
                        type="text"
                        id="username"
                        name="username"
                        value={formData.username}
                        onChange={handleChange}
                        className={errors.username ? 'error' : ''}
                        placeholder="Enter your username"
                        required
                        autoComplete="username"
                    />
                    {errors.username && <div className="error-message">{errors.username}</div>}
                </div>

                <div className="form-group">
                    <label htmlFor="email">Email (Optional)</label>
                    <input
                        type="email"
                        id="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        className={errors.email ? 'error' : ''}
                        placeholder="Enter your email"
                        autoComplete="email"
                    />
                    {errors.email && <div className="error-message">{errors.email}</div>}
                </div>

                <div className="form-group">
                    <label htmlFor="password">Password *</label>
                    <div className="password-input-container">
                        <input
                            type={showPassword ? 'text' : 'password'}
                            id="password"
                            name="password"
                            value={formData.password}
                            onChange={handleChange}
                            className={errors.password ? 'error' : ''}
                            placeholder="Enter your password"
                            required
                            autoComplete="new-password"
                        />
                        <button
                            type="button"
                            className="password-toggle"
                            onClick={() => setShowPassword(!showPassword)}
                            aria-label={showPassword ? 'Hide password' : 'Show password'}
                        >
                            {showPassword ? '👁️' : '👁️‍🗨️'}
                        </button>
                    </div>
                    {errors.password && <div className="error-message">{errors.password}</div>}
                    
                    {/* Simple password strength indicator */}
                    {formData.password && (
                        <div className="password-strength">
                            <div className={`strength-meter ${
                                formData.password.length >= 8 ? 'strong' : 
                                formData.password.length >= 6 ? 'medium' : 'weak'
                            }`}>
                                <div className="strength-fill" />
                            </div>
                            <div className="strength-text">
                                {formData.password.length >= 8 ? 'Strong' : 
                                 formData.password.length >= 6 ? 'Good' : 'Weak'}
                            </div>
                        </div>
                    )}
                </div>

                <div className="form-group">
                    <label htmlFor="confirmPassword">Confirm Password *</label>
                    <input
                        type={showPassword ? 'text' : 'password'}
                        id="confirmPassword"
                        name="confirmPassword"
                        value={formData.confirmPassword}
                        onChange={handleChange}
                        className={errors.confirmPassword ? 'error' : ''}
                        placeholder="Confirm your password"
                        required
                        autoComplete="new-password"
                    />
                    {errors.confirmPassword && <div className="error-message">{errors.confirmPassword}</div>}
                </div>

                <div className="form-actions">
                    <button 
                        type="submit" 
                        className="btn-primary"
                        disabled={loading || Object.keys(errors).length > 0}
                    >
                        {loading ? 'Creating Account...' : 'Create Account'}
                    </button>
                </div>
            </form>
        </div>
    );
}

// Profile setup step component
function ProfileSetupStep({ formData, setFormData, onNext, onBack, loading }) {
    const classes = [
        { id: 'adventurer', name: 'Adventurer', description: 'Balanced approach to tasks' },
        { id: 'warrior', name: 'Warrior', description: 'Focus on completing difficult tasks' },
        { id: 'mage', name: 'Mage', description: 'Strategic planning and organization' },
        { id: 'rogue', name: 'Rogue', description: 'Quick completion and efficiency' }
    ];

    const handleSubmit = (e) => {
        e.preventDefault();
        onNext();
    };

    return (
        <div className="registration-step">
            <div className="step-header">
                <h2>Set Up Your Profile</h2>
                <p>Customize your adventurer profile (you can change this later)</p>
            </div>
            
            <form onSubmit={handleSubmit} className="registration-form">
                <div className="form-group">
                    <label htmlFor="displayName">Display Name</label>
                    <input
                        type="text"
                        id="displayName"
                        name="displayName"
                        value={formData.displayName}
                        onChange={(e) => setFormData(prev => ({ ...prev, displayName: e.target.value }))}
                        placeholder="How others will see your name"
                        maxLength="50"
                    />
                </div>

                <div className="form-group">
                    <label>Choose Your Class</label>
                    <div className="class-selection">
                        {classes.map(cls => (
                            <label key={cls.id} className="class-option">
                                <input
                                    type="radio"
                                    name="class"
                                    value={cls.id}
                                    checked={formData.class === cls.id}
                                    onChange={(e) => setFormData(prev => ({ ...prev, class: e.target.value }))}
                                />
                                <div className="class-card">
                                    <div className="class-name">{cls.name}</div>
                                    <div className="class-description">{cls.description}</div>
                                </div>
                            </label>
                        ))}
                    </div>
                </div>

                <div className="form-group">
                    <label htmlFor="bio">Bio (Optional)</label>
                    <textarea
                        id="bio"
                        name="bio"
                        value={formData.bio}
                        onChange={(e) => setFormData(prev => ({ ...prev, bio: e.target.value }))}
                        placeholder="Tell others about yourself..."
                        maxLength="200"
                        rows="3"
                    />
                </div>

                <div className="form-actions">
                    <button 
                        type="button" 
                        onClick={onBack}
                        className="btn-ghost"
                        disabled={loading}
                    >
                        Back
                    </button>
                    <button 
                        type="submit" 
                        className="btn-primary"
                        disabled={loading}
                    >
                        {loading ? 'Finalizing...' : 'Complete Registration'}
                    </button>
                </div>
            </form>
        </div>
    );
}

// Main registration wizard component
export default function RegistrationWizard({ onSuccess, onCancel }) {
    const [currentStep, setCurrentStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [formData, setFormData] = useState({
        username: '',
        email: '',
        password: '',
        confirmPassword: '',
        displayName: '',
        class: 'adventurer',
        bio: ''
    });

    const totalSteps = 2;

    const handleNext = () => {
        if (currentStep < totalSteps) {
            setCurrentStep(currentStep + 1);
            // Auto-populate display name with username if empty
            if (currentStep === 1 && !formData.displayName) {
                setFormData(prev => ({ ...prev, displayName: prev.username }));
            }
        } else {
            handleSubmit();
        }
    };

    const handleBack = () => {
        if (currentStep > 1) {
            setCurrentStep(currentStep - 1);
        }
    };

    const handleSubmit = async () => {
        setLoading(true);
        setError('');

        try {
            const registrationData = {
                username: formData.username.trim(),
                password: formData.password,
                email: formData.email.trim() || undefined,
                profile: {
                    display_name: formData.displayName.trim() || formData.username.trim(),
                    class: formData.class,
                    bio: formData.bio.trim()
                }
            };

            const response = await fetch('/api/users/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(registrationData)
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Registration failed');
            }

            // Success! Call the success callback with the token
            onSuccess(data.token, data.user);
            
        } catch (err) {
            console.error('Registration error:', err);
            setError(err.message || 'Registration failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="registration-wizard">
            <div className="wizard-header">
                <h1>Welcome to Task Tracker</h1>
                <ProgressIndicator currentStep={currentStep} totalSteps={totalSteps} />
            </div>

            {error && (
                <div className="error-banner">
                    <div className="error-content">
                        {error}
                        <button 
                            onClick={() => setError('')}
                            className="error-dismiss"
                            aria-label="Dismiss error"
                        >
                            ×
                        </button>
                    </div>
                </div>
            )}

            <div className="wizard-content">
                {currentStep === 1 && (
                    <AccountDetailsStep
                        formData={formData}
                        setFormData={setFormData}
                        onNext={handleNext}
                        loading={loading}
                    />
                )}

                {currentStep === 2 && (
                    <ProfileSetupStep
                        formData={formData}
                        setFormData={setFormData}
                        onNext={handleNext}
                        onBack={handleBack}
                        loading={loading}
                    />
                )}
            </div>

            <div className="wizard-footer">
                <button 
                    onClick={onCancel}
                    className="btn-ghost btn-sm"
                    disabled={loading}
                >
                    Already have an account? Sign in
                </button>
            </div>
        </div>
    );
}