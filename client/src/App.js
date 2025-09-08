import React, { useState, useEffect, useRef } from 'react';
import './App.css';

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
    const [tasks, setTasks] = useState([]);
    const [description, setDescription] = useState('');
    const [priority, setPriority] = useState('medium');
    const [editingTask, setEditingTask] = useState(null);
    // store subtask descriptions per task id to allow multiple open forms
    const [subTaskDescriptionMap, setSubTaskDescriptionMap] = useState({});
    const [addingSubtaskTo, setAddingSubtaskTo] = useState(null);
    const [collapsedMap, setCollapsedMap] = useState({});
    const [draggedTaskId, setDraggedTaskId] = useState(null);
    const [dragOverTaskId, setDragOverTaskId] = useState(null);
    const [dragPosition, setDragPosition] = useState(null); // 'above' | 'below'
    const [draggedSubtask, setDraggedSubtask] = useState(null);
    const [subDragOver, setSubDragOver] = useState({ taskId: null, subId: null, position: null });
    const addInputRefs = useRef({});

    useEffect(() => {
        fetch('/api/tasks')
            .then(res => res.json())
            .then(data => setTasks(data.tasks))
            .catch(error => console.error('Error fetching tasks:', error));
    }, []);

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
    const subtaskWeight = (sub, parent) => {
        if (!sub) return 1.0;
        if (typeof sub.weight === 'number') return Math.max(0.1, sub.weight);
        if (sub.priority) return priorityWeight(sub.priority);
        if (sub.difficulty) return priorityWeight(sub.difficulty);
        return priorityWeight(parent && parent.priority ? parent.priority : 'medium');
    };

    // compute weighted progress for a task (0-100). If subtasks exist, use their weights.
    const getTaskProgress = (task) => {
        if (!task) return 0;
        const subs = Array.isArray(task.sub_tasks) ? task.sub_tasks : [];
        if (subs.length > 0) {
            let weightedDone = 0;
            let weightSum = 0;
            subs.forEach(sub => {
                const w = subtaskWeight(sub, task);
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
        const dayTasks = tasks.filter(t => t && t.due_date === today);
        const pool = dayTasks.length > 0 ? dayTasks : tasks;
        if (!pool || pool.length === 0) return { percent: 0, count: 0 };
        let weightSum = 0;
        let weightedProgressSum = 0;
        pool.forEach(t => {
            // task base weight
            const baseW = priorityWeight(t.priority);
            // include subtask weights so tasks with many/heavy subtasks count more
            const subs = Array.isArray(t.sub_tasks) ? t.sub_tasks : [];
            let subWeights = 0;
            subs.forEach(s => { subWeights += subtaskWeight(s, t); });
            const taskTotalWeight = baseW + subWeights;
            weightSum += taskTotalWeight;
            weightedProgressSum += (getTaskProgress(t) || 0) * taskTotalWeight;
        });
        const percent = weightSum > 0 ? Math.round(weightedProgressSum / weightSum) : 0;
        return { percent, count: pool.length };
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
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ description, priority }),
        })
            .then(res => res.json())
            .then(newTask => {
                setTasks([...tasks, newTask]);
                setDescription('');
                setPriority('medium');
            })
            .catch(error => console.error('Error adding task:', error));
    };

    const addSubTask = (taskId) => {
    const description = subTaskDescriptionMap[taskId] || '';
    if (!description || description.trim() === '') return;
        fetch(`/api/tasks/${taskId}/subtasks`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ description }),
        })
            .then(res => res.json())
            .then(updatedTask => {
                // server returns the updated task; use functional update to avoid stale tasks
                setTasks(prev => prev.map(task => (task.id === taskId ? updatedTask : task)));
                // clear the input state but keep the add form open for rapid entry
                setSubTaskDescriptionMap(prev => ({ ...prev, [taskId]: '' }));
                // focus the input if available
                setTimeout(() => {
                    if (addInputRefs.current && addInputRefs.current[taskId]) {
                        try { addInputRefs.current[taskId].focus(); } catch (err) {}
                    }
                }, 10);
            })
            .catch(error => console.error('Error adding sub-task:', error));
    };

    const toggleCollapse = (taskId) => {
        setCollapsedMap(prev => ({ ...prev, [taskId]: !prev[taskId] }));
    };

    const handleDragStart = (e, taskId) => {
        setDraggedTaskId(taskId);
        setDragOverTaskId(null);
        setDragPosition(null);
        e.dataTransfer.effectAllowed = 'move';
        try { e.dataTransfer.setData('text/plain', String(taskId)); } catch (err) {}
    };

    const handleDragEnd = (e) => {
        setDraggedTaskId(null);
        setDragOverTaskId(null);
        setDragPosition(null);
    };

    const handleDragOver = (e, taskId) => {
    // if a subtask is being dragged, ignore parent dragover to avoid interference
    if (draggedSubtask) return;
    e.preventDefault();
        // compute whether the mouse is in upper or lower half
        const rect = e.currentTarget.getBoundingClientRect();
        const offsetY = e.clientY - rect.top;
        const pos = offsetY < rect.height / 2 ? 'above' : 'below';
        setDragOverTaskId(taskId);
        setDragPosition(pos);
    };

    const handleDragLeave = (e) => {
        // when leaving, clear position indicators
        setDragOverTaskId(null);
        setDragPosition(null);
    };

    const handleDrop = (e, targetTaskId) => {
        e.preventDefault();
    // ignore parent drops while a subtask is being dragged
    if (draggedSubtask) return;
        const sourceId = draggedTaskId || e.dataTransfer.getData('text/plain');
        if (!sourceId) return;
        const src = String(sourceId);
        const tgt = String(targetTaskId);
        if (src === tgt) {
            setDraggedTaskId(null);
            setDragOverTaskId(null);
            setDragPosition(null);
            return;
        }
        setTasks(prev => {
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
        setDraggedTaskId(null);
        setDragOverTaskId(null);
        setDragPosition(null);
    };

    // Subtask drag handlers (reorder subtasks within the same parent task)
    const handleSubDragStart = (e, taskId, subId) => {
    e.stopPropagation();
    setDraggedSubtask({ taskId, subId });
    setSubDragOver({ taskId: null, subId: null, position: null });
    e.dataTransfer.effectAllowed = 'move';
    try { e.dataTransfer.setData('text/plain', `${taskId}:${subId}`); } catch (err) {}
    };

    const handleSubDragEnd = () => {
    // stopPropagation not available here; ensure we clear state
    setDraggedSubtask(null);
    setSubDragOver({ taskId: null, subId: null, position: null });
    };

    const handleSubDragOver = (e, taskId, subId) => {
    e.preventDefault();
    e.stopPropagation();
        const rect = e.currentTarget.getBoundingClientRect();
        const offsetY = e.clientY - rect.top;
        const pos = offsetY < rect.height / 2 ? 'above' : 'below';
        setSubDragOver({ taskId, subId, position: pos });
    };

    const handleSubDrop = (e, taskId, subId) => {
    e.preventDefault();
    e.stopPropagation();
        const srcData = draggedSubtask || (() => {
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
        if (String(srcTaskId) !== String(taskId)) {
            setDraggedSubtask(null);
            setSubDragOver({ taskId: null, subId: null, position: null });
            return;
        }

        setTasks(prev => prev.map(task => {
            if (String(task.id) !== String(taskId)) return task;
            const subs = Array.isArray(task.sub_tasks) ? [...task.sub_tasks] : [];
            const fromIdx = subs.findIndex(s => String(s.id) === String(srcSubId));
            const toIdx = subs.findIndex(s => String(s.id) === String(subId));
            if (fromIdx === -1 || toIdx === -1) return task;
            const [moved] = subs.splice(fromIdx, 1);
            const insertAt = subDragOver.position === 'above' ? toIdx : toIdx + 1;
            const adjusted = fromIdx < insertAt ? insertAt - 1 : insertAt;
            subs.splice(adjusted, 0, moved);
            return { ...task, sub_tasks: subs };
        }));

        setDraggedSubtask(null);
        setSubDragOver({ taskId: null, subId: null, position: null });
    };

    const deleteTask = (id) => {
        fetch(`/api/tasks/${id}`, { method: 'DELETE' })
            .then(() => {
                setTasks(tasks.filter(task => task.id !== id));
            })
            .catch(error => console.error('Error deleting task:', error));
    };

    const updateTask = (id, updatedTask) => {
        fetch(`/api/tasks/${id}`,
            {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(updatedTask),
            })
            .then(res => res.json())
            .then(updatedTask => {
                setTasks(tasks.map(task => (task.id === id ? updatedTask : task)));
                setEditingTask(null);
            })
            .catch(error => console.error('Error updating task:', error));
    };

    const [toasts, setToasts] = useState([]);
    const [pulsingTasks, setPulsingTasks] = useState({}); // value: 'full' | 'subtle'
    const [pulsingSubtasks, setPulsingSubtasks] = useState({});
    const [glowTasks, setGlowTasks] = useState({});

    const pushToast = (msg, type = 'info', timeout = 3000) => {
        const id = Date.now() + Math.random();
        setToasts(prev => [...prev, { id, msg, type }]);
        setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), timeout);
    };

    const setTaskStatus = (id, status, note) => {
        fetch(`/api/tasks/${id}/status`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status, note }),
        })
            .then(res => res.json())
            .then(updatedTask => {
                setTasks(prev => prev.map(t => (t.id === id ? updatedTask : t)));
                // pulse the task card to indicate direct change (bigger bump)
                setPulsingTasks(prev => ({ ...prev, [id]: 'full' }));
                setTimeout(() => setPulsingTasks(prev => { const c = { ...prev }; delete c[id]; return c }), 700);
                // if the task completed, trigger a glow animation
                if (status === 'done') {
                    setGlowTasks(prev => ({ ...prev, [id]: true }));
                    setTimeout(() => setGlowTasks(prev => { const c = { ...prev }; delete c[id]; return c }), 1400);
                }
                pushToast(`Task ${updatedTask.id} set to ${status.replace('_',' ')}`, 'success');
            })
            .catch(error => {
                console.error('Error updating task status:', error);
                pushToast('Failed to update task status', 'error');
            });
    };

    const setSubtaskStatus = (taskId, subTaskId, status, note) => {
        fetch(`/api/tasks/${taskId}/subtasks/${subTaskId}/status`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status, note })
        })
            .then(res => res.json())
            .then(updatedTask => {
                setTasks(prev => prev.map(task => (task.id === taskId ? updatedTask : task)));
                // subtle pulse on parent when a subtask changed
                setPulsingTasks(prev => ({ ...prev, [taskId]: 'subtle' }));
                setTimeout(() => setPulsingTasks(prev => { const c = { ...prev }; delete c[taskId]; return c }), 500);
                // also pulse the specific subtask id for micro-feedback
                setPulsingSubtasks(prev => ({ ...prev, [`${taskId}:${subTaskId}`]: true }));
                setTimeout(() => setPulsingSubtasks(prev => { const c = { ...prev }; delete c[`${taskId}:${subTaskId}`]; return c }), 600);
                // if the parent task is now done (subtask completed caused it), trigger glow
                if (updatedTask && updatedTask.status === 'done') {
                    setGlowTasks(prev => ({ ...prev, [taskId]: true }));
                    setTimeout(() => setGlowTasks(prev => { const c = { ...prev }; delete c[taskId]; return c }), 1400);
                }
                pushToast(`Subtask ${subTaskId} updated to ${status.replace('_',' ')}`, 'success');
            })
            .catch(error => {
                console.error('Error updating sub-task status:', error);
                pushToast('Failed to update subtask status', 'error');
            });
    };

    const handleEditChange = (e) => {
        const { name, value } = e.target;
        setEditingTask(prevTask => ({
            ...prevTask,
            [name]: value
        }));
    };

    const renderEditForm = (task) => {
        return (
            <div className="edit-task-form" key={task.id}>
                <input
                    type="text"
                    name="description"
                    value={editingTask?.description || ''}
                    onChange={handleEditChange}
                />
                <select
                    name="priority"
                    value={editingTask?.priority || 'medium'}
                    onChange={handleEditChange}
                >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                </select>
                <button className="btn-primary" onClick={() => updateTask(task.id, { description: editingTask.description, priority: editingTask.priority })}>Save</button>
                <button className="btn-ghost" onClick={() => setEditingTask(null)}>Cancel</button>
            </div>
        );
    }

    const renderAddSubtaskForm = (task) => {
        return (
            <div className="add-subtask-form">
                <input
                    type="text"
                    placeholder="Sub-task description"
                    value={subTaskDescriptionMap[task.id] || ''}
                    onChange={e => setSubTaskDescriptionMap(prev => ({ ...prev, [task.id]: e.target.value }))}
                    ref={el => { if (!addInputRefs.current) addInputRefs.current = {}; addInputRefs.current[task.id] = el }}
                    onKeyDown={e => {
                        if (e.key === 'Enter') {
                            e.preventDefault();
                            addSubTask(task.id);
                            // keep focus and clear input so user can type next subtask
                            setTimeout(() => {
                                if (addInputRefs.current && addInputRefs.current[task.id]) {
                                    addInputRefs.current[task.id].focus();
                                    addInputRefs.current[task.id].value = '';
                                }
                            }, 10);
                        }
                    }}
                />
                <button className="btn-primary" onClick={() => addSubTask(task.id)}>Add</button>
                <button className="btn-ghost" onClick={() => setAddingSubtaskTo(null)}>Cancel</button>
            </div>
        );
    }

    // focus the add-subtask input when the form opens
    useEffect(() => {
        if (addingSubtaskTo && addInputRefs.current && addInputRefs.current[addingSubtaskTo]) {
            setTimeout(() => {
                try { addInputRefs.current[addingSubtaskTo].focus(); } catch (err) {}
            }, 20);
        }
    }, [addingSubtaskTo]);

    return (
        <div className="App container">
            {/* Global sticky progress bar for the day */}
            <div className="global-progress-sticky">
                <div className="global-progress-inner">
                    <div className="global-progress-label">Day progress</div>
                    <div className="global-progress-track" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow={getGlobalProgress().percent} title={`${getGlobalProgress().percent}%`}>
                        <div
                            className="global-progress-fill"
                            style={{ width: `${getGlobalProgress().percent}%`, background: progressColor(getGlobalProgress().percent) }}
                        />
                        <div className="tooltip">{getGlobalProgress().percent}%</div>
                    </div>
                    <div className="global-progress-percent">{getGlobalProgress().percent}%</div>
                </div>
            </div>
            <header className="App-header">
                <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', gap:12}}>
                    <div>
                        <h1>Task Tracker</h1>
                        <div className="subtitle">Task management made easy, but also way harder.</div>
                    </div>
                    <div style={{display:'flex', alignItems:'center', gap:8}}>
                        <button className="btn-ghost" onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}>Theme: {theme}</button>
                    </div>
                </div>
            </header>
            <div className="add-task-form">
                <input
                    type="text"
                    placeholder="Task description"
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTask(); } }}
                />
                <select value={priority} onChange={e => setPriority(e.target.value)}>
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                </select>
                <button className="btn-primary" onClick={addTask}>Add Task</button>
            </div>
            <div className="task-container">
                {tasks.map(task => (
                                        <div key={task.id}>
                                            {dragOverTaskId === task.id && dragPosition === 'above' && <div className="insert-indicator" />}
                                                <div
                                                data-dragging={draggedTaskId === task.id}
                                                key={task.id}
                                                className={`task ${( (task.status || (task.completed ? 'done' : 'todo')) === 'done' ? 'completed' : '')} ${collapsedMap[task.id] ? 'collapsed' : ''} ${dragOverTaskId === task.id ? 'drag-over' : ''} ${(task.status === 'in_progress') ? 'started' : ''} ${(pulsingTasks[task.id] === 'full') ? 'pulse' : (pulsingTasks[task.id] === 'subtle' ? 'pulse-subtle' : '')} ${glowTasks[task.id] ? 'glow' : ''}`}
                                                draggable
                                                onDragStart={e => handleDragStart(e, task.id)}
                                                onDragEnd={handleDragEnd}
                                                onDragOver={e => handleDragOver(e, task.id)}
                                                onDragLeave={handleDragLeave}
                                                onDrop={e => handleDrop(e, task.id)}
                                            >
                                                <div style={{display:'flex', alignItems:'center'}}>
                                                    <div className="drag-handle top" draggable onDragStart={e => handleDragStart(e, task.id)} onDragEnd={handleDragEnd}>≡</div>
                                                    <div style={{flex:1}}>
                                                    {/* task content follows */}
                                                </div>
                                                </div>
                        {editingTask && editingTask.id === task.id ? (
                            renderEditForm(task)
                        ) : (
                            <>
                                                                <div className="task-header">
                                                                                                            <div className="left">
                                                                                                                                                                            <h3>{task.description}</h3>
                                                                                                                                                                            <div style={{marginLeft:12}}>
                                                                                                                                                                                <span className={`priority-tag priority-${task.priority}`}>{task.priority}</span>
                                                                                                                                                                            </div>
                                                                                                                                                                    </div>
                                                                    <div className="right">
                                                                                                                                                <div className="task-controls">
                                                                                                                                                        <button className="btn-ghost" onClick={() => toggleCollapse(task.id)} aria-label="toggle details">{collapsedMap[task.id] ? 'Expand' : 'Minimize'}</button>
                                                                                                                                                        <button className="btn-ghost" onClick={() => setEditingTask({ ...task })}>Edit</button>
                                                                                                                                                        <button className="btn-danger" onClick={() => deleteTask(task.id)}>Delete</button>
                                                                                                                                                </div>
                                                                    </div>
                                                                </div>
                                                                {!collapsedMap[task.id] && (
                                                                        <>
                                                                            <div className="task-progress-wrap">
                                                                                <div className="task-progress">
                                                                                        <div className="task-progress-bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow={getTaskProgress(task)} title={`${getTaskProgress(task)}%`}>
                                                                                            <div className="task-progress-fill" style={{ width: `${getTaskProgress(task)}%`, background: progressColor(getTaskProgress(task)) }} />
                                                                                            <div className="tooltip">{getTaskProgress(task)}%</div>
                                                                                        </div>
                                                                                        <div className="task-progress-meta">{getTaskProgress(task)}%</div>
                                                                                    </div>
                                                                            </div>
                                                                            <div className="task-details">
                                                                                    <div>
                                                                                        <div className="muted small">Due:</div>
                                                                                        <div className="muted">{task.due_date || '—'}</div>
                                                                                    </div>
                                                                                    <div>
                                                                                        <div className="muted small">Status:</div>
                                                                                        <div className="muted">{(task.status || (task.completed ? 'done' : 'todo')).replace('_', ' ')}</div>
                                                                                    </div>
                                                                                    <div style={{marginLeft:'auto'}}>
                                                                                        {/* show actions depending on current status */}
                                                                                        {((task.status || (task.completed ? 'done' : 'todo')) !== 'in_progress') && <button className="btn-start btn-small" onMouseDown={e => e.stopPropagation()} onDragStart={e => e.stopPropagation()} onClick={e => { e.stopPropagation(); setTaskStatus(task.id, 'in_progress'); }}>Start</button>}
                                                                                        {((task.status || (task.completed ? 'done' : 'todo')) !== 'done') && <button className="btn-complete btn-small" onMouseDown={e => e.stopPropagation()} onDragStart={e => e.stopPropagation()} onClick={e => { e.stopPropagation(); setTaskStatus(task.id, 'done'); }}>Complete</button>}
                                                                                        {((task.status || (task.completed ? 'done' : 'todo')) === 'done') && <button className="btn-ghost btn-small" onMouseDown={e => e.stopPropagation()} onDragStart={e => e.stopPropagation()} onClick={e => { e.stopPropagation(); setTaskStatus(task.id, 'todo'); }}>Undo</button>}
                                                                                    </div>
                                                                                </div>
                                                                        </>
                                                                )}
                                                                {task.sub_tasks && task.sub_tasks.length > 0 && (
                                    <div>
                                        <h4>Sub-tasks:</h4>
                                        <ul>
                                            {task.sub_tasks.map((sub) => (
                                                <li key={sub.id} className={((sub.status || (sub.completed ? 'done' : 'todo')) === 'done') ? 'completed' : ''}>
                                                    {subDragOver.taskId === task.id && subDragOver.subId === sub.id && subDragOver.position === 'above' && <div className="insert-indicator" />}
                                                    <div
                                                        className="task-row"
                                                        onDragOver={e => handleSubDragOver(e, task.id, sub.id)}
                                                        onDragLeave={() => setSubDragOver({ taskId: null, subId: null, position: null })}
                                                        onDrop={e => handleSubDrop(e, task.id, sub.id)}
                                                    >
                                                        <div style={{display:'flex', alignItems:'center', gap:8, flex:1}}>
                                                            <div className="drag-handle" style={{width:14,height:14,fontSize:9}} draggable onDragStart={e => handleSubDragStart(e, task.id, sub.id)} onDragEnd={handleSubDragEnd}>⋮</div>
                                                            <div className={`subtask-desc ${(sub.status === 'in_progress') ? 'in-progress' : ''} ${(sub.status === 'done') ? 'started' : ''} ${pulsingSubtasks[`${task.id}:${sub.id}`] ? 'pulse-subtle' : ''}`} style={{flex:1}}>{sub.description} <small className="small"> - {(sub.status || (sub.completed ? 'done' : 'todo')).replace('_', ' ')}</small></div>
                                                        </div>
                                                        <div>
                                                            {(((sub.status) || (sub.completed ? 'done' : 'todo')) !== 'in_progress') && <button className="btn-start btn-small" onMouseDown={e => e.stopPropagation()} onDragStart={e => e.stopPropagation()} onClick={e => { e.stopPropagation(); setSubtaskStatus(task.id, sub.id, 'in_progress'); }}>Start</button>}
                                                            {(((sub.status) || (sub.completed ? 'done' : 'todo')) !== 'done') && <button className="btn-complete btn-small" onMouseDown={e => e.stopPropagation()} onDragStart={e => e.stopPropagation()} onClick={e => { e.stopPropagation(); setSubtaskStatus(task.id, sub.id, 'done'); }}>Complete</button>}
                                                            {(((sub.status) || (sub.completed ? 'done' : 'todo')) === 'done') && <button className="btn-ghost btn-small" onMouseDown={e => e.stopPropagation()} onDragStart={e => e.stopPropagation()} onClick={e => { e.stopPropagation(); setSubtaskStatus(task.id, sub.id, 'todo'); }}>Undo</button>}
                                                        </div>
                                                    </div>
                                                    {subDragOver.taskId === task.id && subDragOver.subId === sub.id && subDragOver.position === 'below' && <div className="insert-indicator" />}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                                                                                                {/* Add-subtask area moved into card footer for clarity */}
                                                                                                <div style={{marginTop:12}}>
                                                                                                    {addingSubtaskTo === task.id ? (
                                                                                                                renderAddSubtaskForm(task)
                                                                                                    ) : (
                                                                                                                <div style={{display:'flex', justifyContent:'flex-end'}}>
                                                                                                                    <button className="add-subtask-button large" onClick={() => setAddingSubtaskTo(task.id)}>+ Add Sub-task</button>
                                                                                                                </div>
                                                                                                    )}
                                                                                                </div>
                            </>
                        )}
                                            </div>
                                            {dragOverTaskId === task.id && dragPosition === 'below' && <div className="insert-indicator" />}
                                        </div>
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