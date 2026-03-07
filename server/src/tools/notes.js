/**
 * 📝 NOTES TOOLS - Save, get, search, delete notes
 */
const {loadJSON, saveJSON, generateId, dataPath, logger} = require('./base');

const NOTES_FILE = dataPath('notes.json');
let notes = loadJSON(NOTES_FILE, {});

function saveNote({title, content, tags = []}, userId) {
    if (!notes[userId]) notes[userId] = [];

    const note = {
        id: generateId(), title, content,
        tags: Array.isArray(tags) ? tags : [tags],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };

    notes[userId].push(note);
    saveJSON(NOTES_FILE, notes);
    logger.debug(`Note saved for ${userId}: ${title}`);

    return {message: `📝 Note saved: "${title}"`, note};
}

function getNotes({tag = null}, userId) {
    const userNotes = notes[userId] || [];
    const filtered = tag
        ? userNotes.filter(n => n.tags.includes(tag.toLowerCase()))
        : userNotes;
    filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    return {count: filtered.length, notes: filtered};
}

function searchNotes({query}, userId) {
    const userNotes = notes[userId] || [];
    const lowerQuery = query.toLowerCase();
    const matches = userNotes.filter(n =>
        n.title.toLowerCase().includes(lowerQuery) ||
        n.content.toLowerCase().includes(lowerQuery) ||
        n.tags.some(t => t.toLowerCase().includes(lowerQuery))
    );
    return {query, count: matches.length, notes: matches};
}

function deleteNote({noteId}, userId) {
    if (!notes[userId]) return {success: false, message: 'No notes found'};
    const index = notes[userId].findIndex(n => n.id === noteId);
    if (index === -1) return {success: false, message: 'Note not found'};
    const deleted = notes[userId].splice(index, 1)[0];
    saveJSON(NOTES_FILE, notes);
    return {success: true, message: `Deleted note: "${deleted.title}"`};
}

module.exports = {saveNote, getNotes, searchNotes, deleteNote};
