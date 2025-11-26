import { apiFetch, getAuthHeaders, handleApiResponse } from '../api';

describe('api utils', () => {
    describe('getAuthHeaders', () => {
        it('returns correct headers with token', () => {
            const token = 'fake-token';
            const headers = getAuthHeaders(token);
            expect(headers).toEqual({
                'Content-Type': 'application/json',
                'Authorization': 'Bearer fake-token'
            });
        });
    });

    describe('handleApiResponse', () => {
        it('returns json data when response is ok', async () => {
            const mockData = { success: true };
            const res = {
                ok: true,
                json: jest.fn().mockResolvedValue(mockData)
            };

            const result = await handleApiResponse(res);
            expect(result).toEqual(mockData);
        });

        it('calls onUnauthorized and throws on 401', async () => {
            const onUnauthorized = jest.fn();
            const res = {
                ok: false,
                status: 401
            };

            await expect(handleApiResponse(res, onUnauthorized))
                .rejects.toThrow('Authentication expired');
            expect(onUnauthorized).toHaveBeenCalled();
        });

        it('throws error with message from body', async () => {
            const res = {
                ok: false,
                status: 400,
                json: jest.fn().mockResolvedValue({ error: 'Bad Request' })
            };

            await expect(handleApiResponse(res))
                .rejects.toThrow('Bad Request');
        });

        it('throws generic error if body parsing fails', async () => {
            const res = {
                ok: false,
                status: 500,
                json: jest.fn().mockRejectedValue(new Error('Parse error'))
            };

            await expect(handleApiResponse(res))
                .rejects.toThrow('Request failed with status 500');
        });
    });

    describe('apiFetch', () => {
        beforeEach(() => {
            global.fetch = jest.fn();
        });

        afterEach(() => {
            jest.resetAllMocks();
        });

        it('calls fetch with correct arguments and returns data', async () => {
            const mockData = { data: 'test' };
            global.fetch.mockResolvedValue({
                ok: true,
                json: jest.fn().mockResolvedValue(mockData)
            });

            const result = await apiFetch('/api/test', { method: 'GET' });

            expect(global.fetch).toHaveBeenCalledWith('/api/test', { method: 'GET' });
            expect(result).toEqual(mockData);
        });

        it('passes onUnauthorized callback to handleApiResponse logic', async () => {
            const onUnauthorized = jest.fn();
            global.fetch.mockResolvedValue({
                ok: false,
                status: 401
            });

            await expect(apiFetch('/api/test', {}, onUnauthorized))
                .rejects.toThrow('Authentication expired');

            expect(onUnauthorized).toHaveBeenCalled();
        });
    });
});
