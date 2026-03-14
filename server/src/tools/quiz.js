/**
 * 📝 QUIZ TOOLS - Generate quizzes, get results, save scores
 */
const {loadJSON, saveJSON, generateId, dataPath, logger} = require('./base');

const QUIZZES_FILE = dataPath('quizzes.json');
let quizzes = loadJSON(QUIZZES_FILE, {});

function generateQuizQuestions(topic, difficulty, numQuestions, type) {
    const questions = [];
    const questionTypes = type === 'mixed' ? ['mcq', 'true-false', 'short-answer'] : [type];

    // E3 fix: Generate actual placeholder questions with clear instructions
    // These are structural templates — the LLM will use the quiz tool result
    // to present real questions to the user based on the topic
    for (let i = 0; i < numQuestions; i++) {
        const qType = questionTypes[i % questionTypes.length];
        questions.push({
            id: generateId(), number: i + 1, type: qType,
            question: `Question ${i + 1} about "${topic}" (${difficulty} difficulty)`,
            options: qType === 'mcq' ? ['Option A', 'Option B', 'Option C', 'Option D'] : null,
            correctAnswer: null, // To be filled by LLM or user
            explanation: null,
            userAnswer: null,
            isCorrect: null,
            needsLLMGeneration: true // Flag indicating this needs LLM to generate real content
        });
    }
    return questions;
}

function generateQuiz({topic, difficulty = 'medium', numQuestions = 5, type = 'mixed'}, userId) {
    if (!quizzes[userId]) quizzes[userId] = [];

    const quiz = {
        id: generateId(), topic, difficulty, type, numQuestions,
        createdAt: new Date().toISOString(),
        questions: generateQuizQuestions(topic, difficulty, numQuestions, type),
        attempts: [], bestScore: null
    };

    quizzes[userId].push(quiz);
    saveJSON(QUIZZES_FILE, quizzes);
    logger.debug(`Quiz generated for ${userId}: ${topic}`);

    return {
        message: `📝 Quiz generated: "${topic}" (${difficulty}, ${numQuestions} questions)`,
        quiz,
        instructions: 'Answer each question. Use saveQuizResult() when done to track your score!'
    };
}

function getQuizzes({topic = null, limit = 10}, userId) {
    const userQuizzes = quizzes[userId] || [];
    let filtered = topic
        ? userQuizzes.filter(q => q.topic.toLowerCase().includes(topic.toLowerCase()))
        : userQuizzes;

    filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    filtered = filtered.slice(0, limit);

    return {
        count: filtered.length,
        quizzes: filtered.map(q => ({
            id: q.id, topic: q.topic, difficulty: q.difficulty,
            numQuestions: q.numQuestions, attempts: q.attempts.length,
            bestScore: q.bestScore, createdAt: q.createdAt
        }))
    };
}

function saveQuizResult({quizId, score, totalQuestions, answers = []}, userId) {
    if (!quizId || score === undefined || !totalQuestions) {
        return {success: false, message: 'Missing required quiz result fields (quizId, score, totalQuestions).'};
    }
    if (score < 0 || score > totalQuestions) {
        return {success: false, message: `Score (${score}) must be between 0 and ${totalQuestions}.`};
    }

    const userQuizzes = quizzes[userId] || [];
    const quiz = userQuizzes.find(q => q.id === quizId);
    if (!quiz) return {success: false, message: 'Quiz not found'};

    const attempt = {
        id: generateId(), score, totalQuestions,
        percentage: Math.round((score / totalQuestions) * 100),
        answers, attemptedAt: new Date().toISOString()
    };

    quiz.attempts.push(attempt);
    if (!quiz.bestScore || attempt.percentage > quiz.bestScore) quiz.bestScore = attempt.percentage;
    saveJSON(QUIZZES_FILE, quizzes);

    const emoji = attempt.percentage >= 80 ? '🌟' : attempt.percentage >= 60 ? '👍' : '💪';
    return {
        success: true,
        message: `${emoji} Quiz completed! Score: ${score}/${totalQuestions} (${attempt.percentage}%)`,
        attempt, bestScore: quiz.bestScore,
        improvement: quiz.attempts.length > 1 ? `Your best score is ${quiz.bestScore}%` : 'First attempt! Keep practicing!'
    };
}

module.exports = {generateQuiz, getQuizzes, saveQuizResult};
