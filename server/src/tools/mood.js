/**
 * 🧠 MOOD TOOLS - Log mood, history, trends, recommendations
 */
const {loadJSON, saveJSON, generateId, dataPath, logger} = require('./base');

const MOODS_FILE = dataPath('moods.json');
let moods = loadJSON(MOODS_FILE, {});

function getTimeOfDay() {
    const hour = new Date().getHours();
    if (hour < 6) return 'night';
    if (hour < 12) return 'morning';
    if (hour < 17) return 'afternoon';
    if (hour < 21) return 'evening';
    return 'night';
}

function getMoodResponse(mood, energy) {
    const lowerMood = typeof mood === 'string' ? mood.toLowerCase() : '';
    const responses = {
        stressed: {emoji: '😰', suggestion: 'Try a 5-minute breathing exercise or take a short walk.', affirmation: 'You\'re handling more than you realize. Take it one step at a time.'},
        anxious: {emoji: '😟', suggestion: 'Ground yourself: name 5 things you can see, 4 you can hear, 3 you can touch.', affirmation: 'This feeling will pass. You\'ve overcome challenges before.'},
        happy: {emoji: '😊', suggestion: 'Great time to tackle something challenging while motivation is high!', affirmation: 'You deserve to feel good! Celebrate this moment.'},
        tired: {emoji: '😴', suggestion: 'Consider a power nap (15-20 min) or light stretching.', affirmation: 'Rest is productive. Your brain consolidates learning while you rest.'},
        calm: {emoji: '😌', suggestion: 'Perfect state for deep focus work. Make the most of it!', affirmation: 'Inner peace is a superpower. Well done!'},
        frustrated: {emoji: '😤', suggestion: 'Step away for 10 minutes. Fresh perspective often helps.', affirmation: 'Frustration means you care. Channel it into determination.'},
        motivated: {emoji: '🔥', suggestion: 'Strike while the iron is hot! Start your most important task NOW.', affirmation: 'This energy is precious. You\'re going to do great things!'}
    };
    const defaultResponse = {
        emoji: energy >= 7 ? '⚡' : energy >= 4 ? '😐' : '🔋',
        suggestion: energy < 4 ? 'Low energy detected. Consider a break or some fresh air.' : 'Keep going, you\'re doing well!',
        affirmation: 'Every mood is valid. Thanks for checking in with yourself.'
    };
    return responses[lowerMood] || defaultResponse;
}

function logMood({mood, energy = 5, notes = '', triggers = []}, userId) {
    if (!moods[userId]) moods[userId] = [];

    const moodEntry = {
        id: generateId(), mood, energy, notes, triggers,
        timestamp: new Date().toISOString(),
        dayOfWeek: new Date().toLocaleDateString('en-US', {weekday: 'long'}),
        timeOfDay: getTimeOfDay()
    };

    moods[userId].push(moodEntry);
    saveJSON(MOODS_FILE, moods);
    logger.debug(`Mood logged for ${userId}: ${mood}`);

    const response = getMoodResponse(mood, energy);
    return {
        message: `${response.emoji} Mood logged: ${mood} (Energy: ${energy}/10)`,
        entry: moodEntry, suggestion: response.suggestion, affirmation: response.affirmation
    };
}

function getMoodHistory({days = 7, limit = 50}, userId) {
    const userMoods = moods[userId] || [];
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const recent = userMoods
        .filter(m => new Date(m.timestamp) >= cutoffDate)
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
        .slice(0, limit);

    return {period: `Last ${days} days`, count: recent.length, entries: recent};
}

function getMoodRecommendation(moodCounts, avgEnergyByTime) {
    const totalEntries = Object.values(moodCounts).reduce((a, b) => a + b, 0);
    const stressedCount = (moodCounts['stressed'] || 0) + (moodCounts['anxious'] || 0);

    if (stressedCount / totalEntries > 0.4) {
        return '🚨 You\'ve been stressed often lately. Consider building in more breaks and self-care time.';
    }
    const bestTime = Object.entries(avgEnergyByTime).sort((a, b) => b[1] - a[1])[0];
    if (bestTime) {
        return `💡 Schedule your most challenging tasks in the ${bestTime[0]} when your energy peaks!`;
    }
    return '✨ Keep tracking your mood to discover more patterns!';
}

function getMoodTrends({days = 30}, userId) {
    const userMoods = moods[userId] || [];
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const recent = userMoods.filter(m => new Date(m.timestamp) >= cutoffDate);
    if (recent.length < 3) {
        return {message: 'Not enough data for trends. Keep logging your mood!', entriesNeeded: 3 - recent.length};
    }

    const moodCounts = {};
    const energyByDay = {};
    const timeOfDayMoods = {morning: [], afternoon: [], evening: [], night: []};

    recent.forEach(entry => {
        moodCounts[entry.mood] = (moodCounts[entry.mood] || 0) + 1;
        energyByDay[entry.dayOfWeek] = energyByDay[entry.dayOfWeek] || [];
        energyByDay[entry.dayOfWeek].push(entry.energy);
        if (entry.timeOfDay && timeOfDayMoods[entry.timeOfDay]) {
            timeOfDayMoods[entry.timeOfDay].push(entry.energy);
        }
    });

    const avgEnergyByDay = {};
    Object.keys(energyByDay).forEach(day => {
        const energies = energyByDay[day];
        avgEnergyByDay[day] = (energies.reduce((a, b) => a + b, 0) / energies.length).toFixed(1);
    });

    const avgEnergyByTime = {};
    Object.keys(timeOfDayMoods).forEach(time => {
        const energies = timeOfDayMoods[time];
        if (energies.length > 0) {
            avgEnergyByTime[time] = (energies.reduce((a, b) => a + b, 0) / energies.length).toFixed(1);
        }
    });

    const mostCommonMood = Object.entries(moodCounts).sort((a, b) => b[1] - a[1])[0];
    const insights = [];
    const bestTime = Object.entries(avgEnergyByTime).sort((a, b) => b[1] - a[1])[0];
    if (bestTime) insights.push(`Your energy is highest in the ${bestTime[0]} (avg: ${bestTime[1]}/10)`);
    const bestDay = Object.entries(avgEnergyByDay).sort((a, b) => b[1] - a[1])[0];
    if (bestDay) insights.push(`${bestDay[0]}s tend to be your best days (avg energy: ${bestDay[1]}/10)`);

    return {
        period: `Last ${days} days`, totalEntries: recent.length,
        mostCommonMood: mostCommonMood ? {mood: mostCommonMood[0], count: mostCommonMood[1]} : null,
        moodDistribution: moodCounts, averageEnergyByDay: avgEnergyByDay,
        averageEnergyByTime: avgEnergyByTime, insights,
        recommendation: getMoodRecommendation(moodCounts, avgEnergyByTime)
    };
}

module.exports = {logMood, getMoodHistory, getMoodTrends};
