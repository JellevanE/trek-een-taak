import path from 'node:path';

type DataFileKey = 'tasks' | 'users' | 'campaigns';

const ROOT_DIR = path.join(__dirname, '..', '..');

const defaults: Record<DataFileKey, string> = {
    tasks: path.join(ROOT_DIR, 'tasks.json'),
    users: path.join(ROOT_DIR, 'users.json'),
    campaigns: path.join(ROOT_DIR, 'campaigns.json')
};

const envVars: Record<DataFileKey, string> = {
    tasks: 'TASKS_FILE',
    users: 'USERS_FILE',
    campaigns: 'CAMPAIGNS_FILE'
};

const overrides: Partial<Record<DataFileKey, string>> = {};

function resolvePath(key: DataFileKey): string {
    if (overrides[key]) return overrides[key] as string;
    const envKey = envVars[key];
    const fromEnv = process.env[envKey];
    if (fromEnv && fromEnv.trim().length > 0) return fromEnv;
    return defaults[key];
}

export function getTasksFile(): string {
    return resolvePath('tasks');
}

export function getUsersFile(): string {
    return resolvePath('users');
}

export function getCampaignsFile(): string {
    return resolvePath('campaigns');
}

export function configureDataFiles(paths: Partial<Record<DataFileKey, string>>): void {
    Object.entries(paths).forEach(([key, value]) => {
        if (!value) return;
        overrides[key as DataFileKey] = value;
    });
}

export function resetDataFileOverrides(): void {
    Object.keys(overrides).forEach((key) => {
        delete overrides[key as DataFileKey];
    });
}
