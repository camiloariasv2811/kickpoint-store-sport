import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type VariantInput = {
  id?: string;
  size: string;
  color?: string | null;
  sku?: string | null;
  stock?: number;
  active?: boolean;
};

type CreateProductInput = {
  name: string;
  slug?: string | null;
  base_sku?: string | null;
  brand_id?: string | null;
  category_id?: string | null;
  description?: string | null;
  cost?: number;
  retail_price?: number;
  wholesale_price?: number | null;
  wholesale_min_qty?: number | null;
  low_stock_threshold?: number | null;
  images?: string[];
  sizes?: string[];
  colors?: string[];
  variants?: VariantInput[];
};

type UpdateProductInput = {
  id: string;
} & Partial<CreateProductInput>;

function generateVariantSku(baseSku: string | null | undefined, size: string, color?: string | null) {
  const b = (baseSku ?? "").trim();
  const s = String(size ?? "").replace(/\s+/g, "");
  const c = color ? String(color).replace(/\s+/g, "") : "";
  const parts: string[] = [];
  if (b) parts.push(b);
  if (s) parts.push(s.toUpperCase());
  if (c) parts.push(c.slice(0, 3).toUpperCase());
  return parts.join("-");
}

async function assertIsStaff(context: any) {
  const { data: isStaff, error } = await context.supabase.rpc("is_staff", { _user_id: context.userId });
  if (error) throw new Error(error.message);
  if (!isStaff) throw new Error("Forbidden");
}

const PRODUCT_SELECT = `
  id, name, slug, description, base_sku, retail_price, wholesale_price, wholesale_min_qty,
  images, is_featured, is_bestseller, is_new, is_offer, active, low_stock_threshold, created_at,
  brand:brands ( id, name, slug ),
  category:categories ( id, name, slug ),
  variants:product_variants ( id, product_id, size, color, sku, stock, active )
`;

export const listAdminProducts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertIsStaff(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin.from("products").select(PRODUCT_SELECT).order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []) as any;
  });

export const createProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: CreateProductInput) => d)
  .handler(async ({ data, context }) => {
    await assertIsStaff(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const name = String(data.name ?? "").trim();
    if (!name) throw new Error("El nombre del producto es obligatorio");

    const productPayload: any = {
      name,
      slug: data.slug ?? null,
      base_sku: data.base_sku ?? null,
      brand_id: data.brand_id ?? null,
      category_id: data.category_id ?? null,
      description: data.description ?? null,
      cost: data.cost ?? 0,
      retail_price: data.retail_price ?? 0,
      wholesale_price: data.wholesale_price ?? null,
      wholesale_min_qty: data.wholesale_min_qty ?? 8,
      low_stock_threshold: data.low_stock_threshold ?? 5,
      images: data.images ?? [],
    };

    const { data: inserted, error: insertErr } = await supabaseAdmin
      .from("products")
      .insert(productPayload)
      .select("id")
      .limit(1);
    if (insertErr) throw new Error(insertErr.message);
    const productId = inserted?.[0]?.id as string;
    if (!productId) throw new Error("No se pudo crear el producto");

    const sizes = (data.sizes ?? []).map((s) => String(s).trim()).filter(Boolean);
    const colors = (data.colors ?? []).map((c) => String(c).trim()).filter(Boolean);

    const variantsToInsert: any[] = [];

    if (Array.isArray(data.variants) && data.variants.length > 0) {
      for (const v of data.variants) {
        const size = String(v.size).trim();
        const color = v.color ? String(v.color).trim() : null;
        const sku = v.sku ?? generateVariantSku(productPayload.base_sku ?? null, size, color ?? undefined);
        const stock = Number(v.stock ?? 0);
        variantsToInsert.push({ product_id: productId, size, color, sku, stock, active: v.active ?? true });
      }
    } else if (sizes.length > 0) {
      if (colors.length === 0) {
        for (const size of sizes) {
          const sku = generateVariantSku(productPayload.base_sku ?? null, size, null);
          variantsToInsert.push({ product_id: productId, size, color: null, sku, stock: 0, active: true });
        }
      } else {
        for (const size of sizes) {
          for (const color of colors) {
            const sku = generateVariantSku(productPayload.base_sku ?? null, size, color);
            variantsToInsert.push({ product_id: productId, size, color, sku, stock: 0, active: true });
          }
        }
      }
    }

    if (variantsToInsert.length > 0) {
      const { error: vErr } = await supabaseAdmin.from("product_variants").insert(variantsToInsert);
      if (vErr) throw new Error(vErr.message);
    }

    return { id: productId };
  });

export const updateProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: UpdateProductInput) => d)
  .handler(async ({ data, context }) => {
    await assertIsStaff(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    if (!data.id) throw new Error("Falta id del producto");

    const updatable = [
      "name",
      "slug",
      "base_sku",
      "brand_id",
      "category_id",
      "description",
      "cost",
      "retail_price",
      "wholesale_price",
      "wholesale_min_qty",
      "low_stock_threshold",
      "images",
      "is_featured",
      "is_bestseller",
      "is_new",
      "is_offer",
      "active",
    ];
    const fieldsToUpdate: any = {};
    for (const k of updatable) {
      if (Object.prototype.hasOwnProperty.call(data, k)) (fieldsToUpdate as any)[k] = (data as any)[k];
    }
    if (Object.keys(fieldsToUpdate).length > 0) {
      const { error: uErr } = await supabaseAdmin.from("products").update(fieldsToUpdate).eq("id", data.id);
      if (uErr) throw new Error(uErr.message);
    }

    if (Array.isArray(data.variants)) {
      const { data: existingVariants, error: fetchErr } = await supabaseAdmin
        .from("product_variants")
        .select("id, size, color, sku, stock, active")
        .eq("product_id", data.id);
      if (fetchErr) throw new Error(fetchErr.message);

      const existingById = new Map<string, any>();
      const keyOf = (size: string, color?: string | null) => `${size}||${(color ?? "__NULL__")}`;
      const existingByKey = new Map<string, any>();
      for (const ev of (existingVariants ?? [])) {
        existingById.set(ev.id, ev);
        existingByKey.set(keyOf(ev.size, ev.color), ev);
      }

      const toCreate: any[] = [];
      const toUpdate: { id: string; changes: any }[] = [];
      const seenIds = new Set<string>();

      for (const v of data.variants) {
        const size = String(v.size).trim();
        const color = v.color ? String(v.color).trim() : null;
        if (v.id && existingById.has(v.id)) {
          seenIds.add(v.id);
          const ev = existingById.get(v.id);
          const changes: any = {};
          if (v.sku !== undefined && ev.sku !== v.sku) changes.sku = v.sku;
          if (v.stock !== undefined && ev.stock !== v.stock) changes.stock = v.stock;
          if (v.size !== undefined && ev.size !== v.size) changes.size = v.size;
          if ((v.color ?? null) !== ev.color) changes.color = v.color ?? null;
          if (v.active !== undefined && ev.active !== v.active) changes.active = v.active;
          if (Object.keys(changes).length > 0) toUpdate.push({ id: v.id, changes });
        } else {
          const key = keyOf(size, color);
          const matched = existingByKey.get(key);
          if (matched) {
            seenIds.add(matched.id);
            const changes: any = {};
            if (v.sku !== undefined && matched.sku !== v.sku) changes.sku = v.sku;
            if (v.stock !== undefined && matched.stock !== v.stock) changes.stock = v.stock;
            if (v.active !== undefined && matched.active !== v.active) changes.active = v.active;
            if (Object.keys(changes).length > 0) toUpdate.push({ id: matched.id, changes });
          } else {
            const sku = v.sku ?? generateVariantSku(fieldsToUpdate.base_sku ?? null, size, color ?? undefined);
            toCreate.push({ product_id: data.id, size, color, sku, stock: v.stock ?? 0, active: v.active ?? true });
          }
        }
      }

      const toDeleteIds: string[] = [];
      for (const ev of (existingVariants ?? [])) if (!seenIds.has(ev.id)) toDeleteIds.push(ev.id);

      if (toCreate.length > 0) {
        const { error: cErr } = await supabaseAdmin.from("product_variants").insert(toCreate);
        if (cErr) throw new Error(cErr.message);
      }
      for (const u of toUpdate) {
        const { error: uu } = await supabaseAdmin.from("product_variants").update(u.changes).eq("id", u.id);
        if (uu) throw new Error(uu.message);
      }
      if (toDeleteIds.length > 0) {
        const { error: dErr } = await supabaseAdmin.from("product_variants").delete().in("id", toDeleteIds);
        if (dErr) throw new Error(dErr.message);
      }
    }

    return { ok: true as const };
  });

export const setProductActive = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; active: boolean }) => d)
  .handler(async ({ data, context }) => {
    await assertIsStaff(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { error } = await supabaseAdmin.from("products").update({ active: data.active }).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const uploadProductImage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { productId: string; fileName: string; contentType: string; dataBase64: string }) => d)
  .handler(async ({ data, context }) => {
    await assertIsStaff(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    if (!data.dataBase64) throw new Error("Falta contenido");
    const bytes = Buffer.from(data.dataBase64, "base64");
    const ext = String(data.contentType).includes("/") ? String(data.contentType).split("/")[1] : "bin";
    const path = `${data.productId}/${Date.now()}-${data.fileName}.${ext}`;
    const BUCKET = "product_images";

    const { error: uploadError } = await supabaseAdmin.storage.from(BUCKET).upload(path, bytes, { contentType: data.contentType, upsert: false });
    if (uploadError) throw new Error(uploadError.message);

    // read current images and update
    const { data: p, error: fetchErr } = await supabaseAdmin.from("products").select("images").eq("id", data.productId).single();
    if (fetchErr) throw new Error(fetchErr.message);
    const images = (p?.images ?? []) as string[];
    images.push(path);
    const { error: updateErr } = await supabaseAdmin.from("products").update({ images }).eq("id", data.productId);
    if (updateErr) throw new Error(updateErr.message);

    return { path };
  });
