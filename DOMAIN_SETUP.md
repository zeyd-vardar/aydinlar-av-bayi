# Domain ve production handoff

## Alan adı stratejisi

- Primary domain: `https://trabzonavbayi.com`
- Redirect domain: `https://aydinlarav.com`
- Canonical domain yalnızca `https://trabzonavbayi.com` olmalıdır.
- `www.trabzonavbayi.com`, `http://trabzonavbayi.com` ve tüm `aydinlarav.com` sürümleri sunucu/domain sağlayıcısı tarafında `301 Permanent Redirect` ile primary domaine yönlendirilmelidir.
- Yönlendirmelerde path ve query string korunmalıdır.
- `aydinlarav.com` ayrı veya indekslenebilir bir site olarak yayınlanmamalıdır.

Bu repository DNS kaydı, registrar yönlendirmesi, GitHub Pages Custom Domain ayarı veya `CNAME` dosyası oluşturmaz. Bunlar son kod incelemesinden sonra yetkili geliştirici tarafından yapılmalıdır.

## Build ortamları

Production build:

```text
PUBLIC_SITE_URL=https://trabzonavbayi.com
PUBLIC_BASE_PATH=/
```

GitHub Pages test build'i:

```text
PUBLIC_SITE_URL=https://zeyd-vardar.github.io
PUBLIC_BASE_PATH=/aydinlar-av-bayi
```

GitHub Actions mevcut durumda test adresini kullanır. Repository variable olarak `PUBLIC_SITE_URL=https://trabzonavbayi.com` tanımlandığında workflow base path'i otomatik olarak kök `/` yapar. Custom domain bağlanmadan bu değişken tanımlanmamalıdır.

## SEO beklentileri

- Production canonical, Open Graph, JSON-LD, robots ve sitemap URL'leri yalnızca `https://trabzonavbayi.com` kullanır.
- Sitemap yalnızca primary domain URL'lerini içermelidir.
- `aydinlarav.com` schema `sameAs` alanına veya canonical alternatifine eklenmemelidir.
- `https://trabzonavbayi.com/robots.txt` içindeki sitemap satırı `https://trabzonavbayi.com/sitemap-index.xml` olmalıdır.

## Yayın öncesi manuel doğrulamalar

- GitHub Pages Custom Domain ve DNS kayıtları
- HTTPS sertifikası ve HTTP → HTTPS yönlendirmesi
- `www` → non-`www` 301 yönlendirmesi
- `aydinlarav.com` → `trabzonavbayi.com` path/query korumalı 301 yönlendirmesi
- Gizlilik Politikası, KVKK Aydınlatma Metni ve Çerez Politikası nihai hukuk metinleri
- Google Maps, YouTube ve isteğe bağlı analytics kullanımı için çerez/onay gereksinimi
- Kurumsal e-posta adresinin (`merhaba@aydinlaravbayi.com`) aktifliği ve domain uyumu
- Ana sayfadaki mağaza dış cephe görselinin gerçek işletme fotoğrafı olup olmadığı
- Silah, tüfek, tabanca, ruhsat, av mevzuatı ve dönemsel yasak içeriklerinin uzman/hukuk incelemesi

## Domain bağlantısından sonra testler

1. HTTPS ile ana sayfa ve tüm temel rotaları açın.
2. `www`, HTTP ve redirect domain varyasyonlarında 301 ve hedef URL'yi doğrulayın.
3. Canonical, Open Graph, JSON-LD, `robots.txt` ve sitemap çıktısını canlı ortamda kontrol edin.
4. Search Console'a primary domaini ekleyip sitemap'i gönderin.
5. Google Business Profile web sitesi URL'sini güncelleyin.
6. WhatsApp, telefon, e-posta, Google Maps, Instagram ve sosyal paylaşım önizlemesini test edin.
7. Mobil ve masaüstünde menü, galeri, blog, iletişim ve footer alanlarını manuel kontrol edin.
