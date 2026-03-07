/**
 * 🗄️ REPOSITORY INDEX - Re-exports all repositories
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
    BaseRepository: require('./BaseRepository').BaseRepository,
};
