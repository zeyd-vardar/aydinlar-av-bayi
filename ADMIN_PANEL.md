# Yönetici paneli kurulumu

## Mimari

Public Astro sitesi statik olarak GitHub Pages üzerinde kalır. Gerçek authentication ve ürün yönetimi `admin-server/` içindeki ayrı Node.js servisi tarafından sağlanır. Backend PostgreSQL kullanır; ürün görselleri S3 veya Cloudflare R2 uyumlu nesne depolamaya yüklenir.

Panelde mevcut sitenin bağlandığı şu alanlar bulunur:

- Genel Bakış
- Mağaza adresi, telefon, WhatsApp, çalışma saatleri ve sosyal medya hesapları
- Balıkçılık, avcılık ve kampçılık markaları
- Önerilen Ürünler / Yeni Gelen Ürünler; görsel, açıklama ve özellik yönetimi
- Blog yazısı ekleme, düzenleme, taslak/yayın ve silme
- Şifre değiştirme
- Çıkış

GitHub Pages statik olduğu için mağaza, marka ve blog değişiklikleri kaydedildikten sonra backend `repository_dispatch` ile yeni Pages derlemesini tetikler. Ürün vitrini ayrıca public API üzerinden güncel veriyi doğrudan alır.

## İlk kurulum

```sh
cd admin-server
npm ci
npm run migrate
npm run admin:seed
npm run blog:import
```

`admin:seed` çalıştırılmadan önce `DATABASE_URL`, `DATABASE_SSL`, `ADMIN_EMAIL` ve `ADMIN_INITIAL_PASSWORD` yalnızca sunucu ortamında tanımlanmalıdır. Seed komutu parolayı Argon2id ile hashler, veritabanına düz metin yazmaz ve ikinci hesap oluşturmaz. İlk girişte şifre değiştirme zorunludur.

Gerçek secret değerleri `.env`, GitHub repository variable veya frontend build değişkeni olarak tutulmamalıdır. Backend hosting servisinin secret yöneticisi kullanılmalıdır.

## Backend environment değişkenleri

Eksiksiz isimler `admin-server/.env.example` dosyasındadır. Zorunlu gruplar:

- Veritabanı: `DATABASE_URL`, `DATABASE_SSL`
- Domain: `ADMIN_ORIGIN`, `PUBLIC_SITE_ORIGIN`, `TRUST_PROXY`
- İlk hesap: `ADMIN_EMAIL`, yalnızca seed sırasında `ADMIN_INITIAL_PASSWORD`
- Oturum/güvenlik süreleri: `SESSION_IDLE_MINUTES`, `SESSION_ABSOLUTE_HOURS`, `LOGIN_MAX_ATTEMPTS`, `LOGIN_LOCK_MINUTES`, `RESET_TOKEN_MINUTES`
- Görsel depolama: `S3_ENDPOINT`, `S3_REGION`, `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_PUBLIC_BASE_URL`
- E-posta: `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM`
- Site derleme tetikleyicisi: `GITHUB_REPOSITORY`, `GITHUB_DISPATCH_TOKEN`

`GITHUB_DISPATCH_TOKEN` yalnızca backend secret yöneticisinde tutulmalıdır. Fine-grained token yalnız ilgili repository için `Contents: write` yetkisine sahip olmalıdır. GitHub Pages repository variables alanında şu secret olmayan değerler tanımlanır:

- `PUBLIC_PRODUCTS_API_URL=https://aydinlarav.com/api/public/products`
- `PUBLIC_CONTENT_API_URL=https://aydinlarav.com/api/public/content`

`npm run blog:import` mevcut `src/content/blog` yazılarını ilk kurulumda veritabanına aktarır. Komut tekrar çalıştırılabilir; aynı slug değerine sahip kayıtları günceller.

## Veritabanı

`migrations/001_initial.sql` ve `002_content_management.sql` şu tabloları ve alanları oluşturur:

- `administrators`: `id = 1` CHECK ve primary key ile veritabanı düzeyinde tek hesap
- `admin_sessions`: hashlenmiş session tokenları, hareketsizlik ve mutlak bitiş süreleri
- `password_reset_tokens`: hashlenmiş, süreli ve tek kullanımlık reset tokenları
- `login_rate_limits`: IP anahtarlarının hashleriyle hız sınırlama
- `admin_audit_logs`: hassas değer içermeyen yönetim olayları
- `products`: önerilen ve yeni gelen ürün kayıtları
- `store_settings`: tek mağazanın iletişim, adres, saat ve sosyal medya bilgileri
- `brands`: kategori, sıralama ve yayın durumuyla marka kayıtları
- `blog_posts`: blog içeriği, kategori, SEO özeti, etiket ve yayın durumu
- `schema_migrations`: tekrarlanabilir migration takibi

## Oturum ve kurtarma

- Cookie production ortamında `HttpOnly`, `Secure`, `SameSite=Strict` ve kalıcı `Expires/Max-Age` olmadan oluşturulur.
- Oturum 30 dakika hareketsizlikte, her durumda en fazla 4 saatte sona erer. Değerler environment üzerinden güvenli sınırlar içinde değiştirilebilir.
- Şifre değişikliğinde ve reset işleminde bütün eski sessionlar iptal edilir, session fixation önlenir.
- SMTP yapılandırılmadıysa arayüz başarılı gönderim taklidi yapmaz ve servis eksikliğini açıkça bildirir.
- SMTP kullanılamıyorsa sunucuda `ADMIN_EMAIL` ve `ADMIN_RESET_PASSWORD` geçici olarak tanımlanıp `npm run admin:reset-password` çalıştırılabilir. Yeni parola loglanmaz ve ilk girişte yeniden değiştirilmesi gerekir.

## Domain ve deployment

GitHub Pages backend çalıştıramaz. `admin-server` PostgreSQL erişimi ve kalıcı secret yönetimi bulunan Node.js destekli ayrı bir serviste yayınlanmalıdır. Dockerfile bu amaçla hazırdır.

`aydinlarav.com` DNS kaydı tek başına yol bazlı yönlendirme yapamaz. Cloudflare Worker, reverse proxy veya eşdeğer edge routing ile şu davranış kurulmalıdır:

```text
/panel, /panel/*                 -> admin backend
/api/admin/*                    -> admin backend
/api/public/products            -> admin backend
/api/public/content             -> admin backend
/healthz                        -> admin backend
diğer tüm yollar                -> 301 https://trabzonavbayi.com{path}{query}
```

Proxy, gerçek HTTPS protokolünü backend'e doğru iletmeli; backend servisinde `TRUST_PROXY=true` ve `NODE_ENV=production` olmalıdır. `/panel` yolları hiçbir sitemap'e eklenmez ve backend `X-Robots-Tag: noindex, nofollow, noarchive` gönderir.

## Güvenlik özellikleri

- Argon2id parola hashing
- Tek yönetici hesabı ve public kayıt endpoint'i bulunmaması
- Parameterized PostgreSQL sorguları
- Sunucu taraflı session ve her korumalı istekte aktif admin yetkilendirmesi
- İlk giriş zorunlu parola değişimi
- IP ve hesap tabanlı geçici brute-force kilidi
- Tek kullanımlık CSRF tokenı ve Origin doğrulaması
- CSP, clickjacking, MIME sniffing, referrer ve production HSTS başlıkları
- Panel için `no-store` cache politikası
- 5 MB sınırı ve MIME allowlist'i olan ürün görseli yükleme
- Kullanıcı girdisini HTML olarak çalıştırmayan, güvenli sınırlı blog biçimlendirmesi
- Login, logout, parola, mağaza, marka, blog ve ürün işlemleri için audit log
- Production kullanıcılarına stack trace veya veritabanı hatası göstermeyen hata yönetimi

## Çalıştırma

```sh
cd admin-server
npm run typecheck
npm test
npm run build
npm start
```

Sunucu çalışma dizini `admin-server/` olmalıdır. Sağlık kontrolü `/healthz` yolundadır.
