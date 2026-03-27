/**
 * TIMETABLE ROUTES - CRUD for timetable entries (via factory)
 * A1-A2 fix: Uses timetableRepo instead of DataStore
 */
const {createCrudRouter} = require('./crudRouteFactory');
const {timetableRepo} = require('../repositories');

module.exports = createCrudRouter({
    repo: timetableRepo,
    entityName: 'Entry',
    validate: (body) => {
        if (!body.subject || !body.day) return 'Subject and day are required';
        return null;
    }
});
