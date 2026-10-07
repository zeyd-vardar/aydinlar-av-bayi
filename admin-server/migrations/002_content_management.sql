ALTER TABLE products
  ADD COLUMN IF NOT EXISTS description text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS features jsonb NOT NULL DEFAULT '[]'::jsonb;

CREATE TABLE IF NOT EXISTS store_settings (
  id smallint PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  phone text NOT NULL,
  whatsapp text NOT NULL,
  address text NOT NULL,
  street_address text NOT NULL,
  postal_code text NOT NULL,
  address_locality text NOT NULL,
  address_region text NOT NULL,
  instagram_url text NOT NULL DEFAULT '',
  facebook_url text NOT NULL DEFAULT '',
  youtube_url text NOT NULL DEFAULT '',
  hours jsonb NOT NULL DEFAULT '[]'::jsonb,
  opening_time time NOT NULL,
  closing_time time NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO store_settings (
  id, phone, whatsapp, address, street_address, postal_code,
  address_locality, address_region, instagram_url, hours,
  opening_time, closing_time
) VALUES (
  1,
  '0549 477 01 61',
  '905494770161',
  'Pelitli, Mehmet Akif Ersoy Cd. No:10/C 61080 Ortahisar/Trabzon',
  'Pelitli, Mehmet Akif Ersoy Cd. No:10/C',
  '61080',
  'Ortahisar',
  'Trabzon',
  'https://www.instagram.com/aydinlarav/',
  '[{"days":"Her gün","time":"08.30 – 20.30"}]'::jsonb,
  '08:30',
  '20:30'
) ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS brands (
  id uuid PRIMARY KEY,
  category text NOT NULL CHECK (category IN ('balikcilik', 'avcilik', 'kampcilik')),
  name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 100),
  display_order integer NOT NULL DEFAULT 0 CHECK (display_order BETWEEN 0 AND 9999),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (category, name)
);

CREATE INDEX IF NOT EXISTS brands_public_idx
  ON brands(category, is_active, display_order, name);

INSERT INTO brands (id, category, name, display_order)
SELECT md5(category || ':' || name)::uuid, category, name, display_order
FROM (VALUES
  ('balikcilik', 'Shimano', 10), ('balikcilik', 'Daiwa', 20),
  ('balikcilik', 'Okuma', 30), ('balikcilik', 'Rapala', 40),
  ('balikcilik', 'Savage Gear', 50), ('balikcilik', 'Fujin', 60),
  ('balikcilik', 'Remixon', 70), ('balikcilik', 'Albastar', 80),
  ('balikcilik', 'Kendo', 90), ('balikcilik', 'Captain', 100),
  ('balikcilik', 'Berkley', 110), ('balikcilik', 'Major Craft', 120),
  ('avcilik', 'Huğlu', 10), ('avcilik', 'ATA Arms', 20),
  ('avcilik', 'Hatsan', 30), ('avcilik', 'Armsan', 40),
  ('avcilik', 'Stoeger', 50), ('avcilik', 'Derya Arms', 60),
  ('avcilik', 'Kral Arms', 70), ('avcilik', 'Retay', 80),
  ('avcilik', 'Beretta', 90), ('avcilik', 'Benelli', 100),
  ('avcilik', 'Browning', 110), ('avcilik', 'Winchester', 120),
  ('kampcilik', 'Naturehike', 10), ('kampcilik', 'Husky', 20),
  ('kampcilik', 'Ferrino', 30), ('kampcilik', 'Coleman', 40),
  ('kampcilik', 'Quechua', 50), ('kampcilik', 'Nurgaz', 60),
  ('kampcilik', 'Campout', 70), ('kampcilik', 'Stanley', 80),
  ('kampcilik', 'Evolite', 90), ('kampcilik', 'Thermos', 100),
  ('kampcilik', 'Ledlenser', 110), ('kampcilik', 'Leatherman', 120)
) AS seed(category, name, display_order)
ON CONFLICT (category, name) DO NOTHING;

CREATE TABLE IF NOT EXISTS blog_posts (
  id uuid PRIMARY KEY,
  slug text NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  title text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 180),
  description text NOT NULL CHECK (char_length(description) BETWEEN 1 AND 320),
  main_category text NOT NULL CHECK (main_category IN ('Balıkçılık', 'Avcılık', 'Kampçılık')),
  sub_category text NOT NULL CHECK (char_length(sub_category) BETWEEN 1 AND 100),
  content text NOT NULL CHECK (char_length(content) BETWEEN 1 AND 100000),
  tags jsonb NOT NULL DEFAULT '[]'::jsonb,
  keywords jsonb NOT NULL DEFAULT '[]'::jsonb,
  image text NOT NULL,
  image_alt text NOT NULL,
  reading_time integer NOT NULL DEFAULT 1 CHECK (reading_time BETWEEN 1 AND 999),
  is_published boolean NOT NULL DEFAULT true,
  is_deleted boolean NOT NULL DEFAULT false,
  official_notice boolean NOT NULL DEFAULT false,
  sources jsonb NOT NULL DEFAULT '[]'::jsonb,
  published_at date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS blog_posts_public_idx
  ON blog_posts(is_published, is_deleted, main_category, title);
