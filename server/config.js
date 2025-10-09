'use strict';

const fs = require('fs');

function readSecretFile(filePath) {
    if (!filePath) return null;
    try {
        const content = fs.readFileSync(filePath, 'utf8');
        return content.trim();
    } catch (err) {
        throw new Error(`Failed to read JWT secret file at ${filePath}: ${err.message}`);
    }
}

function collectRawSecrets() {
    const collected = [];
    if (process.env.JWT_SECRET_FILE) {
        const fromFile = readSecretFile(process.env.JWT_SECRET_FILE);
        if (fromFile) collected.push(fromFile);
    }

    const secretList = process.env.JWT_SECRETS || process.env.JWT_SECRET_LIST || '';
    secretList.split(',').map(s => s.trim()).filter(Boolean).forEach(secret => collected.push(secret));

    if (process.env.JWT_SECRET && process.env.JWT_SECRET.trim()) {
        collected.push(process.env.JWT_SECRET.trim());
    }
    return collected;
}

function resolveJwtSecrets() {
    const unique = Array.from(new Set(collectRawSecrets()));
    if (unique.length === 0) {
        if (process.env.NODE_ENV === 'test') {
            return ['test-secret'];
        }
        throw new Error('JWT secret not configured. Set JWT_SECRET, JWT_SECRETS, or JWT_SECRET_FILE.');
    }
    return unique;
}

const jwtSecrets = resolveJwtSecrets();
const primaryJwtSecret = jwtSecrets[0];

module.exports = {
    jwtSecrets,
    primaryJwtSecret,
};
