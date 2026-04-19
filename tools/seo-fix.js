#!/usr/bin/env node
/**
 * SIKATIN SEO Auto-Fixer — idempotent fixes for all common SEO issues.
 *
 * Fixes:
 *  1. JSON-LD: relative image → absolute URL
 *  2. JSON-LD: non-ISO datePublished → ISO 8601
 *  3. JSON-LD: date-only (YYYY-MM-DD) → ISO 8601 with +07:00 WIB timezone
 *  4. JSON-LD: add missing dateModified, mainEntityOfPage, publisher.logo
 *  5. JSON-LD: derive missing image from slug
 *  6. JSON-LD: add author.url (→ /tentang.html) when missing on Organization author
 *  7. JSON-LD: add BreadcrumbList schema (separate script block) for articles
 *  8. Meta: add missing og:url, twitter:image, og:image
 *  9. Meta: derive full twitter:* cluster (card+title+desc+image) from og:* when missing
 * 10. Meta: normalize twitter:card "summary" → "summary_large_image"
 * 11. Meta: normalize title suffix " | SIKATIN" → " - SIKATIN" (consistency)
 * 12. Meta: derive keywords from JSON-LD.keywords or articles-data.js tags
 * 13. Meta: truncate descriptions >160 chars at word boundary (T6 B2)
 *
 * Usage:
 *   node tools/seo-fix.js           # dry-run (prints what would change)
 *   node tools/seo-fix.js --write   # apply changes
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const DOMAIN = 'https://sikatin.com';
const LOGO = DOMAIN + '/logo/BASE%20LOGO.png';
const EXCLUDE = /BACKUP|node_modules|_raw|LAPORAN-DEVELOPMENT/;
const INCLUDE_DIRS = ['', 'artikel', 'topik'];

// Category → topik page slug (only categories with actual /topik/<slug>.html page)
// Existence check done at runtime below so new topik pages are auto-detected.
const CATEGORY_TO_SLUG = {
  'Geopolitik': 'geopolitik',
  'Self-Improvement': 'self-improvement',
  'History': 'history',
  'Engineering': 'engineering',
  'Sepakbola': 'sepakbola',
};

const WRITE = process.argv.includes('--write');

const INDO_MONTHS = {
  Januari: '01', Februari: '02', Maret: '03', April: '04', Mei: '05', Juni: '06',
  Juli: '07', Agustus: '08', September: '09', Oktober: '10', November: '11', Desember: '12'
};

function indoToIso(s) {
  const m = String(s).trim().match(/^(\d{1,2})\s+(\w+)\s+(\d{4})$/);
  if (!m) return null;
  const mo = INDO_MONTHS[m[2]];
  if (!mo) return null;
  return `${m[3]}-${mo}-${m[1].padStart(2, '0')}`;
}

function collectFiles() {
  const out = [];
  for (const d of INCLUDE_DIRS) {
    const dir = path.join(ROOT, d);
    if (!fs.existsSync(dir)) continue;
    for (const f of fs.readdirSync(dir)) {
      if (!f.endsWith('.html')) continue;
      if (EXCLUDE.test(f)) continue;
      out.push(path.join(dir, f));
    }
  }
  return out;
}

function rel(p) { return path.relative(ROOT, p).replace(/\\/g, '/'); }

function extractCanonical(html) {
  const m = html.match(/<link\s+rel=["']canonical["']\s+href=["']([^"']+)["']/i);
  return m ? m[1] : null;
}

function extractOgImage(html) {
  const m = html.match(/<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']/i);
  return m ? m[1] : null;
}

function extractTitle(html) {
  const m = html.match(/<title>([^<]+)<\/title>/i);
  return m ? m[1] : '';
}

function extractDesc(html) {
  const m = html.match(/<meta\s+name=["']description["']\s+content=["']([^"']+)["']/i);
  return m ? m[1] : '';
}

function fixJsonLd(html, slug) {
  const re = /(<script[^>]*type=["']application\/ld\+json["'][^>]*>)([\s\S]*?)(<\/script>)/;
  const m = html.match(re);
  if (!m) return { html, changes: [] };

  let ld;
  try { ld = JSON.parse(m[2]); } catch (e) {
    return { html, changes: [] }; // skip unparseable
  }

  const changes = [];

  // Fix image path (relative → absolute)
  if (typeof ld.image === 'string' && !ld.image.startsWith('http')) {
    const clean = ld.image.replace(/^\.\.\//, '').replace(/^\//, '');
    ld.image = DOMAIN + '/' + clean;
    changes.push('ld-image-absolute');
  }

  // Add image when missing — derive from slug if img file exists
  if (!ld.image && slug) {
    const imgPath = path.join(ROOT, 'img', 'artikel', slug + '.jpg');
    if (fs.existsSync(imgPath)) {
      ld.image = `${DOMAIN}/img/artikel/${slug}.jpg`;
      changes.push('ld-image-derived');
    }
  }

  // Fix datePublished (Indonesian → ISO)
  if (ld.datePublished && !/^\d{4}-\d{2}-\d{2}/.test(ld.datePublished)) {
    const iso = indoToIso(ld.datePublished);
    if (iso) { ld.datePublished = iso; changes.push('ld-date-iso'); }
  }

  // Normalize date-only (YYYY-MM-DD) → ISO 8601 with WIB timezone (+07:00)
  // Google Rich Results wants full ISO 8601 with timezone offset.
  // datePublished → 00:00:00, dateModified → 12:00:00 (to signal different moment)
  if (/^\d{4}-\d{2}-\d{2}$/.test(ld.datePublished)) {
    ld.datePublished = `${ld.datePublished}T00:00:00+07:00`;
    changes.push('ld-date-tz-published');
  }

  // Add dateModified
  if (!ld.dateModified && ld.datePublished) {
    // derive from datePublished but mark as different time
    const base = ld.datePublished.slice(0, 10);
    ld.dateModified = `${base}T12:00:00+07:00`;
    changes.push('ld-dateModified');
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(ld.dateModified)) {
    ld.dateModified = `${ld.dateModified}T12:00:00+07:00`;
    changes.push('ld-date-tz-modified');
  }

  // Add mainEntityOfPage — only for Article schema
  if (ld['@type'] === 'Article' && !ld.mainEntityOfPage && slug) {
    ld.mainEntityOfPage = { "@type": "WebPage", "@id": `${DOMAIN}/artikel/${slug}.html` };
    changes.push('ld-mainEntityOfPage');
  }

  // Add publisher.logo — only when publisher is object (Article/WebSite schemas)
  if (ld.publisher && typeof ld.publisher === 'object' && !ld.publisher.logo) {
    ld.publisher.logo = { "@type": "ImageObject", "url": LOGO };
    changes.push('ld-publisher-logo');
  }

  // Add author.url — only for Article schema with Organization author
  if (ld['@type'] === 'Article' && ld.author && typeof ld.author === 'object' && !ld.author.url) {
    ld.author.url = `${DOMAIN}/tentang.html`;
    changes.push('ld-author-url');
  }

  if (!changes.length) return { html, changes };

  const newLd = JSON.stringify(ld, null, 2);
  const newHtml = html.replace(re, `$1${newLd}$3`);
  return { html: newHtml, changes };
}

function addMetaTags(html, canonical) {
  let changed = [];

  // Get og:image or derive from JSON-LD or fallback to slug-based image
  let ogImage = extractOgImage(html);
  if (!ogImage) {
    const ldM = html.match(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/);
    if (ldM) {
      try {
        const ld = JSON.parse(ldM[1]);
        if (typeof ld.image === 'string') ogImage = ld.image.startsWith('http') ? ld.image : null;
      } catch (e) {}
    }
  }
  // Derive from slug if this is an article page and we have an image file
  if (!ogImage && canonical && canonical.includes('/artikel/')) {
    const slug = path.basename(canonical, '.html');
    const imgPath = path.join(ROOT, 'img', 'artikel', slug + '.jpg');
    if (fs.existsSync(imgPath)) ogImage = `${DOMAIN}/img/artikel/${slug}.jpg`;
  }
  // Topik pages: use logo as fallback
  if (!ogImage && canonical && canonical.includes('/topik/')) {
    ogImage = LOGO;
  }

  const title = extractTitle(html);
  const desc = extractDesc(html);

  // Insert missing tags just before </head> if not present.
  // We insert after canonical if present, else before </head>.
  const insertions = [];

  if (!/<meta\s+property=["']og:url["']/i.test(html) && canonical) {
    insertions.push(`<meta property="og:url" content="${canonical}">`);
    changed.push('og:url');
  }
  if (!/<meta\s+property=["']og:image["']/i.test(html) && ogImage) {
    insertions.push(`<meta property="og:image" content="${ogImage}">`);
    changed.push('og:image');
  }
  if (!/<meta\s+name=["']twitter:image["']/i.test(html) && ogImage) {
    insertions.push(`<meta name="twitter:image" content="${ogImage}">`);
    changed.push('twitter:image');
  }
  if (!/<meta\s+property=["']og:title["']/i.test(html) && title) {
    insertions.push(`<meta property="og:title" content="${title.replace(/"/g, '&quot;')}">`);
    changed.push('og:title');
  }
  if (!/<meta\s+property=["']og:description["']/i.test(html) && desc) {
    insertions.push(`<meta property="og:description" content="${desc.replace(/"/g, '&quot;')}">`);
    changed.push('og:description');
  }
  if (!/<meta\s+property=["']og:type["']/i.test(html)) {
    insertions.push(`<meta property="og:type" content="article">`);
    changed.push('og:type');
  }

  // A1: Ensure full twitter:* cluster exists (card+title+description+image).
  // Derive from og:* or title/desc. Only add missing ones.
  const ogTitle = (html.match(/<meta\s+property=["']og:title["']\s+content=["']([^"']+)["']/i) || [])[1] || title;
  const ogDesc = (html.match(/<meta\s+property=["']og:description["']\s+content=["']([^"']+)["']/i) || [])[1] || desc;

  if (!/<meta\s+name=["']twitter:card["']/i.test(html)) {
    insertions.push(`<meta name="twitter:card" content="summary_large_image">`);
    changed.push('twitter:card');
  }
  if (!/<meta\s+name=["']twitter:title["']/i.test(html) && ogTitle) {
    insertions.push(`<meta name="twitter:title" content="${ogTitle.replace(/"/g, '&quot;')}">`);
    changed.push('twitter:title');
  }
  if (!/<meta\s+name=["']twitter:description["']/i.test(html) && ogDesc) {
    insertions.push(`<meta name="twitter:description" content="${ogDesc.replace(/"/g, '&quot;')}">`);
    changed.push('twitter:description');
  }

  if (!insertions.length) return { html, changes: [] };

  const block = insertions.join('\n    ');
  const newHtml = html.replace('</head>', `    ${block}\n</head>`);
  return { html: newHtml, changes: changed };
}

// Normalize twitter:card "summary" → "summary_large_image"
function normalizeTwitterCard(html) {
  const re = /(<meta\s+name=["']twitter:card["']\s+content=["'])summary(["'][^>]*>)/i;
  if (!re.test(html)) return { html, changes: [] };
  return { html: html.replace(re, '$1summary_large_image$2'), changes: ['twitter-card-normalize'] };
}

// Normalize title suffix " | SIKATIN" → " - SIKATIN" across <title>, og:title, twitter:title
function normalizeTitleSuffix(html) {
  if (!/ \| SIKATIN/.test(html)) return { html, changes: [] };
  const out = html
    .replace(/(<title>[^<]*?) \| SIKATIN(<\/title>)/, '$1 - SIKATIN$2')
    .replace(/(<meta\s+property=["']og:title["']\s+content=["'][^"']*?) \| SIKATIN(["'][^>]*>)/gi, '$1 - SIKATIN$2')
    .replace(/(<meta\s+name=["']twitter:title["']\s+content=["'][^"']*?) \| SIKATIN(["'][^>]*>)/gi, '$1 - SIKATIN$2');
  if (out === html) return { html, changes: [] };
  return { html: out, changes: ['title-suffix-normalize'] };
}

// Add <meta name="keywords"> derived from articles-data.js tags when missing (article pages only)
function addKeywordsMeta(html, slug) {
  if (/<meta\s+name=["']keywords["']/i.test(html)) return { html, changes: [] };
  const map = getArticlesDataMap();
  const entry = map[slug];
  if (!entry || !Array.isArray(entry.tags) || !entry.tags.length) return { html, changes: [] };
  const keywords = entry.tags.join(', ');
  const tag = `<meta name="keywords" content="${keywords.replace(/"/g, '&quot;')}">`;
  // Insert after <meta name="description">, or before </head>
  if (/<meta\s+name=["']description["'][^>]*>/i.test(html)) {
    return { html: html.replace(/(<meta\s+name=["']description["'][^>]*>)/i, `$1\n    ${tag}`), changes: ['keywords-add'] };
  }
  return { html: html.replace('</head>', `    ${tag}\n</head>`), changes: ['keywords-add'] };
}

// B1 α.1: Strip " - SIKATIN" suffix from og:title and twitter:title
// ONLY when main-title (without suffix) is ≤60 chars. Keep <title> tag unchanged
// so browser tab retains brand suffix. This optimizes social share cards where
// suffix would cause Google/Twitter to truncate.
function stripSocialTitleSuffix(html) {
  const SUFFIX = ' - SIKATIN';
  const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
  if (!titleMatch) return { html, changes: [] };
  const fullTitle = titleMatch[1];
  if (!fullTitle.endsWith(SUFFIX)) return { html, changes: [] };
  const mainTitle = fullTitle.slice(0, -SUFFIX.length);
  // Only strip if main fits but full doesn't
  if (mainTitle.length > 60 || fullTitle.length <= 60) return { html, changes: [] };

  const changes = [];
  let out = html;
  // og:title: strip suffix if currently ends with " - SIKATIN"
  out = out.replace(
    /(<meta\s+property=["']og:title["']\s+content=["'])([^"']+?) - SIKATIN(["'][^>]*>)/i,
    (m, pre, t, post) => { changes.push('og:title-strip'); return `${pre}${t}${post}`; }
  );
  // twitter:title: same
  out = out.replace(
    /(<meta\s+name=["']twitter:title["']\s+content=["'])([^"']+?) - SIKATIN(["'][^>]*>)/i,
    (m, pre, t, post) => { changes.push('twitter:title-strip'); return `${pre}${t}${post}`; }
  );
  return { html: out, changes };
}

// Truncate descriptions >160 chars at word boundary (target 155-160).
// Applies to meta description, og:description, twitter:description in sync.
function truncateAtWordBoundary(s, maxLen = 160) {
  if (s.length <= maxLen) return s;
  // Try word boundary between 150-157
  const soft = s.lastIndexOf(' ', 157);
  let cut = (soft >= 140) ? soft : 157;
  let result = s.slice(0, cut).replace(/[,;:]+$/, '').trim();
  // If the result ends with sentence-ending punctuation, no ellipsis needed
  if (/[.!?]$/.test(result)) return result;
  // Add ellipsis (3 chars) — ensure total ≤160
  if (result.length > 157) result = result.slice(0, 157).trim();
  return result + '...';
}

function truncateDescriptions(html) {
  const descRe = /(<meta\s+name=["']description["']\s+content=["'])([^"']+)(["'][^>]*>)/i;
  const m = html.match(descRe);
  if (!m) return { html, changes: [] };
  const orig = m[2];
  if (orig.length <= 160) return { html, changes: [] };
  const truncated = truncateAtWordBoundary(orig, 160);
  // Replace also in og:description + twitter:description (if they match orig)
  const ogRe = /(<meta\s+property=["']og:description["']\s+content=["'])([^"']+)(["'][^>]*>)/i;
  const twRe = /(<meta\s+name=["']twitter:description["']\s+content=["'])([^"']+)(["'][^>]*>)/i;
  let out = html.replace(descRe, `$1${truncated}$3`);
  const ogM = out.match(ogRe);
  if (ogM && ogM[2] === orig) out = out.replace(ogRe, `$1${truncated}$3`);
  const twM = out.match(twRe);
  if (twM && twM[2] === orig) out = out.replace(twRe, `$1${truncated}$3`);
  return { html: out, changes: ['desc-truncate'] };
}

// Lazy-loaded articles-data.js map: slug → category (used as fallback when
// Article schema doesn't include articleSection).
let _articlesDataMap = null;
function getArticlesDataMap() {
  if (_articlesDataMap) return _articlesDataMap;
  try {
    const src = fs.readFileSync(path.join(ROOT, 'js', 'articles-data.js'), 'utf8');
    const fn = new Function(`${src}; return (typeof articlesData !== 'undefined') ? articlesData : null;`);
    const data = fn();
    _articlesDataMap = {};
    if (Array.isArray(data)) {
      for (const a of data) {
        if (a && a.id) _articlesDataMap[a.id] = a;
      }
    }
  } catch (e) {
    _articlesDataMap = {};
  }
  return _articlesDataMap;
}

// Build BreadcrumbList JSON-LD. Returns object (not stringified).
// Category resolution order:
//   1. articleSection from Article JSON-LD
//   2. category from articles-data.js (fallback for hand-written articles)
// If category has no topik page, skip level 2 → Beranda → Judul.
function buildBreadcrumb(article, slug) {
  const items = [
    { "@type": "ListItem", "position": 1, "name": "Beranda", "item": `${DOMAIN}/` }
  ];

  // Resolve category: prefer articleSection, fallback to articles-data lookup
  let cat = article.articleSection;
  let headline = article.headline;
  if (!cat) {
    const dataMap = getArticlesDataMap();
    const entry = dataMap[slug];
    if (entry) {
      cat = entry.category;
      if (!headline) headline = entry.title;
    }
  }

  const catSlug = cat && CATEGORY_TO_SLUG[cat];
  if (catSlug) {
    const topikFile = path.join(ROOT, 'topik', `${catSlug}.html`);
    if (fs.existsSync(topikFile)) {
      items.push({
        "@type": "ListItem",
        "position": 2,
        "name": cat,
        "item": `${DOMAIN}/topik/${catSlug}.html`
      });
    }
  }
  items.push({
    "@type": "ListItem",
    "position": items.length + 1,
    "name": headline || slug,
    "item": `${DOMAIN}/artikel/${slug}.html`
  });
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": items
  };
}

function addBreadcrumb(html, slug) {
  // Only applies to article pages.
  // Idempotent: skip if BreadcrumbList already present.
  if (/"@type"\s*:\s*"BreadcrumbList"/.test(html)) return { html, changes: [] };

  // Need Article schema to derive data (headline + articleSection).
  const ldMatches = [...html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/g)];
  let article = null;
  for (const m of ldMatches) {
    try {
      const obj = JSON.parse(m[1]);
      if (obj['@type'] === 'Article') { article = obj; break; }
    } catch (e) { /* skip unparseable */ }
  }
  if (!article) return { html, changes: [] };

  const breadcrumb = buildBreadcrumb(article, slug);
  const ldJson = JSON.stringify(breadcrumb, null, 2);
  const block = `<script type="application/ld+json">${ldJson}</script>`;

  // Insert immediately after the Article schema's closing </script>
  // Use the first matched Article LD as anchor
  const firstMatch = ldMatches.find(m => {
    try { return JSON.parse(m[1])['@type'] === 'Article'; } catch (e) { return false; }
  });
  if (!firstMatch) return { html, changes: [] };
  const anchor = firstMatch[0]; // full <script>...</script>
  const newHtml = html.replace(anchor, `${anchor}\n${block}`);
  return { html: newHtml, changes: ['ld-breadcrumb-add'] };
}

function fixFile(file) {
  let html = fs.readFileSync(file, 'utf8');
  const orig = html;
  const slug = path.basename(file, '.html');
  const canonical = extractCanonical(html) || (file.includes(path.sep + 'artikel' + path.sep) ? `${DOMAIN}/artikel/${slug}.html` : null);

  const changes = [];

  const r1 = fixJsonLd(html, slug);
  html = r1.html; changes.push(...r1.changes);

  const r2 = addMetaTags(html, canonical);
  html = r2.html; changes.push(...r2.changes);

  // T6 A2: normalize twitter:card "summary" → "summary_large_image"
  const rTc = normalizeTwitterCard(html);
  html = rTc.html; changes.push(...rTc.changes);

  // T6 A3a: normalize title suffix " | SIKATIN" → " - SIKATIN"
  const rTs = normalizeTitleSuffix(html);
  html = rTs.html; changes.push(...rTs.changes);

  // T6 A3b: derive keywords from articles-data.js tags (article pages)
  if (file.includes(path.sep + 'artikel' + path.sep)) {
    const rKw = addKeywordsMeta(html, slug);
    html = rKw.html; changes.push(...rKw.changes);
  }

  // T6 B1 α.1: strip " - SIKATIN" from og:title/twitter:title when main ≤60ch
  // (only for article pages — listing pages already have short titles)
  if (file.includes(path.sep + 'artikel' + path.sep)) {
    const rSt = stripSocialTitleSuffix(html);
    html = rSt.html; changes.push(...rSt.changes);
  }

  // T6 B2: truncate descriptions >160 chars
  const rDt = truncateDescriptions(html);
  html = rDt.html; changes.push(...rDt.changes);

  // BreadcrumbList — only for article pages
  if (file.includes(path.sep + 'artikel' + path.sep)) {
    const r3 = addBreadcrumb(html, slug);
    html = r3.html; changes.push(...r3.changes);
  }

  // For topik pages: ensure og:url points to /topik/<slug>.html
  if (file.includes(path.sep + 'topik' + path.sep)) {
    const topikCanon = `${DOMAIN}/topik/${slug}.html`;
    if (!/<meta\s+property=["']og:url["']/i.test(html)) {
      html = html.replace('</head>', `    <meta property="og:url" content="${topikCanon}">\n</head>`);
      changes.push('og:url(topik)');
    }
    if (!/<link\s+rel=["']canonical["']/i.test(html)) {
      html = html.replace('</head>', `    <link rel="canonical" href="${topikCanon}">\n</head>`);
      changes.push('canonical(topik)');
    }
  }

  if (html === orig) return null;
  return { file, changes, html };
}

function main() {
  const files = collectFiles();
  const summary = { written: 0, unchanged: 0, byChange: {} };

  for (const f of files) {
    const r = fixFile(f);
    if (!r) { summary.unchanged++; continue; }
    for (const c of r.changes) summary.byChange[c] = (summary.byChange[c] || 0) + 1;
    if (WRITE) {
      fs.writeFileSync(f, r.html, 'utf8');
      summary.written++;
    }
    console.log(`${WRITE ? '[write]' : '[dry]  '} ${rel(f)} — ${r.changes.join(', ')}`);
  }

  console.log(`\n=== seo-fix ${WRITE ? 'APPLIED' : 'DRY-RUN'} ===`);
  console.log(`Files ${WRITE ? 'written' : 'would change'}: ${Object.keys(summary.byChange).length ? summary.written || (files.length - summary.unchanged) : 0}`);
  console.log(`Unchanged: ${summary.unchanged}`);
  console.log('Changes by type:');
  for (const [k, v] of Object.entries(summary.byChange).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${k}: ${v}`);
  }
  if (!WRITE) console.log('\nRe-run with --write to apply.');
}

if (require.main === module) main();
module.exports = { fixFile, collectFiles };
