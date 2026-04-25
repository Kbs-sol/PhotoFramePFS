-- PhotoFrameIn - Seed Data
-- Sample products, categories, system defaults

-- ============================================
-- SYSTEM CONFIG DEFAULTS
-- ============================================
INSERT INTO system_config (key, value, description) VALUES
  ('checkout_mode', 'shiprocket', 'Primary checkout: shiprocket or custom'),
  ('cod_enabled', 'true', 'Global COD toggle'),
  ('cod_min_value', '499', 'Minimum order for COD'),
  ('cod_max_value', '1995', 'Maximum order for COD'),
  ('cod_fee', '49', 'COD fee charged to customer'),
  ('free_shipping_threshold', '799', 'Free shipping above this amount (prepaid)'),
  ('pickup_pincode', '501504', 'Warehouse pickup pincode'),
  ('acrylic_enabled', 'true', 'Acrylic upgrade toggle'),
  ('combos_enabled', 'true', 'Global combos toggle'),
  ('a4_oos_threshold', '10', 'Auto OOS if A4 exceeds % of daily orders'),
  ('exit_intent_enabled', 'true', 'Exit intent popup toggle'),
  ('festival_mode', '', 'Active festival: diwali, navratri, etc.'),
  ('announcement_text', 'Free Delivery on orders above Rs.799 | COD Available', 'Top bar text'),
  ('announcement_link', '/shop', 'Top bar link'),
  ('announcement_bg', '#CC0000', 'Top bar background color'),
  ('announcement_active', 'true', 'Show announcement bar'),
  ('urgency_text', 'Limited Stock Available', 'Urgency message on product pages'),
  ('urgency_subtext', 'Offer Ends Tonight', 'Urgency sub message'),
  ('whatsapp_number', '91XXXXXXXXXX', 'WhatsApp for COD confirmation'),
  ('whatsapp_prepaid_message', 'Hi! I just placed an order on PhotoFrameIn. Order ID: {order_id}', 'Prepaid WhatsApp template'),
  ('whatsapp_cod_message', 'Hi! I placed a COD order on PhotoFrameIn. Order ID: {order_id}. Please confirm my order.', 'COD WhatsApp template'),
  ('owner_email', '', 'Owner email for notifications'),
  ('prepaid_discount', '50', 'Prepaid discount amount'),
  ('hero_banner_title', 'Premium Wall Art & Poster Frames', 'Homepage hero title'),
  ('hero_banner_subtitle', 'Transform Your Space Into an Aesthetic Setup', 'Homepage hero subtitle'),
  ('hero_banner_image', '', 'Homepage hero background image'),
  ('hero_banner_cta_text', 'Shop Now', 'Homepage hero CTA text'),
  ('hero_banner_cta_link', '/shop', 'Homepage hero CTA link'),
  ('instagram_link', '', 'Instagram profile link'),
  ('facebook_link', '', 'Facebook page link'),
  ('twitter_link', '', 'Twitter profile link'),
  ('about_content', 'PhotoFrameIn is your destination for premium wall art and photo frames. We craft beautiful frames with the fastest turnaround in India.', 'About us text'),
  ('contact_email', 'support@photoframein.com', 'Customer support email'),
  ('contact_phone', '', 'Customer support phone'),
  ('contact_address', 'Hyderabad, Telangana, India', 'Store address'),
  ('maps_embed', '', 'Google Maps embed URL'),
  ('seo_title', 'PhotoFrameIn | Premium Wall Art & Photo Frames in India', 'Homepage SEO title'),
  ('seo_description', 'Buy premium poster frames, wall art & custom photo frames online. Fast delivery across India. Starting Rs.199. Free delivery on Rs.799+', 'Homepage SEO desc'),
  ('og_image', '', 'Homepage OG image'),
  ('gtm_container_id', '', 'Google Tag Manager container ID'),
  ('shipping_prepaid_below_floor', '79', 'Shipping floor for prepaid below threshold'),
  ('shipping_a4_floor', '79', 'Shipping floor for A4 orders'),
  ('shipping_cod_small_medium_floor', '99', 'Shipping floor for COD small/medium'),
  ('shipping_cod_large_xl_floor', '149', 'Shipping floor for COD large/XL')
ON CONFLICT (key) DO NOTHING;

-- ============================================
-- CATEGORIES
-- ============================================
INSERT INTO categories (name, slug, description, hover_color, display_order, is_active) VALUES
  ('Divine', 'divine', 'Sacred art and spiritual wall decor featuring deities, mandalas, and divine energy', '#7C3AED', 1, true),
  ('Automotive', 'automotive', 'Premium automotive art featuring supercars, classic rides, and racing legends', '#E8670A', 2, true),
  ('Motivation', 'motivation', 'Inspiring quotes and motivational artwork to fuel your ambition', '#FFD700', 3, true),
  ('Sports', 'sports', 'Iconic sports moments, athlete art, and stadium photography', '#22C55E', 4, true),
  ('Custom Frames', 'custom-frames', 'Upload your own photo and get it framed with premium quality', '#CC0000', 5, true),
  ('Anime & Pop Culture', 'anime-pop-culture', 'Anime, manga, and pop culture wall art', '#FF69B4', 6, true),
  ('Nature & Landscape', 'nature-landscape', 'Stunning nature photography and landscape wall art', '#10B981', 7, true),
  ('Minimal & Abstract', 'minimal-abstract', 'Clean minimal art and abstract designs for modern spaces', '#6B7280', 8, true)
ON CONFLICT (slug) DO NOTHING;

-- Intent-based collections
INSERT INTO categories (name, slug, description, display_order, is_active, is_intent_collection) VALUES
  ('Gifts Under Rs.999', 'gifts-under-999', 'Perfect gifts that won''t break the bank', 100, true, true),
  ('Bedroom Aesthetic', 'bedroom-aesthetic', 'Curated picks to transform your bedroom', 101, true, true),
  ('Study/Work Setup', 'study-work-setup', 'Motivational art for your workspace', 102, true, true),
  ('Couple/Romantic', 'couple-romantic', 'Romantic wall art for couples', 103, true, true),
  ('Festival Collection', 'festival-collection', 'Seasonal festival specials', 104, true, true)
ON CONFLICT (slug) DO NOTHING;

-- ============================================
-- SAMPLE PRODUCTS (Placeholders)
-- ============================================

-- Divine Category Products
INSERT INTO products (name, slug, description, category_id, is_placeholder, seo_title, seo_description, tags, care_details, size_guide) VALUES
  ('Shree Ganesh Golden Aura', 'shree-ganesh-golden-aura',
   'Bring divine energy into your space with this stunning Lord Ganesh artwork. The golden tones and intricate detailing create a warm, sacred atmosphere perfect for your puja room or living area.',
   (SELECT id FROM categories WHERE slug = 'divine'), true,
   'Shree Ganesh Golden Aura Wall Art | PhotoFrameIn',
   'Buy Shree Ganesh golden artwork. Premium framed print with rich golden tones. Perfect for puja room. Free delivery Rs.799+',
   ARRAY['divine', 'ganesh', 'god', 'spiritual', 'puja'],
   'Avoid direct sunlight. Wipe frame with dry cloth only.',
   'Small = desk/bedside | Medium = main wall | Large = feature wall | XL = statement piece'),
  ('Om Namah Shivaya Cosmic', 'om-namah-shivaya-cosmic',
   'A mesmerizing cosmic representation of Lord Shiva in deep meditation. The vibrant blues and cosmic energy make this a powerful centerpiece for any spiritual space.',
   (SELECT id FROM categories WHERE slug = 'divine'), true,
   'Om Namah Shivaya Cosmic Art | PhotoFrameIn',
   'Lord Shiva cosmic meditation art print. Premium framed wall decor. Spiritual energy for your home.',
   ARRAY['divine', 'shiva', 'spiritual', 'cosmic', 'meditation'],
   'Avoid direct sunlight. Wipe frame with dry cloth only.',
   'Small = desk/bedside | Medium = main wall | Large = feature wall | XL = statement piece'),
  ('Krishna Flute Melody', 'krishna-flute-melody',
   'Lord Krishna playing the divine flute under the moonlit sky. Soft warm tones and ethereal composition that brings peace and devotion to your wall.',
   (SELECT id FROM categories WHERE slug = 'divine'), true,
   'Krishna Flute Melody Wall Art | PhotoFrameIn',
   'Lord Krishna flute art print. Premium framed wall decor for home. Free delivery Rs.799+',
   ARRAY['divine', 'krishna', 'spiritual', 'flute', 'devotion'],
   'Avoid direct sunlight. Wipe frame with dry cloth only.',
   'Small = desk/bedside | Medium = main wall | Large = feature wall | XL = statement piece')
ON CONFLICT (slug) DO NOTHING;

-- Automotive Category Products
INSERT INTO products (name, slug, description, category_id, is_placeholder, seo_title, seo_description, tags, care_details, size_guide) VALUES
  ('Midnight Lambo Neon', 'midnight-lambo-neon',
   'A Lamborghini Aventador slicing through neon-lit city streets at midnight. The electric blue and purple reflections make this the ultimate wall art for car enthusiasts.',
   (SELECT id FROM categories WHERE slug = 'automotive'), true,
   'Midnight Lamborghini Neon Wall Art | PhotoFrameIn',
   'Lamborghini neon city wall art. Premium framed poster for car lovers. Dark aesthetic, vibrant colors.',
   ARRAY['automotive', 'lamborghini', 'neon', 'supercar', 'night'],
   'Avoid direct sunlight. Wipe frame with dry cloth only.',
   'Small = desk/bedside | Medium = main wall | Large = feature wall | XL = statement piece'),
  ('GT-R Skyline Rain', 'gtr-skyline-rain',
   'The legendary Nissan GT-R R34 Skyline parked in a rain-soaked Tokyo alley. Moody cinematic vibes with Japanese neon signs reflecting off wet pavement.',
   (SELECT id FROM categories WHERE slug = 'automotive'), true,
   'Nissan GT-R Skyline Rain Wall Art | PhotoFrameIn',
   'Nissan GT-R R34 Skyline rain art. Tokyo JDM aesthetic. Premium framed wall poster.',
   ARRAY['automotive', 'gtr', 'skyline', 'jdm', 'tokyo', 'rain'],
   'Avoid direct sunlight. Wipe frame with dry cloth only.',
   'Small = desk/bedside | Medium = main wall | Large = feature wall | XL = statement piece'),
  ('Porsche 911 Sunset Drive', 'porsche-911-sunset-drive',
   'A classic Porsche 911 cruising along a coastal highway at golden hour. Warm sunset tones and open road vibes that bring freedom to your wall.',
   (SELECT id FROM categories WHERE slug = 'automotive'), true,
   'Porsche 911 Sunset Drive Wall Art | PhotoFrameIn',
   'Porsche 911 sunset coastal drive poster. Premium framed print. Perfect for car enthusiasts.',
   ARRAY['automotive', 'porsche', '911', 'sunset', 'coastal'],
   'Avoid direct sunlight. Wipe frame with dry cloth only.',
   'Small = desk/bedside | Medium = main wall | Large = feature wall | XL = statement piece')
ON CONFLICT (slug) DO NOTHING;

-- Motivation Category Products
INSERT INTO products (name, slug, description, category_id, is_placeholder, seo_title, seo_description, tags, care_details, size_guide) VALUES
  ('Grind in Silence', 'grind-in-silence',
   'Bold typography on dark background — "GRIND IN SILENCE. LET SUCCESS MAKE THE NOISE." A powerful daily reminder for your workspace.',
   (SELECT id FROM categories WHERE slug = 'motivation'), true,
   'Grind in Silence Motivational Poster | PhotoFrameIn',
   'Grind in Silence motivational wall art. Bold typography poster for workspace. Premium framed print.',
   ARRAY['motivation', 'quotes', 'hustle', 'success', 'workspace'],
   'Avoid direct sunlight. Wipe frame with dry cloth only.',
   'Small = desk/bedside | Medium = main wall | Large = feature wall | XL = statement piece'),
  ('Discipline Equals Freedom', 'discipline-equals-freedom',
   'Minimalist monochrome design with the words "DISCIPLINE = FREEDOM" — clean, powerful, and made for the focused mind.',
   (SELECT id FROM categories WHERE slug = 'motivation'), true,
   'Discipline Equals Freedom Poster | PhotoFrameIn',
   'Discipline Equals Freedom minimal poster. Monochrome motivational wall art for study room.',
   ARRAY['motivation', 'discipline', 'freedom', 'minimal', 'workspace'],
   'Avoid direct sunlight. Wipe frame with dry cloth only.',
   'Small = desk/bedside | Medium = main wall | Large = feature wall | XL = statement piece'),
  ('Rise and Conquer', 'rise-and-conquer',
   'Golden sunrise over mountain peaks with "RISE AND CONQUER" in elegant typography. The perfect blend of nature and motivation.',
   (SELECT id FROM categories WHERE slug = 'motivation'), true,
   'Rise and Conquer Motivational Art | PhotoFrameIn',
   'Rise and Conquer sunrise mountain poster. Premium motivational framed wall art.',
   ARRAY['motivation', 'sunrise', 'mountain', 'conquer', 'nature'],
   'Avoid direct sunlight. Wipe frame with dry cloth only.',
   'Small = desk/bedside | Medium = main wall | Large = feature wall | XL = statement piece')
ON CONFLICT (slug) DO NOTHING;

-- Sports Category Products
INSERT INTO products (name, slug, description, category_id, is_placeholder, seo_title, seo_description, tags, care_details, size_guide) VALUES
  ('Cricket Stadium Lights', 'cricket-stadium-lights',
   'The electric atmosphere of a night cricket match under stadium floodlights. Feel the roar of the crowd every time you look at your wall.',
   (SELECT id FROM categories WHERE slug = 'sports'), true,
   'Cricket Stadium Lights Wall Art | PhotoFrameIn',
   'Cricket night match stadium poster. Premium framed sports wall art. Perfect for cricket fans.',
   ARRAY['sports', 'cricket', 'stadium', 'night', 'india'],
   'Avoid direct sunlight. Wipe frame with dry cloth only.',
   'Small = desk/bedside | Medium = main wall | Large = feature wall | XL = statement piece'),
  ('Football Glory Moment', 'football-glory-moment',
   'The split-second before a winning goal — frozen in time. Dynamic composition capturing the raw emotion and power of the beautiful game.',
   (SELECT id FROM categories WHERE slug = 'sports'), true,
   'Football Glory Moment Wall Art | PhotoFrameIn',
   'Football goal celebration poster. Premium framed sports wall art for football fans.',
   ARRAY['sports', 'football', 'goal', 'celebration'],
   'Avoid direct sunlight. Wipe frame with dry cloth only.',
   'Small = desk/bedside | Medium = main wall | Large = feature wall | XL = statement piece')
ON CONFLICT (slug) DO NOTHING;

-- ============================================
-- PRODUCT VARIANTS (for all products)
-- ============================================

-- Function to create variants for a product
-- We'll insert them manually for each product

-- Helper: Insert variants for each product
DO $$
DECLARE
  prod RECORD;
BEGIN
  FOR prod IN SELECT id, slug, is_custom_frame FROM products LOOP
    -- A4 Print (hidden loss leader)
    INSERT INTO product_variants (product_id, size, frame_type, price, compare_at_price, sku, box_length, box_breadth, box_height, volumetric_weight, actual_weight)
    VALUES (prod.id, 'A4', 'No Frame', 99, 199, prod.slug || '-a4-noframe', 35, 25, 0.5, 0.1, 0.1)
    ON CONFLICT (sku) DO NOTHING;

    -- Small variants
    INSERT INTO product_variants (product_id, size, frame_type, price, compare_at_price, sku, box_length, box_breadth, box_height, volumetric_weight, actual_weight) VALUES
    (prod.id, 'Small', 'No Frame', 199, 349, prod.slug || '-sm-noframe', 38, 30, 5, 1.14, 0.3),
    (prod.id, 'Small', 'Standard', 449, 699, prod.slug || '-sm-standard', 38, 30, 5, 1.14, 0.8),
    (prod.id, 'Small', 'Premium', 599, 899, prod.slug || '-sm-premium', 38, 30, 5, 1.14, 1.0)
    ON CONFLICT (sku) DO NOTHING;

    -- Medium variants
    INSERT INTO product_variants (product_id, size, frame_type, price, compare_at_price, sku, box_length, box_breadth, box_height, volumetric_weight, actual_weight) VALUES
    (prod.id, 'Medium', 'No Frame', 299, 499, prod.slug || '-md-noframe', 50, 38, 7, 2.66, 0.5),
    (prod.id, 'Medium', 'Standard', 749, 1299, prod.slug || '-md-standard', 50, 38, 7, 2.66, 1.5),
    (prod.id, 'Medium', 'Premium', 999, 1499, prod.slug || '-md-premium', 50, 38, 7, 2.66, 2.0)
    ON CONFLICT (sku) DO NOTHING;

    -- Large variants
    INSERT INTO product_variants (product_id, size, frame_type, price, compare_at_price, sku, box_length, box_breadth, box_height, volumetric_weight, actual_weight) VALUES
    (prod.id, 'Large', 'No Frame', 399, 699, prod.slug || '-lg-noframe', 55, 42, 8, 3.70, 0.8),
    (prod.id, 'Large', 'Standard', 1099, 1599, prod.slug || '-lg-standard', 55, 42, 8, 3.70, 2.5),
    (prod.id, 'Large', 'Premium', 1399, 1999, prod.slug || '-lg-premium', 55, 42, 8, 3.70, 3.0)
    ON CONFLICT (sku) DO NOTHING;

    -- XL variants
    INSERT INTO product_variants (product_id, size, frame_type, price, compare_at_price, sku, box_length, box_breadth, box_height, volumetric_weight, actual_weight) VALUES
    (prod.id, 'XL', 'No Frame', 499, 899, prod.slug || '-xl-noframe', 80, 55, 10, 8.80, 1.2),
    (prod.id, 'XL', 'Standard', 1699, 2499, prod.slug || '-xl-standard', 80, 55, 10, 8.80, 4.0),
    (prod.id, 'XL', 'Premium', 2199, 2999, prod.slug || '-xl-premium', 80, 55, 10, 8.80, 5.0)
    ON CONFLICT (sku) DO NOTHING;
  END LOOP;
END $$;

-- ============================================
-- SAMPLE COMBOS / BUNDLES
-- ============================================
INSERT INTO combos (name, slug, description, items, original_price, combo_price, is_active) VALUES
  ('Starter Desk Setup', 'starter-desk-setup', '3 A4 prints in the same theme — perfect for your desk or bedside', '{"count": 3, "size": "A4", "frame": "No Frame"}', 297, 249, true),
  ('Bedroom Aesthetic Kit', 'bedroom-aesthetic-kit', '5 Small framed prints curated for the same room vibe', '{"count": 5, "size": "Small", "frame": "Standard"}', 2245, 599, true),
  ('Full Wall Transformation Pack', 'full-wall-transformation', '10 unframed prints — create a gallery wall composition', '{"count": 10, "size": "Medium", "frame": "No Frame"}', 2990, 999, true),
  ('Premium Gift Frame', 'premium-gift-frame', '1 Medium Premium frame + gift wrap + card — perfect present', '{"count": 1, "size": "Medium", "frame": "Premium", "extras": ["gift_wrap", "card"]}', 1499, 1199, true),
  ('Midnight Drive Set', 'midnight-drive-set', '5 automotive dark prints with neon accents', '{"count": 5, "size": "Small", "frame": "Standard", "category": "automotive"}', 2245, 699, true),
  ('Divine Energy Pack', 'divine-energy-pack', '5 divine prints in warm gold/saffron palette', '{"count": 5, "size": "Small", "frame": "Standard", "category": "divine"}', 2245, 799, true),
  ('Focus Mode Setup', 'focus-mode-setup', '5 motivation prints in minimal monochrome', '{"count": 5, "size": "Small", "frame": "Standard", "category": "motivation"}', 2245, 599, true)
ON CONFLICT (slug) DO NOTHING;

-- ============================================
-- SAMPLE FAQ
-- ============================================
INSERT INTO faq (question, answer, display_order) VALUES
  ('Will it break during delivery?', 'No. We use 5-layer packaging with corner protectors. If it arrives damaged, film your unboxing and we replace it free — no questions asked.', 1),
  ('How long does delivery take?', '3-5 business days across India. 1-3 days in Hyderabad (500xxx pincodes).', 2),
  ('Is COD available?', 'Yes, for orders above Rs.499. A Rs.49 confirmation fee applies. WhatsApp confirmation required within 24 hours.', 3),
  ('What is your return policy?', 'Damaged items are replaced free — unboxing video required. Custom frames are non-returnable. Full policy on our Returns page.', 4),
  ('What if I want to cancel?', 'Cancellations are accepted within 24 hours if the order is not yet dispatched. After dispatch, cancellations are not possible.', 5),
  ('Do you offer custom frames?', 'Yes! Upload your own photo and we will frame it for you. Custom frames are prepaid only and non-returnable. Minimum resolution: 1500x2000px.', 6),
  ('What payment methods do you accept?', 'We accept all UPI apps, credit/debit cards, net banking, and Cash on Delivery (for orders Rs.499-Rs.1,995).', 7),
  ('How do I track my order?', 'Visit our Track page and enter your Order ID (PS-XXXXXX) or registered phone number. You will also receive tracking updates via email.', 8)
ON CONFLICT DO NOTHING;

-- ============================================
-- DEFAULT PAGES
-- ============================================
INSERT INTO pages (slug, title, content) VALUES
  ('returns', 'Returns & Refund Policy', '<h2>Returns & Refund Policy</h2><p>At PhotoFrameIn, we want you to be completely happy with your purchase.</p><h3>Damage Claims</h3><p>If your order arrives damaged, we will replace it free of charge. <strong>An unboxing video is mandatory</strong> for all damage claims. No video = no claim.</p><h3>Custom Frames</h3><p><strong>Custom frame orders are final — no returns or cancellations allowed.</strong></p><h3>Cancellations</h3><p>Orders can be cancelled within 24 hours of placing if not yet dispatched. After dispatch, cancellations are not possible.</p><h3>Refund Timeline</h3><ul><li>Prepaid, not dispatched, within 24h: 5-7 business days via original payment method</li><li>COD, not dispatched, within 24h: 2-3 business days via bank/UPI transfer</li><li>Damaged with video: Free replacement in 3-5 days</li><li>Wrong item: Free replacement + return pickup</li></ul>'),
  ('terms', 'Terms & Conditions', '<h2>Terms & Conditions</h2><p>By using PhotoFrameIn, you agree to these terms.</p><h3>Orders</h3><p>All orders are made-to-order. Delivery timeline is 3-5 business days across India.</p><h3>COD Policy</h3><p>COD is available for orders between Rs.499 and Rs.1,995. A non-refundable Rs.49 COD fee applies. Orders must be confirmed via WhatsApp within 24 hours or they will be auto-cancelled.</p><h3>Custom Frames</h3><p>Custom frame orders are prepaid only. No returns, refunds, or cancellations.</p>'),
  ('shipping', 'Shipping Policy', '<h2>Shipping Policy</h2><p>We dispatch orders within 12 hours of confirmation.</p><h3>Delivery Timeline</h3><ul><li>Hyderabad (500xxx): 1-3 business days</li><li>Rest of India: 3-5 business days</li></ul><h3>Shipping Charges</h3><ul><li>Prepaid orders above Rs.799: FREE</li><li>Prepaid orders below Rs.799: Rs.79</li><li>COD Small/Medium: Rs.99</li><li>COD Large/XL: Rs.149</li></ul><h3>Packaging</h3><p>Every frame is packed with 5-layer protection including corner protectors to ensure safe delivery.</p>'),
  ('privacy', 'Privacy Policy', '<h2>Privacy Policy</h2><p>PhotoFrameIn respects your privacy. We collect only essential information to process orders.</p><h3>What We Collect</h3><ul><li>Name, email, phone for order processing</li><li>Address for delivery</li><li>Payment information (processed securely by Razorpay)</li></ul><h3>How We Use It</h3><p>Your information is used solely for order processing, delivery, and customer support. We never sell your data to third parties.</p>')
ON CONFLICT (slug) DO NOTHING;
