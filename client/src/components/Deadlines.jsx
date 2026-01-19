import React, {useState, useEffect} from 'react';
import {Calendar, Clock, AlertTriangle, CheckCircle, PlusCircle, Trash2, Flag} from 'lucide-react';

const PRIORITIES = [
    {id: 'low', label: 'Low', color: '#64748b'},
    {id: 'medium', label: 'Medium', color: '#f59e0b'},
    {id: 'high', label: 'High', color: '#ef4444'},
    {id: 'critical', label: 'Critical', color: '#dc2626'}
];

const TYPES = [
    {id: 'assignment', label: '📝 Assignment'},
    {id: 'exam', label: '📚 Exam'},
    {id: 'project', label: '🎯 Project'},
    {id: 'quiz', label: '❓ Quiz'},
    {id: 'other', label: '📌 Other'}
];

const Deadlines = () => {
    const [deadlines, setDeadlines] = useState([]);
    const [showAddForm, setShowAddForm] = useState(false);
    const [filter, setFilter] = useState('all'); // 'all', 'upcoming', 'overdue'
    const [newDeadline, setNewDeadline] = useState({
        title: '',
        subject: '',
        dueDate: '',
        priority: 'medium',
        type: 'assignment',
        description: ''
    });

    // Load deadlines from localStorage
    useEffect(() => {
        const saved = localStorage.getItem('deadlines');
        if (saved) {
            setDeadlines(JSON.parse(saved));
        }
    }, []);

    // Save to localStorage
    const saveDeadlines = (newDeadlines) => {
        setDeadlines(newDeadlines);
        localStorage.setItem('deadlines', JSON.stringify(newDeadlines));
    };

    const addDeadline = () => {
        if (!newDeadline.title || !newDeadline.dueDate) return;

        const deadline = {
            ...newDeadline,
            id: Date.now(),
            completed: false,
            createdAt: new Date().toISOString()
        };

        saveDeadlines([deadline, ...deadlines]);
        setNewDeadline({
            title: '',
            subject: '',
            dueDate: '',
            priority: 'medium',
            type: 'assignment',
            description: ''
        });
        setShowAddForm(false);
    };

    const toggleComplete = (id) => {
        const updated = deadlines.map(d =>
            d.id === id ? {...d, completed: !d.completed, completedAt: new Date().toISOString()} : d
        );
        saveDeadlines(updated);
    };

    const deleteDeadline = (id) => {
        if (window.confirm('Delete this deadline?')) {
            saveDeadlines(deadlines.filter(d => d.id !== id));
        }
    };

    const getDaysUntil = (date) => {
        const now = new Date();
        const due = new Date(date);
        const diff = Math.ceil((due - now) / (1000 * 60 * 60 * 24));
        return diff;
    };

    const getUrgencyClass = (dueDate, completed) => {
        if (completed) return 'completed';
        const days = getDaysUntil(dueDate);
        if (days < 0) return 'overdue';
        if (days <= 1) return 'urgent';
        if (days <= 3) return 'soon';
        return 'normal';
    };

    const filteredDeadlines = deadlines.filter(d => {
        if (filter === 'upcoming') return !d.completed && getDaysUntil(d.dueDate) >= 0;
        if (filter === 'overdue') return !d.completed && getDaysUntil(d.dueDate) < 0;
        if (filter === 'completed') return d.completed;
        return true;
    }).sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));

    const stats = {
        total: deadlines.filter(d => !d.completed).length,
        overdue: deadlines.filter(d => !d.completed && getDaysUntil(d.dueDate) < 0).length,
        thisWeek: deadlines.filter(d => !d.completed && getDaysUntil(d.dueDate) >= 0 && getDaysUntil(d.dueDate) <= 7).length,
        completed: deadlines.filter(d => d.completed).length
    };

    return (
        <div className="deadlines-page">
            <div className="page-header">
                <div>
                    <h1>📅 Deadlines</h1>
                    <p className="subtitle">Track your assignments and due dates</p>
                </div>
                <button className="btn btn-primary" onClick={() => setShowAddForm(true)}>
                    <PlusCircle size={18} /> Add Deadline
                </button>
            </div>

            {/* Stats */}
            <div className="deadline-stats">
                <div className="deadline-stat">
                    <span className="stat-num">{stats.total}</span>
                    <span className="stat-text">Active</span>
                </div>
                <div className="deadline-stat overdue">
                    <span className="stat-num">{stats.overdue}</span>
                    <span className="stat-text">Overdue</span>
                </div>
                <div className="deadline-stat warning">
                    <span className="stat-num">{stats.thisWeek}</span>
                    <span className="stat-text">This Week</span>
                </div>
                <div className="deadline-stat success">
                    <span className="stat-num">{stats.completed}</span>
                    <span className="stat-text">Completed</span>
                </div>
            </div>

            {/* Filters */}
            <div className="deadline-filters">
                {['all', 'upcoming', 'overdue', 'completed'].map(f => (
                    <button
                        key={f}
                        className={`filter-btn ${filter === f ? 'active' : ''}`}
                        onClick={() => setFilter(f)}
                    >
                        {f.charAt(0).toUpperCase() + f.slice(1)}
                    </button>
                ))}
            </div>

            {/* Deadlines List */}
            <div className="deadlines-list">
                {filteredDeadlines.length === 0 ? (
                    <div className="empty-state">
                        <Calendar size={48} />
                        <p>No deadlines found</p>
                    </div>
                ) : (
                    filteredDeadlines.map(deadline => {
                        const days = getDaysUntil(deadline.dueDate);
                        const urgency = getUrgencyClass(deadline.dueDate, deadline.completed);
                        const priority = PRIORITIES.find(p => p.id === deadline.priority);
                        const type = TYPES.find(t => t.id === deadline.type);

                        return (
                            <div key={deadline.id} className={`deadline-card ${urgency}`}>
                                <div className="deadline-check">
                                    <button
                                        className={`check-btn ${deadline.completed ? 'checked' : ''}`}
                                        onClick={() => toggleComplete(deadline.id)}
                                    >
                                        <CheckCircle size={24} />
                                    </button>
                                </div>

                                <div className="deadline-content">
                                    <div className="deadline-header">
                                        <h3 className={deadline.completed ? 'completed-text' : ''}>
                                            {deadline.title}
                                        </h3>
                                        <span
                                            className="priority-badge"
                                            style={{background: priority?.color}}
                                        >
                                            {priority?.label}
                                        </span>
                                    </div>

                                    <div className="deadline-meta">
                                        <span className="type-badge">{type?.label}</span>
                                        {deadline.subject && (
                                            <span className="subject-badge">{deadline.subject}</span>
                                        )}
                                    </div>

                                    <div className="deadline-date">
                                        <Calendar size={14} />
                                        {new Date(deadline.dueDate).toLocaleDateString('en-US', {
                                            weekday: 'short',
                                            month: 'short',
                                            day: 'numeric'
                                        })}
                                        <span className={`days-left ${urgency}`}>
                                            {deadline.completed ? (
                                                '✓ Completed'
                                            ) : days < 0 ? (
                                                <><AlertTriangle size={14} /> {Math.abs(days)} days overdue</>
                                            ) : days === 0 ? (
                                                <><Clock size={14} /> Due today!</>
                                            ) : days === 1 ? (
                                                <><Clock size={14} /> Due tomorrow</>
                                            ) : (
                                                <>{days} days left</>
                                            )}
                                        </span>
                                    </div>
                                </div>

                                <button
                                    className="delete-btn"
                                    onClick={() => deleteDeadline(deadline.id)}
                                >
                                    <Trash2 size={18} />
                                </button>
                            </div>
                        );
                    })
                )}
            </div>

            {/* Add Modal */}
            {showAddForm && (
                <div className="modal-overlay" onClick={() => setShowAddForm(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <h2>Add Deadline</h2>

                        <div className="form-group">
                            <label>Title *</label>
                            <input
                                type="text"
                                placeholder="e.g., Math Assignment Chapter 5"
                                value={newDeadline.title}
                                onChange={e => setNewDeadline({...newDeadline, title: e.target.value})}
                            />
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <label>Subject</label>
                                <input
                                    type="text"
                                    placeholder="e.g., Mathematics"
                                    value={newDeadline.subject}
                                    onChange={e => setNewDeadline({...newDeadline, subject: e.target.value})}
                                />
                            </div>
                            <div className="form-group">
                                <label>Due Date *</label>
                                <input
                                    type="date"
                                    value={newDeadline.dueDate}
                                    onChange={e => setNewDeadline({...newDeadline, dueDate: e.target.value})}
                                />
                            </div>
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <label>Type</label>
                                <select
                                    value={newDeadline.type}
                                    onChange={e => setNewDeadline({...newDeadline, type: e.target.value})}
                                >
                                    {TYPES.map(t => (
                                        <option key={t.id} value={t.id}>{t.label}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Priority</label>
                                <select
                                    value={newDeadline.priority}
                                    onChange={e => setNewDeadline({...newDeadline, priority: e.target.value})}
                                >
                                    {PRIORITIES.map(p => (
                                        <option key={p.id} value={p.id}>{p.label}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="form-group">
                            <label>Description (optional)</label>
                            <textarea
                                placeholder="Any notes about this deadline..."
                                value={newDeadline.description}
                                onChange={e => setNewDeadline({...newDeadline, description: e.target.value})}
                                rows={2}
                            />
                        </div>

                        <div className="modal-actions">
                            <button className="btn btn-secondary" onClick={() => setShowAddForm(false)}>
                                Cancel
                            </button>
                            <button
                                className="btn btn-primary"
                                onClick={addDeadline}
                                disabled={!newDeadline.title || !newDeadline.dueDate}
                            >
                                Add Deadline
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Deadlines;
