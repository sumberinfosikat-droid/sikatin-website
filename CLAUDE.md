# SIKATIN Project Instructions

## Deploy Workflow (WAJIB DIIKUTI)

**ATURAN UTAMA: Jangan pernah deploy ke VPS tanpa persetujuan user.**

Setiap kali melakukan perubahan pada file HTML, CSS, atau JS:

1. **Edit file** di local
2. **Tunjukkan preview** menggunakan preview_screenshot agar user bisa lihat hasilnya
3. **Tunggu user bilang "oke"** atau persetujuan eksplisit
4. **Baru deploy ke VPS** menggunakan PSCP dan PLINK

Jangan pernah langsung deploy setelah edit. Selalu tunjukkan dulu ke user.

## Deploy Commands

```
# Upload file ke VPS
E:/pscp.exe -pw 8yd24ceatpch48 -batch [LOCAL_FILE] root@103.160.213.208:/var/www/sikatin/[REMOTE_PATH]

# Jalankan command di VPS
E:/plink.exe -pw 8yd24ceatpch48 -batch root@103.160.213.208 "[COMMAND]"
```

## Server Info
- VPS IP: 103.160.213.208
- Web root: /var/www/sikatin/
- Preview server: port 3456 (npx serve)
- Cache busting: gunakan ?v=YYYYMMDD pada CSS/JS references

## Major Update Protocol (WAJIB)

Jika user minta perubahan besar (redesign layout, ubah grid, perubahan visual signifikan):

1. **Buat backup dulu** - Copy folder V1 ke folder backup dengan timestamp:
   ```
   xcopy E:\SIKATIN\WEBSITE\V1 E:\SIKATIN\WEBSITE\BACKUP_[YYYYMMDD_HHMM] /E /I /H /Y
   ```
2. **Kerjakan perubahan** di folder V1 (local)
3. **Tunjukkan preview** ke user
4. **Jika user setuju** → deploy ke VPS
5. **Jika user tidak setuju** → revert dari backup

Contoh perubahan yang termasuk "major update":
- Redesign homepage layout/grid
- Ubah navbar/footer design
- Ganti color scheme atau typography
- Tambah section baru di halaman utama
- Perubahan CSS yang mempengaruhi banyak halaman

## Minification di Server
- CSS: clean-css-cli (`cleancss -o file.min.css file.css`)
- JS: uglify-js (`uglifyjs file.js -o file.min.js`)
- Images: cwebp untuk konversi WebP

## Automation Tools (tools/)

**SEBELUM deploy apa pun**, jalankan pipeline audit+fix. Tools ini idempotent
dan aman di-rerun.

### Quick commands
```bash
# Audit saja (no writes)
node tools/seo-audit.js

# Fix semua issue SEO (idempotent)
node tools/seo-fix.js --write

# Unify cache-bust ke tanggal hari ini
node tools/cache-bust-unify.js --write

# Pipeline penuh: audit → fix → bump → sitemap → deploy
node tools/deploy-pipeline.js --deploy
node tools/deploy-pipeline.js --fix       # fix local, no deploy
node tools/deploy-pipeline.js --check     # audit only (exit 0 = clean)
```

### Tool catalog
- `tools/seo-audit.js` — scan semua HTML, report issue per severity. Skip halaman noindex.
- `tools/seo-fix.js` — idempotent fixer: JSON-LD (absolute image, ISO date, dateModified, mainEntityOfPage, publisher.logo), meta OG/Twitter, og:image derivasi dari slug.
- `tools/cache-bust-unify.js` — rewrite semua `?v=...` di CSS/JS local refs ke satu version (default hari ini YYYYMMDD). Hati-hati: regex pakai lookbehind quote/space supaya tidak kena URL eksternal.
- `tools/deploy-pipeline.js` — orchestrator: audit→fix→bump→sitemap→upload→minify→verify.
- `tools/build-article.js` — template v2 (full-featured) untuk generate artikel dari spec JSON.
- `tools/generate-sitemap.js` — sitemap.xml generator dari articles-data.js.
- `tools/indexnow-submit.js` — ping Bing/Yandex/Seznam untuk URL baru.

### Standar SEO (wajib di setiap artikel baru)
Template `build-article.js` sudah generate semua ini otomatis:
- Meta: title, description, canonical, og:url, og:title, og:description, og:type, og:image, twitter:card, twitter:title, twitter:description, twitter:image
- JSON-LD `Article`: headline, description, image (absolute URL), author, publisher (dengan logo), datePublished (ISO), dateModified (ISO), mainEntityOfPage
- Robots meta: tidak ada untuk artikel publik; `noindex, nofollow` untuk halaman internal (admin, editor, status, LAPORAN).

### Workflow publish artikel baru
1. Buat spec di `tools/specs/<slug>.json`
2. `node tools/build-article.js tools/specs/<slug>.json`
3. Tambah entri ke `js/articles-data.js`
4. (Opsional) Tambah image real ke `img/artikel/<slug>.jpg` dan `.webp`
5. `node tools/deploy-pipeline.js --deploy`
6. `node tools/indexnow-submit.js --url https://sikatin.com/artikel/<slug>.html`
