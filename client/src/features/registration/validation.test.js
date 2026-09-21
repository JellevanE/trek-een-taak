import {
    assessPassword,
    validateAccountField,
    validateAccountStep,
    validateUsername,
} from './validation.js';

describe('validateUsername', () => {
    test.each([
        ['', 'Username is required'],
        ['   ', 'Username is required'],
        ['ab', 'Username must be at least 3 characters'],
        ['a'.repeat(21), 'Username must be 20 characters or fewer'],
        ['bad name', 'Username can only contain letters, numbers, and underscores'],
        ['hero-1', 'Username can only contain letters, numbers, and underscores'],
    ])('rejects %p', (value, message) => {
        expect(validateUsername(value)).toBe(message);
    });

    test('accepts letters, numbers and underscores', () => {
        expect(validateUsername('Hero_42')).toBe('');
        expect(validateUsername('  hero  ')).toBe('');
    });
});

describe('validateAccountField', () => {
    test('email is optional but must be well-formed when given', () => {
        expect(validateAccountField('email', '')).toBe('');
        expect(validateAccountField('email', 'nope')).toBe('Please enter a valid email address');
        expect(validateAccountField('email', 'a@b.co')).toBe('');
    });

    test('password requires the server minimum length', () => {
        expect(validateAccountField('password', '')).toBe('Password is required');
        expect(validateAccountField('password', 'short1')).toBe(
            'Password must be at least 8 characters',
        );
        expect(validateAccountField('password', 'longenough')).toBe('');
    });

    test('confirm password compares against the form password', () => {
        const form = { password: 'sup3rsecret' };
        expect(validateAccountField('confirmPassword', '', form)).toBe(
            'Please confirm your password',
        );
        expect(validateAccountField('confirmPassword', 'nope', form)).toBe(
            'Passwords do not match',
        );
        expect(validateAccountField('confirmPassword', 'sup3rsecret', form)).toBe('');
    });
});

describe('validateAccountStep', () => {
    test('returns an empty object for a valid form', () => {
        expect(
            validateAccountStep({
                username: 'hero',
                email: '',
                password: 'sup3rsecret',
                confirmPassword: 'sup3rsecret',
            }),
        ).toEqual({});
    });

    test('collects every failing field at once', () => {
        const errors = validateAccountStep({
            username: '',
            email: 'bad',
            password: 'x',
            confirmPassword: 'y',
        });
        expect(Object.keys(errors).sort()).toEqual([
            'confirmPassword',
            'email',
            'password',
            'username',
        ]);
    });
});

describe('assessPassword', () => {
    test('anything under the minimum length is weak regardless of variety', () => {
        const result = assessPassword('Ab1!');
        expect(result.level).toBe('weak');
        expect(result.segments).toBe(1);
        expect(result.checks.find((c) => c.id === 'length').passed).toBe(false);
    });

    test('common passwords are weak even when long enough', () => {
        const result = assessPassword('password123');
        expect(result.level).toBe('weak');
        expect(result.suggestions[0]).toBe('Avoid common passwords');
    });

    test('length alone is fair, adding variety climbs to good', () => {
        expect(assessPassword('abcdefghij').level).toBe('fair');
        expect(assessPassword('Abcdefghij1').level).toBe('good');
    });

    test('meeting every rule is strong with no suggestions', () => {
        const result = assessPassword('Abcdefghij1!x');
        expect(result.level).toBe('strong');
        expect(result.segments).toBe(4);
        expect(result.suggestions).toEqual([]);
        expect(result.checks.every((c) => c.passed)).toBe(true);
    });

    test('containing the username caps the score and adds a suggestion', () => {
        const result = assessPassword('Hero_42abcdX1!', { username: 'hero_42' });
        expect(result.level).toBe('good');
        expect(result.suggestions).toContain("Don't include your username");
    });

    test('suggestions name the missing rules in order', () => {
        const result = assessPassword('abcdefghij');
        expect(result.suggestions).toEqual([
            'Mix upper and lower case letters',
            'Add a number',
            'Add a symbol',
            'Go to 12+ characters for extra strength',
        ]);
    });
});
