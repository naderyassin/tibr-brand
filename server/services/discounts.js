// Discount engine — the single source of truth for whether a discount applies
// to a cart and how much it's worth. Shared by /api/discounts/validate,
// /api/discounts/automatic, and both checkout paths so none of them can ever
// disagree about the amount. Also holds the admin create/edit sanitize +
// validate for the discounts table.
const { supabase } = require("../db");
const { parsePrice, asIdArray } = require("../lib/parse");

// Builds real, DB-priced cart lines from a raw items array. Used everywhere
// a discount needs to be evaluated against a cart — /api/discounts/validate,
// /api/discounts/automatic, and /api/checkout — so all three price
// identically and none of them trust a client-supplied amount.
const buildCartLines = async (items) => {
  const productIds = [...new Set((items || []).map((i) => i.productId).filter(Boolean))];
  if (productIds.length === 0) return { error: "Your cart is empty." };

  const { data: products, error } = await supabase
    .from("products")
    .select("id, ar_price, en_price")
    .in("id", productIds);

  if (error) return { error: "Failed to load cart products." };

  const productsMap = new Map((products || []).map((p) => [p.id, p]));
  const lines = [];
  for (const item of items) {
    const product = productsMap.get(item.productId);
    if (!product) return { error: `Product not found: ${item.productId}` };
    const qty = Number(item.qty) > 0 ? Number(item.qty) : 1;
    const unitPrice = parsePrice(product.ar_price || product.en_price);
    lines.push({ productId: item.productId, qty, unitPrice, lineTotal: unitPrice * qty });
  }

  const subtotal = lines.reduce((sum, l) => sum + l.lineTotal, 0);
  return { cart: { lines, subtotal } };
};

// Spreads `amount` proportionally across `lines` (weighted by each line's
// share of `poolSubtotal`), aggregating into a productId -> amount map —
// the remainder goes to the last line so the parts always sum exactly to
// `amount`. Shared by the order and product discount classes.
const spreadAcrossLines = (lines, amount, poolSubtotal) => {
  const map = {};
  if (amount <= 0 || poolSubtotal <= 0 || lines.length === 0) return map;
  let remaining = amount;
  lines.forEach((line, i) => {
    const isLast = i === lines.length - 1;
    const share = isLast ? remaining : Math.round((line.lineTotal / poolSubtotal) * amount);
    map[line.productId] = (map[line.productId] || 0) + share;
    remaining -= share;
  });
  return map;
};

const evaluateOrderClass = (discount, cart) => {
  const amount = discount.type === "percentage"
    ? Math.round((cart.subtotal * discount.value) / 100)
    : Math.min(discount.value, cart.subtotal);
  return { line_adjustments: spreadAcrossLines(cart.lines, amount, cart.subtotal), total_amount: amount };
};

const evaluateProductClass = (discount, cart) => {
  const targetLines = discount.applies_to === "all"
    ? cart.lines
    : cart.lines.filter((l) => discount.product_ids.includes(l.productId));

  if (targetLines.length === 0) {
    return { error: "This discount doesn't apply to any items in your cart." };
  }

  const eligibleSubtotal = targetLines.reduce((sum, l) => sum + l.lineTotal, 0);
  const amount = discount.type === "percentage"
    ? Math.round((eligibleSubtotal * discount.value) / 100)
    : Math.min(discount.value, eligibleSubtotal);

  return { line_adjustments: spreadAcrossLines(targetLines, amount, eligibleSubtotal), total_amount: amount };
};

// "Buy X, get Y" — the one class that doesn't fit the shared type/value
// shape. Reserves buy-pool units per product BEFORE computing discountable
// "get" units, so a same-product offer (e.g. buy 2 get 1 free of the exact
// same item) correctly excludes the reserved units from being discounted.
// Discounts the cheapest eligible "get" units first.
const evaluateBuyXGetY = (discount, cart) => {
  const buyPool = discount.buy_applies_to === "all"
    ? cart.lines
    : cart.lines.filter((l) => discount.buy_product_ids.includes(l.productId));

  let numSets = 0;
  if (discount.buy_type === "quantity") {
    const buyQtyAvailable = buyPool.reduce((sum, l) => sum + l.qty, 0);
    numSets = Math.floor(buyQtyAvailable / discount.buy_quantity);
  } else if (discount.buy_type === "amount") {
    // Amount-based triggers are a pure $ threshold check — they don't repeat
    // within one order.
    const buyAmountAvailable = buyPool.reduce((sum, l) => sum + l.lineTotal, 0);
    numSets = buyAmountAvailable >= discount.buy_amount ? 1 : 0;
  }

  if (discount.buy_x_get_y_max_uses_per_order != null) {
    numSets = Math.min(numSets, discount.buy_x_get_y_max_uses_per_order);
  }
  if (numSets <= 0) {
    return { error: "Your cart doesn't meet this offer's requirements yet." };
  }

  // Reserve buy-pool units per product (quantity-trigger only — an
  // amount-trigger doesn't consume units, it's a pure $ threshold).
  const reserved = {};
  if (discount.buy_type === "quantity") {
    let remaining = discount.buy_quantity * numSets;
    for (const line of buyPool) {
      if (remaining <= 0) break;
      const take = Math.min(line.qty, remaining);
      reserved[line.productId] = (reserved[line.productId] || 0) + take;
      remaining -= take;
    }
  }

  // Expand "get" lines into individual priced units, respecting
  // reservations (consumed progressively across lines of the same
  // product), cheapest unit first.
  const units = [];
  for (const line of cart.lines.filter((l) => discount.get_product_ids.includes(l.productId))) {
    const reservedForProduct = reserved[line.productId] || 0;
    const availableQty = Math.max(0, line.qty - reservedForProduct);
    for (let i = 0; i < availableQty; i++) units.push({ productId: line.productId, unitPrice: line.unitPrice });
    reserved[line.productId] = Math.max(0, reservedForProduct - line.qty);
  }
  units.sort((a, b) => a.unitPrice - b.unitPrice);

  const getUnitsEligible = Math.min(discount.get_quantity * numSets, units.length);
  if (getUnitsEligible === 0) {
    return { error: "No eligible items to discount." };
  }

  const line_adjustments = {};
  let total = 0;
  for (const unit of units.slice(0, getUnitsEligible)) {
    const perUnitAmount =
      discount.get_discount_type === "free" ? unit.unitPrice
      : discount.get_discount_type === "percentage" ? Math.round((unit.unitPrice * discount.get_discount_value) / 100)
      : Math.min(discount.get_discount_value, unit.unitPrice);
    line_adjustments[unit.productId] = (line_adjustments[unit.productId] || 0) + perUnitAmount;
    total += perUnitAmount;
  }

  return { line_adjustments, total_amount: total };
};

// Shared eligibility + amount logic for a discount, used by
// /api/discounts/validate, /api/discounts/automatic, and checkout itself so
// none of them can ever disagree about whether a discount still applies.
const evaluateCartDiscount = async (discount, cart, { userId, customerPhone, serviceClient } = {}) => {
  if (!discount.active) return { error: "This discount code is no longer active." };

  const now = new Date();
  if (discount.starts_at && new Date(discount.starts_at) > now) {
    return { error: "This discount code isn't active yet." };
  }
  if (discount.ends_at && new Date(discount.ends_at) < now) {
    return { error: "This discount code has expired." };
  }
  if (discount.usage_limit != null && discount.used_count >= discount.usage_limit) {
    return { error: "This discount code has reached its usage limit." };
  }

  if (discount.one_per_customer && (userId || customerPhone) && serviceClient) {
    let query = serviceClient.from("orders").select("id").eq("discount_id", discount.id).limit(1);
    query = userId ? query.eq("user_id", userId) : query.eq("customer_phone", customerPhone);
    const { data: priorUsage } = await query;
    if (priorUsage && priorUsage.length > 0) {
      return { error: "You've already used this discount." };
    }
  }

  if (discount.min_purchase != null && cart.subtotal < discount.min_purchase) {
    return { error: `This code requires a minimum order of ${discount.min_purchase} EGP.` };
  }

  if (discount.eligibility === "specific_customers") {
    const allowed = Array.isArray(discount.customer_ids) ? discount.customer_ids : [];
    if (!userId || !allowed.includes(userId)) {
      return { error: "This discount isn't available for your account." };
    }
  }

  let outcome;
  if (discount.discount_class === "order") {
    outcome = evaluateOrderClass(discount, cart);
  } else if (discount.discount_class === "product") {
    outcome = evaluateProductClass(discount, cart);
  } else if (discount.discount_class === "shipping") {
    outcome = { line_adjustments: {}, total_amount: 0, free_shipping: true };
  } else if (discount.discount_class === "buy_x_get_y") {
    outcome = evaluateBuyXGetY(discount, cart);
  } else {
    return { error: "Unknown discount type." };
  }
  if (outcome.error) return outcome;

  return {
    result: {
      id: discount.id,
      code: discount.code,
      title: discount.title,
      method: discount.method,
      discount_class: discount.discount_class,
      free_shipping: !!outcome.free_shipping,
      total_amount: outcome.total_amount,
      line_adjustments: outcome.line_adjustments
    }
  };
};

// Spreads a discount's productId -> amount map across the actual order rows
// being inserted (a product can appear in multiple rows via different
// sizes) — generalizes the single-amount proportional spread used before
// per-class computation existed. For an 'order'-class discount the map
// covers every product in the cart, so this collapses to a plain
// order-total-weighted spread across all rows.
const applyLineAdjustments = (orderRows, lineAdjustments) => {
  const rowsByProduct = {};
  orderRows.forEach((row) => {
    (rowsByProduct[row.product_id] ||= []).push(row);
  });

  for (const [productId, amount] of Object.entries(lineAdjustments || {})) {
    const rows = rowsByProduct[productId];
    if (!rows || rows.length === 0 || amount <= 0) continue;
    const matchingSubtotal = rows.reduce((sum, r) => sum + r.order_total, 0);
    if (matchingSubtotal <= 0) continue;

    let remaining = amount;
    rows.forEach((row, i) => {
      const isLast = i === rows.length - 1;
      const share = isLast ? remaining : Math.round((row.order_total / matchingSubtotal) * amount);
      row.discount_amount = share;
      row.order_total = Math.max(0, row.order_total - share);
      remaining -= share;
    });
  }
};

// Evaluates every candidate discount against the cart and returns the
// single best-value eligible result (or null) — used both by the
// /api/discounts/automatic preview and checkout's no-code branch, so a
// shopper never sees a preview that checkout wouldn't actually honor.
// Ties broken by earliest created_at for a deterministic pick.
const pickBestDiscount = async (candidates, cart, ctx) => {
  let bestResult = null;
  let bestCreatedAt = null;

  for (const discount of candidates) {
    const outcome = await evaluateCartDiscount(discount, cart, ctx);
    if (outcome.error) continue;

    const amount = outcome.result.total_amount;
    const better =
      !bestResult ||
      amount > bestResult.total_amount ||
      (amount === bestResult.total_amount && discount.created_at < bestCreatedAt);

    if (better) {
      bestResult = outcome.result;
      bestCreatedAt = discount.created_at;
    }
  }

  return bestResult;
};

// ── Admin create/edit sanitize + validate ────────────────────────────────────

const DISCOUNT_CLASSES = new Set(["order", "product", "buy_x_get_y", "shipping"]);
const DISCOUNT_VALUE_TYPES = new Set(["percentage", "fixed"]);
const GET_DISCOUNT_TYPES = new Set(["percentage", "fixed", "free"]);

// Class-aware: which fields matter depends on discount_class/method. Always
// returns every column (unused ones reset to their neutral default) so an
// edit that switches, say, `applies_to` back to "all" clears out a stale
// product_ids list rather than leaving it behind.
const sanitizeDiscountPayload = (body) => {
  const discount_class = DISCOUNT_CLASSES.has(body.discount_class) ? body.discount_class : "order";
  const method = body.method === "automatic" ? "automatic" : "code";
  const eligibility = body.eligibility === "specific_customers" ? "specific_customers" : "all";
  const isValueClass = discount_class === "order" || discount_class === "product";

  const d = {
    discount_class,
    method,
    code: method === "code" ? String(body.code || "").trim().toUpperCase() : null,
    title: method === "automatic" ? String(body.title || "").trim() : null,
    type: isValueClass && DISCOUNT_VALUE_TYPES.has(body.type) ? body.type : null,
    value: isValueClass ? Number(body.value) || 0 : 0,
    min_purchase: body.min_purchase != null && body.min_purchase !== "" ? Number(body.min_purchase) : null,
    usage_limit: body.usage_limit != null && body.usage_limit !== "" ? parseInt(body.usage_limit, 10) : null,
    one_per_customer: !!body.one_per_customer,
    starts_at: body.starts_at || new Date().toISOString(),
    ends_at: body.ends_at || null,
    active: body.active !== false,
    eligibility,
    customer_ids: eligibility === "specific_customers" ? asIdArray(body.customer_ids) : [],
    applies_to: discount_class === "product" && body.applies_to === "specific_products" ? "specific_products" : "all",
    product_ids: [],
    buy_type: null,
    buy_quantity: null,
    buy_amount: null,
    buy_applies_to: "all",
    buy_product_ids: [],
    get_quantity: null,
    get_product_ids: [],
    get_discount_type: null,
    get_discount_value: 0,
    buy_x_get_y_max_uses_per_order: null
  };

  if (discount_class === "product" && d.applies_to === "specific_products") {
    d.product_ids = asIdArray(body.product_ids);
  }

  if (discount_class === "buy_x_get_y") {
    d.buy_type = body.buy_type === "amount" ? "amount" : "quantity";
    d.buy_quantity = d.buy_type === "quantity" ? parseInt(body.buy_quantity, 10) || null : null;
    d.buy_amount = d.buy_type === "amount" ? Number(body.buy_amount) || null : null;
    d.buy_applies_to = body.buy_applies_to === "specific_products" ? "specific_products" : "all";
    d.buy_product_ids = d.buy_applies_to === "specific_products" ? asIdArray(body.buy_product_ids) : [];
    d.get_quantity = parseInt(body.get_quantity, 10) || null;
    d.get_product_ids = asIdArray(body.get_product_ids);
    d.get_discount_type = GET_DISCOUNT_TYPES.has(body.get_discount_type) ? body.get_discount_type : null;
    d.get_discount_value = d.get_discount_type === "free" ? 0 : Number(body.get_discount_value) || 0;
    d.buy_x_get_y_max_uses_per_order =
      body.buy_x_get_y_max_uses_per_order != null && body.buy_x_get_y_max_uses_per_order !== ""
        ? parseInt(body.buy_x_get_y_max_uses_per_order, 10)
        : null;
  }

  return d;
};

const validateDiscountPayload = (d) => {
  if (d.method === "code" && !d.code) return "Discount code is required.";
  if (d.method === "automatic" && !d.title) return "Title is required for an automatic discount.";

  if (d.discount_class === "order" || d.discount_class === "product") {
    if (!d.type) return "Select a valid discount type.";
    if (d.type === "percentage" && (d.value <= 0 || d.value > 100)) {
      return "Percentage discounts must be between 1 and 100.";
    }
    if (d.type === "fixed" && d.value <= 0) {
      return "Fixed discount amount must be greater than 0.";
    }
  }

  if (d.discount_class === "product" && d.applies_to === "specific_products" && d.product_ids.length === 0) {
    return "Select at least one product.";
  }

  if (d.discount_class === "buy_x_get_y") {
    if (d.buy_type === "quantity" && (!d.buy_quantity || d.buy_quantity <= 0)) {
      return "Enter a minimum quantity for the buy condition.";
    }
    if (d.buy_type === "amount" && (!d.buy_amount || d.buy_amount <= 0)) {
      return "Enter a minimum purchase amount for the buy condition.";
    }
    if (d.buy_applies_to === "specific_products" && d.buy_product_ids.length === 0) {
      return "Select at least one product customers must buy.";
    }
    if (!d.get_quantity || d.get_quantity <= 0) {
      return "Enter how many items the customer gets.";
    }
    if (d.get_product_ids.length === 0) {
      return "Select at least one product the customer gets.";
    }
    if (!d.get_discount_type) return "Select the discount applied to the items customers get.";
    if (d.get_discount_type === "percentage" && (d.get_discount_value <= 0 || d.get_discount_value > 100)) {
      return "Percentage must be between 1 and 100.";
    }
    if (d.get_discount_type === "fixed" && d.get_discount_value <= 0) {
      return "Amount off must be greater than 0.";
    }
    if (d.buy_x_get_y_max_uses_per_order != null && d.buy_x_get_y_max_uses_per_order <= 0) {
      return "Max uses per order must be greater than 0.";
    }
  }

  if (d.eligibility === "specific_customers" && d.customer_ids.length === 0) {
    return "Select at least one customer.";
  }

  if (d.min_purchase != null && d.min_purchase < 0) return "Minimum purchase can't be negative.";
  if (d.usage_limit != null && d.usage_limit <= 0) return "Usage limit must be greater than 0.";
  if (d.ends_at && new Date(d.ends_at) <= new Date(d.starts_at)) {
    return "End date must be after the start date.";
  }
  return null;
};

module.exports = {
  buildCartLines,
  evaluateCartDiscount,
  applyLineAdjustments,
  pickBestDiscount,
  sanitizeDiscountPayload,
  validateDiscountPayload,
};
