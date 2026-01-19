import React from 'react';
import {BrowserRouter, Routes, Route} from 'react-router-dom';
import Layout from './components/Layout';
import LandingPage from './components/LandingPage';
import Dashboard from './components/Dashboard';
import Timetable from './components/Timetable';
import Exams from './components/Exams';
import Schedule from './components/Schedule';
import Chat from './components/Chat';
import Pomodoro from './components/Pomodoro';
import MoodTracker from './components/MoodTracker';
import Deadlines from './components/Deadlines';
import Notes from './components/Notes';
import Analytics from './components/Analytics';
// New components
import Flashcards from './components/Flashcards';
import HabitTracker from './components/HabitTracker';
import GradeCalculator from './components/GradeCalculator';
import ResourceLibrary from './components/ResourceLibrary';
// Context providers
import {ThemeProvider} from './context/ThemeContext';
import {ToastProvider} from './context/ToastContext';
import {KeyboardProvider} from './context/KeyboardShortcuts';

function App() {
    return (
        <ThemeProvider>
            <ToastProvider>
                <BrowserRouter>
                    <KeyboardProvider>
                        <Routes>
                            <Route path="/" element={<LandingPage />} />
                            <Route path="/app" element={<Layout />}>
                                <Route index element={<Dashboard />} />
                                <Route path="dashboard" element={<Dashboard />} />
                                <Route path="timetable" element={<Timetable />} />
                                <Route path="exams" element={<Exams />} />
                                <Route path="schedule" element={<Schedule />} />
                                <Route path="chat" element={<Chat />} />
                                <Route path="pomodoro" element={<Pomodoro />} />
                                <Route path="mood" element={<MoodTracker />} />
                                <Route path="deadlines" element={<Deadlines />} />
                                <Route path="notes" element={<Notes />} />
                                <Route path="analytics" element={<Analytics />} />
                                {/* New routes */}
                                <Route path="flashcards" element={<Flashcards />} />
                                <Route path="habits" element={<HabitTracker />} />
                                <Route path="grades" element={<GradeCalculator />} />
                                <Route path="resources" element={<ResourceLibrary />} />
                            </Route>
                        </Routes>
                    </KeyboardProvider>
                </BrowserRouter>
            </ToastProvider>
        </ThemeProvider >
    );
}

export default App;
