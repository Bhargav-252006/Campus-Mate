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

// Export/Import functions (kept from original)
const exportAllData = (toast) => {
    try {
        const data = {};
        const keys = [
            'flashcardDecks', 'habits', 'gradeCourses', 'targetGPA',
            'resourceLibrary', 'resourceFolders', 'notes', 'moodEntries',
            'deadlines', 'pomodoroStats', 'chatHistory', 'timetable',
            'exams', 'schedule', 'focusModeSettings', 'focusTodaySessions',
            'theme'
        ];

        keys.forEach(key => {
            const value = localStorage.getItem(key);
            if (value) {
                try {
                    data[key] = JSON.parse(value);
                } catch (e) {
                    data[key] = value;
                }
            }
        });

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

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const data = JSON.parse(event.target.result);
                Object.entries(data).forEach(([key, value]) => {
                    localStorage.setItem(key, JSON.stringify(value));
                });
                toast.success('Data imported! Refreshing...');
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
                    <div className="logo-icon bg-gradient-to-br from-indigo-500 to-purple-500 p-2 rounded-lg">
                        <GraduationCap size={28} className="text-white" />
                    </div>
                    <span>StudentMate</span>
                </div>

                {/* Navigation */}
                <div className="nav-scroll">
                    <nav className="flex flex-col gap-2">
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
                    <div className={`flex items-center gap-3 ${!sidebarOpen && 'justify-center'}`}>
                        <div className="w-10 h-10 rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 flex items-center justify-center text-white font-bold shadow-lg">
                            SM
                        </div>
                        {sidebarOpen && (
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-white truncate">Student User</p>
                                <p className="text-xs text-gray-400 truncate">Pro Plan</p>
                            </div>
                        )}
                        {sidebarOpen && <Settings size={18} className="text-gray-400 cursor-pointer hover:text-white" />}
                    </div>
                </div>
            </aside>

            {/* Main Content Wrapper */}
            <div className="main-wrapper">
                {/* Floating Header */}
                <header className="top-header">
                    <div className="flex items-center gap-4">
                        <button className="menu-btn p-2 hover:bg-white/5 rounded-lg transition-colors" onClick={() => setSidebarOpen(!sidebarOpen)}>
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
                    <div className="mx-auto max-w-7xl animate-fade-in">
                        <Outlet />
                    </div>
                </main>
            </div>
        </div>
    );
};

export default Layout;
