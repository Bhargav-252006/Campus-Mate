import React, {useState, useEffect} from 'react';
import {Smile, Frown, Meh, Zap, TrendingUp, Calendar, PlusCircle, Heart} from 'lucide-react';

const MOODS = [
    {id: 'happy', emoji: '😊', label: 'Happy', color: '#10b981'},
    {id: 'calm', emoji: '😌', label: 'Calm', color: '#6366f1'},
    {id: 'motivated', emoji: '🔥', label: 'Motivated', color: '#f59e0b'},
    {id: 'tired', emoji: '😴', label: 'Tired', color: '#64748b'},
    {id: 'stressed', emoji: '😰', label: 'Stressed', color: '#ef4444'},
    {id: 'anxious', emoji: '😟', label: 'Anxious', color: '#f97316'},
    {id: 'sad', emoji: '😢', label: 'Sad', color: '#3b82f6'},
    {id: 'frustrated', emoji: '😤', label: 'Frustrated', color: '#dc2626'}
];

const MoodTracker = () => {
    const [selectedMood, setSelectedMood] = useState(null);
    const [energy, setEnergy] = useState(5);
    const [notes, setNotes] = useState('');
    const [moodHistory, setMoodHistory] = useState([]);
    const [showLogForm, setShowLogForm] = useState(false);
    const [todayMood, setTodayMood] = useState(null);

    // Load mood history from localStorage
    useEffect(() => {
        const saved = localStorage.getItem('moodHistory');
        if (saved) {
            const history = JSON.parse(saved);
            setMoodHistory(history);

            // Check if mood logged today
            const today = new Date().toDateString();
            const todayEntry = history.find(m => new Date(m.timestamp).toDateString() === today);
            if (todayEntry) {
                setTodayMood(todayEntry);
            }
        }
    }, []);

    const saveMood = () => {
        if (!selectedMood) return;

        const entry = {
            id: Date.now(),
            mood: selectedMood,
            energy,
            notes,
            timestamp: new Date().toISOString()
        };

        const newHistory = [entry, ...moodHistory];
        setMoodHistory(newHistory);
        localStorage.setItem('moodHistory', JSON.stringify(newHistory));

        setTodayMood(entry);
        setShowLogForm(false);
        setSelectedMood(null);
        setEnergy(5);
        setNotes('');
    };

    const getMoodData = (moodId) => MOODS.find(m => m.id === moodId);

    const getWeeklyStats = () => {
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);

        const weekMoods = moodHistory.filter(m => new Date(m.timestamp) >= weekAgo);

        const moodCounts = {};
        let totalEnergy = 0;

        weekMoods.forEach(m => {
            moodCounts[m.mood] = (moodCounts[m.mood] || 0) + 1;
            totalEnergy += m.energy;
        });

        const mostCommon = Object.entries(moodCounts).sort((a, b) => b[1] - a[1])[0];

        return {
            totalEntries: weekMoods.length,
            avgEnergy: weekMoods.length > 0 ? (totalEnergy / weekMoods.length).toFixed(1) : 0,
            mostCommon: mostCommon ? getMoodData(mostCommon[0]) : null
        };
    };

    const weeklyStats = getWeeklyStats();

    const getInsight = () => {
        if (moodHistory.length < 3) return "Log more moods to see insights!";

        const recentMoods = moodHistory.slice(0, 5);
        const stressedCount = recentMoods.filter(m => ['stressed', 'anxious', 'frustrated'].includes(m.mood)).length;
        const positiveCount = recentMoods.filter(m => ['happy', 'calm', 'motivated'].includes(m.mood)).length;

        if (stressedCount >= 3) {
            return "💙 You've been stressed lately. Consider taking breaks and practicing self-care.";
        } else if (positiveCount >= 3) {
            return "🌟 Great job! You've been in a positive state. Keep up whatever you're doing!";
        }
        return "📊 Keep tracking to discover your mood patterns!";
    };

    return (
        <div className="mood-page">
            <div className="page-header">
                <div>
                    <h1>🧠 Mood Tracker</h1>
                    <p className="subtitle">Track your emotions, discover patterns</p>
                </div>
                <button className="btn btn-primary" onClick={() => setShowLogForm(true)}>
                    <PlusCircle size={18} /> Log Mood
                </button>
            </div>

            {/* Today's Mood Card */}
            <div className="mood-today-section">
                {todayMood ? (
                    <div className="today-mood-card logged">
                        <div className="today-header">
                            <Calendar size={20} />
                            <span>Today's Check-in</span>
                        </div>
                        <div className="today-mood-display">
                            <span className="big-emoji">{getMoodData(todayMood.mood)?.emoji}</span>
                            <div className="today-details">
                                <h3>{getMoodData(todayMood.mood)?.label}</h3>
                                <div className="energy-display">
                                    <Zap size={16} /> Energy: {todayMood.energy}/10
                                </div>
                                {todayMood.notes && <p className="today-notes">"{todayMood.notes}"</p>}
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="today-mood-card not-logged" onClick={() => setShowLogForm(true)}>
                        <div className="not-logged-content">
                            <Heart size={40} />
                            <h3>How are you feeling today?</h3>
                            <p>Tap to log your mood</p>
                        </div>
                    </div>
                )}
            </div>

            {/* Stats Grid */}
            <div className="mood-stats-grid">
                <div className="mood-stat-card">
                    <div className="stat-icon-wrapper blue">
                        <Calendar size={24} />
                    </div>
                    <div className="stat-info">
                        <span className="stat-value">{weeklyStats.totalEntries}</span>
                        <span className="stat-label">Entries this week</span>
                    </div>
                </div>
                <div className="mood-stat-card">
                    <div className="stat-icon-wrapper orange">
                        <Zap size={24} />
                    </div>
                    <div className="stat-info">
                        <span className="stat-value">{weeklyStats.avgEnergy}</span>
                        <span className="stat-label">Avg Energy</span>
                    </div>
                </div>
                <div className="mood-stat-card">
                    <div className="stat-icon-wrapper green">
                        <TrendingUp size={24} />
                    </div>
                    <div className="stat-info">
                        <span className="stat-value">{weeklyStats.mostCommon?.emoji || '—'}</span>
                        <span className="stat-label">Most Common</span>
                    </div>
                </div>
            </div>

            {/* Insight Card */}
            <div className="insight-card">
                <h3>💡 Insight</h3>
                <p>{getInsight()}</p>
            </div>

            {/* Mood History */}
            <div className="mood-history-section">
                <h2>📅 Recent Moods</h2>
                <div className="mood-history-list">
                    {moodHistory.length === 0 ? (
                        <div className="empty-state">
                            <p>No mood entries yet. Start tracking!</p>
                        </div>
                    ) : (
                        moodHistory.slice(0, 10).map(entry => {
                            const moodData = getMoodData(entry.mood);
                            return (
                                <div key={entry.id} className="mood-history-item">
                                    <span className="mood-emoji">{moodData?.emoji}</span>
                                    <div className="mood-info">
                                        <span className="mood-label">{moodData?.label}</span>
                                        <span className="mood-date">
                                            {new Date(entry.timestamp).toLocaleDateString()} at {new Date(entry.timestamp).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})}
                                        </span>
                                    </div>
                                    <div className="mood-energy">
                                        <Zap size={14} /> {entry.energy}
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>

            {/* Log Mood Modal */}
            {showLogForm && (
                <div className="modal-overlay" onClick={() => setShowLogForm(false)}>
                    <div className="modal mood-modal" onClick={e => e.stopPropagation()}>
                        <h2>How are you feeling?</h2>

                        <div className="mood-grid">
                            {MOODS.map(mood => (
                                <button
                                    key={mood.id}
                                    className={`mood-option ${selectedMood === mood.id ? 'selected' : ''}`}
                                    onClick={() => setSelectedMood(mood.id)}
                                    style={{'--mood-color': mood.color}}
                                >
                                    <span className="mood-emoji-btn">{mood.emoji}</span>
                                    <span className="mood-label-btn">{mood.label}</span>
                                </button>
                            ))}
                        </div>

                        <div className="energy-slider-section">
                            <label>
                                <Zap size={16} /> Energy Level: <strong>{energy}/10</strong>
                            </label>
                            <input
                                type="range"
                                min="1"
                                max="10"
                                value={energy}
                                onChange={(e) => setEnergy(parseInt(e.target.value))}
                                className="energy-slider"
                            />
                            <div className="energy-labels">
                                <span>Low</span>
                                <span>High</span>
                            </div>
                        </div>

                        <div className="notes-section">
                            <label>Notes (optional)</label>
                            <textarea
                                placeholder="What's on your mind?"
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                rows={3}
                            />
                        </div>

                        <div className="modal-actions">
                            <button className="btn btn-secondary" onClick={() => setShowLogForm(false)}>
                                Cancel
                            </button>
                            <button
                                className="btn btn-primary"
                                onClick={saveMood}
                                disabled={!selectedMood}
                            >
                                Save Mood
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MoodTracker;
