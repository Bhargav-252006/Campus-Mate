import React, {useState, useEffect} from 'react';
import {Link} from 'react-router-dom';
import {Calendar, ClipboardList, CheckSquare, MessageCircle, Clock, BookOpen} from 'lucide-react';
import {getTimetable, getExams, getSchedule} from '../services/api';

const Dashboard = () => {
    const [stats, setStats] = useState({
        todayClasses: [],
        upcomingExams: [],
        pendingTasks: [],
        completedToday: 0
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadDashboardData();
    }, []);

    const loadDashboardData = async () => {
        try {
            const [timetable, exams, schedule] = await Promise.all([
                getTimetable(),
                getExams(),
                getSchedule()
            ]);

            const today = new Date();
            const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
            const todayName = dayNames[today.getDay()];

            // Filter today's classes
            const todayClasses = timetable.filter(item => item.day === todayName);

            // Filter upcoming exams (next 7 days)
            const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
            const upcomingExams = exams.filter(exam => {
                const examDate = new Date(exam.date);
                return examDate >= today && examDate <= nextWeek;
            }).slice(0, 3);

            // Filter pending tasks
            const pendingTasks = schedule.filter(task => !task.completed).slice(0, 5);
            const completedToday = schedule.filter(task => task.completed).length;

            setStats({todayClasses, upcomingExams, pendingTasks, completedToday});
        } catch (error) {
            console.error('Error loading dashboard:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return <div className="loading">Loading dashboard...</div>;
    }

    return (
        <div className="dashboard">
            <h1>📊 Dashboard</h1>
            <p className="subtitle">Welcome back! Here's your overview for today.</p>

            {/* Quick Stats */}
            <div className="stats-grid">
                <div className="stat-card">
                    <Calendar size={32} className="stat-icon blue" />
                    <div className="stat-info">
                        <h3>{stats.todayClasses.length}</h3>
                        <p>Classes Today</p>
                    </div>
                </div>
                <div className="stat-card">
                    <ClipboardList size={32} className="stat-icon red" />
                    <div className="stat-info">
                        <h3>{stats.upcomingExams.length}</h3>
                        <p>Upcoming Exams</p>
                    </div>
                </div>
                <div className="stat-card">
                    <CheckSquare size={32} className="stat-icon orange" />
                    <div className="stat-info">
                        <h3>{stats.pendingTasks.length}</h3>
                        <p>Pending Tasks</p>
                    </div>
                </div>
                <div className="stat-card">
                    <BookOpen size={32} className="stat-icon green" />
                    <div className="stat-info">
                        <h3>{stats.completedToday}</h3>
                        <p>Completed</p>
                    </div>
                </div>
            </div>

            {/* Content Sections */}
            <div className="dashboard-grid">
                {/* Today's Classes */}
                <div className="dashboard-card">
                    <div className="card-header">
                        <h2><Calendar size={20} /> Today's Classes</h2>
                        <Link to="/timetable" className="view-all">View All</Link>
                    </div>
                    <div className="card-content">
                        {stats.todayClasses.length === 0 ? (
                            <p className="empty-state">No classes scheduled for today 🎉</p>
                        ) : (
                            <ul className="item-list">
                                {stats.todayClasses.map((cls, idx) => (
                                    <li key={idx} className="list-item">
                                        <Clock size={16} />
                                        <span className="time">{cls.time}</span>
                                        <span className="subject">{cls.subject}</span>
                                        <span className="room">{cls.room}</span>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>

                {/* Upcoming Exams */}
                <div className="dashboard-card">
                    <div className="card-header">
                        <h2><ClipboardList size={20} /> Upcoming Exams</h2>
                        <Link to="/exams" className="view-all">View All</Link>
                    </div>
                    <div className="card-content">
                        {stats.upcomingExams.length === 0 ? (
                            <p className="empty-state">No exams in the next 7 days</p>
                        ) : (
                            <ul className="item-list">
                                {stats.upcomingExams.map((exam, idx) => (
                                    <li key={idx} className="list-item exam-item">
                                        <span className="course">{exam.course}</span>
                                        <span className="date">{new Date(exam.date).toLocaleDateString()}</span>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>

                {/* Pending Tasks */}
                <div className="dashboard-card">
                    <div className="card-header">
                        <h2><CheckSquare size={20} /> Pending Tasks</h2>
                        <Link to="/schedule" className="view-all">View All</Link>
                    </div>
                    <div className="card-content">
                        {stats.pendingTasks.length === 0 ? (
                            <p className="empty-state">All tasks completed! 🎉</p>
                        ) : (
                            <ul className="item-list">
                                {stats.pendingTasks.map((task, idx) => (
                                    <li key={idx} className="list-item task-item">
                                        <span className={`priority priority-${task.priority}`}>{task.priority}</span>
                                        <span className="task-name">{task.task}</span>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>

                {/* Quick Chat */}
                <div className="dashboard-card chat-preview">
                    <div className="card-header">
                        <h2><MessageCircle size={20} /> AI Assistant</h2>
                        <Link to="/chat" className="view-all">Open Chat</Link>
                    </div>
                    <div className="card-content">
                        <p>Need help with studies, scheduling, or just want to talk?</p>
                        <Link to="/chat" className="chat-btn">
                            🎤 Start Conversation
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
