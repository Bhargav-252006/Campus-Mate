import React, {useState, useEffect, useRef} from 'react';
import {Play, Pause, RotateCcw, Coffee, Target, Flame, Clock, TrendingUp} from 'lucide-react';

const Pomodoro = () => {
    const [isRunning, setIsRunning] = useState(false);
    const [timeLeft, setTimeLeft] = useState(25 * 60); // 25 minutes in seconds
    const [mode, setMode] = useState('focus'); // 'focus' or 'break'
    const [sessions, setSessions] = useState(0);
    const [subject, setSubject] = useState('');
    const [currentSubject, setCurrentSubject] = useState('');
    const [focusDuration, setFocusDuration] = useState(25);
    const [breakDuration, setBreakDuration] = useState(5);
    const [stats, setStats] = useState({
        todaySessions: 0,
        todayMinutes: 0,
        weekSessions: 0,
        streak: 0
    });
    const audioRef = useRef(null);

    // Timer logic
    useEffect(() => {
        let interval = null;

        if (isRunning && timeLeft > 0) {
            interval = setInterval(() => {
                setTimeLeft(prev => prev - 1);
            }, 1000);
        } else if (timeLeft === 0) {
            // Timer finished
            playSound();
            if (mode === 'focus') {
                setSessions(prev => prev + 1);
                setStats(prev => ({
                    ...prev,
                    todaySessions: prev.todaySessions + 1,
                    todayMinutes: prev.todayMinutes + focusDuration
                }));
                setMode('break');
                setTimeLeft(breakDuration * 60);
            } else {
                setMode('focus');
                setTimeLeft(focusDuration * 60);
            }
            setIsRunning(false);
        }

        return () => clearInterval(interval);
    }, [isRunning, timeLeft, mode, focusDuration, breakDuration]);

    // Load stats from localStorage
    useEffect(() => {
        const savedStats = localStorage.getItem('pomodoroStats');
        if (savedStats) {
            setStats(JSON.parse(savedStats));
        }
    }, []);

    // Save stats to localStorage
    useEffect(() => {
        localStorage.setItem('pomodoroStats', JSON.stringify(stats));
    }, [stats]);

    const playSound = () => {
        if (audioRef.current) {
            audioRef.current.play().catch(() => { });
        }
    };

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const startTimer = () => {
        if (!currentSubject && subject) {
            setCurrentSubject(subject);
        }
        setIsRunning(true);
    };

    const pauseTimer = () => {
        setIsRunning(false);
    };

    const resetTimer = () => {
        setIsRunning(false);
        setMode('focus');
        setTimeLeft(focusDuration * 60);
        setCurrentSubject('');
    };

    const skipToBreak = () => {
        setIsRunning(false);
        setMode('break');
        setTimeLeft(breakDuration * 60);
    };

    const progress = mode === 'focus'
        ? ((focusDuration * 60 - timeLeft) / (focusDuration * 60)) * 100
        : ((breakDuration * 60 - timeLeft) / (breakDuration * 60)) * 100;

    return (
        <div className="pomodoro-page">
            <div className="page-header">
                <div>
                    <h1>🍅 Pomodoro Timer</h1>
                    <p className="subtitle">Stay focused, take breaks, achieve more</p>
                </div>
            </div>

            <div className="pomodoro-container">
                {/* Main Timer */}
                <div className="timer-section">
                    <div className={`timer-card ${mode}`}>
                        <div className="timer-mode">
                            {mode === 'focus' ? (
                                <><Target size={24} /> Focus Time</>
                            ) : (
                                <><Coffee size={24} /> Break Time</>
                            )}
                        </div>

                        {currentSubject && (
                            <div className="current-subject">
                                Studying: <strong>{currentSubject}</strong>
                            </div>
                        )}

                        <div className="timer-circle">
                            <svg className="progress-ring" viewBox="0 0 200 200">
                                <circle
                                    className="progress-ring-bg"
                                    cx="100"
                                    cy="100"
                                    r="90"
                                />
                                <circle
                                    className="progress-ring-fill"
                                    cx="100"
                                    cy="100"
                                    r="90"
                                    style={{
                                        strokeDasharray: `${2 * Math.PI * 90}`,
                                        strokeDashoffset: `${2 * Math.PI * 90 * (1 - progress / 100)}`
                                    }}
                                />
                            </svg>
                            <div className="timer-display">
                                {formatTime(timeLeft)}
                            </div>
                        </div>

                        <div className="timer-controls">
                            {!isRunning ? (
                                <button className="btn-timer btn-start" onClick={startTimer}>
                                    <Play size={24} /> Start
                                </button>
                            ) : (
                                <button className="btn-timer btn-pause" onClick={pauseTimer}>
                                    <Pause size={24} /> Pause
                                </button>
                            )}
                            <button className="btn-timer btn-reset" onClick={resetTimer}>
                                <RotateCcw size={20} />
                            </button>
                        </div>

                        <div className="session-dots">
                            {[...Array(4)].map((_, i) => (
                                <span
                                    key={i}
                                    className={`dot ${i < sessions % 4 ? 'completed' : ''}`}
                                />
                            ))}
                            <span className="session-text">
                                {sessions % 4}/4 until long break
                            </span>
                        </div>
                    </div>
                </div>

                {/* Settings & Stats */}
                <div className="pomodoro-sidebar">
                    {/* Quick Start */}
                    <div className="pomo-card">
                        <h3><Target size={18} /> Quick Start</h3>
                        <input
                            type="text"
                            placeholder="What are you studying?"
                            value={subject}
                            onChange={(e) => setSubject(e.target.value)}
                            className="subject-input"
                        />
                        <div className="quick-subjects">
                            {['Math', 'Physics', 'Coding', 'Reading'].map(s => (
                                <button
                                    key={s}
                                    className="quick-subject-btn"
                                    onClick={() => {
                                        setSubject(s);
                                        setCurrentSubject(s);
                                    }}
                                >
                                    {s}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Timer Settings */}
                    <div className="pomo-card">
                        <h3><Clock size={18} /> Timer Settings</h3>
                        <div className="setting-row">
                            <label>Focus Duration</label>
                            <div className="duration-selector">
                                {[15, 25, 30, 45, 60].map(d => (
                                    <button
                                        key={d}
                                        className={`duration-btn ${focusDuration === d ? 'active' : ''}`}
                                        onClick={() => {
                                            setFocusDuration(d);
                                            if (!isRunning && mode === 'focus') {
                                                setTimeLeft(d * 60);
                                            }
                                        }}
                                    >
                                        {d}m
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="setting-row">
                            <label>Break Duration</label>
                            <div className="duration-selector">
                                {[5, 10, 15].map(d => (
                                    <button
                                        key={d}
                                        className={`duration-btn ${breakDuration === d ? 'active' : ''}`}
                                        onClick={() => {
                                            setBreakDuration(d);
                                            if (!isRunning && mode === 'break') {
                                                setTimeLeft(d * 60);
                                            }
                                        }}
                                    >
                                        {d}m
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Stats */}
                    <div className="pomo-card stats-card">
                        <h3><TrendingUp size={18} /> Today's Progress</h3>
                        <div className="stats-grid-mini">
                            <div className="stat-mini">
                                <Flame size={20} className="stat-icon-mini fire" />
                                <div>
                                    <span className="stat-value">{stats.todaySessions}</span>
                                    <span className="stat-label">Sessions</span>
                                </div>
                            </div>
                            <div className="stat-mini">
                                <Clock size={20} className="stat-icon-mini blue" />
                                <div>
                                    <span className="stat-value">{stats.todayMinutes}m</span>
                                    <span className="stat-label">Focus Time</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Hidden audio element for notification sound */}
            <audio ref={audioRef} src="data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2teleRMUPJPZ6H5HDguAz+qDPQkSf8/qiEQGGHvM6I1QDhh8zeiOTwwWfczoj08NE3zM6I9PDhR9zeiOTw0Ue8znjk4OFHvM549PDhN7y+ePTw4Tesznj08OE3rL549PDhN6y+ePTw4TecsA" />
        </div>
    );
};

export default Pomodoro;
