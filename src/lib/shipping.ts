// PhotoFrameIn - Shipping & Logistics Utilities

// Size dimensions table
export const SIZE_DIMENSIONS: Record<string, { length: number; breadth: number; height: number; volWeight: number }> = {
  'A4': { length: 35, breadth: 25, height: 0.5, volWeight: 0.1 },
  'Small': { length: 38, breadth: 30, height: 5, volWeight: 1.14 },
  'Medium': { length: 50, breadth: 38, height: 7, volWeight: 2.66 },
  'Large': { length: 55, breadth: 42, height: 8, volWeight: 3.70 },
  'XL': { length: 80, breadth: 55, height: 10, volWeight: 8.80 }
};

// Shipping floor rates
export function getShippingFloor(paymentMethod: string, size: string, cartTotal: number, freeThreshold: number): number {
  // New "Profit Engine" Logic: Minimum ₹99 for every order as requested
  return 99;
}

// ─── Shiprocket token cache ───────────────────────────────────────────────────
// FIX #10: Cache the Shiprocket JWT in module-level state with a 23h TTL.
//   Shiprocket tokens are valid for 24h. Without caching, every single request
//   that needs shipping (serviceability, order create, AWB, etc.) made a separate
//   login call, adding 300-500ms of latency per request.
//   Module-level state persists within a Cloudflare Worker isolate lifetime,
//   which is typically many hours — well within the 24h token validity window.
let _srToken: string | null = null;
let _srTokenExpiry: number = 0; // epoch ms

// Get Shiprocket auth token — cached with 23h TTL
export async function getShiprocketToken(env: any): Promise<string | null> {
  const now = Date.now();

  // Return cached token if still valid (23h safety margin)
  if (_srToken && now < _srTokenExpiry) {
    return _srToken;
  }

  if (!env?.SHIPROCKET_EMAIL || !env?.SHIPROCKET_PASSWORD) {
    return null;
  }

  try {
    const res = await fetch('https://apiv2.shiprocket.in/v1/external/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: env.SHIPROCKET_EMAIL,
        password: env.SHIPROCKET_PASSWORD
      })
    });
    if (!res.ok) {
      _srToken = null;
      return null;
    }
    const data: any = await res.json();
    if (!data.token) {
      _srToken = null;
      return null;
    }
    // Cache for 23h (token valid 24h, 1h safety buffer)
    _srToken = data.token;
    _srTokenExpiry = now + 23 * 60 * 60 * 1000;
    return _srToken;
  } catch {
    _srToken = null;
    return null;
  }
}

// Check Shiprocket serviceability
export async function checkServiceability(env: any, params: {
  pickupPincode: string;
  deliveryPincode: string;
  weight: number;
  cod: boolean;
  declaredValue: number;
  length: number;
  breadth: number;
  height: number;
}): Promise<{ available: boolean; codAvailable: boolean; shippingCharge: number; estimatedDays: string; courier: string } | null> {
  const token = await getShiprocketToken(env);
  if (!token) return null;

  try {
    const url = new URL('https://apiv2.shiprocket.in/v1/external/courier/serviceability/');
    url.searchParams.set('pickup_postcode', params.pickupPincode);
    url.searchParams.set('delivery_postcode', params.deliveryPincode);
    url.searchParams.set('weight', String(params.weight));
    url.searchParams.set('cod', params.cod ? '1' : '0');
    url.searchParams.set('declared_value', String(params.declaredValue));
    url.searchParams.set('length', String(params.length));
    url.searchParams.set('breadth', String(params.breadth));
    url.searchParams.set('height', String(params.height));

    const res = await fetch(url.toString(), {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!res.ok) return null;
    const data: any = await res.json();

    if (!data.data?.available_courier_companies?.length) {
      return { available: false, codAvailable: false, shippingCharge: 0, estimatedDays: '3-5', courier: '' };
    }

    const best = data.data.available_courier_companies[0];
    return {
      available: true,
      codAvailable: best.cod === 1,
      shippingCharge: Math.ceil(best.freight_charge || best.rate),
      estimatedDays: `${best.etd || '3-5'}`,
      courier: best.courier_name || ''
    };
  } catch {
    return null;
  }
}

// Calculate final shipping charge
// FIX #3 (calculateShipping): Now correctly applies free-shipping threshold for prepaid orders.
//   Free shipping applies when: prepaid + cartTotal >= freeThreshold
//   COD orders always pay shipping (min ₹99) regardless of cart total.
export function calculateShipping(
  shiprocketCharge: number | null,
  paymentMethod: string,
  largestSize: string,
  cartTotal: number,
  freeThreshold: number
): number {
  const floor = 99; // Minimum shipping charge for all orders

  // Free shipping: only for prepaid orders over the threshold
  if (paymentMethod !== 'cod' && cartTotal >= freeThreshold) {
    return 0;
  }

  if (shiprocketCharge === null) return floor;
  // Use Shiprocket quote if higher than floor, otherwise stick to floor
  return Math.max(shiprocketCharge, floor);
}

// Validate Indian pincode
export function isValidPincode(pincode: string): boolean {
  return /^[1-9][0-9]{5}$/.test(pincode);
}

// Check if Hyderabad pincode
export function isHyderabad(pincode: string): boolean {
  return pincode.startsWith('500');
}

// Validate pincode via India Post API
export async function validatePincode(pincode: string): Promise<{ valid: boolean; district?: string; state?: string }> {
  try {
    const res = await fetch(`https://api.postalpincode.in/pincode/${pincode}`);
    const data: any = await res.json();
    if (data[0]?.Status === 'Success' && data[0]?.PostOffice?.length) {
      const po = data[0].PostOffice[0];
      return { valid: true, district: po.District, state: po.State };
    }
    return { valid: false };
  } catch {
    return { valid: false };
  }
}

/**
 * Create Shiprocket order(s)
 * "packing will be individual even if order is for multiple orders"
 * Returns an array of results if splitting occurred.
 */
export async function createShiprocketOrder(env: any, order: any): Promise<{ success: boolean; shiprocketOrderIds?: string[]; error?: string }> {
  const token = await getShiprocketToken(env);
  if (!token) return { success: false, error: 'Failed to authenticate with Shiprocket' };

  try {
    const results: string[] = [];
    const items = order.items || [];
    
    // Expand items based on quantity (1 frame = 1 package)
    const expandedItems: any[] = [];
    for (const item of items) {
      const qty = item.quantity || 1;
      for (let i = 0; i < qty; i++) {
        expandedItems.push({ ...item, quantity: 1 });
      }
    }
    
    // Process each item individually as requested
    for (let index = 0; index < expandedItems.length; index++) {
      const item = expandedItems[index];
      const dims = SIZE_DIMENSIONS[item.size] || SIZE_DIMENSIONS['Medium'];
      
      const payload = {
        order_id: expandedItems.length > 1 ? `${order.order_id}-${index + 1}` : order.order_id,
        order_date: new Date().toISOString().slice(0, 10),
        pickup_location: 'Primary',
        billing_customer_name: order.customer_name,
        billing_address: order.address.line1,
        billing_address_2: order.address.line2 || '',
        billing_city: order.address.city,
        billing_pincode: order.address.pincode,
        billing_state: order.address.state,
        billing_country: 'India',
        billing_email: order.customer_email,
        billing_phone: order.customer_phone,
        shipping_is_billing: true,
        order_items: [{
          name: item.name,
          sku: item.sku || `SKU-${item.variant_id?.slice(0,8)}`,
          units: item.quantity || 1,
          selling_price: item.price,
          discount: 0,
          tax: 0
        }],
        payment_method: order.payment_method === 'cod' ? 'COD' : 'Prepaid',
        sub_total: item.price * (item.quantity || 1),
        length: dims.length,
        breadth: dims.breadth,
        height: dims.height,
        weight: dims.volWeight * (item.quantity || 1)
      };

      const res = await fetch('https://apiv2.shiprocket.in/v1/external/orders/create/adhoc', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data: any = await res.json();
      if (data.order_id) {
        results.push(String(data.order_id));
      } else {
        // If one fails in a multi-pack, we should probably stop or log it
        return { success: false, error: data.message || JSON.stringify(data.errors) || `Failed on item ${index + 1}` };
      }
    }

    return { success: true, shiprocketOrderIds: results };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

// Generate AWB
export async function generateAWB(env: any, shiprocketOrderId: string): Promise<{ success: boolean; awb?: string; courier?: string; error?: string }> {
  const token = await getShiprocketToken(env);
  if (!token) return { success: false, error: 'Auth failed' };

  try {
    const res = await fetch('https://apiv2.shiprocket.in/v1/external/courier/assign/awb', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ shipment_id: shiprocketOrderId })
    });
    const data: any = await res.json();
    if (data.response?.data?.awb_code) {
      return {
        success: true,
        awb: data.response.data.awb_code,
        courier: data.response.data.courier_name
      };
    }
    return { success: false, error: 'No AWB generated' };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

// Schedule pickup
export async function schedulePickup(env: any, shiprocketOrderId: string): Promise<{ success: boolean; error?: string }> {
  const token = await getShiprocketToken(env);
  if (!token) return { success: false, error: 'Auth failed' };

  try {
    const res = await fetch('https://apiv2.shiprocket.in/v1/external/courier/generate/pickup', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ shipment_id: [shiprocketOrderId] })
    });
    const data: any = await res.json();
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

// Generate Label
export async function generateLabel(env: any, shiprocketOrderId: string): Promise<{ success: boolean; labelUrl?: string; error?: string }> {
  const token = await getShiprocketToken(env);
  if (!token) return { success: false, error: 'Auth failed' };

  try {
    const res = await fetch('https://apiv2.shiprocket.in/v1/external/courier/generate/label', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ shipment_id: [shiprocketOrderId] })
    });
    const data: any = await res.json();
    if (data.label_url) {
      return { success: true, labelUrl: data.label_url };
    }
    return { success: false, error: data.message || 'Label generation failed' };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

// Create Shiprocket Headless Checkout Session
export async function createShiprocketSession(env: any, orderData: any): Promise<{ success: boolean; token?: string; checkout_url?: string; error?: string }> {
  const token = await getShiprocketToken(env);
  if (!token) return { success: false, error: 'Shiprocket authentication failed' };

  try {
    const res = await fetch('https://apiv2.shiprocket.in/v1/external/checkout/initialize', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        order_id: orderData.order_id,
        amount: orderData.total,
        customer_name: orderData.customer?.name,
        customer_email: orderData.customer?.email,
        customer_phone: orderData.customer?.phone,
        items: orderData.items.map((i: any) => ({
          name: i.name,
          qty: i.quantity,
          price: i.price,
          sku: i.sku || i.variantId
        }))
      })
    });

    const data: any = await res.json();
    if (data.token) {
      return { success: true, token: data.token, checkout_url: data.checkout_url };
    }
    return { success: false, error: data.message || 'Failed to initialize Shiprocket session' };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}
