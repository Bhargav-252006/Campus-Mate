import React, {useState, useEffect} from 'react';
import {Link} from 'react-router-dom';
import {Brain, Clock, Heart, Calendar, Mic, Target, BarChart3, BookOpen, CheckCircle2, Zap, Shield, ArrowRight} from 'lucide-react';
import {getTimetable, getExams, getSchedule} from '../services/api';

const coreValues = [
    {
        icon: Brain,
        title: 'AI Study Companion',
        description: 'Chat and voice-enabled AI that explains concepts clearly',
        color: '#3b82f6'
    },
    {
        icon: Calendar,
        title: 'Smart Planning',
        description: 'Never miss deadlines, exams, or important tasks',
        color: '#06b6d4'
    },
    {
        icon: Clock,
        title: 'Focus & Productivity',
        description: 'Pomodoro timers and schedules that keep you on track',
        color: '#f59e0b'
    },
    {
        icon: Heart,
        title: 'Mental Well-being',
        description: 'Mood tracking and insights to stay balanced',
        color: '#10b981'
    }
];

const aiFeatures = [
    'Adapts to your learning style over time',
    'Explains concepts like a patient tutor',
    'Spots stress patterns and suggests breaks',
    'Learns your study habits and preferences'
];

const dailyWorkflow = [
    {num: '1', time: 'Morning', title: 'Ask Campus Mate', desc: 'Get your day planned instantly'},
    {num: '2', time: 'During Study', title: 'Focus with Pomodoro', desc: 'Deep work sessions with breaks'},
    {num: '3', time: 'Throughout Day', title: 'Track Progress', desc: 'Log mood and energy levels'},
    {num: '4', time: 'Evening', title: 'Review Insights', desc: 'See patterns and achievements'}
];

const features = {
    study: [
        {icon: Mic, text: 'Voice-enabled AI chat'},
        {icon: BookOpen, text: 'Notes with markdown'}
    ],
    productivity: [
        {icon: Clock, text: 'Smart Pomodoro timer'},
        {icon: Calendar, text: 'Deadlines & exam manager'}
    ],
    wellbeing: [
        {icon: Heart, text: 'Mood & energy tracking'},
        {icon: BarChart3, text: 'Analytics dashboard'}
    ]
};

const trustPoints = [
    {icon: Shield, text: 'Your data never trains AI models'},
    {icon: CheckCircle2, text: 'Built by students, for students'},
    {icon: Zap, text: 'Free forever for core features'}
];

const LandingPage = () => {
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

            const todayClasses = timetable.filter(item => item.day === todayName);
            const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
            const upcomingExams = exams.filter(exam => {
                const examDate = new Date(exam.date);
                return examDate >= today && examDate <= nextWeek;
            }).slice(0, 3);

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
        return <div className="loading">Loading...</div>;
    }

    return (
        <div className="landing-page">
            {/* Hero Section */}
            <section className="hero-section">
                <div className="hero-content">
                    <div className="hero-badge">
                        <span className="badge-dot"></span>
                        Trusted by 10,000+ students
                    </div>
                    <h1 className="hero-title">
                        Your Personal AI Companion<br />
                        for <span className="gradient-text">Campus Life</span>
                    </h1>
                    <p className="hero-subtitle">
                        AI that helps you study, focus, and stay balanced — all in one place.
                    </p>
                    <div className="hero-actions">
                        <Link to="/app/chat" className="btn-primary-large">
                            Start Using Campus Mate
                            <ArrowRight size={20} />
                        </Link>
                        <button className="btn-secondary-large" onClick={() => document.getElementById('how-it-works')?.scrollIntoView({behavior: 'smooth'})}>
                            See How It Works
                        </button>
                    </div>
                </div>
                <div className="hero-visual">
                    <div className="dashboard-mockup">
                        <div className="mockup-header">
                            <div className="mockup-dots">
                                <span></span><span></span><span></span>
                            </div>
                            <span className="mockup-title">Campus Mate Dashboard</span>
                        </div>
                        <div className="mockup-content">
                            <div className="mockup-chat">
                                <div className="chat-bubble">Hey! Help me plan my study session for calculus</div>
                                <div className="chat-bubble ai">I'll create a focused plan. You have 3 hours available. Let's do 4 Pomodoro sessions with concept review.</div>
                            </div>
                            <div className="mockup-stats">
                                <div className="stat-card">
                                    <span className="stat-value">{stats.todayClasses.length}</span>
                                    <span className="stat-label">Classes Today</span>
                                </div>
                                <div className="stat-card">
                                    <span className="stat-value">{stats.pendingTasks.length}</span>
                                    <span className="stat-label">Tasks Due</span>
                                </div>
                                <div className="stat-card">
                                    <span className="stat-value">{stats.upcomingExams.length}</span>
                                    <span className="stat-label">Exams Soon</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Core Value Section */}
            <section className="core-values-section">
                <div className="section-intro">
                    <h2 className="section-title">Why Campus Mate?</h2>
                    <p className="section-description">Everything you need to succeed in one intelligent platform</p>
                </div>
                <div className="value-cards">
                    {coreValues.map((value, idx) => (
                        <div className="value-card" key={idx}>
                            <div className="value-icon" style={{backgroundColor: `${value.color}15`, color: value.color}}>
                                <value.icon size={28} />
                            </div>
                            <h3 className="value-title">{value.title}</h3>
                            <p className="value-description">{value.description}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* AI Understanding Section */}
            <section className="ai-understanding-section">
                <div className="ai-content">
                    <div className="ai-text">
                        <h2 className="section-title">AI That Understands You</h2>
                        <p className="ai-intro">
                            Explains calculus like a patient tutor, motivates you before exams,
                            and spots when you're stressed.
                        </p>
                        <ul className="ai-features-list">
                            {aiFeatures.map((feature, idx) => (
                                <li key={idx}>
                                    <CheckCircle2 size={20} />
                                    <span>{feature}</span>
                                </li>
                            ))}
                        </ul>
                        <p className="ai-trust">Powered by advanced AI, refined by student feedback</p>
                    </div>
                    <div className="ai-visual">
                        <div className="ai-brain-illustration">
                            <Brain size={120} strokeWidth={1.5} />
                            <div className="pulse-ring"></div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Daily Workflow Section */}
            <section className="workflow-section" id="how-it-works">
                <div className="section-intro">
                    <h2 className="section-title">Daily Student Workflow</h2>
                    <p className="section-description">From morning planning to evening insights</p>
                </div>
                <div className="workflow-timeline">
                    {dailyWorkflow.map((step, idx) => (
                        <div className="workflow-step" key={idx}>
                            <div className="step-number">{step.num}</div>
                            <div className="step-time">{step.time}</div>
                            <h3 className="step-title">{step.title}</h3>
                            <p className="step-description">{step.desc}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* Feature Highlights Section */}
            <section className="features-section">
                <div className="section-intro">
                    <h2 className="section-title">Feature Highlights</h2>
                    <p className="section-description">Everything you need, nothing you don't</p>
                </div>
                <div className="feature-categories">
                    <div className="feature-category">
                        <h3 className="category-title">Study Tools</h3>
                        <div className="feature-list">
                            {features.study.map((feature, idx) => (
                                <div className="feature-item" key={idx}>
                                    <feature.icon size={20} />
                                    <span>{feature.text}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="feature-category">
                        <h3 className="category-title">Productivity</h3>
                        <div className="feature-list">
                            {features.productivity.map((feature, idx) => (
                                <div className="feature-item" key={idx}>
                                    <feature.icon size={20} />
                                    <span>{feature.text}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="feature-category">
                        <h3 className="category-title">Well-being</h3>
                        <div className="feature-list">
                            {features.wellbeing.map((feature, idx) => (
                                <div className="feature-item" key={idx}>
                                    <feature.icon size={20} />
                                    <span>{feature.text}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* Trust Section */}
            <section className="trust-section">
                <div className="trust-content">
                    {trustPoints.map((point, idx) => (
                        <div className="trust-point" key={idx}>
                            <point.icon size={24} />
                            <span>{point.text}</span>
                        </div>
                    ))}
                </div>
            </section>

            {/* Final CTA Section */}
            <section className="final-cta-section">
                <div className="cta-content">
                    <h2 className="cta-title">Start Your Smarter Campus Life Today</h2>
                    <p className="cta-subtitle">Join students acing their semester →</p>
                    <Link to="/app/chat" className="btn-cta-large">
                        Try Campus Mate Now
                    </Link>
                </div>
            </section>

            {/* Footer */}
            <footer className="landing-footer">
                <div className="footer-content">
                    <div className="footer-brand">
                        <h3>Campus Mate AI</h3>
                        <p>Your personalized student companion</p>
                    </div>
                    <div className="footer-links">
                        <Link to="/app/dashboard">Dashboard</Link>
                        <Link to="/app/analytics">Features</Link>
                        <Link to="/app/chat">Chat</Link>
                    </div>
                </div>
                <div className="footer-bottom">
                    <p>© 2026 Campus Mate. Built by students, for students.</p>
                </div>
            </footer>
        </div>
    );
};

export default LandingPage;
