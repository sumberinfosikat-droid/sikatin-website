#!/usr/bin/env node
/**
 * SIKATIN Article Template Builder v2
 * ------------------------------------
 * Full-featured article generator matching the hand-crafted article standard.
 * Includes: page-hero, gradient banner, ad slots (3), share buttons,
 * related articles, sources, article-sidebar, user-prefs.
 *
 * Usage:
 *   node tools/build-article.js specs/my-article.json
 *
 * Spec shape:
 * {
 *   "slug": "judul-artikel",
 *   "title": "Judul Artikel yang Menarik",
 *   "description": "Meta description 150-160 chars.",
 *   "category": "Teknologi",
 *   "tags": ["ai","pendidikan"],
 *   "date": "11 April 2026",
 *   "readTime": "6 min",
 *   "heroGradient": "teal",    // teal|purple|orange|blue|red|green|pink
 *   "heroEmoji": "📈",         // optional, default from category
 *   "intro": "Paragraf intro...",
 *   "sections": [
 *     { "h2": "Heading", "body": ["<p>...</p>", "<p>...</p>"] }
 *   ],
 *   "keyTakeaways": ["Poin 1","Poin 2","Poin 3"],
 *   "sources": ["BPS Indonesia (2026)", "Bank Indonesia (2026)"],
 *   "author": "Tim SIKATIN"
 * }
 */

const fs = require('fs');
const path = require('path');

function esc(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

const GRADIENT_MAP = {
  teal: 'gradient-fintech', purple: 'gradient-edu', orange: 'gradient-econ',
  blue: 'gradient-tech', red: 'gradient-econ', green: 'gradient-fintech',
  pink: 'gradient-mental'
};

const EMOJI_MAP = {
  Teknologi: '💻', Geopolitik: '🌍', 'Self-Improvement': '🧠',
  Pendidikan: '📚', History: '🏛️', Engineering: '⚙️', Sepakbola: '⚽'
};

function dateToISO(dateStr) {
  const months = { Januari:'01', Februari:'02', Maret:'03', April:'04', Mei:'05', Juni:'06',
    Juli:'07', Agustus:'08', September:'09', Oktober:'10', November:'11', Desember:'12' };
  const parts = dateStr.trim().split(/\s+/);
  if (parts.length === 3) {
    const [d, m, y] = parts;
    return `${y}-${months[m] || '01'}-${d.padStart(2, '0')}`;
  }
  return '2026-04-11';
}

function render(spec) {
  const {
    slug, title, description, category, tags = [], date, readTime = '5 min',
    heroGradient = 'teal', heroEmoji, intro = '', sections = [], keyTakeaways = [],
    sources = [], author = 'Tim SIKATIN'
  } = spec;

  if (!slug || !title || !description || !category || !date) {
    throw new Error('spec missing required fields (slug/title/description/category/date)');
  }

  const url = `https://sikatin.com/artikel/${slug}.html`;
  const isoDate = dateToISO(date);
  const emoji = heroEmoji || EMOJI_MAP[category] || '📄';
  const gradClass = GRADIENT_MAP[heroGradient] || 'gradient-fintech';

  // Sections HTML — insert ad after ~half
  const midIdx = Math.ceil(sections.length / 2);
  const sectionsHtml = sections.map((s, i) => {
    const body = Array.isArray(s.body) ? s.body.join('\n          ') : (s.body || '');
    let html = `        <h2>${esc(s.h2)}</h2>\n          ${body}`;
    if (i === midIdx - 1) {
      html += `\n\n        <div class="ad-slot ad-in-article"><ins class="adsbygoogle"
     style="display:block"
     data-ad-client="ca-pub-3699191026267367"
     data-ad-slot="6923878485"
     data-ad-format="fluid"
     data-full-width-responsive="true" data-ad-layout="in-article"></ins>
<script>(adsbygoogle = window.adsbygoogle || []).push({});</script></div>`;
    }
    return html;
  }).join('\n\n');

  const takeawayHtml = keyTakeaways.length
    ? `        <div class="key-takeaways">
            <h3>Poin Kunci</h3>
            <ul>${keyTakeaways.map(k => `<li>${esc(k)}</li>`).join('')}</ul>
        </div>` : '';

  const sourcesHtml = sources.length
    ? `        <h2>Sumber &amp; Referensi</h2>
        <ol style="font-size: 0.92rem; color: var(--text-secondary); line-height: 1.8;">
${sources.map(s => `            <li>${esc(s)}</li>`).join('\n')}
        </ol>` : '';

  const tagHtml = tags.map(t => `<a href="#">#${esc(t)}</a>`).join('\n            ');

  const jsonLd = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": title,
    "description": description,
    "datePublished": `${isoDate}T00:00:00+07:00`,
    "dateModified": `${isoDate}T12:00:00+07:00`,
    "image": `https://sikatin.com/img/artikel/${slug}.jpg`,
    "author": { "@type": "Organization", "name": author, "url": "https://sikatin.com/tim.html" },
    "publisher": {
      "@type": "Organization",
      "name": "SIKATIN",
      "logo": { "@type": "ImageObject", "url": "https://sikatin.com/logo/BASE%20LOGO.png" }
    },
    "mainEntityOfPage": { "@type": "WebPage", "@id": url },
    "articleSection": category,
    "keywords": tags.join(', ')
  }, null, 2);

  // BreadcrumbList — parallel JSON-LD block. Skip level 2 if category has no topik page.
  const topikSlugMap = {
    'Geopolitik': 'geopolitik', 'Self-Improvement': 'self-improvement', 'History': 'history',
    'Engineering': 'engineering', 'Sepakbola': 'sepakbola'
  };
  const topikSlug = topikSlugMap[category];
  const breadcrumbItems = [{ "@type": "ListItem", "position": 1, "name": "Beranda", "item": "https://sikatin.com/" }];
  if (topikSlug && fs.existsSync(path.resolve(__dirname, '..', 'topik', `${topikSlug}.html`))) {
    breadcrumbItems.push({ "@type": "ListItem", "position": 2, "name": category, "item": `https://sikatin.com/topik/${topikSlug}.html` });
  }
  breadcrumbItems.push({ "@type": "ListItem", "position": breadcrumbItems.length + 1, "name": title, "item": url });
  const breadcrumbLd = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": breadcrumbItems
  }, null, 2);

  return `<!DOCTYPE html>
<html lang="id">
<head>
<script id="cookieyes" type="text/javascript" src="https://cdn-cookieyes.com/client_data/d2864dd4e9980230e5bc74d9/script.js"></script>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1">
<title>${esc(title)} - SIKATIN</title>
<meta name="description" content="${esc(description)}">
<meta name="keywords" content="${esc(tags.join(', '))}">
<meta name="author" content="${esc(author)}">
<meta property="og:title" content="${esc(title)} - SIKATIN">
<meta property="og:description" content="${esc(description)}">
<meta property="og:type" content="article">
<meta property="og:image" content="https://sikatin.com/img/artikel/${slug}.jpg">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(description)}">
<link rel="canonical" href="${url}">
<link rel="icon" href="../logo/BASE%20LOGO.png" type="image/png">
<link rel="preload" href="../css/style.min.css?v=20260412a" as="style">
<link rel="preload" href="https://fonts.googleapis.com/css2?family=Big+Shoulders+Display:wght@400;600;700;800&family=Bricolage+Grotesque:wght@400;500;600;700&family=Manrope:wght@400;500;600;700&display=swap" as="style" onload="this.onload=null;this.rel='stylesheet'" crossorigin>
<noscript><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Big+Shoulders+Display:wght@400;600;700;800&family=Bricolage+Grotesque:wght@400;500;600;700&family=Manrope:wght@400;500;600;700&display=swap"></noscript>
<link rel="stylesheet" href="../css/style.min.css?v=20260412a">
<link rel="stylesheet" href="../css/components.min.css?v=20260412a">
<link rel="stylesheet" href="../css/animations.css?v=20260411" media="print" onload="this.media='all'">
<noscript><link rel="stylesheet" href="../css/animations.css?v=20260411"></noscript>
<script type="application/ld+json">${jsonLd}</script>
<script type="application/ld+json">${breadcrumbLd}</script>
<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-3699191026267367" crossorigin="anonymous"></script>
<!-- Google tag (gtag.js) -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-ZBJB8PED38"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-ZBJB8PED38');
</script>
</head>
<body>
    <div id="navbar-placeholder"></div>

    <section class="page-hero">
        <div class="container">
            <div class="hero-animate"><span class="section-label">${esc(category)}</span></div>
            <h1 class="article-title hero-animate-delay-1" style="text-transform: none; max-width: 800px; margin: 0 auto 16px;">${esc(title)}</h1>
            <p class="hero-animate-delay-2" style="display: flex; align-items: center; justify-content: center; gap: 16px; font-family: var(--font-ui); font-size: 0.9rem;">
                <span>${esc(date)}</span>
                <span style="width: 5px; height: 5px; background: var(--theme-color); border-radius: 50%; display: inline-block;"></span>
                <span>${esc(readTime)} baca</span>
            </p>
        </div>
    </section>

    <div class="article-hero-gradient">
        <div class="gradient-banner ${gradClass}">
            <span class="gradient-icon">${emoji}</span>
        </div>
    </div>

    <div class="ad-container">
        <div class="container">
            <div class="ad-slot ad-leaderboard"><ins class="adsbygoogle"
     style="display:block"
     data-ad-client="ca-pub-3699191026267367"
     data-ad-slot="9494201503"
     data-ad-format="auto"
     data-full-width-responsive="true"></ins>
<script>(adsbygoogle = window.adsbygoogle || []).push({});</script></div>
        </div>
    </div>

    <div class="article-content">
        <p>${intro}</p>

${sectionsHtml}

${takeawayHtml}

${sourcesHtml}

        <div class="article-tags">
            ${tagHtml}
        </div>

        <div class="share-section">
            <h4>Bagikan Artikel Ini</h4>
            <div class="share-buttons">
                <a href="#" class="share-btn" title="WhatsApp" onclick="window.open('https://wa.me/?text='+encodeURIComponent(document.title+' '+window.location.href),'_blank');return false;" style="background:rgba(37,211,102,0.1);border-color:rgba(37,211,102,0.3);"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#25d366" stroke-width="2"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg></a>
                <a href="#" class="share-btn" title="Twitter/X" onclick="window.open('https://twitter.com/intent/tweet?text='+encodeURIComponent(document.title)+'&url='+encodeURIComponent(window.location.href),'_blank');return false;"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4l11.733 16h4.267l-11.733 -16z"/><path d="M4 20l6.768 -6.768m2.46 -2.46l6.772 -6.772"/></svg></a>
                <a href="#" class="share-btn" title="Facebook" onclick="window.open('https://www.facebook.com/sharer/sharer.php?u='+encodeURIComponent(window.location.href),'_blank');return false;"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg></a>
                <a href="#" class="share-btn" title="LinkedIn" onclick="window.open('https://www.linkedin.com/sharing/share-offsite/?url='+encodeURIComponent(window.location.href),'_blank');return false;"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/><rect x="2" y="9" width="4" height="12"/><circle cx="4" cy="4" r="2"/></svg></a>
            </div>
        </div>
    </div>

    <div class="ad-container" style="background: var(--bg-secondary); border-top: 1.5px solid var(--border-color); padding: 24px 0;">
        <div class="container">
            <div class="ad-slot ad-responsive"><ins class="adsbygoogle"
     style="display:block"
     data-ad-client="ca-pub-3699191026267367"
     data-ad-slot="8045388465"
     data-ad-format="auto"
     data-full-width-responsive="true"></ins>
<script>(adsbygoogle = window.adsbygoogle || []).push({});</script></div>
        </div>
    </div>

    <!-- Comment Section -->
    <section class="section-padding" style="padding-top: 0;">
        <div class="sikatin-comments" data-article="${slug}"></div>
    </section>

    <section class="section-padding" style="background: var(--bg-secondary); border-top: 1.5px solid var(--border-color);">
        <div class="container">
            <div class="section-header text-center">
                <span class="section-label">Baca Juga</span>
                <h2>Artikel Terkait</h2>
            </div>
            <div class="article-grid" id="relatedArticles"></div>
        </div>
    </section>

    <div id="footer-placeholder"></div>

    <script defer src="../js/articles-data.js"></script>
    <script defer src="../js/related-articles.js"></script>
    <script defer src="../js/user-prefs.js"></script>
    <script defer src="../js/main.js?v=20260411e"></script>
    <script defer src="../js/theme-toggle.js?v=20260411f"></script>
    <script defer src="../js/article-sidebar.js"></script>
    <script defer src="../js/comments.js?v=20260411"></script>
    <script>
        document.addEventListener('DOMContentLoaded', () => {
            const container = document.getElementById('relatedArticles');
            if (!container || typeof articlesData === 'undefined') return;
            const related = (typeof getRelatedArticles === 'function') ? getRelatedArticles('${slug}', 3) : articlesData.filter(a => a.id !== '${slug}').slice(0, 3);
            container.innerHTML = related.map(article => \`
                <div class="card animate-on-scroll">
                    <div class="card-thumbnail"><img src="../\${article.image}" alt="\${article.title}" loading="lazy" onerror="this.parentElement.innerHTML='<div class=card-thumbnail-placeholder><svg xmlns=http://www.w3.org/2000/svg width=48 height=48 viewBox=&quot;0 0 24 24&quot; fill=none stroke=currentColor stroke-width=1><path d=&quot;M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z&quot;/><path d=&quot;M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z&quot;/></svg></div>'"></div>
                    <div class="card-body">
                        <span class="card-category">\${article.category}</span>
                        <h3>\${article.title}</h3>
                        <p>\${article.excerpt}</p>
                        <a href="../\${article.url}" class="card-link">Baca Selengkapnya →</a>
                    </div>
                </div>\`).join('');
        });
    </script>
</body>
</html>
`;
}

function main() {
  const specPath = process.argv[2];
  if (!specPath) {
    console.error('usage: node tools/build-article.js <spec.json>');
    process.exit(1);
  }
  const abs = path.resolve(specPath);
  const spec = JSON.parse(fs.readFileSync(abs, 'utf-8'));
  const html = render(spec);
  const outDir = path.resolve(__dirname, '..', 'artikel');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, `${spec.slug}.html`);
  fs.writeFileSync(outPath, html, 'utf-8');
  console.log(`[build-article] wrote ${outPath} (${html.length} bytes)`);
}

if (require.main === module) main();
module.exports = { render };
