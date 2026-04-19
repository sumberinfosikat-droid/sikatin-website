/* ========================================
   SIKATIN - User Preference & Personalization Engine
   ========================================
   Tracks user behavior across the site and personalizes
   the landing page content order based on their interests.

   Data stored in localStorage:
   - sikatin_prefs: { categories, articles, tags, sessions }
   ======================================== */

const SikatinPrefs = (() => {
    const STORAGE_KEY = 'sikatin_prefs';
    const MAX_HISTORY = 100;        // max articles tracked
    const DECAY_DAYS = 30;          // older interactions lose weight
    const MIN_INTERACTIONS = 3;     // min before personalization kicks in
    const SESSION_KEY = 'sikatin_session';

    // ---- Default Data Structure ----
    function getDefault() {
        return {
            categories: {},     // { "Geopolitik": { views: 5, lastView: timestamp, totalTime: 120 } }
            articles: [],       // [{ id, category, tags, timestamp, timeSpent }]
            tags: {},           // { "AI": 3, "Taiwan": 2 }
            searchQueries: [],  // ["kereta cepat", "AI"]
            totalVisits: 0,
            firstVisit: Date.now(),
            lastVisit: Date.now(),
            version: 2
        };
    }

    // ---- Load / Save ----
    function load() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (!raw) return getDefault();
            const data = JSON.parse(raw);
            // Migration: ensure all fields exist
            const defaults = getDefault();
            for (const key of Object.keys(defaults)) {
                if (!(key in data)) data[key] = defaults[key];
            }
            return data;
        } catch (e) {
            return getDefault();
        }
    }

    function save(data) {
        try {
            // Trim article history
            if (data.articles.length > MAX_HISTORY) {
                data.articles = data.articles.slice(-MAX_HISTORY);
            }
            // Trim search queries
            if (data.searchQueries.length > 50) {
                data.searchQueries = data.searchQueries.slice(-50);
            }
            localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        } catch (e) { /* storage full, silently fail */ }
    }

    // ---- Track Page Visit ----
    function trackVisit() {
        const data = load();
        data.totalVisits++;
        data.lastVisit = Date.now();
        save(data);
    }

    // ---- Track Article Read ----
    function trackArticle(articleId, category, tags = []) {
        const data = load();
        const now = Date.now();

        // Update category stats
        if (!data.categories[category]) {
            data.categories[category] = { views: 0, lastView: 0, totalTime: 0 };
        }
        data.categories[category].views++;
        data.categories[category].lastView = now;

        // Add to article history (avoid duplicates in last 5 min)
        const recentDupe = data.articles.find(a =>
            a.id === articleId && (now - a.timestamp) < 300000
        );
        if (!recentDupe) {
            data.articles.push({
                id: articleId,
                category: category,
                tags: tags,
                timestamp: now,
                timeSpent: 0
            });
        }

        // Update tag counts
        tags.forEach(tag => {
            const t = tag.toLowerCase().trim();
            if (t) data.tags[t] = (data.tags[t] || 0) + 1;
        });

        save(data);

        // Start time tracking for this article
        startTimeTracking(articleId);
    }

    // ---- Track Category Click (from pills, filters, nav) ----
    function trackCategoryClick(category) {
        const data = load();
        if (!data.categories[category]) {
            data.categories[category] = { views: 0, lastView: 0, totalTime: 0 };
        }
        data.categories[category].views += 0.5; // half weight for click vs full read
        data.categories[category].lastView = Date.now();
        save(data);
    }

    // ---- Track Search Query ----
    function trackSearch(query) {
        if (!query || query.length < 2) return;
        const data = load();
        data.searchQueries.push(query.toLowerCase().trim());
        save(data);
    }

    // ---- Time Tracking (how long user reads) ----
    let _timeInterval = null;
    let _currentArticleId = null;

    function startTimeTracking(articleId) {
        stopTimeTracking(); // stop any previous
        _currentArticleId = articleId;
        _timeInterval = setInterval(() => {
            const data = load();
            const article = data.articles.find(a => a.id === articleId);
            if (article) {
                article.timeSpent = (article.timeSpent || 0) + 5; // +5 sec
                // Also update category total time
                if (data.categories[article.category]) {
                    data.categories[article.category].totalTime =
                        (data.categories[article.category].totalTime || 0) + 5;
                }
                save(data);
            }
        }, 5000); // every 5 seconds
    }

    function stopTimeTracking() {
        if (_timeInterval) {
            clearInterval(_timeInterval);
            _timeInterval = null;
        }
    }

    // Stop tracking when user leaves
    if (typeof window !== 'undefined') {
        window.addEventListener('beforeunload', stopTimeTracking);
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) stopTimeTracking();
            else if (_currentArticleId) startTimeTracking(_currentArticleId);
        });
    }

    // ============================================
    // PERSONALIZATION SCORING ENGINE
    // ============================================

    /**
     * Calculate preference score for each category.
     * Higher = user prefers this category more.
     * Factors:
     *   1. View count (weighted by recency)
     *   2. Time spent (engagement depth)
     *   3. Recent tag overlap
     *   4. Recency decay
     */
    function getCategoryScores() {
        const data = load();
        const now = Date.now();
        const dayMs = 86400000;
        const scores = {};

        // If not enough data, return null (use default algorithm)
        const totalInteractions = data.articles.length;
        if (totalInteractions < MIN_INTERACTIONS) return null;

        // Base scores from category stats
        for (const [cat, stats] of Object.entries(data.categories)) {
            const daysSinceLastView = (now - stats.lastView) / dayMs;
            const recencyMultiplier = Math.max(0.1, 1 - (daysSinceLastView / DECAY_DAYS));

            // View score (log scale to prevent one category from dominating)
            const viewScore = Math.log2(stats.views + 1) * 10;

            // Time score (average time per article in this category)
            const avgTime = stats.views > 0 ? (stats.totalTime / stats.views) : 0;
            const timeScore = Math.min(avgTime / 10, 20); // cap at 20

            // Recency boost for recently viewed categories
            const recencyBoost = daysSinceLastView < 1 ? 15 :
                                 daysSinceLastView < 3 ? 10 :
                                 daysSinceLastView < 7 ? 5 : 0;

            scores[cat] = (viewScore + timeScore + recencyBoost) * recencyMultiplier;
        }

        // Tag affinity boost: if article tags match user's top tags, boost that category
        const topTags = Object.entries(data.tags)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([tag]) => tag);

        if (typeof articlesData !== 'undefined') {
            articlesData.forEach(article => {
                const matchCount = article.tags.filter(t =>
                    topTags.includes(t.toLowerCase())
                ).length;
                if (matchCount > 0) {
                    scores[article.category] = (scores[article.category] || 0) + matchCount * 3;
                }
            });
        }

        return scores;
    }

    /**
     * Get personalized article scores.
     * Combines base trending score with user preference.
     */
    function getPersonalizedArticleScore(article, baseTrendScore) {
        const data = load();
        if (data.articles.length < MIN_INTERACTIONS) return baseTrendScore;

        const catScores = getCategoryScores();
        if (!catScores) return baseTrendScore;

        // Category preference boost (0-50 points)
        const catBoost = (catScores[article.category] || 0) * 0.5;

        // Tag match boost
        const topTags = Object.entries(data.tags)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([tag]) => tag);

        const tagBoost = article.tags.filter(t =>
            topTags.includes(t.toLowerCase())
        ).length * 5;

        // Already read penalty (slight deprioritization of read articles)
        const alreadyRead = data.articles.some(a => a.id === article.id);
        const readPenalty = alreadyRead ? -10 : 0;

        // Diversity factor: don't show too many from same category
        // (handled at rendering level, not scoring)

        return baseTrendScore + catBoost + tagBoost + readPenalty;
    }

    /**
     * Get personalized topic/category ordering.
     * Returns sorted categories with scores.
     */
    function getPersonalizedTopicOrder(defaultTopics) {
        const catScores = getCategoryScores();
        if (!catScores) return defaultTopics; // not enough data

        return defaultTopics.map(topic => {
            const prefScore = catScores[topic.cat] || 0;
            return {
                ...topic,
                score: topic.score + prefScore * 2, // user pref has 2x weight
                isPersonalized: prefScore > 0
            };
        }).sort((a, b) => b.score - a.score);
    }

    /**
     * Get "Untuk Anda" recommended articles.
     * Articles the user hasn't read yet, from preferred categories.
     */
    function getRecommendations(allArticles, count = 6) {
        const data = load();
        if (data.articles.length < MIN_INTERACTIONS) return null;

        const catScores = getCategoryScores();
        if (!catScores) return null;

        const readIds = new Set(data.articles.map(a => a.id));
        const topTags = Object.entries(data.tags)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 15)
            .map(([tag]) => tag);

        // Score unread articles
        const scored = allArticles
            .filter(a => !readIds.has(a.id))
            .map(article => {
                const catScore = catScores[article.category] || 0;
                const tagMatch = article.tags.filter(t =>
                    topTags.includes(t.toLowerCase())
                ).length;
                const score = catScore * 3 + tagMatch * 10 + Math.random() * 5;
                return { ...article, recScore: score };
            })
            .sort((a, b) => b.recScore - a.recScore);

        // Ensure diversity: max 2 from same category
        const result = [];
        const catCount = {};
        for (const article of scored) {
            const cc = catCount[article.category] || 0;
            if (cc >= 2) continue;
            result.push(article);
            catCount[article.category] = cc + 1;
            if (result.length >= count) break;
        }

        return result.length >= 3 ? result : null;
    }

    /**
     * Get user's preference summary for UI display.
     */
    function getPreferenceSummary() {
        const data = load();
        if (data.articles.length < MIN_INTERACTIONS) {
            return { hasPrefs: false, topCategories: [], articlesRead: 0, message: '' };
        }

        const catScores = getCategoryScores() || {};
        const sorted = Object.entries(catScores)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
            .map(([cat]) => cat);

        return {
            hasPrefs: true,
            topCategories: sorted,
            articlesRead: data.articles.length,
            totalVisits: data.totalVisits,
            message: `Berdasarkan ${data.articles.length} artikel yang Anda baca`
        };
    }

    /**
     * Check if personalization is active.
     */
    function isPersonalized() {
        const data = load();
        return data.articles.length >= MIN_INTERACTIONS;
    }

    /**
     * Reset all preferences.
     */
    function reset() {
        localStorage.removeItem(STORAGE_KEY);
    }

    /**
     * Get read article IDs (for "already read" indicators)
     */
    function getReadArticleIds() {
        const data = load();
        return new Set(data.articles.map(a => a.id));
    }

    // ---- Public API ----
    return {
        trackVisit,
        trackArticle,
        trackCategoryClick,
        trackSearch,
        startTimeTracking,
        stopTimeTracking,
        getCategoryScores,
        getPersonalizedArticleScore,
        getPersonalizedTopicOrder,
        getRecommendations,
        getPreferenceSummary,
        isPersonalized,
        getReadArticleIds,
        reset,
        load // for debugging
    };
})();
