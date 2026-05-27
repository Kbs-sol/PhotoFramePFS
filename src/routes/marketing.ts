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
      `/site_config?key=in.(promo_banner_active,promo_banner_text,current_offers,free_shipping_threshold,shipping_charge,white_mount_price,poster_addon_price)&select=key,value`
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
          white_mount_addon: Number(cfg['white_mount_price'] || 250),
          poster_addon: Number(cfg['poster_addon_price'] || 199),
          prepaid_discount: 50,
        },
        sizes: [
          { id: 'small',  label: 'Small',  dimensions: '8×12"',  framed_price: 499,  poster_price: 299  },
          { id: 'medium', label: 'Medium', dimensions: '12×18"', framed_price: 799,  poster_price: 499  },
          { id: 'large',  label: 'Large',  dimensions: '18×24"', framed_price: 1149, poster_price: 799  },
          { id: 'xl',     label: 'XL',     dimensions: '24×36"', framed_price: 1749, poster_price: 1249 },
        ],
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
          white_mount_addon: 250,
          poster_addon: 199,
          prepaid_discount: 50,
        },
        sizes: [
          { id: 'small',  label: 'Small',  dimensions: '8×12"',  framed_price: 499,  poster_price: 299  },
          { id: 'medium', label: 'Medium', dimensions: '12×18"', framed_price: 799,  poster_price: 499  },
          { id: 'large',  label: 'Large',  dimensions: '18×24"', framed_price: 1149, poster_price: 799  },
          { id: 'xl',     label: 'XL',     dimensions: '24×36"', framed_price: 1749, poster_price: 1249 },
        ],
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

// ─── GET /api/faq ───────────────────────────────────────────
// Returns FAQ data with FAQPage JSON-LD structured data
marketing.get('/api/faq', (c) => {
  const faqs = [
    { q: 'What sizes do you offer for photo frames?', a: 'ChitraFrame offers 4 standard sizes: Small (8×12"), Medium (12×18"), Large (18×24"), and XL (24×36"). All sizes are available in both Framed and Poster print options.' },
    { q: 'What is the difference between Framed and Poster options?', a: 'Framed prints come in a premium wooden frame ready to hang on your wall. Poster prints are high-quality prints without a frame — ideal if you have your own frame or prefer a tube-rolled print. Framed options cost slightly more.' },
    { q: 'What is a White Mount Add-on?', a: 'A White Mount adds a white border (mat board) inside the frame around your print, giving it a gallery-style look. It costs ₹250 extra and is available for all sizes.' },
    { q: 'How much does shipping cost?', a: 'Standard shipping is ₹99. Orders above ₹899 qualify for FREE shipping across India. We deliver pan-India including all major cities and towns.' },
    { q: 'Do you offer Cash on Delivery (COD)?', a: 'No, ChitraFrame currently does not offer COD. We accept all major prepaid payment methods — UPI, credit/debit cards, net banking and wallets via Razorpay.' },
    { q: 'Is there a discount for prepaid orders?', a: 'Yes! You get ₹50 off on all prepaid orders. This discount is automatically applied at checkout.' },
    { q: 'How long does delivery take?', a: "Standard delivery takes 5\u20137 business days across India. Metro cities may receive orders faster. We'll send you a tracking link once your order is shipped." },
    { q: 'Are the prints good quality?', a: 'Absolutely. We print on premium 250gsm art paper using high-resolution giclée printing for vivid, fade-resistant colours. Frames are made from solid MDF with a glass front and hanging hardware included.' },
    { q: 'Can I return or exchange a product?', a: 'We accept returns if the product arrives damaged or defective. Please photograph the damage and WhatsApp us within 48 hours of delivery. Custom print orders are non-refundable unless damaged.' },
    { q: 'Is ChitraFrame suitable for gifting?', a: 'Yes! ChitraFrame products are popular gifts for housewarmings, weddings, birthdays, Diwali and other festivals. We ship directly to the recipient. Popular gifting choices include Radha Krishna prints for weddings, Mahadev for spiritual gifts, and sports art for football fans.' },
    { q: 'Do you offer Mahadev or Lord Shiva wall art?', a: 'Yes! We have 4 stunning Mahadev designs: Cosmic Trance, Galaxy Meditation, Neon Dark Minimal, and Adiyogi Blue Flame. All available in 4 sizes starting at ₹499.' },
    { q: 'Do you sell Hanuman posters?', a: 'Yes, we have 3 Hanuman designs: Bhakti Fire, Warrior of the Peak, and Devotion Art. Perfect for pooja rooms, living rooms or gifting on Hanuman Jayanti.' },
    { q: 'Do you sell anime wall art like Goku or Naruto?', a: 'Yes! Our Legend category includes Goku Ultra Instinct, Naruto Sage Mode, Luffy Pirate King (One Piece) and Midnight Lambo Neon. Starting at ₹499.' },
    { q: 'Do you sell Cristiano Ronaldo or Messi posters?', a: 'Yes! Our Sports category has CR7 and Messi prints in 3 designs each. Messi World Cup Glory (the iconic trophy lift) is a bestseller. Starting at ₹499.' },
    { q: 'What automotive / car art do you stock?', a: 'We have 12 automotive designs: Porsche 911 (3 designs), BMW M4 (3 designs), Formula 1 (3 designs), and SuperBike (3 designs). Perfect for car enthusiasts and man caves.' },
    { q: 'How can I track my order?', a: 'Once your order ships, we send a tracking link via WhatsApp and email. You can also log in to your account on ChitraFrame to check order status.' },
    { q: 'Are frames available in any colour?', a: 'Currently all frames come in a classic black finish, which complements all our designs beautifully. White mount add-on is available to enhance the gallery look.' },
    { q: 'Can I order a custom design?', a: 'We do not currently offer fully custom designs. However, we regularly add new designs based on customer demand. Follow us on Instagram @chitraframe.in to be notified of new additions.' },
    { q: 'Do you deliver outside India?', a: 'Currently we ship within India only. International shipping is being explored for the future.' },
    { q: 'How do I contact ChitraFrame?', a: 'You can reach us via WhatsApp (number on our website), Instagram DM @chitraframe.in, or email. We typically respond within 2–4 hours during business hours.' },
    { q: 'What is your Ganesha / Ganesh poster range?', a: 'We offer 3 Ganesha designs: Purple Cosmos, Gold Mandala, and Sacred Geometry. These are popular gifts for housewarmings and Ganesh Chaturthi.' },
    { q: 'Do you have Ram Darbar or Sita Ram posters?', a: 'Yes! We have Ram Darbar Classic, Ram Darbar Royal, Sita Ram Watercolor Bliss, and Sita Ram Devotional Art. All available from ₹499.' },
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
