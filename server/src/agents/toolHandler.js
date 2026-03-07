/**
 * 🔧 TOOL HANDLER - Direct tool trigger detection & execution
 *
 * Extracted from agentRouter.js. Contains:
 *   - TOOL_KEYWORDS mapping
 *   - detectToolTrigger() - keyword-to-tool matching
 *   - handleToolRequest() - execute tool + format response
 *   - All extract* helpers (subject, mood, date, etc.)
 */

const toolService = require('../services/toolService');
const logger = require('../utils/logger');

// ═══════════════════════════════════════════════════════════════
//                    TOOL KEYWORDS (Direct Tool Triggers)
// ═══════════════════════════════════════════════════════════════

const TOOL_KEYWORDS = {
    // Pomodoro
    startPomodoro: ['start pomodoro', 'start a pomodoro', 'pomodoro', 'focus session', 'start focus', 'study session', 'start studying for'],
    endPomodoro: ['end pomodoro', 'stop pomodoro', 'done studying', 'finished studying', 'end focus', 'stop focus'],
    getPomodoroStats: ['pomodoro stats', 'focus stats', 'how much studied', 'study time', 'focus time'],

    // Mood
    logMood: ['log mood', 'log my mood', 'track mood', 'track my mood', 'record mood', 'my mood is', 'mood check', 'mood log'],
    getMoodHistory: ['mood history', 'how have i been feeling', 'my moods', 'past moods', 'show mood'],
    getMoodTrends: ['mood trends', 'mood patterns', 'mood insights', 'mood analysis'],

    // Deadlines
    addDeadline: ['add deadline', 'new deadline', 'set deadline', 'create deadline', 'assignment due', 'exam on', 'project due', 'submit by', 'due on', 'due by'],
    getDeadlines: ['my deadlines', 'show deadlines', 'list deadlines', 'all deadlines'],
    getUpcomingDeadlines: ["what's due", 'upcoming deadlines', 'show upcoming', 'list upcoming'],

    // Quiz
    generateQuiz: ['quiz me', 'test me', 'create quiz', 'generate quiz', 'practice questions', 'give me a quiz'],

    // Search
    webSearch: ['search for', 'look up', 'find information', 'search the web', 'google'],
    youtubeSearch: ['youtube', 'find videos', 'video tutorial', 'watch videos', 'educational video'],

    // Reminders
    setReminder: ['remind me', 'set reminder', 'set a reminder', 'reminder to', 'remember to'],
    getReminders: ['my reminders', 'show reminders', 'list reminders'],

    // Notes
    saveNote: ['save note', 'note this', 'remember this', 'save this'],
    getNotes: ['my notes', 'show notes', 'list notes'],

    // Study Plans
    createStudyPlan: ['create study plan', 'study schedule', 'study plan for', 'help me plan'],
    getTodaysTasks: ["what's today", 'today tasks', "what should i do today", 'today schedule']
};

// Self-reference patterns to avoid false Wikipedia triggers
const SELF_REFERENCE_PATTERNS = [
    /\b(your|you|my)\s+(memory|memories|data|knowledge|mind|brain)/i,
    /\b(remember|recall|know about me|stored|saved)\b/i,
    /\babout me\b/i,
    /\bdo you (remember|know|have)\b/i,
    /\bin (your|the) (memory|system)\b/i
];

// ═══════════════════════════════════════════════════════════════
//                    DETECTION
// ═══════════════════════════════════════════════════════════════

/**
 * Detect if message triggers a tool directly via keyword match.
 * Returns {tool, keyword, message} or null.
 */
function detectToolTrigger(message) {
    const lowerMsg = message.toLowerCase();

    try {
        for (const [toolName, keywords] of Object.entries(TOOL_KEYWORDS)) {
            for (const keyword of keywords) {
                if (lowerMsg.includes(keyword)) {
                    // Wikipedia guard
                    if (toolName === 'wikipediaSummary') {
                        if (SELF_REFERENCE_PATTERNS.some(p => p.test(message))) {
                            logger.debug('Skipping wikipediaSummary - self-reference');
                            continue;
                        }
                        const afterKeyword = lowerMsg.replace(/^.*?(what is|who is|define|tell me about)\s*/i, '').trim();
                        if (afterKeyword.length < 3 || /^(it|this|that|there|here)$/i.test(afterKeyword)) {
                            logger.debug(`Skipping wikipediaSummary - topic "${afterKeyword}" too short`);
                            continue;
                        }
                    }

                    logger.debug(`Tool trigger detected: ${toolName} (keyword: "${keyword}")`);
                    return {tool: toolName, keyword, message};
                }
            }
        }
    } catch (error) {
        logger.error('Error in detectToolTrigger', error);
    }

    return null;
}

// ═══════════════════════════════════════════════════════════════
//                    EXECUTION
// ═══════════════════════════════════════════════════════════════

/**
 * Handle a direct tool request — execute and format a user-facing response.
 * Returns {agent, text, tool, toolResult} or null if unhandled.
 */
async function handleToolRequest(toolTrigger, message, userId, profile) {
    const {tool} = toolTrigger;
    const lowerMsg = message.toLowerCase();

    try {
        let result;
        let responseText;

        switch (tool) {
            // ═══════════ POMODORO ═══════════
            case 'startPomodoro': {
                const subject = extractSubject(message) || 'study session';
                const duration = extractNumber(message, 'minutes') || 25;
                result = await toolService.executeTool({name: 'startPomodoro', args: {subject, duration, breakTime: 5}, userId});
                if (result.success) {
                    const r = result.result;
                    responseText = `🍅 **Pomodoro Started!**\n\nFocus on **${subject}** for **${duration} minutes**.\n\n**Tips:**\n${r.tips.map(t => `- ${t}`).join('\n')}\n\nI'll be here when you're done! Say "end pomodoro" when finished. 💪`;
                }
                break;
            }
            case 'endPomodoro': {
                result = await toolService.executeTool({name: 'endPomodoro', args: {completed: true, notes: ''}, userId});
                if (result.success) {
                    const r = result.result;
                    responseText = `${r.message}\n\n🔥 **Current Streak:** ${r.streak} sessions\n⏱️ **Total Focus Time:** ${r.totalFocusTime} minutes\n\n${r.suggestion}`;
                } else {
                    responseText = "You don't have an active pomodoro session! Say \"start pomodoro for [subject]\" to begin one. 🍅";
                }
                break;
            }
            case 'getPomodoroStats': {
                const period = lowerMsg.includes('today') ? 'today' : lowerMsg.includes('month') ? 'month' : 'week';
                result = await toolService.executeTool({name: 'getPomodoroStats', args: {period}, userId});
                if (result.success) {
                    const r = result.result;
                    responseText = `📊 **Pomodoro Stats (${r.period})**\n\n🍅 Sessions: **${r.totalSessions}**\n⏱️ Focus Time: **${r.totalFocusHours} hours**\n🔥 Current Streak: **${r.currentStreak}**\n📈 Avg Session: **${r.averageSessionLength} min**`;
                    if (Object.keys(r.bySubject).length > 0) {
                        responseText += `\n\n**Time by Subject:**\n${Object.entries(r.bySubject).map(([s, m]) => `- ${s}: ${m} min`).join('\n')}`;
                    }
                }
                break;
            }

            // ═══════════ MOOD ═══════════
            case 'logMood': {
                const mood = extractMood(message);
                const energy = extractNumber(message, 'energy') || 5;
                result = await toolService.executeTool({name: 'logMood', args: {mood, energy, notes: message, triggers: []}, userId});
                if (result.success) {
                    const r = result.result;
                    responseText = `${r.message}\n\n💡 **Suggestion:** ${r.suggestion}\n\n💙 ${r.affirmation}`;
                }
                break;
            }
            case 'getMoodHistory': {
                result = await toolService.executeTool({name: 'getMoodHistory', args: {days: 7}, userId});
                if (result.success) {
                    const r = result.result;
                    if (r.count === 0) {
                        responseText = "You haven't logged any moods yet! Tell me how you're feeling and I'll track it for you. 🧠";
                    } else {
                        responseText = `📊 **Mood History (${r.period})**\n\n${r.entries.slice(0, 5).map(e =>
                            `- ${new Date(e.timestamp).toLocaleDateString()}: ${e.mood} (Energy: ${e.energy}/10)`
                        ).join('\n')}`;
                    }
                }
                break;
            }
            case 'getMoodTrends': {
                result = await toolService.executeTool({name: 'getMoodTrends', args: {days: 30}, userId});
                if (result.success) {
                    const r = result.result;
                    if (r.entriesNeeded) {
                        responseText = `I need a few more mood entries to show you trends. Log ${r.entriesNeeded} more moods! 📊`;
                    } else {
                        responseText = `🧠 **Mood Insights (Last 30 Days)**\n\n📝 Total Entries: ${r.totalEntries}\n${r.mostCommonMood ? `😊 Most Common: ${r.mostCommonMood.mood}` : ''}\n\n**💡 Insights:**\n${r.insights.map(i => `- ${i}`).join('\n')}\n\n${r.recommendation}`;
                    }
                }
                break;
            }

            // ═══════════ DEADLINES ═══════════
            case 'addDeadline': {
                const title = extractTaskTitle(message);
                const dueDate = extractDate(message);
                const subject = extractSubject(message) || 'General';
                if (!dueDate) {
                    responseText = "I need a due date! Try: \"My essay is due on January 15th\" 📅";
                    break;
                }
                result = await toolService.executeTool({name: 'addDeadline', args: {title, dueDate, subject, priority: 'medium', type: 'assignment'}, userId});
                if (result.success) {
                    const r = result.result;
                    responseText = `${r.message}\n\n💡 ${r.tip}`;
                }
                break;
            }
            case 'getDeadlines':
            case 'getUpcomingDeadlines': {
                result = await toolService.executeTool({name: 'getUpcomingDeadlines', args: {days: 7}, userId});
                if (result.success) {
                    const r = result.result;
                    if (r.total === 0) {
                        responseText = "You have no upcoming deadlines! 🎉 That's either great planning or time to add some!";
                    } else {
                        responseText = `📅 **Upcoming Deadlines**\n\n${r.message}\n\n`;
                        if (r.overdue.count > 0) {
                            responseText += `🚨 **OVERDUE:**\n${r.overdue.items.map(d => `- ${d.title} (${d.subject})`).join('\n')}\n\n`;
                        }
                        if (r.urgent.count > 0) {
                            responseText += `⚠️ **DUE IN 2 DAYS:**\n${r.urgent.items.map(d => `- ${d.title} - ${new Date(d.dueDate).toLocaleDateString()}`).join('\n')}\n\n`;
                        }
                        if (r.thisWeek.count > 0) {
                            responseText += `📌 **THIS WEEK:**\n${r.thisWeek.items.map(d => `- ${d.title} - ${new Date(d.dueDate).toLocaleDateString()}`).join('\n')}`;
                        }
                    }
                }
                break;
            }

            // ═══════════ QUIZ ═══════════
            case 'generateQuiz': {
                const topic = extractSubject(message) || extractAfterKeyword(message, ['on', 'about', 'for']);
                const numQuestions = extractNumber(message, 'questions') || 5;
                const difficulty = lowerMsg.includes('hard') ? 'hard' : lowerMsg.includes('easy') ? 'easy' : 'medium';
                if (!topic) {
                    responseText = "What topic should I quiz you on? Try: \"Quiz me on photosynthesis\" 📝";
                    break;
                }
                result = await toolService.executeTool({name: 'generateQuiz', args: {topic, difficulty, numQuestions, type: 'mixed'}, userId});
                if (result.success) {
                    responseText = `📝 **Quiz: ${topic}** (${difficulty}, ${numQuestions} questions)\n\nI've created a quiz for you! Here's what we'll cover:\n\n🎯 Topic: **${topic}**\n📊 Difficulty: **${difficulty}**\n❓ Questions: **${numQuestions}**\n\nLet me ask you the questions one by one. Ready?\n\n**Question 1:** What is the main concept of ${topic}? 🤔`;
                }
                break;
            }

            // ═══════════ SEARCH ═══════════
            case 'webSearch': {
                const query = extractAfterKeyword(message, ['search for', 'look up', 'find', 'search']);
                if (!query) {responseText = "What would you like me to search for? 🔍"; break;}
                result = await toolService.executeTool({name: 'webSearch', args: {query, maxResults: 5}, userId});
                if (result.success && result.result.results?.length > 0) {
                    const r = result.result;
                    responseText = `🔍 **Search Results: "${query}"**\n\n`;
                    r.results.slice(0, 3).forEach((res, i) => {
                        responseText += `**${i + 1}. ${res.title}**\n${res.snippet}\n${res.url ? `🔗 ${res.url}\n` : ''}\n`;
                    });
                } else {
                    responseText = `I couldn't find instant results for "${query}". Try searching directly: https://duckduckgo.com/?q=${encodeURIComponent(query)}`;
                }
                break;
            }
            case 'wikipediaSummary': {
                let topic = message.replace(/^(what is|who is|tell me about|define|wikipedia:?)\s*/i, '').trim();
                topic = topic.replace(/[?.!]$/, '');
                if (!topic) {responseText = "What topic would you like to learn about? 📚"; break;}
                result = await toolService.executeTool({name: 'wikipediaSummary', args: {topic, sentences: 4}, userId});
                if (result.success && result.result.summary) {
                    const r = result.result;
                    responseText = `📚 **${r.title}**\n\n${r.summary}\n\n🔗 [Read more on Wikipedia](${r.url})`;
                } else if (result.result?.type === 'search') {
                    const r = result.result;
                    responseText = `📚 I found some related Wikipedia articles for "${topic}":\n\n${r.results.slice(0, 3).map((res, i) => `${i + 1}. **${res.title}**\n   ${res.snippet.substring(0, 100)}...`).join('\n\n')}`;
                } else {
                    responseText = `I couldn't find a Wikipedia article for "${topic}". Try a different search term! 📚`;
                }
                break;
            }
            case 'youtubeSearch': {
                const query = extractAfterKeyword(message, ['youtube', 'videos about', 'video tutorial', 'find videos', 'watch']);
                if (!query) {responseText = "What topic would you like video tutorials on? 🎥"; break;}
                result = await toolService.executeTool({name: 'youtubeSearch', args: {query, type: 'educational'}, userId});
                if (result.success) {
                    const r = result.result;
                    responseText = `🎥 **YouTube: "${query}"**\n\n🔗 [Search on YouTube](${r.directSearch.url})\n\n**📺 Recommended Channels:**\n${r.recommendedChannels.map(ch => `- [${ch.name}](${ch.url}) - ${ch.topic}`).join('\n')}\n\n**💡 Search Tips:**\n${r.searchTips.slice(0, 2).map(t => `- ${t}`).join('\n')}`;
                }
                break;
            }

            // ═══════════ REMINDERS ═══════════
            case 'setReminder': {
                const title = extractTaskTitle(message);
                const datetime = extractDateTime(message);
                if (!datetime) {responseText = "When should I remind you? Try: \"Remind me to submit homework at 5pm\" ⏰"; break;}
                result = await toolService.executeTool({name: 'setReminder', args: {title, datetime, description: ''}, userId});
                if (result.success) {responseText = result.result.message;}
                break;
            }
            case 'getReminders': {
                result = await toolService.executeTool({name: 'getReminders', args: {includeCompleted: false}, userId});
                if (result.success) {
                    const r = result.result;
                    if (r.count === 0) {responseText = "You have no pending reminders! 🎉";}
                    else {
                        responseText = `⏰ **Your Reminders (${r.count})**\n\n${r.reminders.map(rem =>
                            `- **${rem.title}** - ${new Date(rem.datetime).toLocaleString()}`
                        ).join('\n')}`;
                    }
                }
                break;
            }

            // ═══════════ NOTES ═══════════
            case 'saveNote': {
                const content = extractAfterKeyword(message, ['save note', 'note this', 'remember this', 'note:']);
                if (!content) {responseText = "What would you like me to save? Try: \"Save note: [your note here]\" 📝"; break;}
                result = await toolService.executeTool({name: 'saveNote', args: {
                    title: content.substring(0, 50) + (content.length > 50 ? '...' : ''),
                    content, tags: []
                }, userId});
                if (result.success) {responseText = result.result.message + " I'll remember this for you! 🧠";}
                break;
            }
            case 'getNotes': {
                result = await toolService.executeTool({name: 'getNotes', args: {}, userId});
                if (result.success) {
                    const r = result.result;
                    if (r.count === 0) {responseText = "You don't have any saved notes yet! Say \"save note: [your note]\" to save one. 📝";}
                    else {
                        responseText = `📝 **Your Notes (${r.count})**\n\n${r.notes.slice(0, 5).map(n =>
                            `- **${n.title}**\n  ${n.content.substring(0, 100)}${n.content.length > 100 ? '...' : ''}`
                        ).join('\n\n')}`;
                    }
                }
                break;
            }

            // ═══════════ STUDY PLANS ═══════════
            case 'createStudyPlan': {
                const subject = extractSubject(message) || 'General';
                result = await toolService.executeTool({name: 'createStudyPlan', args: {subject, duration: '1 hour', frequency: 'daily', startDate: new Date().toISOString(), goals: []}, userId});
                if (result.success) {
                    responseText = `📚 ${result.result.message}\n\nI've scheduled daily study sessions for **${subject}**. Check your tasks with "what should I do today?" 💪`;
                }
                break;
            }
            case 'getTodaysTasks': {
                result = await toolService.executeTool({name: 'getTodaysTasks', args: {}, userId});
                if (result.success) {
                    const r = result.result;
                    if (r.totalTasks === 0) {
                        responseText = "You have no scheduled tasks for today! 🎉 Enjoy or create a study plan!";
                    } else {
                        responseText = `📋 **Today's Tasks (${r.date})**\n\n`;
                        if (r.studyTasks.length > 0) {
                            responseText += `📚 **Study Sessions:**\n${r.studyTasks.map(t => `- ${t.subject} (${t.duration})`).join('\n')}\n\n`;
                        }
                        if (r.reminders.length > 0) {
                            responseText += `⏰ **Reminders:**\n${r.reminders.map(r => `- ${r.title} at ${new Date(r.datetime).toLocaleTimeString()}`).join('\n')}`;
                        }
                    }
                }
                break;
            }

            default:
                return null;
        }

        if (responseText) {
            return {agent: 'Campus Mate', text: responseText, tool, toolResult: result};
        }
    } catch (error) {
        logger.error(`Tool execution error: ${tool}`, error);
    }

    return null;
}

// ═══════════════════════════════════════════════════════════════
//                    EXTRACTION HELPERS
// ═══════════════════════════════════════════════════════════════

function extractSubject(message) {
    const patterns = [
        /(?:for|on|about|studying|study)\s+(.+?)(?:\s+for|\s+at|\s+on|$)/i,
        /pomodoro\s+(?:for\s+)?(.+?)(?:\s+for|\s*$)/i,
        /quiz\s+(?:me\s+)?(?:on\s+)?(.+?)(?:\s+with|\s*$)/i
    ];
    for (const pattern of patterns) {
        const match = message.match(pattern);
        if (match && match[1]) return match[1].trim().replace(/[?.!]$/, '');
    }
    const subjects = ['math', 'physics', 'chemistry', 'biology', 'history', 'english',
        'programming', 'calculus', 'algebra', 'science', 'geography'];
    const lowerMsg = message.toLowerCase();
    for (const subject of subjects) {
        if (lowerMsg.includes(subject)) return subject.charAt(0).toUpperCase() + subject.slice(1);
    }
    return null;
}

function extractNumber(message, context = '') {
    const patterns = [
        new RegExp(`(\\d+)\\s*(?:${context}|min|minutes|hour|hours)`, 'i'),
        /(\d+)\s*(?:min|minutes|hour|hours)/i,
        /for\s+(\d+)/i
    ];
    for (const pattern of patterns) {
        const match = message.match(pattern);
        if (match) return parseInt(match[1]);
    }
    return null;
}

function extractMood(message) {
    const moods = {
        'stressed': ['stressed', 'stress', 'overwhelmed'],
        'anxious': ['anxious', 'anxiety', 'worried', 'nervous'],
        'happy': ['happy', 'good', 'great', 'amazing', 'wonderful', 'excited'],
        'sad': ['sad', 'down', 'depressed', 'unhappy', 'low'],
        'tired': ['tired', 'exhausted', 'sleepy', 'drained', 'fatigued'],
        'calm': ['calm', 'peaceful', 'relaxed', 'chill'],
        'frustrated': ['frustrated', 'annoyed', 'irritated', 'angry'],
        'motivated': ['motivated', 'pumped', 'energized', 'ready']
    };
    const lowerMsg = message.toLowerCase();
    for (const [mood, keywords] of Object.entries(moods)) {
        for (const keyword of keywords) {
            if (lowerMsg.includes(keyword)) return mood;
        }
    }
    return 'neutral';
}

function extractTaskTitle(message) {
    let title = message
        .replace(/^(remind me to|set reminder|reminder to|remember to|my|the)\s*/i, '')
        .replace(/\s*(at|on|by|due|tomorrow|today|tonight).*$/i, '')
        .trim();
    return title || 'Task';
}

function extractDate(message) {
    const lowerMsg = message.toLowerCase();
    const today = new Date();

    if (lowerMsg.includes('tomorrow')) {
        const date = new Date(today);
        date.setDate(date.getDate() + 1);
        return date.toISOString();
    }
    if (lowerMsg.includes('next week')) {
        const date = new Date(today);
        date.setDate(date.getDate() + 7);
        return date.toISOString();
    }

    const datePatterns = [
        /(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?/,
        /(\w+)\s+(\d{1,2})(?:st|nd|rd|th)?(?:,?\s*(\d{4}))?/i,
        /(\d{1,2})(?:st|nd|rd|th)?\s+(?:of\s+)?(\w+)(?:,?\s*(\d{4}))?/i
    ];
    for (const pattern of datePatterns) {
        const match = message.match(pattern);
        if (match) {
            const parsed = new Date(match[0]);
            if (!isNaN(parsed.getTime())) return parsed.toISOString();
        }
    }

    const months = ['january', 'february', 'march', 'april', 'may', 'june',
        'july', 'august', 'september', 'october', 'november', 'december'];
    for (const month of months) {
        if (lowerMsg.includes(month)) {
            const regex = new RegExp(`${month}\\s+(\\d{1,2})`, 'i');
            const match = message.match(regex);
            if (match) {
                const monthIndex = months.indexOf(month);
                const day = parseInt(match[1]);
                const year = today.getFullYear();
                const date = new Date(year, monthIndex, day);
                if (date < today) date.setFullYear(year + 1);
                return date.toISOString();
            }
        }
    }
    return null;
}

function extractDateTime(message) {
    const date = extractDate(message) || new Date().toISOString();
    const timePatterns = [
        /(\d{1,2}):(\d{2})\s*(am|pm)?/i,
        /(\d{1,2})\s*(am|pm)/i,
        /at\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i
    ];
    for (const pattern of timePatterns) {
        const match = message.match(pattern);
        if (match) {
            let hours = parseInt(match[1]);
            const minutes = match[2] ? parseInt(match[2]) : 0;
            const period = match[3]?.toLowerCase();
            if (period === 'pm' && hours < 12) hours += 12;
            if (period === 'am' && hours === 12) hours = 0;
            const dateObj = new Date(date);
            dateObj.setHours(hours, minutes, 0, 0);
            return dateObj.toISOString();
        }
    }
    return date;
}

function extractAfterKeyword(message, keywords) {
    const lowerMsg = message.toLowerCase();
    for (const keyword of keywords) {
        const index = lowerMsg.indexOf(keyword);
        if (index !== -1) return message.substring(index + keyword.length).trim().replace(/[?.!]$/, '');
    }
    return message.trim().replace(/[?.!]$/, '');
}

module.exports = {
    TOOL_KEYWORDS,
    detectToolTrigger,
    handleToolRequest,
    extractSubject,
    extractNumber,
    extractMood,
    extractTaskTitle,
    extractDate,
    extractDateTime,
    extractAfterKeyword
};
