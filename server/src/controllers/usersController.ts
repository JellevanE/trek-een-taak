import bcrypt from 'bcryptjs';
import type { Response } from 'express';
import type { ParamsDictionary } from 'express-serve-static-core';

import { createInitialRpgState, ensureUserRpg } from '../rpg/experienceEngine.js';
import { readUsers, sanitizeUser, writeUsers } from '../data/userStore.js';
import { sendError } from '../utils/http.js';
import { signToken } from '../middleware/auth.js';
import type { AuthenticatedRequest } from '../types/auth.js';
import { assertAuthenticated } from '../utils/authGuard.js';
import type { PublicUser, UserRecord } from '../types/user.js';
import { isJsonObject } from '../types/json.js';
import { validateRequest } from '../validation/index.js';
import { getClientIp } from '../utils/ip.js';
import { registrationRateLimiter } from '../security/registrationRateLimiter.js';
import { isUsernameReserved } from '../security/reservedUsernames.js';
import {
    emailValidationRequestSchema,
    loginUserSchema,
    profileUpdateSchema,
    registerUserSchema,
    isEmailFormatValid,
    type LoginUserPayload,
    type ProfileUpdatePayload,
    type RegisterUserPayload,
    type EmailValidationPayload
} from '../validation/schemas/auth.js';

type BaseAuthedRequest<P extends ParamsDictionary = ParamsDictionary, B = unknown> = AuthenticatedRequest<
    P,
    unknown,
    B
>;

export function getCurrentUser(req: BaseAuthedRequest, res: Response) {
    if (!assertAuthenticated(req, res)) return;
    const usersData = readUsers();
    const user = usersData.users.find((record) => record.id === req.user.id);
    if (!user) return sendError(res, 404, 'User not found');
    const safeUser = sanitizeUser(user);
    if (!safeUser) return sendError(res, 500, 'Failed to load user');
    return res.json({ user: safeUser });
}

export function updateCurrentUser(req: BaseAuthedRequest<Record<string, string>, ProfileUpdatePayload>, res: Response) {
    if (!assertAuthenticated(req, res)) return;
    const validation = validateRequest(req, { body: profileUpdateSchema });
    if (!validation.success) {
        return sendError(res, 400, validation.error.summary);
    }
    const updates = validation.data.body ?? {};

    const usersData = readUsers();
    const userIndex = usersData.users.findIndex((record) => record.id === req.user.id);
    if (userIndex === -1) return sendError(res, 404, 'User not found');

    const userRecord = usersData.users[userIndex];
    if (!userRecord) return sendError(res, 404, 'User not found');

    const allowedProfile: Array<keyof ProfileUpdatePayload> = ['display_name', 'avatar', 'class', 'bio', 'prefs'];
    const profile: UserRecord['profile'] = { ...userRecord.profile };

    allowedProfile.forEach((key) => {
        if (Object.prototype.hasOwnProperty.call(updates, key)) {
            const value = updates[key];
            if (value !== undefined) {
                (profile as Record<typeof key, unknown>)[key] = value as never;
            }
        }
    });

    const updatedUser: UserRecord = {
        ...userRecord,
        profile,
        updated_at: new Date().toISOString()
    };
    usersData.users[userIndex] = updatedUser;

    try {
        writeUsers(usersData);
        const safeUser = sanitizeUser(updatedUser);
        if (!safeUser) return sendError(res, 500, 'Failed to load user');
        return res.json({ user: safeUser });
    } catch (error) {
        return sendError(res, 500, 'Failed to persist profile update');
    }
}

export function checkUsernameAvailability(req: BaseAuthedRequest<{ username: string }>, res: Response) {
    const { username } = req.params;
    if (!username || typeof username !== 'string' || !username.trim()) {
        return sendError(res, 400, 'Invalid username');
    }

    const usersData = readUsers();
    const normalized = username.trim().toLowerCase();
    if (isUsernameReserved(normalized)) {
        const suggestions = [
            `${username}${Math.floor(Math.random() * 100)}`,
            `${username}_${Math.floor(Math.random() * 10)}`
        ];
        return res.json({ available: false, reserved: true, suggestions });
    }
    const isTaken = usersData.users.some((user) => typeof user.username === 'string' && user.username.toLowerCase() === normalized);
    if (isTaken) {
        const suggestions = [
            `${username}${Math.floor(Math.random() * 100)}`,
            `${username}_${Math.floor(Math.random() * 10)}`
        ];
        return res.json({ available: false, suggestions });
    }

    return res.json({ available: true });
}

export function validateEmail(req: BaseAuthedRequest<Record<string, string>, EmailValidationPayload>, res: Response) {
    const validation = validateRequest(req, { body: emailValidationRequestSchema });
    if (!validation.success) {
        return sendError(res, 400, validation.error.summary);
    }
    const { email } = validation.data.body!;
    const normalizedEmail = email.trim();

    if (!isEmailFormatValid(normalizedEmail)) {
        return res.json({ valid: false, normalized_email: normalizedEmail, reason: 'invalid_format' });
    }

    return res.json({ valid: true, normalized_email: normalizedEmail });
}

export function registerUser(req: BaseAuthedRequest<Record<string, string>, RegisterUserPayload>, res: Response) {
    const clientIp = getClientIp(req);
    const rateStatus = registrationRateLimiter.attempt(clientIp);
    res.setHeader('X-RateLimit-Limit', String(rateStatus.limit));
    res.setHeader('X-RateLimit-Remaining', String(Math.max(rateStatus.remaining, 0)));
    if (!rateStatus.allowed) {
        const retryAfterSeconds = Math.max(Math.ceil(rateStatus.resetInMs / 1000), 1);
        res.setHeader('Retry-After', String(retryAfterSeconds));
        return sendError(res, 429, 'Too many registration attempts. Please try again later.');
    }

    const validation = validateRequest(req, { body: registerUserSchema });
    if (!validation.success) {
        return sendError(res, 400, validation.error.summary);
    }
    const { body } = validation.data;
    const { username, password, email, profile: profileData } = body!;

    const trimmedUsername = username;
    const normalizedUsername = trimmedUsername.toLowerCase();

    const usersData = readUsers();
    if (isUsernameReserved(normalizedUsername)) {
        return sendError(res, 400, 'Username not allowed');
    }

    if (usersData.users.some((user) => typeof user.username === 'string' && user.username.toLowerCase() === normalizedUsername)) {
        return sendError(res, 400, 'Username taken');
    }

    const now = new Date().toISOString();
    const passwordHash = bcrypt.hashSync(password, 10);

    const defaultProfile: UserRecord['profile'] = {
        display_name: trimmedUsername,
        avatar: null,
        class: 'adventurer',
        bio: ''
    };

    const profile: UserRecord['profile'] = { ...defaultProfile };
    if (profileData) {
        if (profileData.display_name) {
            profile.display_name = profileData.display_name;
        }
        if (profileData.class) {
            profile.class = profileData.class;
        }
        if (typeof profileData.bio === 'string') {
            profile.bio = profileData.bio.slice(0, 200);
        }
        if (profileData.avatar !== undefined) {
            profile.avatar = profileData.avatar;
        }
        if (profileData.prefs !== undefined) {
            if (!isJsonObject(profileData.prefs)) {
                return sendError(res, 400, 'Invalid profile preferences');
            }
            profile.prefs = profileData.prefs;
        }
    }

    const user: UserRecord = {
        id: usersData.nextId,
        username: trimmedUsername,
        password_hash: passwordHash,
        email: email || null,
        created_at: now,
        updated_at: now,
        profile,
        rpg: createInitialRpgState()
    };

    usersData.users.push(user);
    usersData.nextId += 1;

    try {
        writeUsers(usersData);
        const safeUser = sanitizeUser(user);
        if (!safeUser) return sendError(res, 500, 'Failed to load user');
        const token = signToken(user);
        return res.status(201).json({ token, user: safeUser });
    } catch (error) {
        return sendError(res, 500, 'Failed to create user');
    }
}

export function loginUser(req: BaseAuthedRequest<Record<string, string>, LoginUserPayload>, res: Response) {
    const validation = validateRequest(req, { body: loginUserSchema });
    if (!validation.success) {
        return sendError(res, 400, validation.error.summary);
    }
    const { body } = validation.data;
    const { username, password } = body!;

    const trimmedUsername = username;
    const normalizedUsername = trimmedUsername.toLowerCase();

    const usersData = readUsers();
    const user = usersData.users.find(
        (record) => typeof record.username === 'string' && record.username.toLowerCase() === normalizedUsername
    );
    if (!user) return sendError(res, 401, 'Invalid credentials');

    if (!bcrypt.compareSync(password, user.password_hash)) {
        return sendError(res, 401, 'Invalid credentials');
    }

    ensureUserRpg(user);
    const token = signToken(user);
    const safeUser = sanitizeUser(user);
    if (!safeUser) return sendError(res, 500, 'Failed to load user');
    return res.json({ token, user: safeUser });
}

const controller = {
    getCurrentUser,
    updateCurrentUser,
    checkUsernameAvailability,
    validateEmail,
    registerUser,
    loginUser
};

export default controller;
