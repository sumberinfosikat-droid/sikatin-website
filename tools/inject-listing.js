#!/usr/bin/env node
/**
 * SIKATIN Listing Injector — SSG for article listings.
 *
 * Injects pre-rendered HTML article cards + navbar + footer into:
 *   - artikel.html        → all 117 articles, sorted newest first
 *   - index.html          → 9 latest articles (new section #latestArticles)
 *   - topik/<cat>.html    → articles filtered by category + empty state
 *
 * Strategy: progressive enhancement.
 *   - Static HTML card: tagged with data-ssg="1" on wrapper
 *   - main.js skip loadNavbar/loadFooter when placeholder has data-ssg="1"
 *   - search.js skip initial render when #articleGrid has data-ssg="1"
 *   - JS still handles filter/sort/search via re-render
 *
 * Idempotent: safe to re-run. Detects previous SSG output and replaces it.
 *
 * Usage:
 *   node tools/inject-listing.js           # dry-run
 *   node tools/inject-listing.js --write   # apply changes
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const WRITE = process.argv.includes('--write');

const INDO_MONTHS = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
function parseIndoDate(dateStr) {
  const p = String(dateStr).trim().split(/\s+/);
  if (p.length !== 3) return new Date(0);
  const d = parseInt(p[0], 10);
  const m = INDO_MONTHS.indexOf(p[1]);
  const y = parseInt(p[2], 10);
  if (isNaN(d) || m < 0 || isNaN(y)) return new Date(0);
  return new Date(y, m, d);
}

// --- Load articles-data.js via new Function (no window global dependency) ---
function loadArticles() {
  const file = path.join(ROOT, 'js', 'articles-data.js');
  const src = fs.readFileSync(file, 'utf8');
  // Wrap: the file declares `const articlesData = [...]`. We evaluate in an
  // isolated scope and return the array explicitly.
  const fn = new Function(`${src}; return (typeof articlesData !== 'undefined') ? articlesData : null;`);
  const data = fn();
  if (!Array.isArray(data)) {
    throw new Error('articles-data.js did not produce an articlesData array');
  }
  return data;
}

// --- Load templates ---
function loadTemplate(name) {
  return fs.readFileSync(path.join(ROOT, 'templates', name), 'utf8');
}

function escHtml(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// --- Render navbar/footer with placeholders filled ---
function renderNav(template, { basePath, active }) {
  return template
    .replace(/\{\{basePath\}\}/g, basePath)
    .replace(/\{\{activeBeranda\}\}/g, active === 'beranda' ? 'active' : '')
    .replace(/\{\{activeArtikel\}\}/g, active === 'artikel' ? 'active' : '')
    .replace(/\{\{activeTopik\}\}/g,   active === 'topik'   ? 'active' : '')
    .replace(/\{\{activeTentang\}\}/g, active === 'tentang' ? 'active' : '')
    .replace(/\{\{activeKontak\}\}/g,  active === 'kontak'  ? 'active' : '');
}

function renderFooter(template, { basePath }) {
  return template.replace(/\{\{basePath\}\}/g, basePath);
}

// --- Render one article card ---
// imgPrefix: path prefix to prepend to `article.image` ('' for root, '../' for nested pages)
function renderCard(article, imgPrefix = '') {
  const imgSrc = imgPrefix + article.image;
  const url = imgPrefix + article.url;
  const title = escHtml(article.title);
  const excerpt = escHtml(article.excerpt);
  const category = escHtml(article.category);
  const date = escHtml(article.date);
  const readTime = escHtml(article.readTime);
  // Fallback SVG inline in onerror — same as search.js for visual consistency
  const fallback = `<div class=card-thumbnail-placeholder><svg xmlns=http://www.w3.org/2000/svg width=48 height=48 viewBox=&quot;0 0 24 24&quot; fill=none stroke=currentColor stroke-width=1><path d=&quot;M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z&quot;/><path d=&quot;M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z&quot;/></svg></div>`;
  return `            <div class="card">
                <div class="card-thumbnail">
                    <img src="${imgSrc}" alt="${title}" loading="lazy" onerror="this.parentElement.innerHTML='${fallback}'">
                </div>
                <div class="card-body">
                    <span class="card-category">${category}</span>
                    <h3 class="card-title"><a href="${url}">${title}</a></h3>
                    <p class="card-excerpt">${excerpt}</p>
                    <div class="card-meta">
                        <span>${date}</span>
                        <span>${readTime}</span>
                    </div>
                </div>
            </div>`;
}

// --- SSG markers (idempotent boundaries) ---
const SSG_START = '<!-- SSG:LISTING:START -->';
const SSG_END   = '<!-- SSG:LISTING:END -->';
const ITEMLIST_START = '<!-- SSG:ITEMLIST:START -->';
const ITEMLIST_END   = '<!-- SSG:ITEMLIST:END -->';

function escapeRe(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

// Inject content into a grid container. Idempotent via SSG markers.
//
// Rules:
//  1. If markers exist anywhere in html → replace the block between them.
//  2. If grid container exists and is EMPTY (exact match of empty div) →
//     inject wrapper with markers, data-ssg, and content.
//  3. If grid has non-empty content without markers → ABORT (unsafe to parse).
//
// gridOpenRe must capture: (full opening tag up to >). Grid must be written
// as a single-line empty element: <div ... id="X" ...></div> or
// <div ... id="X" ...>\n ...whitespace-or-comment-only... </div>.
function injectIntoGrid(html, gridIdValue, innerContent) {
  // Step 1: if markers already present, replace between them (idempotent path).
  const markerRe = new RegExp(`${escapeRe(SSG_START)}[\\s\\S]*?${escapeRe(SSG_END)}`);
  if (markerRe.test(html)) {
    const replacement = `${SSG_START}\n${innerContent}\n        ${SSG_END}`;
    return html.replace(markerRe, replacement);
  }

  // Step 2: find the grid container by id, with empty body.
  // We require the pattern `<div ... id="ID" ...></div>` with only whitespace between.
  // This is how artikel.html, topik/*.html, and injectIndex's inserted section shape grids.
  const emptyGridRe = new RegExp(
    `(<div[^>]*\\bid="${escapeRe(gridIdValue)}"[^>]*)(>)(\\s*)(</div>)`
  );
  const m = html.match(emptyGridRe);
  if (m) {
    let openTag = m[1];
    if (!/data-ssg=/.test(openTag)) openTag += ' data-ssg="1"';
    const newBlock = `${openTag}${m[2]}${SSG_START}\n${innerContent}\n        ${SSG_END}${m[4]}`;
    return html.replace(emptyGridRe, newBlock);
  }

  // Step 3: non-empty grid without markers → bail. Tell caller to manually reset.
  throw new Error(`grid #${gridIdValue}: not empty and no SSG markers — refusing to inject (manual reset needed)`);
}

// --- Inject into artikel.html ---
function injectArtikel(articles) {
  const file = path.join(ROOT, 'artikel.html');
  let html = fs.readFileSync(file, 'utf8');

  const sorted = [...articles].sort((a, b) => parseIndoDate(b.date) - parseIndoDate(a.date));
  const cardsHtml = sorted.map(a => renderCard(a, '')).join('\n');

  html = injectIntoGrid(html, 'articleGrid', cardsHtml);
  html = injectNavbar(html, { basePath: '', active: 'artikel' });
  html = injectFooter(html, { basePath: '' });
  // ItemList: top 20 newest (spec says ringan untuk listing page)
  html = injectItemList(html, 'Artikel Terbaru SIKATIN', sorted.slice(0, 20));

  return { file, html };
}

// --- Inject into topik/*.html ---
function injectTopik(articles, categoryName, fileName) {
  const file = path.join(ROOT, 'topik', fileName);
  let html = fs.readFileSync(file, 'utf8');

  const filtered = articles
    .filter(a => a.category === categoryName)
    .sort((a, b) => parseIndoDate(b.date) - parseIndoDate(a.date));

  const basePath = '../';

  let cardsHtml;
  if (filtered.length === 0) {
    cardsHtml = `            <div class="empty-state" style="grid-column: 1 / -1; text-align:center; padding:80px 20px; color:var(--text-muted);">
                <h3 style="margin:8px 0;font-size:1.3rem;">Belum Ada Artikel</h3>
                <p style="max-width:500px;margin:0 auto;">Belum ada artikel di kategori <strong>${escHtml(categoryName)}</strong>. Pantau terus halaman ini untuk konten terbaru.</p>
                <a href="${basePath}artikel.html" class="btn-primary" style="margin-top:24px;display:inline-block;">Lihat Artikel Lain</a>
            </div>`;
  } else {
    cardsHtml = filtered.map(a => renderCard(a, basePath)).join('\n');
  }

  html = injectIntoGrid(html, 'topicArticles', cardsHtml);
  html = patchTopikInlineScript(html);
  html = injectNavbar(html, { basePath, active: 'topik' });
  html = injectFooter(html, { basePath });
  // ItemList: all articles in this category
  html = injectItemList(html, `Artikel ${categoryName}`, filtered);

  return { file, html };
}

// Idempotent patch of the inline script: skip `grid.innerHTML = ...` when data-ssg="1"
function patchTopikInlineScript(html) {
  // Match: `const grid = document.getElementById('topicArticles');\n<whitespace>grid.innerHTML = `
  const re = /(const\s+grid\s*=\s*document\.getElementById\('topicArticles'\);)(\s*)(grid\.innerHTML\s*=)/;
  if (!re.test(html)) return html;
  // Already patched?
  if (/grid\.dataset\.ssg\s*===\s*'1'/.test(html)) return html;
  return html.replace(re, `$1$2if (grid.dataset.ssg !== '1') $3`);
}

// --- Inject into index.html (9 latest, new section) ---
function injectIndex(articles) {
  const file = path.join(ROOT, 'index.html');
  let html = fs.readFileSync(file, 'utf8');

  const latest = [...articles]
    .sort((a, b) => parseIndoDate(b.date) - parseIndoDate(a.date))
    .slice(0, 9);

  const cardsHtml = latest.map(a => renderCard(a, '')).join('\n');

  // Idempotent: if section already exists, replace wholesale. Otherwise insert.
  const existingRe = /<!-- Latest Articles \(SSR for SEO\) -->[\s\S]*?<!-- \/Latest Articles -->/;
  const newSection = `<!-- Latest Articles (SSR for SEO) -->
    <section class="section-padding" id="latestArticlesSection">
        <div class="container">
            <div class="section-title-bar" style="margin-bottom:32px;">
                <h2>Artikel Terbaru</h2>
                <div class="title-line"></div>
            </div>
            <div class="article-grid" id="latestArticles" data-ssg="1">${SSG_START}
${cardsHtml}
        ${SSG_END}</div>
            <div style="text-align:center;margin-top:32px;">
                <a href="artikel.html" class="btn btn-primary"><span>Lihat Semua Artikel</span></a>
            </div>
        </div>
    </section>
    <!-- /Latest Articles -->`;

  if (existingRe.test(html)) {
    html = html.replace(existingRe, newSection);
  } else {
    const anchor = '<!-- Dynamic Topic Sections (ordered by trending score) -->';
    if (!html.includes(anchor)) throw new Error('index.html: dynamic sections anchor not found');
    html = html.replace(anchor, newSection + '\n\n    ' + anchor);
  }

  html = injectNavbar(html, { basePath: '', active: 'beranda' });
  html = injectFooter(html, { basePath: '' });
  // ItemList: 9 latest featured on homepage
  html = injectItemList(html, 'Artikel Terbaru', latest);

  return { file, html };
}

// --- Common: inject navbar/footer into a page ---
// Marker-based idempotent inject into a placeholder div with given id.
function injectIntoPlaceholder(html, idValue, innerHtml, startMarker, endMarker) {
  // Idempotent path: replace between markers anywhere.
  const markerRe = new RegExp(`${escapeRe(startMarker)}[\\s\\S]*?${escapeRe(endMarker)}`);
  if (markerRe.test(html)) {
    return html.replace(markerRe, `${startMarker}\n${innerHtml}\n    ${endMarker}`);
  }
  // Empty placeholder path: <div id="ID"[attrs]></div> with only whitespace between.
  const emptyRe = new RegExp(
    `(<div[^>]*\\bid="${escapeRe(idValue)}"[^>]*)(>)(\\s*)(</div>)`
  );
  const m = html.match(emptyRe);
  if (!m) return html; // not present on this page
  let openTag = m[1];
  if (!/data-ssg=/.test(openTag)) openTag += ' data-ssg="1"';
  return html.replace(emptyRe, `${openTag}${m[2]}${startMarker}\n${innerHtml}\n    ${endMarker}${m[4]}`);
}

function injectNavbar(html, ctx) {
  const rendered = renderNav(loadTemplate('navbar.html'), ctx).trimEnd();
  return injectIntoPlaceholder(
    html, 'navbar-placeholder', rendered,
    '<!-- SSG:NAVBAR:START -->', '<!-- SSG:NAVBAR:END -->'
  );
}

// --- ItemList JSON-LD injector ---
// Injects a minimal ItemList (position + url) for listing pages.
// Placed just before </head>. Idempotent via SSG:ITEMLIST markers.
function buildItemListLd(name, articleList) {
  const items = articleList.map((a, i) => ({
    "@type": "ListItem",
    "position": i + 1,
    "url": `https://sikatin.com/${a.url.replace(/^\//, '')}`
  }));
  return JSON.stringify({
    "@context": "https://schema.org",
    "@type": "ItemList",
    "name": name,
    "itemListElement": items
  }, null, 2);
}

function injectItemList(html, name, articleList) {
  const ld = buildItemListLd(name, articleList);
  const block = `${ITEMLIST_START}\n<script type="application/ld+json">${ld}</script>\n${ITEMLIST_END}`;

  // Idempotent: replace between markers if present
  const markerRe = new RegExp(`${escapeRe(ITEMLIST_START)}[\\s\\S]*?${escapeRe(ITEMLIST_END)}`);
  if (markerRe.test(html)) {
    return html.replace(markerRe, block);
  }
  // First-time insert: right before </head>
  if (html.includes('</head>')) {
    return html.replace('</head>', `${block}\n</head>`);
  }
  return html;
}

function injectFooter(html, ctx) {
  const rendered = renderFooter(loadTemplate('footer.html'), ctx).trimEnd();
  return injectIntoPlaceholder(
    html, 'footer-placeholder', rendered,
    '<!-- SSG:FOOTER:START -->', '<!-- SSG:FOOTER:END -->'
  );
}

// --- Inject navbar + footer into individual article pages (T22) ---
// Article detail pages have navbar/footer placeholders but no SSG markers.
// Deep-render navbar+footer via existing template with basePath="../".
// SKIP listing cards / ItemList (not applicable to detail pages — they have
// Article schema + BreadcrumbList already from seo-fix.js).
function injectArticlePages() {
  const dir = path.join(ROOT, 'artikel');
  if (!fs.existsSync(dir)) return [];
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.html'));
  const results = [];
  for (const name of files) {
    const file = path.join(dir, name);
    let html = fs.readFileSync(file, 'utf8');
    const basePath = '../';
    html = injectNavbar(html, { basePath, active: 'artikel' });
    html = injectFooter(html, { basePath });
    results.push({ file, html });
  }
  return results;
}

// --- Main ---
function main() {
  const articles = loadArticles();
  console.log(`[inject-listing] loaded ${articles.length} articles`);

  const topikMap = [
    { name: 'Geopolitik', file: 'geopolitik.html' },
    { name: 'Self-Improvement', file: 'self-improvement.html' },
    { name: 'History', file: 'history.html' },
    { name: 'Engineering', file: 'engineering.html' },
    { name: 'Sepakbola', file: 'sepakbola.html' },
  ];

  const results = [];
  results.push(injectArtikel(articles));
  results.push(injectIndex(articles));
  for (const t of topikMap) results.push(injectTopik(articles, t.name, t.file));
  // T22: navbar+footer SSG untuk 117 individual artikel pages
  results.push(...injectArticlePages());

  let changed = 0;
  for (const r of results) {
    const orig = fs.readFileSync(r.file, 'utf8');
    if (orig === r.html) {
      console.log(`[unchanged] ${path.relative(ROOT, r.file).replace(/\\/g,'/')}`);
      continue;
    }
    if (WRITE) {
      fs.writeFileSync(r.file, r.html, 'utf8');
      console.log(`[write]     ${path.relative(ROOT, r.file).replace(/\\/g,'/')} — ${r.html.length - orig.length > 0 ? '+' : ''}${r.html.length - orig.length} bytes`);
    } else {
      console.log(`[dry]       ${path.relative(ROOT, r.file).replace(/\\/g,'/')} — would ${r.html.length - orig.length > 0 ? '+' : ''}${r.html.length - orig.length} bytes`);
    }
    changed++;
  }

  console.log(`\n=== inject-listing ${WRITE ? 'APPLIED' : 'DRY-RUN'} ===`);
  console.log(`Files ${WRITE ? 'written' : 'would change'}: ${changed}`);
  if (!WRITE) console.log('Re-run with --write to apply.');
}

if (require.main === module) main();
module.exports = { loadArticles, renderCard, injectArtikel, injectIndex, injectTopik };
