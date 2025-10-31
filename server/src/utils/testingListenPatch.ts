import http from 'node:http';
import type { Express } from 'express';

type ListenCallback = (...args: any[]) => void;

interface ListenConfig {
    port?: number;
    host?: string;
    backlog?: number | string;
    callback?: ListenCallback;
}

let httpPatched = false;

function extractListenConfig(args: any[]): ListenConfig {
    const [rawPort, second, third, fourth] = args;
    const config: ListenConfig = {};

    if (typeof rawPort === 'number') {
        config.port = rawPort;
    } else if (typeof rawPort === 'function') {
        config.callback = rawPort;
    }

    if (typeof second === 'function') {
        config.callback = second;
    } else if (typeof second === 'string') {
        config.host = second;
    } else if (typeof second === 'number') {
        config.backlog = second;
    }

    if (typeof third === 'function') {
        config.callback = third;
    } else if (config.host === undefined && typeof third === 'string') {
        config.host = third;
    } else if (config.backlog === undefined && (typeof third === 'number' || typeof third === 'string')) {
        config.backlog = third;
    }

    if (typeof fourth === 'function') {
        config.callback = fourth;
    }

    return config;
}

function buildListenArgs(config: ListenConfig): any[] {
    const args: any[] = [];
    if (config.port !== undefined) args.push(config.port);
    if (config.host !== undefined) args.push(config.host);
    if (config.backlog !== undefined) args.push(config.backlog);
    if (config.callback) args.push(config.callback);
    return args;
}

function overrideHostIfNeeded(config: ListenConfig): ListenConfig {
    const { host } = config;
    const shouldOverride = host === undefined || host === null || host === '0.0.0.0' || host === '::';
    if (!shouldOverride) return config;
    const safeHost = process.env.BIND_ADDRESS || process.env.HOST || '127.0.0.1';
    return { ...config, host: safeHost };
}

function patchHttpServerListen(): void {
    if (httpPatched) return;
    httpPatched = true;
    const originalHttpListen = http.Server.prototype.listen;

    function patchedHttpListen(this: http.Server, ...args: any[]): http.Server {
        if (process.env.JEST_WORKER_ID !== undefined) {
            const config = overrideHostIfNeeded(extractListenConfig(args));
            const finalArgs = buildListenArgs(config);
            return (originalHttpListen as (...params: any[]) => http.Server).apply(this, finalArgs);
        }
        return (originalHttpListen as (...params: any[]) => http.Server).apply(this, args as any);
    }

    http.Server.prototype.listen = patchedHttpListen as typeof originalHttpListen;
}

export function applyTestingListenPatch(app: Express): void {
    const originalListen = app.listen;

    function patchedAppListen(this: Express, ...args: any[]): http.Server {
        if (process.env.JEST_WORKER_ID !== undefined) {
            const config = overrideHostIfNeeded(extractListenConfig(args));
            const finalArgs = buildListenArgs(config);
            return originalListen.apply(this, finalArgs as any);
        }
        return originalListen.apply(this, args as any);
    }

    app.listen = patchedAppListen as typeof originalListen;
    patchHttpServerListen();
}
