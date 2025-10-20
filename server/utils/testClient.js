'use strict';

const http = require('http');
const { PassThrough } = require('stream');

function normalizeHeaders(headers = {}) {
    const normalized = {};
    for (const [key, value] of Object.entries(headers)) {
        if (value === undefined || value === null) continue;
        normalized[key.toLowerCase()] = value;
    }
    return normalized;
}

function prepareRequestBody(body, headers) {
    if (body === undefined || body === null) return null;
    if (Buffer.isBuffer(body)) {
        if (!headers['content-length']) headers['content-length'] = String(body.length);
        return body;
    }
    if (typeof body === 'string') {
        const payload = Buffer.from(body);
        if (!headers['content-length']) headers['content-length'] = String(payload.length);
        return payload;
    }
    if (typeof body === 'object') {
        if (!headers['content-type']) headers['content-type'] = 'application/json';
        const payload = Buffer.from(JSON.stringify(body));
        headers['content-length'] = String(payload.length);
        return payload;
    }
    throw new TypeError('Unsupported body type for test request');
}

function parseRawResponse(buffer) {
    const raw = buffer.toString();
    const separator = '\r\n\r\n';
    const idx = raw.indexOf(separator);
    const head = idx === -1 ? raw : raw.slice(0, idx);
    const bodyPart = idx === -1 ? '' : raw.slice(idx + separator.length);
    const lines = head.split('\r\n');
    const statusLine = lines.shift() || '';
    const match = statusLine.match(/^HTTP\/\d\.\d\s+(\d+)/);
    const status = match ? Number(match[1]) : 200;
    const headers = {};
    for (const line of lines) {
        const colon = line.indexOf(':');
        if (colon === -1) continue;
        const key = line.slice(0, colon).trim().toLowerCase();
        const value = line.slice(colon + 1).trim();
        headers[key] = value;
    }
    let body = bodyPart;
    if (headers['content-type'] && headers['content-type'].includes('application/json')) {
        if (bodyPart.length === 0) {
            body = null;
        } else {
            try {
                body = JSON.parse(bodyPart);
            } catch (err) {
                body = bodyPart;
            }
        }
    }
    return { status, headers, body, text: bodyPart };
}

async function invoke(app, options) {
    const { method = 'GET', path = '/', headers = {}, body } = options || {};
    const normalizedHeaders = normalizeHeaders(headers);
    const payload = prepareRequestBody(body, normalizedHeaders);

    const server = http.createServer(app);
    const socket = new PassThrough();
    socket.remoteAddress = normalizedHeaders['x-forwarded-for'] || '127.0.0.1';
    const req = new http.IncomingMessage(socket);
    req.method = method.toUpperCase();
    req.url = path;
    req.headers = normalizedHeaders;

    const res = new http.ServerResponse(req);
    const fakeSocket = new PassThrough();
    res.assignSocket(fakeSocket);
    const chunks = [];
    fakeSocket.on('data', chunk => chunks.push(chunk));

    const outcome = new Promise((resolve, reject) => {
        res.on('finish', () => {
            try {
                const parsed = parseRawResponse(Buffer.concat(chunks));
                res.detachSocket(fakeSocket);
                fakeSocket.end();
                server.close();
                resolve(parsed);
            } catch (err) {
                reject(err);
            }
        });
        res.on('error', reject);
    });

    server.emit('request', req, res);
    process.nextTick(() => {
        if (payload) req.push(payload);
        req.push(null);
    });

    return outcome;
}

function createTestClient(app) {
    return {
        request: (options) => invoke(app, options),
        get: (path, options = {}) => invoke(app, { ...options, method: 'GET', path }),
        post: (path, options = {}) => invoke(app, { ...options, method: 'POST', path }),
        patch: (path, options = {}) => invoke(app, { ...options, method: 'PATCH', path }),
        put: (path, options = {}) => invoke(app, { ...options, method: 'PUT', path }),
        delete: (path, options = {}) => invoke(app, { ...options, method: 'DELETE', path })
    };
}

module.exports = {
    createTestClient
};
