import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, X, Save } from 'lucide-react';
import { getTimetable, addTimetableEntry, updateTimetableEntry, deleteTimetableEntry } from '../services/api';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const TIME_SLOTS = [
    '09:00 AM', '10:00 AM', '11:00 AM', '12:00 PM',
    '01:00 PM', '02:00 PM', '03:00 PM', '04:00 PM', '05:00 PM'
];

const emptyEntry = { subject: '', day: 'Monday', time: '09:00 AM', room: '', teacher: '' };

const Timetable = () => {
    const [timetable, setTimetable] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingEntry, setEditingEntry] = useState(null);
    const [formData, setFormData] = useState(emptyEntry);

    useEffect(() => {
        loadTimetable();
    }, []);

    const loadTimetable = async () => {
        try {
            const data = await getTimetable();
            setTimetable(data);
        } catch (error) {
            console.error('Error loading timetable:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingEntry) {
                await updateTimetableEntry(editingEntry.id, formData);
            } else {
                await addTimetableEntry(formData);
            }
            await loadTimetable();
            closeModal();
        } catch (error) {
            console.error('Error saving entry:', error);
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm('Delete this class?')) {
            try {
                await deleteTimetableEntry(id);
                await loadTimetable();
            } catch (error) {
                console.error('Error deleting entry:', error);
            }
        }
    };

    const openAddModal = () => {
        setEditingEntry(null);
        setFormData(emptyEntry);
        setShowModal(true);
    };

    const openEditModal = (entry) => {
        setEditingEntry(entry);
        setFormData(entry);
        setShowModal(true);
    };

    const closeModal = () => {
        setShowModal(false);
        setEditingEntry(null);
        setFormData(emptyEntry);
    };

    const getClassForSlot = (day, time) => {
        return timetable.find(entry => entry.day === day && entry.time === time);
    };

    if (loading) {
        return <div className="loading">Loading timetable...</div>;
    }

    return (
        <div className="timetable-page">
            <div className="page-header">
                <div>
                    <h1>📅 Timetable</h1>
                    <p className="subtitle">Your weekly class schedule</p>
                </div>
                <button className="btn btn-primary" onClick={openAddModal}>
                    <Plus size={18} /> Add Class
                </button>
            </div>

            {/* Timetable Grid */}
            <div className="timetable-container">
                <table className="timetable-grid">
                    <thead>
                        <tr>
                            <th>Time</th>
                            {DAYS.map(day => <th key={day}>{day}</th>)}
                        </tr>
                    </thead>
                    <tbody>
                        {TIME_SLOTS.map(time => (
                            <tr key={time}>
                                <td className="time-cell">{time}</td>
                                {DAYS.map(day => {
                                    const classEntry = getClassForSlot(day, time);
                                    return (
                                        <td key={`${day}-${time}`} className="class-cell">
                                            {classEntry ? (
                                                <div className="class-card">
                                                    <strong>{classEntry.subject}</strong>
                                                    <span>{classEntry.room}</span>
                                                    <span className="teacher">{classEntry.teacher}</span>
                                                    <div className="class-actions">
                                                        <button onClick={() => openEditModal(classEntry)}>
                                                            <Edit2 size={14} />
                                                        </button>
                                                        <button onClick={() => handleDelete(classEntry.id)}>
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <button
                                                    className="add-class-btn"
                                                    onClick={() => {
                                                        setFormData({ ...emptyEntry, day, time });
                                                        setShowModal(true);
                                                    }}
                                                >
                                                    +
                                                </button>
                                            )}
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Modal */}
            {showModal && (
                <div className="modal-overlay" onClick={closeModal}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>{editingEntry ? 'Edit Class' : 'Add Class'}</h2>
                            <button className="close-btn" onClick={closeModal}>
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit}>
                            <div className="form-group">
                                <label>Subject *</label>
                                <input
                                    type="text"
                                    value={formData.subject}
                                    onChange={e => setFormData({ ...formData, subject: e.target.value })}
                                    required
                                    placeholder="e.g., Mathematics"
                                />
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Day *</label>
                                    <select
                                        value={formData.day}
                                        onChange={e => setFormData({ ...formData, day: e.target.value })}
                                    >
                                        {DAYS.map(day => <option key={day} value={day}>{day}</option>)}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label>Time *</label>
                                    <select
                                        value={formData.time}
                                        onChange={e => setFormData({ ...formData, time: e.target.value })}
                                    >
                                        {TIME_SLOTS.map(time => <option key={time} value={time}>{time}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Room</label>
                                    <input
                                        type="text"
                                        value={formData.room}
                                        onChange={e => setFormData({ ...formData, room: e.target.value })}
                                        placeholder="e.g., Room 101"
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Teacher</label>
                                    <input
                                        type="text"
                                        value={formData.teacher}
                                        onChange={e => setFormData({ ...formData, teacher: e.target.value })}
                                        placeholder="e.g., Dr. Smith"
                                    />
                                </div>
                            </div>
                            <div className="modal-actions">
                                <button type="button" className="btn btn-secondary" onClick={closeModal}>
                                    Cancel
                                </button>
                                <button type="submit" className="btn btn-primary">
                                    <Save size={18} /> {editingEntry ? 'Update' : 'Save'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Timetable;
