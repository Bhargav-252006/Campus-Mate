import React, {useState, useEffect} from 'react';
import {Plus, Edit2, Trash2, X, Save, Check, Circle} from 'lucide-react';
import {getSchedule, addTask, updateTask, deleteTask} from '../services/api';

const PRIORITIES = ['low', 'medium', 'high'];
const emptyTask = {task: '', priority: 'medium', dueTime: '', completed: false};

const Schedule = () => {
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingTask, setEditingTask] = useState(null);
    const [formData, setFormData] = useState(emptyTask);
    const [filter, setFilter] = useState('all'); // all, pending, completed

    useEffect(() => {
        loadTasks();
    }, []);

    const loadTasks = async () => {
        try {
            const data = await getSchedule();
            setTasks(data);
        } catch (error) {
            console.error('Error loading tasks:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingTask) {
                await updateTask(editingTask.id, formData);
            } else {
                await addTask(formData);
            }
            await loadTasks();
            closeModal();
        } catch (error) {
            console.error('Error saving task:', error);
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm('Delete this task?')) {
            try {
                await deleteTask(id);
                await loadTasks();
            } catch (error) {
                console.error('Error deleting task:', error);
            }
        }
    };

    const toggleComplete = async (task) => {
        try {
            await updateTask(task.id, {...task, completed: !task.completed});
            await loadTasks();
        } catch (error) {
            console.error('Error updating task:', error);
        }
    };

    const openAddModal = () => {
        setEditingTask(null);
        setFormData(emptyTask);
        setShowModal(true);
    };

    const openEditModal = (task) => {
        setEditingTask(task);
        setFormData(task);
        setShowModal(true);
    };

    const closeModal = () => {
        setShowModal(false);
        setEditingTask(null);
        setFormData(emptyTask);
    };

    // Filter and sort tasks
    const filteredTasks = tasks.filter(task => {
        if (filter === 'pending') return !task.completed;
        if (filter === 'completed') return task.completed;
        return true;
    });

    const priorityOrder = {high: 0, medium: 1, low: 2};
    const sortedTasks = [...filteredTasks].sort((a, b) => {
        // Completed at bottom
        if (a.completed !== b.completed) return a.completed ? 1 : -1;
        // Then by priority
        return priorityOrder[a.priority] - priorityOrder[b.priority];
    });

    const stats = {
        total: tasks.length,
        completed: tasks.filter(t => t.completed).length,
        pending: tasks.filter(t => !t.completed).length,
        highPriority: tasks.filter(t => !t.completed && t.priority === 'high').length
    };

    if (loading) {
        return <div className="loading">Loading schedule...</div>;
    }

    return (
        <div className="schedule-page">
            <div className="page-header">
                <div>
                    <h1>✅ Daily Schedule</h1>
                    <p className="subtitle">Manage your daily tasks and goals</p>
                </div>
                <button className="btn btn-primary" onClick={openAddModal}>
                    <Plus size={18} /> Add Task
                </button>
            </div>

            {/* Stats Bar */}
            <div className="schedule-stats">
                <div className="stat">
                    <span className="stat-value">{stats.total}</span>
                    <span className="stat-label">Total</span>
                </div>
                <div className="stat">
                    <span className="stat-value pending">{stats.pending}</span>
                    <span className="stat-label">Pending</span>
                </div>
                <div className="stat">
                    <span className="stat-value completed">{stats.completed}</span>
                    <span className="stat-label">Done</span>
                </div>
                <div className="stat">
                    <span className="stat-value high">{stats.highPriority}</span>
                    <span className="stat-label">Urgent</span>
                </div>
            </div>

            {/* Filter Tabs */}
            <div className="filter-tabs">
                <button
                    className={`filter-tab ${filter === 'all' ? 'active' : ''}`}
                    onClick={() => setFilter('all')}
                >
                    All ({tasks.length})
                </button>
                <button
                    className={`filter-tab ${filter === 'pending' ? 'active' : ''}`}
                    onClick={() => setFilter('pending')}
                >
                    Pending ({stats.pending})
                </button>
                <button
                    className={`filter-tab ${filter === 'completed' ? 'active' : ''}`}
                    onClick={() => setFilter('completed')}
                >
                    Completed ({stats.completed})
                </button>
            </div>

            {/* Task List */}
            <div className="task-list">
                {sortedTasks.length === 0 ? (
                    <div className="empty-state">
                        <p>No tasks yet. Add your first task!</p>
                    </div>
                ) : (
                    sortedTasks.map(task => (
                        <div key={task.id} className={`task-item ${task.completed ? 'completed' : ''}`}>
                            <button
                                className="check-btn"
                                onClick={() => toggleComplete(task)}
                            >
                                {task.completed ? (
                                    <Check size={20} className="checked" />
                                ) : (
                                    <Circle size={20} />
                                )}
                            </button>
                            <div className="task-content">
                                <span className={`task-name ${task.completed ? 'done' : ''}`}>
                                    {task.task}
                                </span>
                                <div className="task-meta">
                                    <span className={`priority-badge ${task.priority}`}>
                                        {task.priority}
                                    </span>
                                    {task.dueTime && (
                                        <span className="due-time">🕐 {task.dueTime}</span>
                                    )}
                                </div>
                            </div>
                            <div className="task-actions">
                                <button onClick={() => openEditModal(task)}>
                                    <Edit2 size={16} />
                                </button>
                                <button onClick={() => handleDelete(task.id)}>
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Quick Add (always visible at bottom) */}
            <div className="quick-add">
                <input
                    type="text"
                    placeholder="Quick add a task... (press Enter)"
                    onKeyPress={(e) => {
                        if (e.key === 'Enter' && e.target.value.trim()) {
                            addTask({...emptyTask, task: e.target.value.trim()})
                                .then(() => {
                                    e.target.value = '';
                                    loadTasks();
                                });
                        }
                    }}
                />
            </div>

            {/* Modal */}
            {showModal && (
                <div className="modal-overlay" onClick={closeModal}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>{editingTask ? 'Edit Task' : 'Add Task'}</h2>
                            <button className="close-btn" onClick={closeModal}>
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit}>
                            <div className="form-group">
                                <label>Task *</label>
                                <input
                                    type="text"
                                    value={formData.task}
                                    onChange={e => setFormData({...formData, task: e.target.value})}
                                    required
                                    placeholder="What do you need to do?"
                                />
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Priority</label>
                                    <select
                                        value={formData.priority}
                                        onChange={e => setFormData({...formData, priority: e.target.value})}
                                    >
                                        {PRIORITIES.map(p => (
                                            <option key={p} value={p}>
                                                {p.charAt(0).toUpperCase() + p.slice(1)}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label>Due Time</label>
                                    <input
                                        type="time"
                                        value={formData.dueTime}
                                        onChange={e => setFormData({...formData, dueTime: e.target.value})}
                                    />
                                </div>
                            </div>
                            <div className="modal-actions">
                                <button type="button" className="btn btn-secondary" onClick={closeModal}>
                                    Cancel
                                </button>
                                <button type="submit" className="btn btn-primary">
                                    <Save size={18} /> {editingTask ? 'Update' : 'Save'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Schedule;
