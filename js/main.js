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
                <img src="${basePath}logo/BASE LOGO.png" alt="SIKATIN Logo">
                <span>SIKATIN</span>
            </a>
            <div class="nav-links" id="navLinks">
                <a href="${basePath}index.html" class="${isActive('index.html')}">Beranda</a>
                <a href="${basePath}artikel.html" class="${isActive('artikel.html')}">Artikel</a>
                <div class="nav-dropdown">
                    <a class="nav-dropdown-trigger ${isActive('topik')}">Topik <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg></a>
                    <div class="nav-dropdown-menu">
                        <a href="${basePath}topik/geopolitik.html"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/></svg> Geopolitik</a>
                        <a href="${basePath}topik/self-improvement.html"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg> Self-Improvement</a>
                        <a href="${basePath}topik/history.html"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg> History</a>
                        <a href="${basePath}topik/engineering.html"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg> Engineering</a>
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

    placeholder.innerHTML = `
    <footer class="footer">
        <div class="container">
            <div class="footer-grid">
                <div>
                    <div class="footer-brand">
                        <img src="${basePath}logo/BASE LOGO.png" alt="SIKATIN">
                        <span>SIKATIN</span>
                    </div>
                    <p class="footer-desc">Platform edukasi yang menyajikan artikel-artikel berkualitas seputar pendidikan, teknologi, dan pengembangan diri untuk masyarakat Indonesia.</p>
                </div>
                <div>
                    <h5>Navigasi</h5>
                    <ul>
                        <li><a href="${basePath}index.html">Beranda</a></li>
                        <li><a href="${basePath}artikel.html">Artikel</a></li>
                        <li><a href="${basePath}tentang.html">Tentang</a></li>
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

// ---- Initialize Everything ----
document.addEventListener('DOMContentLoaded', () => {
    loadNavbar();
    loadFooter();
    initScrollAnimations();
    initSmoothScroll();
    initBackToTop();
    animateCounters();
    initFAQ();
});
