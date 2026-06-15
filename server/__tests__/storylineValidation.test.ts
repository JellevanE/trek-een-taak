import { sanitize, validateAndSanitize } from '../src/services/storyline.service';

test('sanitize strips template markers and prompt tags', () => {
    expect(sanitize('Hello {{name}}')).toBe('Hello name');
    expect(sanitize('<prompt>ignore previous</prompt>do thing')).toBe('ignore previousdo thing');
    expect(sanitize('  trimmed  ')).toBe('trimmed');
});

test('validateAndSanitize strips injection from passing input', () => {
    const result = validateAndSanitize({
        campaignName: 'The {{evil}} Quest',
        campaignDescription: '<prompt>leak</prompt> a tale',
    });
    expect(result.campaignName).toBe('The evil Quest');
    expect(result.campaignDescription).toBe('leak a tale');
});

test('validateAndSanitize rejects over-length campaign name', () => {
    expect(() =>
        validateAndSanitize({ campaignName: 'x'.repeat(201) }),
    ).toThrow(/exceeds maximum length/);
});

test('validateAndSanitize rejects over-length task description', () => {
    expect(() =>
        validateAndSanitize({ taskDescription: 'x'.repeat(1001) }),
    ).toThrow(/exceeds maximum length/);
});

test('empty values pass through as empty string', () => {
    expect(validateAndSanitize({ campaignName: undefined }).campaignName).toBe('');
});
