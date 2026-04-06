/* ========================================
   SIKATIN - Article Sidebar
   Dynamic sidebar with trending headlines,
   date-seeded algorithm, and modern animations
   ======================================== */

(function() {
    document.addEventListener('DOMContentLoaded', () => {
        if (typeof articlesData === 'undefined') return;

        const articleContent = document.querySelector('.article-content');
        if (!articleContent) return;

        // Get current article ID from URL
        const currentPath = window.location.pathname;
        const currentFile = currentPath.split('/').pop().replace('.html', '');

        // ---- Date-seeded pseudo-random ----
        function dateSeed() {
            const d = new Date();
            return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
        }
        function mulberry32(seed) {
            return function() {
                seed |= 0; seed = seed + 0x6D2B79F5 | 0;
                let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
                t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
                return ((t ^ t >>> 14) >>> 0) / 4294967296;
            };
        }
        const dailyRng = mulberry32(dateSeed());

        // Trending algorithm
        const MONTH_NAMES = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
        function parseDate(dateStr) {
            const parts = dateStr.split(' ');
            return new Date(parseInt(parts[2]), MONTH_NAMES.indexOf(parts[1]), parseInt(parts[0]));
        }

        const now = new Date();
        const dayMs = 86400000;

        function scoreArticle(a) {
            const age = (now - parseDate(a.date)) / dayMs;
            return Math.max(0, 100 - age * 2) + (parseInt(a.readTime) || 5) + dailyRng() * 18;
        }

        // Category metadata
        const catSlugs = {
            'Geopolitik': 'cat-geopolitik', 'Self-Improvement': 'cat-selfimprovement',
            'History': 'cat-history', 'Engineering': 'cat-engineering',
            'Pendidikan': 'cat-pendidikan', 'Teknologi': 'cat-teknologi',
            'Tips': 'cat-tips', 'Kurikulum': 'cat-kurikulum', 'Literasi': 'cat-literasi'
        };

        // Get current article's category
        const currentArticle = articlesData.find(a => a.id === currentFile);
        const currentCat = currentArticle ? currentArticle.category : '';

        // Rank articles excluding current
        const ranked = articlesData
            .filter(a => a.id !== currentFile)
            .map(a => ({ ...a, score: scoreArticle(a) }))
            .sort((a, b) => b.score - a.score);

        // Split: same category first, then other trending
        const sameCat = ranked.filter(a => a.category === currentCat).slice(0, 4);
        const otherTrending = ranked.filter(a => a.category !== currentCat).slice(0, 6);

        // Wrap article content in sidebar layout
        const wrapper = document.createElement('div');
        wrapper.className = 'article-with-sidebar';

        const mainDiv = document.createElement('div');
        mainDiv.className = 'article-main';

        while (articleContent.firstChild) {
            mainDiv.appendChild(articleContent.firstChild);
        }

        mainDiv.style.cssText = '';

        const sidebar = document.createElement('aside');
        sidebar.className = 'article-sidebar';

        function renderHeadline(a, i) {
            const slug = catSlugs[a.category] || 'cat-pendidikan';
            const catColor = slug.replace('cat-', '');
            return `
                <a href="${a.id}.html" class="sidebar-headline sh-animate" style="--sh-i:${i};">
                    <span class="sh-num">${String(i + 1).padStart(2, '0')}</span>
                    <div class="sh-content">
                        <h4><span>${a.title}</span></h4>
                        <div class="sh-meta">
                            <span class="cat-badge cat-text-${catColor}" style="background:rgba(var(--${slug}-rgb, 255,255,255),0.1);">${a.category}</span>
                            <span class="dot"></span>
                            <span>${a.readTime}</span>
                        </div>
                    </div>
                </a>`;
        }

        sidebar.innerHTML = `
            ${sameCat.length > 0 ? `
            <div class="sidebar-section sb-section-animate" style="--sb-i:0;">
                <div class="sidebar-section-title">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
                    ${currentCat} Lainnya
                </div>
                ${sameCat.map((a, i) => renderHeadline(a, i)).join('')}
            </div>` : ''}

            <div class="sidebar-section sb-section-animate" style="--sb-i:1;">
                <div class="sidebar-section-title">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>
                    Trending Hari Ini
                </div>
                ${otherTrending.map((a, i) => renderHeadline(a, i)).join('')}
            </div>

            <div class="ad-slot ad-rectangle" style="margin-top: 16px;"><!-- Google Ads: Sidebar --></div>
        `;

        wrapper.appendChild(mainDiv);
        wrapper.appendChild(sidebar);

        articleContent.parentNode.replaceChild(wrapper, articleContent);

        mainDiv.classList.add('article-content');
        mainDiv.style.maxWidth = 'none';
        mainDiv.style.margin = '0';
        mainDiv.style.padding = '0';

        // Animate sidebar headlines on scroll into view
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('sh-visible');
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.15 });

        sidebar.querySelectorAll('.sh-animate').forEach(el => observer.observe(el));
        sidebar.querySelectorAll('.sb-section-animate').forEach(el => observer.observe(el));
    });
})();
