import http, { IncomingMessage, RequestListener, Server as HttpServer, ServerResponse } from 'node:http';
import type { Socket } from 'node:net';
import { PassThrough } from 'node:stream';

export interface TestClientRequestOptions {
    method?: string;
    path?: string;
    headers?: Record<string, string | number | string[] | undefined | null>;
    body?: unknown;
}

export interface TestClientResponse<TBody = unknown> {
    status: number;
    headers: Record<string, string>;
    body: TBody;
    text: string;
}

type NormalizedHeaders = Record<string, string>;

function normalizeHeaders(headers: TestClientRequestOptions['headers'] = {}): NormalizedHeaders {
    const normalized: NormalizedHeaders = {};
    for (const [key, value] of Object.entries(headers)) {
        if (value === undefined || value === null) continue;
        normalized[key.toLowerCase()] = Array.isArray(value) ? value.join(', ') : String(value);
    }
    return normalized;
}

function prepareRequestBody(body: unknown, headers: NormalizedHeaders): Buffer | null {
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

function parseRawResponse(buffer: Buffer): TestClientResponse {
    const raw = buffer.toString();
    const separator = '\r\n\r\n';
    const idx = raw.indexOf(separator);
    const head = idx === -1 ? raw : raw.slice(0, idx);
    const bodyPart = idx === -1 ? '' : raw.slice(idx + separator.length);
    const lines = head.split('\r\n');
    const statusLine = lines.shift() ?? '';
    const match = statusLine.match(/^HTTP\/\d\.\d\s+(\d+)/);
    const status = match ? Number(match[1]) : 200;
    const headers: Record<string, string> = {};
    for (const line of lines) {
        const colon = line.indexOf(':');
        if (colon === -1) continue;
        const key = line.slice(0, colon).trim().toLowerCase();
        const value = line.slice(colon + 1).trim();
        headers[key] = value;
    }
    let body: unknown = bodyPart;
    if (headers['content-type']?.includes('application/json')) {
        body = bodyPart.length === 0 ? null : safelyParseJson(bodyPart);
    }
    return { status, headers, body, text: bodyPart };
}

function safelyParseJson(value: string): unknown {
    try {
        return JSON.parse(value);
    } catch {
        return value;
    }
}

async function invoke(app: RequestListener, options: TestClientRequestOptions = {}): Promise<TestClientResponse> {
    const { method = 'GET', path = '/', headers = {}, body } = options;
    const normalizedHeaders = normalizeHeaders(headers);
    const payload = prepareRequestBody(body, normalizedHeaders);

    // We create a throwaway server to reuse Express' request handling without opening a socket.
    const server: HttpServer = http.createServer(app);
    const socket = new PassThrough();
    (socket as unknown as { remoteAddress?: string }).remoteAddress =
        normalizedHeaders['x-forwarded-for'] ?? '127.0.0.1';

    const req = new IncomingMessage(socket as unknown as Socket);
    req.method = method.toUpperCase();
    req.url = path;
    req.headers = normalizedHeaders;

    const res = new ServerResponse(req);
    const fakeSocket = new PassThrough();
    res.assignSocket(fakeSocket as unknown as Socket);
    const chunks: Buffer[] = [];
    fakeSocket.on('data', (chunk) => chunks.push(chunk));

    const outcome = new Promise<TestClientResponse>((resolve, reject) => {
        res.on('finish', () => {
            try {
                const parsed = parseRawResponse(Buffer.concat(chunks));
                res.detachSocket(fakeSocket as unknown as Socket);
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

export interface TestClient {
    request: (options: TestClientRequestOptions) => Promise<TestClientResponse>;
    get: (path: string, options?: Omit<TestClientRequestOptions, 'path' | 'method'>) => Promise<TestClientResponse>;
    post: (path: string, options?: Omit<TestClientRequestOptions, 'path' | 'method'>) => Promise<TestClientResponse>;
    patch: (path: string, options?: Omit<TestClientRequestOptions, 'path' | 'method'>) => Promise<TestClientResponse>;
    put: (path: string, options?: Omit<TestClientRequestOptions, 'path' | 'method'>) => Promise<TestClientResponse>;
    delete: (path: string, options?: Omit<TestClientRequestOptions, 'path' | 'method'>) => Promise<TestClientResponse>;
}

export function createTestClient(app: RequestListener): TestClient {
    return {
        request: (options) => invoke(app, options),
        get: (path, options = {}) => invoke(app, { ...options, method: 'GET', path }),
        post: (path, options = {}) => invoke(app, { ...options, method: 'POST', path }),
        patch: (path, options = {}) => invoke(app, { ...options, method: 'PATCH', path }),
        put: (path, options = {}) => invoke(app, { ...options, method: 'PUT', path }),
        delete: (path, options = {}) => invoke(app, { ...options, method: 'DELETE', path })
    };
}
