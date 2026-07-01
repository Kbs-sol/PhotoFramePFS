// Server-only shipping helpers. Import from server functions only.
// Ports the tested logic from PhotoFramePFS: India Post pincode validation +
// Shiprocket serviceability with a cached JWT + a custom tier-rounded floor.

export type SizeCode = "XS" | "S" | "M" | "L";

// Dimensions in cm, weight in kg. Volumetric weight = L*B*H / 5000.
export const SIZE_DIMENSIONS: Record<
  SizeCode,
  { length: number; breadth: number; height: number; weight: number }
> = {
  XS: { length: 35, breadth: 25, height: 3, weight: 0.6 }, // 8x12
  S: { length: 48, breadth: 35, height: 4, weight: 1.2 }, // 12x18
  M: { length: 55, breadth: 45, height: 5, weight: 2.0 }, // 16x20
  L: { length: 80, breadth: 55, height: 6, weight: 3.5 }, // 20x30
};

export function isValidPincode(p: string): boolean {
  return /^[1-9][0-9]{5}$/.test(p);
}

export function isHyderabad(p: string): boolean {
  return p.startsWith("500") || p.startsWith("501") || p.startsWith("502");
}

// India Post — free, no key.
export async function validatePincode(
  pincode: string,
): Promise<{ valid: boolean; district?: string; state?: string }> {
  try {
    const res = await fetch(`https://api.postalpincode.in/pincode/${pincode}`);
    if (!res.ok) return { valid: false };
    const data = (await res.json()) as Array<{
      Status: string;
      PostOffice?: Array<{ District: string; State: string }>;
    }>;
    const first = data?.[0];
    if (first?.Status === "Success" && first.PostOffice?.length) {
      const po = first.PostOffice[0];
      return { valid: true, district: po.District, state: po.State };
    }
    return { valid: false };
  } catch {
    return { valid: false };
  }
}

// ── Shiprocket JWT cache (module-scoped, ~23h TTL) ─────────────────────────
let _srToken: string | null = null;
let _srTokenExpiry = 0;

async function getShiprocketToken(): Promise<string | null> {
  const now = Date.now();
  if (_srToken && now < _srTokenExpiry) return _srToken;

  const email = process.env.SHIPROCKET_EMAIL;
  const password = process.env.SHIPROCKET_PASSWORD;
  if (!email || !password) return null;

  try {
    const res = await fetch(
      "https://apiv2.shiprocket.in/v1/external/auth/login",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      },
    );
    if (!res.ok) return null;
    const data = (await res.json()) as { token?: string };
    if (!data.token) return null;
    _srToken = data.token;
    _srTokenExpiry = now + 23 * 60 * 60 * 1000;
    return _srToken;
  } catch {
    return null;
  }
}

export async function checkServiceability(params: {
  pickupPincode: string;
  deliveryPincode: string;
  weight: number;
  cod: boolean;
  declaredValue: number;
  length: number;
  breadth: number;
  height: number;
}): Promise<{
  available: boolean;
  codAvailable: boolean;
  shippingCharge: number;
  estimatedDays: string;
  courier: string;
} | null> {
  const token = await getShiprocketToken();
  if (!token) return null;

  try {
    const url = new URL(
      "https://apiv2.shiprocket.in/v1/external/courier/serviceability/",
    );
    url.searchParams.set("pickup_postcode", params.pickupPincode);
    url.searchParams.set("delivery_postcode", params.deliveryPincode);
    url.searchParams.set("weight", String(params.weight));
    url.searchParams.set("cod", params.cod ? "1" : "0");
    url.searchParams.set("declared_value", String(params.declaredValue));
    url.searchParams.set("length", String(params.length));
    url.searchParams.set("breadth", String(params.breadth));
    url.searchParams.set("height", String(params.height));

    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      data?: {
        available_courier_companies?: Array<{
          freight_charge?: number;
          rate?: number;
          cod?: number;
          etd?: string;
          courier_name?: string;
        }>;
      };
    };
    const list = data.data?.available_courier_companies ?? [];
    if (!list.length) {
      return {
        available: false,
        codAvailable: false,
        shippingCharge: 0,
        estimatedDays: "3-5",
        courier: "",
      };
    }
    const best = list[0];
    return {
      available: true,
      codAvailable: best.cod === 1,
      shippingCharge: Math.ceil(best.freight_charge ?? best.rate ?? 0),
      estimatedDays: best.etd ?? "3-5",
      courier: best.courier_name ?? "",
    };
  } catch {
    return null;
  }
}

/**
 * Round shipping charge UP to the next tier ending in 49/99, minimum ₹99.
 * 0..99 → 99, 100..149 → 149, 150..199 → 199, 200..249 → 249, …
 */
export function roundToTier(raw: number): number {
  const floor = 99;
  if (raw <= floor) return floor;
  // Tiers: 99, 149, 199, 249, 299, … => 99 + 50*k
  const k = Math.ceil((raw - 99) / 50);
  return 99 + 50 * k;
}

export function calculateShipping(
  shiprocketCharge: number | null,
  paymentMethod: "cod" | "prepaid",
  cartTotal: number,
  freeThreshold: number,
): number {
  if (paymentMethod !== "cod" && cartTotal >= freeThreshold) return 0;
  const raw = shiprocketCharge ?? 99;
  return roundToTier(raw);
}

// ── Shiprocket order creation (used after payment/COD) ───────────────────────
// Legacy size names → dimensions. Supports both {XS,S,M,L} and {A4,Small,Medium,Large,XL}.
const LEGACY_DIMENSIONS: Record<
  string,
  { length: number; breadth: number; height: number; weight: number }
> = {
  A4: { length: 32, breadth: 24, height: 2, weight: 0.3 },
  Small: { length: 48, breadth: 35, height: 4, weight: 1.2 },
  Medium: { length: 55, breadth: 45, height: 5, weight: 2.0 },
  Large: { length: 80, breadth: 55, height: 6, weight: 3.5 },
  XL: { length: 95, breadth: 70, height: 8, weight: 6.0 },
  XS: SIZE_DIMENSIONS.XS,
  S: SIZE_DIMENSIONS.S,
  M: SIZE_DIMENSIONS.M,
  L: SIZE_DIMENSIONS.L,
};

function dimsFor(size: string) {
  return LEGACY_DIMENSIONS[size] || LEGACY_DIMENSIONS.Medium;
}

/**
 * Create Shiprocket order(s). Each frame ships as its own package.
 * Returns array of Shiprocket order IDs on success.
 */
export async function createShiprocketOrder(
  order: any,
): Promise<{ success: boolean; shiprocketOrderIds?: string[]; error?: string }> {
  const token = await getShiprocketToken();
  if (!token) return { success: false, error: "Failed to authenticate with Shiprocket" };

  try {
    const results: string[] = [];
    const expandedItems: any[] = [];
    for (const item of order.items || []) {
      const qty = item.quantity || 1;
      for (let i = 0; i < qty; i++) expandedItems.push({ ...item, quantity: 1 });
    }

    for (let index = 0; index < expandedItems.length; index++) {
      const item = expandedItems[index];
      const dims = dimsFor(item.size);
      const payload = {
        order_id:
          expandedItems.length > 1 ? `${order.order_id}-${index + 1}` : order.order_id,
        order_date: new Date().toISOString().slice(0, 10),
        pickup_location: process.env.SHIPROCKET_PICKUP_LOCATION || "Primary",
        billing_customer_name: order.customer_name,
        billing_last_name: "",
        billing_address: order.address.line1,
        billing_address_2: order.address.line2 || "",
        billing_city: order.address.city,
        billing_pincode: order.address.pincode,
        billing_state: order.address.state,
        billing_country: "India",
        billing_email: order.customer_email,
        billing_phone: order.customer_phone,
        shipping_is_billing: true,
        order_items: [
          {
            name: item.name,
            sku: item.sku || `SKU-${String(item.variant_id || "").slice(0, 8)}`,
            units: item.quantity || 1,
            selling_price: item.price,
            discount: 0,
            tax: 0,
          },
        ],
        payment_method: order.payment_method === "cod" ? "COD" : "Prepaid",
        sub_total: item.price * (item.quantity || 1),
        length: dims.length,
        breadth: dims.breadth,
        height: dims.height,
        weight: dims.weight * (item.quantity || 1),
      };

      const res = await fetch(
        "https://apiv2.shiprocket.in/v1/external/orders/create/adhoc",
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const data: any = await res.json();
      if (data.order_id) {
        results.push(String(data.order_id));
      } else {
        return {
          success: false,
          error: data.message || JSON.stringify(data.errors) || `Failed on item ${index + 1}`,
        };
      }
    }
    return { success: true, shiprocketOrderIds: results };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}
