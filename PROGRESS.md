# PROGRESS TRACKER

> **Claude Code**: Update file ini SETIAP selesai task. Format konsisten. Ini memory lo antar sesi.

---

## 📊 Overview

- **Started**: 2026-04-20
- **Target resubmit**: 2026-05-04 (14 hari)
- **Tasks done**: 6 / 24 (T1, T2, T3, T4, T9, T13)
- **Current phase**: FASE I (lanjut T5-T6)

---

## ✅ Completed Tasks

### T1 — Audit rendering /artikel.html ✅
- Date: 2026-04-20
- Time spent: 10 min
- Outcome: **CONFIRMED — artikel list TIDAK ter-render di HTML mentah**
  - Raw HTML size: 6.5 KB (hanya kerangka, tidak ada konten)
  - Judul artikel muncul di raw: 0 dari 117
  - `<div id="articleGrid">` kosong di line 87 → diisi via JS (`articles-data.js`)
  - Navbar & footer juga render via JS (`main.js` inject ke placeholder)
- Root cause confirmed: Googlebot lihat page sebagai "empty shell with filter buttons"
- Files changed: _(audit only, no code change)_
- Next step: **T2 — Generate artikel list sebagai HTML static** (build-time injection)
- Notes:
  - Sitemap sudah benar (sudah include 117 artikel) tapi ini tidak cukup — list di `artikel.html` juga harus SSR/SSG
  - Individual artikel HTML udah full content — yang masalah cuma listing page
  - Solusi: Node build script yang inject `<article>...</article>` block ke `artikel.html` dari `articles-data.js` sebelum deploy

### T2 + T9 + T13 — Generate HTML static untuk listing (SSG) ✅
- Date: 2026-04-20
- Time spent: ~2.5 jam (scope merged: T2 + T9 + T13)
- Outcome: **117 cards + navbar + footer sekarang pre-rendered di HTML mentah**
  - Root cause AdSense "low value content" → resolved
  - Googlebot sekarang lihat semua judul + excerpt artikel di raw HTML

**Files yang dibuat/dimodifikasi:**
- `templates/navbar.html` (NEW) — extracted dari `main.js loadNavbar()`
- `templates/footer.html` (NEW) — extracted dari `main.js loadFooter()`
- `tools/inject-listing.js` (NEW) — marker-based idempotent SSG builder
- `tools/deploy-pipeline.js` — tambah Step 3b call `inject-listing --write`
- `js/main.js` — guard `loadNavbar/loadFooter` skip kalau `placeholder.dataset.ssg === '1'`
- `js/search.js` — guard initial render skip kalau `articleGrid.dataset.ssg === '1'` tanpa URL filter
- `artikel.html`, `index.html`, `topik/*.html` — SSG output

**Live verification (curl from VPS):**
- ✅ `curl https://sikatin.com/artikel.html | grep -c 'class="card"'` → **117** (expected 117)
- ✅ `curl https://sikatin.com/ | grep -c 'class="card"'` → **9** (expected 9)
- ✅ `curl https://sikatin.com/topik/geopolitik.html | grep -c 'class="card"'` → **25** (expected 25)
- ✅ `curl https://sikatin.com/topik/sepakbola.html | grep -c 'class="card"'` → **10** (expected 10)
- ✅ SSG markers present: 2x LISTING + 2x NAVBAR di artikel.html

**Local test results (5/5 PASS):**
- ✅ A. Hard-reload tidak flicker — 117 cards di DOM dari awal
- ✅ B. Filter Geopolitik → 25 cards
- ✅ C. Search "messi" → 1 artikel tepat
- ✅ D. Mobile 375px responsive
- ✅ E. Basepath di `topik/*.html` resolve `../` dengan benar

**Idempotency**: 3x `inject-listing.js --write` — run 2&3 = 0 writes ✅

**Tech debt identified (logged in ISSUES.md)**:
- TD-001: Build split local/VPS fragile → Opsi D fix (clean-css programmatic) post-AdSense
- Interim fix: `npm install -g clean-css-cli uglify-js` supaya preview lokal works

**VPS backup pre-deploy**: `/var/www/sikatin-backup-pre-t2-20260419-1934.tar.gz` (30MB)

**Next step**: T3 — Generate sitemap.xml (note: sudah ada sitemap, tinggal verify regen after SSG deploy)

### T3 — Generate sitemap.xml ✅
- Date: 2026-04-20
- Time spent: 10 min (recon only, no code change needed)
- Outcome: **Sitemap sudah lengkap dan ideal state**
  - Production `https://sikatin.com/sitemap.xml` — HTTP 200, 128 URLs, 46 KB
  - Breakdown: 6 static + 5 topik + 117 artikel = 128 URLs
  - `image:image` extension included per artikel (loc + title)
  - Proper `lastmod` dari articles-data.js Indonesian date → ISO 8601
  - `changefreq`/`priority` tiered sesuai page importance
  - Integrated di `deploy-pipeline.js` Step 5 (auto-regen per deploy)
  - `robots.txt` reference `Sitemap: https://sikatin.com/sitemap.xml` correct
- Manual action outstanding: submit sitemap ke Google Search Console (user action, tidak bisa automate)
- Files changed: _(no code change, recon only)_
- Next step: T4 — Verify robots.txt tidak block crawler

### T4 — Verify robots.txt tidak block crawler ✅
- Date: 2026-04-20
- Time spent: 10 min (recon only, no code change)
- Outcome: **Crawler access clean — no blockers detected**
  - `robots.txt`: `Allow: /` untuk semua UA, hanya blok admin/editor/LAPORAN/api/.claude (expected)
  - HTTP headers: **zero `X-Robots-Tag`** di 3 sample pages (homepage, artikel.html, single artikel)
  - Googlebot UA simulation (`Mozilla/5.0 (compatible; Googlebot/2.1; ...)`):
    - Single artikel → full HTML + JSON-LD Article + all meta tags ✅
    - `topik/geopolitik.html` → **25/25 cards visible** (SSG proof)
    - No cloaking, no 403, no different content vs regular UA
  - `<meta name="robots" content="index, follow, max-image-preview:large, ...">` present di artikel pages
- **Bonus findings** (security headers production solid):
  - HSTS preload aktif (max-age=63072000, includeSubDomains)
  - CSP strict dengan Google/AdSense whitelist proper
  - X-Frame-Options SAMEORIGIN, X-Content-Type-Options nosniff
  - Permissions-Policy restriktif (geolocation/mic/cam/payment/usb off)
  - Referrer-Policy strict-origin-when-cross-origin
- Manual action outstanding: GSC URL Inspection per halaman (user action, ongoing monitoring)
- Files changed: _(no code change, recon only)_
- Next step: T5 — Verify schema markup Article coverage

### T5 — Schema Markup Article (PRELIMINARY 🔍)
- Status: **Dari T4 recon, sample artikel sudah punya full JSON-LD Article schema**
  - Sample (timnas-indonesia-piala-dunia-2026): headline, description, datePublished, dateModified, image, author, publisher.logo, mainEntityOfPage, articleSection, keywords ✅
- Perlu verify coverage:
  - (a) apakah **semua 117 artikel** punya Article schema yang valid?
  - (b) apakah listing pages (artikel.html, index.html, topik/*.html) punya **ItemList** schema?
  - (c) apakah ada **BreadcrumbList** schema (bonus SEO)?
  - (d) apakah ada **Organization/WebSite** schema di homepage?
- Next action: recon → report → user decide scope

---

## 🔄 In Progress

_Tidak ada task aktif. Lanjut T5 recon._

---

## ⏸️ Blocked / Need User Input

_Task yang nunggu keputusan user. Sertakan pertanyaan spesifik._

Contoh:
```
### T2 — Generate HTML static
- Blocker: Perlu tahu source data artikel (JSON/CMS?)
- Question for user: "Artikel lo saat ini disimpan di mana? File lokal, Airtable, atau CMS lain?"
- Blocked since: 2026-04-21
```

---

## 📝 Decisions Log

_Setiap keputusan teknis penting, catat di sini._

Format: `YYYY-MM-DD | Decision | Reason | Alternatives considered`

---

## 🐛 Issues Found (Non-blocking)

_Bug atau masalah yang ditemukan di luar scope task saat ini. JANGAN fix langsung._

---

## 🔗 Reference Links

- Google AdSense Policy: https://support.google.com/adsense/answer/48182
- Content Quality Guidelines: https://support.google.com/adsense/answer/9335564
- Search Console: https://search.google.com/search-console
- PageSpeed Insights: https://pagespeed.web.dev/

---

**Last updated**: 2026-04-20 (initial setup)
