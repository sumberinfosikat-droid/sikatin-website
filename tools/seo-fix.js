#!/usr/bin/env node
/**
 * SIKATIN SEO Auto-Fixer — idempotent fixes for all common SEO issues.
 *
 * Fixes:
 *  1. JSON-LD: relative image → absolute URL
 *  2. JSON-LD: non-ISO datePublished → ISO 8601
 *  3. JSON-LD: add missing dateModified, mainEntityOfPage, publisher.logo
 *  4. Meta: add missing og:url, twitter:image, og:image (from canonical + JSON-LD image)
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

  // Fix datePublished
  if (ld.datePublished && !/^\d{4}-\d{2}-\d{2}/.test(ld.datePublished)) {
    const iso = indoToIso(ld.datePublished);
    if (iso) { ld.datePublished = iso; changes.push('ld-date-iso'); }
  }

  // Add dateModified
  if (!ld.dateModified && ld.datePublished) {
    ld.dateModified = ld.datePublished;
    changes.push('ld-dateModified');
  }

  // Add mainEntityOfPage
  if (!ld.mainEntityOfPage && slug) {
    ld.mainEntityOfPage = { "@type": "WebPage", "@id": `${DOMAIN}/artikel/${slug}.html` };
    changes.push('ld-mainEntityOfPage');
  }

  // Add publisher.logo
  if (ld.publisher && !ld.publisher.logo) {
    ld.publisher.logo = { "@type": "ImageObject", "url": LOGO };
    changes.push('ld-publisher-logo');
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

  if (!insertions.length) return { html, changes: [] };

  const block = insertions.join('\n    ');
  const newHtml = html.replace('</head>', `    ${block}\n</head>`);
  return { html: newHtml, changes: changed };
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
