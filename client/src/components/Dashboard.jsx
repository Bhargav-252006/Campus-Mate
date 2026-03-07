import React, {useState, useEffect} from 'react';
import {Link} from 'react-router-dom';
import {
    Timer,
    CheckSquare,
    TrendingUp,
    AlertCircle,
    Plus,
    MoreHorizontal,
    FileText,
    Clock,
    MapPin,
    BookOpen,
    Target,
    Calendar as CalendarIcon
} from 'lucide-react';
import {getTimetable, getExams, getSchedule} from '../services/api';

const Dashboard = () => {
    const [stats, setStats] = useState({
        todayClasses: [],
        upcomingExams: [],
        pendingTasks: [],
        completedToday: 0,
        studyHours: 0
    });
    const [loading, setLoading] = useState(true);
    const [currentTime, setCurrentTime] = useState(new Date());

    useEffect(() => {
        loadDashboardData();
        // Update every 60s instead of 1s to reduce re-renders
        const timer = setInterval(() => setCurrentTime(new Date()), 60000);
        return () => clearInterval(timer);
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

            const todayClasses = timetable.filter(item => item.day === todayName);
            const nextWeek = new Date(today.getTime() + 14 * 24 * 60 * 60 * 1000);
            const upcomingExams = exams.filter(exam => {
                const examDate = new Date(exam.date);
                return examDate >= today && examDate <= nextWeek;
            }).slice(0, 3);

            const pendingTasks = schedule.filter(task => !task.completed).slice(0, 5);
            const completedToday = schedule.filter(task => task.completed).length;
            const totalTasks = schedule.length;
            const studyHours = totalTasks > 0 ? (completedToday * 1.5).toFixed(1) : '0.0';

            setStats({todayClasses, upcomingExams, pendingTasks, completedToday, studyHours});
        } catch (error) {
            console.error('Error loading dashboard:', error);
        } finally {
            setLoading(false);
        }
    };

    const getGreeting = () => {
        const hour = currentTime.getHours();
        if (hour < 12) return 'Good Morning';
        if (hour < 18) return 'Good Afternoon';
        return 'Good Evening';
    };

    const getDayDate = () => {
        const options = {weekday: 'long', month: 'short', day: 'numeric'};
        return currentTime.toLocaleDateString('en-US', options);
    };

    const getTasksDonePercentage = () => {
        const total = stats.completedToday + stats.pendingTasks.length;
        return total > 0 ? Math.round((stats.completedToday / total) * 100) : 0;
    };

    const getDaysUntilExam = (examDate) => {
        const today = new Date();
        const exam = new Date(examDate);
        const diffTime = exam - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays;
    };

    const getExamProgress = (exam) => {
        const daysUntil = getDaysUntilExam(exam.date);
        // Calculate how far we are from when the exam was added
        // Use 14 days as default study window, capped at 100%
        const totalDays = Math.max(14, daysUntil + 7); // assume exam was known at least 7 days before now
        const daysPassed = totalDays - daysUntil;
        return Math.max(0, Math.min(100, (daysPassed / totalDays) * 100));
    };

    const isClassCurrent = (classTime) => {
        if (!classTime) return false;
        const [startTime] = classTime.split(' - ');
        if (!startTime) return false;

        // Parse time supporting both 24hr (14:30) and 12hr (2:30 PM) formats
        let hours, minutes;
        const timeMatch = startTime.trim().match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
        if (timeMatch) {
            hours = parseInt(timeMatch[1]);
            minutes = parseInt(timeMatch[2]);
            const period = timeMatch[3];
            if (period) {
                if (period.toUpperCase() === 'PM' && hours < 12) hours += 12;
                if (period.toUpperCase() === 'AM' && hours === 12) hours = 0;
            }
        } else {
            return false;
        }

        if (isNaN(hours) || isNaN(minutes)) return false;
        const classDate = new Date(currentTime);
        classDate.setHours(hours, minutes, 0);
        const endDate = new Date(classDate.getTime() + 90 * 60000);
        return currentTime >= classDate && currentTime <= endDate;
    };

    if (loading) {
        return (
            <div className="dashboard-loading">
                <div className="loading-spinner"></div>
                <p>Loading your dashboard...</p>
            </div>
        );
    }

    return (
        <div className="dashboard dashboard-page">
            {/* Welcome Section */}
            <div className="dashboard-header">
                <div className="header-text">
                    <h1 className="dashboard-title">
                        {getGreeting()}, Student! ☀️
                    </h1>
                    <p className="dashboard-subtitle">
                        {stats.upcomingExams.length > 0
                            ? `You have ${stats.upcomingExams.length} exam${stats.upcomingExams.length > 1 ? 's' : ''} coming up. Stay focused!`
                            : "You're all caught up! Keep up the great work!"}
                    </p>
                </div>
                <Link to="/app/schedule" className="btn-add-task">
                    <Plus size={18} />
                    New Task
                </Link>
            </div>

            {/* Stats Grid */}
            <div className="stats-grid">
                <StatsCard
                    title="Study Hours"
                    value={`${stats.studyHours}h`}
                    trend={`${getTasksDonePercentage()}%`}
                    trendUp={stats.completedToday > 0}
                    icon={Timer}
                    color="text-blue"
                    bg="bg-blue-light"
                />
                <StatsCard
                    title="Tasks Done"
                    value={`${stats.completedToday}/${stats.completedToday + stats.pendingTasks.length}`}
                    trend={`${getTasksDonePercentage()}%`}
                    trendUp={getTasksDonePercentage() > 50}
                    icon={CheckSquare}
                    color="text-green"
                    bg="bg-green-light"
                />
                <StatsCard
                    title="Upcoming"
                    value={stats.upcomingExams.length}
                    trend={stats.upcomingExams.length > 0 ? 'Exams' : 'None'}
                    trendUp={stats.upcomingExams.length === 0}
                    icon={TrendingUp}
                    color="text-purple"
                    bg="bg-purple-light"
                />
                <StatsCard
                    title="Pending"
                    value={stats.pendingTasks.length}
                    trend="Due Soon"
                    trendUp={false}
                    icon={AlertCircle}
                    color="text-orange"
                    bg="bg-orange-light"
                />
            </div>

            <div className="dashboard-content">
                {/* Main Focus Area */}
                <div className="dashboard-main">
                    {/* Today's Schedule */}
                    <div className="dashboard-card">
                        <div className="card-header">
                            <div className="card-title-group">
                                <h3 className="card-title">Today's Schedule</h3>
                                <p className="card-subtitle">{getDayDate()}</p>
                            </div>
                            <button className="btn-icon">
                                <MoreHorizontal size={18} />
                            </button>
                        </div>
                        <div className="card-content">
                            {stats.todayClasses.length > 0 ? (
                                <div className="schedule-list">
                                    {stats.todayClasses.map((classItem, idx) => (
                                        <ScheduleItem
                                            key={idx}
                                            time={classItem.time}
                                            title={classItem.subject}
                                            type="Lecture"
                                            location={classItem.room || 'TBA'}
                                            status={isClassCurrent(classItem.time) ? 'current' : 'upcoming'}
                                        />
                                    ))}
                                </div>
                            ) : (
                                <div className="empty-state">
                                    <CalendarIcon size={48} className="empty-icon" />
                                    <p>No classes scheduled today</p>
                                    <Link to="/app/timetable" className="btn-link">View Timetable</Link>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Pending Tasks */}
                    <div className="dashboard-card">
                        <div className="card-header">
                            <h3 className="card-title">Pending Tasks</h3>
                            <Link to="/app/schedule" className="btn-link">View All</Link>
                        </div>
                        <div className="card-content">
                            {stats.pendingTasks.length > 0 ? (
                                <div className="tasks-list">
                                    {stats.pendingTasks.map((task, idx) => (
                                        <TaskItem
                                            key={idx}
                                            title={task.task}
                                            time={task.time}
                                            priority={task.priority || 'medium'}
                                        />
                                    ))}
                                </div>
                            ) : (
                                <div className="empty-state">
                                    <CheckSquare size={48} className="empty-icon" />
                                    <p>All tasks completed! 🎉</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Right Sidebar */}
                <div className="dashboard-sidebar">
                    {/* Pomodoro Timer */}
                    <div className="dashboard-card card-highlight">
                        <div className="card-header">
                            <h3 className="card-title card-title-white">
                                <Timer size={20} />
                                Pomodoro Timer
                            </h3>
                        </div>
                        <div className="card-content card-content-center">
                            <div className="pomodoro-timer">
                                <div className="timer-display">25:00</div>
                                <p className="timer-label">Ready to focus</p>
                                <Link to="/app/pomodoro" className="btn-timer">
                                    Start Timer
                                </Link>
                            </div>
                        </div>
                    </div>

                    {/* Upcoming Exams */}
                    <div className="dashboard-card">
                        <div className="card-header">
                            <h3 className="card-title">Upcoming Exams</h3>
                        </div>
                        <div className="card-content">
                            {stats.upcomingExams.length > 0 ? (
                                <div className="exams-list">
                                    {stats.upcomingExams.map((exam, idx) => {
                                        const daysLeft = getDaysUntilExam(exam.date);
                                        const progress = getExamProgress(exam);
                                        return (
                                            <ExamItem
                                                key={idx}
                                                subject={exam.subject}
                                                daysLeft={daysLeft}
                                                progress={progress}
                                            />
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="empty-state-sm">
                                    <BookOpen size={32} className="empty-icon" />
                                    <p>No upcoming exams</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Quick Actions */}
                    <div className="dashboard-card">
                        <div className="card-header">
                            <h3 className="card-title">Quick Actions</h3>
                        </div>
                        <div className="card-content">
                            <div className="quick-actions">
                                <Link to="/app/notes" className="quick-action-btn">
                                    <FileText size={18} />
                                    <span>New Note</span>
                                </Link>
                                <Link to="/app/mood" className="quick-action-btn">
                                    <Target size={18} />
                                    <span>Log Mood</span>
                                </Link>
                                <Link to="/app/deadlines" className="quick-action-btn">
                                    <Clock size={18} />
                                    <span>Deadlines</span>
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

// Stats Card Component
const StatsCard = ({title, value, trend, trendUp, icon: Icon, color, bg}) => (
    <div className="stats-card">
        <div className="stats-card-content">
            <div className="stats-header">
                <div className={`stats-icon ${bg}`}>
                    <Icon className={color} size={20} />
                </div>
                <span className={`stats-trend ${trendUp ? 'trend-up' : 'trend-down'}`}>
                    {trend}
                </span>
            </div>
            <div className="stats-info">
                <h3 className="stats-label">{title}</h3>
                <div className="stats-value">{value}</div>
            </div>
        </div>
    </div>
);

// Schedule Item Component
const ScheduleItem = ({time, title, type, location, status}) => (
    <div className={`schedule-item ${status === 'current' ? 'schedule-item-active' : ''}`}>
        <div className="schedule-time">{time}</div>
        <div className="schedule-details">
            <h4 className="schedule-title">{title}</h4>
            <p className="schedule-meta">
                <MapPin size={12} />
                {location} • {type}
            </p>
        </div>
        {status === 'current' && (
            <span className="schedule-badge">Now</span>
        )}
    </div>
);

// Task Item Component
const TaskItem = ({title, time, priority}) => {
    const priorityColors = {
        high: 'priority-high',
        medium: 'priority-medium',
        low: 'priority-low'
    };

    return (
        <div className="task-item">
            <div className="task-checkbox"></div>
            <div className="task-details">
                <h4 className="task-title">{title}</h4>
                <p className="task-time">
                    <Clock size={12} />
                    {time}
                </p>
            </div>
            <span className={`task-priority ${priorityColors[priority]}`}>
                {priority}
            </span>
        </div>
    );
};

// Exam Item Component
const ExamItem = ({subject, daysLeft, progress}) => (
    <div className="exam-item">
        <div className="exam-header">
            <span className="exam-subject">{subject}</span>
            <span className={`exam-days ${daysLeft <= 3 ? 'exam-urgent' : ''}`}>
                {daysLeft} days left
            </span>
        </div>
        <div className="exam-progress">
            <div className="progress-bar">
                <div className="progress-fill" style={{width: `${progress}%`}}></div>
            </div>
        </div>
    </div>
);

export default Dashboard;
