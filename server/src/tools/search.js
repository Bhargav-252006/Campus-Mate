/**
 * 🔍 SEARCH TOOLS - Web search, Wikipedia, YouTube
 */
const {logger} = require('./base');

async function webSearch({query, maxResults = 5}, userId) {
    logger.debug(`Web search for ${userId}: ${query}`);
    try {
        const encodedQuery = encodeURIComponent(query);
        const url = `https://api.duckduckgo.com/?q=${encodedQuery}&format=json&no_html=1&skip_disambig=1`;

        const response = await fetch(url);
        const data = await response.json();
        const results = [];

        if (data.Abstract) {
            results.push({type: 'answer', title: data.Heading || query, snippet: data.Abstract, source: data.AbstractSource, url: data.AbstractURL});
        }
        if (data.RelatedTopics && data.RelatedTopics.length > 0) {
            data.RelatedTopics.slice(0, maxResults - results.length).forEach(topic => {
                if (topic.Text) results.push({type: 'related', title: topic.Text.split(' - ')[0], snippet: topic.Text, url: topic.FirstURL});
            });
        }
        if (data.Answer) {
            results.unshift({type: 'instant', title: 'Quick Answer', snippet: data.Answer, source: 'DuckDuckGo'});
        }

        if (results.length === 0) {
            // Fallback: search Wikipedia by keyword then fetch summary for the top result
            try {
                const wikiSearchUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodedQuery}&format=json&origin=*&srlimit=1`;
                const wikiSearchRes = await fetch(wikiSearchUrl);
                if (wikiSearchRes.ok) {
                    const wikiSearchData = await wikiSearchRes.json();
                    const firstResult = wikiSearchData?.query?.search?.[0];
                    if (firstResult) {
                        const wikiTitle = encodeURIComponent(firstResult.title);
                        const wikiSummaryRes = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${wikiTitle}`);
                        if (wikiSummaryRes.ok) {
                            const wikiData = await wikiSummaryRes.json();
                            if (wikiData.extract) {
                                results.push({
                                    type: 'wikipedia',
                                    title: wikiData.title,
                                    snippet: wikiData.extract.split('. ').slice(0, 4).join('. ') + '.',
                                    url: wikiData.content_urls?.desktop?.page
                                });
                            }
                        }
                    }
                }
            } catch (_) { /* Wikipedia fallback failed silently */ }
        }

        if (results.length === 0) {
            return {success: true, message: `No instant results for "${query}".`, results: [], noResults: true, query};
        }
        return {success: true, query, resultCount: results.length, results, message: `🔍 Found ${results.length} result(s) for "${query}"`};
    } catch (error) {
        logger.error('Web search failed', error);
        return {success: false, error: error.message, noResults: true, query};
    }
}

async function wikipediaSummary({topic, sentences = 3}, userId) {
    logger.debug(`Wikipedia search for ${userId}: ${topic}`);
    try {
        const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(topic)}`;
        const response = await fetch(url);

        if (!response.ok) return {success: false, message: `Could not find Wikipedia article for "${topic}"`};

        const data = await response.json();
        const summary = data.extract;
        const sentenceArray = summary.split('. ').slice(0, sentences);
        const truncatedSummary = sentenceArray.join('. ') + (sentenceArray.length > 0 ? '.' : '');

        return {
            success: true, topic: data.title, summary: truncatedSummary,
            fullUrl: data.content_urls?.desktop?.page || `https://en.wikipedia.org/wiki/${encodeURIComponent(topic)}`,
            thumbnail: data.thumbnail?.source || null,
            message: `📚 Wikipedia summary for "${data.title}"`
        };
    } catch (error) {
        logger.error('Wikipedia search failed', error);
        return {success: false, error: error.message, suggestion: `Search manually: https://en.wikipedia.org/wiki/${encodeURIComponent(topic)}`};
    }
}

async function youtubeSearch({query, type = 'educational', maxResults = 5}, userId) {
    logger.debug(`YouTube search for ${userId}: ${query}`);
    try {
        const educationalQuery = type === 'educational' ? `${query} tutorial explained` : query;
        const encodedQuery = encodeURIComponent(educationalQuery);

        const educationalChannels = [
            {name: '3Blue1Brown', topic: 'math', url: 'https://www.youtube.com/@3blue1brown'},
            {name: 'Khan Academy', topic: 'general', url: 'https://www.youtube.com/@khanacademy'},
            {name: 'CrashCourse', topic: 'general', url: 'https://www.youtube.com/@crashcourse'},
            {name: 'Kurzgesagt', topic: 'science', url: 'https://www.youtube.com/@kurzgesagt'},
            {name: 'Veritasium', topic: 'science', url: 'https://www.youtube.com/@veritasium'},
            {name: 'Numberphile', topic: 'math', url: 'https://www.youtube.com/@numberphile'},
            {name: 'Computerphile', topic: 'computer science', url: 'https://www.youtube.com/@Computerphile'},
            {name: 'freeCodeCamp', topic: 'programming', url: 'https://www.youtube.com/@freecodecamp'},
            {name: 'The Organic Chemistry Tutor', topic: 'chemistry/math', url: 'https://www.youtube.com/@TheOrganicChemistryTutor'},
            {name: 'Professor Leonard', topic: 'calculus', url: 'https://www.youtube.com/@ProfessorLeonard'}
        ];

        const queryLower = query.toLowerCase();
        const relevantChannels = educationalChannels.filter(ch =>
            queryLower.includes(ch.topic) || ch.topic === 'general' ||
            (queryLower.includes('math') && ch.topic === 'math') ||
            (queryLower.includes('code') && ch.topic === 'programming') ||
            (queryLower.includes('program') && ch.topic === 'programming')
        ).slice(0, 3);

        return {
            success: true, query,
            message: `🎥 YouTube search results for "${query}"`,
            directSearch: {url: `https://www.youtube.com/results?search_query=${encodedQuery}`, description: 'Click to search on YouTube'},
            filteredSearch: {url: `https://www.youtube.com/results?search_query=${encodedQuery}&sp=EgIQAw%253D%253D`, description: 'Search filtered by educational channels'},
            recommendedChannels: relevantChannels.length > 0 ? relevantChannels : educationalChannels.slice(0, 3),
            searchTips: ['Add "explained" or "tutorial" for better results', 'Add "for beginners" if you\'re new to the topic', 'Look for videos from verified educational channels', 'Check video length - longer videos often go deeper'],
            specificSearches: [
                {label: 'Short explanations (< 4 min)', url: `https://www.youtube.com/results?search_query=${encodedQuery}&sp=EgIYAQ%253D%253D`},
                {label: 'Full lectures (> 20 min)', url: `https://www.youtube.com/results?search_query=${encodedQuery}&sp=EgIYAg%253D%253D`}
            ]
        };
    } catch (error) {
        logger.error('YouTube search failed', error);
        return {success: false, error: error.message, fallback: `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`};
    }
}

module.exports = {webSearch, wikipediaSummary, youtubeSearch};
