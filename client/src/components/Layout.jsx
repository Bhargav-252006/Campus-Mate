import React from 'react';
import {NavLink, Outlet} from 'react-router-dom';
import {
    LayoutDashboard,
    Calendar,
    ClipboardList,
    CheckSquare,
    MessageCircle,
    GraduationCap,
    Menu,
    X
} from 'lucide-react';
import {useState} from 'react';

const navItems = [
    {path: '/', icon: LayoutDashboard, label: 'Dashboard'},
    {path: '/timetable', icon: Calendar, label: 'Timetable'},
    {path: '/exams', icon: ClipboardList, label: 'Exams'},
    {path: '/schedule', icon: CheckSquare, label: 'Daily Schedule'},
    {path: '/chat', icon: MessageCircle, label: 'AI Chat'},
];

const Layout = () => {
    const [sidebarOpen, setSidebarOpen] = useState(true);

    return (
        <div className="app-container">
            {/* Header */}
            <header className="header">
                <button className="menu-btn" onClick={() => setSidebarOpen(!sidebarOpen)}>
                    {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
                </button>
                <div className="logo">
                    <GraduationCap size={28} />
                    <span>Student Mate AI</span>
                </div>
                <div className="user-info">
                    <span>Welcome, Student</span>
                </div>
            </header>

            <div className="main-wrapper">
                {/* Sidebar */}
                <aside className={`sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
                    <nav>
                        {navItems.map((item) => (
                            <NavLink
                                key={item.path}
                                to={item.path}
                                className={({isActive}) => `nav-item ${isActive ? 'active' : ''}`}
                            >
                                <item.icon size={20} />
                                {sidebarOpen && <span>{item.label}</span>}
                            </NavLink>
                        ))}
                    </nav>
                </aside>

                {/* Main Content */}
                <main className="main-content">
                    <Outlet />
                </main>
            </div>
        </div>
    );
};

export default Layout;
