// ChitraFrame — Marketing & Promotions Route
// Serves current offers, FAQs, blog posts, and AI discoverability endpoints
import { Hono } from 'hono';
import type { Bindings } from '../index';

const marketing = new Hono<{ Bindings: Bindings }>();

// ─── Helper: Supabase REST fetch ────────────────────────────
async function supabaseFetch(env: Bindings, path: string, options: RequestInit = {}) {
  const url = `${env.SUPABASE_URL}/rest/v1${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'apikey': env.SUPABASE_SERVICE_KEY,
      'Authorization': `Bearer ${env.SUPABASE_SERVICE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation',
      ...(options.headers || {}),
    },
  });
  if (!res.ok) throw new Error(`Supabase error ${res.status}: ${await res.text()}`);
  return res.json();
}

// ─── GET /api/promotions ────────────────────────────────────
// Returns current active promotions from site_config
marketing.get('/api/promotions', async (c) => {
  try {
    const configs = await supabaseFetch(
      c.env,
      `/site_config?key=in.(promo_banner_active,promo_banner_text,current_offers,free_shipping_threshold,shipping_charge,prepaid_discount)&select=key,value`
    ) as Array<{ key: string; value: string }>;

    const cfg: Record<string, string> = {};
    configs.forEach(r => { cfg[r.key] = r.value; });

    const bannerActive = cfg['promo_banner_active'] === 'true';
    let currentOffers: string[] = [];
    try { currentOffers = JSON.parse(cfg['current_offers'] || '[]'); } catch {}

    return c.json({
      success: true,
      promo: {
        banner_active: bannerActive,
        banner_text: cfg['promo_banner_text'] || '',
        current_offers: currentOffers,
        pricing: {
          free_shipping_threshold: Number(cfg['free_shipping_threshold'] || 899),
          shipping_charge: Number(cfg['shipping_charge'] || 99),
          prepaid_discount: Number(cfg['prepaid_discount'] || 50),
        },
      },
    });
  } catch (err) {
    console.error('[/api/promotions]', err);
    // Fallback static response
    return c.json({
      success: true,
      promo: {
        banner_active: true,
        banner_text: 'Free Shipping on orders ₹899+! Prepaid discount ₹50.',
        current_offers: ['Free shipping on ₹899+', 'Prepaid discount ₹50', 'Premium quality frames'],
        pricing: {
          free_shipping_threshold: 899,
          shipping_charge: 99,
          prepaid_discount: 50,
        },
      },
    });
  }
});

// ─── POST /api/admin/promotions ─────────────────────────────
// Update promotion banner (admin only)
marketing.post('/api/admin/promotions', async (c) => {
  const token = c.req.header('Authorization')?.replace('Bearer ', '');
  if (token !== c.env.ADMIN_TOKEN) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const body = await c.req.json() as {
    banner_active?: boolean;
    banner_text?: string;
    current_offers?: string[];
  };

  const updates: Array<{ key: string; value: string }> = [];
  if (body.banner_active !== undefined) {
    updates.push({ key: 'promo_banner_active', value: String(body.banner_active) });
  }
  if (body.banner_text) {
    updates.push({ key: 'promo_banner_text', value: body.banner_text });
  }
  if (body.current_offers) {
    updates.push({ key: 'current_offers', value: JSON.stringify(body.current_offers) });
  }

  for (const update of updates) {
    await supabaseFetch(
      c.env,
      `/site_config?key=eq.${update.key}`,
      {
        method: 'PATCH',
        body: JSON.stringify({ value: update.value }),
      }
    );
  }

  return c.json({ success: true, updated: updates.map(u => u.key) });
});

// ─── GET /api/custom-frame/prices ──────────────────────────
// Returns DB-driven prices for all 8 custom frame combos (4 sizes × 2 finishes)
// Queried live from product_variants where frame_type = 'Direct Frame'
// Standard = sku ends in -standard, Premium = sku ends in -premium
marketing.get('/api/custom-frame/prices', async (c) => {
  try {
    // Fetch only Direct Frame rows that are active
    const variants = await supabaseFetch(
      c.env,
      `/product_variants?frame_type=eq.Direct Frame&is_active=eq.true&select=sku,size,price,frame_type`
    ) as Array<{ sku: string; size: string; price: number; frame_type: string }>;

    // Also fetch config for shipping thresholds
    const configs = await supabaseFetch(
      c.env,
      `/site_config?key=in.(free_shipping_threshold,shipping_charge,prepaid_discount)&select=key,value`
    ) as Array<{ key: string; value: string }>;

    const cfg: Record<string, string> = {};
    configs.forEach(r => { cfg[r.key] = r.value; });

    // Size label mapping from DB size values to display labels
    const SIZE_LABEL_MAP: Record<string, string> = {
      'Small':  '8×12"',
      'Medium': '12×18"',
      'Large':  '16×20"',
      'XL':     '20×30"',
    };

    // Group by size → { standard, premium }
    const priceMap: Record<string, { standard?: number; premium?: number; label: string }> = {};

    for (const v of variants) {
      const sku = v.sku || '';
      const sizeKey = v.size;
      const label = SIZE_LABEL_MAP[sizeKey] || sizeKey;

      if (!priceMap[sizeKey]) {
        priceMap[sizeKey] = { label };
      }

      if (sku.endsWith('-standard')) {
        priceMap[sizeKey].standard = Number(v.price);
      } else if (sku.endsWith('-premium')) {
        priceMap[sizeKey].premium = Number(v.price);
      }
      // Skip -noframe rows
    }

    // Build ordered array: Small, Medium, Large, XL
    const SIZE_ORDER = ['Small', 'Medium', 'Large', 'XL'];
    const sizes = SIZE_ORDER
      .filter(s => priceMap[s]?.standard || priceMap[s]?.premium)
      .map(s => ({
        id: s.toLowerCase(),
        size: s,
        label: SIZE_LABEL_MAP[s] || s,
        standard: priceMap[s]?.standard ?? null,
        premium: priceMap[s]?.premium ?? null,
        // Room context hints for UI
        context: {
          Small:  'Desk & shelf',
          Medium: 'Bedroom wall',
          Large:  'Living room',
          XL:     'Statement wall',
        }[s] || '',
        popular: s === 'Medium',
      }));

    return c.json({
      success: true,
      sizes,
      config: {
        free_shipping_threshold: Number(cfg['free_shipping_threshold'] || 899),
        shipping_charge: Number(cfg['shipping_charge'] || 99),
        prepaid_discount: Number(cfg['prepaid_discount'] || 50),
      },
    });
  } catch (err) {
    console.error('[/api/custom-frame/prices]', err);
    // Hardcoded fallback so the page can still render if DB is unreachable
    return c.json({
      success: false,
      error: 'Could not load prices from database. Please try again.',
      sizes: [],
      config: {
        free_shipping_threshold: 899,
        shipping_charge: 99,
        prepaid_discount: 50,
      },
    }, 503);
  }
});

// ─── GET /api/faq ───────────────────────────────────────────
// Returns FAQ data with FAQPage JSON-LD structured data
marketing.get('/api/faq', (c) => {
  const faqs = [
    { q: 'What sizes do you offer for photo frames?', a: 'ChitraFrame offers 4 standard sizes: Small (8×12"), Medium (12×18"), Large (16×20"), and XL (20×30"). All sizes are available in Standard (Matte Black, 1") and Premium (Natural Wood or Mount, 1.5") frame finishes.' },
    { q: 'What is the difference between Standard and Premium frames?', a: 'Standard frames are classic Matte Black with a 1" profile — clean and modern. Premium frames are Natural Wood or White Mount finish with a 1.5" profile for a gallery-style look. Both include archival 240gsm giclée printing and a glass front.' },
    { q: 'How much does shipping cost?', a: 'Standard shipping is ₹99. Orders above ₹899 qualify for FREE shipping across India. We deliver pan-India including all major cities and towns.' },
    { q: 'Do you offer Cash on Delivery (COD)?', a: 'No, ChitraFrame currently does not offer COD. We accept all major prepaid payment methods — UPI, credit/debit cards, net banking and wallets via Razorpay.' },
    { q: 'Is there a discount for prepaid orders?', a: 'Yes! You get ₹50 off on all prepaid orders. This discount is automatically applied at checkout.' },
    { q: 'How long does delivery take?', a: "Standard delivery takes 5–7 business days across India. Metro cities may receive orders faster. We'll send you a tracking link once your order is shipped." },
    { q: 'Are the prints good quality?', a: 'Absolutely. We print on premium 240gsm archival paper using high-resolution giclée printing for vivid, fade-resistant colours. Frames are made from solid MDF or wood with a glass front and hanging hardware included.' },
    { q: 'Can I return or exchange a product?', a: 'We accept returns if the product arrives damaged or defective. Please photograph the damage and WhatsApp us within 48 hours of delivery. Custom print orders are non-refundable unless damaged.' },
    { q: 'Is ChitraFrame suitable for gifting?', a: 'Yes! ChitraFrame products are popular gifts for housewarmings, weddings, birthdays, Diwali and other festivals. We ship directly to the recipient. Popular gifting choices include Radha Krishna prints for weddings, Mahadev for spiritual gifts, and sports art for football fans.' },
    { q: 'Do you offer Mahadev or Lord Shiva wall art?', a: 'Yes! We have 4 stunning Mahadev designs: Cosmic Trance, Galaxy Meditation, Neon Dark Minimal, and Adiyogi Blue Flame. All available in 4 sizes starting at ₹449.' },
    { q: 'Do you sell Hanuman posters?', a: 'Yes, we have 3 Hanuman designs: Bhakti Fire, Warrior of the Peak, and Devotion Art. Perfect for pooja rooms, living rooms or gifting on Hanuman Jayanti.' },
    { q: 'Do you sell anime wall art like Goku or Naruto?', a: 'Yes! Our Legend category includes Goku Ultra Instinct, Naruto Sage Mode, Luffy Pirate King (One Piece) and Midnight Lambo Neon. Starting at ₹449.' },
    { q: 'Do you sell Cristiano Ronaldo or Messi posters?', a: 'Yes! Our Sports category has CR7 and Messi prints in 3 designs each. Messi World Cup Glory (the iconic trophy lift) is a bestseller. Starting at ₹449.' },
    { q: 'What automotive / car art do you stock?', a: 'We have 12 automotive designs: Porsche 911 (3 designs), BMW M4 (3 designs), Formula 1 (3 designs), and SuperBike (3 designs). Perfect for car enthusiasts and man caves.' },
    { q: 'How can I track my order?', a: 'Once your order ships, we send a tracking link via WhatsApp and email. You can also log in to your account on ChitraFrame to check order status.' },
    { q: 'Are frames available in any colour?', a: 'Custom frames are available in Standard (Matte Black, 1") and Premium (Natural Wood or White Mount, 1.5") finishes. Catalogue frames come in classic black.' },
    { q: 'Can I order a custom frame with my own photo?', a: 'Yes! Visit our Custom Frame page to upload your photo, choose your size (8×12", 12×18", 16×20", 20×30") and finish (Standard or Premium), and we will print, frame, and deliver it to you.' },
    { q: 'Do you deliver outside India?', a: 'Currently we ship within India only. International shipping is being explored for the future.' },
    { q: 'How do I contact ChitraFrame?', a: 'You can reach us via WhatsApp (number on our website), Instagram DM @chitraframe.in, or email. We typically respond within 2–4 hours during business hours.' },
    { q: 'What is your Ganesha / Ganesh poster range?', a: 'We offer 3 Ganesha designs: Purple Cosmos, Gold Mandala, and Sacred Geometry. These are popular gifts for housewarmings and Ganesh Chaturthi.' },
    { q: 'Do you have Ram Darbar or Sita Ram posters?', a: 'Yes! We have Ram Darbar Classic, Ram Darbar Royal, Sita Ram Watercolor Bliss, and Sita Ram Devotional Art. All available from ₹449.' },
    { q: 'Are motivational quote posters available?', a: 'Yes! Our Motivational category has "Discipline = Freedom" and "Grind in Silence" — bold typographic art perfect for gyms, home offices and study rooms.' },
  ];

  return c.json({ faqs, total: faqs.length });
});

// ─── GET /api/categories ────────────────────────────────────
marketing.get('/api/categories', (c) => {
  return c.json({
    categories: [
      { slug: 'spiritual',    name: 'Spiritual & Devotional', count: 19, emoji: '🕉️' },
      { slug: 'sports',       name: 'Sports Legends',         count: 6,  emoji: '⚽' },
      { slug: 'automotive',   name: 'Automotive',             count: 12, emoji: '🏎️' },
      { slug: 'legend',       name: 'Legend & Pop Culture',   count: 6,  emoji: '⭐' },
      { slug: 'wildlife',     name: 'Wildlife & Nature',      count: 6,  emoji: '🦁' },
      { slug: 'motivational', name: 'Motivational',           count: 2,  emoji: '💪' },
    ]
  });
});

export default marketing;
