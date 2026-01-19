import React, {useState, useEffect} from 'react';
import {FileText, Search, PlusCircle, Trash2, Edit2, Save, X, Tag, Clock, BookOpen} from 'lucide-react';
import ReactMarkdown from 'react-markdown';

const Notes = () => {
    const [notes, setNotes] = useState([]);
    const [activeNote, setActiveNote] = useState(null);
    const [isEditing, setIsEditing] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterSubject, setFilterSubject] = useState('all');
    const [editContent, setEditContent] = useState({title: '', content: '', subject: '', tags: []});

    // Load notes from localStorage
    useEffect(() => {
        const saved = localStorage.getItem('notes');
        if (saved) {
            setNotes(JSON.parse(saved));
        }
    }, []);

    // Save notes
    const saveNotes = (newNotes) => {
        setNotes(newNotes);
        localStorage.setItem('notes', JSON.stringify(newNotes));
    };

    const createNewNote = () => {
        const newNote = {
            id: Date.now(),
            title: 'Untitled Note',
            content: '',
            subject: '',
            tags: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        saveNotes([newNote, ...notes]);
        setActiveNote(newNote);
        setEditContent({title: newNote.title, content: '', subject: '', tags: []});
        setIsEditing(true);
    };

    const saveActiveNote = () => {
        if (!activeNote) return;

        const updatedNote = {
            ...activeNote,
            ...editContent,
            updatedAt: new Date().toISOString()
        };

        const updatedNotes = notes.map(n => n.id === activeNote.id ? updatedNote : n);
        saveNotes(updatedNotes);
        setActiveNote(updatedNote);
        setIsEditing(false);
    };

    const deleteNote = (id) => {
        if (window.confirm('Delete this note?')) {
            saveNotes(notes.filter(n => n.id !== id));
            if (activeNote?.id === id) {
                setActiveNote(null);
            }
        }
    };

    const getSubjects = () => {
        const subjects = new Set(notes.map(n => n.subject).filter(Boolean));
        return ['all', ...subjects];
    };

    const filteredNotes = notes.filter(note => {
        const matchesSearch = note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            note.content.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesSubject = filterSubject === 'all' || note.subject === filterSubject;
        return matchesSearch && matchesSubject;
    });

    const formatDate = (date) => {
        const d = new Date(date);
        return d.toLocaleDateString('en-US', {month: 'short', day: 'numeric', year: 'numeric'});
    };

    const getPreview = (content) => {
        return content.substring(0, 100) + (content.length > 100 ? '...' : '');
    };

    return (
        <div className="notes-page">
            <div className="notes-sidebar">
                <div className="notes-header">
                    <h2><FileText size={20} /> Notes</h2>
                    <button className="btn-icon-primary" onClick={createNewNote}>
                        <PlusCircle size={20} />
                    </button>
                </div>

                <div className="notes-search">
                    <Search size={16} />
                    <input
                        type="text"
                        placeholder="Search notes..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>

                <div className="notes-filter">
                    <select
                        value={filterSubject}
                        onChange={(e) => setFilterSubject(e.target.value)}
                    >
                        {getSubjects().map(s => (
                            <option key={s} value={s}>
                                {s === 'all' ? '📚 All Subjects' : `📖 ${s}`}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="notes-list">
                    {filteredNotes.length === 0 ? (
                        <div className="empty-notes">
                            <FileText size={32} />
                            <p>No notes yet</p>
                        </div>
                    ) : (
                        filteredNotes.map(note => (
                            <div
                                key={note.id}
                                className={`note-item ${activeNote?.id === note.id ? 'active' : ''}`}
                                onClick={() => {
                                    setActiveNote(note);
                                    setEditContent({
                                        title: note.title,
                                        content: note.content,
                                        subject: note.subject,
                                        tags: note.tags
                                    });
                                    setIsEditing(false);
                                }}
                            >
                                <h4>{note.title}</h4>
                                <p className="note-preview">{getPreview(note.content) || 'Empty note'}</p>
                                <div className="note-meta">
                                    <span><Clock size={12} /> {formatDate(note.updatedAt)}</span>
                                    {note.subject && <span className="note-subject">{note.subject}</span>}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            <div className="notes-editor">
                {!activeNote ? (
                    <div className="no-note-selected">
                        <BookOpen size={64} />
                        <h3>Select a note or create a new one</h3>
                        <button className="btn btn-primary" onClick={createNewNote}>
                            <PlusCircle size={18} /> New Note
                        </button>
                    </div>
                ) : (
                    <>
                        <div className="editor-toolbar">
                            {isEditing ? (
                                <>
                                    <input
                                        type="text"
                                        className="title-input"
                                        placeholder="Note title"
                                        value={editContent.title}
                                        onChange={(e) => setEditContent({...editContent, title: e.target.value})}
                                    />
                                    <div className="toolbar-actions">
                                        <button className="btn btn-success" onClick={saveActiveNote}>
                                            <Save size={16} /> Save
                                        </button>
                                        <button className="btn btn-secondary" onClick={() => setIsEditing(false)}>
                                            <X size={16} /> Cancel
                                        </button>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <h1 className="note-title">{activeNote.title}</h1>
                                    <div className="toolbar-actions">
                                        <button className="btn btn-secondary" onClick={() => setIsEditing(true)}>
                                            <Edit2 size={16} /> Edit
                                        </button>
                                        <button className="btn btn-danger" onClick={() => deleteNote(activeNote.id)}>
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>

                        {isEditing && (
                            <div className="editor-meta">
                                <input
                                    type="text"
                                    placeholder="Subject (e.g., Math, Physics)"
                                    value={editContent.subject}
                                    onChange={(e) => setEditContent({...editContent, subject: e.target.value})}
                                />
                            </div>
                        )}

                        <div className="editor-content">
                            {isEditing ? (
                                <textarea
                                    className="note-textarea"
                                    placeholder="Start writing... (Markdown supported)"
                                    value={editContent.content}
                                    onChange={(e) => setEditContent({...editContent, content: e.target.value})}
                                />
                            ) : (
                                <div className="note-display">
                                    {activeNote.subject && (
                                        <div className="note-subject-display">
                                            <Tag size={14} /> {activeNote.subject}
                                        </div>
                                    )}
                                    <div className="markdown-content">
                                        {activeNote.content ? (
                                            <ReactMarkdown>{activeNote.content}</ReactMarkdown>
                                        ) : (
                                            <p className="empty-content">This note is empty. Click Edit to add content.</p>
                                        )}
                                    </div>
                                    <div className="note-timestamps">
                                        <span>Created: {formatDate(activeNote.createdAt)}</span>
                                        <span>Updated: {formatDate(activeNote.updatedAt)}</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default Notes;
