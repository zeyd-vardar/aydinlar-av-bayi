# Editorial ve mevzuat inceleme notları

Bu dosya hukuki görüş içermez. Aşağıdaki içerikler production yayını öncesinde işletme, konu uzmanı ve gerektiğinde hukuk danışmanı tarafından manuel olarak incelenmelidir.

## Mevzuat ve güvenlik kapsamı

- `src/content/blog/avcilik/` altındaki silah, tüfek, tabanca, ruhsat, avlanma dönemi, korunan/avına izin verilen türler ve resmî prosedür yazıları
- `officialNotice: true` işaretli 36 yazı
- Kamp ateşi kullanımı ve balık türleriyle ilgili dönemsel sınır/yasak bilgisi içeren yazılar

Bu içeriklere fiyat, stok, online sipariş, ödeme, “satın al” veya satış odaklı CTA eklenmemelidir. Mevzuat uyarıları yetkili kurumların güncel resmî kaynaklarına yönlendirmelidir.

### Mevzuat uyarısı bulunan fakat kaynak listesi boş olan yazılar

- `src/content/blog/avcilik/av-tufegi-satin-alirken-nelere-dikkat-edilmelidir.md`
- `src/content/blog/avcilik/avcilik-mevzuati-neden-her-yil-kontrol-edilmelidir.md`
- `src/content/blog/avcilik/daha-buyuk-cap-her-zaman-daha-iyi-midir.md`
- `src/content/blog/avcilik/ikinci-el-tufek-alirken-nelere-dikkat-edilmelidir.md`
- `src/content/blog/avcilik/pompali-av-tufegi-nedir.md`
- `src/content/blog/avcilik/tabanca-bakiminda-nelere-dikkat-edilmelidir.md`
- `src/content/blog/avcilik/tek-kirma-cift-kirma-ve-yari-otomatik-av-tufegi-nedir.md`
- `src/content/blog/avcilik/yeni-baslayanlar-av-tufegi-secerken-nelere-dikkat-etmeli.md`
- `src/content/blog/avcilik/yivli-tufek-ile-yivsiz-tufek-arasindaki-temel-fark-nedir.md`
- `src/content/blog/avcilik/yivli-tufek-nedir.md`
- `src/content/blog/balikcilik/cinekop-ve-sarikanat.md`

## Yayından çıkarılan editoryal test içeriği

`src/content/blog/avcilik/silah-ruhsati-bilgileri-blogda-sabit-yazilmali-mi.md` silinmedi; `draft: true` ile blog listesi, statik rota ve sitemap dışında bırakıldı.

## Olası SEO cannibalization çiftleri

Bu içerikler otomatik olarak birleştirilmedi. Arama niyeti ve içerik kapsamı manuel karşılaştırılmalıdır.

- `misina-mi-orgu-ip-mi.md` ↔ `orgu-ip-mi-misina-mi.md`
- `1000-2000-3000-ve-4000-lik-makine-ne-demektir.md` ↔ `3000-lik-makine-ne-demek.md` ↔ `olta-makinesi-numaralari-ne-anlama-gelir.md`
- `kamp-icin-hangi-mat-alinmali.md` ↔ `kamp-mati-neden-onemlidir.md`
- `yapay-yem-nedir.md` ↔ `yapay-yem-cesitleri.md`
- `durbun-mercek-capi.md` ↔ `durbundeki-10x42-ne-demek.md` ↔ `8x42-ve-10x42-arasindaki-fark.md`
- `kampcilik/katmanli-giyim.md` ↔ `avcilik/katmanli-giyim-nedir.md`
- `avcilik/telefon-cekmediginde-ne-yapilmali.md` ↔ `kampcilik/telefon-cekmeyen-bolgelerde.md`

Birleştirme veya yönlendirme kararı verilirse önce içerik kalitesi, organik görünürlük ve mevcut iç bağlantılar incelenmelidir.
