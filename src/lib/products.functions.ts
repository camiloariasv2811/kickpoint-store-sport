import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type VariantInput = {
  id?: string | null;
  size: string;
  color?: string | null;
  sku?: string | null;
  stock?: number;
  active?: boolean;
};

export type CreateProductInput = {
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
  is_featured?: boolean;
  is_bestseller?: boolean;
  is_new?: boolean;
  is_offer?: boolean;
  active?: boolean;
};

export type UpdateProductInput = {
  id: string;
} & Partial<CreateProductInput>;

function generateVariantSku(
  baseSku: string | null | undefined,
  size: string,
  color?: string | null,
) {
  const b = (baseSku ?? "").trim();
  const s = String(size ?? "").replace(/\s+/g, "");
  const c = color ? String(color).replace(/\s+/g, "") : "";
  const parts: string[] = [];
  if (b) parts.push(b);
  if (s) parts.push(s.toUpperCase());
  if (c) parts.push(c.slice(0, 3).toUpperCase());
  return parts.join("-");
}

function generateSlug(name: string) {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

async function assertIsStaff(context: any) {
  const { data: isStaff, error } = await context.supabase.rpc("is_staff", {
    _user_id: context.userId,
  });
  if (error) throw new Error(error.message);
  if (!isStaff) throw new Error("Forbidden");
}

const PRODUCT_SELECT = `
  id, name, slug, description, base_sku, cost, retail_price, wholesale_price, wholesale_min_qty,
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
    const { data, error } = await supabaseAdmin
      .from("products")
      .select(PRODUCT_SELECT)
      .order("created_at", { ascending: false });
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

    const slug = data.slug?.trim() || generateSlug(name);

    const productPayload: any = {
      name,
      slug,
      base_sku: data.base_sku?.trim() || null,
      brand_id: data.brand_id || null,
      category_id: data.category_id || null,
      description: data.description?.trim() || null,
      cost: Number(data.cost ?? 0),
      retail_price: Number(data.retail_price ?? 0),
      wholesale_price:
        data.wholesale_price !== null && data.wholesale_price !== undefined
          ? Number(data.wholesale_price)
          : null,
      wholesale_min_qty: Number(data.wholesale_min_qty ?? 8),
      low_stock_threshold: Number(data.low_stock_threshold ?? 5),
      images: Array.isArray(data.images) ? data.images : [],
      is_featured: Boolean(data.is_featured),
      is_bestseller: Boolean(data.is_bestseller),
      is_new: Boolean(data.is_new),
      is_offer: Boolean(data.is_offer),
      active: data.active !== undefined ? Boolean(data.active) : true,
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
        const size = String(v.size ?? "").trim();
        if (!size) continue;
        const color = v.color ? String(v.color).trim() : null;
        const sku = v.sku?.trim() || generateVariantSku(productPayload.base_sku, size, color);
        const stock = Number(v.stock ?? 0);
        variantsToInsert.push({
          product_id: productId,
          size,
          color,
          sku: sku || null,
          stock,
          active: v.active !== undefined ? Boolean(v.active) : true,
        });
      }
    } else if (sizes.length > 0) {
      if (colors.length === 0) {
        for (const size of sizes) {
          const sku = generateVariantSku(productPayload.base_sku, size, null);
          variantsToInsert.push({
            product_id: productId,
            size,
            color: null,
            sku: sku || null,
            stock: 0,
            active: true,
          });
        }
      } else {
        for (const size of sizes) {
          for (const color of colors) {
            const sku = generateVariantSku(productPayload.base_sku, size, color);
            variantsToInsert.push({
              product_id: productId,
              size,
              color,
              sku: sku || null,
              stock: 0,
              active: true,
            });
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
      if (Object.prototype.hasOwnProperty.call(data, k)) {
        fieldsToUpdate[k] = (data as any)[k];
      }
    }
    if (fieldsToUpdate.name && !fieldsToUpdate.slug && !data.slug) {
      // Keep or update slug if name changed and no manual slug was passed
    }

    if (Object.keys(fieldsToUpdate).length > 0) {
      const { error: uErr } = await supabaseAdmin
        .from("products")
        .update(fieldsToUpdate)
        .eq("id", data.id);
      if (uErr) throw new Error(uErr.message);
    }

    if (Array.isArray(data.variants)) {
      const { data: existingVariants, error: fetchErr } = await supabaseAdmin
        .from("product_variants")
        .select("id, size, color, sku, stock, active")
        .eq("product_id", data.id);
      if (fetchErr) throw new Error(fetchErr.message);

      const existingById = new Map<string, any>();
      for (const ev of existingVariants ?? []) {
        existingById.set(ev.id, ev);
      }

      const toCreate: any[] = [];
      const toUpdate: { id: string; changes: any }[] = [];
      const seenIds = new Set<string>();

      for (const v of data.variants) {
        const size = String(v.size ?? "").trim();
        if (!size) continue;
        const color = v.color ? String(v.color).trim() : null;

        if (v.id && existingById.has(v.id)) {
          seenIds.add(v.id);
          const ev = existingById.get(v.id);
          const changes: any = {};
          if (v.sku !== undefined && ev.sku !== v.sku) changes.sku = v.sku || null;
          if (v.stock !== undefined && ev.stock !== v.stock) changes.stock = Number(v.stock || 0);
          if (v.size !== undefined && ev.size !== size) changes.size = size;
          if (v.color !== undefined && ev.color !== color) changes.color = color;
          if (v.active !== undefined && ev.active !== v.active) changes.active = Boolean(v.active);

          if (Object.keys(changes).length > 0) {
            toUpdate.push({ id: v.id, changes });
          }
        } else {
          // New variant
          const sku =
            v.sku?.trim() ||
            generateVariantSku(data.base_sku ?? fieldsToUpdate.base_sku ?? null, size, color);
          toCreate.push({
            product_id: data.id,
            size,
            color,
            sku: sku || null,
            stock: Number(v.stock ?? 0),
            active: v.active !== undefined ? Boolean(v.active) : true,
          });
        }
      }

      // Existing variants NOT present in the payload: DO NOT DELETE (FK constraints). Mark as active: false.
      const toDeactivateIds: string[] = [];
      for (const ev of existingVariants ?? []) {
        if (!seenIds.has(ev.id) && ev.active) {
          toDeactivateIds.push(ev.id);
        }
      }

      if (toCreate.length > 0) {
        const { error: cErr } = await supabaseAdmin.from("product_variants").insert(toCreate);
        if (cErr) throw new Error(cErr.message);
      }
      for (const u of toUpdate) {
        const { error: uu } = await supabaseAdmin
          .from("product_variants")
          .update(u.changes)
          .eq("id", u.id);
        if (uu) throw new Error(uu.message);
      }
      if (toDeactivateIds.length > 0) {
        const { error: deactErr } = await supabaseAdmin
          .from("product_variants")
          .update({ active: false })
          .in("id", toDeactivateIds);
        if (deactErr) throw new Error(deactErr.message);
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

    const { error } = await supabaseAdmin
      .from("products")
      .update({ active: data.active })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const uploadProductImage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (d: { productId?: string | null; fileName: string; contentType: string; dataBase64: string }) =>
      d,
  )
  .handler(async ({ data, context }) => {
    await assertIsStaff(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    if (!data.dataBase64) throw new Error("Falta contenido de imagen");
    const bytes = Buffer.from(data.dataBase64, "base64");
    const ext = String(data.contentType).includes("/")
      ? String(data.contentType).split("/")[1]
      : "jpg";
    const sanitizedName = data.fileName.replace(/[^a-zA-Z0-9.-]/g, "_");
    const path = `${data.productId || "catalog"}/${Date.now()}-${sanitizedName}.${ext}`;
    const BUCKET = "product_images";

    const { error: uploadError } = await supabaseAdmin.storage
      .from(BUCKET)
      .upload(path, bytes, { contentType: data.contentType, upsert: false });
    if (uploadError) throw new Error(uploadError.message);

    const { data: pubData } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(path);
    const url = pubData?.publicUrl || path;

    if (data.productId) {
      const { data: p, error: fetchErr } = await supabaseAdmin
        .from("products")
        .select("images")
        .eq("id", data.productId)
        .single();
      if (!fetchErr && p) {
        const images = (p.images ?? []) as string[];
        if (!images.includes(url)) {
          images.push(url);
          await supabaseAdmin.from("products").update({ images }).eq("id", data.productId);
        }
      }
    }

    return { path, url };
  });
