import React, {useState, useEffect} from 'react';
import {Plus, Edit2, Trash2, X, Save, ExternalLink, AlertTriangle} from 'lucide-react';
import {getExams, addExam, updateExam, deleteExam} from '../services/api';

const emptyExam = {course: '', date: '', time: '', location: '', syllabusLink: '', notes: ''};

const Exams = () => {
    const [exams, setExams] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingExam, setEditingExam] = useState(null);
    const [formData, setFormData] = useState(emptyExam);

    useEffect(() => {
        loadExams();
    }, []);

    const loadExams = async () => {
        try {
            const data = await getExams();
            setExams(data);
        } catch (error) {
            console.error('Error loading exams:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingExam) {
                await updateExam(editingExam.id, formData);
            } else {
                await addExam(formData);
            }
            await loadExams();
            closeModal();
        } catch (error) {
            console.error('Error saving exam:', error);
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm('Delete this exam?')) {
            try {
                await deleteExam(id);
                await loadExams();
            } catch (error) {
                console.error('Error deleting exam:', error);
            }
        }
    };

    const openAddModal = () => {
        setEditingExam(null);
        setFormData(emptyExam);
        setShowModal(true);
    };

    const openEditModal = (exam) => {
        setEditingExam(exam);
        setFormData(exam);
        setShowModal(true);
    };

    const closeModal = () => {
        setShowModal(false);
        setEditingExam(null);
        setFormData(emptyExam);
    };

    const getDaysUntil = (dateStr) => {
        const examDate = new Date(dateStr);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const diffTime = examDate - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays;
    };

    const getStatusClass = (dateStr) => {
        const days = getDaysUntil(dateStr);
        if (days < 0) return 'past';
        if (days <= 3) return 'urgent';
        if (days <= 7) return 'soon';
        return 'normal';
    };

    // Sort exams by date
    const sortedExams = [...exams].sort((a, b) => new Date(a.date) - new Date(b.date));
    const upcomingExams = sortedExams.filter(e => getDaysUntil(e.date) >= 0);
    const pastExams = sortedExams.filter(e => getDaysUntil(e.date) < 0);

    if (loading) {
        return <div className="loading">Loading exams...</div>;
    }

    return (
        <div className="exams-page">
            <div className="page-header">
                <div>
                    <h1>📝 Exams</h1>
                    <p className="subtitle">Track your upcoming examinations</p>
                </div>
                <button className="btn btn-primary" onClick={openAddModal}>
                    <Plus size={18} /> Add Exam
                </button>
            </div>

            {/* Upcoming Exams */}
            <section className="exam-section">
                <h2>Upcoming Exams ({upcomingExams.length})</h2>
                {upcomingExams.length === 0 ? (
                    <div className="empty-state">
                        <p>No upcoming exams scheduled 🎉</p>
                    </div>
                ) : (
                    <div className="exam-grid">
                        {upcomingExams.map(exam => {
                            const daysUntil = getDaysUntil(exam.date);
                            const statusClass = getStatusClass(exam.date);
                            return (
                                <div key={exam.id} className={`exam-card ${statusClass}`}>
                                    <div className="exam-header">
                                        <h3>{exam.course}</h3>
                                        <div className="exam-actions">
                                            <button onClick={() => openEditModal(exam)}>
                                                <Edit2 size={16} />
                                            </button>
                                            <button onClick={() => handleDelete(exam.id)}>
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>
                                    <div className="exam-details">
                                        <p className="exam-date">
                                            📅 {new Date(exam.date).toLocaleDateString('en-US', {
                                                weekday: 'long',
                                                year: 'numeric',
                                                month: 'long',
                                                day: 'numeric'
                                            })}
                                        </p>
                                        {exam.time && <p>🕐 {exam.time}</p>}
                                        {exam.location && <p>📍 {exam.location}</p>}
                                        {exam.notes && <p className="exam-notes">📌 {exam.notes}</p>}
                                        {exam.syllabusLink && (
                                            <a href={exam.syllabusLink} target="_blank" rel="noopener noreferrer" className="syllabus-link">
                                                <ExternalLink size={14} /> View Syllabus
                                            </a>
                                        )}
                                    </div>
                                    <div className="exam-countdown">
                                        {daysUntil === 0 ? (
                                            <span className="today"><AlertTriangle size={16} /> TODAY!</span>
                                        ) : daysUntil === 1 ? (
                                            <span className="tomorrow"><AlertTriangle size={16} /> Tomorrow!</span>
                                        ) : (
                                            <span>{daysUntil} days remaining</span>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </section>

            {/* Past Exams */}
            {pastExams.length > 0 && (
                <section className="exam-section past-section">
                    <h2>Past Exams ({pastExams.length})</h2>
                    <div className="exam-grid">
                        {pastExams.map(exam => (
                            <div key={exam.id} className="exam-card past">
                                <div className="exam-header">
                                    <h3>{exam.course}</h3>
                                    <button onClick={() => handleDelete(exam.id)}>
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                                <p className="exam-date">
                                    {new Date(exam.date).toLocaleDateString()}
                                </p>
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {/* Modal */}
            {showModal && (
                <div className="modal-overlay" onClick={closeModal}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>{editingExam ? 'Edit Exam' : 'Add Exam'}</h2>
                            <button className="close-btn" onClick={closeModal}>
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit}>
                            <div className="form-group">
                                <label>Course/Subject *</label>
                                <input
                                    type="text"
                                    value={formData.course}
                                    onChange={e => setFormData({...formData, course: e.target.value})}
                                    required
                                    placeholder="e.g., Data Structures"
                                />
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Date *</label>
                                    <input
                                        type="date"
                                        value={formData.date}
                                        onChange={e => setFormData({...formData, date: e.target.value})}
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Time</label>
                                    <input
                                        type="time"
                                        value={formData.time}
                                        onChange={e => setFormData({...formData, time: e.target.value})}
                                    />
                                </div>
                            </div>
                            <div className="form-group">
                                <label>Location</label>
                                <input
                                    type="text"
                                    value={formData.location}
                                    onChange={e => setFormData({...formData, location: e.target.value})}
                                    placeholder="e.g., Hall A"
                                />
                            </div>
                            <div className="form-group">
                                <label>Syllabus Link</label>
                                <input
                                    type="url"
                                    value={formData.syllabusLink}
                                    onChange={e => setFormData({...formData, syllabusLink: e.target.value})}
                                    placeholder="https://..."
                                />
                            </div>
                            <div className="form-group">
                                <label>Notes</label>
                                <textarea
                                    value={formData.notes}
                                    onChange={e => setFormData({...formData, notes: e.target.value})}
                                    placeholder="Any additional notes..."
                                    rows={3}
                                />
                            </div>
                            <div className="modal-actions">
                                <button type="button" className="btn btn-secondary" onClick={closeModal}>
                                    Cancel
                                </button>
                                <button type="submit" className="btn btn-primary">
                                    <Save size={18} /> {editingExam ? 'Update' : 'Save'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Exams;
