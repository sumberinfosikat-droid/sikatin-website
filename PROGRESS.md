# PROGRESS TRACKER

> **Claude Code**: Update file ini SETIAP selesai task. Format konsisten. Ini memory lo antar sesi.

---

## 📊 Overview

- **Started**: 2026-04-20
- **Target resubmit**: 2026-05-04 (14 hari)
- **Tasks done**: 16 / 24 (T1-T6, T9, T13, T15, T16, T17-T22)
- **Current phase**: **FASE I + FASE III 100%** → FASE II remaining (T7, T8, T10, T11, T12, T14) + T23, T24

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

### T5 — Schema Markup (Article + BreadcrumbList + ItemList) ✅
- Date: 2026-04-20
- Time spent: ~2 jam (P1 + P2.1 + P2.2 + P3 + bonus TD-003)
- Outcome: **Full schema compliance, Rich Results Test clean**

**Coverage (all production-verified via live curl):**
- **Article schema**: 117/117 ✅
  - headline, description, author + url, publisher + logo, image, datePublished + dateModified (both ISO 8601 with +07:00 WIB timezone), mainEntityOfPage, articleSection, keywords
- **BreadcrumbList**: 117/117 ✅
  - 86 three-level (Beranda → Kategori → Judul) — categories with topik page
  - 31 two-level (Beranda → Judul) — categories without topik page
  - Resolution: articleSection primary, articles-data.js fallback
- **ItemList**: 7/7 listing pages ✅
  - artikel.html: 20 | index.html: 9
  - topik/geopolitik: 25 | topik/self-improvement: 22
  - topik/history: 14 | topik/engineering: 15 | topik/sepakbola: 10
- **WebSite + Organization + SearchAction**: index.html ✅ (pre-existing, logo URL encoding fixed)

**Commits:**
- `035f64e` — fix: add missing image field to 3 articles (117/117 coverage)
- `e08f839` — fix: ISO 8601 timezone + author.url for Rich Results compliance
- `d2efe96` — feat: add BreadcrumbList to 117 articles
- `f139df7` — feat: add ItemList to 7 listing pages
- `85e8bcc` — fix: normalize logo URL encoding + scope JSON-LD fixes to Article
- `b47463c` — fix(data): correct category typos (Sejarah→History, Teknik→Engineering)

**Infrastructure built:**
- `seo-fix.js` now has 8 fix modes (previously 3): relative→absolute image, ISO timezone, image-derive, dateModified, mainEntityOfPage (Article-only), publisher.logo, author.url (Article-only), BreadcrumbList
- `build-article.js` template v3: future articles auto-compliant (timezone, author.url, BreadcrumbList)
- `inject-listing.js` adds ItemList SSG markers alongside existing card markers
- `CATEGORY_TO_SLUG` map + topik page existence check → smart breadcrumb level decisions

**Tech debt resolved along the way:**
- TD-003 closed (2 category typos fixed)

**Manual action outstanding**: Re-test via Rich Results Test (search.google.com/test/rich-results) untuk confirm post-deploy clean.

**Next step**: T6 — Optimasi meta tags (title ≤ 60 char, description ≤ 160 char, unique per artikel)

### T6 — Optimasi meta tags ✅
- Date: 2026-04-20
- Time spent: ~1.5 jam (Phase A + B hybrid)
- Outcome: **Meta tags normalized across 117 artikel + 7 listing pages**

**Phase A — Mechanical fixes (all applied):**
- A1: 5 topik pages sekarang punya full `twitter:*` cluster (card + title + desc + image)
- A2: `artikel.html` `twitter:card` = `summary_large_image` (was `summary`)
- A3: 3 BATCH 7 artikel fix — suffix ` | SIKATIN` → ` - SIKATIN`, keywords meta derived dari articles-data.js tags
- A4: 4 topik page descriptions lengthened ke 148-152ch range (countless — maintenance-free)

**Phase B — Title & description rewrite (hybrid):**
- B2: 46 artikel description >160ch → auto-truncated di word boundary (hasil ≤160ch, all 117/117 compliant)
- B1 α.1: 24 artikel eligible → og:title + twitter:title stripped ` - SIKATIN` suffix, `<title>` tag brand preserved (social share optimal, browser tab tetap branded)

**Phase C — Skipped (logged as tech debt):**
- TD-004: Custom og:image per listing page (design-dependent, 2-3 jam post-AdSense)
- TD-005: 12 artikel description <120ch (manual content extension during T7)
- TD-006: 87 artikel main title >60ch (content rewrite during T7 audit)

**Live verification (curl from VPS):**
- ✅ 4 topik descriptions live (148-152ch range)
- ✅ Sample stripped artikel: `<title>` with suffix, `og:title`/`twitter:title` without
- ✅ TD-006 sample (brain-drain-indonesia): full 104ch title unchanged (correctly skipped per α.1 rule)

**Commits:**
- `ea75b45` — fix(meta): normalize topik page descriptions (4 pages)
- `ebcef84` — fix(meta): strip suffix from og:title/twitter:title untuk 24 artikel
- `7052bd0` — docs(adsense): log TD-004, TD-005, TD-006

**Infrastructure upgrades — seo-fix.js now 13 rules:**
1. JSON-LD relative→absolute image, 2. ISO date conversion, 3. WIB timezone, 4. dateModified fill, 5. image-derive from slug, 6. author.url, 7. BreadcrumbList (Article-only), 8. meta OG/Twitter cluster, 9. twitter:* cluster derivation, 10. twitter-card-normalize, 11. title-suffix-normalize, 12. keywords-add, 13. desc-truncate.

**Manual action**: Re-test via Rich Results Test + visual SERP preview check (Google emulator).

### T22 — Footer + Navbar SSG ke 117 artikel pages ✅
- Date: 2026-04-20
- Time spent: ~20 min
- Outcome: 117/117 artikel detail pages sekarang punya navbar + footer SSG di raw HTML (sebelumnya 0/117 — JS-dependent)
- inject-listing.js: new `injectArticlePages()` helper
- 117/117 artikel dengan `SSG:NAVBAR:START` + `SSG:FOOTER:START` markers, basePath `../` correct
- 4 legal links live in raw HTML per artikel (pre disclaimer: privasi, syarat, kontak, tentang)
- Commit: `88e5127` "fix(ssg): inject navbar + footer ke 117 artikel pages (T22)"

### T17-T21 + Brand Update ✅ (FASE III)
- Date: 2026-04-20
- Time spent: ~2 jam
- Outcome: Full AdSense-compliant legal pages + standalone brand

**Brand standalone:**
- OLD: "SIKATIN (Sistem Informasi Karya dan Literasi Indonesia)"
- NEW tagline: "Media Edukasi & Tinjauan Indonesia"
- Dropped JSON-LD alternateName (not needed for standalone brand)

**Content updates (word counts verified live):**
- **T21 tentang.html**: 213 → **403** words. New sections: Topik yang Kami Bahas (4 pilar), Tim Editorial. Nilai → Nilai Editorial (Akurasi, Kedalaman, Relevansi Lokal).
- **T17 privasi.html**: 579 → **846** words. Added: Privasi Anak (COPPA, age 13+), Data Retention (cookies 12mo, GA 14mo, email 2yr), Kepatuhan Hukum (UU 27/2022, COPPA, AdSense).
- **T20 syarat.html**: 723 → **877** words. Added: explicit Disclaimer section + Pengungkapan Afiliasi section.
- **T19 disclaimer.html**: CREATED (0 → **445** words). 8 sections covering akurasi, bukan nasihat profesional, tautan eksternal, iklan/afiliasi, pendapat/opini, batasan tanggung jawab.
- **T18 kontak.html**: 188 → **238** words. Updated form intro + new FAQ "Berapa lama waktu respons?" (SLA 14 hari, 7 hari untuk privasi).

**T22 Footer disclaimer link added** — Footer template + main.js + 117 artikel re-inject → 5 unique legal links per public page: privasi, syarat, kontak, tentang, disclaimer.

**Sitemap**: 128 → **129 URLs** (added disclaimer.html).

**Commits:**
- `88e5127` — fix(ssg): inject navbar + footer ke 117 artikel (T22)
- `2cbffc1` — refactor(brand): SIKATIN standalone
- `9acd401` — feat(legal): create disclaimer.html (T19)
- `7eacd29` — feat(legal): expand tentang.html (T21)
- `cf0dba4` — feat(legal): COPPA + retention + UU PDP (T17 polish)
- `6b81758` — feat(legal): Disclaimer + Affiliate sections (T20 polish)
- `b8b0298` — fix(legal): response time (T18 polish)
- `d04813d` — feat(seo): sitemap + footer disclaimer link

**Live verification:**
- Word counts verified via curl ✅
- Section presence verified ✅
- Sitemap 129 URLs + disclaimer match ✅
- Brand: 0 old tagline, new tagline live ✅
- Footer 5 legal links per artikel ✅

**Next**: FASE II content work — T7 audit 20 artikel teratas (natural integration dengan TD-005 + TD-006 rewrite).

### T15 — Core Web Vitals Quick Wins ✅
- Date: 2026-04-21
- Time spent: ~90 min
- Outcome: Lighthouse quick wins deployed. Score uplift per page.

**4 fixes applied (Quick Wins scope):**
- Fix B: `articles-data.min.js` site-wide (-11KB per page)
- Fix D: `width="400" height="225"` pada card thumbnails (card-level CLS guard)
- Fix A: LCP `<link rel="preload" as="image" fetchpriority="high">` di 7 listing pages + 117 artikel detail + tentang
- Fix C: Nginx cache headers (CSS/JS/images 1y immutable, HTML no-cache)

**Lighthouse before/after (mobile, sample 3 URL):**
- Homepage: 52 → 53 (+1), LCP 8.02s → 7.34s
- topik/geopolitik: 55 → 64 (+9), LCP 6.62s → 4.85s (-1.77s)
- artikel/timnas: 59 → 67 (+8), TBT 623ms → 365ms

**Tech debt logged:**
- TD-008: WebP batch conversion (117 images, post-AdSense)
- TD-009: Main-thread JS optimization (risky refactor, post-AdSense)
- TD-010: CLS 0.157 topik featured section (SSG or min-height, post-AdSense)

Commits: `9a0a088`, `205ceac`, `3a83696`, `51880c4`

### T16 — Responsive / Mobile UX ✅
- Date: 2026-04-21
- Time spent: ~45 min (audit + 5 CSS fixes + verify)
- Outcome: All critical tap targets ≥44px, mobile paragraph 16px baseline.

**Audit findings:**
- Viewport meta: 135/135 ✅
- Media queries: 42 across 3 CSS files, 7 breakpoints (400/480/640/768/900/1024/1200)
- `body { overflow-x: hidden }` confirmed — no real horizontal scroll
- 2 CRITICAL tap targets (<36px): `.nav-hamburger`, `.filter-chip`
- 3 borderline (36-40px): `.back-to-top`, `.btn-sm`, `.sort-select`
- Mobile paragraph 15.2px (below 16px baseline)

**5 CSS fixes applied:**
- `.nav-hamburger`: 26×36 → 44×44 (min-width + min-height + flex center)
- `.filter-chip`: 30 → 44 (min-height + inline-flex center)
- `.back-to-top`: 38/42 → 44×44 (both mobile breakpoints)
- `.btn-sm`: 38 → 44 (min-height)
- `.sort-select`: 37 → 44 (min-height)
- `.article-content p` (mobile ≤480px): 15.2 → 16px

**Live verified via curl** — all 44px rules + 16px rule present di components.min.css.
Commit: `5856239`

---

## 🎉 FASE I COMPLETE (T1-T6)

**AdSense Recovery Roadmap — Fase I 100% selesai per 2026-04-20:**
- T1 ✅ Audit rendering /artikel.html
- T2 ✅ Generate HTML static (merged T9, T13)
- T3 ✅ Sitemap.xml (128 URLs, auto-regen)
- T4 ✅ robots.txt clean, no crawler blocker
- T5 ✅ Schema markup (Article + BreadcrumbList + ItemList + WebSite)
- T6 ✅ Meta tags optimization (117 artikel + 7 listing pages)

**Next phase**: FASE II — Content & UX (T7-T16). Prioritas utama T7 (audit 20 artikel teratas) karena natural integration dengan TD-005 + TD-006 fixes.

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

- **2026-04-20** | Bing ghost URL investigation → false alarm, production clean | User melihat 2 URL Lorem Ipsum di Bing result (`cassini-dives-by-saturn`, `badger-buries-cow-carcass`). Verified nginx access log: 404 on both, file tidak pernah ada di sikatin.com. Likely Bing stale index (domain history atau malicious URL submission). | Alternatives considered: (1) Full content rescan — done, 0 matches. (2) Bing Webmaster URL Removal request — skipped (not worth time untuk AdSense goal).
- **2026-04-20** | Apply `410 Gone` nginx response untuk 2 ghost URL | Signal faster de-indexing ke Bing (vs `404 Not Found` yang = "try again later"). Applied sebagai exact-match `location` block sebelum catch-all. TD-007 logged untuk defensive content-quality auto-scan (post-AdSense). | Alternatives: (a) 404 default — slow de-index. (b) 301 redirect ke homepage — misleading, Google might penalize. (c) robots.txt Disallow — not useful for already-indexed URLs.

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
