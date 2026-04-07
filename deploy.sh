#!/bin/bash
# SIKATIN - Deploy langsung dari laptop ke VPS
# Usage: bash deploy.sh

SERVER="root@103.160.213.208"
REMOTE_DIR="/var/www/sikatin"
LOCAL_DIR="E:/SIKATIN/WEBSITE/V1"
PW="8yd24ceatpch48"

echo "========================================="
echo "  SIKATIN DEPLOY - Laptop → VPS"
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

echo "[1/3] Syncing files ke VPS..."

# Upload semua file (exclude .git dan node_modules)
"$PSCP" -pw "$PW" -r -q \
    "$LOCAL_DIR/index.html" \
    "$LOCAL_DIR/admin.html" \
    "$LOCAL_DIR/editor.html" \
    "$LOCAL_DIR/artikel.html" \
    "$LOCAL_DIR/tentang.html" \
    "$LOCAL_DIR/kontak.html" \
    "$LOCAL_DIR/robots.txt" \
    "$LOCAL_DIR/sitemap.xml" \
    "$SERVER:$REMOTE_DIR/" 2>/dev/null

echo "  ✓ HTML files"

"$PSCP" -pw "$PW" -r -q "$LOCAL_DIR/css" "$SERVER:$REMOTE_DIR/" 2>/dev/null
echo "  ✓ CSS"

"$PSCP" -pw "$PW" -r -q "$LOCAL_DIR/js" "$SERVER:$REMOTE_DIR/" 2>/dev/null
echo "  ✓ JavaScript"

"$PSCP" -pw "$PW" -r -q "$LOCAL_DIR/artikel" "$SERVER:$REMOTE_DIR/" 2>/dev/null
echo "  ✓ Artikel (43 files)"

"$PSCP" -pw "$PW" -r -q "$LOCAL_DIR/topik" "$SERVER:$REMOTE_DIR/" 2>/dev/null
echo "  ✓ Topik"

"$PSCP" -pw "$PW" -r -q "$LOCAL_DIR/img" "$SERVER:$REMOTE_DIR/" 2>/dev/null
echo "  ✓ Images"

"$PSCP" -pw "$PW" -r -q "$LOCAL_DIR/logo" "$SERVER:$REMOTE_DIR/" 2>/dev/null
echo "  ✓ Logo"

echo ""
echo "[2/3] Reload Nginx..."
"$PLINK" -ssh "$SERVER" -pw "$PW" -batch "nginx -t 2>&1 && systemctl reload nginx && echo OK" 2>/dev/null

echo ""
echo "[3/3] Verifikasi..."
"$PLINK" -ssh "$SERVER" -pw "$PW" -batch "ls $REMOTE_DIR/artikel/*.html | wc -l" 2>/dev/null
echo " artikel di server"

echo ""
echo "========================================="
echo "  ✅ DEPLOY SELESAI!"
echo "  🌐 https://sikatin.com"
echo "========================================="
