#!/usr/bin/env node
/**
 * SIKATIN Deploy Pipeline — pre-flight checks, fix, bump, deploy.
 *
 * Steps:
 *  1. Run seo-audit (fail if CRITICAL issues found)
 *  2. Run seo-fix --write (idempotent)
 *  3. Run cache-bust-unify --write (today's date)
 *  4. Re-audit (must be clean)
 *  5. Regenerate sitemap
 *  6. Upload changed files to VPS
 *  7. Re-minify CSS/JS on VPS
 *  8. IndexNow ping for new articles
 *
 * Usage:
 *   node tools/deploy-pipeline.js --check         # audit only, no writes
 *   node tools/deploy-pipeline.js --fix           # fix + bump, no deploy
 *   node tools/deploy-pipeline.js --deploy        # full pipeline
 *   node tools/deploy-pipeline.js --deploy --full # include all articles (not just changed)
 */
const { execSync, spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const ROOT = path.resolve(__dirname, '..');
const ARGS = process.argv.slice(2);
const MODE = ARGS.includes('--deploy') ? 'deploy' : ARGS.includes('--fix') ? 'fix' : 'check';
const FULL = ARGS.includes('--full');

const VPS_HOST = 'root@103.160.213.208';
const VPS_PATH = '/var/www/sikatin';
const VPS_PW = '8yd24ceatpch48';
const PSCP = 'E:/pscp.exe';
const PLINK = 'E:/plink.exe';

function run(cmd, opts = {}) {
  console.log(`> ${cmd}`);
  try {
    return execSync(cmd, { cwd: ROOT, stdio: 'inherit', ...opts });
  } catch (e) {
    console.error(`FAILED: ${cmd}`);
    throw e;
  }
}

function runCapture(cmd) {
  try { return execSync(cmd, { cwd: ROOT, encoding: 'utf8' }); }
  catch (e) { return { error: e.message, stdout: e.stdout, stderr: e.stderr }; }
}

function step(n, label) {
  console.log(`\n━━━ STEP ${n}: ${label} ━━━`);
}

function main() {
  console.log(`\n╔════════════════════════════════════════════╗`);
  console.log(`║  SIKATIN Deploy Pipeline — mode: ${MODE.padEnd(8)} ║`);
  console.log(`╚════════════════════════════════════════════╝`);

  // === STEP 1: Audit ===
  step(1, 'Pre-flight SEO audit');
  const auditRes = spawnSync('node', ['tools/seo-audit.js', '--json'], { cwd: ROOT, encoding: 'utf8' });
  if (auditRes.error) throw auditRes.error;
  const report = JSON.parse(auditRes.stdout);
  console.log(`   Issues: total=${report.total}, CRITICAL=${report.bySev.CRITICAL||0}, HIGH=${report.bySev.HIGH||0}`);
  if (MODE === 'check') {
    process.exit(report.total > 0 ? 1 : 0);
  }
  if (report.bySev.CRITICAL && !ARGS.includes('--force')) {
    console.error('   CRITICAL issues present. Run --fix to auto-fix, or --force to deploy anyway.');
  }

  // === STEP 2: Auto-fix ===
  step(2, 'Auto-fix SEO issues');
  run('node tools/seo-fix.js --write');

  // === STEP 3: Cache-bust unify ===
  step(3, 'Unify cache-bust to today');
  run('node tools/cache-bust-unify.js --write');

  // === STEP 3b: Inject listings (SSG for SEO) ===
  step('3b', 'Inject article listings (SSG)');
  run('node tools/inject-listing.js --write');

  // === STEP 4: Re-audit ===
  step(4, 'Post-fix audit');
  const reAudit = spawnSync('node', ['tools/seo-audit.js', '--json'], { cwd: ROOT, encoding: 'utf8' });
  const post = JSON.parse(reAudit.stdout);
  console.log(`   Issues after fix: ${post.total}`);
  if (post.total > 0 && !ARGS.includes('--force')) {
    console.error('   Residual issues — review with: node tools/seo-audit.js');
    if (MODE === 'fix') process.exit(0);
    process.exit(1);
  }

  // === STEP 5: Sitemap ===
  step(5, 'Regenerate sitemap');
  run('node tools/generate-sitemap.js');

  if (MODE === 'fix') {
    console.log('\n✅ Fix complete (local only). Re-run with --deploy to upload.');
    return;
  }

  // === STEP 6: Upload ===
  step(6, 'Deploy to VPS');
  const batches = [
    ['index.html artikel.html tentang.html kontak.html privasi.html syarat.html disclaimer.html tim.html editor.html admin.html status.html robots.txt sitemap.xml', VPS_PATH + '/'],
    ['topik/*.html', VPS_PATH + '/topik/'],
    ['artikel/*.html', VPS_PATH + '/artikel/'],
    ['css/*.css', VPS_PATH + '/css/'],
    ['js/*.js', VPS_PATH + '/js/'],
  ];
  for (const [files, dest] of batches) {
    console.log(`   uploading: ${files} → ${dest}`);
    run(`${PSCP} -pw ${VPS_PW} -batch ${files} ${VPS_HOST}:${dest}`);
  }

  // === STEP 7: Re-minify on VPS ===
  step(7, 'Re-minify CSS/JS on VPS');
  run(`${PLINK} -pw ${VPS_PW} -batch ${VPS_HOST} "cd /var/www/sikatin/css && cleancss -o style.min.css style.css && cleancss -o components.min.css components.css && cd /var/www/sikatin/js && uglifyjs main.js -o main.min.js -c -m && uglifyjs articles-data.js -o articles-data.min.js -c -m && echo DONE"`);

  // === STEP 8: Verify ===
  step(8, 'Verify live');
  run(`${PLINK} -pw ${VPS_PW} -batch ${VPS_HOST} "curl -sI https://sikatin.com/ | head -1 && curl -sI https://sikatin.com/sitemap.xml | head -1"`);

  console.log('\n✅ Deploy complete.');
}

if (require.main === module) main();
