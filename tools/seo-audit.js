#!/usr/bin/env node
/**
 * SIKATIN SEO Audit — scans all HTML files and reports issues.
 * Exit code: 0 if clean, 1 if issues found.
 *
 * Usage:
 *   node tools/seo-audit.js             # human-readable report
 *   node tools/seo-audit.js --json      # machine-readable
 *   node tools/seo-audit.js --quiet     # exit code only
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const EXCLUDE = /BACKUP|node_modules|_raw|LAPORAN-DEVELOPMENT/;
const INCLUDE_DIRS = ['', 'artikel', 'topik'];

const ARGS = process.argv.slice(2);
const JSON_OUT = ARGS.includes('--json');
const QUIET = ARGS.includes('--quiet');

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

function audit(file) {
  const s = fs.readFileSync(file, 'utf8');
  const issues = [];
  const isArticle = file.includes(path.sep + 'artikel' + path.sep);
  const isTopik = file.includes(path.sep + 'topik' + path.sep);

  // Skip noindex pages — internal/admin tools shouldn't be audited for public SEO
  if (/<meta\s+name=["']robots["']\s+content=["'][^"']*noindex/i.test(s)) {
    return [];
  }

  // CRITICAL: broken DOM patterns
  if (/<span[^>]*class=["'][^"']*stat-number[^"']*["'][^>]*>\s*<div/.test(s)) {
    issues.push({ sev: 'CRITICAL', code: 'broken-dom', msg: 'stat-number span contains nested div' });
  }
  if (/<li[^>]*>[^<]*<h2[^>]*>/.test(s)) {
    issues.push({ sev: 'CRITICAL', code: 'broken-dom', msg: 'h2 nested inside li' });
  }
  const articleContentCount = (s.match(/class=["'][^"']*article-content[^"']*["']/g) || []).length;
  if (articleContentCount > 1) {
    issues.push({ sev: 'CRITICAL', code: 'broken-dom', msg: `duplicate article-content div (${articleContentCount} found)` });
  }

  // CRITICAL: JSON-LD issues
  const ldMatch = s.match(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/);
  if (ldMatch) {
    let ld;
    try { ld = JSON.parse(ldMatch[1]); } catch (e) {
      issues.push({ sev: 'CRITICAL', code: 'ld-parse', msg: 'JSON-LD parse error' });
    }
    if (ld) {
      // datePublished must be ISO 8601
      if (ld.datePublished && !/^\d{4}-\d{2}-\d{2}/.test(ld.datePublished)) {
        issues.push({ sev: 'CRITICAL', code: 'ld-date-format', msg: `datePublished "${ld.datePublished}" not ISO 8601` });
      }
      // image must be absolute URL
      if (ld.image && typeof ld.image === 'string' && !ld.image.startsWith('http')) {
        issues.push({ sev: 'CRITICAL', code: 'ld-image-relative', msg: `JSON-LD image relative: ${ld.image}` });
      }
      // required fields for Article
      if (isArticle) {
        if (!ld.dateModified) issues.push({ sev: 'HIGH', code: 'ld-missing-dateModified', msg: 'JSON-LD missing dateModified' });
        if (!ld.mainEntityOfPage) issues.push({ sev: 'HIGH', code: 'ld-missing-mainEntityOfPage', msg: 'JSON-LD missing mainEntityOfPage' });
        if (ld.publisher && !ld.publisher.logo) issues.push({ sev: 'HIGH', code: 'ld-missing-publisher-logo', msg: 'JSON-LD publisher.logo missing' });
      }
    }
  } else if (isArticle) {
    issues.push({ sev: 'HIGH', code: 'ld-missing', msg: 'No JSON-LD structured data' });
  }

  // HIGH: OpenGraph/Twitter meta
  const has = (needle) => s.includes(needle);
  if (!has('property="og:url"') && !has("property='og:url'")) {
    issues.push({ sev: 'HIGH', code: 'og-url-missing', msg: 'og:url meta missing' });
  }
  if (!has('property="og:image"') && !has("property='og:image'")) {
    issues.push({ sev: 'HIGH', code: 'og-image-missing', msg: 'og:image meta missing' });
  }
  if (!has('name="twitter:image"') && !has("name='twitter:image'")) {
    issues.push({ sev: 'HIGH', code: 'twitter-image-missing', msg: 'twitter:image meta missing' });
  }
  if (!has('rel="canonical"') && !has("rel='canonical'")) {
    issues.push({ sev: 'HIGH', code: 'canonical-missing', msg: 'canonical link missing' });
  }

  return issues;
}

function main() {
  const files = collectFiles();
  const report = {};
  let total = 0;
  let bySev = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 };

  for (const f of files) {
    const issues = audit(f);
    if (issues.length) {
      report[rel(f)] = issues;
      total += issues.length;
      for (const i of issues) bySev[i.sev] = (bySev[i.sev] || 0) + 1;
    }
  }

  if (JSON_OUT) {
    console.log(JSON.stringify({ total, bySev, files: report }, null, 2));
  } else if (!QUIET) {
    console.log(`\n=== SIKATIN SEO Audit ===`);
    console.log(`Scanned ${files.length} files.`);
    console.log(`Total issues: ${total}`);
    console.log(`By severity: CRITICAL=${bySev.CRITICAL}, HIGH=${bySev.HIGH}, MEDIUM=${bySev.MEDIUM||0}, LOW=${bySev.LOW||0}`);
    console.log('');
    const byCode = {};
    for (const [f, issues] of Object.entries(report)) {
      for (const i of issues) {
        byCode[i.code] = byCode[i.code] || { count: 0, files: [], sev: i.sev };
        byCode[i.code].count++;
        byCode[i.code].files.push(f);
      }
    }
    const sorted = Object.entries(byCode).sort((a, b) => b[1].count - a[1].count);
    for (const [code, info] of sorted) {
      console.log(`[${info.sev}] ${code} — ${info.count} files`);
      if (info.count <= 5) info.files.forEach(f => console.log(`    ${f}`));
    }
    console.log('');
  }
  process.exit(total > 0 ? 1 : 0);
}

if (require.main === module) main();
module.exports = { audit, collectFiles };
