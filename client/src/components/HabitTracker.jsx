import React, {useState, useEffect} from 'react';
import {
    CheckCircle, Circle, Plus, Trash2, Edit2, X, Save,
    Flame, Target, TrendingUp, Calendar, Award, RotateCcw
} from 'lucide-react';
import {useToast} from '../context/ToastContext';

const HABIT_COLORS = [
    '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
    '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1'
];

const HABIT_ICONS = ['💪', '📚', '🧘', '💧', '🏃', '🍎', '😴', '✍️', '🎯', '🧠'];

const HabitTracker = () => {
    const toast = useToast();
    const [habits, setHabits] = useState([]);
    const [showAddModal, setShowAddModal] = useState(false);
    const [editingHabit, setEditingHabit] = useState(null);
    const [viewMode, setViewMode] = useState('week'); // 'week', 'month'
    const [selectedDate, setSelectedDate] = useState(new Date());

    const [newHabit, setNewHabit] = useState({
        name: '',
        icon: '💪',
        color: '#3b82f6',
        frequency: 'daily', // 'daily', 'weekly', 'custom'
        targetDays: [0, 1, 2, 3, 4, 5, 6], // All days
        reminder: false,
        reminderTime: '09:00'
    });

    // Load habits
    useEffect(() => {
        const saved = localStorage.getItem('habits');
        if (saved) {
            setHabits(JSON.parse(saved));
        }
    }, []);

    // Save habits
    const saveHabits = (newHabits) => {
        setHabits(newHabits);
        localStorage.setItem('habits', JSON.stringify(newHabits));
    };

    // Create habit
    const createHabit = () => {
        if (!newHabit.name.trim()) {
            toast.warning('Please enter a habit name');
            return;
        }

        const habit = {
            id: Date.now(),
            ...newHabit,
            completions: {}, // { 'YYYY-MM-DD': true }
            streak: 0,
            longestStreak: 0,
            createdAt: new Date().toISOString()
        };

        saveHabits([...habits, habit]);
        setNewHabit({
            name: '',
            icon: '💪',
            color: '#3b82f6',
            frequency: 'daily',
            targetDays: [0, 1, 2, 3, 4, 5, 6],
            reminder: false,
            reminderTime: '09:00'
        });
        setShowAddModal(false);
        toast.success('Habit created!');
    };

    // Toggle habit completion
    const toggleHabit = (habitId, date) => {
        const dateStr = date.toISOString().split('T')[0];

        const updatedHabits = habits.map(h => {
            if (h.id !== habitId) return h;

            const newCompletions = {...h.completions};
            if (newCompletions[dateStr]) {
                delete newCompletions[dateStr];
            } else {
                newCompletions[dateStr] = true;
            }

            // Calculate streak
            const streak = calculateStreak(h, newCompletions);
            const longestStreak = Math.max(h.longestStreak, streak);

            return {...h, completions: newCompletions, streak, longestStreak};
        });

        saveHabits(updatedHabits);
    };

    // Calculate current streak
    const calculateStreak = (habit, completions) => {
        let streak = 0;
        let date = new Date();

        while (true) {
            const dateStr = date.toISOString().split('T')[0];
            const dayOfWeek = date.getDay();

            // Check if this day is a target day
            if (habit.targetDays.includes(dayOfWeek)) {
                if (completions[dateStr]) {
                    streak++;
                } else {
                    break;
                }
            }

            date.setDate(date.getDate() - 1);
            if (streak > 365) break; // Safety limit
        }

        return streak;
    };

    // Get dates for view
    const getDates = () => {
        const dates = [];
        const start = new Date(selectedDate);

        if (viewMode === 'week') {
            start.setDate(start.getDate() - start.getDay());
            for (let i = 0; i < 7; i++) {
                dates.push(new Date(start));
                start.setDate(start.getDate() + 1);
            }
        } else {
            start.setDate(1);
            const month = start.getMonth();
            while (start.getMonth() === month) {
                dates.push(new Date(start));
                start.setDate(start.getDate() + 1);
            }
        }

        return dates;
    };

    // Check if habit is completed on date
    const isCompleted = (habit, date) => {
        const dateStr = date.toISOString().split('T')[0];
        return !!habit.completions[dateStr];
    };

    // Get completion rate
    const getCompletionRate = (habit) => {
        const dates = getDates();
        const targetDates = dates.filter(d => habit.targetDays.includes(d.getDay()));
        if (targetDates.length === 0) return 0;

        const completed = targetDates.filter(d => isCompleted(habit, d)).length;
        return Math.round((completed / targetDates.length) * 100);
    };

    // Delete habit
    const deleteHabit = (habitId) => {
        if (!window.confirm('Delete this habit and all its history?')) return;
        saveHabits(habits.filter(h => h.id !== habitId));
        toast.info('Habit deleted');
    };

    // Get overall stats
    const getOverallStats = () => {
        const today = new Date().toISOString().split('T')[0];
        const todayCompleted = habits.filter(h => h.completions[today]).length;
        const totalStreak = habits.reduce((sum, h) => sum + h.streak, 0);
        const avgCompletion = habits.length > 0
            ? Math.round(habits.reduce((sum, h) => sum + getCompletionRate(h), 0) / habits.length)
            : 0;

        return {todayCompleted, totalHabits: habits.length, totalStreak, avgCompletion};
    };

    const stats = getOverallStats();
    const dates = getDates();
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    return (
        <div className="habits-page">
            <div className="page-header">
                <div>
                    <h1><Target size={28} /> Habit Tracker</h1>
                    <p className="subtitle">Build better habits, one day at a time</p>
                </div>
                <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
                    <Plus size={20} /> New Habit
                </button>
            </div>

            {/* Stats Overview */}
            <div className="habits-stats">
                <div className="stat-card">
                    <CheckCircle size={24} className="text-success" />
                    <div>
                        <span className="stat-value">{stats.todayCompleted}/{stats.totalHabits}</span>
                        <span className="stat-label">Done Today</span>
                    </div>
                </div>
                <div className="stat-card">
                    <Flame size={24} className="text-warning" />
                    <div>
                        <span className="stat-value">{stats.totalStreak}</span>
                        <span className="stat-label">Total Streak</span>
                    </div>
                </div>
                <div className="stat-card">
                    <TrendingUp size={24} className="text-primary" />
                    <div>
                        <span className="stat-value">{stats.avgCompletion}%</span>
                        <span className="stat-label">Avg Completion</span>
                    </div>
                </div>
                <div className="stat-card">
                    <Award size={24} className="text-secondary" />
                    <div>
                        <span className="stat-value">
                            {Math.max(...habits.map(h => h.longestStreak), 0)}
                        </span>
                        <span className="stat-label">Best Streak</span>
                    </div>
                </div>
            </div>

            {/* View Controls */}
            <div className="habits-controls">
                <div className="view-toggle">
                    <button
                        className={viewMode === 'week' ? 'active' : ''}
                        onClick={() => setViewMode('week')}
                    >
                        Week
                    </button>
                    <button
                        className={viewMode === 'month' ? 'active' : ''}
                        onClick={() => setViewMode('month')}
                    >
                        Month
                    </button>
                </div>
                <div className="date-nav">
                    <button onClick={() => {
                        const d = new Date(selectedDate);
                        d.setDate(d.getDate() - (viewMode === 'week' ? 7 : 30));
                        setSelectedDate(d);
                    }}>←</button>
                    <span>
                        {viewMode === 'week'
                            ? `Week of ${dates[0]?.toLocaleDateString('en-US', {month: 'short', day: 'numeric'})}`
                            : selectedDate.toLocaleDateString('en-US', {month: 'long', year: 'numeric'})
                        }
                    </span>
                    <button onClick={() => {
                        const d = new Date(selectedDate);
                        d.setDate(d.getDate() + (viewMode === 'week' ? 7 : 30));
                        setSelectedDate(d);
                    }}>→</button>
                </div>
                <button className="btn btn-ghost btn-sm" onClick={() => setSelectedDate(new Date())}>
                    Today
                </button>
            </div>

            {/* Habits Grid */}
            {habits.length === 0 ? (
                <div className="empty-state">
                    <Target size={64} />
                    <h3>No habits yet</h3>
                    <p>Start building better habits today!</p>
                    <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
                        <Plus size={20} /> Create First Habit
                    </button>
                </div>
            ) : (
                <div className="habits-grid">
                    {/* Header Row */}
                    <div className="habits-header">
                        <div className="habit-name-col">Habit</div>
                        <div className="dates-cols">
                            {dates.map((date, i) => (
                                <div key={i} className={`date-col ${date.toDateString() === new Date().toDateString() ? 'today' : ''}`}>
                                    <span className="day-name">{dayNames[date.getDay()]}</span>
                                    <span className="day-num">{date.getDate()}</span>
                                </div>
                            ))}
                        </div>
                        <div className="stats-col">Progress</div>
                    </div>

                    {/* Habit Rows */}
                    {habits.map(habit => (
                        <div key={habit.id} className="habit-row">
                            <div className="habit-info">
                                <span className="habit-icon" style={{background: habit.color}}>
                                    {habit.icon}
                                </span>
                                <div>
                                    <span className="habit-name">{habit.name}</span>
                                    <span className="habit-streak">
                                        <Flame size={12} /> {habit.streak} day streak
                                    </span>
                                </div>
                            </div>
                            <div className="habit-checks">
                                {dates.map((date, i) => {
                                    const isTarget = habit.targetDays.includes(date.getDay());
                                    const completed = isCompleted(habit, date);
                                    const isToday = date.toDateString() === new Date().toDateString();
                                    const isFuture = date > new Date();

                                    return (
                                        <button
                                            key={i}
                                            className={`check-btn ${completed ? 'completed' : ''} ${isTarget ? '' : 'not-target'} ${isToday ? 'today' : ''}`}
                                            onClick={() => !isFuture && isTarget && toggleHabit(habit.id, date)}
                                            disabled={isFuture || !isTarget}
                                            style={{'--habit-color': habit.color}}
                                        >
                                            {completed ? <CheckCircle size={18} /> : <Circle size={18} />}
                                        </button>
                                    );
                                })}
                            </div>
                            <div className="habit-progress">
                                <div className="progress-bar">
                                    <div
                                        className="progress-fill"
                                        style={{width: `${getCompletionRate(habit)}%`, background: habit.color}}
                                    />
                                </div>
                                <span>{getCompletionRate(habit)}%</span>
                            </div>
                            <div className="habit-actions">
                                <button onClick={() => deleteHabit(habit.id)}>
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Add Habit Modal */}
            {showAddModal && (
                <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <h2>Create New Habit</h2>

                        <div className="form-group">
                            <label>Habit Name</label>
                            <input
                                type="text"
                                value={newHabit.name}
                                onChange={e => setNewHabit({...newHabit, name: e.target.value})}
                                placeholder="e.g., Morning Exercise"
                            />
                        </div>

                        <div className="form-group">
                            <label>Icon</label>
                            <div className="icon-picker">
                                {HABIT_ICONS.map(icon => (
                                    <button
                                        key={icon}
                                        className={`icon-btn ${newHabit.icon === icon ? 'selected' : ''}`}
                                        onClick={() => setNewHabit({...newHabit, icon})}
                                    >
                                        {icon}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="form-group">
                            <label>Color</label>
                            <div className="color-picker">
                                {HABIT_COLORS.map(color => (
                                    <button
                                        key={color}
                                        className={`color-btn ${newHabit.color === color ? 'selected' : ''}`}
                                        style={{background: color}}
                                        onClick={() => setNewHabit({...newHabit, color})}
                                    />
                                ))}
                            </div>
                        </div>

                        <div className="form-group">
                            <label>Frequency</label>
                            <div className="frequency-selector">
                                <button
                                    className={newHabit.frequency === 'daily' ? 'active' : ''}
                                    onClick={() => setNewHabit({
                                        ...newHabit,
                                        frequency: 'daily',
                                        targetDays: [0, 1, 2, 3, 4, 5, 6]
                                    })}
                                >
                                    Daily
                                </button>
                                <button
                                    className={newHabit.frequency === 'weekdays' ? 'active' : ''}
                                    onClick={() => setNewHabit({
                                        ...newHabit,
                                        frequency: 'weekdays',
                                        targetDays: [1, 2, 3, 4, 5]
                                    })}
                                >
                                    Weekdays
                                </button>
                                <button
                                    className={newHabit.frequency === 'custom' ? 'active' : ''}
                                    onClick={() => setNewHabit({
                                        ...newHabit,
                                        frequency: 'custom'
                                    })}
                                >
                                    Custom
                                </button>
                            </div>
                        </div>

                        {newHabit.frequency === 'custom' && (
                            <div className="form-group">
                                <label>Select Days</label>
                                <div className="days-selector">
                                    {dayNames.map((day, i) => (
                                        <button
                                            key={i}
                                            className={newHabit.targetDays.includes(i) ? 'active' : ''}
                                            onClick={() => {
                                                const days = newHabit.targetDays.includes(i)
                                                    ? newHabit.targetDays.filter(d => d !== i)
                                                    : [...newHabit.targetDays, i];
                                                setNewHabit({...newHabit, targetDays: days});
                                            }}
                                        >
                                            {day}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="modal-actions">
                            <button className="btn btn-ghost" onClick={() => setShowAddModal(false)}>
                                Cancel
                            </button>
                            <button className="btn btn-primary" onClick={createHabit}>
                                Create Habit
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default HabitTracker;
