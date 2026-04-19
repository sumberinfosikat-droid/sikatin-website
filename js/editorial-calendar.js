/**
 * SIKATIN Editorial Calendar
 * - Scheduling system: articles with `publishDate` in the future are hidden until that date
 * - Frequency tracker: monitors publish cadence, warns if inconsistent
 * - Auto-sorts articlesData by publishDate (descending) on load
 *
 * Usage:
 * 1. Add `publishDate: "2026-04-15T08:00:00"` field to articles-data.js entries
 * 2. This script filters articlesData at runtime
 * 3. Call window.editorialStats() in console for cadence report
 */
(function() {
    'use strict';
    if (typeof articlesData === 'undefined') return;

    const now = new Date();

    // Parse Indonesian date strings like "10 April 2026" to Date object
    const monthMap = {
        'januari': 0, 'februari': 1, 'maret': 2, 'april': 3, 'mei': 4, 'juni': 5,
        'juli': 6, 'agustus': 7, 'september': 8, 'oktober': 9, 'november': 10, 'desember': 11
    };
    function parseIDDate(str) {
        if (!str) return null;
        const parts = str.toLowerCase().trim().split(/\s+/);
        if (parts.length !== 3) return null;
        const day = parseInt(parts[0]);
        const month = monthMap[parts[1]];
        const year = parseInt(parts[2]);
        if (isNaN(day) || month === undefined || isNaN(year)) return null;
        return new Date(year, month, day, 8, 0, 0);
    }

    // Enrich articles with parsed date
    articlesData.forEach(a => {
        a._parsedDate = a.publishDate ? new Date(a.publishDate) : parseIDDate(a.date);
    });

    // Filter: remove articles scheduled for future
    const originalLength = articlesData.length;
    for (let i = articlesData.length - 1; i >= 0; i--) {
        const a = articlesData[i];
        if (a._parsedDate && a._parsedDate > now) {
            articlesData.splice(i, 1);
        }
    }
    const filteredCount = originalLength - articlesData.length;
    if (filteredCount > 0) {
        console.log(`[Editorial] ${filteredCount} scheduled articles hidden (publishDate in future)`);
    }

    // Sort by date descending
    articlesData.sort((a, b) => {
        const da = a._parsedDate ? a._parsedDate.getTime() : 0;
        const db = b._parsedDate ? b._parsedDate.getTime() : 0;
        return db - da;
    });

    // === CADENCE ANALYZER ===
    window.editorialStats = function() {
        const dates = articlesData
            .map(a => a._parsedDate)
            .filter(d => d instanceof Date && !isNaN(d))
            .sort((a, b) => b - a);

        if (dates.length < 2) return console.log('Not enough data');

        // Last 30 days
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 3600 * 1000);
        const last30 = dates.filter(d => d >= thirtyDaysAgo);
        // Gaps between consecutive articles (top 20)
        const gaps = [];
        for (let i = 0; i < Math.min(dates.length - 1, 20); i++) {
            const gap = (dates[i] - dates[i + 1]) / (1000 * 3600 * 24);
            gaps.push(gap);
        }
        const avgGap = gaps.reduce((s, g) => s + g, 0) / gaps.length;
        const maxGap = Math.max(...gaps);

        const report = {
            totalArticles: articlesData.length,
            last30Days: last30.length,
            avgGapDays: +avgGap.toFixed(1),
            maxGapDays: +maxGap.toFixed(1),
            cadenceScore: last30.length >= 10 ? 'excellent' : last30.length >= 5 ? 'good' : last30.length >= 2 ? 'inconsistent' : 'poor',
            recommendation: last30.length < 5 ?
                'Tingkatkan frekuensi publish minimal 2x/minggu untuk SEO momentum' :
                'Cadence sehat. Pertahankan.'
        };
        console.table(report);
        return report;
    };
})();
