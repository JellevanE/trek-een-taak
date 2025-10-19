'use strict';

const http = require('http');

let httpPatched = false;

function patchHttpServerListen() {
    if (httpPatched) return;
    httpPatched = true;
    const originalHttpListen = http.Server.prototype.listen;
    http.Server.prototype.listen = function patchedHttpListen(port, host, ...rest) {
        if (process.env.JEST_WORKER_ID !== undefined) {
            let callback = null;
            let backlog;
            if (typeof host === 'function') {
                callback = host;
                host = undefined;
            }
            if (rest.length > 0) {
                if (typeof rest[0] === 'function') {
                    callback = rest[0];
                } else {
                    backlog = rest[0];
                    if (rest.length > 1 && typeof rest[1] === 'function') {
                        callback = rest[1];
                    }
                }
            }
            const shouldOverrideHost = !host || host === '0.0.0.0' || host === '::';
            if (shouldOverrideHost) {
                const safeHost = process.env.BIND_ADDRESS || process.env.HOST || '127.0.0.1';
                return originalHttpListen.call(this, port, safeHost, backlog, callback);
            }
            return originalHttpListen.call(this, port, host, backlog, callback);
        }
        return originalHttpListen.call(this, port, host, ...rest);
    };
}

function applyTestingListenPatch(app) {
    const originalListen = app.listen.bind(app);
    app.listen = function patchedListen(port, host, ...rest) {
        if (process.env.JEST_WORKER_ID !== undefined) {
            let callback = null;
            let backlog;
            if (typeof host === 'function') {
                callback = host;
                host = undefined;
            }
            if (rest.length > 0) {
                if (typeof rest[0] === 'function') {
                    callback = rest[0];
                } else {
                    backlog = rest[0];
                    if (rest.length > 1 && typeof rest[1] === 'function') {
                        callback = rest[1];
                    }
                }
            }
            const shouldOverrideHost = !host || host === '0.0.0.0' || host === '::';
            if (shouldOverrideHost) {
                const safeHost = process.env.BIND_ADDRESS || process.env.HOST || '127.0.0.1';
                return originalListen(port, safeHost, backlog, callback);
            }
            return originalListen(port, host, backlog, callback);
        }
        return originalListen(port, host, ...rest);
    };
    patchHttpServerListen();
}

module.exports = {
    applyTestingListenPatch
};

