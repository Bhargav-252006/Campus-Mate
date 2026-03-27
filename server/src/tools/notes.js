/**
 * 📝 NOTES TOOLS - Save, get, search, delete notes
 *
 * A1-A2 fix: Delegates to notesRepo (single source of truth for notes.json)
 * instead of maintaining a separate in-memory copy via loadJSON/saveJSON.
 */
const {logger} = require('./base');
const {notesRepo} = require('../repositories');

async function saveNote({title, content, tags = []}, userId) {
    const note = await notesRepo.add(userId, {
        title, content,
        tags: Array.isArray(tags) ? tags : [tags],
        updatedAt: new Date().toISOString()
    });

    logger.debug(`Note saved for ${userId}: ${title}`);
    return {message: `📝 Note saved: "${title}"`, note};
}

async function getNotes({tag = null}, userId) {
    const userNotes = tag
        ? await notesRepo.getByTag(userId, tag)
        : await notesRepo.getByUserId(userId);
    const sorted = [...userNotes].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    return {count: sorted.length, notes: sorted};
}

async function searchNotes({query}, userId) {
    const matches = await notesRepo.search(userId, query);
    return {query, count: matches.length, notes: matches};
}

async function deleteNote({noteId}, userId) {
    const note = await notesRepo.getById(userId, noteId);
    if (!note) return {success: false, message: 'Note not found'};
    await notesRepo.remove(userId, noteId);
    return {success: true, message: `Deleted note: "${note.title}"`};
}

module.exports = {saveNote, getNotes, searchNotes, deleteNote};
