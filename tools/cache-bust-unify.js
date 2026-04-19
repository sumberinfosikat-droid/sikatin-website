#!/usr/bin/env node
/**
 * SIKATIN Cache-Bust Unifier — rewrites all ?v=... query strings on
 * CSS/JS assets under /css/ and /js/ to a single deploy version.
 *
 * Usage:
 *   node tools/cache-bust-unify.js                     # dry-run with next version
 *   node tools/cache-bust-unify.js --write             # apply
 *   node tools/cache-bust-unify.js --write --version=20260418
 *
 * Default version: today (YYYYMMDD).
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const EXCLUDE = /BACKUP|node_modules|_raw/;

const ARGS = process.argv.slice(2);
const WRITE = ARGS.includes('--write');
const VERSION_ARG = (ARGS.find(a => a.startsWith('--version=')) || '').split('=')[1];
const VERSION = VERSION_ARG || (() => {
  const d = new Date();
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
})();

function walk(dir, out = []) {
  for (const f of fs.readdirSync(dir)) {
    if (EXCLUDE.test(f)) continue;
    const p = path.join(dir, f);
    const st = fs.statSync(p);
    if (st.isDirectory()) walk(p, out);
    else if (f.endsWith('.html')) out.push(p);
  }
  return out;
}

// Matches local /css/ and /js/ asset refs inside attribute values (after a quote/space),
// NOT arbitrary /js/ substrings within external URLs (e.g. googlesyndication adsbygoogle.js).
// Prefix lookbehind emulated with capture group.
const PAT = /(["'\s])((?:\.\.\/|\.\/)?(?:css|js)\/[\w\-.]+\.(?:css|js))(\?v=[^"'\s>]+)?/g;

function rewrite(html, version) {
  let changes = 0;
  const out = html.replace(PAT, (m, prefix, asset, q) => {
    changes++;
    return `${prefix}${asset}?v=${version}`;
  });
  return { html: out, changes };
}

function main() {
  const files = walk(ROOT);
  let touched = 0, total = 0;
  for (const f of files) {
    const rel = path.relative(ROOT, f).replace(/\\/g, '/');
    const html = fs.readFileSync(f, 'utf8');
    const { html: newHtml, changes } = rewrite(html, VERSION);
    if (newHtml !== html) {
      touched++; total += changes;
      if (WRITE) fs.writeFileSync(f, newHtml, 'utf8');
    }
  }
  console.log(`\n=== cache-bust-unify ${WRITE ? 'APPLIED' : 'DRY-RUN'} ===`);
  console.log(`Version: ${VERSION}`);
  console.log(`Files ${WRITE ? 'written' : 'would change'}: ${touched}`);
  console.log(`Total asset refs rewritten: ${total}`);
  if (!WRITE) console.log('Re-run with --write to apply.');
}

if (require.main === module) main();
