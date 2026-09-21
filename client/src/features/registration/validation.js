/**
 * Registration validation
 * -----------------------
 * Pure functions shared by the wizard steps and their tests. Nothing here
 * touches React or the network, so the rules can be unit-tested directly.
 */

export const USERNAME_MIN = 3;
export const USERNAME_MAX = 20;
export const PASSWORD_MIN = 8;
export const PASSWORD_RECOMMENDED = 12;

const USERNAME_PATTERN = /^[a-zA-Z0-9_]+$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// A short deny-list of the passwords that show up in every breach corpus. The
// server enforces length only; this just nudges people away from the obvious.
const COMMON_PASSWORDS = new Set([
    'password',
    'password1',
    'password123',
    '12345678',
    '123456789',
    '1234567890',
    'qwertyuiop',
    'qwerty123',
    'iloveyou',
    'letmein123',
    'welcome1',
    'admin123',
]);

export function validateUsername(value) {
    const trimmed = (value || '').trim();
    if (!trimmed) return 'Username is required';
    if (trimmed.length < USERNAME_MIN) {
        return `Username must be at least ${USERNAME_MIN} characters`;
    }
    if (trimmed.length > USERNAME_MAX) {
        return `Username must be ${USERNAME_MAX} characters or fewer`;
    }
    if (!USERNAME_PATTERN.test(trimmed)) {
        return 'Username can only contain letters, numbers, and underscores';
    }
    return '';
}

export function validateEmail(value) {
    const trimmed = (value || '').trim();
    // Email is optional, but if provided it must look like an address.
    if (trimmed && !EMAIL_PATTERN.test(trimmed)) {
        return 'Please enter a valid email address';
    }
    return '';
}

export function validatePassword(value) {
    if (!value) return 'Password is required';
    if (value.length < PASSWORD_MIN) {
        return `Password must be at least ${PASSWORD_MIN} characters`;
    }
    return '';
}

export function validateConfirmPassword(value, password) {
    if (!value) return 'Please confirm your password';
    if (value !== password) return 'Passwords do not match';
    return '';
}

/**
 * Validates one account-details field in the context of the whole form.
 * Returns an error message, or '' when the field is valid.
 */
export function validateAccountField(name, value, formData = {}) {
    switch (name) {
        case 'username':
            return validateUsername(value);
        case 'email':
            return validateEmail(value);
        case 'password':
            return validatePassword(value);
        case 'confirmPassword':
            return validateConfirmPassword(value, formData.password);
        default:
            return '';
    }
}

/**
 * Validates the whole account-details step. Returns an errors object keyed by
 * field name; an empty object means the step is valid.
 */
export function validateAccountStep(formData) {
    const errors = {};
    ['username', 'email', 'password', 'confirmPassword'].forEach((field) => {
        const message = validateAccountField(field, formData[field], formData);
        if (message) errors[field] = message;
    });
    return errors;
}

/**
 * Requirement checklist shown under the password field. `bonus` rules are
 * recommendations rather than blockers: the meter can reach "good" without
 * them but needs them for "strong".
 */
export const PASSWORD_RULES = [
    {
        id: 'length',
        label: `At least ${PASSWORD_MIN} characters`,
        test: (p) => p.length >= PASSWORD_MIN,
        suggestion: `Use at least ${PASSWORD_MIN} characters`,
    },
    {
        id: 'case',
        label: 'Upper and lower case letters',
        test: (p) => /[a-z]/.test(p) && /[A-Z]/.test(p),
        suggestion: 'Mix upper and lower case letters',
    },
    {
        id: 'number',
        label: 'At least one number',
        test: (p) => /\d/.test(p),
        suggestion: 'Add a number',
    },
    {
        id: 'symbol',
        label: 'A symbol (!, ?, #…)',
        test: (p) => /[^A-Za-z0-9]/.test(p),
        suggestion: 'Add a symbol',
    },
    {
        id: 'long',
        label: `${PASSWORD_RECOMMENDED}+ characters (recommended)`,
        test: (p) => p.length >= PASSWORD_RECOMMENDED,
        suggestion: `Go to ${PASSWORD_RECOMMENDED}+ characters for extra strength`,
        bonus: true,
    },
];

export const PASSWORD_LEVELS = {
    weak: { label: 'Weak', segments: 1 },
    fair: { label: 'Fair', segments: 2 },
    good: { label: 'Good', segments: 3 },
    strong: { label: 'Strong', segments: 4 },
};

/**
 * Scores a password against PASSWORD_RULES.
 *
 * @param {string} password
 * @param {{ username?: string }} [context] - extra signals (e.g. the chosen
 *   username, which shouldn't appear inside the password).
 * @returns {{
 *   level: 'weak'|'fair'|'good'|'strong',
 *   label: string,
 *   segments: number,
 *   checks: Array<{ id: string, label: string, passed: boolean, bonus: boolean }>,
 *   suggestions: string[],
 * }}
 */
export function assessPassword(password, context = {}) {
    const value = password || '';
    const checks = PASSWORD_RULES.map((rule) => ({
        id: rule.id,
        label: rule.label,
        passed: rule.test(value),
        bonus: Boolean(rule.bonus),
    }));

    const suggestions = PASSWORD_RULES
        .filter((rule) => !rule.test(value))
        .map((rule) => rule.suggestion);

    const lowered = value.toLowerCase();
    const isCommon = COMMON_PASSWORDS.has(lowered);
    const username = (context.username || '').trim().toLowerCase();
    const containsUsername = username.length >= USERNAME_MIN && lowered.includes(username);

    if (isCommon) suggestions.unshift('Avoid common passwords');
    if (containsUsername) suggestions.unshift("Don't include your username");

    const lengthOk = checks.find((c) => c.id === 'length').passed;
    const passedCount = checks.filter((c) => c.passed).length;

    let level;
    if (!lengthOk || isCommon) {
        level = 'weak';
    } else if (passedCount >= PASSWORD_RULES.length && !containsUsername) {
        level = 'strong';
    } else if (passedCount >= 3) {
        level = 'good';
    } else {
        level = 'fair';
    }

    return {
        level,
        label: PASSWORD_LEVELS[level].label,
        segments: PASSWORD_LEVELS[level].segments,
        checks,
        suggestions,
    };
}
