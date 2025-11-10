import type { NextFunction, Response } from 'express';
import jwt, { type JwtPayload } from 'jsonwebtoken';

import { primaryJwtSecret, jwtSecrets } from '../config.js';
import type { AuthenticatedRequest, AuthenticatedUser } from '../types/auth.js';
import { sendError } from '../utils/http.js';

interface TokenPayload extends JwtPayload {
    id: number;
    username: string;
}

function assertValidUser(user: AuthenticatedUser): void {
    if (typeof user.id !== 'number' || Number.isNaN(user.id)) {
        throw new Error('Cannot sign JWT: user.id must be a number');
    }
    if (typeof user.username !== 'string' || user.username.trim().length === 0) {
        throw new Error('Cannot sign JWT: user.username must be a non-empty string');
    }
}

function isTokenPayload(payload: unknown): payload is TokenPayload {
    if (!payload || typeof payload !== 'object') return false;
    const candidate = payload as Partial<TokenPayload>;
    return typeof candidate?.id === 'number' && typeof candidate?.username === 'string';
}

export function signToken(user: AuthenticatedUser): string {
    assertValidUser(user);
    const payload: TokenPayload = {
        id: user.id,
        username: user.username
    };
    return jwt.sign(payload, primaryJwtSecret, { expiresIn: '7d' });
}

export function verifyToken(token: string): TokenPayload {
    let lastError: unknown = null;
    for (const secret of jwtSecrets) {
        try {
            const decoded = jwt.verify(token, secret);
            if (!isTokenPayload(decoded)) {
                throw new Error('Malformed token payload');
            }
            return decoded;
        } catch (error) {
            lastError = error;
        }
    }
    if (lastError instanceof Error) {
        throw lastError;
    }
    throw new Error('Invalid or expired token');
}

export function authenticate(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
): Response | void {
    const authHeader = req.headers?.authorization;
    if (!authHeader) return next();

    const [scheme, token] = authHeader.split(' ');
    if (scheme !== 'Bearer' || !token) {
        return sendError(res, 401, 'Invalid auth format');
    }

    try {
        const payload = verifyToken(token);
        req.user = { id: payload.id, username: payload.username };
        return next();
    } catch {
        return sendError(res, 401, 'Invalid or expired token');
    }
}

export function ensureAuth(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
): Response | void {
    if (!req.user || typeof req.user.id !== 'number') {
        return sendError(res, 401, 'Authentication required');
    }
    return next();
}
