/**
 * SCHEDULE (TASKS) ROUTES - CRUD for schedule/task entries (via factory)
 * A1-A2 fix: Uses scheduleRepo instead of DataStore
 */
const {createCrudRouter} = require('./crudRouteFactory');
const {scheduleRepo} = require('../repositories');

module.exports = createCrudRouter({
    repo: scheduleRepo,
    entityName: 'Task',
    validate: (body) => {
        if (!body.task) return 'Task description is required';
        return null;
    }
});
