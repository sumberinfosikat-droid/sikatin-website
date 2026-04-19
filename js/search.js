/* ========================================
   SIKATIN - Search & Filter
   ======================================== */

(function () {
    const searchInput = document.getElementById('searchInput');
    const filterBar = document.getElementById('filterBar');
    const sortSelect = document.getElementById('sortSelect');
    const articleGrid = document.getElementById('articleGrid');
    const resultCount = document.getElementById('resultCount');

    if (!articleGrid || typeof articlesData === 'undefined') return;

    let currentCategory = 'Semua';
    let currentQuery = '';
    let currentSort = 'terbaru';

    // Read URL params
    const urlParams = new URLSearchParams(window.location.search);
    const kategoriParam = urlParams.get('kategori');
    if (kategoriParam) {
        currentCategory = kategoriParam;
    }
    const queryParam = urlParams.get('q');
    if (queryParam && searchInput) {
        currentQuery = queryParam;
        searchInput.value = queryParam;
    }

    // Set active filter chip from URL
    function setActiveChip() {
        if (!filterBar) return;
        filterBar.querySelectorAll('.filter-chip').forEach(chip => {
            chip.classList.toggle('active', chip.dataset.category === currentCategory);
        });
    }

    // Debounce
    function debounce(func, wait) {
        let timeout;
        return function (...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), wait);
        };
    }

    // Filter & Search
    function getFilteredArticles() {
        let results = [...articlesData];

        // Category filter
        if (currentCategory !== 'Semua') {
            results = results.filter(a => a.category === currentCategory);
        }

        // Search query
        if (currentQuery.trim()) {
            const q = currentQuery.toLowerCase();
            results = results.filter(a =>
                a.title.toLowerCase().includes(q) ||
                a.excerpt.toLowerCase().includes(q) ||
                a.tags.some(t => t.toLowerCase().includes(q))
            );
        }

        // Sort
        if (currentSort === 'terbaru') {
            results.sort((a, b) => articlesData.indexOf(a) - articlesData.indexOf(b));
        } else if (currentSort === 'terlama') {
            results.sort((a, b) => articlesData.indexOf(b) - articlesData.indexOf(a));
        } else if (currentSort === 'az') {
            results.sort((a, b) => a.title.localeCompare(b.title));
        }

        return results;
    }

    // Render
    function renderArticles() {
        const filtered = getFilteredArticles();

        if (resultCount) {
            resultCount.textContent = `${filtered.length} artikel ditemukan`;
        }

        if (filtered.length === 0) {
            articleGrid.innerHTML = `
                <div class="empty-state" style="grid-column: 1 / -1;">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                    <h3>Artikel Tidak Ditemukan</h3>
                    <p>Coba ubah kata kunci atau kategori pencarian Anda.</p>
                    <button class="btn btn-secondary btn-sm" onclick="resetFilters()">Reset Filter</button>
                </div>`;
            return;
        }

        articleGrid.innerHTML = filtered.map((article, index) => `
            <div class="card animate-on-scroll stagger-${(index % 3) + 1}">
                <div class="card-thumbnail">
                    ${article.image ? `<img src="${article.image}" alt="${article.title}" onerror="this.parentElement.innerHTML='<div class=card-thumbnail-placeholder><svg xmlns=http://www.w3.org/2000/svg width=48 height=48 viewBox=&quot;0 0 24 24&quot; fill=none stroke=currentColor stroke-width=1><path d=&quot;M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z&quot;/><path d=&quot;M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z&quot;/></svg></div>'">` : `<div class="card-thumbnail-placeholder"><svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg></div>`}
                </div>
                <div class="card-body">
                    <span class="card-category">${article.category}</span>
                    <h3 class="card-title"><a href="${article.url}">${article.title}</a></h3>
                    <p class="card-excerpt">${article.excerpt}</p>
                    <div class="card-meta">
                        <span>${article.date}</span>
                        <span>${article.readTime}</span>
                    </div>
                </div>
            </div>
        `).join('');

        // Re-init scroll animations
        if (typeof initScrollAnimations === 'function') {
            initScrollAnimations();
        }
    }

    // Event listeners
    if (searchInput) {
        searchInput.addEventListener('input', debounce((e) => {
            currentQuery = e.target.value;
            renderArticles();
            // Track search query for personalization
            if (typeof SikatinPrefs !== 'undefined' && currentQuery.length >= 3) {
                SikatinPrefs.trackSearch(currentQuery);
            }
        }, 300));
    }

    if (filterBar) {
        filterBar.addEventListener('click', (e) => {
            const chip = e.target.closest('.filter-chip');
            if (!chip) return;
            currentCategory = chip.dataset.category;
            setActiveChip();
            renderArticles();
            // Track category click for personalization
            if (typeof SikatinPrefs !== 'undefined' && currentCategory !== 'Semua') {
                SikatinPrefs.trackCategoryClick(currentCategory);
            }
        });
    }

    if (sortSelect) {
        sortSelect.addEventListener('change', (e) => {
            currentSort = e.target.value;
            renderArticles();
        });
    }

    // Global reset function
    window.resetFilters = function () {
        currentCategory = 'Semua';
        currentQuery = '';
        if (searchInput) searchInput.value = '';
        setActiveChip();
        renderArticles();
    };

    // Initial render
    setActiveChip();
    // SSG guard: if grid was pre-rendered at build time, skip initial render
    // unless user landed with an active filter/search URL param.
    const hasSSG = articleGrid.dataset.ssg === '1';
    const hasActiveFilter = currentCategory !== 'Semua' || currentQuery !== '';
    if (!hasSSG || hasActiveFilter) {
        renderArticles();
    } else if (resultCount) {
        // Still update result count for SSG'd view (count all articles)
        resultCount.textContent = `${articlesData.length} artikel ditemukan`;
    }
})();
