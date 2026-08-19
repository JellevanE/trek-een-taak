#!/usr/bin/env node
// Seed a Task Track account with one or more campaigns + quests + subquests.
//
// Talks to the same HTTP API the app and the MCP use (never the JSON stores
// directly) so XP/streak logic and atomic writes stay correct.
//
// Usage:
//   node seed.mjs <dataset.json> \
//     --url http://localhost:4001 --user local_0 --pass 12345678
//
// Credentials/URL may also come from env: TASK_TRACK_API_URL,
// TASK_TRACK_USERNAME, TASK_TRACK_PASSWORD (flags win over env).
//
// Flags:
//   --dry-run   print what would be created, make no requests after login
//
// Dataset shape: see datasets/ai-agents-summit.json. Each quest may set
// `due_offset_days` (days from today) or an absolute `due_date` (YYYY-MM-DD).

import { readFileSync } from 'node:fs';

function parseArgs(argv) {
    const args = { _: [] };
    for (let i = 0; i < argv.length; i++) {
        const a = argv[i];
        if (a === '--dry-run') args.dryRun = true;
        else if (a === '--url') args.url = argv[++i];
        else if (a === '--user') args.user = argv[++i];
        else if (a === '--pass') args.pass = argv[++i];
        else args._.push(a);
    }
    return args;
}

const args = parseArgs(process.argv.slice(2));
const datasetPath = args._[0];
const API_URL = (args.url ?? process.env.TASK_TRACK_API_URL ?? 'http://localhost:4001')
    .replace(/\/$/, '');
const username = args.user ?? process.env.TASK_TRACK_USERNAME;
const password = args.pass ?? process.env.TASK_TRACK_PASSWORD;

if (!datasetPath) {
    console.error('Usage: node seed.mjs <dataset.json> [--url URL] [--user U] [--pass P] [--dry-run]');
    process.exit(2);
}
if (!username || !password) {
    console.error('Missing credentials. Pass --user/--pass or set TASK_TRACK_USERNAME/PASSWORD.');
    process.exit(2);
}

const dataset = JSON.parse(readFileSync(datasetPath, 'utf8'));
const campaigns = dataset.campaigns ?? [];

function isoDate(offsetDays) {
    const d = new Date();
    d.setDate(d.getDate() + offsetDays);
    return d.toISOString().slice(0, 10);
}

let token = null;

async function api(method, path, body) {
    const res = await fetch(`${API_URL}${path}`, {
        method,
        headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    if (!res.ok) {
        const text = await res.text();
        throw new Error(`${method} ${path} failed (${res.status}): ${text}`);
    }
    return res.status === 204 ? { success: true } : res.json();
}

async function login() {
    const data = await api('POST', '/api/users/login', { username, password });
    if (!data.token) throw new Error('Login response did not include a token');
    token = data.token;
}

const STATUSES = ['todo', 'in_progress', 'blocked', 'done'];

function questPayload(campaignId, q) {
    const payload = { campaign_id: campaignId, description: q.description };
    if (q.priority) payload.priority = q.priority;
    if (q.task_level != null) payload.task_level = q.task_level;
    if (q.due_date) payload.due_date = q.due_date;
    else if (q.due_offset_days != null) payload.due_date = isoDate(q.due_offset_days);
    return payload;
}

// A subquest may be a bare title string or an object { description, status }.
function normalizeSub(s) {
    const sub = typeof s === 'string' ? { description: s } : { ...s };
    if (sub.status && !STATUSES.includes(sub.status)) {
        throw new Error(`Invalid subquest status "${sub.status}" (allowed: ${STATUSES.join(', ')})`);
    }
    return sub;
}

function assertQuestStatus(q) {
    if (q.status && !STATUSES.includes(q.status)) {
        throw new Error(`Invalid quest status "${q.status}" (allowed: ${STATUSES.join(', ')})`);
    }
}

const setQuestStatus = (id, status) => api('PATCH', `/api/tasks/${id}/status`, { status });
const setSubStatus = (qid, sid, status) =>
    api('PATCH', `/api/tasks/${qid}/subtasks/${sid}/status`, { status });

async function run() {
    console.log(`→ ${API_URL} as ${username}${args.dryRun ? '  (dry run)' : ''}`);
    await login();
    console.log('✓ logged in');

    let nQuests = 0;
    let nSubs = 0;
    for (const c of campaigns) {
        const quests = c.quests ?? [];
        if (args.dryRun) {
            console.log(`\n[dry] campaign: ${c.name}  (${quests.length} quests)`);
            for (const q of quests) {
                assertQuestStatus(q);
                const subs = (q.subquests ?? []).map(normalizeSub);
                const qs = q.status ? ` [${q.status}]` : '';
                console.log(`  [dry] quest: ${q.description}${qs}  (${subs.length} subquests)`);
                for (const sub of subs) {
                    if (sub.status) console.log(`    [dry] sub: ${sub.description} [${sub.status}]`);
                }
            }
            continue;
        }

        const campaign = await api('POST', '/api/campaigns', {
            name: c.name,
            ...(c.description ? { description: c.description } : {}),
        });
        console.log(`\n✓ campaign #${campaign.id}: ${campaign.name}`);

        for (const q of quests) {
            assertQuestStatus(q);
            const quest = await api('POST', '/api/tasks', questPayload(campaign.id, q));
            nQuests++;
            const subs = (q.subquests ?? []).map(normalizeSub);
            console.log(`  ✓ quest #${quest.id} [${quest.priority}] ${quest.description}  (+${subs.length} sub)`);
            for (const sub of subs) {
                const updated = await api('POST', `/api/tasks/${quest.id}/subtasks`, {
                    description: sub.description,
                });
                sub.id = updated.sub_tasks[updated.sub_tasks.length - 1].id;
                nSubs++;
            }
            // Apply statuses after creation. Subquests first, then the quest, so a
            // quest whose subquests are all done can itself land on 'done'.
            for (const sub of subs) {
                if (sub.status && sub.status !== 'todo') {
                    await setSubStatus(quest.id, sub.id, sub.status);
                    console.log(`    → sub #${sub.id} ${sub.status}`);
                }
            }
            if (q.status && q.status !== 'todo') {
                await setQuestStatus(quest.id, q.status);
                console.log(`    → quest #${quest.id} ${q.status}`);
            }
        }
    }

    if (!args.dryRun) {
        console.log(`\nDone: ${campaigns.length} campaign(s), ${nQuests} quests, ${nSubs} subquests.`);
    }
}

run().catch((err) => {
    console.error(`\n✗ ${err.message}`);
    process.exit(1);
});
