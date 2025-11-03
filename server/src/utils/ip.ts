import type { Request } from 'express';

function normalizeIp(value: string): string {
    const trimmed = value.trim();
    if (trimmed.startsWith('::ffff:')) {
        return trimmed.slice('::ffff:'.length);
    }
    if (trimmed === '::1') {
        return '127.0.0.1';
    }
    return trimmed;
}

export function getClientIp(req: Request): string {
    const header = req.headers['x-forwarded-for'];
    if (typeof header === 'string' && header.trim() !== '') {
        const [first] = header.split(',');
        if (first) return normalizeIp(first);
    } else if (Array.isArray(header) && header.length > 0) {
        const [first] = header;
        if (first) return normalizeIp(first);
    }

    if (typeof req.ip === 'string' && req.ip.trim() !== '') {
        return normalizeIp(req.ip);
    }

    const remote = req.socket?.remoteAddress;
    if (typeof remote === 'string' && remote.trim() !== '') {
        return normalizeIp(remote);
    }

    return 'unknown';
}
