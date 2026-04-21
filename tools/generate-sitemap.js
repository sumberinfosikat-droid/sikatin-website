#!/usr/bin/env node
/**
 * SIKATIN — Sitemap Generator
 * ----------------------------
 * Reads js/articles-data.js (source of truth, currently 107 articles) and emits
 * a complete sitemap.xml that includes:
 *   - Static top-level pages
 *   - 4 topik pages
 *   - All articles from articlesData
 *
 * Each <url> includes <image:image> when an article has an image field.
 * Idempotent: safe to re-run. Today's date is the lastmod.
 *
 * Usage:  node tools/generate-sitemap.js
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const DATA = path.join(ROOT, 'js/articles-data.js');
const OUT = path.join(ROOT, 'sitemap.xml');
const BASE = 'https://sikatin.com';

// Today YYYY-MM-DD
const TODAY = new Date().toISOString().slice(0, 10);

// Load articlesData
const src = fs.readFileSync(DATA, 'utf-8');
const articlesData = (function () {
  const fn = new Function('s', 'with(s){' + src.replace(/^const /m, 'var ') + '; return articlesData;}');
  return fn({});
})();

console.log(`[sitemap] Loaded ${articlesData.length} articles from articles-data.js`);

// XML escape
function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

// Convert "10 April 2026" → "2026-04-10"
const MONTHS_ID = { 'januari':'01','februari':'02','maret':'03','april':'04','mei':'05','juni':'06','juli':'07','agustus':'08','september':'09','oktober':'10','november':'11','desember':'12' };
function dateToISO(s) {
  if (!s) return TODAY;
  const m = String(s).toLowerCase().trim().match(/^(\d{1,2})\s+([a-z]+)\s+(\d{4})$/);
  if (!m) return TODAY;
  const day = m[1].padStart(2, '0');
  const mon = MONTHS_ID[m[2]] || '01';
  return `${m[3]}-${mon}-${day}`;
}

// Build XML
let xml = '';
xml += '<?xml version="1.0" encoding="UTF-8"?>\n';
xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"\n';
xml += '        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n';

// Static pages
const staticPages = [
  { loc: '/', priority: '1.0', changefreq: 'daily' },
  { loc: '/artikel.html', priority: '0.9', changefreq: 'daily' },
  { loc: '/tentang.html', priority: '0.6', changefreq: 'monthly' },
  { loc: '/kontak.html', priority: '0.5', changefreq: 'monthly' },
  { loc: '/syarat.html', priority: '0.3', changefreq: 'yearly' },
  { loc: '/privasi.html', priority: '0.3', changefreq: 'yearly' },
  { loc: '/disclaimer.html', priority: '0.3', changefreq: 'yearly' },
  { loc: '/tim.html', priority: '0.6', changefreq: 'monthly' },
];
xml += '\n  <!-- Main Pages -->\n';
for (const p of staticPages) {
  xml += `  <url><loc>${BASE}${p.loc}</loc><lastmod>${TODAY}</lastmod><changefreq>${p.changefreq}</changefreq><priority>${p.priority}</priority></url>\n`;
}

// Topik pages
const topikPages = ['geopolitik', 'self-improvement', 'history', 'engineering', 'sepakbola'];
xml += '\n  <!-- Topik Pages -->\n';
for (const t of topikPages) {
  xml += `  <url><loc>${BASE}/topik/${t}.html</loc><lastmod>${TODAY}</lastmod><changefreq>weekly</changefreq><priority>0.8</priority></url>\n`;
}

// Articles
xml += `\n  <!-- Articles (${articlesData.length} total) -->\n`;
for (const a of articlesData) {
  const url = a.url ? (a.url.startsWith('/') ? a.url : '/' + a.url) : `/artikel/${a.id}.html`;
  const lastmod = dateToISO(a.date);
  const img = a.image ? (a.image.startsWith('/') ? a.image : '/' + a.image) : null;
  xml += '  <url>\n';
  xml += `    <loc>${BASE}${url}</loc><lastmod>${lastmod}</lastmod><changefreq>monthly</changefreq><priority>0.8</priority>\n`;
  if (img) {
    xml += `    <image:image><image:loc>${BASE}${img}</image:loc><image:title>${esc(a.title || a.id)}</image:title></image:image>\n`;
  }
  xml += '  </url>\n';
}

xml += '\n</urlset>\n';

fs.writeFileSync(OUT, xml, 'utf-8');
const urlCount = (xml.match(/<loc>/g) || []).length;
console.log(`[sitemap] Wrote ${OUT}`);
console.log(`[sitemap] Total <url> entries: ${urlCount}`);
console.log(`[sitemap] Breakdown: ${staticPages.length} static + ${topikPages.length} topik + ${articlesData.length} articles = ${staticPages.length + topikPages.length + articlesData.length}`);
