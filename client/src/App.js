import React from 'react';
import './App.css';
import Profile from './Profile';
import { useTheme } from './hooks/useTheme';
import { useAuth } from './hooks/useAuth';
import { useQuestBoard } from './hooks/useQuestBoard';

const KEY_LABEL_MAP = {
    ArrowDown: '↓',
    ArrowUp: '↑',
    ArrowLeft: '←',
    ArrowRight: '→',
    Enter: 'Enter',
    Escape: 'Esc',
    Space: 'Space'
};

const KEYBOARD_SHORTCUTS = [
    {
        keys: [
            ['J'],
            ['ArrowDown']
        ],
        description: 'Select next quest'
    },
    {
        keys: [
            ['K'],
            ['ArrowUp']
        ],
        description: 'Select previous quest'
    },
    {
        keys: [
            ['Space'],
            ['Enter']
        ],
        description: 'Toggle selected quest completion'
    },
    {
        keys: [
            ['C']
        ],
        description: 'Cycle quest urgency'
    },
    {
        keys: [
            ['L']
        ],
        description: 'Cycle quest level'
    },
    {
        keys: [
            ['Tab']
        ],
        description: 'Dive into or advance through side quests'
    },
    {
        keys: [
            ['Shift', 'Tab']
        ],
        description: 'Move to previous side quest or back to quest'
    },
    {
        keys: [
            ['ArrowRight']
        ],
        description: 'Expand quest and focus first side quest'
    },
    {
        keys: [
            ['ArrowLeft']
        ],
        description: 'Return from side quest to quest'
    },
    {
        keys: [
            ['Delete'],
            ['Backspace']
        ],
        description: 'Delete selected quest or side quest (with confirm)'
    },
    {
        keys: [
            ['Escape']
        ],
        description: 'Clear active selection'
    }
];

const formatKeyLabel = (key) => KEY_LABEL_MAP[key] || key;

function App() {
    const { theme, setTheme } = useTheme();
    const { token, setToken, showProfile, setShowProfile } = useAuth();
    const [showShortcuts, setShowShortcuts] = React.useState(false);
    const shortcutsPanelRef = React.useRef(null);
    const {
        quests,
        campaigns,
        campaignSidebarCollapsed,
        setCampaignSidebarCollapsed,
        activeCampaignFilter,
        setActiveCampaignFilter,
        taskCampaignSelection,
        setTaskCampaignSelection,
        campaignFormMode,
        campaignFormValues,
        campaignFormBusy,
        campaignFormError,
        description,
        setDescription,
        priority,
        taskLevel,
        playerStats,
        setPlayerStats,
        dailyLoading,
        debugBusy,
        showDebugTools,
        setShowDebugTools,
        editingQuest,
        setEditingQuest,
        selectedQuestId,
        selectedSideQuest,
        editingSideQuest,
        addingSideQuestTo,
        setAddingSideQuestTo,
        collapsedMap,
        draggedQuestId,
        dragOverQuestId,
        dragPosition,
        sideQuestDragOver,
        setSideQuestDragOver,
        undoQueue,
        getQuestProgress,
        progressColor,
        getQuestStatus,
        getQuestStatusLabel,
        getQuestSideQuests,
        getSideQuestStatus,
        getSideQuestStatusLabel,
        isInteractiveTarget,
        idsMatch,
        openCampaignCreateForm,
        openCampaignEditForm,
        closeCampaignForm,
        handleCampaignFieldChange,
        submitCampaignForm,
        addTask,
        toggleCollapse,
        handleSelectQuest,
        handleSelectSideQuest,
        handleDragStart,
        handleDragEnd,
        handleDragOver,
        handleDragLeave,
        handleDrop,
        handleSideQuestDragStart,
        handleSideQuestDragEnd,
        handleSideQuestDragOver,
        handleSideQuestDrop,
        dismissUndoEntry,
        handleUndoDelete,
        deleteTask,
        toasts,
        pulsingQuests,
        pulsingSideQuests,
        glowQuests,
        celebratingQuests,
        spawnQuests,
        claimDailyReward,
        clearAllQuests,
        seedDemoQuests,
        grantXp,
        resetRpgStats,
        setTaskStatus,
        setSideQuestStatus,
        deleteSideQuest,
        startEditingSideQuest,
        handleSideQuestEditChange,
        cancelSideQuestEdit,
        saveSideQuestEdit,
        cyclePriority,
        cycleTaskLevel,
        renderEditForm,
        renderAddSideQuestForm,
        campaignLookup,
        hasCampaigns,
        selectedCampaign,
        globalProgress,
        globalAura,
        globalLabel,
        dailyClaimed,
        xpPercent
    } = useQuestBoard({ token, setToken });

    React.useEffect(() => {
        if (showShortcuts && shortcutsPanelRef.current) {
            shortcutsPanelRef.current.focus();
        }
    }, [showShortcuts]);

    React.useEffect(() => {
        if (!showShortcuts) return undefined;
        const handleKeyDown = (event) => {
            if (event.key === 'Escape') {
                setShowShortcuts(false);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [showShortcuts]);

    if (!token) {
        return (
            <div className="App container">
                <header className="App-header">
                    <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', gap:12}}>
                        <div>
                            <h1>Quest Tracker</h1>
                            <div className="subtitle">Quest management made easy, but also way harder.</div>
                        </div>
                        <div style={{display:'flex', alignItems:'center', gap:8}}>
                            <button className="btn-ghost" onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}>Theme: {theme}</button>
                        </div>
                    </div>
                </header>
                <div style={{display:'flex', justifyContent:'center', marginTop:40}}>
                    <div className="auth-required-screen">
                        <div style={{textAlign:'center', marginBottom:24}}>
                            <h2>Welcome to Quest Tracker</h2>
                            <p style={{color:'var(--text-muted)', marginBottom:32}}>
                                Please sign in or create an account to start managing your quests.
                            </p>
                        </div>
                        <Profile
                            token={token}
                            onLogin={(t, user) => {
                                setToken(t);
                                if (user && user.rpg) setPlayerStats(user.rpg);
                            }}
                            onLogout={() => {
                                setToken(null);
                                setPlayerStats(null);
                            }}
                        />
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="App container">
            {showShortcuts && (
                <div
                    className="shortcuts-overlay"
                    role="presentation"
                    onClick={() => setShowShortcuts(false)}
                >
                    <div
                        className="shortcuts-panel"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="shortcuts-heading"
                        data-skip-shortcuts="true"
                        tabIndex={-1}
                        ref={shortcutsPanelRef}
                        onClick={(event) => event.stopPropagation()}
                    >
                        <div className="shortcuts-header">
                            <h2 id="shortcuts-heading">Keyboard Shortcuts</h2>
                            <button
                                type="button"
                                className="btn-ghost btn-small"
                                onClick={() => setShowShortcuts(false)}
                            >
                                Close
                            </button>
                        </div>
                        <p className="shortcuts-description">
                            Keep your hands on the keys to fly through quests.
                        </p>
                        <ul className="shortcuts-list">
                            {KEYBOARD_SHORTCUTS.map((shortcut) => (
                                <li key={shortcut.description} className="shortcut-row">
                                    <div className="shortcut-keys">
                                        {shortcut.keys.map((combo, comboIndex) => (
                                            <span
                                                className="shortcut-combo"
                                                key={`${shortcut.description}-${combo.join('+')}-${comboIndex}`}
                                            >
                                                {combo.map((key, keyIndex) => (
                                                    <React.Fragment
                                                        key={`${shortcut.description}-${combo.join('+')}-${comboIndex}-${key}-${keyIndex}`}
                                                    >
                                                        {keyIndex > 0 && (
                                                            <span className="shortcut-plus">+</span>
                                                        )}
                                                        <kbd>{formatKeyLabel(key)}</kbd>
                                                    </React.Fragment>
                                                ))}
                                                {comboIndex < shortcut.keys.length - 1 && (
                                                    <span className="shortcut-divider">or</span>
                                                )}
                                            </span>
                                        ))}
                                    </div>
                                    <div className="shortcut-description">{shortcut.description}</div>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            )}
            {/* Global sticky progress bar for the day */}
            <div className="global-progress-sticky">
                <div className="global-progress-inner">
                    <div className="global-progress-label">{globalLabel}</div>
                    <div className="global-progress-track" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow={globalProgress.percent} title={`${globalProgress.percent}%`}>
                        <div
                            className={`global-progress-fill ${globalAura.fillClass}`}
                            style={{ width: `${globalProgress.percent}%`, background: progressColor(globalProgress.percent) }}
                        />
                        <div className="tooltip">{globalProgress.percent}%</div>
                    </div>
                    <div className="global-progress-mood" aria-hidden="true">
                        <span className="mood-emoji">{globalAura.emoji}</span>
                        <span className="mood-label">{globalAura.mood}</span>
                    </div>
                    <div className="global-progress-percent">{globalProgress.percent}%</div>
                </div>
            </div>
            <header className="App-header">
                <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', gap:12}}>
                    <div>
                        <h1>Quest Tracker</h1>
                        <div className="subtitle">Quest management made easy, but also way harder.</div>
                    </div>
                    <div style={{display:'flex', alignItems:'center', gap:8}}>
                        <button className="btn-ghost" onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}>Theme: {theme}</button>
                        <button
                            className="btn-ghost"
                            onClick={() => setShowShortcuts((prev) => !prev)}
                            aria-haspopup="dialog"
                            aria-expanded={showShortcuts}
                        >
                            Keyboard Shortcuts
                        </button>
                        <button className="btn-ghost" data-skip-shortcuts="true" onClick={() => setShowDebugTools(s => !s)}>{showDebugTools ? 'Hide Debug' : 'Debug Tools'}</button>
                        <button className="btn-ghost" onClick={() => setShowProfile(s => !s)}>Profile</button>
                    </div>
                </div>
            </header>
            {playerStats && (
                <div
                    className="player-rpg-card"
                    style={{
                        margin: '16px 0',
                        padding: '12px 16px',
                        background: theme === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)',
                        borderRadius: 12,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 16,
                        flexWrap: 'wrap'
                    }}
                >
                    <div style={{ flex: 1, minWidth: 220 }}>
                        <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.6, color: 'var(--text-muted)' }}>
                            Adventurer Progress
                        </div>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginTop: 4 }}>
                            <div style={{ fontSize: 24, fontWeight: 600 }}>Level {playerStats.level}</div>
                            <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>Total XP {playerStats.xp}</div>
                        </div>
                        <div style={{ marginTop: 8 }}>
                            <div style={{ height: 8, borderRadius: 6, background: theme === 'dark' ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)', overflow: 'hidden' }}>
                                <div
                                    style={{
                                        width: `${Math.max(0, Math.min(100, xpPercent))}%`,
                                        height: '100%',
                                        background: 'linear-gradient(90deg, #36d1dc, #5b86e5)',
                                        transition: 'width 0.4s ease'
                                    }}
                                />
                            </div>
                            <div style={{ marginTop: 6, fontSize: 12, color: 'var(--text-muted)' }}>
                                {playerStats.xp_into_level} / {playerStats.xp_for_level} XP ({xpPercent}%)
                            </div>
                        </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
                        <button
                            className="btn-primary"
                            onClick={claimDailyReward}
                            disabled={dailyClaimed || dailyLoading}
                            aria-expanded={!campaignSidebarCollapsed}
                        >
                            {dailyClaimed ? 'Daily Bonus Claimed' : dailyLoading ? 'Claiming...' : 'Claim Daily Bonus'}
                        </button>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'right' }}>
                            {dailyClaimed ? 'Come back tomorrow for more XP.' : 'Log your focus each day for bonus XP.'}
                        </div>
                    </div>
                </div>
            )}
            {showProfile && (
                <div className="profile-modal">
                    <Profile
                        token={token}
                        onLogin={(t, user) => {
                            setToken(t);
                            if (user && user.rpg) setPlayerStats(user.rpg);
                            setShowProfile(false);
                        }}
                        onLogout={() => {
                            setToken(null);
                            setPlayerStats(null);
                            setShowProfile(false);
                        }}
                        onClose={() => setShowProfile(false)}
                    />
                </div>
            )}
            {showDebugTools && (
                <div className="debug-panel" data-skip-shortcuts="true">
                    <div className="debug-title">Debug Utilities</div>
                    <div className="debug-actions">
                        <button className="btn-ghost" onClick={clearAllQuests} disabled={debugBusy}>Clear Quests</button>
                        <button className="btn-ghost" onClick={() => seedDemoQuests(5)} disabled={debugBusy}>Seed 5 Quests</button>
                        <button className="btn-ghost" onClick={() => seedDemoQuests(8)} disabled={debugBusy}>Seed 8 Quests</button>
                        <button className="btn-ghost" onClick={() => grantXp(250)} disabled={debugBusy}>+250 XP</button>
                        <button className="btn-ghost" onClick={() => grantXp(1000)} disabled={debugBusy}>+1000 XP</button>
                        <button className="btn-ghost" onClick={() => grantXp(-150)} disabled={debugBusy}>-150 XP</button>
                        <button className="btn-ghost" onClick={resetRpgStats} disabled={debugBusy}>Reset RPG</button>
                    </div>
                    {debugBusy && <div className="debug-status">Working…</div>}
                </div>
            )}
            <div className="board-layout">
                <aside className={`campaign-sidebar ${campaignSidebarCollapsed ? 'collapsed' : ''}`}>
                    <div className="campaign-sidebar-header">
                        <button
                            type="button"
                            className="collapse-toggle"
                            onClick={() => setCampaignSidebarCollapsed(prev => {
                                const next = !prev;
                                if (next && campaignFormMode) closeCampaignForm();
                                return next;
                            })}
                            aria-label={campaignSidebarCollapsed ? 'Expand campaigns panel' : 'Collapse campaigns panel'}
                        >
                            {campaignSidebarCollapsed ? '»' : '«'}
                        </button>
                        {!campaignSidebarCollapsed && (
                            <span className="campaign-sidebar-title">Campaigns</span>
                        )}
                    </div>
                    {campaignSidebarCollapsed ? (
                        <div className="campaign-sidebar-collapsed">
                            <button
                                type="button"
                                className="campaign-pill create"
                                onClick={openCampaignCreateForm}
                                aria-label="Create campaign"
                            >
                                +
                            </button>
                            <button
                                type="button"
                                className={`campaign-pill ${activeCampaignFilter === null ? 'active' : ''}`}
                                onClick={() => setActiveCampaignFilter(null)}
                                aria-label="Show all quests"
                                aria-pressed={activeCampaignFilter === null}
                            >
                                ◎
                            </button>
                            <button
                                type="button"
                                className={`campaign-pill ${activeCampaignFilter === 'uncategorized' ? 'active' : ''}`}
                                onClick={() => setActiveCampaignFilter('uncategorized')}
                                aria-label="Show unassigned quests"
                                aria-pressed={activeCampaignFilter === 'uncategorized'}
                            >
                                ∅
                            </button>
                            {campaigns.map(campaign => (
                                <button
                                    type="button"
                                    key={campaign.id}
                                    className={`campaign-pill ${activeCampaignFilter === campaign.id ? 'active' : ''}`}
                                    onClick={() => setActiveCampaignFilter(campaign.id)}
                                    title={campaign.name}
                                    aria-pressed={activeCampaignFilter === campaign.id}
                                >
                                    {campaign.image_url ? (
                                        <img src={campaign.image_url} alt="" />
                                    ) : (
                                        (campaign.name || '?').charAt(0).toUpperCase()
                                    )}
                                </button>
                            ))}
                        </div>
                    ) : (
                        <div className="campaign-sidebar-content">
                            <div className="campaign-actions">
                                <button
                                    type="button"
                                    className="btn-primary btn-small"
                                    onClick={openCampaignCreateForm}
                                >
                                    New Campaign
                                </button>
                                <button
                                    type="button"
                                    className="btn-ghost btn-small"
                                    onClick={openCampaignEditForm}
                                    disabled={!selectedCampaign}
                                >
                                    Edit Selected
                                </button>
                            </div>
                            {campaignFormMode && (
                                <form className="campaign-form" onSubmit={submitCampaignForm}>
                                    <div className="campaign-form-title">
                                        {campaignFormMode === 'create' ? 'Create Campaign' : 'Edit Campaign'}
                                    </div>
                                    <label className="campaign-form-field">
                                        <span>Name</span>
                                        <input
                                            type="text"
                                            value={campaignFormValues.name}
                                            onChange={e => handleCampaignFieldChange('name', e.target.value)}
                                            disabled={campaignFormBusy}
                                            required
                                        />
                                    </label>
                                    <label className="campaign-form-field">
                                        <span>Description</span>
                                        <textarea
                                            value={campaignFormValues.description}
                                            onChange={e => handleCampaignFieldChange('description', e.target.value)}
                                            disabled={campaignFormBusy}
                                            rows={2}
                                        />
                                    </label>
                                    <label className="campaign-form-field">
                                        <span>Image URL</span>
                                        <input
                                            type="url"
                                            value={campaignFormValues.image_url}
                                            onChange={e => handleCampaignFieldChange('image_url', e.target.value)}
                                            disabled={campaignFormBusy}
                                            placeholder="https://example.com/banner.png"
                                        />
                                    </label>
                                    {campaignFormError && (
                                        <div className="campaign-form-error">{campaignFormError}</div>
                                    )}
                                    <div className="campaign-form-actions">
                                        <button
                                            type="submit"
                                            className="btn-primary btn-small"
                                            disabled={campaignFormBusy}
                                        >
                                            {campaignFormMode === 'create' ? 'Create' : 'Save'}
                                        </button>
                                        <button
                                            type="button"
                                            className="btn-ghost btn-small"
                                            onClick={closeCampaignForm}
                                            disabled={campaignFormBusy}
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </form>
                            )}
                            <button
                                type="button"
                                className={`campaign-filter ${activeCampaignFilter === null ? 'active' : ''}`}
                                onClick={() => setActiveCampaignFilter(null)}
                                aria-pressed={activeCampaignFilter === null}
                            >
                                <div className="campaign-filter-label">All quests</div>
                            </button>
                            <button
                                type="button"
                                className={`campaign-filter ${activeCampaignFilter === 'uncategorized' ? 'active' : ''}`}
                                onClick={() => setActiveCampaignFilter('uncategorized')}
                                aria-pressed={activeCampaignFilter === 'uncategorized'}
                            >
                                <div className="campaign-filter-label">Unassigned</div>
                            </button>
                            <div className="campaign-list">
                                {hasCampaigns ? (
                                    campaigns.map(campaign => (
                                        <button
                                            type="button"
                                            key={campaign.id}
                                            className={`campaign-item ${activeCampaignFilter === campaign.id ? 'active' : ''}`}
                                            onClick={() => setActiveCampaignFilter(campaign.id)}
                                            aria-pressed={activeCampaignFilter === campaign.id}
                                        >
                                            <div className="campaign-avatar">
                                                {campaign.image_url ? (
                                                    <img src={campaign.image_url} alt="" />
                                                ) : (
                                                    <span>{(campaign.name || '?').charAt(0).toUpperCase()}</span>
                                                )}
                                            </div>
                                            <div className="campaign-meta">
                                                <span className="campaign-name">{campaign.name}</span>
                                                <span className="campaign-progress">
                                                    {campaign.progress_summary || `${campaign.stats?.quests_completed || 0}/${campaign.stats?.quests_total || 0}`}
                                                </span>
                                            </div>
                                        </button>
                                    ))
                                ) : (
                                    <div className="campaign-empty">
                                        No campaigns yet. Create one from the backend to start grouping quests.
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </aside>
                <div className="board-main">
            <div className="add-task-form">
                <input
                    type="text"
                    placeholder="Quest description"
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTask(); } }}
                />
                <button
                    type="button"
                    className="cycle-toggle priority-toggle"
                    onClick={cyclePriority}
                    title="Cycle quest urgency"
                >
                    Urgency: <span className={`priority-pill ${priority}`}>{priority}</span>
                </button>
                <button
                    type="button"
                    className="cycle-toggle level-toggle"
                    onClick={cycleTaskLevel}
                    title="Cycle quest level"
                >
                    Lv. {taskLevel}
                </button>
                <div className="campaign-select">
                    <select
                        value={taskCampaignSelection === null ? '' : String(taskCampaignSelection)}
                        onChange={e => {
                            const next = e.target.value;
                            if (next === '') {
                                setTaskCampaignSelection(null);
                            } else {
                                const parsed = Number(next);
                                setTaskCampaignSelection(Number.isNaN(parsed) ? null : parsed);
                            }
                        }}
                        aria-label="Assign quest to campaign"
                    >
                        <option value="">{hasCampaigns ? 'No campaign' : 'No campaigns yet'}</option>
                        {campaigns.map(campaign => (
                            <option key={campaign.id} value={campaign.id}>
                                {campaign.name}
                            </option>
                        ))}
                    </select>
                </div>
                <button className="btn-primary" onClick={addTask}>Add Quest</button>
            </div>
            <div className="quest-container">
                {quests.map(quest => {
                    const questStatus = getQuestStatus(quest);
                    const questStatusLabel = getQuestStatusLabel(quest);
                    const questSelected = selectedQuestId !== null && idsMatch(selectedQuestId, quest.id);
                    const questSideQuests = getQuestSideQuests(quest);
                    const questProgress = getQuestProgress(quest);
                    const questHasCampaign = quest.campaign_id !== null && quest.campaign_id !== undefined;
                    const campaign = questHasCampaign && typeof quest.campaign_id === 'number'
                        ? (campaignLookup.get(quest.campaign_id) || null)
                        : null;
                    const campaignChip = (() => {
                        if (questHasCampaign && campaign) {
                            return (
                                <div className="campaign-chip" title={`Campaign: ${campaign.name}`}>
                                    <div className="chip-avatar">
                                        {campaign.image_url ? (
                                            <img src={campaign.image_url} alt="" />
                                        ) : (
                                            (campaign.name || '?').charAt(0).toUpperCase()
                                        )}
                                    </div>
                                    <div className="chip-content">
                                        <span className="chip-name">{campaign.name}</span>
                                        {(campaign.progress_summary || (campaign.stats && typeof campaign.stats.quests_total === 'number')) && (
                                            <span className="chip-progress">
                                                {campaign.progress_summary || `${campaign.stats?.quests_completed || 0}/${campaign.stats?.quests_total || 0}`}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            );
                        }
                        if (questHasCampaign && !campaign) {
                            return (
                                <div className="campaign-chip archived" title="Campaign archived">
                                    Archived
                                </div>
                            );
                        }
                        if (!questHasCampaign && hasCampaigns) {
                            return (
                                <div className="campaign-chip unassigned" title="No campaign">
                                    Unassigned
                                </div>
                            );
                        }
                        return null;
                    })();
                    const questClassName = [
                        'quest',
                        questStatus === 'done' ? 'completed' : '',
                        collapsedMap[quest.id] ? 'collapsed' : '',
                        dragOverQuestId === quest.id ? 'drag-over' : '',
                        questStatus === 'in_progress' ? 'started' : '',
                        pulsingQuests[quest.id] === 'full' ? 'pulse' : '',
                        pulsingQuests[quest.id] === 'subtle' ? 'pulse-subtle' : '',
                        pulsingQuests[quest.id] === 'spawn' ? 'pulse-spawn' : '',
                        glowQuests[quest.id] ? 'glow' : '',
                        spawnQuests[quest.id] ? 'spawn' : '',
                        questSelected ? 'selected' : ''
                    ].filter(Boolean).join(' ');
                    return (
                        <React.Fragment key={quest.id}>
                            {dragOverQuestId === quest.id && dragPosition === 'above' && (
                                <div className="insert-indicator" />
                            )}
                            <div
                                role="button"
                                tabIndex={0}
                                data-dragging={draggedQuestId === quest.id}
                                className={questClassName}
                                draggable
                                onClick={e => {
                                    if (isInteractiveTarget(e.target)) return;
                                    handleSelectQuest(quest.id);
                                }}
                                onFocus={e => {
                                    if (isInteractiveTarget(e.target)) return;
                                    handleSelectQuest(quest.id);
                                }}
                                onKeyDown={e => {
                                    if (isInteractiveTarget(e.target)) return;
                                    if (e.key === 'Enter' || e.key === ' ') {
                                        e.preventDefault();
                                        handleSelectQuest(quest.id);
                                    }
                                }}
                                onDragStart={e => handleDragStart(e, quest.id)}
                                onDragEnd={handleDragEnd}
                                onDragOver={e => handleDragOver(e, quest.id)}
                                onDragLeave={handleDragLeave}
                                onDrop={e => handleDrop(e, quest.id)}
                            >
                                <div style={{display:'flex', alignItems:'center'}}>
                                    <div className="drag-handle top" draggable onDragStart={e => handleDragStart(e, quest.id)} onDragEnd={handleDragEnd}>≡</div>
                                    <div style={{flex:1}}>
                                        {editingQuest && editingQuest.id === quest.id ? (
                                            renderEditForm(quest)
                                        ) : (
                                            <>
                                                <div className="quest-header">
                                                    <div className="left">
                                                        <div className="quest-title-row">
                                                            <h3>{quest.description}</h3>
                                                            <div className="quest-meta-tags">
                                                                <span className={`priority-pill ${quest.priority}`}>{quest.priority}</span>
                                                                <span className="level-pill">Lv. {quest.task_level || 1}</span>
                                                                {campaignChip}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="right">
                                                        <div className="quest-controls">
                                                            <button
                                                                className="btn-ghost"
                                                                onClick={e => { e.stopPropagation(); toggleCollapse(quest.id); }}
                                                                aria-label="toggle details"
                                                            >
                                                                {collapsedMap[quest.id] ? 'Expand' : 'Minimize'}
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                                {!collapsedMap[quest.id] && (
                                                    <>
                                                        <div className="quest-progress-wrap">
                                                            <div className="quest-progress">
                                                                <div className="quest-progress-bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow={questProgress} title={`${questProgress}%`}>
                                                                    <div className="quest-progress-fill" style={{ width: `${questProgress}%`, background: progressColor(questProgress) }} />
                                                                    <div className="tooltip">{questProgress}%</div>
                                                                </div>
                                                                <div className="quest-progress-meta">{questProgress}%</div>
                                                            </div>
                                                        </div>
                                                        <div className="quest-details">
                                                            <div>
                                                                <div className="muted small">Due:</div>
                                                                <div className="muted">{quest.due_date || '—'}</div>
                                                            </div>
                                                            <div>
                                                                <div className="muted small">Status:</div>
                                                                <div className="muted">{questStatusLabel}</div>
                                                            </div>
                                                        <div style={{marginLeft:'auto', display:'flex', gap:6, flexWrap:'wrap'}}>
                                                            {questSelected && (
                                                                <>
                                                                    <button
                                                                        className="btn-ghost btn-small"
                                                                        onClick={e => {
                                                                            e.stopPropagation();
                                                                            setEditingQuest({ ...quest });
                                                                        }}
                                                                    >
                                                                        Edit
                                                                    </button>
                                                                    <button
                                                                        className="btn-danger btn-small"
                                                                        onClick={e => {
                                                                            e.stopPropagation();
                                                                            deleteTask(quest.id);
                                                                        }}
                                                                    >
                                                                        Delete
                                                                    </button>
                                                                </>
                                                            )}
                                                            {questStatus !== 'in_progress' && (
                                                                <button
                                                                    className="btn-start btn-small"
                                                                    onMouseDown={e => e.stopPropagation()}
                                                                    onDragStart={e => e.stopPropagation()}
                                                                    onClick={e => { e.stopPropagation(); setTaskStatus(quest.id, 'in_progress'); }}
                                                                >
                                                                    Start
                                                                </button>
                                                            )}
                                                            {questStatus !== 'done' && (
                                                                <button
                                                                    className="btn-complete btn-small"
                                                                    onMouseDown={e => e.stopPropagation()}
                                                                    onDragStart={e => e.stopPropagation()}
                                                                    onClick={e => { e.stopPropagation(); setTaskStatus(quest.id, 'done'); }}
                                                                >
                                                                    Complete
                                                                </button>
                                                            )}
                                                            {questStatus === 'done' && (
                                                                <button
                                                                    className="btn-ghost btn-small"
                                                                    onMouseDown={e => e.stopPropagation()}
                                                                    onDragStart={e => e.stopPropagation()}
                                                                    onClick={e => { e.stopPropagation(); setTaskStatus(quest.id, 'todo'); }}
                                                                >
                                                                    Undo
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                        {questSideQuests.length > 0 && (
                                                            <div>
                                                                <h4>Side-quests:</h4>
                                                                <ul>
                                                                    {questSideQuests.map(sideQuest => {
                                                                        const sideStatus = getSideQuestStatus(sideQuest, quest);
                                                                        const sideStatusLabel = getSideQuestStatusLabel(sideQuest, quest);
                                                                        const sideSelected = selectedSideQuest
                                                                            && idsMatch(selectedSideQuest.questId, quest.id)
                                                                            && idsMatch(selectedSideQuest.sideQuestId, sideQuest.id);
                                                                        const sideEditing = editingSideQuest
                                                                            && idsMatch(editingSideQuest.questId, quest.id)
                                                                            && idsMatch(editingSideQuest.sideQuestId, sideQuest.id);
                                                                        const sideKey = `${quest.id}:${sideQuest.id}`;
                                                                        return (
                                                                            <li
                                                                                key={sideQuest.id}
                                                                                className={`${sideStatus === 'done' ? 'completed' : ''} ${sideSelected ? 'selected' : ''}`}
                                                                            >
                                                                                {sideQuestDragOver.questId === quest.id && sideQuestDragOver.sideQuestId === sideQuest.id && sideQuestDragOver.position === 'above' && <div className="insert-indicator" />}
                                                                                <div
                                                                                    className={`task-row ${sideEditing ? 'editing' : ''}`}
                                                                                    role="button"
                                                                                    tabIndex={0}
                                                                                    onClick={e => {
                                                                                        e.stopPropagation();
                                                                                        if (isInteractiveTarget(e.target)) return;
                                                                                        handleSelectSideQuest(quest.id, sideQuest.id);
                                                                                    }}
                                                                                    onFocus={e => {
                                                                                        e.stopPropagation();
                                                                                        if (isInteractiveTarget(e.target)) return;
                                                                                        handleSelectSideQuest(quest.id, sideQuest.id);
                                                                                    }}
                                                                                    onKeyDown={e => {
                                                                                        if (isInteractiveTarget(e.target)) return;
                                                                                        if (e.key === 'Enter' || e.key === ' ') {
                                                                                            e.preventDefault();
                                                                                            e.stopPropagation();
                                                                                            handleSelectSideQuest(quest.id, sideQuest.id);
                                                                                        }
                                                                                    }}
                                                                                    onDragOver={e => handleSideQuestDragOver(e, quest.id, sideQuest.id)}
                                                                                    onDragLeave={() => setSideQuestDragOver({ questId: null, sideQuestId: null, position: null })}
                                                                                    onDrop={e => handleSideQuestDrop(e, quest.id, sideQuest.id)}
                                                                                >
                                                                                    <div style={{display:'flex', alignItems:'center', gap:8, flex:1}}>
                                                                                        <div className="drag-handle" style={{width:14,height:14,fontSize:9}} draggable onDragStart={e => handleSideQuestDragStart(e, quest.id, sideQuest.id)} onDragEnd={handleSideQuestDragEnd}>⋮</div>
                                                                                        {sideEditing ? (
                                                                                            <div className="side-quest-edit">
                                                                                                <input
                                                                                                    type="text"
                                                                                                    data-subtask-edit={sideKey}
                                                                                                    value={editingSideQuest?.description || ''}
                                                                                                    onChange={e => handleSideQuestEditChange(e.target.value)}
                                                                                                    onClick={e => e.stopPropagation()}
                                                                                                    onKeyDown={e => {
                                                                                                        if (e.key === 'Enter') {
                                                                                                            e.preventDefault();
                                                                                                            saveSideQuestEdit(quest.id, sideQuest.id);
                                                                                                        } else if (e.key === 'Escape') {
                                                                                                            e.preventDefault();
                                                                                                            cancelSideQuestEdit();
                                                                                                        }
                                                                                                    }}
                                                                                                />
                                                                                            </div>
                                                                                        ) : (
                                                                                            <div className={`side-quest-desc ${(sideStatus === 'in_progress') ? 'in-progress' : ''} ${(sideStatus === 'done') ? 'started' : ''} ${pulsingSideQuests[sideKey] ? 'pulse-subtle' : ''}`} style={{flex:1}}>
                                                                                                {sideQuest.description}
                                                                                                <small className="small"> - {sideStatusLabel}</small>
                                                                                            </div>
                                                                                        )}
                                                                                    </div>
                                                                                    <div>
                                                                                        {sideEditing ? (
                                                                                            <>
                                                                                                <button
                                                                                                    className="btn-primary btn-small"
                                                                                                    onClick={e => {
                                                                                                        e.stopPropagation();
                                                                                                        saveSideQuestEdit(quest.id, sideQuest.id);
                                                                                                    }}
                                                                                                >
                                                                                                    Save
                                                                                                </button>
                                                                                                <button
                                                                                                    className="btn-ghost btn-small"
                                                                                                    onClick={e => {
                                                                                                        e.stopPropagation();
                                                                                                        cancelSideQuestEdit();
                                                                                                    }}
                                                                                                >
                                                                                                    Cancel
                                                                                                </button>
                                                                                            </>
                                                                                        ) : sideSelected ? (
                                                                                            <>
                                                                                                <button
                                                                                                    className="btn-ghost btn-small"
                                                                                                    onClick={e => {
                                                                                                        e.stopPropagation();
                                                                                                        startEditingSideQuest(quest.id, sideQuest);
                                                                                                    }}
                                                                                                >
                                                                                                    Edit
                                                                                                </button>
                                                                                                <button
                                                                                                    className="btn-danger btn-small"
                                                                                                    onClick={e => {
                                                                                                        e.stopPropagation();
                                                                                                        deleteSideQuest(quest.id, sideQuest.id);
                                                                                                    }}
                                                                                                >
                                                                                                    Delete
                                                                                                </button>
                                                                                            </>
                                                                                        ) : (
                                                                                            <>
                                                                                                {sideStatus !== 'in_progress' && (
                                                                                                    <button
                                                                                                        className="btn-start btn-small"
                                                                                                        onMouseDown={e => e.stopPropagation()}
                                                                                                        onDragStart={e => e.stopPropagation()}
                                                                                                        onClick={e => { e.stopPropagation(); setSideQuestStatus(quest.id, sideQuest.id, 'in_progress'); }}
                                                                                                    >
                                                                                                        Start
                                                                                                    </button>
                                                                                                )}
                                                                                                {sideStatus !== 'done' && (
                                                                                                    <button
                                                                                                        className="btn-complete btn-small"
                                                                                                        onMouseDown={e => e.stopPropagation()}
                                                                                                        onDragStart={e => e.stopPropagation()}
                                                                                                        onClick={e => { e.stopPropagation(); setSideQuestStatus(quest.id, sideQuest.id, 'done'); }}
                                                                                                    >
                                                                                                        Complete
                                                                                                    </button>
                                                                                                )}
                                                                                                {sideStatus === 'done' && (
                                                                                                    <button
                                                                                                        className="btn-ghost btn-small"
                                                                                                        onMouseDown={e => e.stopPropagation()}
                                                                                                        onDragStart={e => e.stopPropagation()}
                                                                                                        onClick={e => { e.stopPropagation(); setSideQuestStatus(quest.id, sideQuest.id, 'todo'); }}
                                                                                                    >
                                                                                                        Undo
                                                                                                    </button>
                                                                                                )}
                                                                                            </>
                                                                                        )}
                                                                                    </div>
                                                                                </div>
                                                                                {sideQuestDragOver.questId === quest.id && sideQuestDragOver.sideQuestId === sideQuest.id && sideQuestDragOver.position === 'below' && <div className="insert-indicator" />}
                                                                            </li>
                                                                        );
                                                                    })}
                                                                </ul>
                                                            </div>
                                                        )}
                                                        <div style={{marginTop:12}}>
                                                            {addingSideQuestTo === quest.id ? (
                                                                renderAddSideQuestForm(quest)
                                                            ) : (
                                                                <div style={{display:'flex', justifyContent:'flex-end'}}>
                                                                    <button className="add-side-quest-button large" onClick={() => { handleSelectQuest(quest.id); setAddingSideQuestTo(quest.id); }}>
                                                                        + Add Side Quest
                                                                    </button>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </>
                                                )}
                                            </>
                                        )}
                                    </div>
                                </div>
                                {celebratingQuests[quest.id] && (
                                    <div className="level-up-burst" aria-hidden="true">
                                        <div className="burst-ring" />
                                        <div className="burst-copy">
                                            <span className="burst-emoji">✦</span>
                                            <span className="burst-text">Level Up!</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                            {dragOverQuestId === quest.id && dragPosition === 'below' && (
                                <div className="insert-indicator" />
                            )}
                        </React.Fragment>
                    );
                })}
            </div>
                </div>
            </div>
            {/* Toasts & Undo */}
            <div className="toast-zone">
                {undoQueue.map(entry => (
                    <div key={entry.id} className="undo-toast">
                        <div className="undo-text">Deleted "{entry.quest?.description || 'quest'}"</div>
                        <button className="btn-primary btn-small" onClick={() => handleUndoDelete(entry.id)}>Undo</button>
                        <button className="btn-ghost btn-small" onClick={() => dismissUndoEntry(entry.id)}>Dismiss</button>
                    </div>
                ))}
                {toasts.map(t => (
                    <div key={t.id} className={`toast ${t.type}`}>
                        {t.msg}
                    </div>
                ))}
            </div>
        </div>
    );
}

export default App;
