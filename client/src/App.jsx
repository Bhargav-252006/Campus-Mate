import React, {lazy, Suspense} from 'react';
import {BrowserRouter, Routes, Route, Link} from 'react-router-dom';
import Layout from './components/Layout';
import ErrorBoundary from './components/ErrorBoundary';
// Context providers (loaded eagerly since they wrap the app)
import {ThemeProvider} from './context/ThemeContext';
import {ToastProvider} from './context/ToastContext';
import {KeyboardProvider} from './context/KeyboardShortcuts';

// Lazy load all page components for code splitting
const LandingPage = lazy(() => import('./components/LandingPage'));
const Dashboard = lazy(() => import('./components/Dashboard'));
const Timetable = lazy(() => import('./components/Timetable'));
const Exams = lazy(() => import('./components/Exams'));
const Schedule = lazy(() => import('./components/Schedule'));
const Chat = lazy(() => import('./components/Chat'));
const Pomodoro = lazy(() => import('./components/Pomodoro'));
const MoodTracker = lazy(() => import('./components/MoodTracker'));
const Deadlines = lazy(() => import('./components/Deadlines'));
const Notes = lazy(() => import('./components/Notes'));
const Analytics = lazy(() => import('./components/Analytics'));
const Flashcards = lazy(() => import('./components/Flashcards'));
const HabitTracker = lazy(() => import('./components/HabitTracker'));
const GradeCalculator = lazy(() => import('./components/GradeCalculator'));
const ResourceLibrary = lazy(() => import('./components/ResourceLibrary'));
const FocusMode = lazy(() => import('./components/FocusMode'));
const SystemStats = lazy(() => import('./components/SystemStats'));

// Loading fallback
const PageLoader = () => (
    <div className="app-loader">
        <div className="loading-spinner" />
    </div>
);

// 404 page
const NotFound = () => (
    <div className="not-found-page">
        <h2>404 - Page Not Found</h2>
        <p>The page you're looking for doesn't exist.</p>
        <Link to="/app" className="btn btn-primary">Go to Dashboard</Link>
    </div>
);

function App() {
    return (
        <ThemeProvider>
            <ToastProvider>
                <ErrorBoundary>
                    <BrowserRouter>
                        <KeyboardProvider>
                            <Suspense fallback={<PageLoader />}>
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
                                        <Route path="flashcards" element={<Flashcards />} />
                                        <Route path="habits" element={<HabitTracker />} />
                                        <Route path="grades" element={<GradeCalculator />} />
                                        <Route path="resources" element={<ResourceLibrary />} />
                                        <Route path="focus" element={<FocusMode />} />
                                        <Route path="stats" element={<SystemStats />} />
                                        <Route path="*" element={<NotFound />} />
                                    </Route>
                                    <Route path="*" element={<NotFound />} />
                                </Routes>
                            </Suspense>
                        </KeyboardProvider>
                    </BrowserRouter>
                </ErrorBoundary>
            </ToastProvider>
        </ThemeProvider>
    );
}

export default App;
