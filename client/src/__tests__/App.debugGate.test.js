import { render, screen } from "@testing-library/react";

// Force the production build's behavior: debug tooling compiled out.
jest.mock("../utils/env", () => ({ isDebugEnabled: false }));

// PixelBackground drives a <canvas>; jsdom has no 2d context, so stub it out —
// this test is about the header's debug gate, not the background animation.
jest.mock("../components/PixelBackground", () => () => null);

import App from "../App";
import { useTheme } from "../hooks/useTheme";
import { useAuth } from "../hooks/useAuth";
import { useQuestBoard } from "../hooks/useQuestBoard";
import { useSoundFx } from "../hooks/useSoundFx";
import { useReducedMotionPreference } from "../hooks/useReducedMotionPreference";

jest.mock("../hooks/useTheme");
jest.mock("../hooks/useAuth");
jest.mock("../hooks/useQuestBoard");
jest.mock("../hooks/useSoundFx");
jest.mock("../hooks/useReducedMotionPreference");

// Minimal-but-complete quest board so App renders its authenticated header.
const questBoard = {
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
  description: "",
  setDescription: jest.fn(),
  priority: "medium",
  taskLevel: 1,
  playerStats: null,
  setPlayerStats: jest.fn(),
  dailyLoading: false,
  debugBusy: false,
  // Even with the panel "open", the production gate must keep it out of the DOM.
  showDebugTools: true,
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
  progressColor: jest.fn(() => "blue"),
  getQuestStatus: jest.fn(() => "todo"),
  getQuestStatusLabel: jest.fn(() => "To Do"),
  getQuestSideQuests: jest.fn(() => []),
  getSideQuestStatus: jest.fn(() => "todo"),
  getSideQuestStatusLabel: jest.fn(() => "To Do"),
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
  globalAura: { fillClass: "", emoji: "", mood: "" },
  globalLabel: "",
  dailyClaimed: false,
  xpPercent: 0,
};

describe("debug tools production gate", () => {
  beforeEach(() => {
    useTheme.mockReturnValue({
      theme: "dark",
      themeLabel: "Dark",
      themeProfile: { appearance: "dark" },
      toggleTheme: jest.fn(),
      soundVolume: 50,
      setSoundVolume: jest.fn(),
    });
    useAuth.mockReturnValue({
      token: "test-token",
      setToken: jest.fn(),
      showProfile: false,
      setShowProfile: jest.fn(),
    });
    useQuestBoard.mockReturnValue(questBoard);
    useSoundFx.mockReturnValue({ playSound: jest.fn() });
    useReducedMotionPreference.mockReturnValue(false);
  });

  test("debug toggle button is not rendered when debug is disabled", () => {
    render(<App />);
    // Sanity: the authenticated header rendered.
    expect(screen.getByText("Quest Tracker")).toBeInTheDocument();
    expect(screen.queryByLabelText("Show debug tools")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Hide debug tools")).not.toBeInTheDocument();
  });

  test("debug panel is not rendered even when showDebugTools is true", () => {
    render(<App />);
    expect(screen.queryByText("Debug Utilities")).not.toBeInTheDocument();
  });
});
