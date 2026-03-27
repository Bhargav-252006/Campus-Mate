/**
 * 🗄️ REPOSITORY INDEX - Re-exports all repositories
 *
 * A1-A2 fix: Added timetableRepo, examsRepo, scheduleRepo
 * to replace DataStore instances.
 */
module.exports = {
    notesRepo: require('./notesRepository'),
    moodRepo: require('./moodRepository'),
    deadlineRepo: require('./deadlineRepository'),
    pomodoroRepo: require('./pomodoroRepository'),
    reminderRepo: require('./reminderRepository'),
    quizRepo: require('./quizRepository'),
    studyPlanRepo: require('./studyPlanRepository'),
    statsRepo: require('./statsRepository'),
    timetableRepo: require('./timetableRepository'),
    examsRepo: require('./examsRepository'),
    scheduleRepo: require('./scheduleRepository'),
    BaseRepository: require('./BaseRepository').BaseRepository,
};
