import { act, renderHook } from '@testing-library/react';
import { AVAILABILITY_DEBOUNCE_MS, useUsernameAvailability } from './useUsernameAvailability.js';

function mockFetch(payload, { ok = true } = {}) {
    const fetchMock = jest.fn(() =>
        Promise.resolve({ ok, json: () => Promise.resolve(payload) })
    );
    global.fetch = fetchMock;
    return fetchMock;
}

beforeEach(() => {
    jest.useFakeTimers();
});

afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
});

async function flush() {
    // Let the resolved fetch promise chain settle inside act().
    await act(async () => {
        await Promise.resolve();
        await Promise.resolve();
    });
}

test('stays idle with an empty username and never calls the server', () => {
    const fetchMock = mockFetch({ available: true });
    const { result } = renderHook(() => useUsernameAvailability(''));
    expect(result.current.status).toBe('idle');
    act(() => jest.advanceTimersByTime(AVAILABILITY_DEBOUNCE_MS * 2));
    expect(fetchMock).not.toHaveBeenCalled();
});

test('reports checking immediately, then debounces a single request', async () => {
    const fetchMock = mockFetch({ available: true });
    const { result, rerender } = renderHook(({ name }) => useUsernameAvailability(name), {
        initialProps: { name: 'h' },
    });
    expect(result.current.status).toBe('checking');

    rerender({ name: 'he' });
    rerender({ name: 'her' });
    rerender({ name: 'hero' });
    act(() => jest.advanceTimersByTime(AVAILABILITY_DEBOUNCE_MS - 1));
    expect(fetchMock).not.toHaveBeenCalled();

    act(() => jest.advanceTimersByTime(1));
    await flush();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0][0])).toContain('/api/users/check-username/hero');
    expect(result.current.status).toBe('available');
    expect(result.current.username).toBe('hero');
});

test('maps taken / reserved responses and surfaces suggestions', async () => {
    mockFetch({ available: false, suggestions: ['hero7', 'hero_2'] });
    const { result } = renderHook(() => useUsernameAvailability('hero'));
    act(() => jest.advanceTimersByTime(AVAILABILITY_DEBOUNCE_MS));
    await flush();
    expect(result.current.status).toBe('taken');
    expect(result.current.suggestions).toEqual(['hero7', 'hero_2']);

    mockFetch({ available: false, reserved: true, suggestions: ['admin1'] });
    const utils = renderHook(() => useUsernameAvailability('admin'));
    act(() => jest.advanceTimersByTime(AVAILABILITY_DEBOUNCE_MS));
    await flush();
    expect(utils.result.current.status).toBe('reserved');
});

test('does not call the server while disabled (local validation failing)', () => {
    const fetchMock = mockFetch({ available: true });
    const { result } = renderHook(() => useUsernameAvailability('ab', { enabled: false }));
    expect(result.current.status).toBe('idle');
    act(() => jest.advanceTimersByTime(AVAILABILITY_DEBOUNCE_MS * 2));
    expect(fetchMock).not.toHaveBeenCalled();
});

test('network failures become an error status rather than throwing', async () => {
    global.fetch = jest.fn(() => Promise.reject(new Error('offline')));
    const { result } = renderHook(() => useUsernameAvailability('hero'));
    act(() => jest.advanceTimersByTime(AVAILABILITY_DEBOUNCE_MS));
    await flush();
    expect(result.current.status).toBe('error');
});

test('recheck re-runs the lookup for the same value', async () => {
    const fetchMock = mockFetch({ available: true });
    const { result } = renderHook(() => useUsernameAvailability('hero'));
    act(() => jest.advanceTimersByTime(AVAILABILITY_DEBOUNCE_MS));
    await flush();
    expect(fetchMock).toHaveBeenCalledTimes(1);

    act(() => result.current.recheck());
    act(() => jest.advanceTimersByTime(AVAILABILITY_DEBOUNCE_MS));
    await flush();
    expect(fetchMock).toHaveBeenCalledTimes(2);
});
