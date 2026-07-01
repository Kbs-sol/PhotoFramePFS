import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const PINCODE_RE = /^[1-9]\d{5}$/;

const pincodeInput = z.object({
  pincode: z.string().regex(PINCODE_RE, "Invalid pincode"),
});

export const validatePincodeFn = createServerFn({ method: "POST" })
  .inputValidator((d) => pincodeInput.parse(d))
  .handler(async ({ data }) => {
    const { validatePincode, isHyderabad } = await import("./shipping.server");
    const r = await validatePincode(data.pincode);
    return {
      valid: r.valid,
      district: r.district,
      state: r.state,
      express: isHyderabad(data.pincode),
      estimatedDays: isHyderabad(data.pincode) ? "1-2" : "3-5",
    };
  });

const estimateInput = z.object({
  pincode: z.string().regex(PINCODE_RE),
  paymentMethod: z.enum(["cod", "prepaid"]).default("prepaid"),
  items: z
    .array(
      z.object({
        size: z.enum(["XS", "S", "M", "L"]),
        price: z.number().int().nonnegative().max(50000),
        quantity: z.number().int().min(1).max(20),
      }),
    )
    .min(1)
    .max(20),
});

export const estimateShippingFn = createServerFn({ method: "POST" })
  .inputValidator((d) => estimateInput.parse(d))
  .handler(async ({ data }) => {
    const {
      SIZE_DIMENSIONS,
      checkServiceability,
      calculateShipping,
      isHyderabad,
      isValidPincode,
    } = await import("./shipping.server");

    if (!isValidPincode(data.pincode)) {
      return { ok: false as const, error: "Invalid pincode" };
    }

    const pickupPincode = process.env.PICKUP_PINCODE || "501504";
    const freeThreshold = Number(process.env.FREE_SHIPPING_THRESHOLD || "999");

    // Compute cart total + pick the largest package for the quote.
    // (Multi-item orders ship as individual packages per legacy logic;
    //  for the *quote* we use the biggest single box × total weight.)
    let cartTotal = 0;
    let totalWeight = 0;
    let biggest: keyof typeof SIZE_DIMENSIONS = "XS";
    const sizeRank: Record<string, number> = { XS: 1, S: 2, M: 3, L: 4 };
    for (const it of data.items) {
      cartTotal += it.price * it.quantity;
      const dim = SIZE_DIMENSIONS[it.size];
      totalWeight += dim.weight * it.quantity;
      if (sizeRank[it.size] > sizeRank[biggest]) biggest = it.size;
    }
    const dims = SIZE_DIMENSIONS[biggest];

    const service = await checkServiceability({
      pickupPincode,
      deliveryPincode: data.pincode,
      weight: Math.max(totalWeight, dims.weight),
      cod: data.paymentMethod === "cod",
      declaredValue: cartTotal,
      length: dims.length,
      breadth: dims.breadth,
      height: dims.height,
    });

    const rawCharge = service?.shippingCharge ?? null;
    const shipping = calculateShipping(
      rawCharge,
      data.paymentMethod,
      cartTotal,
      freeThreshold,
    );

    const codAvailable =
      data.paymentMethod === "cod"
        ? (service?.codAvailable ?? false)
        : true;

    return {
      ok: true as const,
      cartTotal,
      shipping,
      total: cartTotal + shipping,
      freeShipping: shipping === 0,
      freeThreshold,
      estimatedDays:
        service?.estimatedDays ?? (isHyderabad(data.pincode) ? "1-2" : "3-5"),
      courier: service?.courier ?? "Standard",
      codAvailable,
      shiprocketAvailable: service !== null,
    };
  });
