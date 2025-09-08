import React, { useState, useEffect, useRef } from 'react';
import './App.css';

function App() {
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

    const completeTask = (id) => {
        updateTask(id, { completed: true });
    };

    const completeSubTask = (taskId, subTaskId) => {
        // call the subtask-specific endpoint
        fetch(`/api/tasks/${taskId}/subtasks/${subTaskId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ completed: true })
        })
            .then(res => res.json())
            .then(updatedTask => {
                setTasks(tasks.map(task => (task.id === taskId ? updatedTask : task)));
            })
            .catch(error => console.error('Error completing sub-task:', error));
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
            <header className="App-header">
                <h1>Task Tracker</h1>
                <div className="subtitle">Task management made easy, but also way harder.</div>
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
                                                className={`task ${task.completed ? 'completed' : ''} ${collapsedMap[task.id] ? 'collapsed' : ''} ${dragOverTaskId === task.id ? 'drag-over' : ''}`}
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
                                                                                <div className="task-details">
                                                                                    <div>
                                                                                        <div className="muted small">Due:</div>
                                                                                        <div className="muted">{task.due_date || '—'}</div>
                                                                                    </div>
                                                                                    <div>
                                                                                        <div className="muted small">Status:</div>
                                                                                        <div className="muted">{task.completed ? 'Completed' : 'Pending'}</div>
                                                                                    </div>
                                                                                    <div style={{marginLeft:'auto'}}>
                                                                                        {!task.completed && <button className="btn-primary btn-small" onClick={() => completeTask(task.id)}>Complete</button>}
                                                                                    </div>
                                                                                </div>
                                                                        </>
                                                                )}
                                                                {task.sub_tasks && task.sub_tasks.length > 0 && (
                                    <div>
                                        <h4>Sub-tasks:</h4>
                                        <ul>
                                            {task.sub_tasks.map((sub) => (
                                                <li key={sub.id} className={sub.completed ? 'completed' : ''}>
                                                    {subDragOver.taskId === task.id && subDragOver.subId === sub.id && subDragOver.position === 'above' && <div className="insert-indicator" />}
                                                    <div
                                                        className="task-row"
                                                        onDragOver={e => handleSubDragOver(e, task.id, sub.id)}
                                                        onDragLeave={() => setSubDragOver({ taskId: null, subId: null, position: null })}
                                                        onDrop={e => handleSubDrop(e, task.id, sub.id)}
                                                    >
                                                        <div style={{display:'flex', alignItems:'center', gap:8, flex:1}}>
                                                            <div className="drag-handle" style={{width:14,height:14,fontSize:9}} draggable onDragStart={e => handleSubDragStart(e, task.id, sub.id)} onDragEnd={handleSubDragEnd}>⋮</div>
                                                            <div className="subtask-desc" style={{flex:1}}>{sub.description} <small className="small"> - {sub.completed ? 'Completed' : 'Pending'}</small></div>
                                                        </div>
                                                        <div>
                                                            {!sub.completed && <button className="btn-primary btn-small" onClick={() => completeSubTask(task.id, sub.id)}>Complete</button>}
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
        </div>
    );
}

export default App;