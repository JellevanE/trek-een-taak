const baseReserved = [
    'admin',
    'administrator',
    'root',
    'system',
    'support',
    'staff',
    'moderator',
    'mod',
    'service',
    'user',
    'null',
    'undefined',
    'me',
    'self',
    'owner',
    'operator',
    'api',
    'superuser'
] as const;

function collectReserved(): string[] {
    const envList = process.env.RESERVED_USERNAMES;
    const extras = envList
        ? envList
              .split(',')
              .map((value) => value.trim().toLowerCase())
              .filter(Boolean)
        : [];
    const combined = [...baseReserved.map((value) => value.toLowerCase()), ...extras];
    return Array.from(new Set(combined));
}

export const reservedUsernames = collectReserved();

export function isUsernameReserved(username: string): boolean {
    const normalized = username.trim().toLowerCase();
    if (!normalized) return false;
    return reservedUsernames.includes(normalized);
}
