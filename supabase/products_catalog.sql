-- ============================================================
-- ChitraFrame — Products Catalog SQL
-- 51 designs × 4 sizes × 2 frame types = 408 variants
-- + 51 product_images records linked to Cloudinary URLs
-- Generated: 2026-05-27
-- ============================================================

-- ── PRICING CONSTANTS ──────────────────────────────────────
-- Small  (8×12")  : ₹499
-- Medium (12×18") : ₹799
-- Large  (18×24") : ₹1,149
-- XL     (24×36") : ₹1,749
-- White mount add-on : ₹250
-- Poster print add-on (AOV): ₹199
-- Prepaid discount: -₹50
-- Shipping under threshold: ₹99 | Free at ₹899+
-- COD: Disabled

-- ── 1. CATEGORIES ──────────────────────────────────────────
INSERT INTO categories (name, slug, description, display_order, is_active) VALUES
  ('Spiritual & Devotional', 'spiritual',    'Divine art — Mahadev, Hanuman, Ganesha, Radha Krishna, Ram Darbar', 1, true),
  ('Sports Legends',         'sports',       'Football icons — Cristiano Ronaldo & Lionel Messi',                 2, true),
  ('Automotive',             'automotive',   'Exotic cars & superbikes — Porsche 911, BMW M4, Formula 1',         3, true),
  ('Legend & Pop Culture',   'legend',       'Anime & pop culture — Goku, Naruto, Luffy + lifestyle art',         4, true),
  ('Wildlife & Nature',      'wildlife',     'Majestic wildlife — Lion & Wolf art prints',                        5, true),
  ('Motivational',           'motivational', 'Typographic motivational quotes for focus & hustle',                6, true)
ON CONFLICT (slug) DO UPDATE SET
  description  = EXCLUDED.description,
  display_order = EXCLUDED.display_order,
  is_active    = EXCLUDED.is_active;

-- ── 2. PRODUCTS (51 designs) ───────────────────────────────

-- === SPIRITUAL ===
INSERT INTO products (slug, name, category_id, description, short_description, seo_title, seo_description, tags, is_active, is_featured, display_order)
SELECT
  p.slug, p.name,
  (SELECT id FROM categories WHERE slug = p.cat),
  p.desc, p.short_desc, p.seo_title, p.seo_desc,
  p.tags, true, p.featured, p.ord
FROM (VALUES
  ('mahadev-cosmic-trance',   'Mahadev Cosmic Trance',         'spiritual',
   'An ethereal depiction of Lord Shiva in deep cosmic meditation, surrounded by swirling galaxies and celestial energy. Golden and indigo hues create a transcendental atmosphere that transforms any wall into a sacred space.',
   'Shiva in cosmic meditation — galaxies, gold & indigo',
   'Mahadev Cosmic Trance Wall Art | Buy Shiva Poster India | ChitraFrame',
   'Buy Mahadev Cosmic Trance framed wall art online India. Premium quality Shiva poster in gold & indigo. Ships pan-India. ₹499 onwards.',
   ARRAY['mahadev','shiva','spiritual','cosmic','lord shiva poster india'], true, 1),

  ('mahadev-galaxy-medit',    'Mahadev Galaxy Meditation',     'spiritual',
   'Lord Shiva seated in lotus pose against a breathtaking galaxy backdrop. The interplay of deep blues, purples and warm gold creates a mesmerising sacred art piece perfect for meditation rooms.',
   'Galaxy meditation Shiva in purple & blue cosmic art',
   'Mahadev Galaxy Meditation Poster | Shiva Wall Art India | ChitraFrame',
   'Mahadev Galaxy Meditation framed art print. Shiva in lotus pose against a galaxy. Premium frames ₹499+. Free shipping ₹899+.',
   ARRAY['mahadev','shiva','galaxy','meditation','spiritual wall art india'], true, 2),

  ('mahadev-neon-dark',       'Mahadev Neon Dark Minimal',     'spiritual',
   'A bold minimalist portrait of Lord Shiva rendered in neon outlines against a pitch-black background. Perfect for modern interiors seeking a striking spiritual statement piece.',
   'Bold neon-line Shiva portrait on matte black',
   'Mahadev Neon Minimal Poster | Modern Shiva Wall Art | ChitraFrame',
   'Mahadev Neon Dark Minimal wall art. Striking Shiva portrait in neon on black. Ships across India. ₹499 onwards.',
   ARRAY['mahadev','neon art','minimal','shiva','dark wall art'], true, 3),

  ('mahadev-adiyogi-blue',    'Mahadev Adiyogi Blue Flame',    'spiritual',
   'The iconic Adiyogi silhouette engulfed in celestial blue flames, evoking the first yogi and source of yogic wisdom. A powerful centrepiece for any living room or home office.',
   'Adiyogi Shiva silhouette in electric blue flames',
   'Adiyogi Blue Flame Wall Art | Mahadev Poster India | ChitraFrame',
   'Adiyogi Blue Flame framed poster — striking Shiva art for home. ₹499+. Pan-India delivery. Premium quality print.',
   ARRAY['adiyogi','mahadev','blue flame','yoga','spiritual art india'], true, 4),

  ('hanuman-bhakti-fire',     'Hanuman Bhakti Fire',           'spiritual',
   'Lord Hanuman in his divine fiery form — fierce devotion and immense strength captured in warm amber and red hues. An art piece that invokes courage and protection in any home.',
   'Fiery Hanuman in amber and crimson devotional art',
   'Hanuman Bhakti Fire Poster | Hanuman Wall Art India | ChitraFrame',
   'Hanuman Bhakti Fire framed wall art. Premium devotional poster. Ships across India. ₹499 onwards.',
   ARRAY['hanuman','bhakti','fire','devotional art','hanuman poster india'], true, 5),

  ('hanuman-warrior-peak',    'Hanuman Warrior of the Peak',   'spiritual',
   'Lord Hanuman atop a mountain peak, carrying the Sanjeevani herb, rendered in dramatic light and shadow. A triumphant depiction of devotion, strength and selfless service.',
   'Hanuman carrying Sanjeevani — epic warrior art',
   'Hanuman Warrior Peak Poster | Buy Hanuman Art India | ChitraFrame',
   'Hanuman Warrior of the Peak — dramatic framed art. Premium quality. ₹499+. Ships pan-India.',
   ARRAY['hanuman','warrior','sanjeevani','mountain','hanuman wall art'], false, 6),

  ('hanuman-devotion-art',    'Hanuman Devotion Art',          'spiritual',
   'A soul-stirring portrait of Hanuman in peaceful devotion, with warm saffron and golden tones creating a serene spiritual ambiance. Perfect for pooja rooms and meditation spaces.',
   'Peaceful Hanuman portrait in saffron and gold',
   'Hanuman Devotion Art Poster | Spiritual Wall Art India | ChitraFrame',
   'Hanuman Devotion Art — serene framed poster for pooja rooms. ₹499+. Pan-India shipping.',
   ARRAY['hanuman','devotion','saffron','spiritual','pooja room art'], false, 7),

  ('ganesh-purple-cosmos',    'Ganesh Purple Cosmos',          'spiritual',
   'Lord Ganesha surrounded by a cosmic purple universe, symbolising the remover of obstacles across all dimensions. Rich purple and gold tones make this a majestic conversation piece.',
   'Ganesha in cosmic purple universe — remover of obstacles',
   'Ganesh Purple Cosmos Poster | Ganesha Wall Art India | ChitraFrame',
   'Ganesh Purple Cosmos framed wall art. Stunning Ganesha poster in purple & gold. ₹499+. Ships across India.',
   ARRAY['ganesha','ganesh','purple','cosmic','ganesh poster india'], true, 8),

  ('ganesh-gold-mandala',     'Ganesh Gold Mandala',           'spiritual',
   'Lord Ganesha at the centre of an intricate golden mandala, radiating prosperity and wisdom. The detailed mandala work and rich gold palette make this a premium spiritual art piece.',
   'Ganesha in golden mandala — prosperity and wisdom',
   'Ganesh Gold Mandala Poster | Buy Ganesha Art India | ChitraFrame',
   'Ganesh Gold Mandala — ornate framed art print. Perfect housewarming gift India. ₹499+.',
   ARRAY['ganesha','mandala','gold','spiritual','housewarming gift india'], false, 9),

  ('ganesh-sacred-geometry',  'Ganesh Sacred Geometry',        'spiritual',
   'A contemporary interpretation of Lord Ganesha using sacred geometry patterns, blending ancient spirituality with modern art aesthetics. Ideal for modern homes seeking spiritual depth.',
   'Modern sacred geometry Ganesha art for contemporary homes',
   'Ganesh Sacred Geometry Poster | Modern Ganesha Art | ChitraFrame',
   'Ganesh Sacred Geometry — modern spiritual wall art. Premium frames. ₹499+. Ships pan-India.',
   ARRAY['ganesha','sacred geometry','modern art','spiritual','geometric art'], false, 10),

  ('radha-krishna-watercolor', 'Radha Krishna Watercolor Garden', 'spiritual',
   'A romantic watercolour depiction of Radha and Krishna in a blooming garden, with soft pastels evoking eternal divine love. A timeless piece for bedrooms and living rooms.',
   'Romantic Radha Krishna watercolour in soft pastels',
   'Radha Krishna Watercolor Poster | Buy Krishna Art India | ChitraFrame',
   'Radha Krishna Watercolor Garden — romantic framed art. Perfect wedding gift India. ₹499+.',
   ARRAY['radha krishna','watercolor','romantic','divine love','krishna art india'], true, 11),

  ('radha-krishna-teal-gold', 'Radha Krishna Teal & Gold',     'spiritual',
   'Lord Krishna and Radha in a stunning teal and gold colour palette — contemporary yet deeply spiritual. A statement piece that combines elegance with devotional energy.',
   'Radha Krishna in striking teal & gold contemporary art',
   'Radha Krishna Teal Gold Poster | Premium Krishna Art | ChitraFrame',
   'Radha Krishna Teal & Gold — premium framed art. Elegant spiritual wall decor India. ₹499+.',
   ARRAY['radha krishna','teal','gold','contemporary spiritual','krishna poster'], false, 12),

  ('radha-krishna-devotion',  'Radha Krishna Eternal Devotion','spiritual',
   'A devotional masterpiece capturing the eternal bond between Radha and Krishna, rendered in warm ambers and deep blues. Carries divine energy and timeless artistic beauty.',
   'Eternal devotion Radha Krishna in warm amber & deep blue',
   'Radha Krishna Devotion Poster | Spiritual Art India | ChitraFrame',
   'Radha Krishna Eternal Devotion — framed spiritual art. ₹499+. Ships across India.',
   ARRAY['radha krishna','devotion','eternal','spiritual','devotional art india'], false, 13),

  ('ram-darbar-classic',      'Ram Darbar Classic',            'spiritual',
   'The auspicious Ram Darbar — Lord Ram, Sita, Lakshmana and Hanuman in classical style. A sacred composition that brings divine blessings into your home. Ideal for pooja rooms.',
   'Classical Ram Darbar — Ram, Sita, Lakshman, Hanuman',
   'Ram Darbar Classic Poster | Ram Sita Wall Art India | ChitraFrame',
   'Ram Darbar Classic framed art — auspicious home decor. ₹499+. Ships pan-India.',
   ARRAY['ram darbar','ram sita','hanuman','lakshmana','ram poster india'], true, 14),

  ('ram-darbar-royal',        'Ram Darbar Royal Court',        'spiritual',
   'Lord Ram''s royal court depicted in rich jewel tones — gold, crimson and royal blue — evoking the grandeur of Ayodhya. An exquisite piece for any devotional space.',
   'Royal Ram Darbar in jewel tones — gold, crimson & blue',
   'Ram Darbar Royal Poster | Buy Ram Art India | ChitraFrame',
   'Ram Darbar Royal Court — premium framed devotional art. ₹499+. Pan-India shipping.',
   ARRAY['ram darbar','ayodhya','royal','devotional','ram art india'], false, 15),

  ('sita-ram-watercolor',     'Sita Ram Watercolor Bliss',     'spiritual',
   'Lord Ram and Sita in a dreamy watercolour style, surrounded by nature''s bounty. Soft romantic hues make this a perfect wedding or housewarming gift.',
   'Dreamy watercolour Sita Ram in nature — wedding gift',
   'Sita Ram Watercolor Poster | Ram Sita Art India | ChitraFrame',
   'Sita Ram Watercolor Bliss — romantic framed art. Perfect wedding gift India. ₹499+.',
   ARRAY['sita ram','watercolor','wedding gift','devotional','ram sita art'], false, 16),

  ('sita-ram-devotional',     'Sita Ram Devotional Art',       'spiritual',
   'A devotional portrait of Sita and Ram in richly detailed traditional style, capturing the essence of their divine union. A meaningful addition to any home shrine.',
   'Traditional devotional Sita Ram portrait for home shrines',
   'Sita Ram Devotional Art | Ram Sita Poster India | ChitraFrame',
   'Sita Ram Devotional Art — traditional framed art print. ₹499+. Ships across India.',
   ARRAY['sita ram','devotional','traditional','shrine','ram sita poster'], false, 17),

  ('krishna-mahabharata-1',   'Krishna – Mahabharata Wisdom',  'spiritual',
   'Lord Krishna on the battlefield of Kurukshetra, delivering the timeless Bhagavad Gita. The dramatic contrast of blues and gold evokes the gravity of this eternal moment.',
   'Krishna on Kurukshetra battlefield delivering Gita wisdom',
   'Krishna Mahabharata Poster | Bhagavad Gita Wall Art India | ChitraFrame',
   'Krishna Mahabharata Wisdom — premium framed art. Bhagavad Gita wall art for home. ₹499+.',
   ARRAY['krishna','mahabharata','bhagavad gita','kurukshetra','krishna poster india'], true, 18),

  ('krishna-mahabharata-2',   'Krishna – Cosmic Vision',       'spiritual',
   'Lord Krishna revealing his cosmic Vishwaroop (universal form) — a dramatic, awe-inspiring depiction of divine omnipresence. A centrepiece for any spiritual or living space.',
   'Krishna Vishwaroop cosmic form — awe-inspiring divine art',
   'Krishna Cosmic Vision Poster | Vishwaroop Art India | ChitraFrame',
   'Krishna Cosmic Vision — Vishwaroop framed art. Stunning spiritual wall decor. ₹499+.',
   ARRAY['krishna','vishwaroop','cosmic','mahabharata','krishna art india'], false, 19),

  -- === SPORTS ===
  ('cr7-golden-era',          'Cristiano Ronaldo – Golden Era','sports',
   'Celebrate the greatest of all time with this stunning Cristiano Ronaldo golden era art print. Bold gold and black tones capture the champion''s relentless pursuit of excellence. Perfect for sports fans and gym walls.',
   'CR7 golden era art — bold gold & black champion print',
   'Cristiano Ronaldo Poster India | CR7 Wall Art | ChitraFrame',
   'Cristiano Ronaldo Golden Era — premium framed sports art. CR7 poster India. ₹499+. Ships pan-India.',
   ARRAY['cristiano ronaldo','CR7','football','sports art','ronaldo poster india'], true, 1),

  ('cr7-celebration',         'Cristiano Ronaldo – Celebration','sports',
   'CR7''s iconic celebration moment immortalised in stunning detail — the signature jump, the fist pump, the SIUU energy. A must-have for every Ronaldo fan and sports enthusiast.',
   'CR7 iconic celebration art — energy, power, SIUU',
   'CR7 Celebration Poster India | Ronaldo Wall Art | ChitraFrame',
   'CR7 Celebration — Cristiano Ronaldo framed art. ₹499+. Ships across India.',
   ARRAY['cristiano ronaldo','CR7','celebration','SIUU','football poster india'], false, 2),

  ('cr7-siuu-moment',         'Cristiano Ronaldo – SIUU Moment','sports',
   'The electrifying SIUU moment captured in art — CR7 at the peak of his celebratory jump, arms wide, exuding pure confidence. A statement piece for champions.',
   'CR7 SIUU jump celebration — pure confidence captured',
   'CR7 SIUU Poster India | Ronaldo Art Print | ChitraFrame',
   'CR7 SIUU Moment — iconic Ronaldo wall art. ₹499+. Perfect for sports rooms & gyms.',
   ARRAY['CR7','SIUU','ronaldo','celebration','football wall art india'], false, 3),

  ('messi-world-cup-glory',   'Messi – World Cup Glory',       'sports',
   'Leo Messi lifting the FIFA World Cup 2022 trophy — the defining moment of football history. This spectacular art print celebrates the GOAT achieving his destiny. Perfect for any football fan.',
   'Messi lifting World Cup 2022 — the GOAT''s destiny fulfilled',
   'Messi World Cup Poster India | Leo Messi Wall Art | ChitraFrame',
   'Messi World Cup Glory — premium framed football art. ₹499+. Ships across India.',
   ARRAY['messi','world cup','2022','GOAT','messi poster india'], true, 4),

  ('messi-goat-art',          'Messi – The GOAT',              'sports',
   'A powerful artistic tribute to Lionel Messi — the Greatest of All Time. Bold lines and rich colours celebrate a career of unparalleled brilliance, records and magic.',
   'Messi GOAT tribute — bold art celebrating football genius',
   'Messi GOAT Poster India | Leo Messi Art Print | ChitraFrame',
   'Messi GOAT — iconic football art print India. ₹499+. Premium quality. Ships pan-India.',
   ARRAY['messi','GOAT','football','greatest of all time','messi wall art india'], false, 5),

  ('messi-magic-moment',      'Messi – Magic Moment',          'sports',
   'One of Messi''s iconic magic moments immortalised — the ball control, the vision, the unstoppable genius. A celebration of football artistry at its purest.',
   'Messi in his element — football artistry immortalised',
   'Messi Magic Moment Poster | Buy Messi Art India | ChitraFrame',
   'Messi Magic Moment — stunning football art print. ₹499+. Ships across India.',
   ARRAY['messi','magic','football','Barcelona','messi poster india'], false, 6),

  -- === AUTOMOTIVE ===
  ('911-neon-tokyo',          'Porsche 911 Neon Tokyo Night',  'automotive',
   'A Porsche 911 blazing through neon-lit Tokyo streets — speed, luxury and urban energy in one breathtaking art print. The perfect piece for automotive enthusiasts and modern interiors.',
   'Porsche 911 tearing through neon Tokyo — speed meets luxury',
   'Porsche 911 Neon Tokyo Poster | Car Wall Art India | ChitraFrame',
   'Porsche 911 Neon Tokyo Night — premium car art print India. ₹499+. Perfect for car lovers.',
   ARRAY['porsche 911','neon','tokyo','car art','porsche poster india'], true, 1),

  ('911-mountain-drive',      'Porsche 911 Mountain Drive',    'automotive',
   'A Porsche 911 carving through dramatic mountain hairpins at golden hour — the perfect union of machine and landscape. Captures the pure joy of the open road.',
   'Porsche 911 on mountain roads — golden hour driving art',
   'Porsche 911 Mountain Drive Poster | Supercar Art India | ChitraFrame',
   'Porsche 911 Mountain Drive — stunning car art print. ₹499+. Ships pan-India.',
   ARRAY['porsche 911','mountain','drive','golden hour','supercar art india'], false, 2),

  ('911-sunset-turbo',        'Porsche 911 Sunset Turbo',      'automotive',
   'A Porsche 911 Turbo S silhouetted against a fiery sunset — power and elegance in perfect harmony. Bold orange and dark tones create a dramatic wall statement.',
   'Porsche 911 Turbo S at sunset — power meets elegance',
   'Porsche 911 Sunset Poster | Premium Car Art India | ChitraFrame',
   'Porsche 911 Sunset Turbo — dramatic car wall art. ₹499+. Ships across India.',
   ARRAY['porsche 911','turbo','sunset','car art','porsche art india'], false, 3),

  ('m4-dark-carbon',          'BMW M4 Dark Carbon Edition',    'automotive',
   'The BMW M4 in sinister dark carbon finish — aggressive lines, raw power and uncompromising performance captured in art. A bold statement for any BMW or car enthusiast.',
   'BMW M4 in dark carbon — aggressive lines & raw power',
   'BMW M4 Dark Carbon Poster | BMW Wall Art India | ChitraFrame',
   'BMW M4 Dark Carbon Edition — premium car art print India. ₹499+. Ships pan-India.',
   ARRAY['BMW M4','dark carbon','car art','M4','bmw poster india'], true, 4),

  ('m4-racing-storm',         'BMW M4 Racing Storm',           'automotive',
   'The BMW M4 Competition in full racing mode — storming through the circuit in a blur of speed and precision. Dynamic composition captures the adrenaline of motorsport.',
   'BMW M4 Competition at full race pace — pure adrenaline',
   'BMW M4 Racing Storm Poster | Motorsport Art India | ChitraFrame',
   'BMW M4 Racing Storm — motorsport art print. ₹499+. Ships across India.',
   ARRAY['BMW M4','racing','motorsport','competition','bmw racing art'], false, 5),

  ('m4-stealth-grey',         'BMW M4 Stealth Grey',           'automotive',
   'The BMW M4 in a commanding stealth grey finish — understated power and sophistication. A refined art piece for those who appreciate automotive excellence.',
   'BMW M4 stealth grey — understated power & sophistication',
   'BMW M4 Stealth Grey Poster | BMW Art India | ChitraFrame',
   'BMW M4 Stealth Grey — elegant car art print. ₹499+. Ships pan-India.',
   ARRAY['BMW M4','stealth grey','sophisticated','car art','bmw art india'], false, 6),

  ('f1-redbull-sparks',       'Formula 1 Red Bull Sparks',     'automotive',
   'A Red Bull Formula 1 car trailing brilliant sparks on a night circuit — the drama and spectacle of F1 captured in a single frame. For motorsport fans and speed lovers.',
   'F1 Red Bull trailing sparks on night circuit — F1 drama',
   'Formula 1 Red Bull Poster | F1 Wall Art India | ChitraFrame',
   'Formula 1 Red Bull Sparks — premium F1 art print India. ₹499+. Ships pan-India.',
   ARRAY['formula 1','red bull','F1','sparks','f1 poster india'], true, 7),

  ('f1-speed-art',            'Formula 1 Speed Art',           'automotive',
   'Pure speed abstracted into art — an F1 car reduced to motion blur and dynamic lines. A contemporary motorsport art piece that brings the excitement of F1 to your walls.',
   'F1 speed abstracted — motion blur motorsport art',
   'Formula 1 Speed Art Poster | F1 Wall Art India | ChitraFrame',
   'Formula 1 Speed Art — abstract motorsport wall art. ₹499+. Ships across India.',
   ARRAY['formula 1','speed','abstract','motorsport','F1 art india'], false, 8),

  ('f1-race-day',             'Formula 1 Race Day Glory',      'automotive',
   'The drama and spectacle of race day — multiple F1 cars battling into the first corner, sparks flying, history in the making. A thrilling art piece for any motorsport fan.',
   'F1 race day action — multiple cars battling at first corner',
   'F1 Race Day Poster | Formula 1 Wall Art India | ChitraFrame',
   'Formula 1 Race Day Glory — action-packed F1 art. ₹499+. Ships pan-India.',
   ARRAY['formula 1','race day','motorsport','action','f1 wall art india'], false, 9),

  ('superbike-collection',    'SuperBike – Triple Crown',      'automotive',
   'Three of the world''s most iconic superbikes in one dramatic composition — power, speed and engineering excellence celebrated in art. A dream piece for bike enthusiasts.',
   'Three iconic superbikes — power, speed & engineering art',
   'SuperBike Collection Poster | Motorcycle Art India | ChitraFrame',
   'SuperBike Triple Crown — premium motorcycle art print. ₹499+. Ships across India.',
   ARRAY['superbike','motorcycle','collection','bike art','superbike poster india'], true, 10),

  ('superbike-neon-rider',    'SuperBike Neon Rider',          'automotive',
   'A superbike and rider rendered in striking neon lines against pitch black — speed meets futuristic art. An electrifying piece for motorcycle fans and neon art lovers.',
   'Superbike in neon lines on black — speed meets future art',
   'SuperBike Neon Rider Poster | Neon Bike Art India | ChitraFrame',
   'SuperBike Neon Rider — neon motorcycle art print. ₹499+. Ships pan-India.',
   ARRAY['superbike','neon','rider','motorcycle','neon art india'], false, 11),

  ('superbike-track-beast',   'SuperBike Track Beast',         'automotive',
   'A superbike unleashed on a race track — full lean, full throttle, full commitment. The raw intensity of track riding captured in dramatic art. For those who live at the limit.',
   'Superbike on track at full lean — raw riding intensity',
   'SuperBike Track Poster | Racing Bike Art India | ChitraFrame',
   'SuperBike Track Beast — racing motorcycle art. ₹499+. Ships across India.',
   ARRAY['superbike','track','racing','motorcycle','bike racing art india'], false, 12),

  -- === LEGEND ===
  ('lambo-midnight-neon',     'Midnight Lambo – Neon SVJ',     'legend',
   'A Lamborghini Aventador SVJ bathed in midnight neon — hypercar meets cyberpunk in this stunning art piece. The ultimate wall statement for supercar dreamers.',
   'Lamborghini SVJ in midnight neon — cyberpunk supercar art',
   'Lamborghini Neon Poster India | Lambo Wall Art | ChitraFrame',
   'Midnight Lambo Neon SVJ — premium supercar art print. ₹499+. Ships pan-India.',
   ARRAY['lamborghini','neon','SVJ','supercar','lambo poster india'], true, 1),

  ('goku-ultra-instinct',     'Goku – Ultra Instinct Power',   'legend',
   'Son Goku in his awe-inspiring Ultra Instinct form — silver aura blazing, power beyond limits. A must-have for Dragon Ball Z fans and anime art collectors.',
   'Goku Ultra Instinct — silver aura, limitless power DBZ art',
   'Goku Ultra Instinct Poster India | Dragon Ball Art | ChitraFrame',
   'Goku Ultra Instinct — premium Dragon Ball Z art print. ₹499+. Ships across India.',
   ARRAY['goku','ultra instinct','dragon ball','anime art','goku poster india'], true, 2),

  ('naruto-sage-mode',        'Naruto – Sage Mode',            'legend',
   'Naruto Uzumaki in powerful Sage Mode — nature energy flowing, sage marks glowing. A stunning tribute to the future Hokage and his never-give-up spirit.',
   'Naruto in Sage Mode — sage marks, nature chakra art',
   'Naruto Sage Mode Poster India | Naruto Wall Art | ChitraFrame',
   'Naruto Sage Mode — premium anime art print. ₹499+. Ships pan-India.',
   ARRAY['naruto','sage mode','anime','hokage','naruto poster india'], true, 3),

  ('luffy-pirate-king',       'Luffy – Pirate King Wanted',    'legend',
   'Monkey D. Luffy with his iconic wanted poster aesthetic — the future Pirate King in full Gear 5 glory. An energetic, bold art piece for One Piece fans.',
   'Luffy Pirate King wanted poster — Gear 5 One Piece art',
   'Luffy Pirate King Poster India | One Piece Wall Art | ChitraFrame',
   'Luffy Pirate King Wanted — One Piece art print. ₹499+. Ships across India.',
   ARRAY['luffy','one piece','pirate king','gear 5','luffy poster india'], true, 4),

  ('woman-line-art-gold',     'Feminine Grace – Gold Line Art','legend',
   'An elegant gold line art portrait of a woman — minimalist, modern and deeply expressive. Perfect for bedrooms, living rooms and sophisticated modern interiors.',
   'Minimalist gold line art woman — modern elegant decor',
   'Feminine Line Art Poster | Gold Line Art India | ChitraFrame',
   'Feminine Grace Gold Line Art — minimalist wall art. ₹499+. Ships pan-India.',
   ARRAY['line art','feminine','gold','minimalist','modern wall art india'], false, 5),

  ('beach-sunset-oil',        'Beach Sunset – Oil Paint',      'legend',
   'A stunning beach sunset rendered in oil paint style — warm oranges, soft pinks and gentle ocean waves create a calming retreat on your wall. Perfect for living rooms and bedrooms.',
   'Oil-paint-style beach sunset — calming coastal wall art',
   'Beach Sunset Oil Paint Poster | Coastal Wall Art India | ChitraFrame',
   'Beach Sunset Oil Paint — calming coastal art print. ₹499+. Ships across India.',
   ARRAY['beach','sunset','oil paint','coastal','beach art india'], false, 6),

  -- === WILDLIFE ===
  ('lion-geometric-gold',     'Lion – Geometric Gold Portrait','wildlife',
   'A majestic lion portrait composed of geometric gold shapes — combining the raw power of the king of the jungle with contemporary geometric art. A bold statement for modern homes.',
   'Lion in geometric gold shapes — king of jungle meets modern art',
   'Lion Geometric Gold Poster | Lion Wall Art India | ChitraFrame',
   'Lion Geometric Gold Portrait — premium art print India. ₹499+. Ships pan-India.',
   ARRAY['lion','geometric','gold','wildlife','lion poster india'], true, 1),

  ('lion-dark-majestic',      'Lion – Dark Majestic',          'wildlife',
   'A lion portrait rendered in dramatic dark tones — deep blacks, midnight blues and golden highlights capture the raw, untamed majesty of the king of the savannah.',
   'Lion in dramatic dark tones — untamed majesty captured',
   'Lion Dark Majestic Poster | Wildlife Art India | ChitraFrame',
   'Lion Dark Majestic — dramatic wildlife art print. ₹499+. Ships across India.',
   ARRAY['lion','dark','majestic','wildlife','lion art india'], false, 2),

  ('lion-warrior-spirit',     'Lion – Warrior Spirit',         'wildlife',
   'A powerful lion with a fierce warrior spirit — intense gaze, flowing mane, commanding presence. An art piece that inspires courage, strength and determination.',
   'Lion warrior spirit — intense gaze, commanding presence',
   'Lion Warrior Spirit Poster | Wildlife Wall Art India | ChitraFrame',
   'Lion Warrior Spirit — inspiring wildlife art print. ₹499+. Ships pan-India.',
   ARRAY['lion','warrior','spirit','strength','lion wall art india'], false, 3),

  ('wolf-moonlight',          'Wolf – Moonlight Howl',         'wildlife',
   'A lone wolf howling at the full moon — wild, free and hauntingly beautiful. Dark blues, silver moonlight and dramatic atmosphere make this a stunning bedroom or study art piece.',
   'Wolf howling at full moon — wild, free and hauntingly beautiful',
   'Wolf Moonlight Poster | Wolf Wall Art India | ChitraFrame',
   'Wolf Moonlight Howl — dramatic wildlife art print India. ₹499+. Ships pan-India.',
   ARRAY['wolf','moonlight','howl','wildlife','wolf poster india'], true, 4),

  ('wolf-forest-spirit',      'Wolf – Forest Spirit',          'wildlife',
   'A wolf as a forest spirit — ethereal, mysterious and deeply connected to nature. Soft greens, mist and magical lighting create an enchanting wildlife art piece.',
   'Wolf as forest spirit — ethereal nature connection art',
   'Wolf Forest Spirit Poster | Wildlife Art India | ChitraFrame',
   'Wolf Forest Spirit — enchanting wildlife art print. ₹499+. Ships across India.',
   ARRAY['wolf','forest','spirit','nature','wolf art india'], false, 5),

  ('wolf-alpha-dark',         'Wolf – Alpha Dark',             'wildlife',
   'The alpha wolf in commanding dark portrait — silver grey fur, piercing eyes and dominant presence. An art piece that commands respect and admiration in any space.',
   'Alpha wolf in dark portrait — piercing eyes, dominant presence',
   'Wolf Alpha Dark Poster | Premium Wildlife Art India | ChitraFrame',
   'Wolf Alpha Dark — premium wildlife art print. ₹499+. Ships pan-India.',
   ARRAY['wolf','alpha','dark','wildlife','wolf wall art india'], false, 6),

  -- === MOTIVATIONAL ===
  ('discipline-equals-freedom','Discipline = Freedom (Typographic)','motivational',
   '"Discipline Equals Freedom" — Jocko Willink''s powerful philosophy rendered in bold typographic art. Clean, commanding design for gyms, offices and focus rooms. Elevate your mindset every day.',
   'Jocko Willink quote typographic art — discipline is freedom',
   'Discipline Equals Freedom Poster India | Motivational Wall Art | ChitraFrame',
   'Discipline = Freedom typographic poster. Premium motivational wall art India. ₹499+. Ships pan-India.',
   ARRAY['discipline','freedom','jocko','motivational','motivational poster india'], true, 1),

  ('grind-in-silence',        'Grind in Silence (Typographic)','motivational',
   '"Grind in Silence, Let Success Make the Noise" — a powerful reminder to focus on the work, not the noise. Bold typographic design for gyms, home offices and hustle spaces.',
   'Grind in Silence quote — focus on work, not noise art',
   'Grind in Silence Poster India | Motivational Art | ChitraFrame',
   'Grind in Silence typographic poster. Motivational wall art India. ₹499+. Ships across India.',
   ARRAY['grind','silence','hustle','motivational','motivational wall art india'], false, 2)

) AS p(slug, name, cat, desc, short_desc, seo_title, seo_desc, tags, featured, ord)
ON CONFLICT (slug) DO UPDATE SET
  name             = EXCLUDED.name,
  description      = EXCLUDED.description,
  short_description = EXCLUDED.short_description,
  seo_title        = EXCLUDED.seo_title,
  seo_description  = EXCLUDED.seo_description,
  tags             = EXCLUDED.tags,
  is_featured      = EXCLUDED.is_featured,
  display_order    = EXCLUDED.display_order;

-- ── 3. PRODUCT VARIANTS (408 = 51 × 4 sizes × 2 frame types) ──
-- Frame types: 'framed' | 'poster'
-- Sizes: small | medium | large | xl

INSERT INTO product_variants (product_id, size, frame_type, price, compare_price, sku, stock_qty, is_active)
SELECT
  p.id,
  v.size,
  v.frame_type,
  v.price,
  v.compare_price,
  UPPER(REPLACE(p.slug, '-', '_')) || '_' || UPPER(v.size) || '_' || UPPER(v.frame_type) AS sku,
  50 AS stock_qty,
  true AS is_active
FROM products p
CROSS JOIN (VALUES
  ('small',  'framed', 499,  699),
  ('small',  'poster', 299,  449),
  ('medium', 'framed', 799,  1099),
  ('medium', 'poster', 499,  699),
  ('large',  'framed', 1149, 1499),
  ('large',  'poster', 799,  1099),
  ('xl',     'framed', 1749, 2299),
  ('xl',     'poster', 1249, 1699)
) AS v(size, frame_type, price, compare_price)
WHERE p.slug IN (
  'mahadev-cosmic-trance','mahadev-galaxy-medit','mahadev-neon-dark','mahadev-adiyogi-blue',
  'hanuman-bhakti-fire','hanuman-warrior-peak','hanuman-devotion-art',
  'ganesh-purple-cosmos','ganesh-gold-mandala','ganesh-sacred-geometry',
  'radha-krishna-watercolor','radha-krishna-teal-gold','radha-krishna-devotion',
  'ram-darbar-classic','ram-darbar-royal','sita-ram-watercolor','sita-ram-devotional',
  'krishna-mahabharata-1','krishna-mahabharata-2',
  'cr7-golden-era','cr7-celebration','cr7-siuu-moment',
  'messi-world-cup-glory','messi-goat-art','messi-magic-moment',
  '911-neon-tokyo','911-mountain-drive','911-sunset-turbo',
  'm4-dark-carbon','m4-racing-storm','m4-stealth-grey',
  'f1-redbull-sparks','f1-speed-art','f1-race-day',
  'superbike-collection','superbike-neon-rider','superbike-track-beast',
  'lambo-midnight-neon','goku-ultra-instinct','naruto-sage-mode','luffy-pirate-king',
  'woman-line-art-gold','beach-sunset-oil',
  'lion-geometric-gold','lion-dark-majestic','lion-warrior-spirit',
  'wolf-moonlight','wolf-forest-spirit','wolf-alpha-dark',
  'discipline-equals-freedom','grind-in-silence'
)
ON CONFLICT (sku) DO UPDATE SET
  price         = EXCLUDED.price,
  compare_price = EXCLUDED.compare_price,
  is_active     = EXCLUDED.is_active;

-- ── 4. PRODUCT IMAGES (51 records, Cloudinary URLs) ─────────

INSERT INTO product_images (product_id, image_url, thumbnail_url, alt_text, is_primary, display_order)
SELECT
  p.id,
  'https://res.cloudinary.com/dax4yqumu/image/upload/f_auto,q_auto:good,w_1200/chitraframe/products/' || c.slug || '/' || p.slug || '.jpg',
  'https://res.cloudinary.com/dax4yqumu/image/upload/f_auto,q_auto:good,w_400,h_533,c_fill/chitraframe/products/' || c.slug || '/' || p.slug || '.jpg',
  p.name || ' — Premium Framed Wall Art Print | ChitraFrame India',
  true,
  1
FROM products p
JOIN categories c ON p.category_id = c.id
ON CONFLICT (product_id, is_primary) WHERE is_primary = true DO UPDATE SET
  image_url     = EXCLUDED.image_url,
  thumbnail_url = EXCLUDED.thumbnail_url,
  alt_text      = EXCLUDED.alt_text;

-- ── 5. SITE CONFIG (Promotions / Marketing) ─────────────────
INSERT INTO site_config (key, value, description, is_public) VALUES
  ('promo_banner_active',    'true',                      'Show/hide promo banner', true),
  ('promo_banner_text',      'Free Shipping on orders ₹899+! Use code FRAME50 for ₹50 off prepaid orders.', 'Promo banner text', true),
  ('promo_code_FRAME50',     '{"type":"fixed","amount":50,"min_order":499,"valid_until":"2026-12-31"}', 'Prepaid discount code', false),
  ('free_shipping_threshold','899',                       'Free shipping above this amount (INR)', true),
  ('shipping_charge',        '99',                        'Standard shipping charge (INR)', true),
  ('cod_enabled',            'false',                     'COD payment status', true),
  ('white_mount_price',      '250',                       'White mount add-on price (INR)', true),
  ('poster_addon_price',     '199',                       'Poster print add-on price (INR)', true),
  ('brand_name',             'ChitraFrame',               'Brand display name', true),
  ('brand_tagline',          'Art that speaks. Frames that last.', 'Brand tagline', true),
  ('whatsapp_number',        '+919876543210',             'WhatsApp contact number', true),
  ('instagram_handle',       '@chitraframe.in',           'Instagram handle', true),
  ('current_offers',         '["Free shipping on ₹899+","Prepaid discount ₹50","Combo deals on 2+ frames"]', 'Current active offers JSON', true),
  ('featured_categories',    '["spiritual","sports","automotive","legend"]', 'Featured category slugs', true)
ON CONFLICT (key) DO UPDATE SET
  value       = EXCLUDED.value,
  description = EXCLUDED.description,
  is_public   = EXCLUDED.is_public;

-- ── 6. VERIFICATION QUERIES ───────────────────────────────
-- Run these to verify data:
-- SELECT COUNT(*) FROM products;           -- Should be 51
-- SELECT COUNT(*) FROM product_variants;   -- Should be 408
-- SELECT COUNT(*) FROM product_images;     -- Should be 51
-- SELECT category_id, COUNT(*) FROM products GROUP BY category_id;
-- SELECT size, frame_type, COUNT(*) FROM product_variants GROUP BY size, frame_type ORDER BY 1,2;
