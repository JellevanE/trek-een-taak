import fs from 'node:fs';

function readSecretFile(filePath?: string | null): string | null {
    if (!filePath) return null;
    try {
        const content = fs.readFileSync(filePath, 'utf8');
        return content.trim() || null;
    } catch (err) {
        throw new Error(`Failed to read JWT secret file at ${filePath}: ${(err as Error).message}`);
    }
}

function collectRawSecrets(): string[] {
    const collected: string[] = [];

    if (process.env.JWT_SECRET_FILE) {
        const fromFile = readSecretFile(process.env.JWT_SECRET_FILE);
        if (fromFile) collected.push(fromFile);
    }

    const secretList = process.env.JWT_SECRETS || process.env.JWT_SECRET_LIST || '';
    secretList
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean)
        .forEach((secret) => collected.push(secret));

    const singleSecret = process.env.JWT_SECRET?.trim();
    if (singleSecret) {
        collected.push(singleSecret);
    }

    return collected;
}

function resolveJwtSecrets(): string[] {
    const uniqueSecrets = Array.from(new Set(collectRawSecrets()));

    if (uniqueSecrets.length === 0) {
        if (process.env.NODE_ENV === 'test') {
            return ['test-secret'];
        }
        throw new Error('JWT secret not configured. Set JWT_SECRET, JWT_SECRETS, or JWT_SECRET_FILE.');
    }

    return uniqueSecrets;
}

export const jwtSecrets = resolveJwtSecrets();
const [primarySecret] = jwtSecrets;
if (!primarySecret) {
    throw new Error('JWT secret not configured. Set JWT_SECRET, JWT_SECRETS, or JWT_SECRET_FILE.');
}
export const primaryJwtSecret = primarySecret;
