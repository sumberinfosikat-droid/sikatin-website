/* ========================================
   SIKATIN - Smart Related Articles
   Ranking: same category + shared tags + recency
   ======================================== */

(function() {
    'use strict';

    function parseDate(d) {
        if (!d) return 0;
        const months = {
            'januari':0,'februari':1,'maret':2,'april':3,'mei':4,'juni':5,
            'juli':6,'agustus':7,'september':8,'oktober':9,'november':10,'desember':11
        };
        const parts = d.toLowerCase().split(' ');
        if (parts.length === 3) {
            const day = parseInt(parts[0]);
            const month = months[parts[1]] || 0;
            const year = parseInt(parts[2]);
            return new Date(year, month, day).getTime();
        }
        return 0;
    }

    /**
     * Get smart related articles by ranking score
     * @param {string} currentId - Current article ID to exclude
     * @param {number} limit - Max related articles (default 3)
     * @returns {Array} Sorted related articles
     */
    window.getRelatedArticles = function(currentId, limit) {
        if (typeof articlesData === 'undefined') return [];
        limit = limit || 3;

        const current = articlesData.find(a => a.id === currentId);
        if (!current) return articlesData.slice(0, limit);

        const currentTags = (current.tags || []).map(t => t.toLowerCase());
        const currentCategory = (current.category || '').toLowerCase();
        const currentDate = parseDate(current.date);
        const now = Date.now();

        const scored = articlesData
            .filter(a => a.id !== currentId)
            .map(a => {
                let score = 0;
                // Same category +10
                if ((a.category || '').toLowerCase() === currentCategory) score += 10;
                // Shared tags: +5 each
                const aTags = (a.tags || []).map(t => t.toLowerCase());
                const shared = aTags.filter(t => currentTags.includes(t)).length;
                score += shared * 5;
                // Recency boost (within 30 days from current article date)
                const aDate = parseDate(a.date);
                if (aDate && currentDate) {
                    const daysDiff = Math.abs(currentDate - aDate) / (1000 * 60 * 60 * 24);
                    if (daysDiff < 30) score += 3;
                    if (daysDiff < 7) score += 2;
                }
                // Freshness boost
                if (aDate) {
                    const ageDays = (now - aDate) / (1000 * 60 * 60 * 24);
                    if (ageDays < 14) score += 2;
                }
                return { article: a, score };
            })
            .sort((a, b) => b.score - a.score);

        // If top result has score 0, fallback to random shuffle
        if (scored[0] && scored[0].score === 0) {
            return articlesData
                .filter(a => a.id !== currentId)
                .sort(() => Math.random() - 0.5)
                .slice(0, limit);
        }

        return scored.slice(0, limit).map(s => s.article);
    };

    /**
     * Render related articles into a container element
     */
    window.renderRelatedArticles = function(containerId, currentId, limit) {
        const container = document.getElementById(containerId);
        if (!container) return;
        const related = getRelatedArticles(currentId, limit || 3);
        container.innerHTML = related.map(article => `
            <div class="card animate-on-scroll">
                <div class="card-thumbnail">
                    <img src="../${article.image}" alt="${article.title}" loading="lazy"
                         onerror="this.parentElement.innerHTML='<div class=card-thumbnail-placeholder><svg xmlns=http://www.w3.org/2000/svg width=48 height=48 viewBox=&quot;0 0 24 24&quot; fill=none stroke=currentColor stroke-width=1><path d=&quot;M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z&quot;/><path d=&quot;M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z&quot;/></svg></div>'">
                </div>
                <div class="card-body">
                    <span class="card-category">${article.category}</span>
                    <h3 class="card-title"><a href="${article.id}.html">${article.title}</a></h3>
                    <p class="card-excerpt">${article.excerpt}</p>
                    <div class="card-meta">
                        <span><span class="dot"></span> ${article.date}</span>
                        <span>${article.readTime}</span>
                    </div>
                </div>
            </div>
        `).join('');
        if (typeof initScrollAnimations === 'function') initScrollAnimations();
    };
})();
