// Product server functions — ported from PhotoFramePFS Hono routes to TanStack Start.
// These fetch from Supabase when configured, and gracefully fall back to the
// static local catalogue (src/lib/products.ts) so the storefront always renders.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { products as localProducts, sizes, frameTypes } from "./products";

const SELECT_FULL = `*, category:categories(name, slug, hover_color), images:product_images(id, image_url, alt_text, display_order), variants:product_variants(id, size, frame_type, price, compare_at_price, sku, stock_count, is_active)`;

/** Shape returned to the client — normalized across Supabase + local fallback. */
export type ApiProduct = {
  id: string;
  slug: string;
  name: string;
  description: string;
  category: string;
  price: number;
  image: string;
  images?: { image_url: string; alt_text?: string }[];
  variants?: {
    id: string;
    size: string;
    frame_type: string;
    price: number;
    compare_at_price?: number;
    is_active?: boolean;
  }[];
  source: "supabase" | "local";
};

function localToApi(p: (typeof localProducts)[number]): ApiProduct {
  return {
    id: p.slug,
    slug: p.slug,
    name: p.title,
    description: p.description,
    category: p.category,
    price: p.price,
    image: p.image,
    images: [{ image_url: p.image, alt_text: p.title }],
    variants: sizes.map((s) => ({
      id: `${p.slug}-${s.id}-direct`,
      size: s.code,
      frame_type: "Direct Frame",
      price: p.price + s.delta,
      is_active: true,
    })),
    source: "local",
  };
}

const listInput = z
  .object({
    category: z.string().optional(),
    search: z.string().max(80).optional(),
    sort: z.string().optional(),
    limit: z.number().int().min(1).max(60).default(24),
    offset: z.number().int().min(0).default(0),
  })
  .default({ limit: 24, offset: 0 });

export const listProductsFn = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => listInput.parse(d ?? {}))
  .handler(async ({ data }) => {
    const { hasSupabase, getSupabase } = await import("./supabase.server");
    if (!hasSupabase()) {
      let list = localProducts.map(localToApi);
      if (data.category) list = list.filter((p) => p.category.toLowerCase() === data.category!.toLowerCase());
      if (data.search) {
        const q = data.search.toLowerCase();
        list = list.filter((p) => p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q));
      }
      return { products: list, total: list.length, source: "local" as const };
    }
    try {
      const sb = getSupabase();
      let query = sb.from("products").select(SELECT_FULL).eq("is_active", true).eq("is_hidden", false);
      if (data.category) {
        const { data: cat } = await sb.from("categories").select("id").eq("slug", data.category).single();
        if (cat) query = query.eq("category_id", (cat as any).id);
      }
      if (data.search) {
        query = query.or(`name.ilike.%${data.search}%,description.ilike.%${data.search}%`);
      }
      switch (data.sort) {
        case "popular": query = query.order("total_orders", { ascending: false }); break;
        case "revenue": query = query.order("total_revenue", { ascending: false }); break;
        default: query = query.order("created_at", { ascending: false });
      }
      const { data: rows, error } = await query.range(data.offset, data.offset + data.limit - 1);
      if (error || !rows?.length) return { products: localProducts.map(localToApi), total: localProducts.length, source: "local" as const };
      return { products: rows as any[], total: rows.length, source: "supabase" as const };
    } catch {
      return { products: localProducts.map(localToApi), total: localProducts.length, source: "local" as const };
    }
  });

const slugInput = z.object({ slug: z.string().min(1).max(120) });

export const getProductFn = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => slugInput.parse(d))
  .handler(async ({ data }) => {
    const { hasSupabase, getSupabase } = await import("./supabase.server");
    if (!hasSupabase()) {
      const p = localProducts.find((x) => x.slug === data.slug);
      if (!p) return { ok: false as const, error: "Product not found" };
      return { ok: true as const, product: localToApi(p), reviews: [], youMayAlsoLike: localProducts.filter((x) => x.category === p.category && x.slug !== p.slug).map(localToApi), source: "local" as const };
    }
    try {
      const sb = getSupabase();
      const { data: product, error } = await sb
        .from("products").select(SELECT_FULL).eq("slug", data.slug).eq("is_active", true).single();
      if (error || !product) {
        const p = localProducts.find((x) => x.slug === data.slug);
        if (!p) return { ok: false as const, error: "Product not found" };
        return { ok: true as const, product: localToApi(p), reviews: [], youMayAlsoLike: [], source: "local" as const };
      }
      const { data: reviews } = await sb
        .from("reviews").select("*").eq("product_id", (product as any).id)
        .eq("is_approved", true).order("created_at", { ascending: false }).limit(10);
      const { data: ymal } = await sb
        .from("products").select(SELECT_FULL).eq("category_id", (product as any).category_id)
        .eq("is_active", true).neq("id", (product as any).id).limit(6);
      return { ok: true as const, product, reviews: reviews || [], youMayAlsoLike: ymal || [], source: "supabase" as const };
    } catch {
      const p = localProducts.find((x) => x.slug === data.slug);
      if (!p) return { ok: false as const, error: "Product not found" };
      return { ok: true as const, product: localToApi(p), reviews: [], youMayAlsoLike: [], source: "local" as const };
    }
  });

export { sizes, frameTypes };
