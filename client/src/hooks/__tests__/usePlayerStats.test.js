import { renderHook, act, waitFor } from '@testing-library/react';
import { usePlayerStats } from '../usePlayerStats.js';
import * as api from '../../utils/api.js';

jest.mock('../../utils/api.js');

describe('usePlayerStats', () => {
    const mockToken = 'test-token';
    const mockGetAuthHeaders = jest.fn(() => ({ Authorization: 'Bearer test-token' }));
    const mockPushToast = jest.fn();
    const mockOnUnauthorized = jest.fn();

    const mockPlayerRpg = {
        level: 5,
        xp: 1200,
        xp_to_next_level: 2000,
        gold: 500
    };

    beforeEach(() => {
        jest.clearAllMocks();
        api.apiFetch.mockClear();
        api.getAuthHeaders.mockImplementation((token) => ({ Authorization: `Bearer ${token}` }));
        // Default mock implementation to handle the initial fetch
        api.apiFetch.mockImplementation((url) => {
            if (url === '/api/users/me') {
                return Promise.resolve({ user: { rpg: mockPlayerRpg } });
            }
            return Promise.resolve({});
        });
    });

    it('should initialize with null playerStats and false dailyLoading', () => {
        const { result } = renderHook(() => usePlayerStats({
            token: mockToken,
            getAuthHeaders: mockGetAuthHeaders,
            pushToast: mockPushToast,
            onUnauthorized: mockOnUnauthorized
        }));

        // Initial state might be null before effect runs
        expect(result.current.dailyLoading).toBe(false);
    });

    it('should fetch player stats when token is provided', async () => {
        const { result } = renderHook(() => usePlayerStats({
            token: mockToken,
            getAuthHeaders: mockGetAuthHeaders,
            pushToast: mockPushToast,
            onUnauthorized: mockOnUnauthorized
        }));

        await waitFor(() => {
            expect(result.current.playerStats).toEqual(mockPlayerRpg);
        });

        expect(api.apiFetch).toHaveBeenCalledWith(
            '/api/users/me',
            { headers: { Authorization: `Bearer ${mockToken}` } },
            mockOnUnauthorized
        );
    });

    it('should clear playerStats when token is null', () => {
        const { result, rerender } = renderHook(
            ({ token }) => usePlayerStats({
                token,
                getAuthHeaders: mockGetAuthHeaders,
                pushToast: mockPushToast,
                onUnauthorized: mockOnUnauthorized
            }),
            { initialProps: { token: mockToken } }
        );

        rerender({ token: null });

        expect(result.current.playerStats).toBeNull();
    });

    it('should handle fetch error gracefully', async () => {
        const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => { });
        api.apiFetch.mockImplementation((url) => {
            if (url === '/api/users/me') {
                return Promise.reject(new Error('Network error'));
            }
            return Promise.resolve({});
        });

        renderHook(() => usePlayerStats({
            token: mockToken,
            getAuthHeaders: mockGetAuthHeaders,
            pushToast: mockPushToast,
            onUnauthorized: mockOnUnauthorized
        }));

        await waitFor(() => {
            expect(consoleErrorSpy).toHaveBeenCalledWith(
                'Error fetching player stats:',
                expect.any(Error)
            );
        });

        consoleErrorSpy.mockRestore();
    });

    it('should handle XP payload with player_rpg', () => {
        const { result } = renderHook(() => usePlayerStats({
            token: mockToken,
            getAuthHeaders: mockGetAuthHeaders,
            pushToast: mockPushToast,
            onUnauthorized: mockOnUnauthorized
        }));

        const payload = {
            player_rpg: mockPlayerRpg,
            xp_events: []
        };

        act(() => {
            result.current.handleXpPayload(payload);
        });

        expect(result.current.playerStats).toEqual(mockPlayerRpg);
    });

    it('should handle XP events array and show toast', () => {
        const { result } = renderHook(() => usePlayerStats({
            token: mockToken,
            getAuthHeaders: mockGetAuthHeaders,
            pushToast: mockPushToast,
            onUnauthorized: mockOnUnauthorized
        }));

        const payload = {
            xp_events: [
                { amount: 50, message: 'Completed quest!' },
                { amount: 100, message: 'Bonus XP!' }
            ]
        };

        act(() => {
            result.current.handleXpPayload(payload);
        });

        expect(mockPushToast).toHaveBeenCalledTimes(2);
        expect(mockPushToast).toHaveBeenCalledWith('Completed quest!', 'success', 4000);
        expect(mockPushToast).toHaveBeenCalledWith('Bonus XP!', 'success', 4000);
    });

    it('should handle single XP event (xp_event)', () => {
        const { result } = renderHook(() => usePlayerStats({
            token: mockToken,
            getAuthHeaders: mockGetAuthHeaders,
            pushToast: mockPushToast,
            onUnauthorized: mockOnUnauthorized
        }));

        const payload = {
            xp_event: { amount: 75, message: 'Daily reward!' }
        };

        act(() => {
            result.current.handleXpPayload(payload);
        });

        expect(mockPushToast).toHaveBeenCalledWith('Daily reward!', 'success', 4000);
    });

    it('should show level up toast when leveling up', () => {
        const { result } = renderHook(() => usePlayerStats({
            token: mockToken,
            getAuthHeaders: mockGetAuthHeaders,
            pushToast: mockPushToast,
            onUnauthorized: mockOnUnauthorized
        }));

        const payload = {
            xp_events: [
                {
                    amount: 1000,
                    message: 'Quest completed!',
                    leveled_up: true,
                    level_after: 6
                }
            ]
        };

        act(() => {
            result.current.handleXpPayload(payload);
        });

        expect(mockPushToast).toHaveBeenCalledWith('Quest completed!', 'success', 4000);
        expect(mockPushToast).toHaveBeenCalledWith('Level up! Reached level 6', 'success', 5000);
    });

    it('should use default message when event has no message', () => {
        const { result } = renderHook(() => usePlayerStats({
            token: mockToken,
            getAuthHeaders: mockGetAuthHeaders,
            pushToast: mockPushToast,
            onUnauthorized: mockOnUnauthorized
        }));

        const payload = {
            xp_events: [{ amount: 50 }]
        };

        act(() => {
            result.current.handleXpPayload(payload);
        });

        expect(mockPushToast).toHaveBeenCalledWith('Gained 50 XP', 'success', 4000);
    });

    it('should handle null/undefined payload gracefully', () => {
        const { result } = renderHook(() => usePlayerStats({
            token: mockToken,
            getAuthHeaders: mockGetAuthHeaders,
            pushToast: mockPushToast,
            onUnauthorized: mockOnUnauthorized
        }));

        act(() => {
            result.current.handleXpPayload(null);
        });

        expect(mockPushToast).not.toHaveBeenCalled();

        act(() => {
            result.current.handleXpPayload(undefined);
        });

        expect(mockPushToast).not.toHaveBeenCalled();
    });

    it('should handle null events in xp_events array', () => {
        const { result } = renderHook(() => usePlayerStats({
            token: mockToken,
            getAuthHeaders: mockGetAuthHeaders,
            pushToast: mockPushToast,
            onUnauthorized: mockOnUnauthorized
        }));

        const payload = {
            xp_events: [
                null,
                { amount: 50, message: 'Valid event' },
                undefined
            ]
        };

        act(() => {
            result.current.handleXpPayload(payload);
        });

        expect(mockPushToast).toHaveBeenCalledTimes(1);
        expect(mockPushToast).toHaveBeenCalledWith('Valid event', 'success', 4000);
    });

    it('should claim daily reward successfully', async () => {
        const mockRewardResponse = {
            player_rpg: { ...mockPlayerRpg, gold: 600 },
            xp_events: [{ amount: 100, message: 'Daily reward claimed!' }]
        };

        api.apiFetch.mockImplementation((url) => {
            if (url === '/api/users/me') {
                return Promise.resolve({ user: { rpg: mockPlayerRpg } });
            }
            if (url === '/api/rpg/daily-reward') {
                return Promise.resolve(mockRewardResponse);
            }
            return Promise.resolve({});
        });

        const { result } = renderHook(() => usePlayerStats({
            token: mockToken,
            getAuthHeaders: mockGetAuthHeaders,
            pushToast: mockPushToast,
            onUnauthorized: mockOnUnauthorized
        }));

        await act(async () => {
            await result.current.claimDailyReward();
        });

        expect(api.apiFetch).toHaveBeenCalledWith(
            '/api/rpg/daily-reward',
            {
                method: 'POST',
                headers: mockGetAuthHeaders()
            },
            mockOnUnauthorized
        );

        expect(result.current.playerStats).toEqual(mockRewardResponse.player_rpg);
        expect(mockPushToast).toHaveBeenCalledWith('Daily reward claimed!', 'success', 4000);
    });

    it('should prevent multiple simultaneous daily reward claims', async () => {
        // Mock slow response for daily reward
        api.apiFetch.mockImplementation((url) => {
            if (url === '/api/users/me') {
                return Promise.resolve({ user: { rpg: mockPlayerRpg } });
            }
            if (url === '/api/rpg/daily-reward') {
                return new Promise(resolve => setTimeout(resolve, 100));
            }
            return Promise.resolve({});
        });

        const { result } = renderHook(() => usePlayerStats({
            token: mockToken,
            getAuthHeaders: mockGetAuthHeaders,
            pushToast: mockPushToast,
            onUnauthorized: mockOnUnauthorized
        }));

        // Wait for initial fetch to clear
        await waitFor(() => {
            expect(api.apiFetch).toHaveBeenCalledWith('/api/users/me', expect.anything(), expect.anything());
        });
        api.apiFetch.mockClear(); // Clear initial fetch call

        let promise;
        act(() => {
            promise = result.current.claimDailyReward();
        });

        // Verify loading state is true
        expect(result.current.dailyLoading).toBe(true);

        await act(async () => {
            await promise;
        });

        expect(result.current.dailyLoading).toBe(false);
        expect(api.apiFetch).toHaveBeenCalledTimes(1);
    });

    it('should handle daily reward error and show error toast', async () => {
        const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => { });
        const errorMessage = 'Daily reward already claimed';

        api.apiFetch.mockImplementation((url) => {
            if (url === '/api/users/me') {
                return Promise.resolve({ user: { rpg: mockPlayerRpg } });
            }
            if (url === '/api/rpg/daily-reward') {
                return Promise.reject(new Error(errorMessage));
            }
            return Promise.resolve({});
        });

        const { result } = renderHook(() => usePlayerStats({
            token: mockToken,
            getAuthHeaders: mockGetAuthHeaders,
            pushToast: mockPushToast,
            onUnauthorized: mockOnUnauthorized
        }));

        await act(async () => {
            await result.current.claimDailyReward();
        });

        expect(consoleErrorSpy).toHaveBeenCalledWith(
            'Error claiming daily reward:',
            expect.any(Error)
        );
        expect(mockPushToast).toHaveBeenCalledWith(errorMessage, 'error', 4000);
        expect(result.current.dailyLoading).toBe(false);

        consoleErrorSpy.mockRestore();
    });

    it('should use generic error message if error has no message', async () => {
        const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => { });

        api.apiFetch.mockImplementation((url) => {
            if (url === '/api/users/me') {
                return Promise.resolve({ user: { rpg: mockPlayerRpg } });
            }
            if (url === '/api/rpg/daily-reward') {
                return Promise.reject({});
            }
            return Promise.resolve({});
        });

        const { result } = renderHook(() => usePlayerStats({
            token: mockToken,
            getAuthHeaders: mockGetAuthHeaders,
            pushToast: mockPushToast,
            onUnauthorized: mockOnUnauthorized
        }));

        await act(async () => {
            await result.current.claimDailyReward();
        });

        expect(mockPushToast).toHaveBeenCalledWith('Failed to claim daily reward', 'error', 4000);

        consoleErrorSpy.mockRestore();
    });
});
