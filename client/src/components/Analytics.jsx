import React, {useState, useEffect} from 'react';
import {TrendingUp, Clock, Brain, Flame, Calendar, Target, Award, BarChart3} from 'lucide-react';

const Analytics = () => {
    const [pomodoroStats, setPomodoroStats] = useState({sessions: [], totalMinutes: 0});
    const [moodHistory, setMoodHistory] = useState([]);
    const [deadlines, setDeadlines] = useState([]);
    const [timeRange, setTimeRange] = useState('week'); // 'week', 'month', 'all'

    useEffect(() => {
        // Load all data
        const pomodoro = localStorage.getItem('pomodoroStats');
        const moods = localStorage.getItem('moodHistory');
        const deadlinesData = localStorage.getItem('deadlines');

        if (pomodoro) setPomodoroStats(JSON.parse(pomodoro));
        if (moods) setMoodHistory(JSON.parse(moods));
        if (deadlinesData) setDeadlines(JSON.parse(deadlinesData));
    }, []);

    // Calculate stats
    const getFilteredData = (data, dateKey = 'timestamp') => {
        const now = new Date();
        let cutoff;

        if (timeRange === 'week') {
            cutoff = new Date(now - 7 * 24 * 60 * 60 * 1000);
        } else if (timeRange === 'month') {
            cutoff = new Date(now - 30 * 24 * 60 * 60 * 1000);
        } else {
            return data;
        }

        return data.filter(item => new Date(item[dateKey]) >= cutoff);
    };

    const filteredMoods = getFilteredData(moodHistory);
    const filteredDeadlines = getFilteredData(deadlines, 'createdAt');

    // Mood analytics
    const moodBreakdown = filteredMoods.reduce((acc, m) => {
        acc[m.mood] = (acc[m.mood] || 0) + 1;
        return acc;
    }, {});

    const avgEnergy = filteredMoods.length > 0
        ? (filteredMoods.reduce((sum, m) => sum + m.energy, 0) / filteredMoods.length).toFixed(1)
        : 0;

    // Deadline analytics
    const completedDeadlines = filteredDeadlines.filter(d => d.completed).length;
    const totalDeadlines = filteredDeadlines.length;
    const completionRate = totalDeadlines > 0
        ? Math.round((completedDeadlines / totalDeadlines) * 100)
        : 0;

    // Most studied subject (from deadlines)
    const subjectCounts = deadlines.reduce((acc, d) => {
        if (d.subject) {
            acc[d.subject] = (acc[d.subject] || 0) + 1;
        }
        return acc;
    }, {});
    const topSubject = Object.entries(subjectCounts).sort((a, b) => b[1] - a[1])[0];

    const moodEmojis = {
        happy: '😊', calm: '😌', motivated: '🔥', tired: '😴',
        stressed: '😰', anxious: '😟', sad: '😢', frustrated: '😤'
    };

    const moodColors = {
        happy: '#10b981', calm: '#6366f1', motivated: '#f59e0b', tired: '#64748b',
        stressed: '#ef4444', anxious: '#f97316', sad: '#3b82f6', frustrated: '#dc2626'
    };

    // Get weekly activity data
    const getWeeklyActivity = () => {
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const activity = new Array(7).fill(0);

        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);

        moodHistory
            .filter(m => new Date(m.timestamp) >= weekAgo)
            .forEach(m => {
                const day = new Date(m.timestamp).getDay();
                activity[day]++;
            });

        return days.map((day, i) => ({day, count: activity[i]}));
    };

    const weeklyActivity = getWeeklyActivity();
    const maxActivity = Math.max(...weeklyActivity.map(d => d.count), 1);

    return (
        <div className="analytics-page">
            <div className="page-header">
                <div>
                    <h1>📊 Analytics</h1>
                    <p className="subtitle">Track your progress and patterns</p>
                </div>
                <div className="time-filter">
                    {['week', 'month', 'all'].map(range => (
                        <button
                            key={range}
                            className={`filter-btn ${timeRange === range ? 'active' : ''}`}
                            onClick={() => setTimeRange(range)}
                        >
                            {range === 'week' ? 'Week' : range === 'month' ? 'Month' : 'All Time'}
                        </button>
                    ))}
                </div>
            </div>

            {/* Overview Stats */}
            <div className="analytics-stats-grid">
                <div className="analytics-stat-card">
                    <div className="stat-icon blue">
                        <Clock size={24} />
                    </div>
                    <div className="stat-details">
                        <span className="stat-value">{pomodoroStats.todayMinutes || 0}m</span>
                        <span className="stat-label">Focus Time Today</span>
                    </div>
                </div>
                <div className="analytics-stat-card">
                    <div className="stat-icon green">
                        <Flame size={24} />
                    </div>
                    <div className="stat-details">
                        <span className="stat-value">{pomodoroStats.todaySessions || 0}</span>
                        <span className="stat-label">Sessions Today</span>
                    </div>
                </div>
                <div className="analytics-stat-card">
                    <div className="stat-icon purple">
                        <Brain size={24} />
                    </div>
                    <div className="stat-details">
                        <span className="stat-value">{avgEnergy}</span>
                        <span className="stat-label">Avg Energy Level</span>
                    </div>
                </div>
                <div className="analytics-stat-card">
                    <div className="stat-icon orange">
                        <Target size={24} />
                    </div>
                    <div className="stat-details">
                        <span className="stat-value">{completionRate}%</span>
                        <span className="stat-label">Completion Rate</span>
                    </div>
                </div>
            </div>

            <div className="analytics-grid">
                {/* Mood Breakdown */}
                <div className="analytics-card">
                    <h3><Brain size={18} /> Mood Breakdown</h3>
                    {Object.keys(moodBreakdown).length === 0 ? (
                        <div className="empty-chart">
                            <p>No mood data yet</p>
                        </div>
                    ) : (
                        <div className="mood-bars">
                            {Object.entries(moodBreakdown)
                                .sort((a, b) => b[1] - a[1])
                                .map(([mood, count]) => (
                                    <div key={mood} className="mood-bar-row">
                                        <span className="mood-label">
                                            {moodEmojis[mood]} {mood}
                                        </span>
                                        <div className="mood-bar-track">
                                            <div
                                                className="mood-bar-fill"
                                                style={{
                                                    width: `${(count / filteredMoods.length) * 100}%`,
                                                    background: moodColors[mood]
                                                }}
                                            />
                                        </div>
                                        <span className="mood-count">{count}</span>
                                    </div>
                                ))}
                        </div>
                    )}
                </div>

                {/* Weekly Activity */}
                <div className="analytics-card">
                    <h3><Calendar size={18} /> Weekly Activity</h3>
                    <div className="weekly-chart">
                        {weeklyActivity.map((day, i) => (
                            <div key={i} className="day-column">
                                <div className="bar-container">
                                    <div
                                        className="activity-bar"
                                        style={{
                                            height: `${(day.count / maxActivity) * 100}%`,
                                            minHeight: day.count > 0 ? '10px' : '0'
                                        }}
                                    />
                                </div>
                                <span className="day-label">{day.day}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Deadline Progress */}
                <div className="analytics-card">
                    <h3><Target size={18} /> Deadlines Progress</h3>
                    <div className="progress-ring-container">
                        <svg viewBox="0 0 100 100" className="progress-ring-svg">
                            <circle
                                cx="50" cy="50" r="40"
                                fill="none"
                                stroke="var(--bg-tertiary)"
                                strokeWidth="8"
                            />
                            <circle
                                cx="50" cy="50" r="40"
                                fill="none"
                                stroke="var(--primary)"
                                strokeWidth="8"
                                strokeDasharray={`${completionRate * 2.51} ${251 - completionRate * 2.51}`}
                                strokeLinecap="round"
                                transform="rotate(-90 50 50)"
                            />
                        </svg>
                        <div className="progress-text">
                            <span className="progress-value">{completionRate}%</span>
                            <span className="progress-label">Complete</span>
                        </div>
                    </div>
                    <div className="deadline-breakdown">
                        <div className="breakdown-item">
                            <span className="dot green"></span>
                            <span>Completed: {completedDeadlines}</span>
                        </div>
                        <div className="breakdown-item">
                            <span className="dot gray"></span>
                            <span>Pending: {totalDeadlines - completedDeadlines}</span>
                        </div>
                    </div>
                </div>

                {/* Achievements */}
                <div className="analytics-card achievements-card">
                    <h3><Award size={18} /> Achievements</h3>
                    <div className="achievements-grid">
                        <div className={`achievement ${(pomodoroStats.todaySessions || 0) >= 1 ? 'unlocked' : ''}`}>
                            <span className="achievement-icon">🎯</span>
                            <span className="achievement-name">First Focus</span>
                        </div>
                        <div className={`achievement ${(pomodoroStats.todaySessions || 0) >= 5 ? 'unlocked' : ''}`}>
                            <span className="achievement-icon">🔥</span>
                            <span className="achievement-name">On Fire</span>
                        </div>
                        <div className={`achievement ${filteredMoods.length >= 7 ? 'unlocked' : ''}`}>
                            <span className="achievement-icon">📊</span>
                            <span className="achievement-name">Tracker</span>
                        </div>
                        <div className={`achievement ${completedDeadlines >= 5 ? 'unlocked' : ''}`}>
                            <span className="achievement-icon">✅</span>
                            <span className="achievement-name">Achiever</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Insights */}
            {topSubject && (
                <div className="insights-section">
                    <h3>💡 Insights</h3>
                    <div className="insight-cards">
                        <div className="insight-card">
                            <BarChart3 size={20} />
                            <p>Your most focused subject is <strong>{topSubject[0]}</strong> with {topSubject[1]} assignments.</p>
                        </div>
                        {avgEnergy >= 7 && (
                            <div className="insight-card success">
                                <TrendingUp size={20} />
                                <p>Great energy levels! You're averaging {avgEnergy}/10. Keep it up!</p>
                            </div>
                        )}
                        {avgEnergy < 5 && avgEnergy > 0 && (
                            <div className="insight-card warning">
                                <Brain size={20} />
                                <p>Your energy is a bit low at {avgEnergy}/10. Consider more rest or breaks.</p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default Analytics;
