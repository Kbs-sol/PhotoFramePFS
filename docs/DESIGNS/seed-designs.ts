/**
 * ChitraFrame — seed starter print designs into Supabase.
 *
 * Usage (from your PhotoFramePFS repo):
 *   1. Copy this file to scripts/seed-designs.ts
 *   2. Copy docs/DESIGNS/products.csv to scripts/products.csv
 *   3. Upload each docs/DESIGNS/{slug}/master.jpg to Cloudinary as
 *      products/{slug} (use the public_id matching the slug)
 *   4. Add to .env (NOT .dev.vars — this is a Node script, not the worker):
 *        SUPABASE_URL=...
 *        SUPABASE_SERVICE_KEY=...
 *        CLOUDINARY_CLOUD_NAME=dax4yqumu
 *   5. Run:  npx tsx scripts/seed-designs.ts
 *
 * Idempotent — re-running upserts on slug.
 *
 * Respects product_variants_frame_type_check (frame_type='Direct Frame' always).
 * Frame finish discriminated via SKU suffix: -standard / -premium.
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { parse } from "csv-parse/sync"; // npm i -D csv-parse

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY!;
const CLOUDINARY_CLOUD_NAME =
  process.env.CLOUDINARY_CLOUD_NAME ?? "dax4yqumu";

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_KEY");
  process.exit(1);
}

const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Pricing from system_literacy.md §12 (v5.3)
const SIZES = [
  { code: "small", label: "Small", dims: "8x12", std: 449, prm: 599 },
  { code: "medium", label: "Medium", dims: "12x18", std: 749, prm: 999 },
  { code: "large", label: "Large", dims: "16x20", std: 1099, prm: 1399 },
  { code: "xl", label: "XL", dims: "20x30", std: 1699, prm: 2199 },
] as const;

type Row = {
  slug: string;
  title: string;
  category: string;
  short_description: string;
  long_description: string;
  tags: string;
  seo_title: string;
  seo_description: string;
  base_price_medium_standard: string;
};

const csv = readFileSync(
  new URL("./products.csv", import.meta.url),
  "utf-8",
);
const rows: Row[] = parse(csv, { columns: true, skip_empty_lines: true });

const cldUrl = (slug: string) =>
  `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/image/upload/f_auto,q_auto/products/${slug}`;

async function upsertProduct(row: Row) {
  const image = cldUrl(row.slug);

  const { data: product, error: pErr } = await sb
    .from("products")
    .upsert(
      {
        slug: row.slug,
        title: row.title,
        category: row.category,
        short_description: row.short_description,
        description: row.long_description,
        tags: row.tags.split(",").map((t) => t.trim()),
        seo_title: row.seo_title,
        seo_description: row.seo_description,
        primary_image: image,
        gallery: [image],
        is_placeholder: false,
        is_published: true,
        is_upsell_only: false,
      },
      { onConflict: "slug" },
    )
    .select("id")
    .single();

  if (pErr) throw new Error(`product ${row.slug}: ${pErr.message}`);

  const productId = product.id;
  const variants: Array<Record<string, unknown>> = [];

  for (const s of SIZES) {
    for (const finish of ["standard", "premium"] as const) {
      const price = finish === "standard" ? s.std : s.prm;
      variants.push({
        product_id: productId,
        sku: `${row.slug}-${s.code}-${finish}`,
        size: s.label,
        dimensions: s.dims,
        price,
        frame_type: "Direct Frame", // hard-required by DB CHECK constraint
        in_stock: true,
        is_default: s.code === "medium" && finish === "standard",
      });
    }
  }

  const { error: vErr } = await sb
    .from("product_variants")
    .upsert(variants, { onConflict: "sku" });

  if (vErr) throw new Error(`variants ${row.slug}: ${vErr.message}`);

  console.log(`✓ ${row.slug} — ${variants.length} variants`);
}

(async () => {
  for (const row of rows) {
    try {
      await upsertProduct(row);
    } catch (e) {
      console.error(`✗ ${row.slug}:`, e);
    }
  }
  console.log(`\nDone. Seeded ${rows.length} products × 8 variants each.`);
})();
