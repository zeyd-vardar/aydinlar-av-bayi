import { withBase } from '../utils/paths';

const siteOrigin = import.meta.env.PUBLIC_SITE_URL ?? 'https://trabzonavbayi.com';
const siteUrl = new URL(import.meta.env.BASE_URL, siteOrigin).href;

export const siteConfig = {
  name: 'Aydınlar Av Bayii',
  shortName: 'AYDINLAR',
  tagline: 'Balıkçılık, avcılık ve outdoor dünyası',
  url: siteUrl,
  logoPath: '/images/brand/aydinlar-av-bayii-deer-silhouette.png',
  logo: { width: 471, height: 512, type: 'image/png' },
  phone: '0549 477 01 61',
  phoneHref: '+905494770161',
  whatsapp: '905494770161',
  email: 'merhaba@aydinlaravbayi.com',
  address: 'Pelitli, Mehmet Akif Ersoy Cd. No:10/C 61080 Ortahisar/Trabzon',
  addressDetails: {
    streetAddress: 'Pelitli, Mehmet Akif Ersoy Cd. No:10/C',
    postalCode: '61080',
    addressLocality: 'Ortahisar',
    addressRegion: 'Trabzon',
    addressCountry: 'TR',
  },
  mapUrl:
    'https://www.google.com/maps/search/?api=1&query=Pelitli%2C%20Mehmet%20Akif%20Ersoy%20Cd.%20No%3A10%2FC%2C%2061080%20Ortahisar%2FTrabzon',
  mapEmbedUrl:
    'https://www.google.com/maps?q=Pelitli%2C%20Mehmet%20Akif%20Ersoy%20Cd.%20No%3A10%2FC%2C%2061080%20Ortahisar%2FTrabzon&output=embed',
  hours: [{ days: 'Her gün', time: '08.30 – 20.30' }],
  openingHours: { opens: '08:30', closes: '20:30' },
  socials: { instagram: 'https://www.instagram.com/aydinlarav/' },
};

export const navLinks = [
  { href: withBase('/'), label: 'Ana Sayfa' },
  { href: withBase('/hakkimizda'), label: 'Hakkımızda' },
  { href: withBase('/urun-gruplari'), label: 'Ürün Grupları' },
  { href: withBase('/markalar'), label: 'Markalar' },
  { href: withBase('/blog'), label: 'Blog' },
  { href: withBase('/magazamiz'), label: 'Mağazamız' },
  { href: withBase('/iletisim'), label: 'İletişim' },
];
