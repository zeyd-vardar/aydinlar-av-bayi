import { getManagedContent } from './managedContent';

const fallbackGroups = [
  {
    id: 'balikcilik',
    eyebrow: 'Olta ve su üstü ekipmanları',
    title: 'Balıkçılık',
    description:
      'Kamış, makine, misina ve yapay yem kategorilerinde Türkiye pazarında yaygın olarak bulunan markalar.',
    brands: [
      'Shimano',
      'Daiwa',
      'Okuma',
      'Rapala',
      'Savage Gear',
      'Fujin',
      'Remixon',
      'Albastar',
      'Kendo',
      'Captain',
      'Berkley',
      'Major Craft',
    ],
  },
  {
    id: 'avcilik',
    eyebrow: 'Yerli ve uluslararası üreticiler',
    title: 'Avcılık',
    description:
      'Türkiye’de geniş model seçeneğiyle öne çıkan yerli üreticiler ve dünyaca bilinen av tüfeği markaları.',
    brands: [
      'Huğlu',
      'ATA Arms',
      'Hatsan',
      'Armsan',
      'Stoeger',
      'Derya Arms',
      'Kral Arms',
      'Retay',
      'Beretta',
      'Benelli',
      'Browning',
      'Winchester',
    ],
  },
  {
    id: 'kampcilik',
    eyebrow: 'Kamp ve outdoor ekipmanları',
    title: 'Kampçılık',
    description:
      'Çadırdan uyku sistemlerine, kamp mutfağından termos ve aksesuarlara uzanan popüler markalar.',
    brands: [
      'Naturehike',
      'Husky',
      'Ferrino',
      'Coleman',
      'Quechua',
      'Nurgaz',
      'Campout',
      'Stanley',
      'Evolite',
      'Thermos',
      'Ledlenser',
      'Leatherman',
    ],
  },
];

const managedContent = await getManagedContent();
const managedBrands = managedContent?.brands ?? [];

export const brandGroups = managedContent
  ? fallbackGroups.map((group) => ({
      ...group,
      brands: managedBrands
        .filter((brand) => brand.category === group.id && brand.isActive)
        .sort((a, b) => a.displayOrder - b.displayOrder || a.name.localeCompare(b.name, 'tr'))
        .map((brand) => brand.name),
    }))
  : fallbackGroups;
