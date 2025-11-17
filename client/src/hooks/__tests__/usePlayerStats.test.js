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
    });

    it('should initialize with null playerStats and false dailyLoading', () => {
        const { result } = renderHook(() => usePlayerStats({
            token: mockToken,
            getAuthHeaders: mockGetAuthHeaders,
            pushToast: mockPushToast,
            onUnauthorized: mockOnUnauthorized
        }));

        expect(result.current.playerStats).toBeNull();
        expect(result.current.dailyLoading).toBe(false);
    });

    it('should fetch player stats when token is provided', async () => {
        api.apiFetch.mockResolvedValueOnce({
            user: {
                rpg: mockPlayerRpg
            }
        });

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
        const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
        api.apiFetch.mockRejectedValueOnce(new Error('Network error'));

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

        api.apiFetch.mockResolvedValueOnce(mockRewardResponse);

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
        api.apiFetch.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));

        const { result } = renderHook(() => usePlayerStats({
            token: mockToken,
            getAuthHeaders: mockGetAuthHeaders,
            pushToast: mockPushToast,
            onUnauthorized: mockOnUnauthorized
        }));

        act(() => {
            result.current.claimDailyReward();
            result.current.claimDailyReward();
            result.current.claimDailyReward();
        });

        await waitFor(() => {
            expect(result.current.dailyLoading).toBe(false);
        });

        // Should only call once
        expect(api.apiFetch).toHaveBeenCalledTimes(1);
    });

    it('should handle daily reward error and show error toast', async () => {
        const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
        const errorMessage = 'Daily reward already claimed';
        api.apiFetch.mockRejectedValueOnce(new Error(errorMessage));

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
        const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
        api.apiFetch.mockRejectedValueOnce({});

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

    it('should set dailyLoading during claim and reset after', async () => {
        api.apiFetch.mockImplementation(() => new Promise(resolve => setTimeout(() => resolve({ xp_events: [] }), 100)));

        const { result } = renderHook(() => usePlayerStats({
            token: mockToken,
            getAuthHeaders: mockGetAuthHeaders,
            pushToast: mockPushToast,
            onUnauthorized: mockOnUnauthorized
        }));

        expect(result.current.dailyLoading).toBe(false);

        act(() => {
            result.current.claimDailyReward();
        });

        expect(result.current.dailyLoading).toBe(true);

        await waitFor(() => {
            expect(result.current.dailyLoading).toBe(false);
        });
    });
});
