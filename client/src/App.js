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
    const taskLevel = typeof task.task_level === 'number' ? task.task_level : 1;
    return { ...task, side_quests: sideQuests, task_level: taskLevel };
};

const normalizeQuestList = (list) => Array.isArray(list) ? list.map(normalizeQuest) : [];

const PRIORITY_ORDER = ['low', 'medium', 'high'];
const LEVEL_OPTIONS = [1, 2, 3, 4, 5];

const getQuestStatus = (quest) => {
    if (!quest) return 'todo';
    return quest.status || (quest.completed ? 'done' : 'todo');
};

const getQuestStatusLabel = (quest) => getQuestStatus(quest).replace('_', ' ');

const getQuestSideQuests = (quest) => {
    if (!quest || !Array.isArray(quest.side_quests)) return [];
    return quest.side_quests;
};

const getSideQuestStatus = (sideQuest, parent) => {
    if (!sideQuest) return parent ? getQuestStatus(parent) : 'todo';
    return sideQuest.status || (sideQuest.completed ? 'done' : 'todo');
};

const getSideQuestStatusLabel = (sideQuest, parent) => getSideQuestStatus(sideQuest, parent).replace('_', ' ');

const idsMatch = (a, b) => String(a) === String(b);

const cloneQuestSnapshot = (quest) => {
    if (!quest) return null;
    return JSON.parse(JSON.stringify(quest));
};

const findSideQuestById = (quest, sideQuestId) => getQuestSideQuests(quest).find(sub => idsMatch(sub?.id, sideQuestId)) || null;

const isInteractiveTarget = (target) => target && typeof target.closest === 'function'
    && target.closest('input,textarea,button,select,[contenteditable="true"]');

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
    const [taskLevel, setTaskLevel] = useState(1);
    const [playerStats, setPlayerStats] = useState(null);
    const [dailyLoading, setDailyLoading] = useState(false);
    const [debugBusy, setDebugBusy] = useState(false);
    const [showDebugTools, setShowDebugTools] = useState(false);
    const [editingQuest, setEditingQuest] = useState(null);
    const editingQuestInputRef = useRef(null);
    const [selectedQuestId, setSelectedQuestId] = useState(null);
    const [selectedSideQuest, setSelectedSideQuest] = useState(null); // { questId, sideQuestId }
    const [editingSideQuest, setEditingSideQuest] = useState(null);
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
    const undoTimersRef = useRef({});
    const completedCollapseTimersRef = useRef({});
    const [undoQueue, setUndoQueue] = useState([]);

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
                    if (res.status === 401) {
                        // 401 means the token is no longer valid, so log out
                        setToken(null);
                        setPlayerStats(null);
                        setQuests([]);
                        return null;
                    }
                    const error = new Error('Failed to fetch quests');
                    error.status = res.status;
                    throw error;
                })
                .then(data => {
                    if (data) {
                        const payload = data.tasks || data.quests || [];
                        setQuests(normalizeQuestList(payload));
                    }
                })
                .catch(error => {
                    if (error && error.status === 401) {
                        return;
                    }
                    console.error('Error fetching quests:', error);
                });
        } else {
            // No token, so clear tasks
            setQuests([]);
            setPlayerStats(null);
        }
    }, [token]);

    useEffect(() => {
        if (!token) {
            setPlayerStats(null);
            return;
        }
        const headers = { Authorization: `Bearer ${token}` };
        fetch('/api/users/me', { headers })
            .then(res => res.ok ? res.json() : null)
            .then(data => {
                if (data && data.user && data.user.rpg) {
                    setPlayerStats(data.user.rpg);
                }
            })
            .catch(error => {
                console.error('Error fetching player stats:', error);
            });
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

    const getProgressAura = (pct) => {
        if (pct >= 90) return { emoji: '🌟', mood: 'Legendary focus', fillClass: 'progress-legend' };
        if (pct >= 70) return { emoji: '🚀', mood: 'Momentum rising', fillClass: 'progress-heroic' };
        if (pct >= 40) return { emoji: '⚔️', mood: 'Battle ready', fillClass: 'progress-ready' };
        if (pct >= 15) return { emoji: '🛠️', mood: 'Forge in progress', fillClass: 'progress-building' };
        return { emoji: '💤', mood: 'Boot sequence idle', fillClass: 'progress-idle' };
    };

    const addTask = () => {
        if (!description || description.trim() === '') return;
        fetch('/api/tasks', {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({ description, priority, task_level: taskLevel }),
        })
            .then(res => res.json())
            .then(newQuest => {
                const normalized = normalizeQuest(newQuest);
                setQuests(prev => [normalized, ...prev]);
                if (normalized && normalized.id !== undefined && normalized.id !== null) {
                    const questId = normalized.id;
                    setSpawnQuests(prev => ({ ...prev, [questId]: true }));
                    setPulsingQuests(prev => ({ ...prev, [questId]: 'spawn' }));
                    setTimeout(() => {
                        setSpawnQuests(prev => {
                            const copy = { ...prev };
                            delete copy[questId];
                            return copy;
                        });
                        setPulsingQuests(prev => {
                            const copy = { ...prev };
                            delete copy[questId];
                            return copy;
                        });
                    }, 650);
                }
                setDescription('');
                setPriority('medium');
                setTaskLevel(1);
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

    const ensureQuestExpanded = (questId) => {
        setCollapsedMap(prev => {
            if (!prev || !prev[questId]) return prev;
            const copy = { ...prev };
            copy[questId] = false;
            return copy;
        });
    };

    const handleSelectQuest = (questId) => {
        if (questId === undefined || questId === null) return;
        setSelectedQuestId(questId);
        setSelectedSideQuest(null);
        setEditingSideQuest(null);
        ensureQuestExpanded(questId);
    };

    const handleSelectSideQuest = (questId, sideQuestId) => {
        if (questId === undefined || questId === null || sideQuestId === undefined || sideQuestId === null) return;
        setSelectedQuestId(questId);
        setSelectedSideQuest({ questId, sideQuestId });
        ensureQuestExpanded(questId);
    };

    const clearSelection = () => {
        setSelectedQuestId(null);
        setSelectedSideQuest(null);
        setEditingSideQuest(null);
    };

    const findQuestById = (questId) => {
        if (questId === undefined || questId === null) return null;
        return quests.find(q => idsMatch(q.id, questId)) || null;
    };

    const moveQuestSelection = (offset) => {
        if (!Array.isArray(quests) || quests.length === 0) return false;
        const currentIndex = selectedQuestId !== null
            ? quests.findIndex(q => idsMatch(q.id, selectedQuestId))
            : -1;
        let nextIndex;
        if (currentIndex === -1) {
            nextIndex = offset >= 0 ? 0 : quests.length - 1;
        } else {
            nextIndex = currentIndex + offset;
            if (nextIndex < 0) nextIndex = 0;
            if (nextIndex >= quests.length) nextIndex = quests.length - 1;
        }
        if (nextIndex === currentIndex || nextIndex < 0 || nextIndex >= quests.length) return false;
        const nextQuest = quests[nextIndex];
        if (nextQuest) {
            handleSelectQuest(nextQuest.id);
            return true;
        }
        return false;
    };

    const selectFirstSideQuest = (questId) => {
        const quest = findQuestById(questId);
        const subs = getQuestSideQuests(quest);
        if (!quest || subs.length === 0) return;
        ensureQuestExpanded(questId);
        const first = subs[0];
        if (first) {
            handleSelectSideQuest(questId, first.id);
        }
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
        if (idsMatch(sourceId, targetQuestId)) {
            setDraggedQuestId(null);
            setDragOverQuestId(null);
            setDragPosition(null);
            return;
        }
        setQuests(prev => {
            const copy = [...prev];
            const fromIdx = copy.findIndex(t => idsMatch(t.id, sourceId));
            const toIdx = copy.findIndex(t => idsMatch(t.id, targetQuestId));
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
        if (!idsMatch(srcTaskId, questId)) {
            setDraggedSideQuest(null);
            setSideQuestDragOver({ questId: null, sideQuestId: null, position: null });
            return;
        }

        setQuests(prev => prev.map(task => {
            if (!idsMatch(task.id, questId)) return task;
            const subs = Array.isArray(task.side_quests) ? [...task.side_quests] : [];
            const fromIdx = subs.findIndex(s => idsMatch(s.id, srcSubId));
            const toIdx = subs.findIndex(s => idsMatch(s.id, sideQuestId));
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

    const scheduleQuestUndo = (quest) => {
        if (!quest) return;
        const snapshot = cloneQuestSnapshot(quest);
        if (!snapshot) return;
        const entryId = `${quest.id}-${Date.now()}`;
        if (typeof window === 'undefined') return;
        const timer = window.setTimeout(() => {
            setUndoQueue(prev => prev.filter(entry => entry.id !== entryId));
            if (undoTimersRef.current && undoTimersRef.current[entryId]) {
                delete undoTimersRef.current[entryId];
            }
        }, 7000);
        if (!undoTimersRef.current) undoTimersRef.current = {};
        undoTimersRef.current[entryId] = timer;
        setUndoQueue(prev => [...prev, { id: entryId, quest: snapshot }]);
    };

    const dismissUndoEntry = (entryId) => {
        if (undoTimersRef.current && undoTimersRef.current[entryId]) {
            clearTimeout(undoTimersRef.current[entryId]);
            delete undoTimersRef.current[entryId];
        }
        setUndoQueue(prev => prev.filter(entry => entry.id !== entryId));
    };

    const restoreQuestFromSnapshot = async (snapshot) => {
        if (!snapshot) return;
        try {
            const basePayload = {
                description: snapshot.description,
                priority: snapshot.priority || 'medium',
                task_level: snapshot.task_level || 1
            };
            if (snapshot.due_date) basePayload.due_date = snapshot.due_date;
            const createRes = await fetch('/api/tasks', {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify(basePayload)
            });
            if (!createRes.ok) throw new Error('Failed to recreate quest');
            let createdQuest = normalizeQuest(await createRes.json());
            const newQuestId = createdQuest.id;
            const originalSideQuests = Array.isArray(snapshot.side_quests) ? snapshot.side_quests : [];
            for (const sub of originalSideQuests) {
                if (!sub || !sub.description) continue;
                const subRes = await fetch(`/api/tasks/${newQuestId}/subtasks`, {
                    method: 'POST',
                    headers: getAuthHeaders(),
                    body: JSON.stringify({ description: sub.description })
                });
                if (!subRes.ok) throw new Error('Failed to recreate subtask');
                createdQuest = normalizeQuest(await subRes.json());
                const latestSub = Array.isArray(createdQuest.side_quests) ? createdQuest.side_quests[createdQuest.side_quests.length - 1] : null;
                const desiredStatus = sub.status || (sub.completed ? 'done' : 'todo');
                if (latestSub && desiredStatus && desiredStatus !== 'todo') {
                    const statusRes = await fetch(`/api/tasks/${newQuestId}/subtasks/${latestSub.id}/status`, {
                        method: 'PATCH',
                        headers: getAuthHeaders(),
                        body: JSON.stringify({ status: desiredStatus })
                    });
                    if (!statusRes.ok) throw new Error('Failed to restore subtask status');
                }
            }
            const questStatus = getQuestStatus(snapshot);
            if (questStatus && questStatus !== 'todo') {
                const questStatusRes = await fetch(`/api/tasks/${newQuestId}/status`, {
                    method: 'PATCH',
                    headers: getAuthHeaders(),
                    body: JSON.stringify({ status: questStatus })
                });
                if (!questStatusRes.ok) throw new Error('Failed to restore quest status');
            }
            await reloadTasks();
            setTimeout(() => handleSelectQuest(newQuestId), 10);
            pushToast('Quest restored', 'success');
        } catch (error) {
            console.error('Error restoring quest:', error);
            pushToast('Failed to restore quest', 'error');
            try { await reloadTasks(); } catch {}
        }
    };

    const handleUndoDelete = (entryId) => {
        const entry = undoQueue.find(item => item.id === entryId);
        if (!entry) return;
        dismissUndoEntry(entryId);
        restoreQuestFromSnapshot(entry.quest);
    };

    const deleteTask = (id) => {
        const questToDelete = findQuestById(id);
        fetch(`/api/tasks/${id}`, { method: 'DELETE', headers: getAuthHeaders() })
            .then(() => {
                setQuests(prev => prev.filter(quest => quest.id !== id));
                setCelebratingQuests(prev => {
                    if (!prev || !prev[id]) return prev;
                    const copy = { ...prev };
                    delete copy[id];
                    return copy;
                });
                if (selectedQuestId !== null && idsMatch(selectedQuestId, id)) {
                    setSelectedQuestId(null);
                    setSelectedSideQuest(null);
                }
                if (editingQuest && idsMatch(editingQuest.id, id)) {
                    setEditingQuest(null);
                }
                if (questToDelete) scheduleQuestUndo(questToDelete);
            })
            .catch(error => console.error('Error deleting quest:', error));
    };

    const updateTask = (id, updatedTask) => {
        const payload = { ...updatedTask };
        if (Object.prototype.hasOwnProperty.call(payload, 'task_level')) {
            payload.task_level = Number(payload.task_level) || 1;
        }
        fetch(`/api/tasks/${id}`, { method: 'PUT', headers: getAuthHeaders(), body: JSON.stringify(payload) })
            .then(res => res.json())
            .then(updatedQuest => {
                const normalized = normalizeQuest(updatedQuest);
                setQuests(prev => prev.map(q => (q.id === id ? normalized : q)));
                setEditingQuest(null);
            })
            .catch(error => console.error('Error updating quest:', error));
    };

    const [toasts, setToasts] = useState([]);
    const [pulsingQuests, setPulsingQuests] = useState({}); // value: 'full' | 'subtle' | 'spawn'
    const [pulsingSideQuests, setPulsingSideQuests] = useState({});
    const [glowQuests, setGlowQuests] = useState({});
    const [celebratingQuests, setCelebratingQuests] = useState({});
    const [spawnQuests, setSpawnQuests] = useState({});

    const pushToast = (msg, type = 'info', timeout = 3000) => {
        const id = Date.now() + Math.random();
        setToasts(prev => [...prev, { id, msg, type }]);
        setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), timeout);
    };

    const reloadTasks = () => {
        if (!token) return Promise.resolve();
        const headers = { Authorization: `Bearer ${token}` };
        return fetch('/api/tasks', { headers })
            .then(res => res.ok ? res.json() : null)
            .then(data => {
                if (data) {
                    const payload = data.tasks || data.quests || [];
                    setQuests(normalizeQuestList(payload));
                }
            })
            .catch(err => {
                console.error('Error reloading quests:', err);
                pushToast('Failed to refresh quests', 'error');
            });
    };

    const handleXpPayload = (payload) => {
        if (!payload) return;
        if (payload.player_rpg) {
            setPlayerStats(payload.player_rpg);
        }
        const events = Array.isArray(payload.xp_events)
            ? payload.xp_events
            : (payload.xp_event ? [payload.xp_event] : []);
        events.forEach(event => {
            if (!event) return;
            const message = event.message || `Gained ${event.amount} XP`;
            pushToast(message, 'success', 4000);
            if (event.leveled_up && event.level_after) {
                pushToast(`Level up! Reached level ${event.level_after}`, 'success', 5000);
            }
        });
    };

    const scheduleCollapseAndMove = (questId, delay = 600) => {
        const ensureAtBottomCollapsed = () => {
            let shouldCollapse = false;
            setQuests(prev => {
                const index = prev.findIndex(q => idsMatch(q.id, questId));
                if (index === -1) return prev;
                const quest = prev[index];
                if (getQuestStatus(quest) !== 'done') return prev;
                shouldCollapse = true;
                const next = [...prev];
                const [item] = next.splice(index, 1);
                next.push(item);
                return next;
            });
            if (shouldCollapse) {
                setCollapsedMap(prev => ({ ...prev, [questId]: true }));
            }
        };
        if (typeof window !== 'undefined') {
            if (completedCollapseTimersRef.current && typeof completedCollapseTimersRef.current[questId] === 'number') {
                clearTimeout(completedCollapseTimersRef.current[questId]);
                delete completedCollapseTimersRef.current[questId];
            }
            if (!completedCollapseTimersRef.current) completedCollapseTimersRef.current = {};
            completedCollapseTimersRef.current[questId] = window.setTimeout(() => {
                ensureAtBottomCollapsed();
                if (completedCollapseTimersRef.current) {
                    delete completedCollapseTimersRef.current[questId];
                }
            }, delay);
        } else {
            ensureAtBottomCollapsed();
        }
    };

    const claimDailyReward = () => {
        if (dailyLoading) return;
        setDailyLoading(true);
        fetch('/api/rpg/daily-reward', { method: 'POST', headers: getAuthHeaders() })
            .then(async res => {
                const data = await res.json().catch(() => ({}));
                if (!res.ok) {
                    const message = data && data.error ? data.error : 'Unable to claim daily reward';
                    pushToast(message, 'error', 4000);
                    return null;
                }
                return data;
            })
            .then(data => {
                if (!data) return;
                handleXpPayload(data);
            })
            .catch(error => {
                console.error('Error claiming daily reward:', error);
                pushToast('Failed to claim daily reward', 'error', 4000);
            })
            .finally(() => setDailyLoading(false));
    };

    const clearAllQuests = () => {
        if (debugBusy) return;
        setDebugBusy(true);
        fetch('/api/debug/clear-tasks', { method: 'POST', headers: getAuthHeaders() })
            .then(res => res.json())
            .then(data => {
                setQuests([]);
                pushToast(`Cleared ${data.removed || 0} quests`, 'success');
            })
            .catch(err => {
                console.error('Error clearing quests:', err);
                pushToast('Failed to clear quests', 'error');
            })
            .finally(() => setDebugBusy(false));
    };

    const seedDemoQuests = (count = 5) => {
        if (debugBusy) return;
        setDebugBusy(true);
        fetch('/api/debug/seed-tasks', {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({ count })
        })
            .then(res => res.json())
            .then(data => {
                pushToast(`Seeded ${data.created || 0} demo quests`, 'success');
                return reloadTasks();
            })
            .catch(err => {
                console.error('Error seeding quests:', err);
                pushToast('Failed to seed quests', 'error');
            })
            .finally(() => setDebugBusy(false));
    };

    const grantXp = (amount) => {
        if (debugBusy) return;
        setDebugBusy(true);
        fetch('/api/debug/grant-xp', {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({ amount })
        })
            .then(res => res.json())
            .then(data => {
                handleXpPayload(data);
                const msg = data && data.xp_event && data.xp_event.message
                    ? data.xp_event.message
                    : `Adjusted XP by ${amount}`;
                pushToast(msg, 'success');
            })
            .catch(err => {
                console.error('Error granting XP:', err);
                pushToast('Failed to grant XP', 'error');
            })
            .finally(() => setDebugBusy(false));
    };

    const resetRpgStats = () => {
        if (debugBusy) return;
        setDebugBusy(true);
        fetch('/api/debug/reset-rpg', { method: 'POST', headers: getAuthHeaders() })
            .then(res => res.json())
            .then(data => {
                handleXpPayload(data);
                pushToast('Reset RPG stats', 'success');
            })
            .catch(err => {
                console.error('Error resetting RPG stats:', err);
                pushToast('Failed to reset RPG stats', 'error');
            })
            .finally(() => setDebugBusy(false));
    };

    const setTaskStatus = (id, status, note) => {
        fetch(`/api/tasks/${id}/status`, { method: 'PATCH', headers: getAuthHeaders(), body: JSON.stringify({ status, note }) })
            .then(res => res.json())
            .then(updatedQuest => {
                handleXpPayload(updatedQuest);
                const normalized = normalizeQuest(updatedQuest);
                setQuests(prev => prev.map(t => (t.id === id ? normalized : t)));
                // pulse the task card to indicate direct change (bigger bump)
                setPulsingQuests(prev => ({ ...prev, [id]: 'full' }));
                setTimeout(() => setPulsingQuests(prev => { const c = { ...prev }; delete c[id]; return c }), 700);
                // if the task completed, trigger a glow animation
                if (status === 'done') {
                    setGlowQuests(prev => ({ ...prev, [id]: true }));
                    setTimeout(() => setGlowQuests(prev => { const c = { ...prev }; delete c[id]; return c }), 1400);
                    setCelebratingQuests(prev => ({ ...prev, [id]: true }));
                    setTimeout(() => setCelebratingQuests(prev => {
                        const copy = { ...prev };
                        delete copy[id];
                        return copy;
                    }), 1400);
                    scheduleCollapseAndMove(id);
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
                handleXpPayload(updatedQuest);
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
                    setCelebratingQuests(prev => ({ ...prev, [taskId]: true }));
                    setTimeout(() => setCelebratingQuests(prev => {
                        const copy = { ...prev };
                        delete copy[taskId];
                        return copy;
                    }), 1400);
                    scheduleCollapseAndMove(taskId);
                }
                pushToast(`Side-quest ${subTaskId} updated to ${status.replace('_',' ')}`, 'success');
            })
            .catch(error => {
                console.error('Error updating side-quest status:', error);
                pushToast('Failed to update side-quest status', 'error');
            });
    };

    const updateSideQuest = (taskId, subTaskId, payload) => {
        return fetch(`/api/tasks/${taskId}/subtasks/${subTaskId}`, { method: 'PUT', headers: getAuthHeaders(), body: JSON.stringify(payload) })
            .then(res => {
                if (!res.ok) {
                    const err = new Error('Failed to update side-quest');
                    err.status = res.status;
                    throw err;
                }
                return res.json();
            })
            .then(updatedQuest => {
                const normalized = normalizeQuest(updatedQuest);
                setQuests(prev => prev.map(quest => (quest.id === taskId ? normalized : quest)));
                return normalized;
            });
    };

    const deleteSideQuest = (taskId, subTaskId) => {
        const parentQuest = findQuestById(taskId);
        let fallbackSideQuestId = null;
        if (parentQuest && Array.isArray(parentQuest.side_quests)) {
            const subs = parentQuest.side_quests;
            const currentIdx = subs.findIndex(sub => idsMatch(sub.id, subTaskId));
            if (currentIdx !== -1) {
                const next = subs[currentIdx + 1] || subs[currentIdx - 1] || null;
                if (next) fallbackSideQuestId = next.id;
            }
        }
        fetch(`/api/tasks/${taskId}/subtasks/${subTaskId}`, { method: 'DELETE', headers: getAuthHeaders() })
            .then(res => {
                if (res.status === 204) {
                    return { id: taskId };
                }
                if (!res.ok) {
                    const err = new Error('Failed to delete side-quest');
                    err.status = res.status;
                    throw err;
                }
                return res.json();
            })
            .then(updatedQuest => {
                if (updatedQuest && updatedQuest.id !== undefined) {
                    const normalized = normalizeQuest(updatedQuest);
                    setQuests(prev => prev.map(quest => {
                        if (quest.id === taskId) return normalized;
                        return quest;
                    }));
                } else {
                    setQuests(prev => prev.map(quest => {
                        if (quest.id !== taskId) return quest;
                        const subs = getQuestSideQuests(quest).filter(sub => !idsMatch(sub.id, subTaskId));
                        return { ...quest, side_quests: subs };
                    }));
                }
                if (selectedSideQuest && idsMatch(selectedSideQuest.questId, taskId) && idsMatch(selectedSideQuest.sideQuestId, subTaskId)) {
                    if (fallbackSideQuestId) {
                        setSelectedSideQuest({ questId: taskId, sideQuestId: fallbackSideQuestId });
                    } else {
                        setSelectedSideQuest(null);
                    }
                }
                if (editingSideQuest && idsMatch(editingSideQuest.questId, taskId) && idsMatch(editingSideQuest.sideQuestId, subTaskId)) {
                    setEditingSideQuest(null);
                }
                pushToast('Side-quest deleted', 'success');
            })
            .catch(error => {
                console.error('Error deleting side-quest:', error);
                pushToast('Failed to delete side-quest', 'error');
            });
    };

    const startEditingSideQuest = (questId, sideQuest) => {
        if (!sideQuest) return;
        setEditingSideQuest({ questId, sideQuestId: sideQuest.id, description: sideQuest.description || '' });
        handleSelectSideQuest(questId, sideQuest.id);
        setTimeout(() => {
            try {
                const input = document.querySelector(`input[data-subtask-edit="${questId}:${sideQuest.id}"]`);
                if (input) input.focus();
            } catch {}
        }, 30);
    };

    const handleSideQuestEditChange = (value) => {
        setEditingSideQuest(prev => prev ? { ...prev, description: value } : prev);
    };

    const cancelSideQuestEdit = () => {
        setEditingSideQuest(null);
    };

    const saveSideQuestEdit = (questId, subTaskId) => {
        if (!editingSideQuest || !idsMatch(editingSideQuest.questId, questId) || !idsMatch(editingSideQuest.sideQuestId, subTaskId)) return;
        const nextDescription = (editingSideQuest.description || '').trim();
        if (!nextDescription) {
            pushToast('Description cannot be empty', 'error');
            return;
        }
        updateSideQuest(questId, subTaskId, { description: nextDescription })
            .then(() => {
                setEditingSideQuest(null);
                pushToast('Side-quest updated', 'success');
            })
            .catch(error => {
                console.error('Error updating side-quest:', error);
                pushToast('Failed to update side-quest', 'error');
            });
    };

    const handleEditChange = (e) => {
        const { name, value } = e.target;
        setEditingQuest(prevQuest => ({
            ...prevQuest,
            [name]: name === 'task_level' ? Number(value) : value
        }));
    };

    const getNextPriority = (current) => {
        const index = PRIORITY_ORDER.indexOf(current);
        const nextIndex = index === -1 ? 0 : (index + 1) % PRIORITY_ORDER.length;
        return PRIORITY_ORDER[nextIndex];
    };

    const getNextLevel = (current) => {
        const idx = LEVEL_OPTIONS.indexOf(Number(current));
        const nextIdx = idx === -1 ? 0 : (idx + 1) % LEVEL_OPTIONS.length;
        return LEVEL_OPTIONS[nextIdx];
    };

    const cyclePriority = () => {
        setPriority(prev => getNextPriority(prev));
    };

    const cycleTaskLevel = () => {
        setTaskLevel(prev => getNextLevel(prev));
    };

    const cycleEditingPriority = () => {
        setEditingQuest(prev => prev ? { ...prev, priority: getNextPriority(prev.priority || 'low') } : prev);
    };

    const cycleEditingLevel = () => {
        setEditingQuest(prev => prev ? { ...prev, task_level: getNextLevel(prev.task_level || 1) } : prev);
    };

    const renderEditForm = (quest) => {
        const currentPriority = editingQuest?.priority || 'medium';
        const currentLevel = editingQuest?.task_level || 1;
        return (
            <div className="edit-quest-form" key={quest.id}>
                <input
                    type="text"
                    name="description"
                    value={editingQuest?.description || ''}
                    onChange={handleEditChange}
                    ref={editingQuestInputRef}
                    onKeyDown={e => {
                        if (e.key === 'Enter') {
                            e.preventDefault();
                            const currentPriority = editingQuest?.priority || 'medium';
                            const currentLevel = editingQuest?.task_level || 1;
                            updateTask(quest.id, {
                                description: editingQuest?.description,
                                priority: currentPriority,
                                task_level: currentLevel || 1
                            });
                        } else if (e.key === 'Escape') {
                            e.preventDefault();
                            setEditingQuest(null);
                        }
                    }}
                />
                <button
                    type="button"
                    className="cycle-toggle priority-toggle"
                    onClick={cycleEditingPriority}
                    title="Cycle quest urgency"
                >
                    Urgency: <span className={`priority-pill ${currentPriority}`}>{currentPriority}</span>
                </button>
                <button
                    type="button"
                    className="cycle-toggle level-toggle"
                    onClick={cycleEditingLevel}
                    title="Cycle quest level"
                >
                    Lv. {currentLevel}
                </button>
                <button
                    className="btn-primary"
                    onClick={() => updateTask(quest.id, {
                        description: editingQuest.description,
                        priority: currentPriority,
                        task_level: currentLevel || 1
                    })}
                >
                    Save
                </button>
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

    useEffect(() => {
        if (selectedQuestId !== null) {
            const questExists = quests.some(q => idsMatch(q.id, selectedQuestId));
            if (!questExists) {
                setSelectedQuestId(null);
            }
        }
        if (selectedSideQuest) {
            const parentQuest = quests.find(q => idsMatch(q.id, selectedSideQuest.questId));
            const hasSideQuest = !!findSideQuestById(parentQuest, selectedSideQuest.sideQuestId);
            if (!hasSideQuest) {
                setSelectedSideQuest(null);
            }
        }
    }, [quests, selectedQuestId, selectedSideQuest]);

    useEffect(() => {
        if (!editingSideQuest) return;
        const matchesSelection = selectedSideQuest
            && idsMatch(selectedSideQuest.questId, editingSideQuest.questId)
            && idsMatch(selectedSideQuest.sideQuestId, editingSideQuest.sideQuestId);
        if (!matchesSelection) {
            setEditingSideQuest(null);
        }
    }, [selectedSideQuest, editingSideQuest]);

    useEffect(() => {
        if (editingQuest && editingQuestInputRef.current) {
            try {
                editingQuestInputRef.current.focus();
                editingQuestInputRef.current.select();
            } catch {}
        }
    }, [editingQuest]);

    useEffect(() => {
        return () => {
            if (undoTimersRef.current) {
                Object.values(undoTimersRef.current).forEach(timer => {
                    if (typeof timer === 'number') {
                        clearTimeout(timer);
                    }
                });
            }
            if (completedCollapseTimersRef.current) {
                Object.values(completedCollapseTimersRef.current).forEach(timer => {
                    if (typeof timer === 'number') {
                        clearTimeout(timer);
                    }
                });
            }
        };
    }, []);

    useEffect(() => {
        const handleKeyDown = (e) => {
            const target = e.target;
            const tag = target && target.tagName ? target.tagName.toLowerCase() : '';
            if (tag === 'input' || tag === 'textarea' || tag === 'select' || (target && target.isContentEditable)) return;
            const skipShortcuts = target && (
                (target.dataset && target.dataset.skipShortcuts === 'true') ||
                (typeof target.closest === 'function' && target.closest('[data-skip-shortcuts="true"]'))
            );
            if (skipShortcuts) return;
            if (e.metaKey || e.ctrlKey || e.altKey) return;

            if (!Array.isArray(quests) || quests.length === 0) return;

            const currentQuestIndex = selectedQuestId !== null
                ? quests.findIndex(q => idsMatch(q.id, selectedQuestId))
                : -1;
            const currentQuest = currentQuestIndex >= 0 ? quests[currentQuestIndex] : null;

            switch (e.key) {
                case 'ArrowDown': {
                    e.preventDefault();
                    if (selectedSideQuest && currentQuest) {
                        const subs = getQuestSideQuests(currentQuest);
                        const idx = subs.findIndex(s => idsMatch(s.id, selectedSideQuest.sideQuestId));
                        if (idx !== -1 && idx < subs.length - 1) {
                            handleSelectSideQuest(currentQuest.id, subs[idx + 1].id);
                            return;
                        }
                        setSelectedSideQuest(null);
                    }
                    moveQuestSelection(1);
                    break;
                }
                case 'ArrowUp': {
                    e.preventDefault();
                    if (selectedSideQuest && currentQuest) {
                        const subs = getQuestSideQuests(currentQuest);
                        const idx = subs.findIndex(s => idsMatch(s.id, selectedSideQuest.sideQuestId));
                        if (idx > 0) {
                            handleSelectSideQuest(currentQuest.id, subs[idx - 1].id);
                            return;
                        }
                        setSelectedSideQuest(null);
                        handleSelectQuest(currentQuest.id);
                        return;
                    }
                    moveQuestSelection(-1);
                    break;
                }
                case 'ArrowRight': {
                    if (selectedSideQuest) break;
                    if (currentQuest) {
                        ensureQuestExpanded(currentQuest.id);
                        const subs = Array.isArray(currentQuest.side_quests) ? currentQuest.side_quests : [];
                        if (subs.length > 0) {
                            e.preventDefault();
                            selectFirstSideQuest(currentQuest.id);
                        }
                    }
                    break;
                }
                case 'ArrowLeft': {
                    if (selectedSideQuest) {
                        e.preventDefault();
                        setSelectedSideQuest(null);
                        if (currentQuest) handleSelectQuest(currentQuest.id);
                    }
                    break;
                }
                case 'Delete':
                case 'Backspace': {
                    if (selectedSideQuest && currentQuest) {
                        e.preventDefault();
                        const subs = getQuestSideQuests(currentQuest);
                        const match = subs.find(s => idsMatch(s.id, selectedSideQuest.sideQuestId));
                        const label = match && match.description ? match.description : 'this side-quest';
                        if (window.confirm(`Delete ${label}?`)) {
                            deleteSideQuest(selectedSideQuest.questId, selectedSideQuest.sideQuestId);
                        }
                    } else if (selectedQuestId !== null && currentQuest) {
                        e.preventDefault();
                        const label = currentQuest.description || 'this quest';
                        if (window.confirm(`Delete ${label}?`)) {
                            deleteTask(currentQuest.id);
                        }
                    }
                    break;
                }
                case 'Enter': {
                    if (selectedSideQuest && currentQuest) {
                        e.preventDefault();
                        const subs = getQuestSideQuests(currentQuest);
                        const match = subs.find(s => idsMatch(s.id, selectedSideQuest.sideQuestId));
                        if (match) {
                            startEditingSideQuest(currentQuest.id, match);
                        }
                    } else if (currentQuest) {
                        e.preventDefault();
                        setEditingQuest({ ...currentQuest });
                    }
                    break;
                }
                default:
                    break;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [
        quests,
        selectedQuestId,
        selectedSideQuest,
        moveQuestSelection,
        ensureQuestExpanded,
        selectFirstSideQuest,
        handleSelectQuest,
        handleSelectSideQuest,
        deleteSideQuest,
        deleteTask
    ]);

    const globalProgress = useMemo(() => getGlobalProgress(), [quests]);
    const globalAura = useMemo(() => getProgressAura(globalProgress.percent), [globalProgress.percent]);
    const globalLabel = globalProgress.weightingToday
        ? `Today (${globalProgress.todayCount} quest${globalProgress.todayCount === 1 ? '' : 's'}${globalProgress.backlogCount ? ` + ${globalProgress.backlogCount} backlog` : ''})`
        : `All quests (${globalProgress.totalCount})`;
    const todayKey = new Date().toISOString().split('T')[0];
    const dailyClaimed = !!(playerStats && playerStats.last_daily_reward_at === todayKey);
    const xpPercent = playerStats ? Math.round((playerStats.xp_progress || 0) * 100) : 0;

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
                <button className="btn-primary" onClick={addTask}>Add Quest</button>
            </div>
            <div className="quest-container">
                {quests.map(quest => {
                    const questStatus = getQuestStatus(quest);
                    const questStatusLabel = getQuestStatusLabel(quest);
                    const questSelected = selectedQuestId !== null && idsMatch(selectedQuestId, quest.id);
                    const questSideQuests = getQuestSideQuests(quest);
                    const questProgress = getQuestProgress(quest);
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
                                                        <h3>{quest.description}</h3>
                                                        <div style={{marginLeft:12, display:'flex', alignItems:'center', gap:8}}>
                                                            <span className={`priority-pill ${quest.priority}`}>{quest.priority}</span>
                                                            <span className="level-pill">Lv. {quest.task_level || 1}</span>
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
