# ISSUES — Non-blocking Bug Tracker

> Catatan bug atau masalah di luar scope task saat ini.
> JANGAN fix langsung. Kerjakan saat scope-nya sudah sesuai.

---

## 🐛 Active Issues

### #001 — Filter chip "Sepakbola" hilang di artikel.html
- **Date found**: 2026-04-20 (saat test T2)
- **Severity**: Low (functionality masih jalan via topik/sepakbola.html)
- **Description**: Di `artikel.html` filter bar cuma punya 10 chip: Semua, Geopolitik, Self-Improvement, History, Engineering, Pendidikan, Teknologi, Tips, Kurikulum, Literasi. **"Sepakbola" tidak ada** meskipun 10 artikel sepakbola sudah ada di `articlesData`.
- **Impact**: User yang mau filter "Sepakbola" di artikel.html terpaksa buka `/topik/sepakbola.html`. Search "sepakbola" masih jalan.
- **Fix location**: `artikel.html` sekitar line 67-75 (filter-chip HTML)
- **Related scope**: Bukan T2. Mungkin T13 (kategori dengan pagination) atau task cleanup terpisah.
- **Effort**: 1 menit (tambah `<button class="filter-chip" data-category="Sepakbola">Sepakbola</button>`)

---

## 🏗️ Tech Debt

### TD-010 — CLS 0.157 di topik/*.html (featured content JS-render)
- **Date logged**: 2026-04-21 (T15 Fix D partial result)
- **Severity**: Medium (SEO signal "Needs improvement" but not "Poor")
- **Root cause**: `#topicFeatured > #featuredContent` rendered via inline JS setelah page load. Empty section has no reserved height → saat JS populate, grid section di bawahnya shift down → CLS 0.157.
- **T15 Fix D (card width/height) impact**: partial — fixed card-level layout shift tapi featured section shift remained.
- **Fix options**:
  - (a) Add `min-height: 400px` to `#topicFeatured` via CSS — quick (5 min)
  - (b) SSG-render featured content (integrate ke inject-listing.js) — proper (30 min)
  - (c) Convert featured rendering dari innerHTML ke prerendered template dengan placeholder skeleton — robust (1 jam)
- **Effort**: 5-30 min
- **Priority**: Medium (post-AdSense — 0.157 not blocking, tapi quick win when we touch topik templates)

---

### TD-009 — Main thread optimization (T15 Fix F deferred)
- **Date logged**: 2026-04-21 (T15)
- **Severity**: Medium
- **Scope**: Avg Lighthouse score `main-thread-work-breakdown` 0.00 across 6 pages. TBT 565-1090ms (target <200ms).
- **Likely causes**:
  - Heavy JS execution pada homepage dynamic sections render (bentoHero, dynamicSections, mosaicGrid — 6 full innerHTML passes)
  - AdSense + GTM combined: 227KB unused JS
  - Personalization algorithm (mulberry32, trending score) berjalan sync
- **Fix strategy**:
  - Defer non-critical JS (editorial-calendar, user-prefs, theme-toggle) via `requestIdleCallback`
  - Split homepage render into requestAnimationFrame chunks
  - Move personalization scoring to Web Worker
- **Effort**: 2-3 jam (risky refactor, needs regression testing)
- **Priority**: Low (post-AdSense — optimization diminishing returns)

---

### TD-008 — WebP conversion for 117 artikel images
- **Date logged**: 2026-04-21 (T15 Fix E deferred)
- **Severity**: Medium (page weight reduction ~40-60%)
- **Scope**: `/img/artikel/*.jpg` (117 files, ~10-30 KB each) → convert to `.webp`
- **Command**:
  ```bash
  cd img/artikel
  for f in *.jpg; do cwebp -q 82 "$f" -o "${f%.jpg}.webp"; done
  ```
- **Deploy**: upload new `.webp` files; nginx sudah auto-serve via `try_files ${img_path}.webp $uri` (T15 Fix C config)
- **Expected savings**: ~2MB total per page (listing pages × 20 cards × ~50KB saving)
- **Effort**: 1-2 jam (batch conversion + upload + verify)
- **Priority**: Low (post-AdSense, nginx auto-serve ready waiting for files)

---

### TD-007 — Defensive content-quality auto-scan
- **Date logged**: 2026-04-20 (after Bing ghost URL false alarm investigation)
- **Severity**: Low (future prevention)
- **Context**: User melihat 2 URL di Bing search result dengan description Lorem Ipsum — investigasi confirm URL 404 di production (Bing stale index, bukan content kita). Namun pattern ini highlight kebutuhan defensive check.
- **Scope**: Extend `tools/seo-audit.js` (atau buat `tools/content-audit.js`) dengan rule:
  1. **Lorem Ipsum detection**: scan artikel content untuk "lorem ipsum", "cursus iaculis", "dolor sit amet", "consectetur adipiscing", "sed do eiusmod"
  2. **Placeholder text detection**: "TODO", "FIXME", "[placeholder]", "REPLACE THIS"
  3. **Suspicious filename patterns**: non-matching convention like `^[a-z0-9-]+\.html$` dengan typical SIKATIN slugs (should contain year/kategori/keyword khas)
  4. **Absurd title detection**: 100% English pada domain Indonesia-first (lang=id tapi title all English)
  5. **Duplicate content pattern**: sama title/desc persis dengan artikel lain
- **Effort**: 15-30 menit
- **Priority**: Low (post-AdSense — production clean saat ini, defensive only)

---

### TD-006 — 87 artikel title rewrite (B1 β skipped)
- **Date logged**: 2026-04-20 (T6 B1 α.1 applied, β deferred)
- **Severity**: Medium (do during T7 content audit — natural integration)
- **Scope**: 87 artikel dengan main title (tanpa suffix ` - SIKATIN`) >60ch
- **Impact**: SERP truncate title di Google Search (tampil `...`). Not a ranking penalty, but CTR impact minor.
- **Distribution**:
  - 61-65ch: 27 artikel (minor trim, 1-5 chars)
  - 66-70ch: 28 artikel (moderate, 6-10 chars)
  - 71-80ch: 20 artikel (heavy, 11-20 chars)
  - 81-94ch: 12 artikel (significant rewrite)
- **Effort**: ~1-2 jam AI-assisted per batch 10-15
- **Priority**: Medium
- **Approach saat T7**:
  - Tiap artikel audit konten, sekalian refine title
  - Maintain: nomor & year tokens (e.g. "7 Fakta", "2026"), power word, category context
  - Shorten: drop redundant phrasing, combine synonyms
  - Preserve: brand-ability (distinct voice)

---

### TD-005 — 12 artikel dengan description <120 chars (B2 skipped)
- **Date logged**: 2026-04-20 (T6 B2)
- **Severity**: Medium (SEO minor, CTR impact)
- **Affected slugs** (12):
  - `literasi-digital` (82ch)
  - `tips-belajar-efektif` (91ch)
  - `sejarah-reformasi` (98ch)
  - `kurikulum-merdeka` (100ch)
  - `manajemen-waktu` (103ch)
  - `teknologi-dalam-pendidikan` (103ch)
  - `energi-terbarukan` (106ch)
  - `sejarah-majapahit` (106ch)
  - `growth-mindset` (109ch)
  - `teknik-robotika` (111ch)
  - `geopolitik-energi` (115ch)
  - `pendidikan-karakter` (116ch)
- **Impact**: Under-utilized description space. Google shows up to ~155ch; shorter = less persuasive copy for CTR.
- **Fix**: Manual content extension to 130-155ch per artikel. Include keyword + value prop + action hint.
- **Effort**: ~15 min total (1-1.5 min per artikel)
- **Priority**: Medium (do during T7 content audit)

---

### TD-004 — Custom og:image per listing page (Phase C skipped)
- **Date logged**: 2026-04-20 (T6 Phase C)
- **Severity**: Low (post-AdSense)
- **Scope**: 7 listing pages currently use logo (BASE%20LOGO.png) as og:image fallback
  - `index.html`
  - `artikel.html`
  - `topik/geopolitik.html`
  - `topik/self-improvement.html`
  - `topik/history.html`
  - `topik/engineering.html`
  - `topik/sepakbola.html`
- **Impact**: Social share cards (Facebook, Twitter, WhatsApp) preview generic logo instead of page-specific visual. CTR & brand impression bisa lebih baik dengan custom card.
- **Fix plan**:
  1. Design 7 social card templates 1200×630px (brand colors, page title, tagline)
  2. Export as `/img/og/<page-slug>.jpg`
  3. Update og:image + twitter:image di masing-masing listing page
- **Effort**: ~2-3 jam design + implementation
- **Priority**: Low (post-AdSense review passed)

---

### TD-002 — generate-sitemap.js: docstring + hard-coded topikPages
- **Date logged**: 2026-04-20 (saat T3 recon)
- **Severity**: Low (post-AdSense)
- **Issues**:
  1. Docstring line 6 `"currently 107 articles"` → stale (sekarang 117). Hapus angka, bikin dinamis: "reads articlesData from js/articles-data.js"
  2. `const topikPages = ['geopolitik', ...]` hard-coded. Kalau user tambah kategori baru, harus manual update tool. Solusi: auto-detect dari `[...new Set(articlesData.map(a => a.category))]` dengan mapping ke slug lowercase.
- **Effort**: 5 menit
- **Priority**: Low (sitemap sudah jalan benar, ini cosmetic/maintainability)

---

### TD-001 — Build split local/VPS (minify di VPS-only) fragile
- **Date logged**: 2026-04-20
- **Severity**: Low (post-AdSense priority)
- **Problem**: Saat ini build pipeline:
  - Local: generate `.html` source + SSG inject
  - VPS: minify CSS/JS via `cleancss` + `uglifyjs` on-server via `plink`
- **Issue**: Kalau VPS down atau gagal run minify, preview lokal ≠ production. Inconsistent environments.
- **Workaround saat ini**: Opsi A — install `clean-css-cli` + `uglify-js` global di local, run manual sebelum `preview_start` (per 2026-04-20 sesi T2).
- **Recommended fix (Opsi D)**: Tambah step minify-css programmatic di `deploy-pipeline.js` Step 3c pakai `clean-css` + `uglify-js` Node packages langsung (tanpa CLI exec), so build jalan fully local. VPS cuma serve file, no on-server minification.
- **Effort**: ~15 menit
- **Priority**: Low (pasca-AdSense review lolos)

---

## ✅ Resolved Issues

### TD-003 — Category typo Sejarah→History, Teknik→Engineering ✅
- Resolved: 2026-04-20 (bundled dengan P3 logo encoding deploy)
- Fix: edit 2 line di `js/articles-data.js`, re-run `inject-listing.js --write` + `seo-fix.js --write`
- Result:
  - topik/history.html: 13 → 14 items
  - topik/engineering.html: 14 → 15 items
  - 2 artikel affected kini punya breadcrumb 3-level
- Side fix: `seo-fix.js` regression detected (mainEntityOfPage auto-added ke ItemList di topik pages). Fixed dengan scope guard `if (ld['@type'] === 'Article')`.
