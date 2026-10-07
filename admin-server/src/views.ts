import type { Administrator, BlogPost, Brand, Product, StoreSettings } from './types.js';

function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function document(title: string, content: string, authenticated = false) {
  return `<!doctype html>
<html lang="tr">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="robots" content="noindex, nofollow, noarchive">
    <title>${escapeHtml(title)} | Aydınlar Yönetim</title>
    <link rel="stylesheet" href="/panel/assets/panel.css">
  </head>
  <body class="${authenticated ? 'panel-shell' : 'auth-shell'}">
    ${content}
  </body>
</html>`;
}

function navigation(csrfToken: string) {
  return `<aside class="sidebar">
    <a class="panel-brand" href="/panel/dashboard">AYDINLAR <span>Yönetim</span></a>
    <nav aria-label="Yönetim menüsü">
      <a href="/panel/dashboard">Genel Bakış</a>
      <a href="/panel/store">Mağaza Bilgileri</a>
      <a href="/panel/brands">Markalar</a>
      <a href="/panel/products">Ürünler</a>
      <a href="/panel/blog">Blog</a>
      <a href="/panel/change-password">Şifre Değiştir</a>
    </nav>
    <form method="post" action="/panel/logout">
      <input type="hidden" name="csrfToken" value="${escapeHtml(csrfToken)}">
      <button class="link-button" type="submit">Çıkış Yap</button>
    </form>
  </aside>`;
}

function panelPage(title: string, csrfToken: string, content: string) {
  return document(
    title,
    `${navigation(csrfToken)}<main class="panel-main"><header class="panel-header"><h1>${escapeHtml(title)}</h1></header>${content}</main>`,
    true,
  );
}

function message(text?: string, kind: 'error' | 'success' = 'error') {
  return text ? `<p class="notice ${kind}" role="alert">${escapeHtml(text)}</p>` : '';
}

export function loginView(error?: string) {
  return document(
    'Giriş Yap',
    `<main class="auth-card">
      <div class="auth-brand">AYDINLAR <span>Yönetim</span></div>
      <h1>Yönetici Girişi</h1>
      <p>Devam etmek için yönetici hesabınızla giriş yapın.</p>
      ${message(error)}
      <form method="post" action="/panel/login" class="stack-form">
        <label>E-posta<input type="email" name="email" autocomplete="username" required maxlength="254"></label>
        <label>Şifre<input type="password" name="password" autocomplete="current-password" required maxlength="128"></label>
        <button class="primary-button" type="submit">Giriş Yap</button>
      </form>
      <a class="subtle-link" href="/panel/forgot-password">Şifremi Unuttum</a>
    </main>`,
  );
}

export function forgotPasswordView(options: { error?: string; success?: string } = {}) {
  return document(
    'Şifremi Unuttum',
    `<main class="auth-card">
      <div class="auth-brand">AYDINLAR <span>Yönetim</span></div>
      <h1>Şifre Sıfırlama</h1>
      <p>Kayıtlı yönetici e-posta adresinizi girin.</p>
      ${message(options.error)}${message(options.success, 'success')}
      <form method="post" action="/panel/forgot-password" class="stack-form">
        <label>E-posta<input type="email" name="email" autocomplete="username" required maxlength="254"></label>
        <button class="primary-button" type="submit">Sıfırlama Bağlantısı Gönder</button>
      </form>
      <a class="subtle-link" href="/panel">Giriş sayfasına dön</a>
    </main>`,
  );
}

export function resetPasswordView(token: string, error?: string) {
  return document(
    'Yeni Şifre Belirle',
    `<main class="auth-card">
      <div class="auth-brand">AYDINLAR <span>Yönetim</span></div>
      <h1>Yeni Şifre Belirle</h1>
      <p>En az 12 karakterden oluşan güçlü bir şifre kullanın.</p>
      ${message(error)}
      <form method="post" action="/panel/reset-password" class="stack-form">
        <input type="hidden" name="token" value="${escapeHtml(token)}">
        <label>Yeni şifre<input type="password" name="password" autocomplete="new-password" required minlength="12" maxlength="128"></label>
        <label>Yeni şifre tekrar<input type="password" name="passwordConfirm" autocomplete="new-password" required minlength="12" maxlength="128"></label>
        <button class="primary-button" type="submit">Şifreyi Güncelle</button>
      </form>
    </main>`,
  );
}

export function changePasswordView(
  csrfToken: string,
  firstLogin: boolean,
  options: { error?: string; success?: string } = {},
) {
  const content = `<section class="content-card narrow">
    <p>${firstLogin ? 'İlk girişinizi tamamlamak için geçici şifrenizi değiştirmeniz gerekir.' : 'Hesabınız için yeni ve güçlü bir şifre belirleyin.'}</p>
    ${message(options.error)}${message(options.success, 'success')}
    <form method="post" action="/panel/change-password" class="stack-form">
      <input type="hidden" name="csrfToken" value="${escapeHtml(csrfToken)}">
      <label>Yeni şifre<input type="password" name="password" autocomplete="new-password" required minlength="12" maxlength="128"></label>
      <label>Yeni şifre tekrar<input type="password" name="passwordConfirm" autocomplete="new-password" required minlength="12" maxlength="128"></label>
      <button class="primary-button" type="submit">Şifreyi Değiştir</button>
    </form>
  </section>`;
  if (firstLogin) {
    return document(
      'Şifre Değiştir',
      `<main class="auth-card wide"><div class="auth-brand">AYDINLAR <span>Yönetim</span></div><h1>Şifrenizi Değiştirin</h1>${content}</main>`,
    );
  }
  return panelPage('Şifre Değiştir', csrfToken, content);
}

export function dashboardView(
  csrfToken: string,
  admin: Administrator,
  stats: Record<string, unknown>,
) {
  const lastUpdate = stats.last_update
    ? new Intl.DateTimeFormat('tr-TR', { dateStyle: 'medium', timeStyle: 'short' }).format(
        new Date(String(stats.last_update)),
      )
    : 'Henüz ürün yok';
  const lastLogin = admin.lastLoginAt
    ? new Intl.DateTimeFormat('tr-TR', { dateStyle: 'medium', timeStyle: 'short' }).format(
        admin.lastLoginAt,
      )
    : 'İlk giriş';
  return panelPage(
    'Genel Bakış',
    csrfToken,
    `<section class="stats-grid">
      <article><span>Toplam ürün</span><strong>${Number(stats.total_products ?? 0)}</strong></article>
      <article><span>Önerilen ürün</span><strong>${Number(stats.recommended_products ?? 0)}</strong></article>
      <article><span>Yeni gelen ürün</span><strong>${Number(stats.new_products ?? 0)}</strong></article>
      <article><span>Marka</span><strong>${Number(stats.total_brands ?? 0)}</strong></article>
      <article><span>Blog yazısı</span><strong>${Number(stats.total_blog_posts ?? 0)}</strong></article>
    </section>
    <section class="content-card detail-list">
      <p><span>Son ürün güncellemesi</span><strong>${escapeHtml(lastUpdate)}</strong></p>
      <p><span>Son başarılı giriş</span><strong>${escapeHtml(lastLogin)}</strong></p>
      <p><span>Yönetici hesabı</span><strong>${escapeHtml(admin.email)}</strong></p>
    </section>`,
  );
}

export function productsView(csrfToken: string, products: Product[], notice?: string) {
  const rows = products.length
    ? products
        .map(
          (product) => `<tr>
            <td><img class="product-thumb" src="${escapeHtml(product.imageUrl)}" alt=""></td>
            <td><strong>${escapeHtml(product.name)}</strong><small>${escapeHtml(product.category)}</small></td>
            <td>${product.section === 'recommended' ? 'Önerilen' : 'Yeni Gelen'}</td>
            <td>${product.isActive ? 'Yayında' : 'Taslak'}</td>
            <td class="actions"><a href="/panel/products/${escapeHtml(product.id)}/edit">Düzenle</a><a class="danger-link" href="/panel/products/${escapeHtml(product.id)}/delete">Sil</a></td>
          </tr>`,
        )
        .join('')
    : '<tr><td colspan="5">Henüz ürün eklenmedi.</td></tr>';
  return panelPage(
    'Ürünler',
    csrfToken,
    `${message(notice, 'success')}
    <div class="toolbar"><a class="primary-button" href="/panel/products/new">Yeni Ürün Ekle</a></div>
    <section class="content-card table-wrap"><table>
      <thead><tr><th>Görsel</th><th>Ürün</th><th>Bölüm</th><th>Durum</th><th>İşlem</th></tr></thead>
      <tbody>${rows}</tbody>
    </table></section>`,
  );
}

export function productFormView(csrfToken: string, product?: Product, error?: string) {
  const editing = Boolean(product);
  return panelPage(
    editing ? 'Ürünü Düzenle' : 'Yeni Ürün Ekle',
    csrfToken,
    `<section class="content-card narrow">
      ${message(error)}
      <form method="post" action="${editing ? `/panel/products/${escapeHtml(product?.id)}` : '/panel/products'}" enctype="multipart/form-data" class="stack-form">
        <input type="hidden" name="csrfToken" value="${escapeHtml(csrfToken)}">
        <label>Ürün adı<input name="name" required maxlength="120" value="${escapeHtml(product?.name)}"></label>
        <label>Kategori<input name="category" required maxlength="80" value="${escapeHtml(product?.category)}"></label>
        <label>Bölüm<select name="section" required>
          <option value="recommended" ${product?.section === 'recommended' ? 'selected' : ''}>Önerilen Ürünler</option>
          <option value="new" ${product?.section === 'new' ? 'selected' : ''}>Yeni Gelen Ürünler</option>
        </select></label>
        <label>Görsel açıklaması<input name="imageAlt" required maxlength="180" value="${escapeHtml(product?.imageAlt)}"><small>Ekran okuyucular ve erişilebilirlik için görseli kısa biçimde açıklayın.</small></label>
        <label>Açıklama (isteğe bağlı)<textarea name="description" maxlength="1000" rows="4">${escapeHtml(product?.description)}</textarea></label>
        <label>Özellikler (isteğe bağlı)<textarea name="features" maxlength="3000" rows="6" placeholder="Her satıra bir özellik">${escapeHtml(product?.features.join('\n'))}</textarea><small>Her satıra bir ürün özelliği yazın.</small></label>
        <label>Sıralama<input type="number" name="displayOrder" min="0" max="9999" value="${product?.displayOrder ?? 0}"></label>
        <label class="check-label"><input type="checkbox" name="isActive" value="true" ${(product?.isActive ?? true) ? 'checked' : ''}> Sitede yayınla</label>
        <label>Ürün görseli<input type="file" name="image" accept="image/jpeg,image/png,image/webp" ${editing ? '' : 'required'}><small>JPEG, PNG veya WebP; en fazla 5 MB.</small></label>
        <button class="primary-button" type="submit">${editing ? 'Değişiklikleri Kaydet' : 'Ürünü Ekle'}</button>
      </form>
    </section>`,
  );
}

export function deleteProductView(csrfToken: string, product: Product) {
  return panelPage(
    'Ürünü Sil',
    csrfToken,
    `<section class="content-card narrow">
      <h2>${escapeHtml(product.name)}</h2>
      <p>Bu ürünü kalıcı olarak silmek istediğinize emin misiniz?</p>
      <div class="confirm-actions">
        <form method="post" action="/panel/products/${escapeHtml(product.id)}/delete">
          <input type="hidden" name="csrfToken" value="${escapeHtml(csrfToken)}">
          <button class="danger-button" type="submit">Ürünü Sil</button>
        </form>
        <a href="/panel/products">Vazgeç</a>
      </div>
    </section>`,
  );
}

export function storeSettingsView(csrfToken: string, settings: StoreSettings, notice?: string) {
  const hours = settings.hours[0] ?? { days: '', time: '' };
  return panelPage(
    'Mağaza Bilgileri',
    csrfToken,
    `<section class="content-card narrow">
      ${message(notice, 'success')}
      <p>Buradaki bilgiler bir sonraki site derlemesinde iletişim alanlarına ve SEO verilerine uygulanır.</p>
      <form method="post" action="/panel/store" class="stack-form">
        <input type="hidden" name="csrfToken" value="${escapeHtml(csrfToken)}">
        <label>Telefon<input name="phone" required maxlength="30" value="${escapeHtml(settings.phone)}"></label>
        <label>WhatsApp numarası<input name="whatsapp" required inputmode="tel" maxlength="20" value="${escapeHtml(settings.whatsapp)}"></label>
        <label>Açık adres<textarea name="address" required maxlength="300" rows="3">${escapeHtml(settings.address)}</textarea></label>
        <label>Sokak adresi<input name="streetAddress" required maxlength="180" value="${escapeHtml(settings.streetAddress)}"></label>
        <div class="form-grid">
          <label>Posta kodu<input name="postalCode" required maxlength="10" value="${escapeHtml(settings.postalCode)}"></label>
          <label>İlçe<input name="addressLocality" required maxlength="80" value="${escapeHtml(settings.addressLocality)}"></label>
          <label>İl<input name="addressRegion" required maxlength="80" value="${escapeHtml(settings.addressRegion)}"></label>
        </div>
        <div class="form-grid">
          <label>Günler<input name="hoursDays" required maxlength="80" value="${escapeHtml(hours.days)}"></label>
          <label>Görünen saat metni<input name="hoursTime" required maxlength="80" value="${escapeHtml(hours.time)}"></label>
          <label>Açılış<input type="time" name="openingTime" required value="${escapeHtml(settings.openingTime)}"></label>
          <label>Kapanış<input type="time" name="closingTime" required value="${escapeHtml(settings.closingTime)}"></label>
        </div>
        <label>Instagram URL<input type="url" name="instagramUrl" maxlength="300" value="${escapeHtml(settings.instagramUrl)}"></label>
        <label>Facebook URL<input type="url" name="facebookUrl" maxlength="300" value="${escapeHtml(settings.facebookUrl)}"></label>
        <label>YouTube URL<input type="url" name="youtubeUrl" maxlength="300" value="${escapeHtml(settings.youtubeUrl)}"></label>
        <button class="primary-button" type="submit">Bilgileri Kaydet ve Siteyi Güncelle</button>
      </form>
    </section>`,
  );
}

const categoryLabels = { balikcilik: 'Balıkçılık', avcilik: 'Avcılık', kampcilik: 'Kampçılık' };

export function brandsView(csrfToken: string, brands: Brand[], notice?: string) {
  const rows = brands.length
    ? brands
        .map(
          (brand) => `<tr>
            <td><strong>${escapeHtml(brand.name)}</strong></td>
            <td>${categoryLabels[brand.category]}</td><td>${brand.displayOrder}</td>
            <td>${brand.isActive ? 'Yayında' : 'Gizli'}</td>
            <td class="actions"><a href="/panel/brands/${brand.id}/edit">Düzenle</a><a class="danger-link" href="/panel/brands/${brand.id}/delete">Sil</a></td>
          </tr>`,
        )
        .join('')
    : '<tr><td colspan="5">Henüz marka eklenmedi.</td></tr>';
  return panelPage(
    'Markalar',
    csrfToken,
    `${message(notice, 'success')}<div class="toolbar"><a class="primary-button" href="/panel/brands/new">Yeni Marka Ekle</a></div><section class="content-card table-wrap"><table><thead><tr><th>Marka</th><th>Kategori</th><th>Sıra</th><th>Durum</th><th>İşlem</th></tr></thead><tbody>${rows}</tbody></table></section>`,
  );
}

export function brandFormView(csrfToken: string, brand?: Brand, error?: string) {
  const editing = Boolean(brand);
  return panelPage(
    editing ? 'Markayı Düzenle' : 'Yeni Marka Ekle',
    csrfToken,
    `<section class="content-card narrow">${message(error)}<form method="post" action="${editing ? `/panel/brands/${brand?.id}` : '/panel/brands'}" class="stack-form"><input type="hidden" name="csrfToken" value="${escapeHtml(csrfToken)}"><label>Marka adı<input name="name" required maxlength="100" value="${escapeHtml(brand?.name)}"></label><label>Kategori<select name="category"><option value="balikcilik" ${brand?.category === 'balikcilik' ? 'selected' : ''}>Balıkçılık</option><option value="avcilik" ${brand?.category === 'avcilik' ? 'selected' : ''}>Avcılık</option><option value="kampcilik" ${brand?.category === 'kampcilik' ? 'selected' : ''}>Kampçılık</option></select></label><label>Sıralama<input type="number" name="displayOrder" min="0" max="9999" value="${brand?.displayOrder ?? 0}"></label><label class="check-label"><input type="checkbox" name="isActive" value="true" ${(brand?.isActive ?? true) ? 'checked' : ''}> Sitede yayınla</label><button class="primary-button" type="submit">${editing ? 'Değişiklikleri Kaydet' : 'Markayı Ekle'}</button></form></section>`,
  );
}

export function deleteBrandView(csrfToken: string, brand: Brand) {
  return panelPage(
    'Markayı Sil',
    csrfToken,
    `<section class="content-card narrow"><h2>${escapeHtml(brand.name)}</h2><p>Bu markayı kalıcı olarak silmek istediğinize emin misiniz?</p><div class="confirm-actions"><form method="post" action="/panel/brands/${brand.id}/delete"><input type="hidden" name="csrfToken" value="${escapeHtml(csrfToken)}"><button class="danger-button" type="submit">Markayı Sil</button></form><a href="/panel/brands">Vazgeç</a></div></section>`,
  );
}

export function blogPostsView(csrfToken: string, posts: BlogPost[], notice?: string) {
  const rows = posts.length
    ? posts
        .map(
          (post) =>
            `<tr><td><strong>${escapeHtml(post.title)}</strong><small>${escapeHtml(post.slug)}</small></td><td>${escapeHtml(post.mainCategory)}</td><td>${post.isPublished ? 'Yayında' : 'Taslak'}</td><td class="actions"><a href="/panel/blog/${post.id}/edit">Düzenle</a><a class="danger-link" href="/panel/blog/${post.id}/delete">Sil</a></td></tr>`,
        )
        .join('')
    : '<tr><td colspan="4">Henüz yönetilen blog yazısı yok. Mevcut yazılar içe aktarma komutuyla panele eklenebilir.</td></tr>';
  return panelPage(
    'Blog',
    csrfToken,
    `${message(notice, 'success')}<div class="toolbar"><a class="primary-button" href="/panel/blog/new">Yeni Yazı Ekle</a></div><section class="content-card table-wrap"><table><thead><tr><th>Başlık</th><th>Kategori</th><th>Durum</th><th>İşlem</th></tr></thead><tbody>${rows}</tbody></table></section>`,
  );
}

export function blogPostFormView(csrfToken: string, post?: BlogPost, error?: string) {
  const editing = Boolean(post);
  return panelPage(
    editing ? 'Blog Yazısını Düzenle' : 'Yeni Blog Yazısı',
    csrfToken,
    `<section class="content-card editor-card">
      ${message(error)}
      <form method="post" action="${editing ? `/panel/blog/${post?.id}` : '/panel/blog'}" class="stack-form">
        <input type="hidden" name="csrfToken" value="${escapeHtml(csrfToken)}">
        <label>Kategori<select name="mainCategory">
          <option value="Balıkçılık" ${post?.mainCategory === 'Balıkçılık' ? 'selected' : ''}>Balıkçılık</option>
          <option value="Avcılık" ${post?.mainCategory === 'Avcılık' ? 'selected' : ''}>Avcılık</option>
          <option value="Kampçılık" ${post?.mainCategory === 'Kampçılık' ? 'selected' : ''}>Kampçılık</option>
        </select></label>
        <label>Alt kategori<input name="subCategory" required maxlength="100" value="${escapeHtml(post?.subCategory ?? 'Genel Rehberler')}"></label>
        <label>Başlık<input name="title" required maxlength="180" value="${escapeHtml(post?.title)}"></label>
        <label>Kısa açıklama<textarea name="description" required maxlength="320" rows="3">${escapeHtml(post?.description)}</textarea></label>
        <label>İçerik<textarea name="content" required maxlength="100000" rows="22" placeholder="Blog içeriğini buraya yazın. Başlık için ##, liste için - kullanabilirsiniz.">${escapeHtml(post?.content)}</textarea></label>
        <label>Etiketler<input name="tags" maxlength="500" value="${escapeHtml(post?.tags.join(', '))}" placeholder="balıkçılık, kamış, başlangıç"></label>
        <label>Kapak görseli yolu veya HTTPS URL<input name="image" required maxlength="500" value="${escapeHtml(post?.image ?? '/images/hero-fishing.jpg')}"></label>
        <label>Görsel açıklaması<input name="imageAlt" required maxlength="180" value="${escapeHtml(post?.imageAlt ?? 'Doğa ve outdoor görünümü')}"></label>
        <label class="check-label"><input type="checkbox" name="isPublished" value="true" ${(post?.isPublished ?? true) ? 'checked' : ''}> Yayınla</label>
        <label class="check-label"><input type="checkbox" name="officialNotice" value="true" ${post?.officialNotice ? 'checked' : ''}> Mevzuat uyarısını göster</label>
        <button class="primary-button" type="submit">${editing ? 'Değişiklikleri Kaydet' : 'Yazıyı Ekle'}</button>
      </form>
    </section>`,
  );
}

export function deleteBlogPostView(csrfToken: string, post: BlogPost) {
  return panelPage(
    'Blog Yazısını Sil',
    csrfToken,
    `<section class="content-card narrow"><h2>${escapeHtml(post.title)}</h2><p>Bu yazıyı panel listesinden ve siteden kaldırmak istediğinize emin misiniz?</p><div class="confirm-actions"><form method="post" action="/panel/blog/${post.id}/delete"><input type="hidden" name="csrfToken" value="${escapeHtml(csrfToken)}"><button class="danger-button" type="submit">Yazıyı Kaldır</button></form><a href="/panel/blog">Vazgeç</a></div></section>`,
  );
}
