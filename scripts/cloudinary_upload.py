#!/usr/bin/env python3
"""
ChitraFrame — Cloudinary Image Uploader
========================================
Uploads the 10 primary design images to Cloudinary using URL-based upload
(no local file needed — Cloudinary fetches directly from genspark.ai URLs).

USAGE:
  1. Set environment variables:
       export CLOUDINARY_API_KEY=your_api_key
       export CLOUDINARY_API_SECRET=your_api_secret
       # Cloud name is hardcoded: dax4yqumu

  2. Run:
       python3 scripts/cloudinary_upload.py

  3. Check output — each image will show its Cloudinary URL.
     These URLs are already written into chitraframe_unified_v5.sql.

CLOUDINARY PATH CONVENTION:
  chitraframe/products/{category}/{slug}
  Full URL: https://res.cloudinary.com/dax4yqumu/image/upload/.../{path}.jpg

NOTES:
  - Cloudinary URL-upload fetches from source URL and stores on Cloudinary CDN
  - Transformations applied at delivery time via URL params (f_auto, q_auto, w_xxx)
  - If an image with same public_id already exists, it will be OVERWRITTEN
    (use overwrite=False to skip existing)
"""

import os
import sys
import json
import time

try:
    import cloudinary
    import cloudinary.uploader
except ImportError:
    print("ERROR: cloudinary package not installed. Run: pip install cloudinary")
    sys.exit(1)

# ─── Config ──────────────────────────────────────────────────────────────────

CLOUD_NAME   = "dax4yqumu"
API_KEY      = os.environ.get("CLOUDINARY_API_KEY", "")
API_SECRET   = os.environ.get("CLOUDINARY_API_SECRET", "")

if not API_KEY or not API_SECRET:
    print("ERROR: Set CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET environment variables")
    print("")
    print("Example:")
    print("  export CLOUDINARY_API_KEY=123456789012345")
    print("  export CLOUDINARY_API_SECRET=abcdefghijklmnopqrstuvwxyz")
    sys.exit(1)

cloudinary.config(
    cloud_name=CLOUD_NAME,
    api_key=API_KEY,
    api_secret=API_SECRET,
    secure=True
)

# ─── Image Map ───────────────────────────────────────────────────────────────
# Maps: (slug, category, source_url)
# Source URLs are the full-quality genspark.ai hosted images

IMAGES = [
    # slug                          category     genspark source URL
    ("mahadev-cosmic-trance",       "spiritual",  "https://www.genspark.ai/api/files/s/6YSmJUF0"),
    ("radha-krishna-watercolor",    "spiritual",  "https://www.genspark.ai/api/files/s/joUaJFwf"),
    ("radha-krishna-emerald-dance", "spiritual",  "https://www.genspark.ai/api/files/s/u7qV7RLf"),
    ("bmw-m4-carbon-dark",          "automotive", "https://www.genspark.ai/api/files/s/M7jmZNhR"),
    ("porsche-911-pacific-coast",   "automotive", "https://www.genspark.ai/api/files/s/M7PjI0Ug"),
    ("lamborghini-aventador-neon",  "legend",     "https://www.genspark.ai/api/files/s/OO3nMzV2"),
    ("nissan-gtr-r34-osaka-rain",   "automotive", "https://www.genspark.ai/api/files/s/aqC7m1aT"),
    ("f1-redbull-racing",           "automotive", "https://www.genspark.ai/api/files/s/seduUFSY"),
    ("cricket-glory-moment",        "sports",     "https://www.genspark.ai/api/files/s/PIybKTHz"),
    ("lion-geometric-gold",         "wildlife",   "https://www.genspark.ai/api/files/s/Wi1JvwJY"),
]

# ─── Upload ──────────────────────────────────────────────────────────────────

def upload_image(slug: str, category: str, source_url: str) -> dict:
    """Upload one image to Cloudinary from a URL."""
    public_id = f"chitraframe/products/{category}/{slug}"
    
    print(f"\n→ Uploading: {slug}")
    print(f"  Category : {category}")
    print(f"  Source   : {source_url}")
    print(f"  Target   : {public_id}")
    
    try:
        result = cloudinary.uploader.upload(
            source_url,
            public_id=public_id,
            overwrite=True,
            resource_type="image",
            format="jpg",
            # Eager transformations — pre-generate common sizes for fast delivery
            eager=[
                {"width": 1200, "crop": "limit", "quality": "auto:best",  "fetch_format": "auto"},
                {"width": 800,  "crop": "limit", "quality": "auto:good",  "fetch_format": "auto"},
                {"width": 400,  "height": 533, "crop": "fill", "quality": "auto:good",  "fetch_format": "auto"},
            ],
            eager_async=True,
            # Tags for easy management in Cloudinary console
            tags=["chitraframe", "products", category, slug],
            # Context metadata
            context=f"category={category}|slug={slug}|brand=chitraframe",
        )
        
        url = result.get("secure_url", "")
        width = result.get("width", 0)
        height = result.get("height", 0)
        size_kb = result.get("bytes", 0) // 1024
        
        print(f"  ✓ SUCCESS: {width}×{height} px, {size_kb} KB")
        print(f"  URL: {url}")
        
        return {
            "slug": slug,
            "category": category,
            "public_id": public_id,
            "url": url,
            "width": width,
            "height": height,
            "size_kb": size_kb,
            "cloudinary_full": f"https://res.cloudinary.com/{CLOUD_NAME}/image/upload/f_auto,q_auto:best,w_1200/chitraframe/products/{category}/{slug}.jpg",
            "cloudinary_thumb": f"https://res.cloudinary.com/{CLOUD_NAME}/image/upload/f_auto,q_auto:good,w_400,h_533,c_fill/chitraframe/products/{category}/{slug}.jpg",
            "status": "success"
        }
        
    except Exception as e:
        print(f"  ✗ FAILED: {e}")
        return {
            "slug": slug,
            "category": category,
            "error": str(e),
            "status": "failed"
        }


def generate_sql(results: list) -> str:
    """Generate SQL UPDATE statements for successful uploads."""
    lines = [
        "-- ChitraFrame — Cloudinary Upload Results",
        "-- Generated by scripts/cloudinary_upload.py",
        "-- Run in Supabase SQL Editor to link uploaded images",
        "",
    ]
    
    success = [r for r in results if r.get("status") == "success"]
    failed  = [r for r in results if r.get("status") == "failed"]
    
    if success:
        lines.append("-- ── Successful uploads ────────────────────────────────────────────────────")
        for r in success:
            lines.append(f"""UPDATE product_images
SET
  image_url     = '{r["cloudinary_full"]}',
  thumbnail_url = '{r["cloudinary_thumb"]}'
WHERE product_id = (SELECT id FROM products WHERE slug = '{r["slug"]}')
  AND is_primary = true;
""")
    
    if failed:
        lines.append("-- ── Failed uploads (manual intervention needed) ──────────────────────────")
        for r in failed:
            lines.append(f"-- FAILED: {r['slug']} ({r['category']}) — {r.get('error', 'unknown error')}")
    
    lines.append(f"\n-- Total: {len(success)} success, {len(failed)} failed")
    return "\n".join(lines)


def main():
    print("=" * 60)
    print("ChitraFrame — Cloudinary Image Uploader")
    print(f"Cloud: {CLOUD_NAME}")
    print(f"Images to upload: {len(IMAGES)}")
    print("=" * 60)
    
    results = []
    
    for i, (slug, category, source_url) in enumerate(IMAGES, 1):
        print(f"\n[{i}/{len(IMAGES)}]", end="")
        result = upload_image(slug, category, source_url)
        results.append(result)
        
        # Small delay between uploads to be polite to Cloudinary API
        if i < len(IMAGES):
            time.sleep(1)
    
    # ── Summary ──────────────────────────────────────────────────────────────
    success_count = sum(1 for r in results if r["status"] == "success")
    failed_count  = sum(1 for r in results if r["status"] == "failed")
    
    print("\n" + "=" * 60)
    print("UPLOAD COMPLETE")
    print(f"  ✓ Success: {success_count}/{len(IMAGES)}")
    print(f"  ✗ Failed:  {failed_count}/{len(IMAGES)}")
    print("=" * 60)
    
    if failed_count:
        print("\nFailed images:")
        for r in results:
            if r["status"] == "failed":
                print(f"  - {r['slug']}: {r.get('error', 'unknown')}")
    
    # ── Write SQL patch ───────────────────────────────────────────────────────
    sql = generate_sql(results)
    sql_path = "supabase/cloudinary_upload_results.sql"
    with open(sql_path, "w") as f:
        f.write(sql)
    print(f"\n✓ SQL patch written to: {sql_path}")
    print("  Run this in Supabase SQL Editor to link the uploaded images.")
    
    # ── Write JSON results ────────────────────────────────────────────────────
    json_path = "scripts/cloudinary_upload_results.json"
    with open(json_path, "w") as f:
        json.dump(results, f, indent=2)
    print(f"✓ Results JSON written to: {json_path}")
    
    # ── Print Cloudinary URLs ─────────────────────────────────────────────────
    print("\n── Cloudinary URLs (for app.js DESIGN_IMAGES map) ──────────────────────")
    print("const DESIGN_IMAGES = {")
    for r in results:
        if r["status"] == "success":
            print(f"  '{r['slug']}': '{r['cloudinary_full']}',")
    print("};")
    
    return 0 if failed_count == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
