import { act, renderHook, waitFor } from '@testing-library/react';
import { useQuestData } from '../useQuestData.js';
import { resetQuestBoardStore } from '../../../../store/questBoardStore.js';

jest.mock('../../../../utils/api.js', () => ({
    apiFetch: jest.fn()
}));

const { apiFetch } = jest.requireMock('../../../../utils/api.js');

const createCampaignApi = () => ({
    activeCampaignFilter: null,
    taskCampaignSelection: null,
    refreshCampaigns: jest.fn(),
    getTasksEndpoint: () => '/api/tasks'
});

const createPlayerStatsApi = () => ({
    setPlayerStats: jest.fn(),
    handleXpPayload: jest.fn()
});

const setupHook = () => {
    const reloadTasksRef = { current: () => Promise.resolve() };
    const campaignApi = createCampaignApi();
    const playerStatsApi = createPlayerStatsApi();
    const hook = renderHook(() => useQuestData({
        token: null,
        getAuthHeaders: () => ({ Authorization: 'Bearer test-token' }),
        onUnauthorized: jest.fn(),
        pushToast: jest.fn(),
        campaignApi,
        playerStatsApi,
        reloadTasksRef,
        skipInitialFetch: true
    }));
    return { hook, campaignApi };
};

beforeEach(async () => {
    await resetQuestBoardStore({ clearPersisted: true });
    apiFetch.mockReset();
});

test('addTask persists new quest and resets composer fields', async () => {
    apiFetch.mockImplementation((url, options = {}) => {
        if (url === '/api/tasks' && options.method === 'POST') {
            const body = JSON.parse(options.body);
            return Promise.resolve({
                id: 42,
                description: body.description,
                status: 'todo'
            });
        }
        throw new Error(`Unhandled request: ${url}`);
    });

    const { hook } = setupHook();

    await act(async () => {
        hook.result.current.setDescription('Write tests');
    });
    await act(async () => {
        await hook.result.current.addTask();
    });

    await waitFor(() => expect(hook.result.current.description).toBe(''));
    await waitFor(() => expect(hook.result.current.quests[0]).toMatchObject({ id: 42, description: 'Write tests' }));
});

test('addSideQuest updates quest list when API succeeds', async () => {
    apiFetch.mockImplementation((url, options = {}) => {
        if (url === '/api/tasks/7/subtasks' && options.method === 'POST') {
            return Promise.resolve({
                id: 7,
                description: 'Parent quest',
                status: 'todo',
                side_quests: [{ id: 99, description: 'Nested task', status: 'todo' }]
            });
        }
        throw new Error(`Unhandled request: ${url}`);
    });

    const { hook } = setupHook();
    act(() => {
        hook.result.current.setQuests([{ id: 7, description: 'Parent quest', status: 'todo', side_quests: [] }]);
    });

    await act(async () => {
        await hook.result.current.addSideQuest(7, 'Nested task');
    });

    expect(hook.result.current.quests[0].side_quests).toHaveLength(1);
    expect(hook.result.current.quests[0].side_quests[0].description).toBe('Nested task');
});
