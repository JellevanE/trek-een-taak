#!/usr/bin/env -S deno run --allow-env --allow-read --allow-run

import { dirname, fromFileUrl, join } from 'https://deno.land/std@0.224.0/path/mod.ts';

type CommandSpec = {
    cmd: string[];
    cwd?: string;
    env?: Record<string, string>;
    description?: string;
};

const commands: Record<string, CommandSpec> = {
    'server:build': {
        cmd: ['npm', 'run', 'build'],
        cwd: 'server',
        description: 'Compile backend TypeScript before running tests'
    },
    'server:test': {
        cmd: ['npm', 'test', '--', '--runInBand'],
        cwd: 'server',
        description: 'Run backend test suite (Jest + Supertest)'
    },
    'client:test': {
        cmd: ['npm', 'test', '--', '--watchAll=false'],
        cwd: 'client',
        description: 'Run frontend tests once (React Testing Library)'
    },
    'client:build': {
        cmd: ['npm', 'run', 'build'],
        cwd: 'client',
        description: 'Build production bundle to verify compilation'
    }
};

const pipelines: Record<string, string[]> = {
    default: ['server:build', 'server:test', 'client:test'],
    ci: ['server:build', 'server:test', 'client:test', 'client:build']
};

function printUsage(): void {
    console.log('Usage: deno run --allow-env --allow-read --allow-run tools/validate.ts [target ...]');
    console.log('\nTargets:');
    const commandKeys = Object.keys(commands).sort();
    for (const key of commandKeys) {
        const meta = commands[key];
        console.log(`  ${key.padEnd(14)} ${meta.description ?? ''}`);
    }
    console.log('\nPipelines:');
    const pipelineKeys = Object.keys(pipelines).sort();
    for (const key of pipelineKeys) {
        const steps = pipelines[key].join(', ');
        console.log(`  ${key.padEnd(14)} ${steps}`);
    }
    console.log('\nIf no target is provided the "default" pipeline runs.');
}

type Target = keyof typeof pipelines | keyof typeof commands;

function resolveTargets(tokens: string[]): Target[] {
    if (tokens.length === 0) {
        return ['default'];
    }
    return tokens as Target[];
}

function expandTargets(targets: Target[]): string[] {
    const expanded: string[] = [];
    for (const target of targets) {
        if (target in pipelines) {
            expanded.push(...pipelines[target]);
            continue;
        }
        if (target in commands) {
            expanded.push(target);
            continue;
        }
        console.error(`Unknown target "${target}".`);
        printUsage();
        Deno.exit(1);
    }
    return expanded;
}

async function runCommand(token: string): Promise<void> {
    const spec = commands[token];
    if (!spec) {
        throw new Error(`Unknown command token "${token}".`);
    }
    const scriptDir = dirname(fromFileUrl(import.meta.url));
    const repoRoot = dirname(scriptDir);
    const cwd = spec.cwd ? join(repoRoot, spec.cwd) : undefined;
    const command = new Deno.Command(spec.cmd[0], {
        args: spec.cmd.slice(1),
        cwd,
        env: spec.env ? { ...Deno.env.toObject(), ...spec.env } : undefined,
        stdin: 'inherit',
        stdout: 'inherit',
        stderr: 'inherit'
    });

    console.log(`\n▶ ${token}${spec.description ? ` — ${spec.description}` : ''}`);
    const child = command.spawn();
    const status = await child.status;
    if (!status.success) {
        throw new Error(`Command "${token}" exited with code ${status.code}.`);
    }
}

async function main(): Promise<void> {
    if (Deno.args.includes('--help') || Deno.args.includes('-h')) {
        printUsage();
        return;
    }

    const tokens = resolveTargets(Deno.args.filter(arg => arg !== '--'));
    const steps = expandTargets(tokens);

    const start = performance.now();
    for (const step of steps) {
        await runCommand(step);
    }
    const elapsed = performance.now() - start;
    console.log(`\n✅ Completed ${steps.length} step(s) in ${(elapsed / 1000).toFixed(2)}s.`);
}

if (import.meta.main) {
    try {
        await main();
    } catch (error) {
        console.error(error instanceof Error ? error.message : error);
        Deno.exit(1);
    }
}
