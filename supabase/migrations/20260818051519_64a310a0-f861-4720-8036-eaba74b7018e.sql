-- ROLES
CREATE TYPE public.app_role AS ENUM ('admin','staff');

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  email text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own profile read" ON public.profiles FOR SELECT TO authenticated USING (id = auth.uid());
CREATE POLICY "own profile write" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid());
CREATE POLICY "own profile insert" ON public.profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own roles read" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE OR REPLACE FUNCTION public.is_staff(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role IN ('admin','staff'));
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name', NEW.email)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END; $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- BRANDS
CREATE TABLE public.brands (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  logo_url text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.brands TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.brands TO authenticated;
GRANT ALL ON public.brands TO service_role;
ALTER TABLE public.brands ENABLE ROW LEVEL SECURITY;
CREATE POLICY "brands public read" ON public.brands FOR SELECT USING (true);
CREATE POLICY "brands staff write" ON public.brands FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

-- CATEGORIES (self referencing for subcategories)
CREATE TABLE public.categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  parent_id uuid REFERENCES public.categories(id) ON DELETE CASCADE,
  image_url text,
  sort_order int NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.categories TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.categories TO authenticated;
GRANT ALL ON public.categories TO service_role;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "categories public read" ON public.categories FOR SELECT USING (true);
CREATE POLICY "categories staff write" ON public.categories FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

-- PRODUCTS
CREATE TABLE public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text,
  brand_id uuid REFERENCES public.brands(id) ON DELETE SET NULL,
  category_id uuid REFERENCES public.categories(id) ON DELETE SET NULL,
  base_sku text,
  retail_price numeric(12,2) NOT NULL DEFAULT 0,
  wholesale_price numeric(12,2),
  wholesale_min_qty int NOT NULL DEFAULT 8,
  cost numeric(12,2) NOT NULL DEFAULT 0,
  images text[] NOT NULL DEFAULT '{}',
  is_featured boolean NOT NULL DEFAULT false,
  is_bestseller boolean NOT NULL DEFAULT false,
  is_new boolean NOT NULL DEFAULT false,
  is_offer boolean NOT NULL DEFAULT false,
  active boolean NOT NULL DEFAULT true,
  low_stock_threshold int NOT NULL DEFAULT 5,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.products TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.products TO authenticated;
GRANT ALL ON public.products TO service_role;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "products public read" ON public.products FOR SELECT USING (active = true);
CREATE POLICY "products staff read" ON public.products FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "products staff write" ON public.products FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE TRIGGER products_touch BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- VARIANTS (inventory per size/color)
CREATE TABLE public.product_variants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  size text NOT NULL,
  color text,
  sku text UNIQUE,
  stock int NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX product_variants_product_idx ON public.product_variants(product_id);
GRANT SELECT ON public.product_variants TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_variants TO authenticated;
GRANT ALL ON public.product_variants TO service_role;
ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "variants public read" ON public.product_variants FOR SELECT USING (true);
CREATE POLICY "variants staff write" ON public.product_variants FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

-- CUSTOMERS
CREATE TABLE public.customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name text NOT NULL,
  last_name text,
  whatsapp text,
  phone text,
  email text,
  address text,
  city text,
  state text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.customers TO authenticated;
GRANT ALL ON public.customers TO service_role;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "customers staff all" ON public.customers FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

-- PAYMENT METHODS
CREATE TABLE public.payment_methods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  instructions text,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  sort_order int NOT NULL DEFAULT 0
);
GRANT SELECT ON public.payment_methods TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payment_methods TO authenticated;
GRANT ALL ON public.payment_methods TO service_role;
ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pm public read" ON public.payment_methods FOR SELECT USING (active = true);
CREATE POLICY "pm staff all" ON public.payment_methods FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

-- ORDERS
CREATE SEQUENCE public.order_number_seq START 1;
CREATE OR REPLACE FUNCTION public.next_order_number()
RETURNS text LANGUAGE sql VOLATILE SET search_path = public AS $$
  SELECT 'KP-' || to_char(now(),'YYYY') || '-' || lpad(nextval('public.order_number_seq')::text, 6, '0');
$$;

CREATE TABLE public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number text NOT NULL UNIQUE DEFAULT public.next_order_number(),
  customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'pedido_recibido',
  channel text NOT NULL DEFAULT 'online',
  payment_method_code text,
  subtotal numeric(12,2) NOT NULL DEFAULT 0,
  discount numeric(12,2) NOT NULL DEFAULT 0,
  shipping numeric(12,2) NOT NULL DEFAULT 0,
  total numeric(12,2) NOT NULL DEFAULT 0,
  is_wholesale boolean NOT NULL DEFAULT false,
  notes text,
  inventory_applied boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.orders TO authenticated;
GRANT ALL ON public.orders TO service_role;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "orders staff all" ON public.orders FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE TRIGGER orders_touch BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  variant_id uuid REFERENCES public.product_variants(id) ON DELETE SET NULL,
  product_name text NOT NULL,
  image_url text,
  size text,
  color text,
  unit_price numeric(12,2) NOT NULL DEFAULT 0,
  unit_cost numeric(12,2) NOT NULL DEFAULT 0,
  quantity int NOT NULL DEFAULT 1,
  subtotal numeric(12,2) NOT NULL DEFAULT 0
);
CREATE INDEX order_items_order_idx ON public.order_items(order_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.order_items TO authenticated;
GRANT ALL ON public.order_items TO service_role;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "order items staff all" ON public.order_items FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

CREATE TABLE public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  method_code text,
  amount numeric(12,2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pendiente',
  reference text,
  proof_url text,
  proof_uploaded_at timestamptz,
  verified_at timestamptz,
  verified_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  rejection_reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payments TO authenticated;
GRANT ALL ON public.payments TO service_role;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "payments staff all" ON public.payments FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

-- SALES
CREATE SEQUENCE public.sale_number_seq START 1;
CREATE OR REPLACE FUNCTION public.next_sale_number()
RETURNS text LANGUAGE sql VOLATILE SET search_path = public AS $$
  SELECT 'V-' || to_char(now(),'YYYY') || '-' || lpad(nextval('public.sale_number_seq')::text, 6, '0');
$$;

CREATE TABLE public.sales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_number text NOT NULL UNIQUE DEFAULT public.next_sale_number(),
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  channel text NOT NULL DEFAULT 'presencial',
  payment_method_code text,
  total numeric(12,2) NOT NULL DEFAULT 0,
  cost_total numeric(12,2) NOT NULL DEFAULT 0,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sales TO authenticated;
GRANT ALL ON public.sales TO service_role;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sales staff all" ON public.sales FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

CREATE TABLE public.sale_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id uuid NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  variant_id uuid REFERENCES public.product_variants(id) ON DELETE SET NULL,
  product_name text NOT NULL,
  size text,
  color text,
  unit_price numeric(12,2) NOT NULL DEFAULT 0,
  unit_cost numeric(12,2) NOT NULL DEFAULT 0,
  quantity int NOT NULL DEFAULT 1,
  subtotal numeric(12,2) NOT NULL DEFAULT 0
);
CREATE INDEX sale_items_sale_idx ON public.sale_items(sale_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sale_items TO authenticated;
GRANT ALL ON public.sale_items TO service_role;
ALTER TABLE public.sale_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sale items staff all" ON public.sale_items FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

-- INVENTORY MOVEMENTS
CREATE TABLE public.inventory_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  variant_id uuid NOT NULL REFERENCES public.product_variants(id) ON DELETE CASCADE,
  type text NOT NULL,
  quantity int NOT NULL,
  unit_cost numeric(12,2),
  stock_after int,
  reference text,
  note text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX inventory_movements_variant_idx ON public.inventory_movements(variant_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.inventory_movements TO authenticated;
GRANT ALL ON public.inventory_movements TO service_role;
ALTER TABLE public.inventory_movements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "movements staff all" ON public.inventory_movements FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

-- AUDIT LOG
CREATE TABLE public.audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action text NOT NULL,
  entity text,
  entity_id text,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.audit_log TO authenticated;
GRANT ALL ON public.audit_log TO service_role;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "audit staff read" ON public.audit_log FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "audit staff insert" ON public.audit_log FOR INSERT TO authenticated WITH CHECK (public.is_staff(auth.uid()));

-- SETTINGS
CREATE TABLE public.settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.settings TO anon;
GRANT SELECT, INSERT, UPDATE ON public.settings TO authenticated;
GRANT ALL ON public.settings TO service_role;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "settings public read" ON public.settings FOR SELECT USING (true);
CREATE POLICY "settings staff write" ON public.settings FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

-- SEED DATA
INSERT INTO public.settings (key, value) VALUES
  ('store', '{"whatsapp":"584121234567","low_stock_threshold":5,"shipping_flat":3}'::jsonb);

INSERT INTO public.payment_methods (code, name, instructions, details, sort_order) VALUES
  ('pago_movil','Pago Móvil / Bolívares','Realiza el pago por el monto exacto y sube tu comprobante.','{"banco":"Banco de Venezuela","titular":"Kickpoint C.A.","telefono":"0412 123 4567","rif":"J-12345678-9"}'::jsonb,1),
  ('usdt','USDT (Tether)','Envía el monto exacto por la red TRC20 y sube el comprobante.','{"red":"TRC20","direccion":"TKoF8c1u9jX4w7h5m3n2q8e6r9t6u4y8"}'::jsonb,2),
  ('cel','Pago con CEL','Realiza el pago y sube tu comprobante.','{"titular":"Kickpoint C.A.","telefono":"0412 555 7890","rif":"J-12345678-9"}'::jsonb,3);

INSERT INTO public.brands (name, slug) VALUES
  ('Alo','alo'), ('On','on'), ('Nike','nike'), ('Adidas','adidas');

INSERT INTO public.categories (name, slug, sort_order) VALUES
  ('Fútbol','futbol',1), ('GYM','gym',2), ('Marcas','marcas',3);

INSERT INTO public.categories (name, slug, parent_id, sort_order)
SELECT v.name, v.slug, c.id, v.ord FROM public.categories c
JOIN (VALUES ('Clubes','clubes',1),('Selecciones','selecciones',2),('Retro','retro',3)) AS v(name,slug,ord) ON true
WHERE c.slug = 'futbol';

INSERT INTO public.categories (name, slug, parent_id, sort_order)
SELECT v.name, v.slug, c.id, v.ord FROM public.categories c
JOIN (VALUES ('Leggins','leggins',1),('Tops','tops',2),('Shorts','shorts',3),('Conjuntos','conjuntos',4)) AS v(name,slug,ord) ON true
WHERE c.slug = 'gym';

INSERT INTO public.products (name, slug, description, brand_id, category_id, base_sku, retail_price, wholesale_price, wholesale_min_qty, cost, images, is_featured, is_bestseller, is_new, is_offer)
VALUES
  ('Barcelona 2026/27 Local','barcelona-2026-27-local','Franela de fútbol Barcelona temporada 2026/27, tela dry-fit premium, corte atlético.',(SELECT id FROM public.brands WHERE slug='nike'),(SELECT id FROM public.categories WHERE slug='clubes'),'KPT-BAR-2627',15,11,8,7.5,ARRAY['/__l5e/assets-v1/fb5cafd4-50ef-4ab9-b830-5e5bf6619dad/p-jersey-1.jpg'],true,true,true,false),
  ('Real Madrid 2026/27 Local','real-madrid-2026-27-local','Franela de fútbol Real Madrid 2026/27, tela dry-fit premium, acabado profesional.',(SELECT id FROM public.brands WHERE slug='adidas'),(SELECT id FROM public.categories WHERE slug='clubes'),'KPT-RMA-2627',15,11,8,7.5,ARRAY['/__l5e/assets-v1/0d8b098b-3e2e-4b6d-ab0e-c4b4b3501125/p-jersey-2.jpg'],true,true,false,false),
  ('Legging Alo High Waist','legging-alo-high-waist','Legging de cintura alta, tela suave con compresión, ideal para gym y yoga.',(SELECT id FROM public.brands WHERE slug='alo'),(SELECT id FROM public.categories WHERE slug='leggins'),'KPT-ALO-LEG1',22,17,8,11,ARRAY['/__l5e/assets-v1/377afd6a-a93c-4c3d-b018-e81683e6246a/p-leggings.jpg'],true,false,true,false),
  ('Top Deportivo Alo Airlift','top-alo-airlift','Top deportivo de soporte medio, espalda cruzada, tela transpirable.',(SELECT id FROM public.brands WHERE slug='alo'),(SELECT id FROM public.categories WHERE slug='tops'),'KPT-ALO-TOP1',18,14,8,8,ARRAY['/__l5e/assets-v1/af551a7d-b6a1-49d9-a61d-cc258251aa3a/p-top.jpg'],true,true,false,true),
  ('Legging On Performance','legging-on-performance','Legging técnico On, tejido ligero de secado rápido para entrenamiento intenso.',(SELECT id FROM public.brands WHERE slug='on'),(SELECT id FROM public.categories WHERE slug='leggins'),'KPT-ON-LEG1',26,20,8,13,ARRAY['/__l5e/assets-v1/377afd6a-a93c-4c3d-b018-e81683e6246a/p-leggings.jpg'],false,false,true,false),
  ('Retro Selección 1998','retro-seleccion-1998','Franela retro edición coleccionista, corte clásico y tela premium.',(SELECT id FROM public.brands WHERE slug='nike'),(SELECT id FROM public.categories WHERE slug='retro'),'KPT-RET-98',17,13,8,8.5,ARRAY['/__l5e/assets-v1/0d8b098b-3e2e-4b6d-ab0e-c4b4b3501125/p-jersey-2.jpg'],false,true,false,false);

INSERT INTO public.product_variants (product_id, size, color, sku, stock)
SELECT p.id, v.size, v.color, p.base_sku || '-' || v.size, v.stock
FROM public.products p
JOIN (VALUES ('S','Original',6),('M','Original',12),('L','Original',9),('XL','Original',4)) AS v(size,color,stock) ON true
WHERE p.slug IN ('barcelona-2026-27-local','real-madrid-2026-27-local','retro-seleccion-1998');

INSERT INTO public.product_variants (product_id, size, color, sku, stock)
SELECT p.id, v.size, v.color, p.base_sku || '-' || v.size || '-' || upper(left(v.color,3)), v.stock
FROM public.products p
JOIN (VALUES ('S','Negro',8),('M','Negro',10),('L','Negro',5),('S','Beige',4),('M','Beige',3)) AS v(size,color,stock) ON true
WHERE p.slug IN ('legging-alo-high-waist','top-alo-airlift','legging-on-performance');