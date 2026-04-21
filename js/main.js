/* ========================================
   SIKATIN - Main JavaScript
   ======================================== */

// Determine base path based on current page location
function getBasePath() {
    const path = window.location.pathname;
    if (path.includes('/artikel/') || path.includes('/topik/')) {
        return '../';
    }
    return '';
}

const basePath = getBasePath();

// ---- Navbar ----
function loadNavbar() {
    const placeholder = document.getElementById('navbar-placeholder');
    if (!placeholder) return;

    // SSG guard: if placeholder was pre-rendered at build time (inject-listing.js),
    // skip innerHTML injection and just wire up interactivity.
    if (placeholder.dataset.ssg === '1') {
        initMobileMenu();
        initNavbarScroll();
        return;
    }

    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    const inSubfolder = window.location.pathname.includes('/artikel/');
    const inTopik = window.location.pathname.includes('/topik/');

    function isActive(page) {
        if (page === 'index.html' && (currentPage === 'index.html' || currentPage === '' || currentPage === 'V1')) return 'active';
        if (page === 'artikel.html' && (currentPage === 'artikel.html' || inSubfolder)) return 'active';
        if (page === 'topik' && inTopik) return 'active';
        if (page === currentPage) return 'active';
        return '';
    }

    placeholder.innerHTML = `
    <nav class="navbar" id="navbar">
        <div class="container">
            <a href="${basePath}index.html" class="nav-brand">
                <img src="${basePath}logo/BASE%20LOGO.png" alt="SIKATIN Logo" width="40" height="40">
                <span>SIKATIN</span>
            </a>
            <div class="nav-links" id="navLinks">
                <a href="${basePath}index.html" class="${isActive('index.html')}">Beranda</a>
                <a href="${basePath}artikel.html" class="${isActive('artikel.html')}">Artikel</a>
                <div class="nav-dropdown">
                    <a href="#topik" class="nav-dropdown-trigger ${isActive('topik')}" role="button" aria-expanded="false">Topik <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg></a>
                    <div class="nav-dropdown-menu">
                        <a href="${basePath}topik/geopolitik.html"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/></svg> Geopolitik</a>
                        <a href="${basePath}topik/self-improvement.html"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg> Self-Improvement</a>
                        <a href="${basePath}topik/history.html"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg> History</a>
                        <a href="${basePath}topik/engineering.html"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg> Engineering</a>
                        <a href="${basePath}topik/sepakbola.html"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 2v20"/><path d="M2 12h20"/><path d="M12 2a14.5 14.5 0 0 0 0 20"/><path d="M12 2a14.5 14.5 0 0 1 0 20"/></svg> Sepakbola</a>
                    </div>
                </div>
                <a href="${basePath}tentang.html" class="${isActive('tentang.html')}">Tentang</a>
                <a href="${basePath}kontak.html" class="${isActive('kontak.html')}">Kontak</a>
            </div>
            <div class="nav-hamburger" id="navHamburger">
                <span></span>
                <span></span>
                <span></span>
            </div>
        </div>
    </nav>`;

    initMobileMenu();
    initNavbarScroll();
}

// ---- Footer ----
function loadFooter() {
    const placeholder = document.getElementById('footer-placeholder');
    if (!placeholder) return;

    // SSG guard: skip if pre-rendered
    if (placeholder.dataset.ssg === '1') return;

    placeholder.innerHTML = `
    <footer class="footer">
        <div class="container">
            <div class="footer-grid">
                <div>
                    <div class="footer-brand">
                        <img src="${basePath}logo/BASE%20LOGO.png" alt="SIKATIN" width="36" height="36">
                        <span>SIKATIN</span>
                    </div>
                    <p class="footer-desc">Media edukasi digital independen yang menyajikan artikel mendalam di bidang geopolitik, sejarah, engineering, teknologi, dan pengembangan diri untuk pembaca Indonesia.</p>
                </div>
                <div>
                    <h5>Navigasi</h5>
                    <ul>
                        <li><a href="${basePath}index.html">Beranda</a></li>
                        <li><a href="${basePath}artikel.html">Artikel</a></li>
                        <li><a href="${basePath}tentang.html">Tentang</a></li>
                        <li><a href="${basePath}tim.html">Tim</a></li>
                        <li><a href="${basePath}kontak.html">Kontak</a></li>
                    </ul>
                </div>
                <div>
                    <h5>Topik</h5>
                    <ul>
                        <li><a href="${basePath}topik/geopolitik.html">Geopolitik</a></li>
                        <li><a href="${basePath}topik/self-improvement.html">Self-Improvement</a></li>
                        <li><a href="${basePath}topik/history.html">History</a></li>
                        <li><a href="${basePath}topik/engineering.html">Engineering</a></li>
                        <li><a href="${basePath}topik/sepakbola.html">Sepakbola</a></li>
                    </ul>
                </div>
                <div>
                    <h5>Kontak</h5>
                    <ul>
                        <li><a href="mailto:sumberinfo.sikat@gmail.com">sumberinfo.sikat@gmail.com</a></li>
                        <li><a href="https://instagram.com/Sikat.info" target="_blank">Instagram @Sikat.info</a></li>
                        <li><a href="https://tiktok.com/@sikat.info" target="_blank">TikTok @sikat.info</a></li>
                    </ul>
                </div>
            </div>
            <div class="footer-bottom">
                <p>&copy; 2026 SIKATIN. Semua hak cipta dilindungi.</p>
                <p style="margin-top:8px;font-size:0.8rem;"><a href="${basePath}privasi.html" style="color:var(--text-muted);">Kebijakan Privasi</a> &nbsp;|&nbsp; <a href="${basePath}syarat.html" style="color:var(--text-muted);">Syarat & Ketentuan</a> &nbsp;|&nbsp; <a href="${basePath}disclaimer.html" style="color:var(--text-muted);">Disclaimer</a></p>
            </div>
        </div>
    </footer>`;
}

// ---- Mobile Menu ----
function initMobileMenu() {
    const hamburger = document.getElementById('navHamburger');
    const navLinks = document.getElementById('navLinks');

    if (!hamburger || !navLinks) return;

    hamburger.addEventListener('click', () => {
        hamburger.classList.toggle('active');
        navLinks.classList.toggle('open');
        document.body.style.overflow = navLinks.classList.contains('open') ? 'hidden' : '';
    });

    navLinks.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', () => {
            hamburger.classList.remove('active');
            navLinks.classList.remove('open');
            document.body.style.overflow = '';
        });
    });
}

// ---- Navbar Scroll Effect ----
function initNavbarScroll() {
    const navbar = document.getElementById('navbar');
    if (!navbar) return;

    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
    });
}

// ---- Scroll Animations ----
function initScrollAnimations() {
    const elements = document.querySelectorAll('.animate-on-scroll');
    if (!elements.length) return;

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('is-visible');
                observer.unobserve(entry.target);
            }
        });
    }, {
        threshold: 0.15,
        rootMargin: '0px 0px -50px 0px'
    });

    elements.forEach(el => observer.observe(el));
}

// ---- Smooth Scroll ----
function initSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            const targetId = this.getAttribute('href');
            if (targetId === '#') return;

            const target = document.querySelector(targetId);
            if (target) {
                e.preventDefault();
                target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });
    });
}

// ---- Back to Top ----
function initBackToTop() {
    const btn = document.createElement('div');
    btn.className = 'back-to-top';
    btn.id = 'backToTop';
    btn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="18 15 12 9 6 15"></polyline></svg>`;
    document.body.appendChild(btn);

    window.addEventListener('scroll', () => {
        if (window.scrollY > 400) {
            btn.classList.add('visible');
        } else {
            btn.classList.remove('visible');
        }
    });

    btn.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
}

// ---- Counter Animation ----
function animateCounters() {
    const counters = document.querySelectorAll('[data-count]');
    if (!counters.length) return;

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const target = parseInt(entry.target.getAttribute('data-count'));
                const suffix = entry.target.getAttribute('data-suffix') || '';
                let current = 0;
                const increment = target / 60;
                const timer = setInterval(() => {
                    current += increment;
                    if (current >= target) {
                        current = target;
                        clearInterval(timer);
                    }
                    entry.target.textContent = Math.floor(current) + suffix;
                }, 20);
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.5 });

    counters.forEach(el => observer.observe(el));
}

// ---- FAQ Accordion ----
function initFAQ() {
    document.querySelectorAll('.faq-question').forEach(question => {
        question.addEventListener('click', () => {
            const item = question.closest('.faq-item');
            const isOpen = item.classList.contains('open');

            // Close all
            document.querySelectorAll('.faq-item').forEach(i => i.classList.remove('open'));

            // Toggle current
            if (!isOpen) {
                item.classList.add('open');
            }
        });
    });
}

// ---- Auto Version Check (reload on new deploy) ----
function initVersionCheck() {
    let currentVersion = null;

    function checkVersion() {
        fetch(basePath + 'version.txt?t=' + Date.now())
            .then(r => r.ok ? r.text() : null)
            .then(v => {
                if (!v) return;
                v = v.trim();
                if (currentVersion === null) {
                    currentVersion = v;
                } else if (v !== currentVersion) {
                    window.location.reload();
                }
            })
            .catch(() => {});
    }

    checkVersion();
    setInterval(checkVersion, 3 * 60 * 1000);
}

// ---- Analytics Tracking ----
function initAnalytics() {
    try {
        const page = window.location.pathname;
        fetch('/api/analytics.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ page: page, referrer: document.referrer || '' })
        }).catch(() => {});
    } catch(e) {}
}

// ---- Reading Progress Bar (Article pages only) ----
function initReadingProgress() {
    const articleContent = document.querySelector('.article-content');
    if (!articleContent) return;

    const bar = document.createElement('div');
    bar.className = 'reading-progress';
    document.body.appendChild(bar);

    window.addEventListener('scroll', () => {
        const rect = articleContent.getBoundingClientRect();
        const start = articleContent.offsetTop - window.innerHeight;
        const end = articleContent.offsetTop + articleContent.offsetHeight;
        const scrolled = window.scrollY;
        const progress = Math.min(Math.max((scrolled - start) / (end - start), 0), 1);
        bar.style.width = (progress * 100) + '%';
    });
}

// ---- Floating Share Bar (Article pages only) ----
function initFloatingShare() {
    const articleContent = document.querySelector('.article-content');
    if (!articleContent) return;

    const shareBar = document.createElement('div');
    shareBar.className = 'floating-share';
    shareBar.innerHTML = `
        <a href="#" class="share-wa" title="WhatsApp" onclick="window.open('https://wa.me/?text='+encodeURIComponent(document.title+' '+window.location.href),'_blank');return false;">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>
        </a>
        <a href="#" title="Twitter/X" onclick="window.open('https://twitter.com/intent/tweet?text='+encodeURIComponent(document.title)+'&url='+encodeURIComponent(window.location.href),'_blank');return false;">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4l11.733 16h4.267l-11.733 -16z"/><path d="M4 20l6.768 -6.768m2.46 -2.46l6.772 -6.772"/></svg>
        </a>
        <a href="#" title="Facebook" onclick="window.open('https://www.facebook.com/sharer/sharer.php?u='+encodeURIComponent(window.location.href),'_blank');return false;">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>
        </a>
        <a href="#" title="Copy Link" onclick="navigator.clipboard.writeText(window.location.href);this.style.color='var(--theme-color)';this.style.borderColor='var(--theme-color)';setTimeout(()=>{this.style.color='';this.style.borderColor='';},2000);return false;">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
        </a>`;
    document.body.appendChild(shareBar);

    window.addEventListener('scroll', () => {
        const rect = articleContent.getBoundingClientRect();
        if (rect.top < window.innerHeight * 0.3 && rect.bottom > window.innerHeight * 0.5) {
            shareBar.classList.add('visible');
        } else {
            shareBar.classList.remove('visible');
        }
    });
}

// ---- Breadcrumb Schema (Article pages, for Google rich snippets) ----
function initBreadcrumbSchema() {
    if (!window.location.pathname.includes('/artikel/')) return;
    const title = document.querySelector('h1');
    if (!title) return;
    const slug = window.location.pathname.split('/').pop();
    const schema = {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": [
            {"@type": "ListItem", "position": 1, "name": "Beranda", "item": "https://sikatin.com/"},
            {"@type": "ListItem", "position": 2, "name": "Artikel", "item": "https://sikatin.com/artikel.html"},
            {"@type": "ListItem", "position": 3, "name": title.textContent.trim()}
        ]
    };
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.textContent = JSON.stringify(schema);
    document.head.appendChild(script);
}

// ---- Initialize Everything ----
document.addEventListener('DOMContentLoaded', () => {
    loadNavbar();
    loadFooter();
    initScrollAnimations();
    initSmoothScroll();
    initBackToTop();
    animateCounters();
    initFAQ();
    initReadingProgress();
    initFloatingShare();
    initBreadcrumbSchema();
    initVersionCheck();
    initAnalytics();
});
