#!/bin/bash
# SIKATIN - Deploy langsung dari laptop ke VPS
# Usage: bash deploy.sh

SERVER="root@103.160.213.208"
REMOTE_DIR="/var/www/sikatin"
LOCAL_DIR="E:/SIKATIN/WEBSITE/V1"
PW="8yd24ceatpch48"

# Auto cache-busting version (timestamp)
VERSION=$(date +%Y%m%d%H%M%S)

echo "========================================="
echo "  SIKATIN DEPLOY - Laptop → VPS"
echo "  Version: $VERSION"
echo "========================================="
echo ""

# Use plink + pscp (PuTTY tools) since they support password
PLINK="E:/plink.exe"
PSCP="E:/pscp.exe"

if [ ! -f "$PLINK" ]; then
    echo "ERROR: plink.exe not found at $PLINK"
    echo "Download from: https://www.chiark.greenend.org.uk/~sgtatham/putty/latest.html"
    exit 1
fi

echo "[1/4] Syncing files ke VPS..."

# Update version.txt with current deploy version
echo "$VERSION" > "$LOCAL_DIR/version.txt"

# Upload semua file
"$PSCP" -pw "$PW" -r -q \
    "$LOCAL_DIR/index.html" \
    "$LOCAL_DIR/admin.html" \
    "$LOCAL_DIR/editor.html" \
    "$LOCAL_DIR/artikel.html" \
    "$LOCAL_DIR/tentang.html" \
    "$LOCAL_DIR/kontak.html" \
    "$LOCAL_DIR/privasi.html" \
    "$LOCAL_DIR/syarat.html" \
    "$LOCAL_DIR/robots.txt" \
    "$LOCAL_DIR/sitemap.xml" \
    "$LOCAL_DIR/version.txt" \
    "$SERVER:$REMOTE_DIR/" 2>/dev/null

echo "  ✓ HTML files"

"$PSCP" -pw "$PW" -r -q "$LOCAL_DIR/css" "$SERVER:$REMOTE_DIR/" 2>/dev/null
echo "  ✓ CSS"

"$PSCP" -pw "$PW" -r -q "$LOCAL_DIR/js" "$SERVER:$REMOTE_DIR/" 2>/dev/null
echo "  ✓ JavaScript"

"$PSCP" -pw "$PW" -r -q "$LOCAL_DIR/artikel" "$SERVER:$REMOTE_DIR/" 2>/dev/null
echo "  ✓ Artikel"

"$PSCP" -pw "$PW" -r -q "$LOCAL_DIR/topik" "$SERVER:$REMOTE_DIR/" 2>/dev/null
echo "  ✓ Topik"

"$PSCP" -pw "$PW" -r -q "$LOCAL_DIR/img" "$SERVER:$REMOTE_DIR/" 2>/dev/null
echo "  ✓ Images"

"$PSCP" -pw "$PW" -r -q "$LOCAL_DIR/logo" "$SERVER:$REMOTE_DIR/" 2>/dev/null
echo "  ✓ Logo"

echo ""
echo "[2/4] Cache busting (v=$VERSION)..."
"$PLINK" -ssh "$SERVER" -pw "$PW" -batch "
cd $REMOTE_DIR
# Update existing versioned CSS/JS
find . -name '*.html' -exec sed -i 's|\.css?v=[0-9]*|.css?v=$VERSION|g' {} \;
find . -name '*.html' -exec sed -i 's|\.js?v=[0-9]*|.js?v=$VERSION|g' {} \;
# Add version to unversioned JS files
find . -name '*.html' -exec sed -i 's|articles-data\.js\"|articles-data.js?v=$VERSION\"|g' {} \;
find . -name '*.html' -exec sed -i 's|main\.js\"|main.js?v=$VERSION\"|g' {} \;
find . -name '*.html' -exec sed -i 's|user-prefs\.js\"|user-prefs.js?v=$VERSION\"|g' {} \;
find . -name '*.html' -exec sed -i 's|search\.js\"|search.js?v=$VERSION\"|g' {} \;
find . -name '*.html' -exec sed -i 's|article-sidebar\.js\"|article-sidebar.js?v=$VERSION\"|g' {} \;
find . -name '*.html' -exec sed -i 's|admin-auth\.js\"|admin-auth.js?v=$VERSION\"|g' {} \;
find . -name '*.html' -exec sed -i 's|inline-editor\.js\"|inline-editor.js?v=$VERSION\"|g' {} \;
# Fix double versioning
find . -name '*.html' -exec sed -i 's|\.js?v=[0-9]*?v=[0-9]*|.js?v=$VERSION|g' {} \;
echo 'Cache busted'
" 2>/dev/null
echo "  ✓ All CSS/JS versioned to v=$VERSION"

echo ""
echo "[3/4] Reload Nginx..."
"$PLINK" -ssh "$SERVER" -pw "$PW" -batch "nginx -t 2>&1 && systemctl reload nginx && echo OK" 2>/dev/null

echo ""
echo "[4/4] Verifikasi..."
"$PLINK" -ssh "$SERVER" -pw "$PW" -batch "ls $REMOTE_DIR/artikel/*.html | wc -l" 2>/dev/null
echo " artikel di server"

echo ""
echo "========================================="
echo "  ✅ DEPLOY SELESAI!"
echo "  🌐 https://sikatin.com"
echo "  📦 Cache version: $VERSION"
echo "========================================="
