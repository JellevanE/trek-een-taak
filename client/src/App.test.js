import { render, screen, fireEvent, within } from '@testing-library/react';
import App from './App';
import { useTheme } from './hooks/useTheme';
import { useAuth } from './hooks/useAuth';
import { useQuestBoard } from './hooks/useQuestBoard';
import { useSoundFx } from './hooks/useSoundFx';
import { useReducedMotionPreference } from './hooks/useReducedMotionPreference';

jest.mock('./hooks/useTheme');
jest.mock('./hooks/useAuth');
jest.mock('./hooks/useQuestBoard');
jest.mock('./hooks/useSoundFx');
jest.mock('./hooks/useReducedMotionPreference');

const mockUseTheme = useTheme;
const mockUseAuth = useAuth;
const mockUseQuestBoard = useQuestBoard;
const mockUseSoundFx = useSoundFx;
const mockUseReducedMotionPreference = useReducedMotionPreference;

const defaultQuestBoard = {
    quests: [],
    campaigns: [],
    campaignSidebarCollapsed: false,
    setCampaignSidebarCollapsed: jest.fn(),
    activeCampaignFilter: null,
    setActiveCampaignFilter: jest.fn(),
    taskCampaignSelection: null,
    setTaskCampaignSelection: jest.fn(),
    campaignFormMode: null,
    campaignFormValues: {},
    campaignFormBusy: false,
    campaignFormError: null,
    description: '',
    setDescription: jest.fn(),
    priority: 'medium',
    taskLevel: 1,
    playerStats: null,
    setPlayerStats: jest.fn(),
    dailyLoading: false,
    debugBusy: false,
    showDebugTools: false,
    setShowDebugTools: jest.fn(),
    editingQuest: null,
    editingQuestInputRef: { current: null },
    setEditingQuest: jest.fn(),
    selectedQuestId: null,
    selectedSideQuest: null,
    editingSideQuest: null,
    sideQuestDescriptionMap: {},
    setSideQuestDescriptionMap: jest.fn(),
    addingSideQuestTo: null,
    setAddingSideQuestTo: jest.fn(),
    loadingSideQuestAdds: new Set(),
    collapsedMap: {},
    addInputRefs: { current: {} },
    undoQueue: [],
    getQuestProgress: jest.fn(() => 50),
    progressColor: jest.fn(() => 'blue'),
    getQuestStatus: jest.fn(() => 'todo'),
    getQuestStatusLabel: jest.fn(() => 'To Do'),
    getQuestSideQuests: jest.fn(() => []),
    getSideQuestStatus: jest.fn(() => 'todo'),
    getSideQuestStatusLabel: jest.fn(() => 'To Do'),
    isInteractiveTarget: jest.fn(() => false),
    idsMatch: jest.fn((a, b) => a === b),
    openCampaignCreateForm: jest.fn(),
    openCampaignEditForm: jest.fn(),
    closeCampaignForm: jest.fn(),
    handleCampaignFieldChange: jest.fn(),
    submitCampaignForm: jest.fn(),
    addTask: jest.fn(),
    addSideQuest: jest.fn(),
    toggleCollapse: jest.fn(),
    handleSelectQuest: jest.fn(),
    handleSelectSideQuest: jest.fn(),
    dismissUndoEntry: jest.fn(),
    handleUndoDelete: jest.fn(),
    deleteTask: jest.fn(),
    updateTask: jest.fn(),
    toasts: [],
    dismissToast: jest.fn(),
    pulsingQuests: {},
    pulsingSideQuests: {},
    glowQuests: {},
    celebratingQuests: {},
    spawnQuests: {},
    claimDailyReward: jest.fn(),
    clearAllQuests: jest.fn(),
    seedDemoQuests: jest.fn(),
    grantXp: jest.fn(),
    resetRpgStats: jest.fn(),
    setTaskStatus: jest.fn(),
    setSideQuestStatus: jest.fn(),
    deleteSideQuest: jest.fn(),
    startEditingSideQuest: jest.fn(),
    handleSideQuestEditChange: jest.fn(),
    cancelSideQuestEdit: jest.fn(),
    saveSideQuestEdit: jest.fn(),
    handleEditChange: jest.fn(),
    cyclePriority: jest.fn(),
    cycleTaskLevel: jest.fn(),
    cycleEditingPriority: jest.fn(),
    cycleEditingLevel: jest.fn(),
    smoothDrag: null,
    campaignLookup: new Map(),
    hasCampaigns: false,
    selectedCampaign: null,
    globalProgress: { percent: 0 },
    globalAura: { fillClass: '', emoji: '', mood: '' },
    globalLabel: '',
    dailyClaimed: false,
    xpPercent: 0,
};

describe('App', () => {
    beforeEach(() => {
        mockUseTheme.mockReturnValue({
            theme: 'dark',
            themeLabel: 'Dark',
            themeProfile: { appearance: 'dark' },
            toggleTheme: jest.fn(),
            soundVolume: 50,
            setSoundVolume: jest.fn(),
        });
        mockUseAuth.mockReturnValue({
            token: null,
            setToken: jest.fn(),
            showProfile: false,
            setShowProfile: jest.fn(),
        });
        mockUseQuestBoard.mockReturnValue(defaultQuestBoard);
        mockUseSoundFx.mockReturnValue({
            playSound: jest.fn(),
        });
        mockUseReducedMotionPreference.mockReturnValue(false);
    });

    test('renders login screen when not authenticated', () => {
        render(<App />);
        expect(screen.getByText('Welcome to Quest Tracker')).toBeInTheDocument();
        expect(screen.getByText('Please sign in or create an account to start managing your quests.')).toBeInTheDocument();
    });

    test('renders quest board when authenticated', () => {
        mockUseAuth.mockReturnValue({
            token: 'test-token',
            setToken: jest.fn(),
            showProfile: false,
            setShowProfile: jest.fn(),
        });
        render(<App />);
        expect(screen.getByText('Quest Tracker')).toBeInTheDocument();
        expect(screen.getByText('Quest management made easy, but also way harder.')).toBeInTheDocument();
    });

    test('toggles theme', () => {
        const toggleTheme = jest.fn();
        mockUseTheme.mockReturnValue({
            theme: 'dark',
            themeLabel: 'Dark',
            themeProfile: { appearance: 'dark' },
            toggleTheme: toggleTheme,
            soundVolume: 50,
            setSoundVolume: jest.fn(),
        });
        render(<App />);
        fireEvent.click(screen.getByText('Theme: Dark'));
        expect(toggleTheme).toHaveBeenCalled();
    });

    test('shows and hides profile modal', () => {
        const setShowProfile = jest.fn();
        mockUseAuth.mockReturnValue({
            token: 'test-token',
            setToken: jest.fn(),
            showProfile: false,
            setShowProfile: setShowProfile,
        });
        render(<App />);
        fireEvent.click(screen.getByText('Profile'));
        expect(setShowProfile).toHaveBeenCalledWith(expect.any(Function));
    });

    test('shows and hides debug tools', () => {
        const setShowDebugTools = jest.fn();
        mockUseQuestBoard.mockReturnValue({
            ...defaultQuestBoard,
            showDebugTools: false,
            setShowDebugTools: setShowDebugTools,
        });
        mockUseAuth.mockReturnValue({ token: 'test-token' });
        render(<App />);
        fireEvent.click(screen.getByText('Debug Tools'));
        expect(setShowDebugTools).toHaveBeenCalledWith(expect.any(Function));
    });

    test('shows and hides keyboard shortcuts', () => {
        mockUseAuth.mockReturnValue({ token: 'test-token' });
        render(<App />);
        fireEvent.click(screen.getByText('Keyboard Shortcuts'));
        expect(screen.getByText('Keep your hands on the keys to fly through quests.')).toBeInTheDocument();
        fireEvent.click(screen.getByText('Close'));
        expect(screen.queryByText('Keep your hands on the keys to fly through quests.')).not.toBeInTheDocument();
    });

    test('renders quests when available', () => {
        mockUseAuth.mockReturnValue({ token: 'test-token' });
        mockUseQuestBoard.mockReturnValue({
            ...defaultQuestBoard,
            quests: [{ id: 1, description: 'Test Quest', side_quests: [] }],
            getQuestSideQuests: jest.fn().mockReturnValue([]),
        });
        render(<App />);
        expect(screen.getByText('Test Quest')).toBeInTheDocument();
    });

    describe('Debug Panel', () => {
        beforeEach(() => {
            mockUseAuth.mockReturnValue({ token: 'test-token' });
        });

        test('shows and hides the debug panel', () => {
            const setShowDebugTools = jest.fn();
            mockUseQuestBoard.mockReturnValue({
                ...defaultQuestBoard,
                showDebugTools: false,
                setShowDebugTools: setShowDebugTools,
            });
            render(<App />);
            fireEvent.click(screen.getByText('Debug Tools'));
            expect(setShowDebugTools).toHaveBeenCalledWith(expect.any(Function));
        });

        test('calls clearAllQuests when "Clear Quests" is clicked', () => {
            const clearAllQuests = jest.fn();
            mockUseQuestBoard.mockReturnValue({
                ...defaultQuestBoard,
                showDebugTools: true,
                clearAllQuests: clearAllQuests,
            });
            render(<App />);
            fireEvent.click(screen.getByText('Clear Quests'));
            expect(clearAllQuests).toHaveBeenCalled();
        });

        test('calls seedDemoQuests when "Seed 5 Quests" is clicked', () => {
            const seedDemoQuests = jest.fn();
            mockUseQuestBoard.mockReturnValue({
                ...defaultQuestBoard,
                showDebugTools: true,
                seedDemoQuests: seedDemoQuests,
            });
            render(<App />);
            fireEvent.click(screen.getByText('Seed 5 Quests'));
            expect(seedDemoQuests).toHaveBeenCalledWith(5);
        });

        test('calls grantXp when "+250 XP" is clicked', () => {
            const grantXp = jest.fn();
            mockUseQuestBoard.mockReturnValue({
                ...defaultQuestBoard,
                showDebugTools: true,
                grantXp: grantXp,
            });
            render(<App />);
            fireEvent.click(screen.getByText('+250 XP'));
            expect(grantXp).toHaveBeenCalledWith(250);
        });

        test('calls resetRpgStats when "Reset RPG" is clicked', () => {
            const resetRpgStats = jest.fn();
            mockUseQuestBoard.mockReturnValue({
                ...defaultQuestBoard,
                showDebugTools: true,
                resetRpgStats: resetRpgStats,
            });
            render(<App />);
            fireEvent.click(screen.getByText('Reset RPG'));
            expect(resetRpgStats).toHaveBeenCalled();
        });
    });

    describe('Campaign Sidebar', () => {
        beforeEach(() => {
            mockUseAuth.mockReturnValue({ token: 'test-token' });
        });

        test('collapses and expands the sidebar', () => {
            const setCampaignSidebarCollapsed = jest.fn();
            mockUseQuestBoard.mockReturnValue({
                ...defaultQuestBoard,
                campaignSidebarCollapsed: false,
                setCampaignSidebarCollapsed: setCampaignSidebarCollapsed,
            });
            render(<App />);
            fireEvent.click(screen.getByLabelText('Collapse campaigns panel'));
            expect(setCampaignSidebarCollapsed).toHaveBeenCalledWith(expect.any(Function));
        });

        test('filters by all quests', () => {
            const setActiveCampaignFilter = jest.fn();
            mockUseQuestBoard.mockReturnValue({
                ...defaultQuestBoard,
                activeCampaignFilter: 1,
                setActiveCampaignFilter: setActiveCampaignFilter,
            });
            render(<App />);
            fireEvent.click(screen.getByText('All quests'));
            expect(setActiveCampaignFilter).toHaveBeenCalledWith(null);
        });

        test('filters by a specific campaign', () => {
            const setActiveCampaignFilter = jest.fn();
            mockUseQuestBoard.mockReturnValue({
                ...defaultQuestBoard,
                campaigns: [{ id: 1, name: 'Test Campaign' }],
                hasCampaigns: true,
                activeCampaignFilter: null,
                setActiveCampaignFilter: setActiveCampaignFilter,
            });
            render(<App />);
            const sidebar = screen.getByRole('complementary', { name: /campaigns/i });
            fireEvent.click(within(sidebar).getByText('Test Campaign'));
            expect(setActiveCampaignFilter).toHaveBeenCalledWith(1);
        });
    });

    describe('Add Quest Form', () => {
        beforeEach(() => {
            mockUseAuth.mockReturnValue({ token: 'test-token' });
        });

        test('updates description', () => {
            const setDescription = jest.fn();
            mockUseQuestBoard.mockReturnValue({
                ...defaultQuestBoard,
                setDescription: setDescription,
            });
            render(<App />);
            fireEvent.change(screen.getByPlaceholderText('Quest description'), { target: { value: 'New Quest' } });
            expect(setDescription).toHaveBeenCalledWith('New Quest');
        });

        test('cycles priority', () => {
            const cyclePriority = jest.fn();
            mockUseQuestBoard.mockReturnValue({
                ...defaultQuestBoard,
                cyclePriority: cyclePriority,
            });
            render(<App />);
            fireEvent.click(screen.getByTitle('Cycle quest urgency'));
            expect(cyclePriority).toHaveBeenCalled();
        });

        test('cycles task level', () => {
            const cycleTaskLevel = jest.fn();
            mockUseQuestBoard.mockReturnValue({
                ...defaultQuestBoard,
                cycleTaskLevel: cycleTaskLevel,
            });
            render(<App />);
            fireEvent.click(screen.getByTitle('Cycle quest level'));
            expect(cycleTaskLevel).toHaveBeenCalled();
        });

        test('selects a campaign', () => {
            const setTaskCampaignSelection = jest.fn();
            mockUseQuestBoard.mockReturnValue({
                ...defaultQuestBoard,
                campaigns: [{ id: 1, name: 'Test Campaign' }],
                hasCampaigns: true,
                setTaskCampaignSelection: setTaskCampaignSelection,
            });
            render(<App />);
            fireEvent.change(screen.getByLabelText('Assign quest to campaign'), { target: { value: '1' } });
            expect(setTaskCampaignSelection).toHaveBeenCalledWith(1);
        });

        test('calls addTask when "Add Quest" is clicked', () => {
            const addTask = jest.fn();
            mockUseQuestBoard.mockReturnValue({
                ...defaultQuestBoard,
                addTask: addTask,
            });
            render(<App />);
            fireEvent.click(screen.getByText('Add Quest'));
            expect(addTask).toHaveBeenCalled();
        });
    });
});