import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { apiFetch, getAuthHeaders } from '../utils/api.js';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:4001/api';

const initialState = {
    storylines: {}, // Map of campaignId -> storyline
    currentStoryline: null,
    isGenerating: false,
    hasNewUpdate: false,
    error: null,
    loading: false
};

const getToken = () => localStorage.getItem('auth_token');

const createStorylineStore = (set, get) => ({
    ...initialState,

    // Actions
    fetchStoryline: async (campaignId) => {
        set({ loading: true, error: null });
        const token = getToken();
        if (!token) {
            set({ error: 'No auth token found', loading: false });
            return null;
        }

        try {
            const response = await apiFetch(`${API_URL}/storylines/${campaignId}`, {
                method: 'GET',
                headers: getAuthHeaders(token)
            });

            // apiFetch returns the parsed JSON body directly if successful

            set((state) => ({
                storylines: {
                    ...state.storylines,
                    [campaignId]: response
                },
                currentStoryline: response,
                loading: false
            }));
            return response;
        } catch (error) {
            console.error('Failed to fetch storyline', error);
            set({ error: error.message, loading: false });
            return null;
        }
    },

    checkForUpdate: async (campaignId) => {
        set({ isGenerating: true });
        const token = getToken();
        if (!token) {
            set({ isGenerating: false, error: 'No auth token found' });
            return;
        }

        try {
            const response = await apiFetch(`${API_URL}/storylines/${campaignId}/check-update`, {
                method: 'GET',
                headers: getAuthHeaders(token)
            });
            const { updates } = response;

            // If updates returned, refresh storyline logic
            if (updates && updates.length > 0) {
                set({ hasNewUpdate: true });

                const current = get().storylines[campaignId];
                if (current) {
                    set((state) => ({
                        storylines: {
                            ...state.storylines,
                            [campaignId]: {
                                ...current,
                                updates: updates
                            }
                        },
                        // Also update current if matches
                        currentStoryline: state.currentStoryline?.campaignId === campaignId
                            ? { ...state.currentStoryline, updates }
                            : state.currentStoryline
                    }));
                }
            }

            set({ isGenerating: false });
        } catch (error) {
            console.error('Failed to check for updates', error);
            set({ isGenerating: false, error: error.message });
        }
    },

    markUpdateAsRead: () => {
        set({ hasNewUpdate: false });
    },

    resetStore: () => {
        set(initialState);
    }
});

export const useStorylineStore = create(
    process.env.NODE_ENV === 'development'
        ? devtools(createStorylineStore, { name: 'StorylineStore' })
        : createStorylineStore
);

export default useStorylineStore;
