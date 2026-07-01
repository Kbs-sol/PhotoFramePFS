import { z } from "zod";

// Strict, defense-in-depth schema for the checkout form.
// All fields are trimmed, length-bounded, and pattern-restricted so that
// nothing untrusted flows into downstream APIs (Razorpay, address labels,
// email templates) without validation.

const NAME_RE = /^[\p{L}][\p{L}\p{M}'\-. ]{0,79}$/u; // letters, spaces, dashes, dots
const PHONE_RE = /^[6-9]\d{9}$/; // Indian mobile: 10 digits, starts 6-9
const PINCODE_RE = /^[1-9]\d{5}$/; // Indian PIN: 6 digits, no leading 0
const CITY_RE = /^[\p{L}][\p{L}\p{M}'\-. ]{1,59}$/u;
const STATE_RE = /^[\p{L}][\p{L}\p{M}'\-. ]{1,59}$/u;
const ADDRESS_RE = /^[\p{L}\p{N}\p{M} ,.\-\/#()']{4,120}$/u;

export const checkoutSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, "Enter your full name")
    .max(80, "Name must be 80 characters or fewer")
    .regex(NAME_RE, "Use letters, spaces, apostrophes or hyphens only"),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("Enter a valid email address")
    .max(254, "Email is too long"),
  phone: z
    .string()
    .trim()
    .regex(PHONE_RE, "Enter a 10-digit Indian mobile number"),
  addressLine1: z
    .string()
    .trim()
    .regex(ADDRESS_RE, "Enter a valid street address (4–120 characters)"),
  addressLine2: z
    .string()
    .trim()
    .max(120, "Address line 2 is too long")
    .optional()
    .or(z.literal("")),
  city: z
    .string()
    .trim()
    .regex(CITY_RE, "Enter a valid city name"),
  state: z
    .string()
    .trim()
    .regex(STATE_RE, "Enter a valid state name"),
  pincode: z
    .string()
    .trim()
    .regex(PINCODE_RE, "Enter a valid 6-digit PIN code"),
  notes: z
    .string()
    .trim()
    .max(500, "Notes must be 500 characters or fewer")
    .optional()
    .or(z.literal("")),
});

export type CheckoutInput = z.infer<typeof checkoutSchema>;
