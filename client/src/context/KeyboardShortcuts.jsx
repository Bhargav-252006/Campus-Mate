import React, {createContext, useContext, useEffect, useState, useCallback} from 'react';
import {useNavigate} from 'react-router-dom';

const KeyboardContext = createContext();

export const useKeyboard = () => {
    const context = useContext(KeyboardContext);
    if (!context) {
        throw new Error('useKeyboard must be used within a KeyboardProvider');
    }
    return context;
};

export const KeyboardProvider = ({children}) => {
    const [showHelp, setShowHelp] = useState(false);
    const navigate = useNavigate();

    const shortcuts = [
        {keys: ['Alt', 'D'], action: 'Go to Dashboard', path: '/app/dashboard'},
        {keys: ['Alt', 'C'], action: 'Go to Chat', path: '/app/chat'},
        {keys: ['Alt', 'P'], action: 'Go to Pomodoro', path: '/app/pomodoro'},
        {keys: ['Alt', 'M'], action: 'Go to Mood Tracker', path: '/app/mood'},
        {keys: ['Alt', 'T'], action: 'Go to Timetable', path: '/app/timetable'},
        {keys: ['Alt', 'N'], action: 'Go to Notes', path: '/app/notes'},
        {keys: ['Alt', 'A'], action: 'Go to Analytics', path: '/app/analytics'},
        {keys: ['Alt', 'F'], action: 'Go to Flashcards', path: '/app/flashcards'},
        {keys: ['Alt', 'H'], action: 'Go to Habits', path: '/app/habits'},
        {keys: ['?'], action: 'Show keyboard shortcuts', special: 'help'},
        {keys: ['Esc'], action: 'Close dialogs/modals', special: 'escape'},
    ];

    const handleKeyDown = useCallback((e) => {
        // Don't trigger if typing in input
        if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) {
            if (e.key === 'Escape') {
                e.target.blur();
            }
            return;
        }

        // Show help with ?
        if (e.key === '?' && !e.altKey && !e.ctrlKey) {
            e.preventDefault();
            setShowHelp(prev => !prev);
            return;
        }

        // Close with Escape
        if (e.key === 'Escape') {
            setShowHelp(false);
            return;
        }

        // Alt + key navigation
        if (e.altKey) {
            const key = e.key.toUpperCase();
            const shortcut = shortcuts.find(s => s.keys[1] === key && s.path);
            if (shortcut) {
                e.preventDefault();
                navigate(shortcut.path);
            }
        }
    }, [navigate]);

    useEffect(() => {
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleKeyDown]);

    return (
        <KeyboardContext.Provider value={{shortcuts, showHelp, setShowHelp}}>
            {children}
            {showHelp && (
                <div className="keyboard-help-overlay" onClick={() => setShowHelp(false)}>
                    <div className="keyboard-help-modal" onClick={e => e.stopPropagation()}>
                        <h2>⌨️ Keyboard Shortcuts</h2>
                        <div className="shortcuts-grid">
                            {shortcuts.map((shortcut, i) => (
                                <div key={i} className="shortcut-item">
                                    <div className="shortcut-keys">
                                        {shortcut.keys.map((key, j) => (
                                            <React.Fragment key={j}>
                                                <kbd>{key}</kbd>
                                                {j < shortcut.keys.length - 1 && <span>+</span>}
                                            </React.Fragment>
                                        ))}
                                    </div>
                                    <div className="shortcut-action">{shortcut.action}</div>
                                </div>
                            ))}
                        </div>
                        <p className="shortcut-hint">Press <kbd>?</kbd> to toggle this help</p>
                    </div>
                </div>
            )}
        </KeyboardContext.Provider>
    );
};

export default KeyboardContext;
