#!/usr/bin/env -S deno run --allow-env --allow-net --allow-read

// admin-stats.ts — fetch the read-only admin user-stats from the deployed API
// and print them as a table.
//
// Auth (preferred: a token, so no secret lives on disk):
//   1. --token <jwt>      or  ADMIN_TOKEN env   → used directly, no login
//   2. --user <username>  or  ADMIN_STATS_USER  → logs in to get a token
//        password from --password or ADMIN_PASSWORD / ADMIN_STATS_PASSWORD env
//        (for non-interactive use), else prompted with hidden input
//   3. if no user is given, falls back to the first name in ADMIN_USERNAMES
//      from server/.env (just the username — handy locally)
//
// The password is never read from server/.env (a privileged credential should
// not live in the server's config file); only the default username is.
//
// Host:  --host <url>  or  ADMIN_API_HOST env  (default below)
// Output: table by default, raw JSON with --json
//
// Examples:
//   deno task admin:stats --user jelle_admin
//   ADMIN_TOKEN=eyJ... deno task admin:stats
//   deno task admin:stats --host https://trek-een-taak.onrender.com --json

import { parse } from 'https://deno.land/std@0.224.0/flags/mod.ts';
import { dirname, fromFileUrl, join } from 'https://deno.land/std@0.224.0/path/mod.ts';

const DEFAULT_HOST = 'https://trek-een-taak.onrender.com';

interface StatsUser {
    id: number;
    username: string;
    created_at: string;
    updated_at: string;
    level: number;
    xp: number;
    task_count: number;
}

interface StatsResponse {
    generated_at: string;
    total_accounts: number;
    users: StatsUser[];
}

function fail(message: string): never {
    console.error(`✗ ${message}`);
    Deno.exit(1);
}

// Read a KEY=value from server/.env (Deno does not auto-load it). Local
// convenience only; the file is gitignored so nothing here reaches source control.
function readEnvFileValue(key: string): string | null {
    try {
        const scriptDir = dirname(fromFileUrl(import.meta.url));
        const envPath = join(dirname(scriptDir), 'server', '.env');
        const line = Deno.readTextFileSync(envPath)
            .split('\n')
            .find((l) => l.trim().startsWith(`${key}=`));
        if (!line) return null;
        const raw = line.slice(line.indexOf('=') + 1).trim();
        return raw.replace(/^["']|["']$/g, '') || null; // strip optional quotes
    } catch {
        return null;
    }
}

// First username in server/.env's ADMIN_USERNAMES, if present, so `make stats`
// works without flags; assumes the same admin exists in prod.
function defaultUserFromEnvFile(): string | null {
    return readEnvFileValue('ADMIN_USERNAMES')?.split(',')[0]?.trim() || null;
}

async function readHiddenLine(promptText: string): Promise<string> {
    if (!Deno.stdin.isTerminal()) {
        fail(
            'No password available and stdin is not a terminal. ' +
                'Set ADMIN_TOKEN or ADMIN_PASSWORD, or pass --token / --password.',
        );
    }
    await Deno.stdout.write(new TextEncoder().encode(promptText));
    Deno.stdin.setRaw(true);
    const bytes: number[] = [];
    const buf = new Uint8Array(1);
    try {
        while (true) {
            const n = await Deno.stdin.read(buf);
            if (n === null) break;
            const c = buf[0];
            if (c === 13 || c === 10) break; // Enter
            if (c === 3) { // Ctrl-C
                Deno.stdin.setRaw(false);
                Deno.exit(130);
            }
            if (c === 127 || c === 8) { // Backspace
                if (bytes.length > 0) bytes.pop();
                continue;
            }
            bytes.push(c);
        }
    } finally {
        Deno.stdin.setRaw(false);
    }
    await Deno.stdout.write(new TextEncoder().encode('\n'));
    return new TextDecoder().decode(new Uint8Array(bytes));
}

async function postJson(url: string, body: unknown): Promise<Response> {
    try {
        return await fetch(url, {
            method: 'POST',
            headers: { 'content-type': 'application/json', accept: 'application/json' },
            body: JSON.stringify(body),
        });
    } catch (err) {
        fail(`Could not reach ${url}: ${(err as Error).message}`);
    }
}

async function login(host: string, username: string, password: string): Promise<string> {
    const res = await postJson(`${host}/api/users/login`, { username, password });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) fail(`Login failed (${res.status}): ${body?.error ?? 'unknown error'}`);
    if (typeof body?.token !== 'string') fail('Login response did not include a token.');
    return body.token;
}

async function fetchStats(host: string, token: string): Promise<StatsResponse> {
    let res: Response;
    try {
        res = await fetch(`${host}/api/admin/stats`, {
            headers: { authorization: `Bearer ${token}`, accept: 'application/json' },
        });
    } catch (err) {
        fail(`Could not reach ${host}: ${(err as Error).message}`);
    }
    const body = await res.json().catch(() => ({}));
    if (res.status === 401) fail('401 Unauthorized — token missing, malformed, or expired.');
    if (res.status === 403) {
        fail(
            '403 Forbidden — this account is not in ADMIN_USERNAMES on the server ' +
                '(matching is case-insensitive but otherwise exact).',
        );
    }
    if (!res.ok) fail(`Request failed (${res.status}): ${body?.error ?? 'unknown error'}`);
    return body as StatsResponse;
}

function pad(value: string, width: number): string {
    return value.length >= width ? value : value + ' '.repeat(width - value.length);
}

function printTable(stats: StatsResponse): void {
    const cols = ['id', 'username', 'level', 'xp', 'tasks', 'joined', 'active'] as const;
    const headers: Record<typeof cols[number], string> = {
        id: 'ID',
        username: 'USERNAME',
        level: 'LVL',
        xp: 'XP',
        tasks: 'TASKS',
        joined: 'JOINED',
        active: 'LAST SEEN',
    };
    const rows = stats.users.map((u) => ({
        id: String(u.id),
        username: u.username ?? '',
        level: String(u.level ?? 0),
        xp: String(u.xp ?? 0),
        tasks: String(u.task_count ?? 0),
        joined: (u.created_at ?? '').slice(0, 10),
        active: (u.updated_at ?? '').slice(0, 10),
    }));
    const widths = {} as Record<typeof cols[number], number>;
    for (const c of cols) {
        widths[c] = Math.max(headers[c].length, ...rows.map((r) => r[c].length), 1);
    }
    const line = (cells: Record<string, string>) =>
        cols.map((c) => pad(cells[c], widths[c])).join('  ');

    console.log(`\nAdmin stats — ${stats.total_accounts} account(s)`);
    console.log(`Generated ${stats.generated_at}\n`);
    console.log(line(headers));
    console.log(cols.map((c) => '─'.repeat(widths[c])).join('  '));
    for (const r of rows) console.log(line(r));
    console.log('');
}

const flags = parse(Deno.args, {
    string: ['host', 'token', 'user', 'password'],
    boolean: ['json'],
    alias: { h: 'host', t: 'token', u: 'user', p: 'password' },
});

const host = String(flags.host ?? Deno.env.get('ADMIN_API_HOST') ?? DEFAULT_HOST)
    .replace(/\/+$/, '');

// Token is the preferred credential: short-lived (7d) and app-scoped, so it
// never needs to live on disk. Falls back to an interactive login.
let token = String(flags.token ?? Deno.env.get('ADMIN_TOKEN') ?? '');
if (!token) {
    const username = String(flags.user ?? Deno.env.get('ADMIN_STATS_USER') ?? '') ||
        defaultUserFromEnvFile();
    if (!username) {
        fail(
            'No token and no username. Provide --token / ADMIN_TOKEN, ' +
                'or --user <name> to log in.',
        );
    }
    // Password from a flag or an exported env var (for non-interactive use), else
    // prompted with hidden input. Deliberately NOT read from server/.env — a
    // privileged password should not live in the server's config file.
    const password = String(
        flags.password ?? Deno.env.get('ADMIN_PASSWORD') ??
            Deno.env.get('ADMIN_STATS_PASSWORD') ?? '',
    ) ||
        await readHiddenLine(`Password for ${username} @ ${host}: `);
    if (!password) fail('No password provided.');
    token = await login(host, username, password);
}

const stats = await fetchStats(host, token);
if (flags.json) {
    console.log(JSON.stringify(stats, null, 2));
} else {
    printTable(stats);
}
