import fs from 'node:fs';

import { createInitialRpgState, ensureUserRpg } from '../rpg/experienceEngine.js';
import { buildPublicRpgState } from '../rpg/eventHooks.js';
import type { PublicUser, UserRecord, UserStoreData } from '../types/user.js';

import { getUsersFile } from './filePaths.js';

function createDefaultUser(): UserRecord {
    const now = new Date().toISOString();
    return {
        id: 1,
        username: 'local',
        password_hash: '',
        email: null,
        created_at: now,
        updated_at: now,
        profile: {
            display_name: 'Local User',
            avatar: null,
            class: 'adventurer',
            bio: ''
        },
        rpg: createInitialRpgState()
    } as UserRecord;
}

export function ensureDefaultUserFile(): void {
    const usersFile = getUsersFile();
    if (fs.existsSync(usersFile)) return;
    const initial: UserStoreData = {
        users: [createDefaultUser()],
        nextId: 2
    };
    fs.writeFileSync(usersFile, JSON.stringify(initial, null, 2));
}

export function readUsers(): UserStoreData {
    try {
        ensureDefaultUserFile();
        const usersFile = getUsersFile();
        const data = fs.readFileSync(usersFile, 'utf8');
        const parsed = JSON.parse(data) as Partial<UserStoreData>;

        if (!Array.isArray(parsed.users)) parsed.users = [];
        if (typeof parsed.nextId !== 'number') {
            const maxId = parsed.users.reduce(
                (max, user) =>
                    user && typeof user.id === 'number' && user.id > max ? user.id : max,
                0
            );
            parsed.nextId = maxId + 1;
        }

        parsed.users.forEach((user) => {
            if (user) ensureUserRpg(user);
        });

        return {
            users: parsed.users as UserRecord[],
            nextId: parsed.nextId ?? 1
        };
    } catch (error) {
        console.error('Error reading users file:', error);
        return { users: [], nextId: 1 };
    }
}

export function writeUsers(data: UserStoreData): boolean {
    const usersFile = getUsersFile();
    const tmpPath = `${usersFile}.tmp`;
    try {
        fs.writeFileSync(tmpPath, JSON.stringify(data, null, 2));
        fs.renameSync(tmpPath, usersFile);
        return true;
    } catch (error) {
        try {
            if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath);
        } catch {
            // ignore cleanup errors
        }
        console.error('Error writing users file:', error);
        throw error;
    }
}

export function sanitizeUser(user: UserRecord | null | undefined): PublicUser | null {
    if (!user) return null;
    const { password_hash, ...rest } = user;
    return {
        ...rest,
        rpg: buildPublicRpgState(user.rpg)
    };
}
