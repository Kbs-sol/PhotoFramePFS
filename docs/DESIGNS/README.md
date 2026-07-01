# ChitraFrame — Starter Design Catalog

7 original print designs, ready to import as physical framed-print SKUs.

## Designs

| Slug | Title | Category |
|------|-------|----------|
| `krishna-flute-melody` | Krishna's Flute Melody | Devotional |
| `shree-ganesh-golden-aura` | Shree Ganesh — Golden Aura | Devotional |
| `om-namah-shivaya-cosmic` | Om Namah Shivaya — Cosmic | Devotional |
| `football-glory-moment` | Football — Glory Moment | Sports |
| `cricket-stadium-lights` | Cricket — Stadium Lights | Sports |
| `porsche-911-sunset-drive` | Porsche 911 — Coastal Drive | Automotive |
| `midnight-lambo-neon` | Midnight Lambo — Neon Tokyo | Automotive |

Each folder contains `master.jpg` — 1536×1536, ready for Cloudinary upload.

## Variants per design (8 SKUs each = 56 total)

Pricing from `system_literacy.md` v5.3:

| Size | Dimensions | Standard | Premium |
|------|-----------|----------|---------|
| Small | 8×12" | ₹449 | ₹599 |
| Medium *(default)* | 12×18" | ₹749 | ₹999 |
| Large | 16×20" | ₹1,099 | ₹1,399 |
| XL | 20×30" | ₹1,699 | ₹2,199 |

SKU pattern: `{slug}-{size}-{finish}` → e.g. `krishna-flute-melody-medium-premium`. This matches the existing convention documented in `system_literacy.md` §16 ("Frame finish discriminated via SKU suffix").

## Import path

1. **Upload images to Cloudinary.** Use Admin → Media Manager, or:
   ```bash
   for f in docs/DESIGNS/*/master.jpg; do
     slug=$(basename $(dirname $f))
     curl -X POST "https://api.cloudinary.com/v1_1/dax4yqumu/image/upload" \
       -F "file=@$f" \
       -F "upload_preset=YOUR_UNSIGNED_PRESET" \
       -F "public_id=products/$slug"
   done
   ```
2. **Seed the database.** Copy `seed-designs.ts` into your repo's `scripts/` folder. Set `SUPABASE_URL` + `SUPABASE_SERVICE_KEY` in `.env`. Run:
   ```bash
   npx tsx scripts/seed-designs.ts
   ```
3. **Verify in Admin** that all 7 products are listed, `is_placeholder=false`, and PDPs render the Cloudinary images.

## Files

- `products.csv` — flat catalog (7 rows) — useful for spreadsheets / bulk upload tooling
- `seed-designs.ts` — Node script that idempotently upserts into `products` + `product_variants`
- `*/master.jpg` — print-grade artwork

## Notes

- Respects the `product_variants_frame_type_check` constraint (`frame_type='Direct Frame'` always).
- Generated copy is intentionally short ("simple, effective, efficient") — tighten in Admin if you want different tone per category.
- All artwork is AI-generated. Review each image for any cultural/visual issues before going live; replace via `master.jpg` swap if needed.
