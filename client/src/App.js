import React, { useState, useEffect, useRef, useMemo } from 'react';
import './App.css';
import Profile from './Profile';

const normalizeSideQuest = (raw) => {
    if (!raw || typeof raw !== 'object') return raw;
    const status = raw.status || (raw.completed ? 'done' : 'todo');
    return { ...raw, status, completed: status === 'done' ? true : !!raw.completed };
};

const normalizeQuest = (task) => {
    if (!task || typeof task !== 'object') return task;
    const rawSubs = Array.isArray(task.side_quests)
        ? task.side_quests
        : Array.isArray(task.sub_tasks)
            ? task.sub_tasks
            : [];
    const sideQuests = rawSubs.map(normalizeSideQuest);
    return { ...task, side_quests: sideQuests };
};

const normalizeQuestList = (list) => Array.isArray(list) ? list.map(normalizeQuest) : [];

function App() {
    // theme: 'dark' | 'light'
    const [theme, setTheme] = useState(() => {
        try { return localStorage.getItem('theme') || 'dark' } catch { return 'dark' }
    });

    useEffect(() => {
        try { localStorage.setItem('theme', theme); } catch {}
        // set data-theme on document body/root so CSS can react
        try { document.documentElement.setAttribute('data-theme', theme); } catch {}
    }, [theme]);
    const [quests, setQuests] = useState([]);
    const [description, setDescription] = useState('');
    const [priority, setPriority] = useState('medium');
    const [editingQuest, setEditingQuest] = useState(null);
    // store subtask descriptions per task id to allow multiple open forms
    const [sideQuestDescriptionMap, setSideQuestDescriptionMap] = useState({});
    const [addingSideQuestTo, setAddingSideQuestTo] = useState(null);
    const [collapsedMap, setCollapsedMap] = useState({});
    const [draggedQuestId, setDraggedQuestId] = useState(null);
    const [dragOverQuestId, setDragOverQuestId] = useState(null);
    const [dragPosition, setDragPosition] = useState(null); // 'above' | 'below'
    const [draggedSideQuest, setDraggedSideQuest] = useState(null);
    const [sideQuestDragOver, setSideQuestDragOver] = useState({ questId: null, sideQuestId: null, position: null });
    const addInputRefs = useRef({});

    const [token, setToken] = useState(() => {
        try { return localStorage.getItem('auth_token') || null } catch { return null }
    });
    const [showProfile, setShowProfile] = useState(false);

    useEffect(() => {
        if (token) {
            const headers = { Authorization: `Bearer ${token}` };
            fetch('/api/tasks', { headers })
                .then(res => {
                    if (res.ok) {
                        return res.json();
                    }
                    // If the token is invalid, the server returns 401
                    // In that case, we should log out
                    setToken(null);
                    return null;
                })
                .then(data => {
                    if (data) {
                        const payload = data.tasks || data.quests || [];
                        setQuests(normalizeQuestList(payload));
                    } else {
                        setQuests([]);
                    }
                })
                .catch(error => {
                    console.error('Error fetching quests:', error);
                    setToken(null); // Also logout on network error
                });
        } else {
            // No token, so clear tasks
            setQuests([]);
        }
    }, [token]);

    useEffect(() => {
        try { if (token) localStorage.setItem('auth_token', token); else localStorage.removeItem('auth_token'); } catch {}
    }, [token]);

    const getAuthHeaders = (extra = {}) => {
        const base = { 'Content-Type': 'application/json' };
        if (token) base['Authorization'] = `Bearer ${token}`;
        return { ...base, ...extra };
    };

    // weights by priority: low=1.0, medium=1.15, high=1.30 (approx +15% per grade)
    const priorityWeight = (p) => {
        if (!p) return 1.0;
        const s = String(p).toLowerCase();
        switch (s) {
            case 'low': return 1.0;
            case 'medium': return 1.15;
            case 'high': return 1.30;
            default: return 1.0;
        }
    };

    // subtask weight: prefer numeric .weight, else sub.priority/difficulty, else parent priority
    const sideQuestWeight = (sub, parent) => {
        if (!sub) return 1.0;
        if (typeof sub.weight === 'number') return Math.max(0.1, sub.weight);
        if (sub.priority) return priorityWeight(sub.priority);
        if (sub.difficulty) return priorityWeight(sub.difficulty);
        return priorityWeight(parent && parent.priority ? parent.priority : 'medium');
    };

    // compute weighted progress for a task (0-100). If subtasks exist, use their weights.
    const getQuestProgress = (task) => {
        if (!task) return 0;
        const subs = Array.isArray(task.side_quests) ? task.side_quests : [];
        if (subs.length > 0) {
            let weightedDone = 0;
            let weightSum = 0;
            subs.forEach(sub => {
                const w = sideQuestWeight(sub, task);
                weightSum += w;
                const done = (sub.status === 'done' || sub.completed) ? 1 : 0;
                weightedDone += done * w;
            });
            const pct = weightSum > 0 ? Math.round((weightedDone / weightSum) * 100) : 0;
            return pct;
        }
        // fallback to status mapping for tasks without subtasks
        switch (task.status) {
            case 'done': return 100;
            case 'in_progress': return 50;
            case 'blocked': return 25;
            default: return 0;
        }
    };

    // compute weighted global progress for today's tasks (or all tasks if none match)
    const getGlobalProgress = () => {
        const today = new Date().toISOString().split('T')[0];
        if (!Array.isArray(quests) || quests.length === 0) {
            return { percent: 0, count: 0, todayCount: 0, backlogCount: 0, totalCount: 0, weightingToday: false };
        }
        const dayQuests = quests.filter(t => t && t.due_date === today);
        const backlogQuests = quests.filter(t => t && t.due_date !== today);
        const weightingToday = dayQuests.length > 0;

        let weightSum = 0;
        let weightedProgressSum = 0;

        const pushContribution = (task, multiplier = 1) => {
            if (!task) return;
            const baseW = priorityWeight(task.priority);
            const subs = Array.isArray(task.side_quests) ? task.side_quests : [];
            let subWeights = 0;
            subs.forEach(s => { subWeights += sideQuestWeight(s, task); });
            const questTotalWeight = (baseW + subWeights) * Math.max(multiplier, 0);
            if (questTotalWeight <= 0) return;
            weightSum += questTotalWeight;
            weightedProgressSum += (getQuestProgress(task) || 0) * questTotalWeight;
        };

        dayQuests.forEach(task => pushContribution(task, 1));
        backlogQuests.forEach(task => {
            const dueDate = task && typeof task.due_date === 'string' ? task.due_date : null;
            let multiplier = 1;
            if (weightingToday) {
                if (dueDate && dueDate < today) multiplier = 0.75; // overdue but still matters
                else multiplier = 0.4; // future/backlog quests get a lighter weight
            }
            pushContribution(task, multiplier);
        });

        const percent = weightSum > 0 ? Math.round(weightedProgressSum / weightSum) : 0;
        return {
            percent,
            count: weightingToday ? dayQuests.length : quests.length,
            todayCount: dayQuests.length,
            backlogCount: backlogQuests.length,
            totalCount: quests.length,
            weightingToday,
        };
    };

    // pick a 5-segment gradient or color by percentage
    const progressColor = (pct) => {
        if (pct >= 80) return 'linear-gradient(90deg, #23d160, #36d7b7)'; // green-teal
        if (pct >= 60) return 'linear-gradient(90deg, #a0e39b, #bae637)'; // light green
        if (pct >= 40) return 'linear-gradient(90deg, #ffd666, #ffb36b)'; // amber
        if (pct >= 20) return 'linear-gradient(90deg, #ff7a45, #ff9278)'; // orange
        return 'linear-gradient(90deg, #ff4d4f, #ff758f)'; // red
    };

    const addTask = () => {
        if (!description || description.trim() === '') return;
        fetch('/api/tasks', {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({ description, priority }),
        })
            .then(res => res.json())
            .then(newQuest => {
                setQuests(prev => [...prev, normalizeQuest(newQuest)]);
                setDescription('');
                setPriority('medium');
            })
            .catch(error => console.error('Error adding quest:', error));
    };

    const addSideQuest = (questId) => {
        const description = sideQuestDescriptionMap[questId] || '';
        if (!description || description.trim() === '') return;
        fetch(`/api/tasks/${questId}/subtasks`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({ description }),
        })
            .then(res => res.json())
            .then(updatedTask => {
                const normalized = normalizeQuest(updatedTask);
                setQuests(prev => prev.map(quest => (quest.id === questId ? normalized : quest)));
                // clear the input state but keep the add form open for rapid entry
                setSideQuestDescriptionMap(prev => ({ ...prev, [questId]: '' }));
                // focus the input if available
                setTimeout(() => {
                    if (addInputRefs.current && addInputRefs.current[questId]) {
                        try { addInputRefs.current[questId].focus(); } catch (err) {}
                    }
                }, 10);
            })
            .catch(error => console.error('Error adding side-quest:', error));
    };

    const toggleCollapse = (questId) => {
        setCollapsedMap(prev => ({ ...prev, [questId]: !prev[questId] }));
    };

    const handleDragStart = (e, questId) => {
        setDraggedQuestId(questId);
        setDragOverQuestId(null);
        setDragPosition(null);
        e.dataTransfer.effectAllowed = 'move';
        try { e.dataTransfer.setData('text/plain', String(questId)); } catch (err) {}
    };

    const handleDragEnd = () => {
        setDraggedQuestId(null);
        setDragOverQuestId(null);
        setDragPosition(null);
    };

    const handleDragOver = (e, questId) => {
        if (draggedSideQuest) return;
        e.preventDefault();
        // compute whether the mouse is in upper or lower half
        const rect = e.currentTarget.getBoundingClientRect();
        const offsetY = e.clientY - rect.top;

        let pos = null;
        if (offsetY < rect.height * 0.2) {
            pos = 'above';
        } else if (offsetY > rect.height * 0.8) {
            pos = 'below';
        }

        if (pos) {
            setDragOverQuestId(questId);
            setDragPosition(pos);
        }
    };

    const handleDragLeave = (e) => {
        // when leaving, clear position indicators
        setDragOverQuestId(null);
        setDragPosition(null);
    };

    const handleDrop = (e, targetQuestId) => {
        e.preventDefault();
        // ignore parent drops while a subtask is being dragged
        if (draggedSideQuest) return;
        const sourceId = draggedQuestId || e.dataTransfer.getData('text/plain');
        if (!sourceId) return;
        const src = String(sourceId);
        const tgt = String(targetQuestId);
        if (src === tgt) {
            setDraggedQuestId(null);
            setDragOverQuestId(null);
            setDragPosition(null);
            return;
        }
        setQuests(prev => {
            const copy = [...prev];
            const fromIdx = copy.findIndex(t => String(t.id) === src);
            const toIdx = copy.findIndex(t => String(t.id) === tgt);
            if (fromIdx === -1 || toIdx === -1) return prev;
            const [moved] = copy.splice(fromIdx, 1);
            // insert either before (above) or after (below) the target
            const insertAt = dragPosition === 'above' ? toIdx : toIdx + 1;
            // adjust if removing earlier element changed indices
            const adjustedIndex = fromIdx < insertAt ? insertAt - 1 : insertAt;
            copy.splice(adjustedIndex, 0, moved);
            return copy;
        });
        setDraggedQuestId(null);
        setDragOverQuestId(null);
        setDragPosition(null);
    };

    // Subtask drag handlers (reorder subtasks within the same parent task)
    const handleSideQuestDragStart = (e, questId, sideQuestId) => {
        setSideQuestDragOver({ questId: null, sideQuestId: null, position: null });
        setDraggedSideQuest({ taskId: questId, subId: sideQuestId });
        e.dataTransfer.effectAllowed = 'move';
        try { e.dataTransfer.setData('text/plain', `${questId}:${sideQuestId}`); } catch (err) {}
    };

    const handleSideQuestDragEnd = () => {
        setDraggedSideQuest(null);
        setSideQuestDragOver({ questId: null, sideQuestId: null, position: null });
    };

    const handleSideQuestDragOver = (e, questId, sideQuestId) => {
        e.preventDefault();
        e.stopPropagation();
        const rect = e.currentTarget.getBoundingClientRect();
        const offsetY = e.clientY - rect.top;

        let pos = null;
        if (offsetY < rect.height * 0.2) {
            pos = 'above';
        } else if (offsetY > rect.height * 0.8) {
            pos = 'below';
        }

        if (pos) {
            setSideQuestDragOver({ questId, sideQuestId, position: pos });
        }
    };

    const handleSideQuestDrop = (e, questId, sideQuestId) => {
        e.preventDefault();
        e.stopPropagation();
        const srcData = draggedSideQuest || (() => {
            try { return e.dataTransfer.getData('text/plain'); } catch { return null; }
        })();
        if (!srcData) return;
        let srcTaskId, srcSubId;
        if (typeof srcData === 'object' && srcData.taskId) {
            srcTaskId = srcData.taskId;
            srcSubId = srcData.subId;
        } else if (typeof srcData === 'string') {
            const parts = srcData.split(':');
            srcTaskId = parts[0];
            srcSubId = parts[1];
        }
        if (!srcTaskId || !srcSubId) return;
        // only allow reordering within the same parent task for now
        if (String(srcTaskId) !== String(questId)) {
            setDraggedSideQuest(null);
            setSideQuestDragOver({ questId: null, sideQuestId: null, position: null });
            return;
        }

        setQuests(prev => prev.map(task => {
            if (String(task.id) !== String(questId)) return task;
            const subs = Array.isArray(task.side_quests) ? [...task.side_quests] : [];
            const fromIdx = subs.findIndex(s => String(s.id) === String(srcSubId));
            const toIdx = subs.findIndex(s => String(s.id) === String(sideQuestId));
            if (fromIdx === -1 || toIdx === -1) return task;
            const [moved] = subs.splice(fromIdx, 1);
            const insertAt = sideQuestDragOver.position === 'above' ? toIdx : toIdx + 1;
            const adjusted = fromIdx < insertAt ? insertAt - 1 : insertAt;
            subs.splice(adjusted, 0, moved);
            return { ...task, side_quests: subs };
        }));
        setDraggedSideQuest(null);
        setSideQuestDragOver({ questId: null, sideQuestId: null, position: null });
    };

    const deleteTask = (id) => {
        fetch(`/api/tasks/${id}`, { method: 'DELETE', headers: getAuthHeaders() })
            .then(() => {
                setQuests(prev => prev.filter(quest => quest.id !== id));
            })
            .catch(error => console.error('Error deleting quest:', error));
    };

    const updateTask = (id, updatedTask) => {
        fetch(`/api/tasks/${id}`, { method: 'PUT', headers: getAuthHeaders(), body: JSON.stringify(updatedTask) })
            .then(res => res.json())
            .then(updatedQuest => {
                const normalized = normalizeQuest(updatedQuest);
                setQuests(prev => prev.map(q => (q.id === id ? normalized : q)));
                setEditingQuest(null);
            })
            .catch(error => console.error('Error updating quest:', error));
    };

    const [toasts, setToasts] = useState([]);
    const [pulsingQuests, setPulsingQuests] = useState({}); // value: 'full' | 'subtle'
    const [pulsingSideQuests, setPulsingSideQuests] = useState({});
    const [glowQuests, setGlowQuests] = useState({});

    const pushToast = (msg, type = 'info', timeout = 3000) => {
        const id = Date.now() + Math.random();
        setToasts(prev => [...prev, { id, msg, type }]);
        setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), timeout);
    };

    const setTaskStatus = (id, status, note) => {
        fetch(`/api/tasks/${id}/status`, { method: 'PATCH', headers: getAuthHeaders(), body: JSON.stringify({ status, note }) })
            .then(res => res.json())
            .then(updatedQuest => {
                const normalized = normalizeQuest(updatedQuest);
                setQuests(prev => prev.map(t => (t.id === id ? normalized : t)));
                // pulse the task card to indicate direct change (bigger bump)
                setPulsingQuests(prev => ({ ...prev, [id]: 'full' }));
                setTimeout(() => setPulsingQuests(prev => { const c = { ...prev }; delete c[id]; return c }), 700);
                // if the task completed, trigger a glow animation
                if (status === 'done') {
                    setGlowQuests(prev => ({ ...prev, [id]: true }));
                    setTimeout(() => setGlowQuests(prev => { const c = { ...prev }; delete c[id]; return c }), 1400);
                }
                pushToast(`Quest ${updatedQuest.id} set to ${status.replace('_',' ')}`, 'success');
            })
            .catch(error => {
                console.error('Error updating quest status:', error);
                pushToast('Failed to update quest status', 'error');
            });
    };

    const setSideQuestStatus = (taskId, subTaskId, status, note) => {
        fetch(`/api/tasks/${taskId}/subtasks/${subTaskId}/status`, { method: 'PATCH', headers: getAuthHeaders(), body: JSON.stringify({ status, note }) })
            .then(res => res.json())
            .then(updatedQuest => {
                const normalized = normalizeQuest(updatedQuest);
                setQuests(prev => prev.map(quest => (quest.id === taskId ? normalized : quest)));
                // subtle pulse on parent when a subtask changed
                setPulsingQuests(prev => ({ ...prev, [taskId]: 'subtle' }));
                setTimeout(() => setPulsingQuests(prev => { const c = { ...prev }; delete c[taskId]; return c }), 500);
                // also pulse the specific subtask id for micro-feedback
                setPulsingSideQuests(prev => ({ ...prev, [`${taskId}:${subTaskId}`]: true }));
                setTimeout(() => setPulsingSideQuests(prev => { const c = { ...prev }; delete c[`${taskId}:${subTaskId}`]; return c }), 600);
                // if the parent task is now done (subtask completed caused it), trigger glow
                if (updatedQuest && updatedQuest.status === 'done') {
                    setGlowQuests(prev => ({ ...prev, [taskId]: true }));
                    setTimeout(() => setGlowQuests(prev => { const c = { ...prev }; delete c[taskId]; return c }), 1400);
                }
                pushToast(`Side-quest ${subTaskId} updated to ${status.replace('_',' ')}`, 'success');
            })
            .catch(error => {
                console.error('Error updating side-quest status:', error);
                pushToast('Failed to update side-quest status', 'error');
            });
    };

    const handleEditChange = (e) => {
        const { name, value } = e.target;
        setEditingQuest(prevQuest => ({
            ...prevQuest,
            [name]: value
        }));
    };

    const renderEditForm = (quest) => {
        return (
            <div className="edit-quest-form" key={quest.id}>
                <input
                    type="text"
                    name="description"
                    value={editingQuest?.description || ''}
                    onChange={handleEditChange}
                />
                <div className="custom-select">
                    <select
                        name="priority"
                        value={editingQuest?.priority || 'medium'}
                        onChange={handleEditChange}
                    >
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                    </select>
                </div>
                <button className="btn-primary" onClick={() => updateTask(quest.id, { description: editingQuest.description, priority: editingQuest.priority })}>Save</button>
                <button className="btn-ghost" onClick={() => setEditingQuest(null)}>Cancel</button>
            </div>
        );
    }

    const renderAddSideQuestForm = (quest) => {
        return (
            <div className="add-subtask-form">
                <input
                    type="text"
                    placeholder="Side-quest description"
                    value={sideQuestDescriptionMap[quest.id] || ''}
                    onChange={e => setSideQuestDescriptionMap(prev => ({ ...prev, [quest.id]: e.target.value }))}
                    ref={el => { if (!addInputRefs.current) addInputRefs.current = {}; addInputRefs.current[quest.id] = el }}
                    onKeyDown={e => {
                        if (e.key === 'Enter') {
                            e.preventDefault();
                            addSideQuest(quest.id);
                            // keep focus and clear input so user can type next subtask
                            setTimeout(() => {
                                if (addInputRefs.current && addInputRefs.current[quest.id]) {
                                    addInputRefs.current[quest.id].focus();
                                    addInputRefs.current[quest.id].value = '';
                                }
                            }, 10);
                        }
                    }}
                />
                <button className="btn-primary" onClick={() => addSideQuest(quest.id)}>Add Side Quest</button>
                <button className="btn-ghost" onClick={() => setAddingSideQuestTo(null)}>Cancel</button>
            </div>
        );
    } // keep within App scope (do not close App here)

    // focus the add-subtask input when the form opens
    useEffect(() => {
        if (addingSideQuestTo && addInputRefs.current && addInputRefs.current[addingSideQuestTo]) {
            setTimeout(() => {
                try { addInputRefs.current[addingSideQuestTo].focus(); } catch (err) {}
            }, 20);
        }
    }, [addingSideQuestTo]);

    const globalProgress = useMemo(() => getGlobalProgress(), [quests]);
    const globalLabel = globalProgress.weightingToday
        ? `Today (${globalProgress.todayCount} quest${globalProgress.todayCount === 1 ? '' : 's'}${globalProgress.backlogCount ? ` + ${globalProgress.backlogCount} backlog` : ''})`
        : `All quests (${globalProgress.totalCount})`;

    // Show authentication screen if not logged in
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
                        <Profile token={token} onLogin={(t) => { setToken(t); }} onLogout={() => { setToken(null); }} />
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="App container">
            {/* Global sticky progress bar for the day */}
            <div className="global-progress-sticky">
                <div className="global-progress-inner">
                    <div className="global-progress-label">{globalLabel}</div>
                    <div className="global-progress-track" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow={globalProgress.percent} title={`${globalProgress.percent}%`}>
                        <div
                            className="global-progress-fill"
                            style={{ width: `${globalProgress.percent}%`, background: progressColor(globalProgress.percent) }}
                        />
                        <div className="tooltip">{globalProgress.percent}%</div>
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
                        <button className="btn-ghost" onClick={() => setShowProfile(s => !s)}>Profile</button>
                    </div>
                </div>
            </header>
            {showProfile && (
                <div className="profile-modal">
                    <Profile token={token} onLogin={(t) => { setToken(t); setShowProfile(false); }} onLogout={() => { setToken(null); setShowProfile(false); }} onClose={() => setShowProfile(false)} />
                </div>
            )}
            <div className="add-task-form">
                <input
                    type="text"
                    placeholder="Quest description"
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTask(); } }}
                />
                <div className="custom-select">
                    <select value={priority} onChange={e => setPriority(e.target.value)}>
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                    </select>
                </div>
                <button className="btn-primary" onClick={addTask}>Add Quest</button>
            </div>
            <div className="quest-container">
                {quests.map(quest => (
                    <React.Fragment key={quest.id}>
                        {dragOverQuestId === quest.id && dragPosition === 'above' && (
                            <div className="insert-indicator" />
                        )}
                        <div
                            data-dragging={draggedQuestId === quest.id}
                            className={`quest ${((quest.status || (quest.completed ? 'done' : 'todo')) === 'done' ? 'completed' : '')} ${collapsedMap[quest.id] ? 'collapsed' : ''} ${dragOverQuestId === quest.id ? 'drag-over' : ''} ${(quest.status === 'in_progress') ? 'started' : ''} ${(pulsingQuests[quest.id] === 'full') ? 'pulse' : (pulsingQuests[quest.id] === 'subtle' ? 'pulse-subtle' : '')} ${glowQuests[quest.id] ? 'glow' : ''}`}
                            draggable
                            onDragStart={e => handleDragStart(e, quest.id)}
                            onDragEnd={handleDragEnd}
                            onDragOver={e => handleDragOver(e, quest.id)}
                            onDragLeave={handleDragLeave}
                            onDrop={e => handleDrop(e, quest.id)}
                        >
                            <div style={{display:'flex', alignItems:'center'}}>
                                <div className="drag-handle top" draggable onDragStart={e => handleDragStart(e, quest.id)} onDragEnd={handleDragEnd}>≡</div>
                                <div style={{flex:1}}>{editingQuest && editingQuest.id === quest.id ? (
                                        renderEditForm(quest)
                                    ) : (
                                        <>
                                            <div className="quest-header">
                                                <div className="left">
                                                    <h3>{quest.description}</h3>
                                                    <div style={{marginLeft:12}}><span className={`level-tag level-${quest.priority}`}>{quest.priority}</span></div>
                                                </div>
                                                <div className="right">
                                                    <div className="quest-controls">
                                                        <button className="btn-ghost" onClick={() => toggleCollapse(quest.id)} aria-label="toggle details">{collapsedMap[quest.id] ? 'Expand' : 'Minimize'}</button>
                                                        <button className="btn-ghost" onClick={() => setEditingQuest({ ...quest })}>Edit</button>
                                                        <button className="btn-danger" onClick={() => deleteTask(quest.id)}>Delete</button>
                                                    </div>
                                                </div>
                                            </div>
                                            {!collapsedMap[quest.id] && (
                                                <>
                                                    <div className="quest-progress-wrap">
                                                        <div className="quest-progress">
                                                            <div className="quest-progress-bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow={getQuestProgress(quest)} title={`${getQuestProgress(quest)}%`}>
                                                                <div className="quest-progress-fill" style={{ width: `${getQuestProgress(quest)}%`, background: progressColor(getQuestProgress(quest)) }} />
                                                                <div className="tooltip">{getQuestProgress(quest)}%</div>
                                                            </div>
                                                            <div className="quest-progress-meta">{getQuestProgress(quest)}%</div>
                                                        </div>
                                                    </div>
                                                    <div className="quest-details">
                                                        <div>
                                                            <div className="muted small">Due:</div>
                                                            <div className="muted">{quest.due_date || '—'}</div>
                                                        </div>
                                                        <div>
                                                            <div className="muted small">Status:</div>
                                                            <div className="muted">{(quest.status || (quest.completed ? 'done' : 'todo')).replace('_', ' ')}</div>
                                                        </div>
                                                        <div style={{marginLeft:'auto'}}>
                                                            {/* show actions depending on current status */}
                                                            {((quest.status || (quest.completed ? 'done' : 'todo')) !== 'in_progress') && <button className="btn-start btn-small" onMouseDown={e => e.stopPropagation()} onDragStart={e => e.stopPropagation()} onClick={e => { e.stopPropagation(); setTaskStatus(quest.id, 'in_progress'); }}>Start</button>}
                                                            {((quest.status || (quest.completed ? 'done' : 'todo')) !== 'done') && <button className="btn-complete btn-small" onMouseDown={e => e.stopPropagation()} onDragStart={e => e.stopPropagation()} onClick={e => { e.stopPropagation(); setTaskStatus(quest.id, 'done'); }}>Complete</button>}
                                                            {((quest.status || (quest.completed ? 'done' : 'todo')) === 'done') && <button className="btn-ghost btn-small" onMouseDown={e => e.stopPropagation()} onDragStart={e => e.stopPropagation()} onClick={e => { e.stopPropagation(); setTaskStatus(quest.id, 'todo'); }}>Undo</button>}
                                                        </div>
                                                    </div>
                                                    {quest.side_quests && quest.side_quests.length > 0 && (
                                                        <div>
                                                            <h4>Side-quests:</h4>
                                                            <ul>
                                                                {quest.side_quests.map(sideQuest => (
                                                                    <li key={sideQuest.id} className={((sideQuest.status || (sideQuest.completed ? 'done' : 'todo')) === 'done') ? 'completed' : ''}>
                                                                        {sideQuestDragOver.questId === quest.id && sideQuestDragOver.sideQuestId === sideQuest.id && sideQuestDragOver.position === 'above' && <div className="insert-indicator" />}
                                                                        <div
                                                                            className="task-row"
                                                                            onDragOver={e => handleSideQuestDragOver(e, quest.id, sideQuest.id)}
                                                                            onDragLeave={() => setSideQuestDragOver({ questId: null, sideQuestId: null, position: null })}
                                                                            onDrop={e => handleSideQuestDrop(e, quest.id, sideQuest.id)}
                                                                        >
                                                                            <div style={{display:'flex', alignItems:'center', gap:8, flex:1}}>
                                                                                <div className="drag-handle" style={{width:14,height:14,fontSize:9}} draggable onDragStart={e => handleSideQuestDragStart(e, quest.id, sideQuest.id)} onDragEnd={handleSideQuestDragEnd}>⋮</div>
                                                                                <div className={`side-quest-desc ${(sideQuest.status === 'in_progress') ? 'in-progress' : ''} ${(sideQuest.status === 'done') ? 'started' : ''} ${pulsingSideQuests[`${quest.id}:${sideQuest.id}`] ? 'pulse-subtle' : ''}`} style={{flex:1}}>{sideQuest.description} <small className="small"> - {(sideQuest.status || (sideQuest.completed ? 'done' : 'todo')).replace('_', ' ')}</small></div>
                                                                            </div>
                                                                            <div>
                                                                                {(((sideQuest.status) || (sideQuest.completed ? 'done' : 'todo')) !== 'in_progress') && <button className="btn-start btn-small" onMouseDown={e => e.stopPropagation()} onDragStart={e => e.stopPropagation()} onClick={e => { e.stopPropagation(); setSideQuestStatus(quest.id, sideQuest.id, 'in_progress'); }}>Start</button>}
                                                                                {(((sideQuest.status) || (sideQuest.completed ? 'done' : 'todo')) !== 'done') && <button className="btn-complete btn-small" onMouseDown={e => e.stopPropagation()} onDragStart={e => e.stopPropagation()} onClick={e => { e.stopPropagation(); setSideQuestStatus(quest.id, sideQuest.id, 'done'); }}>Complete</button>}
                                                                                {(((sideQuest.status) || (sideQuest.completed ? 'done' : 'todo')) === 'done') && <button className="btn-ghost btn-small" onMouseDown={e => e.stopPropagation()} onDragStart={e => e.stopPropagation()} onClick={e => { e.stopPropagation(); setSideQuestStatus(quest.id, sideQuest.id, 'todo'); }}>Undo</button>}
                                                                            </div>
                                                                        </div>
                                                                        {sideQuestDragOver.questId === quest.id && sideQuestDragOver.sideQuestId === sideQuest.id && sideQuestDragOver.position === 'below' && <div className="insert-indicator" />}
                                                                    </li>
                                                                ))}
                                                            </ul>
                                                        </div>
                                                    )}
                                                    {/* Add-side-quest area moved into card footer for clarity */}
                                                    <div style={{marginTop:12}}>
                                                        {addingSideQuestTo === quest.id ? (
                                                            renderAddSideQuestForm(quest)
                                                        ) : (
                                                            <div style={{display:'flex', justifyContent:'flex-end'}}><button className="add-side-quest-button large" onClick={() => setAddingSideQuestTo(quest.id)}>+ Add Side Quest</button></div>
                                                        )}
                                                    </div>
                                                </>
                                            )}
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                        {dragOverQuestId === quest.id && dragPosition === 'below' && (
                            <div className="insert-indicator" />
                        )}
                    </React.Fragment>
                ))}
            </div>
            {/* Toasts */}
            <div style={{position:'fixed', right:12, bottom:12, zIndex:2000}}>
                {toasts.map(t => (
                    <div key={t.id} style={{marginTop:8, padding:'8px 12px', borderRadius:6, backgroundColor: t.type === 'error' ? '#f8d7da' : t.type === 'success' ? '#d1e7dd' : '#e2e3e5', color: '#111'}}>
                        {t.msg}
                    </div>
                ))}
            </div>
        </div>
    );
}

export default App;
