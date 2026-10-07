import { withBase } from '../utils/paths';
import { getManagedContent } from './managedContent';

const siteOrigin = import.meta.env.PUBLIC_SITE_URL ?? 'https://trabzonavbayi.com';
const siteUrl = new URL(import.meta.env.BASE_URL, siteOrigin).href;

const managedSettings = (await getManagedContent())?.siteSettings;
const address =
  managedSettings?.address ?? 'Pelitli, Mehmet Akif Ersoy Cd. No:10/C 61080 Ortahisar/Trabzon';
const mapQuery = encodeURIComponent(address);
const phone = managedSettings?.phone ?? '0549 477 01 61';
const phoneDigits = phone.replace(/\D/g, '').replace(/^0/, '90');

export const siteConfig = {
  name: 'Aydınlar Av Bayii',
  legalName: 'Aydınlar Av Malzemeleri Pazarlama Limited Şirketi',
  shortName: 'AYDINLAR',
  tagline: 'Balıkçılık, avcılık ve outdoor dünyası',
  url: siteUrl,
  logoPath: '/images/brand/aydinlar-av-bayii-deer-silhouette.png',
  logo: { width: 471, height: 512, type: 'image/png' },
  phone,
  phoneHref: `+${phoneDigits}`,
  whatsapp: managedSettings?.whatsapp ?? '905494770161',
  email: 'info@aydinlarav.com',
  address,
  addressDetails: {
    streetAddress: managedSettings?.streetAddress ?? 'Pelitli, Mehmet Akif Ersoy Cd. No:10/C',
    postalCode: managedSettings?.postalCode ?? '61080',
    addressLocality: managedSettings?.addressLocality ?? 'Ortahisar',
    addressRegion: managedSettings?.addressRegion ?? 'Trabzon',
    addressCountry: 'TR',
  },
  mapUrl: `https://www.google.com/maps/search/?api=1&query=${mapQuery}`,
  mapEmbedUrl: `https://www.google.com/maps?q=${mapQuery}&output=embed`,
  hours: managedSettings?.hours ?? [{ days: 'Her gün', time: '08.30 – 20.30' }],
  openingHours: {
    opens: managedSettings?.openingTime ?? '08:30',
    closes: managedSettings?.closingTime ?? '20:30',
  },
  socials: {
    instagram: managedSettings?.instagramUrl ?? 'https://www.instagram.com/aydinlarav/',
    facebook: managedSettings?.facebookUrl ?? '',
    youtube: managedSettings?.youtubeUrl ?? '',
  },
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
