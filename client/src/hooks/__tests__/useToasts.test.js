import { renderHook, act } from '@testing-library/react';
import { useToasts } from '../useToasts.js';

describe('useToasts', () => {
    beforeEach(() => {
        jest.useFakeTimers();
    });

    afterEach(() => {
        jest.runOnlyPendingTimers();
        jest.useRealTimers();
    });

    it('should initialize with empty toasts array', () => {
        const { result } = renderHook(() => useToasts());
        expect(result.current.toasts).toEqual([]);
    });

    it('should add a toast with default type and timeout', () => {
        const { result } = renderHook(() => useToasts());
        
        act(() => {
            result.current.pushToast('Test message');
        });

        expect(result.current.toasts).toHaveLength(1);
        expect(result.current.toasts[0].msg).toBe('Test message');
        expect(result.current.toasts[0].type).toBe('info');
        expect(result.current.toasts[0].id).toBeDefined();
    });

    it('should add a toast with custom type', () => {
        const { result } = renderHook(() => useToasts());
        
        act(() => {
            result.current.pushToast('Success message', 'success');
        });

        expect(result.current.toasts).toHaveLength(1);
        expect(result.current.toasts[0].type).toBe('success');
    });

    it('should add a toast with custom timeout', () => {
        const { result } = renderHook(() => useToasts());
        
        act(() => {
            result.current.pushToast('Error message', 'error', 5000);
        });

        expect(result.current.toasts).toHaveLength(1);
        expect(result.current.toasts[0].type).toBe('error');
    });

    it('should auto-dismiss toast after timeout', () => {
        const { result } = renderHook(() => useToasts());
        
        act(() => {
            result.current.pushToast('Auto dismiss', 'info', 1000);
        });

        expect(result.current.toasts).toHaveLength(1);

        act(() => {
            jest.advanceTimersByTime(1000);
        });

        expect(result.current.toasts).toHaveLength(0);
    });

    it('should handle multiple toasts', () => {
        const { result } = renderHook(() => useToasts());
        
        act(() => {
            result.current.pushToast('First toast');
            result.current.pushToast('Second toast');
            result.current.pushToast('Third toast');
        });

        expect(result.current.toasts).toHaveLength(3);
        expect(result.current.toasts[0].msg).toBe('First toast');
        expect(result.current.toasts[1].msg).toBe('Second toast');
        expect(result.current.toasts[2].msg).toBe('Third toast');
    });

    it('should dismiss a specific toast by id', () => {
        const { result } = renderHook(() => useToasts());
        
        act(() => {
            result.current.pushToast('First toast');
            result.current.pushToast('Second toast');
            result.current.pushToast('Third toast');
        });

        const secondToastId = result.current.toasts[1].id;

        act(() => {
            result.current.dismissToast(secondToastId);
        });

        expect(result.current.toasts).toHaveLength(2);
        expect(result.current.toasts[0].msg).toBe('First toast');
        expect(result.current.toasts[1].msg).toBe('Third toast');
    });

    it('should clear timeout when dismissing a toast manually', () => {
        const { result } = renderHook(() => useToasts());
        
        act(() => {
            result.current.pushToast('Toast with timeout', 'info', 5000);
        });

        const toastId = result.current.toasts[0].id;

        act(() => {
            result.current.dismissToast(toastId);
        });

        expect(result.current.toasts).toHaveLength(0);

        // Advance time to ensure timeout doesn't cause issues
        act(() => {
            jest.advanceTimersByTime(5000);
        });

        expect(result.current.toasts).toHaveLength(0);
    });

    it('should handle dismissing non-existent toast gracefully', () => {
        const { result } = renderHook(() => useToasts());
        
        act(() => {
            result.current.pushToast('Only toast');
        });

        act(() => {
            result.current.dismissToast('non-existent-id');
        });

        expect(result.current.toasts).toHaveLength(1);
    });

    it('should clean up all timers on unmount', () => {
        const { result, unmount } = renderHook(() => useToasts());
        
        act(() => {
            result.current.pushToast('Toast 1', 'info', 5000);
            result.current.pushToast('Toast 2', 'info', 5000);
            result.current.pushToast('Toast 3', 'info', 5000);
        });

        expect(result.current.toasts).toHaveLength(3);

        unmount();

        // Advancing timers after unmount should not cause errors
        act(() => {
            jest.advanceTimersByTime(5000);
        });
    });

    it('should auto-dismiss multiple toasts at different times', () => {
        const { result } = renderHook(() => useToasts());
        
        act(() => {
            result.current.pushToast('Fast toast', 'info', 1000);
            result.current.pushToast('Medium toast', 'info', 2000);
            result.current.pushToast('Slow toast', 'info', 3000);
        });

        expect(result.current.toasts).toHaveLength(3);

        act(() => {
            jest.advanceTimersByTime(1000);
        });
        expect(result.current.toasts).toHaveLength(2);

        act(() => {
            jest.advanceTimersByTime(1000);
        });
        expect(result.current.toasts).toHaveLength(1);

        act(() => {
            jest.advanceTimersByTime(1000);
        });
        expect(result.current.toasts).toHaveLength(0);
    });
});
