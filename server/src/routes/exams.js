/**
 * EXAMS ROUTES - CRUD for exam entries (via factory)
 * A1-A2 fix: Uses examsRepo instead of DataStore
 */
const {createCrudRouter} = require('./crudRouteFactory');
const {examsRepo} = require('../repositories');

module.exports = createCrudRouter({
    repo: examsRepo,
    entityName: 'Exam',
    validate: (body) => {
        if (!body.subject || !body.date) return 'Subject and date are required';
        if (body.date && isNaN(new Date(body.date).getTime())) return 'Invalid exam date';
        return null;
    }
});
