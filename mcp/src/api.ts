// Thin authenticated client for the Task Track HTTP API.
// All writes go through the Express server (never the JSON stores directly):
// the stores assume a single writer, and XP/streak logic lives behind the routes.

import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// Credentials live in mcp/.env (gitignored); env vars set by the MCP host win.
// Loaded here (not in index.ts) so it runs before API_URL is read — ESM hoists imports.
const envFile = fileURLToPath(new URL('../.env', import.meta.url));
if (existsSync(envFile)) {
    process.loadEnvFile(envFile);
}

const API_URL = (process.env.TASK_TRACK_API_URL ?? 'http://localhost:4001').replace(/\/$/, '');

let cachedToken: string | null = null;

function credentials(): { username: string; password: string } {
    const username = process.env.TASK_TRACK_USERNAME;
    const password = process.env.TASK_TRACK_PASSWORD;
    if (!username || !password) {
        throw new Error(
            'TASK_TRACK_USERNAME and TASK_TRACK_PASSWORD must be set (via mcp/.env or the MCP server env).',
        );
    }
    return { username, password };
}

async function fetchOrExplain(url: string, init: RequestInit): Promise<Response> {
    try {
        return await fetch(url, init);
    } catch (error) {
        throw new Error(
            `Task Track API is not reachable at ${API_URL} — is the server running? ` +
                `Start it with ./start-dev.sh (or: cd server && npm run dev). (${String(error)})`,
        );
    }
}

async function extractError(res: Response): Promise<string> {
    const text = await res.text();
    try {
        const parsed = JSON.parse(text) as { error?: string; message?: string };
        return parsed.error ?? parsed.message ?? text;
    } catch {
        return text || res.statusText;
    }
}

// Login is rate-limited per IP, so the token is cached for the lifetime of the
// process and only refreshed after a 401.
async function login(): Promise<string> {
    const res = await fetchOrExplain(`${API_URL}/api/users/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials()),
    });
    if (!res.ok) {
        throw new Error(`Login failed (${res.status}): ${await extractError(res)}`);
    }
    const data = (await res.json()) as { token?: string };
    if (!data.token) throw new Error('Login response did not include a token');
    return data.token;
}

export async function apiRequest(
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
    path: string,
    body?: unknown,
): Promise<unknown> {
    cachedToken ??= await login();

    const doFetch = () =>
        fetchOrExplain(`${API_URL}${path}`, {
            method,
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${cachedToken}`,
            },
            ...(body === undefined ? {} : { body: JSON.stringify(body) }),
        });

    let res = await doFetch();
    if (res.status === 401) {
        cachedToken = await login();
        res = await doFetch();
    }

    if (!res.ok) {
        throw new Error(`${method} ${path} failed (${res.status}): ${await extractError(res)}`);
    }
    if (res.status === 204) return { success: true };
    return res.json();
}
