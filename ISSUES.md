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
_(akan dipindahkan ke sini setelah fix)_
