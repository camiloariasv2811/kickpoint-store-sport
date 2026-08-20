import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type DashboardMetrics = {
  sales: {
    todayTotal: number;
    todayCount: number;
    monthTotal: number;
    monthCount: number;
    totalGenerated: number;
    totalCollected: number;
    pendingPaymentsCount: number;
    pendingPaymentsAmount: number;
    pendingOrdersCount: number;
  };
  inventory: {
    totalUnits: number;
    totalCostValue: number;
    totalRetailValue: number;
    activeProductsCount: number;
    outOfStockCount: number;
    lowStockCount: number;
  };
  charts: {
    salesEvolution: {
      date: string;
      label: string;
      total: number;
      orders: number;
    }[];
    salesByChannel: {
      name: string;
      value: number;
      count: number;
    }[];
    inventoryByCategory: {
      name: string;
      value: number;
    }[];
  };
  recentOrders: {
    id: string;
    orderNumber: string;
    customerName: string;
    customerPhone: string | null;
    channel: string;
    total: number;
    status: string;
    paymentStatus: string;
    paymentMethod: string | null;
    createdAt: string;
  }[];
  lowStockItems: {
    productId: string;
    productName: string;
    variantId: string;
    size: string;
    color: string | null;
    sku: string | null;
    stock: number;
    threshold: number;
    status: "agotado" | "bajo";
  }[];
  recentMovements: {
    id: string;
    productName: string;
    size: string | null;
    color: string | null;
    sku: string | null;
    type: string;
    quantity: number;
    stockAfter: number | null;
    reference: string | null;
    note: string | null;
    createdAt: string;
  }[];
};

export const getAdminDashboard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    // 1. Verificar roles / is_staff
    const { data: roleData, error: roleError } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId);

    if (roleError) {
      throw new Error(`Error al verificar permisos: ${roleError.message}`);
    }

    const isStaff = (roleData ?? []).some((r) =>
      ["admin", "vendedor", "inventario"].includes(r.role as string),
    );

    if (!isStaff) {
      throw new Error("No autorizado: acceso exclusivo para el equipo de administración.");
    }

    // 2. Consultar datos en paralelo utilizando el cliente autenticado
    const [productsRes, ordersRes, salesRes, movementsRes, paymentsRes] = await Promise.all([
      context.supabase.from("products").select(`
          id, name, base_sku, cost, retail_price, wholesale_price, low_stock_threshold, active,
          category:categories(name),
          product_variants(id, size, color, sku, stock, active)
        `),
      context.supabase
        .from("orders")
        .select(
          `
          id, order_number, status, channel, total, subtotal, is_wholesale, created_at, payment_method_code,
          customer:customers(first_name, last_name, whatsapp, phone),
          payments(id, status, amount, method_code, reference, proof_url, proof_uploaded_at, verified_at)
        `,
        )
        .order("created_at", { ascending: false }),
      context.supabase
        .from("sales")
        .select(
          `
          id, sale_number, order_id, customer_id, channel, payment_method_code, total, cost_total, created_at
        `,
        )
        .order("created_at", { ascending: false }),
      context.supabase
        .from("inventory_movements")
        .select(
          `
          id, variant_id, type, quantity, unit_cost, stock_after, reference, note, created_at, created_by,
          product_variants(id, size, color, sku, products(name))
        `,
        )
        .order("created_at", { ascending: false })
        .limit(12),
      context.supabase.from("payments").select(`
          id, order_id, method_code, amount, status, reference, proof_url, proof_uploaded_at, verified_at, created_at
        `),
    ]);

    if (productsRes.error) throw new Error(productsRes.error.message);
    if (ordersRes.error) throw new Error(ordersRes.error.message);
    if (salesRes.error) throw new Error(salesRes.error.message);
    if (movementsRes.error) throw new Error(movementsRes.error.message);
    if (paymentsRes.error) throw new Error(paymentsRes.error.message);

    const rawProducts = productsRes.data ?? [];
    const rawOrders = ordersRes.data ?? [];
    const rawSales = salesRes.data ?? [];
    const rawMovements = movementsRes.data ?? [];
    const rawPayments = paymentsRes.data ?? [];

    // 3. Procesar inventario
    let totalUnits = 0;
    let totalCostValue = 0;
    let totalRetailValue = 0;
    let activeProductsCount = 0;
    let outOfStockCount = 0;
    let lowStockCount = 0;

    const lowStockItems: DashboardMetrics["lowStockItems"] = [];
    const categoryStockMap: Record<string, number> = {};

    for (const p of rawProducts) {
      const isProductActive = p.active;
      if (isProductActive) {
        activeProductsCount++;
      }

      const categoryName = (p.category as { name?: string } | null)?.name ?? "Sin categoría";
      const variants = (p.product_variants ?? []).filter((v) => v.active !== false);
      const threshold = Number(p.low_stock_threshold ?? 5);
      const productCost = Number(p.cost ?? 0);
      const productRetail = Number(p.retail_price ?? 0);

      let productTotalStock = 0;

      for (const v of variants) {
        const vStock = Number(v.stock ?? 0);
        productTotalStock += vStock;

        if (isProductActive) {
          totalUnits += vStock;
          totalCostValue += vStock * productCost;
          totalRetailValue += vStock * productRetail;

          categoryStockMap[categoryName] = (categoryStockMap[categoryName] ?? 0) + vStock;

          if (vStock <= 0) {
            lowStockItems.push({
              productId: p.id,
              productName: p.name,
              variantId: v.id,
              size: v.size,
              color: v.color,
              sku: v.sku ?? p.base_sku,
              stock: vStock,
              threshold,
              status: "agotado",
            });
          } else if (vStock <= threshold) {
            lowStockItems.push({
              productId: p.id,
              productName: p.name,
              variantId: v.id,
              size: v.size,
              color: v.color,
              sku: v.sku ?? p.base_sku,
              stock: vStock,
              threshold,
              status: "bajo",
            });
          }
        }
      }

      if (isProductActive && (variants.length === 0 || productTotalStock === 0)) {
        outOfStockCount++;
      } else if (isProductActive && productTotalStock <= threshold) {
        lowStockCount++;
      }
    }

    // Ordenar alertas de stock por menor cantidad
    lowStockItems.sort((a, b) => a.stock - b.stock);

    // 4. Fechas y períodos
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

    // 5. Procesar ventas y pedidos
    const orderIdsInSales = new Set(rawSales.filter((s) => s.order_id).map((s) => s.order_id));

    // Filtrar órdenes válidas (excluyendo canceladas)
    const validOrders = rawOrders.filter((o) => o.status !== "cancelado");

    // Ventas de hoy
    const todaySales = rawSales.filter((s) => new Date(s.created_at).getTime() >= startOfToday);
    const todayOrders = validOrders.filter(
      (o) => new Date(o.created_at).getTime() >= startOfToday && !orderIdsInSales.has(o.id),
    );

    const todayTotal =
      todaySales.reduce((sum, s) => sum + Number(s.total ?? 0), 0) +
      todayOrders.reduce((sum, o) => sum + Number(o.total ?? 0), 0);
    const todayCount = todaySales.length + todayOrders.length;

    // Ventas del mes
    const monthSales = rawSales.filter((s) => new Date(s.created_at).getTime() >= startOfMonth);
    const monthOrders = validOrders.filter(
      (o) => new Date(o.created_at).getTime() >= startOfMonth && !orderIdsInSales.has(o.id),
    );

    const monthTotal =
      monthSales.reduce((sum, s) => sum + Number(s.total ?? 0), 0) +
      monthOrders.reduce((sum, o) => sum + Number(o.total ?? 0), 0);
    const monthCount = monthSales.length + monthOrders.length;

    // Dinero generado total
    const totalGenerated =
      rawSales.reduce((sum, s) => sum + Number(s.total ?? 0), 0) +
      validOrders
        .filter((o) => !orderIdsInSales.has(o.id))
        .reduce((sum, o) => sum + Number(o.total ?? 0), 0);

    // Dinero cobrado / verificado
    const verifiedPaymentsSum = rawPayments
      .filter((p) => p.status === "verificado")
      .reduce((sum, p) => sum + Number(p.amount ?? 0), 0);

    // Ventas presenciales directas sin pedido previo (ya cobradas en efectivo/POS)
    const posSalesSum = rawSales
      .filter((s) => !s.order_id)
      .reduce((sum, s) => sum + Number(s.total ?? 0), 0);

    const totalCollected = verifiedPaymentsSum + posSalesSum;

    // Pagos pendientes
    const pendingPayments = rawPayments.filter((p) => p.status === "pendiente");
    const pendingPaymentsCount = pendingPayments.length;
    const pendingPaymentsAmount = pendingPayments.reduce(
      (sum, p) => sum + Number(p.amount ?? 0),
      0,
    );

    // Pedidos pendientes de procesar
    const pendingStatuses = new Set([
      "pedido_recibido",
      "pago_pendiente",
      "pago_subido",
      "pago_verificado",
      "preparando_pedido",
      "empacando_pedido",
    ]);
    const pendingOrdersCount = rawOrders.filter((o) => pendingStatuses.has(o.status)).length;

    // 6. Generar datos para gráficos
    // Evolución de ventas en los últimos 14 días
    const daysEvolutionMap: Record<string, { label: string; total: number; orders: number }> = {};
    for (let i = 13; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const [dateKey] = d.toISOString().split("T");
      const dayName = d.toLocaleDateString("es-ES", { day: "numeric", month: "short" });
      if (dateKey) {
        daysEvolutionMap[dateKey] = { label: dayName, total: 0, orders: 0 };
      }
    }

    for (const s of rawSales) {
      const [dateKey] = s.created_at.split("T");
      if (dateKey && daysEvolutionMap[dateKey]) {
        daysEvolutionMap[dateKey].total += Number(s.total ?? 0);
        daysEvolutionMap[dateKey].orders += 1;
      }
    }

    for (const o of validOrders) {
      if (!orderIdsInSales.has(o.id)) {
        const [dateKey] = o.created_at.split("T");
        if (dateKey && daysEvolutionMap[dateKey]) {
          daysEvolutionMap[dateKey].total += Number(o.total ?? 0);
          daysEvolutionMap[dateKey].orders += 1;
        }
      }
    }

    const salesEvolution = Object.entries(daysEvolutionMap).map(([date, val]) => ({
      date,
      label: val.label,
      total: Number(val.total.toFixed(2)),
      orders: val.orders,
    }));

    // Distribución por canal
    const channelMap: Record<string, { name: string; value: number; count: number }> = {
      online: { name: "Web / Online", value: 0, count: 0 },
      presencial: { name: "Tienda / POS", value: 0, count: 0 },
      whatsapp: { name: "WhatsApp", value: 0, count: 0 },
    };

    for (const s of rawSales) {
      const ch = s.channel || "presencial";
      if (!channelMap[ch]) {
        channelMap[ch] = { name: ch, value: 0, count: 0 };
      }
      channelMap[ch].value += Number(s.total ?? 0);
      channelMap[ch].count += 1;
    }

    for (const o of validOrders) {
      if (!orderIdsInSales.has(o.id)) {
        const ch = o.channel || "online";
        if (!channelMap[ch]) {
          channelMap[ch] = { name: ch, value: 0, count: 0 };
        }
        channelMap[ch].value += Number(o.total ?? 0);
        channelMap[ch].count += 1;
      }
    }

    const salesByChannel = Object.values(channelMap).filter((c) => c.value > 0 || c.count > 0);

    // Inventario por categoría
    const inventoryByCategory = Object.entries(categoryStockMap).map(([name, value]) => ({
      name,
      value,
    }));

    // 7. Pedidos recientes formateados
    const recentOrders: DashboardMetrics["recentOrders"] = rawOrders.slice(0, 8).map((o) => {
      const customer = o.customer as {
        first_name?: string;
        last_name?: string | null;
        whatsapp?: string | null;
        phone?: string | null;
      } | null;

      const customerName = customer
        ? `${customer.first_name || ""} ${customer.last_name || ""}`.trim() || "Cliente"
        : "Cliente sin registrar";

      const payments = (o.payments as { status?: string; method_code?: string }[]) || [];
      const paymentStatus = payments[0]?.status ?? "sin_pago";
      const paymentMethod = o.payment_method_code || payments[0]?.method_code || "N/A";

      return {
        id: o.id,
        orderNumber: o.order_number,
        customerName,
        customerPhone: customer?.whatsapp || customer?.phone || null,
        channel: o.channel || "online",
        total: Number(o.total ?? 0),
        status: o.status,
        paymentStatus,
        paymentMethod,
        createdAt: o.created_at,
      };
    });

    // 8. Movimientos recientes formateados
    const recentMovements: DashboardMetrics["recentMovements"] = rawMovements.map((m) => {
      const variant = m.product_variants as {
        id?: string;
        size?: string | null;
        color?: string | null;
        sku?: string | null;
        products?: { name?: string } | null;
      } | null;

      return {
        id: m.id,
        productName: variant?.products?.name ?? "Producto",
        size: variant?.size ?? null,
        color: variant?.color ?? null,
        sku: variant?.sku ?? null,
        type: m.type,
        quantity: Number(m.quantity ?? 0),
        stockAfter: m.stock_after !== null ? Number(m.stock_after) : null,
        reference: m.reference ?? null,
        note: m.note ?? null,
        createdAt: m.created_at,
      };
    });

    return {
      sales: {
        todayTotal: Number(todayTotal.toFixed(2)),
        todayCount,
        monthTotal: Number(monthTotal.toFixed(2)),
        monthCount,
        totalGenerated: Number(totalGenerated.toFixed(2)),
        totalCollected: Number(totalCollected.toFixed(2)),
        pendingPaymentsCount,
        pendingPaymentsAmount: Number(pendingPaymentsAmount.toFixed(2)),
        pendingOrdersCount,
      },
      inventory: {
        totalUnits,
        totalCostValue: Number(totalCostValue.toFixed(2)),
        totalRetailValue: Number(totalRetailValue.toFixed(2)),
        activeProductsCount,
        outOfStockCount,
        lowStockCount,
      },
      charts: {
        salesEvolution,
        salesByChannel,
        inventoryByCategory,
      },
      recentOrders,
      lowStockItems: lowStockItems.slice(0, 10),
      recentMovements,
    };
  });
