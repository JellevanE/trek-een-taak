import http from 'node:http';
import type { Express } from 'express';

import { applyTestingListenPatch } from '../src/utils/testingListenPatch';

describe('testing listen patch utilities', () => {
    const originalEnv = { ...process.env };

    afterEach(() => {
        Object.assign(process.env, originalEnv);
    });

    test('patch forces safe host during Jest runs for app.listen and server.listen', () => {
        process.env.JEST_WORKER_ID = '1';
        delete process.env.BIND_ADDRESS;
        delete process.env.HOST;

        const fakeServer = {} as unknown as http.Server;
        const recordedAppArgs: any[][] = [];
        const originalAppListen = jest.fn(function (this: Express, ...args: any[]) {
            recordedAppArgs.push(args);
            return fakeServer;
        });
        const app = { listen: originalAppListen } as unknown as Express;

        const originalHttpListen = http.Server.prototype.listen;
        const recordedHttpArgs: any[][] = [];
        const httpListenSpy = jest
            .spyOn(http.Server.prototype, 'listen')
            .mockImplementation(function (this: http.Server, ...args: any[]) {
                recordedHttpArgs.push(args);
                return this;
            });

        applyTestingListenPatch(app);

        const callback = jest.fn();
        const result = (app.listen as unknown as (...args: any[]) => http.Server)(3000, callback);
        expect(result).toBe(fakeServer);
        expect(recordedAppArgs[0]).toEqual([3000, '127.0.0.1', callback]);

        const server = http.createServer();
        server.listen(4321);
        expect(recordedHttpArgs[0]).toEqual([4321, '127.0.0.1']);

        app.listen = originalAppListen;
        httpListenSpy.mockRestore();
        http.Server.prototype.listen = originalHttpListen;
    });

    test('patch respects configured bind address', () => {
        process.env.JEST_WORKER_ID = '1';
        process.env.BIND_ADDRESS = '10.1.0.5';

        const fakeServer = {} as unknown as http.Server;
        const recordedAppArgs: any[][] = [];
        const originalAppListen = jest.fn(function (this: Express, ...args: any[]) {
            recordedAppArgs.push(args);
            return fakeServer;
        });
        const app = { listen: originalAppListen } as unknown as Express;

        applyTestingListenPatch(app);

        const callback = jest.fn();
        (app.listen as unknown as (...args: any[]) => http.Server)(5000, '0.0.0.0', 128, callback);
        expect(recordedAppArgs[0]).toEqual([5000, '10.1.0.5', 128, callback]);

        app.listen = originalAppListen;
    });
});
