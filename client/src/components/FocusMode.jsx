import React, {useState, useEffect, useRef, useCallback} from 'react';
import {
    Focus, Play, Pause, RotateCcw, Settings, Volume2, VolumeX,
    Maximize, Minimize, Moon, Sun, Clock, Target, CheckCircle
} from 'lucide-react';
import {useToast} from '../context/ToastContext';

// Ambient sounds URLs (using free sounds)
const AMBIENT_SOUNDS = {
    none: {name: 'None', url: null},
    rain: {name: 'Rain', url: 'https://cdn.pixabay.com/audio/2022/05/16/audio_1333dfb145.mp3'},
    forest: {name: 'Forest', url: 'https://cdn.pixabay.com/audio/2022/08/02/audio_884fe92c21.mp3'},
    cafe: {name: 'Café', url: 'https://cdn.pixabay.com/audio/2022/03/15/audio_4e43f5d8c2.mp3'},
    fireplace: {name: 'Fireplace', url: 'https://cdn.pixabay.com/audio/2021/09/21/audio_7e9d7baf6e.mp3'},
    ocean: {name: 'Ocean Waves', url: 'https://cdn.pixabay.com/audio/2022/01/20/audio_0f3813ab27.mp3'}
};

const FocusMode = () => {
    const toast = useToast();
    const audioRef = useRef(null);
    const intervalRef = useRef(null);

    // State
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [isRunning, setIsRunning] = useState(false);
    const [timeLeft, setTimeLeft] = useState(25 * 60); // 25 minutes default
    const [initialTime, setInitialTime] = useState(25 * 60);
    const [completedSessions, setCompletedSessions] = useState(0);
    const [todaySessions, setTodaySessions] = useState(0);
    const [currentTask, setCurrentTask] = useState('');
    const [showSettings, setShowSettings] = useState(false);

    // Settings
    const [settings, setSettings] = useState({
        duration: 25,
        breakDuration: 5,
        longBreakDuration: 15,
        sessionsBeforeLongBreak: 4,
        ambientSound: 'none',
        volume: 50,
        darkOverlay: true,
        showQuotes: true,
        autoStartBreak: false
    });

    const [isBreak, setIsBreak] = useState(false);
    const [isMuted, setIsMuted] = useState(false);

    // Motivational quotes
    const quotes = [
        {text: "The secret of getting ahead is getting started.", author: "Mark Twain"},
        {text: "Focus on being productive instead of busy.", author: "Tim Ferriss"},
        {text: "The only way to do great work is to love what you do.", author: "Steve Jobs"},
        {text: "Don't watch the clock; do what it does. Keep going.", author: "Sam Levenson"},
        {text: "It's not that I'm so smart, it's just that I stay with problems longer.", author: "Einstein"},
        {text: "Deep work is the ability to focus without distraction.", author: "Cal Newport"}
    ];
    const [currentQuote, setCurrentQuote] = useState(quotes[0]);

    // Load settings and stats
    useEffect(() => {
        const savedSettings = localStorage.getItem('focusModeSettings');
        if (savedSettings) {
            const parsed = JSON.parse(savedSettings);
            setSettings(parsed);
            setTimeLeft(parsed.duration * 60);
            setInitialTime(parsed.duration * 60);
        }

        const savedSessions = localStorage.getItem('focusTodaySessions');
        const savedDate = localStorage.getItem('focusSessionDate');
        const today = new Date().toDateString();

        if (savedDate === today && savedSessions) {
            setTodaySessions(parseInt(savedSessions));
        }
    }, []);

    // Save settings
    const saveSettings = (newSettings) => {
        setSettings(newSettings);
        localStorage.setItem('focusModeSettings', JSON.stringify(newSettings));
    };

    // Audio setup
    useEffect(() => {
        if (audioRef.current) {
            audioRef.current.volume = settings.volume / 100;
            audioRef.current.loop = true;
        }
    }, [settings.volume]);

    // Handle ambient sound change
    useEffect(() => {
        if (audioRef.current) {
            const sound = AMBIENT_SOUNDS[settings.ambientSound];
            if (sound?.url) {
                audioRef.current.src = sound.url;
                if (isRunning && !isMuted) {
                    audioRef.current.play().catch(() => { });
                }
            } else {
                audioRef.current.pause();
            }
        }
    }, [settings.ambientSound]);

    // Timer logic
    useEffect(() => {
        if (isRunning) {
            intervalRef.current = setInterval(() => {
                setTimeLeft(prev => {
                    if (prev <= 1) {
                        handleSessionComplete();
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);

            // Play ambient sound
            if (audioRef.current && AMBIENT_SOUNDS[settings.ambientSound]?.url && !isMuted) {
                audioRef.current.play().catch(() => { });
            }
        } else {
            clearInterval(intervalRef.current);
            if (audioRef.current) {
                audioRef.current.pause();
            }
        }

        return () => clearInterval(intervalRef.current);
    }, [isRunning]);

    // Handle session complete
    const handleSessionComplete = () => {
        setIsRunning(false);
        clearInterval(intervalRef.current);

        if (!isBreak) {
            // Work session completed
            const newCompleted = completedSessions + 1;
            setCompletedSessions(newCompleted);

            const newTodaySessions = todaySessions + 1;
            setTodaySessions(newTodaySessions);
            localStorage.setItem('focusTodaySessions', newTodaySessions.toString());
            localStorage.setItem('focusSessionDate', new Date().toDateString());

            toast.success('Focus session completed! 🎉');

            // Request notification permission and show notification
            if (Notification.permission === 'granted') {
                new Notification('Focus Session Complete!', {
                    body: 'Great work! Time for a break.',
                    icon: '/favicon.ico'
                });
            }

            // Determine break type
            const isLongBreak = newCompleted % settings.sessionsBeforeLongBreak === 0;
            const breakTime = isLongBreak ? settings.longBreakDuration : settings.breakDuration;

            setIsBreak(true);
            setTimeLeft(breakTime * 60);
            setInitialTime(breakTime * 60);

            if (settings.autoStartBreak) {
                setTimeout(() => setIsRunning(true), 1000);
            }
        } else {
            // Break completed
            toast.info('Break over! Ready to focus again?');
            setIsBreak(false);
            setTimeLeft(settings.duration * 60);
            setInitialTime(settings.duration * 60);
        }

        // Change quote
        setCurrentQuote(quotes[Math.floor(Math.random() * quotes.length)]);
    };

    // Toggle fullscreen
    const toggleFullscreen = useCallback(() => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().then(() => {
                setIsFullscreen(true);
            }).catch(() => { });
        } else {
            document.exitFullscreen().then(() => {
                setIsFullscreen(false);
            }).catch(() => { });
        }
    }, []);

    // Listen for fullscreen change
    useEffect(() => {
        const handleFullscreenChange = () => {
            setIsFullscreen(!!document.fullscreenElement);
        };
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
    }, []);

    // Format time
    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    // Calculate progress
    const progress = ((initialTime - timeLeft) / initialTime) * 100;

    // Request notification permission
    useEffect(() => {
        if (Notification.permission === 'default') {
            Notification.requestPermission();
        }
    }, []);

    // Reset timer
    const resetTimer = () => {
        setIsRunning(false);
        setIsBreak(false);
        setTimeLeft(settings.duration * 60);
        setInitialTime(settings.duration * 60);
    };

    return (
        <div className={`focus-mode-page ${isFullscreen ? 'fullscreen' : ''} ${settings.darkOverlay ? 'dark-overlay' : ''}`}>
            <audio ref={audioRef} />

            {/* Header - visible when not fullscreen */}
            {!isFullscreen && (
                <div className="page-header">
                    <div>
                        <h1><Focus size={28} /> Focus Mode</h1>
                        <p className="subtitle">Eliminate distractions and deep focus</p>
                    </div>
                    <div className="header-actions">
                        <button className="btn btn-secondary" onClick={() => setShowSettings(true)}>
                            <Settings size={20} /> Settings
                        </button>
                        <button className="btn btn-primary" onClick={toggleFullscreen}>
                            <Maximize size={20} /> Enter Focus
                        </button>
                    </div>
                </div>
            )}

            {/* Main Focus Area */}
            <div className="focus-container">
                {/* Task input */}
                {!isRunning && (
                    <div className="task-input-section">
                        <input
                            type="text"
                            value={currentTask}
                            onChange={e => setCurrentTask(e.target.value)}
                            placeholder="What are you focusing on?"
                            className="task-input"
                        />
                    </div>
                )}

                {/* Current task display when running */}
                {isRunning && currentTask && (
                    <div className="current-task">
                        <Target size={20} />
                        <span>{currentTask}</span>
                    </div>
                )}

                {/* Timer */}
                <div className="timer-section">
                    <div className="timer-circle">
                        <svg viewBox="0 0 200 200">
                            <circle
                                cx="100"
                                cy="100"
                                r="90"
                                fill="none"
                                stroke="var(--bg-tertiary)"
                                strokeWidth="8"
                            />
                            <circle
                                cx="100"
                                cy="100"
                                r="90"
                                fill="none"
                                stroke={isBreak ? 'var(--success)' : 'var(--primary)'}
                                strokeWidth="8"
                                strokeLinecap="round"
                                strokeDasharray={`${2 * Math.PI * 90}`}
                                strokeDashoffset={`${2 * Math.PI * 90 * (1 - progress / 100)}`}
                                transform="rotate(-90 100 100)"
                            />
                        </svg>
                        <div className="timer-display">
                            <span className="session-type">{isBreak ? 'Break' : 'Focus'}</span>
                            <span className="time">{formatTime(timeLeft)}</span>
                        </div>
                    </div>
                </div>

                {/* Controls */}
                <div className="timer-controls">
                    <button
                        className="control-btn secondary"
                        onClick={resetTimer}
                        title="Reset"
                    >
                        <RotateCcw size={24} />
                    </button>

                    <button
                        className={`control-btn primary ${isRunning ? 'pause' : 'play'}`}
                        onClick={() => setIsRunning(!isRunning)}
                    >
                        {isRunning ? <Pause size={32} /> : <Play size={32} />}
                    </button>

                    <button
                        className="control-btn secondary"
                        onClick={() => setIsMuted(!isMuted)}
                        title={isMuted ? 'Unmute' : 'Mute'}
                    >
                        {isMuted ? <VolumeX size={24} /> : <Volume2 size={24} />}
                    </button>
                </div>

                {/* Sound selector */}
                <div className="sound-selector">
                    <label>Ambient Sound:</label>
                    <select
                        value={settings.ambientSound}
                        onChange={e => saveSettings({...settings, ambientSound: e.target.value})}
                    >
                        {Object.entries(AMBIENT_SOUNDS).map(([key, {name}]) => (
                            <option key={key} value={key}>{name}</option>
                        ))}
                    </select>
                    {settings.ambientSound !== 'none' && (
                        <input
                            type="range"
                            min="0"
                            max="100"
                            value={settings.volume}
                            onChange={e => saveSettings({...settings, volume: parseInt(e.target.value)})}
                            className="volume-slider"
                        />
                    )}
                </div>

                {/* Stats */}
                <div className="focus-stats">
                    <div className="stat">
                        <CheckCircle size={20} />
                        <span>{todaySessions} sessions today</span>
                    </div>
                    <div className="stat">
                        <Clock size={20} />
                        <span>{Math.round(todaySessions * settings.duration)} mins focused</span>
                    </div>
                </div>

                {/* Quote */}
                {settings.showQuotes && (
                    <div className="motivation-quote">
                        <p>"{currentQuote.text}"</p>
                        <span>— {currentQuote.author}</span>
                    </div>
                )}

                {/* Fullscreen controls */}
                {isFullscreen && (
                    <button
                        className="exit-fullscreen"
                        onClick={toggleFullscreen}
                    >
                        <Minimize size={20} /> Exit Focus Mode
                    </button>
                )}
            </div>

            {/* Settings Modal */}
            {showSettings && (
                <div className="modal-overlay" onClick={() => setShowSettings(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <h2>Focus Mode Settings</h2>

                        <div className="form-group">
                            <label>Focus Duration (minutes)</label>
                            <input
                                type="number"
                                value={settings.duration}
                                onChange={e => saveSettings({...settings, duration: parseInt(e.target.value) || 25})}
                                min="5"
                                max="90"
                            />
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <label>Short Break (min)</label>
                                <input
                                    type="number"
                                    value={settings.breakDuration}
                                    onChange={e => saveSettings({...settings, breakDuration: parseInt(e.target.value) || 5})}
                                    min="1"
                                    max="30"
                                />
                            </div>
                            <div className="form-group">
                                <label>Long Break (min)</label>
                                <input
                                    type="number"
                                    value={settings.longBreakDuration}
                                    onChange={e => saveSettings({...settings, longBreakDuration: parseInt(e.target.value) || 15})}
                                    min="5"
                                    max="60"
                                />
                            </div>
                        </div>

                        <div className="form-group">
                            <label>Sessions before long break</label>
                            <input
                                type="number"
                                value={settings.sessionsBeforeLongBreak}
                                onChange={e => saveSettings({...settings, sessionsBeforeLongBreak: parseInt(e.target.value) || 4})}
                                min="2"
                                max="10"
                            />
                        </div>

                        <div className="form-group checkbox-group">
                            <label>
                                <input
                                    type="checkbox"
                                    checked={settings.darkOverlay}
                                    onChange={e => saveSettings({...settings, darkOverlay: e.target.checked})}
                                />
                                Dark overlay in fullscreen
                            </label>
                        </div>

                        <div className="form-group checkbox-group">
                            <label>
                                <input
                                    type="checkbox"
                                    checked={settings.showQuotes}
                                    onChange={e => saveSettings({...settings, showQuotes: e.target.checked})}
                                />
                                Show motivational quotes
                            </label>
                        </div>

                        <div className="form-group checkbox-group">
                            <label>
                                <input
                                    type="checkbox"
                                    checked={settings.autoStartBreak}
                                    onChange={e => saveSettings({...settings, autoStartBreak: e.target.checked})}
                                />
                                Auto-start breaks
                            </label>
                        </div>

                        <div className="modal-actions">
                            <button className="btn btn-ghost" onClick={() => setShowSettings(false)}>
                                Close
                            </button>
                            <button
                                className="btn btn-primary"
                                onClick={() => {
                                    setTimeLeft(settings.duration * 60);
                                    setInitialTime(settings.duration * 60);
                                    setShowSettings(false);
                                    toast.success('Settings saved!');
                                }}
                            >
                                Save & Reset Timer
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default FocusMode;
