/**
 * 📝 QUIZ TOOLS - Generate quizzes, get results, save scores
 *
 * A1-A2 fix: Delegates to quizRepo (single source of truth for quizzes.json)
 */
const {generateId, logger} = require('./base');
const {quizRepo} = require('../repositories');

function generateQuizQuestions(topic, difficulty, numQuestions, type) {
    const questions = [];
    const questionTypes = type === 'mixed' ? ['mcq', 'true-false', 'short-answer'] : [type];

    for (let i = 0; i < numQuestions; i++) {
        const qType = questionTypes[i % questionTypes.length];
        questions.push({
            id: generateId(), number: i + 1, type: qType,
            question: `Question ${i + 1} about "${topic}" (${difficulty} difficulty)`,
            options: qType === 'mcq' ? ['Option A', 'Option B', 'Option C', 'Option D'] : null,
            correctAnswer: null,
            explanation: null,
            userAnswer: null,
            isCorrect: null,
            needsLLMGeneration: true
        });
    }
    return questions;
}

async function generateQuiz({topic, difficulty = 'medium', numQuestions = 5, type = 'mixed'}, userId) {
    const quiz = await quizRepo.add(userId, {
        topic, difficulty, type, numQuestions,
        questions: generateQuizQuestions(topic, difficulty, numQuestions, type),
        attempts: [], bestScore: null
    });

    logger.debug(`Quiz generated for ${userId}: ${topic}`);
    return {
        message: `📝 Quiz generated: "${topic}" (${difficulty}, ${numQuestions} questions)`,
        quiz,
        instructions: 'Answer each question. Use saveQuizResult() when done to track your score!'
    };
}

async function getQuizzes({topic = null, limit = 10}, userId) {
    const userQuizzes = topic
        ? await quizRepo.getByTopic(userId, topic)
        : await quizRepo.getRecent(userId, limit);

    return {
        count: userQuizzes.length,
        quizzes: userQuizzes.map(q => ({
            id: q.id, topic: q.topic, difficulty: q.difficulty,
            numQuestions: q.numQuestions, attempts: (q.attempts || []).length,
            bestScore: q.bestScore, createdAt: q.createdAt
        }))
    };
}

async function saveQuizResult({quizId, score, totalQuestions, answers = []}, userId) {
    if (!quizId || score === undefined || !totalQuestions) {
        return {success: false, message: 'Missing required quiz result fields (quizId, score, totalQuestions).'};
    }
    if (score < 0 || score > totalQuestions) {
        return {success: false, message: `Score (${score}) must be between 0 and ${totalQuestions}.`};
    }

    const quiz = await quizRepo.getById(userId, quizId);
    if (!quiz) return {success: false, message: 'Quiz not found'};

    const attempt = {
        id: generateId(), score, totalQuestions,
        percentage: Math.round((score / totalQuestions) * 100),
        answers, attemptedAt: new Date().toISOString()
    };

    quiz.attempts.push(attempt);
    if (!quiz.bestScore || attempt.percentage > quiz.bestScore) quiz.bestScore = attempt.percentage;
    // Update the quiz in-place in the repo's data and trigger save
    await quizRepo.update(userId, quizId, {attempts: quiz.attempts, bestScore: quiz.bestScore});

    const emoji = attempt.percentage >= 80 ? '🌟' : attempt.percentage >= 60 ? '👍' : '💪';
    return {
        success: true,
        message: `${emoji} Quiz completed! Score: ${score}/${totalQuestions} (${attempt.percentage}%)`,
        attempt, bestScore: quiz.bestScore,
        improvement: quiz.attempts.length > 1 ? `Your best score is ${quiz.bestScore}%` : 'First attempt! Keep practicing!'
    };
}

module.exports = {generateQuiz, getQuizzes, saveQuizResult};
