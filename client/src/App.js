import React, { useState, useEffect } from 'react';
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
                setSubTaskDescriptionMap(prev => {
                    const copy = { ...prev };
                    delete copy[taskId];
                    return copy;
                });
                setAddingSubtaskTo(null);
            })
            .catch(error => console.error('Error adding sub-task:', error));
    };

    const toggleCollapse = (taskId) => {
        setCollapsedMap(prev => ({ ...prev, [taskId]: !prev[taskId] }));
    };

    const handleDragStart = (e, taskId) => {
        setDraggedTaskId(taskId);
        e.dataTransfer.effectAllowed = 'move';
        try { e.dataTransfer.setData('text/plain', String(taskId)); } catch (err) {}
    };

    const handleDragOver = (e, taskId) => {
        e.preventDefault();
        setDragOverTaskId(taskId);
    };

    const handleDragLeave = (e) => {
        setDragOverTaskId(null);
    };

    const handleDrop = (e, targetTaskId) => {
        e.preventDefault();
        const sourceId = draggedTaskId || e.dataTransfer.getData('text/plain');
        if (!sourceId) return;
        const src = String(sourceId);
        const tgt = String(targetTaskId);
        if (src === tgt) {
            setDraggedTaskId(null);
            setDragOverTaskId(null);
            return;
        }
        setTasks(prev => {
            const copy = [...prev];
            const fromIdx = copy.findIndex(t => String(t.id) === src);
            const toIdx = copy.findIndex(t => String(t.id) === tgt);
            if (fromIdx === -1 || toIdx === -1) return prev;
            const [moved] = copy.splice(fromIdx, 1);
            copy.splice(toIdx, 0, moved);
            return copy;
        });
        setDraggedTaskId(null);
        setDragOverTaskId(null);
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
                <button onClick={() => updateTask(task.id, { description: editingTask.description, priority: editingTask.priority })}>Save</button>
                <button onClick={() => setEditingTask(null)}>Cancel</button>
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
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addSubTask(task.id); } }}
                />
                <button onClick={() => addSubTask(task.id)}>Add</button>
                <button onClick={() => setAddingSubtaskTo(null)}>Cancel</button>
            </div>
        );
    }

    return (
        <div className="App">
            <header className="App-header">
                <h1>Task Tracker</h1>
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
                <button onClick={addTask}>Add Task</button>
            </div>
            <div className="task-container">
                {tasks.map(task => (
                    <div
                        key={task.id}
                        className={`task ${task.completed ? 'completed' : ''} ${collapsedMap[task.id] ? 'collapsed' : ''} ${dragOverTaskId === task.id ? 'drag-over' : ''}`}
                        draggable
                        onDragStart={e => handleDragStart(e, task.id)}
                        onDragOver={e => handleDragOver(e, task.id)}
                        onDragLeave={handleDragLeave}
                        onDrop={e => handleDrop(e, task.id)}
                    >
                        {editingTask && editingTask.id === task.id ? (
                            renderEditForm(task)
                        ) : (
                            <>
                                <div className="task-header">
                                    <h3>{task.description}</h3>
                                    <div className="task-controls">
                                        <button onClick={() => toggleCollapse(task.id)} aria-label="toggle details">{collapsedMap[task.id] ? 'Expand' : 'Minimize'}</button>
                                        <button onClick={() => setEditingTask({ ...task })}>Edit</button>
                                        <button onClick={() => deleteTask(task.id)}>Delete</button>
                                    </div>
                                </div>
                                {!collapsedMap[task.id] && (
                                    <>
                                        <p>Priority: {task.priority}</p>
                                        <p>Due Date: {task.due_date}</p>
                                        <p>Completed: {task.completed ? 'Yes' : 'No'}</p>
                                        {!task.completed && <button onClick={() => completeTask(task.id)}>Complete Task</button>}
                                    </>
                                )}
                                {task.sub_tasks && task.sub_tasks.length > 0 && (
                                    <div>
                                        <h4>Sub-tasks:</h4>
                                        <ul>
                                            {task.sub_tasks.map((sub) => (
                                                <li key={sub.id} className={sub.completed ? 'completed' : ''}>
                                                    {sub.description} - {sub.completed ? 'Completed' : 'Pending'}
                                                    {!sub.completed && <button onClick={() => completeSubTask(task.id, sub.id)}>Complete Sub-task</button>}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                                {addingSubtaskTo === task.id ? (
                                    renderAddSubtaskForm(task)
                                ) : (
                                    <button onClick={() => setAddingSubtaskTo(task.id)}>Add Sub-task</button>
                                )}
                            </>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}

export default App;