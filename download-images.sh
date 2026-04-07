#!/bin/bash
# Download curated Unsplash images for SIKATIN articles
DIR="img/artikel"
mkdir -p "$DIR"

download() {
    local id="$1" url="$2"
    if [ ! -f "$DIR/${id}.jpg" ]; then
        echo "Downloading: $id"
        curl -sL -o "$DIR/${id}.jpg" "$url" 2>/dev/null
    else
        echo "Skip (exists): $id"
    fi
}

# GEOPOLITIK
download "geopolitik-taiwan" "https://images.unsplash.com/photo-1513836279014-a89f7a76ae86?w=1200&h=630&fit=crop&q=80"
download "geopolitik-asean" "https://images.unsplash.com/photo-1562016600-ece13e8ba570?w=1200&h=630&fit=crop&q=80"
download "geopolitik-energi" "https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?w=1200&h=630&fit=crop&q=80"
download "geopolitik-laut-china-selatan" "https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=1200&h=630&fit=crop&q=80"
download "geopolitik-brics" "https://images.unsplash.com/photo-1529107386315-e1a2ed48a620?w=1200&h=630&fit=crop&q=80"
download "geopolitik-nuklir" "https://images.unsplash.com/photo-1591696205602-2f950c417cb9?w=1200&h=630&fit=crop&q=80"

# SELF-IMPROVEMENT
download "growth-mindset" "https://images.unsplash.com/photo-1499750310107-5fef28a66643?w=1200&h=630&fit=crop&q=80"
download "kebiasaan-atomic" "https://images.unsplash.com/photo-1484480974693-6ca0a78fb36b?w=1200&h=630&fit=crop&q=80"
download "kecerdasan-emosional" "https://images.unsplash.com/photo-1544027993-37dbfe43562a?w=1200&h=630&fit=crop&q=80"
download "journaling-produktif" "https://images.unsplash.com/photo-1517842645767-c639042777db?w=1200&h=630&fit=crop&q=80"
download "public-speaking" "https://images.unsplash.com/photo-1475721027785-f74eccf877e2?w=1200&h=630&fit=crop&q=80"
download "digital-detox" "https://images.unsplash.com/photo-1515378960530-7c0da6231fb1?w=1200&h=630&fit=crop&q=80"

# HISTORY
download "sejarah-majapahit" "https://images.unsplash.com/photo-1588668214407-6ea9a6d8c272?w=1200&h=630&fit=crop&q=80"
download "sejarah-reformasi" "https://images.unsplash.com/photo-1541872703-74c5e44368f9?w=1200&h=630&fit=crop&q=80"
download "sejarah-sumpah-pemuda" "https://images.unsplash.com/photo-1596887245124-5765894e46cf?w=1200&h=630&fit=crop&q=80"
download "perang-dunia-dampak" "https://images.unsplash.com/photo-1580752300992-559f8e0734e0?w=1200&h=630&fit=crop&q=80"
download "sejarah-silk-road" "https://images.unsplash.com/photo-1548013146-72479768bada?w=1200&h=630&fit=crop&q=80"
download "sejarah-perang-dingin" "https://images.unsplash.com/photo-1568792923760-d70635a89fdc?w=1200&h=630&fit=crop&q=80"

# ENGINEERING
download "rekayasa-jembatan" "https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=1200&h=630&fit=crop&q=80"
download "teknik-robotika" "https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=1200&h=630&fit=crop&q=80"
download "energi-terbarukan" "https://images.unsplash.com/photo-1509391366360-2e959784a276?w=1200&h=630&fit=crop&q=80"
download "teknik-ai-chip" "https://images.unsplash.com/photo-1518770660439-4636190af475?w=1200&h=630&fit=crop&q=80"
download "teknik-megaproyek" "https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=1200&h=630&fit=crop&q=80"
download "teknik-bioteknologi" "https://images.unsplash.com/photo-1532187863486-abf9dbad1b69?w=1200&h=630&fit=crop&q=80"

# PENDIDIKAN
download "kesehatan-mental-pelajar" "https://images.unsplash.com/photo-1509062522246-3755977927d7?w=1200&h=630&fit=crop&q=80"
download "pembelajaran-berbasis-proyek" "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=1200&h=630&fit=crop&q=80"
download "pendidikan-inklusif" "https://images.unsplash.com/photo-1577896851231-70ef18881754?w=1200&h=630&fit=crop&q=80"
download "pendidikan-finansial" "https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=1200&h=630&fit=crop&q=80"
download "pendidikan-stem" "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=1200&h=630&fit=crop&q=80"
download "pendidikan-karakter" "https://images.unsplash.com/photo-1427504494785-3a9ca7044f45?w=1200&h=630&fit=crop&q=80"
download "pendidikan-homeschooling" "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=1200&h=630&fit=crop&q=80"
download "pendidikan-gap-year" "https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=1200&h=630&fit=crop&q=80"
download "peran-orang-tua" "https://images.unsplash.com/photo-1476703993599-0035a21b17a9?w=1200&h=630&fit=crop&q=80"
download "lingkungan-belajar" "https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=1200&h=630&fit=crop&q=80"

# TEKNOLOGI
download "kecerdasan-buatan-pendidikan" "https://images.unsplash.com/photo-1677442136019-21780ecad995?w=1200&h=630&fit=crop&q=80"
download "teknologi-dalam-pendidikan" "https://images.unsplash.com/photo-1531482615713-2afd69097998?w=1200&h=630&fit=crop&q=80"
download "teknologi-blockchain" "https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=1200&h=630&fit=crop&q=80"
download "teknologi-quantum" "https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=1200&h=630&fit=crop&q=80"

# TIPS
download "tips-belajar-efektif" "https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=1200&h=630&fit=crop&q=80"
download "manajemen-waktu" "https://images.unsplash.com/photo-1506784983877-45594efa4cbe?w=1200&h=630&fit=crop&q=80"
download "membaca-kritis" "https://images.unsplash.com/photo-1457369804613-52c61a468e7d?w=1200&h=630&fit=crop&q=80"

# KURIKULUM
download "kurikulum-merdeka" "https://images.unsplash.com/photo-1523050854058-8df90110c8f1?w=1200&h=630&fit=crop&q=80"

# LITERASI
download "literasi-digital" "https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=1200&h=630&fit=crop&q=80"

echo "=== DONE ==="
ls -la "$DIR/" | wc -l
