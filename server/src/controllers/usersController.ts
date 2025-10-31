import bcrypt from 'bcryptjs';
import type { Response } from 'express';
import type { ParamsDictionary } from 'express-serve-static-core';

import * as experience from '../rpg/experience';
import { readUsers, sanitizeUser, writeUsers } from '../data/userStore';
import { sendError } from '../utils/http';
import { signToken } from '../middleware/auth';
import type { AuthenticatedRequest } from '../types/auth';
import { assertAuthenticated } from '../utils/authGuard';
import type { PublicUser, UserRecord } from '../types/user';
import { isJsonObject } from '../types/json';
import { validateRequest } from '../validation';
import {
    loginUserSchema,
    profileUpdateSchema,
    registerUserSchema,
    type LoginUserPayload,
    type ProfileUpdatePayload,
    type RegisterUserPayload
} from '../validation/schemas/auth';

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

    const allowedProfile: Array<keyof ProfileUpdatePayload> = ['display_name', 'avatar', 'class', 'bio', 'prefs'];
    const profile = usersData.users[userIndex].profile || {};

    allowedProfile.forEach((key) => {
        if (Object.prototype.hasOwnProperty.call(updates, key) && updates[key] !== undefined) {
            profile[key] = updates[key] as never;
        }
    });

    usersData.users[userIndex].profile = profile;
    usersData.users[userIndex].updated_at = new Date().toISOString();

    try {
        writeUsers(usersData);
        const safeUser = sanitizeUser(usersData.users[userIndex]);
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

export function registerUser(req: BaseAuthedRequest<Record<string, string>, RegisterUserPayload>, res: Response) {
    const validation = validateRequest(req, { body: registerUserSchema });
    if (!validation.success) {
        return sendError(res, 400, validation.error.summary);
    }
    const { body } = validation.data;
    const { username, password, email, profile: profileData } = body!;

    const trimmedUsername = username;
    const normalizedUsername = trimmedUsername.toLowerCase();

    const usersData = readUsers();
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
        rpg: experience.createInitialRpgState()
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

    experience.ensureUserRpg(user);
    const token = signToken(user);
    const safeUser = sanitizeUser(user);
    if (!safeUser) return sendError(res, 500, 'Failed to load user');
    return res.json({ token, user: safeUser });
}

const controller = {
    getCurrentUser,
    updateCurrentUser,
    checkUsernameAvailability,
    registerUser,
    loginUser
};

export default controller;
