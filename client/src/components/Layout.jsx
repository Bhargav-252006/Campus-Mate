import React, {useState} from 'react';
import {NavLink, Outlet, useLocation} from 'react-router-dom';
import {
    Calendar,
    ClipboardList,
    CheckSquare,
    MessageCircle,
    GraduationCap,
    Menu,
    X,
    Timer,
    Heart,
    Target,
    FileText,
    BarChart3,
    LayoutDashboard,
    Brain,
    CheckCircle2,
    Calculator,
    Library,
    Sun,
    Moon,
    Download,
    Upload,
    Settings
} from 'lucide-react';
import {useTheme} from '../context/ThemeContext';
import {useToast} from '../context/ToastContext';

const navItems = [
    {path: '/app/dashboard', icon: LayoutDashboard, label: 'Dashboard'},
    {path: '/app/chat', icon: MessageCircle, label: 'AI Companion'},
    {path: '/app/pomodoro', icon: Timer, label: 'Pomodoro'},
    {path: '/app/schedule', icon: CheckSquare, label: 'Tasks'},
    {path: '/app/timetable', icon: Calendar, label: 'Timetable'},
    {path: '/app/exams', icon: ClipboardList, label: 'Exams'},
    {path: '/app/mood', icon: Heart, label: 'Mood'},
    {path: '/app/notes', icon: FileText, label: 'Notes'},
    {path: '/app/flashcards', icon: Brain, label: 'Flashcards'},
    {path: '/app/habits', icon: CheckCircle2, label: 'Habits'},
    {path: '/app/grades', icon: Calculator, label: 'Grades'},
    {path: '/app/resources', icon: Library, label: 'Resources'},
    {path: '/app/deadlines', icon: Target, label: 'Deadlines'},
    {path: '/app/analytics', icon: BarChart3, label: 'Analytics'},
];

// Allowed keys for import/export — prevents arbitrary localStorage writes
const ALLOWED_DATA_KEYS = new Set([
    'flashcardDecks', 'habits', 'gradeCourses', 'targetGPA',
    'resourceLibrary', 'resourceFolders', 'notes', 'moodEntries',
    'deadlines', 'pomodoroStats', 'chatHistory', 'timetable',
    'exams', 'schedule', 'focusModeSettings', 'focusTodaySessions',
    'theme'
]);

// Export/Import functions
const exportAllData = (toast) => {
    try {
        const data = {};
        for (const key of ALLOWED_DATA_KEYS) {
            const value = localStorage.getItem(key);
            if (value) {
                try {
                    data[key] = JSON.parse(value);
                } catch (e) {
                    data[key] = value;
                }
            }
        }

        const blob = new Blob([JSON.stringify(data, null, 2)], {type: 'application/json'});
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `campus-mate-backup-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);

        toast.success('Data exported successfully!');
    } catch (error) {
        toast.error('Failed to export data');
        console.error(error);
    }
};

const importData = (toast) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // S9 fix: Reject suspiciously large files (>5 MB)
        if (file.size > 5 * 1024 * 1024) {
            toast.error('Backup file is too large (max 5 MB)');
            return;
        }

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const data = JSON.parse(event.target.result);

                if (typeof data !== 'object' || Array.isArray(data)) {
                    toast.error('Invalid backup file format');
                    return;
                }

                // S9 fix: Only import whitelisted keys
                let importedCount = 0;
                for (const [key, value] of Object.entries(data)) {
                    if (ALLOWED_DATA_KEYS.has(key)) {
                        localStorage.setItem(key, JSON.stringify(value));
                        importedCount++;
                    }
                }

                if (importedCount === 0) {
                    toast.error('No valid data found in backup file');
                    return;
                }

                toast.success(`Imported ${importedCount} items! Refreshing...`);
                setTimeout(() => window.location.reload(), 1500);
            } catch (error) {
                toast.error('Invalid backup file');
            }
        };
        reader.readAsText(file);
    };
    input.click();
};

const Layout = () => {
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const {theme, toggleTheme} = useTheme();
    const toast = useToast();
    const location = useLocation();

    // Get current page title
    const getCurrentPageTitle = () => {
        const current = navItems.find(item => item.path === location.pathname);
        if (current) return current.label;
        // /app (index) is the Dashboard
        if (location.pathname === '/app' || location.pathname === '/app/') return 'Dashboard';
        return 'Campus Mate';
    };

    return (
        <div className="app-container">
            {/* Glassmorphic Sidebar */}
            <aside className={`sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
                {/* Logo Area */}
                <div className="logo-container">
                    <div className="logo-icon">
                        <GraduationCap size={28} />
                    </div>
                    <span>Campus Mate</span>
                </div>

                {/* Navigation */}
                <div className="nav-scroll">
                    <nav>
                        {navItems.map((item) => (
                            <NavLink
                                key={item.path}
                                to={item.path}
                                className={({isActive}) => `nav-item ${isActive ? 'active' : ''}`}
                                title={item.label}
                            >
                                <item.icon size={20} />
                                {sidebarOpen && <span>{item.label}</span>}
                            </NavLink>
                        ))}
                    </nav>
                </div>

                {/* User Profile / Bottom Actions */}
                <div className="user-profile">
                    <div className="user-profile-inner">
                        <div className="user-avatar">
                            SM
                        </div>
                        {sidebarOpen && (
                            <div className="user-info">
                                <p className="user-name">Student User</p>
                                <p className="user-plan">Free Plan</p>
                            </div>
                        )}
                        {sidebarOpen && <Settings size={18} className="user-settings-icon" />}
                    </div>
                </div>
            </aside>

            {/* Main Content Wrapper */}
            <div className="main-wrapper">
                {/* Floating Header */}
                <header className="top-header">
                    <div className="header-left">
                        <button className="menu-btn" onClick={() => setSidebarOpen(!sidebarOpen)}>
                            {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
                        </button>
                        <div className="header-title">
                            <h1>{getCurrentPageTitle()}</h1>
                        </div>
                    </div>

                    <div className="header-actions">
                        <button className="icon-btn" onClick={() => importData(toast)} title="Import Data">
                            <Upload size={18} />
                        </button>
                        <button className="icon-btn" onClick={() => exportAllData(toast)} title="Export Data">
                            <Download size={18} />
                        </button>
                        <button className="icon-btn theme-toggle" onClick={toggleTheme} title="Toggle Theme">
                            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
                        </button>
                    </div>
                </header>

                {/* Page Content */}
                <main className="page-content">
                    <div className="page-content-inner">
                        <Outlet />
                    </div>
                </main>
            </div>
        </div>
    );
};

export default Layout;
