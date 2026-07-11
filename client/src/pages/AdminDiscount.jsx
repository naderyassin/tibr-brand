import { useEffect, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/stores/auth";
import { adminGetDiscount, adminCreateDiscount, adminUpdateDiscount } from "@/lib/api";
import { useToast } from "@/components/ui/Toast";
import ProductPicker from "@/components/admin/ProductPicker";
import CustomerPicker from "@/components/admin/CustomerPicker";

const DISCOUNT_CLASSES = new Set(["order", "product", "buy_x_get_y", "shipping"]);
const CLASS_LABEL = {
  order: "Amount off order",
  product: "Amount off products",
  buy_x_get_y: "Buy X get Y",
  shipping: "Free shipping",
};

const EMPTY_FORM = {
  method: "code",
  code: "",
  title: "",
  type: "percentage",
  value: "",
  applies_to: "all",
  product_ids: [],
  buy_type: "quantity",
  buy_quantity: "",
  buy_amount: "",
  buy_applies_to: "all",
  buy_product_ids: [],
  get_quantity: "",
  get_product_ids: [],
  get_discount_type: "percentage",
  get_discount_value: "",
  buy_x_get_y_max_uses_per_order: "",
  eligibility: "all",
  customer_ids: [],
  min_purchase: "",
  usage_limit: "",
  one_per_customer: false,
  starts_at: "",
  ends_at: "",
  active: true,
};

const toLocalInput = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const randomCode = () => {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 8; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
};

const Chevron = () => (
  <svg className="select-field__chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <path d="m6 9 6 6 6-6" />
  </svg>
);

export default function AdminDiscount() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const isEdit = !!id;
  const { token } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  const classFromQuery = searchParams.get("class");
  const [discountClass, setDiscountClass] = useState(
    !isEdit && DISCOUNT_CLASSES.has(classFromQuery) ? classFromQuery : null
  );
  const [form, setForm] = useState(EMPTY_FORM);

  const { data, isLoading: loadingRecord } = useQuery({
    queryKey: ["admin-discount", id, token],
    queryFn: () => adminGetDiscount(id, token),
    enabled: !!token && isEdit,
  });

  // Create mode only works via the type-selection modal, which always sets
  // ?class=. Anything else (direct URL, stale bookmark) bounces to the list.
  useEffect(() => {
    if (!isEdit && !DISCOUNT_CLASSES.has(classFromQuery)) {
      navigate("/admin/discounts", { replace: true });
    }
  }, [isEdit, classFromQuery, navigate]);

  useEffect(() => {
    if (data?.data) {
      const d = data.data;
      setDiscountClass(d.discount_class);
      setForm({
        method: d.method || "code",
        code: d.code || "",
        title: d.title || "",
        type: d.type || "percentage",
        value: d.value ?? "",
        applies_to: d.applies_to || "all",
        product_ids: Array.isArray(d.product_ids) ? d.product_ids : [],
        buy_type: d.buy_type || "quantity",
        buy_quantity: d.buy_quantity ?? "",
        buy_amount: d.buy_amount ?? "",
        buy_applies_to: d.buy_applies_to || "all",
        buy_product_ids: Array.isArray(d.buy_product_ids) ? d.buy_product_ids : [],
        get_quantity: d.get_quantity ?? "",
        get_product_ids: Array.isArray(d.get_product_ids) ? d.get_product_ids : [],
        get_discount_type: d.get_discount_type || "percentage",
        get_discount_value: d.get_discount_value ?? "",
        buy_x_get_y_max_uses_per_order: d.buy_x_get_y_max_uses_per_order ?? "",
        eligibility: d.eligibility || "all",
        customer_ids: Array.isArray(d.customer_ids) ? d.customer_ids : [],
        min_purchase: d.min_purchase ?? "",
        usage_limit: d.usage_limit ?? "",
        one_per_customer: !!d.one_per_customer,
        starts_at: toLocalInput(d.starts_at),
        ends_at: toLocalInput(d.ends_at),
        active: d.active !== false,
      });
    }
  }, [data]);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  const setChecked = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.checked }));
  const setField = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  const { mutate: createDiscount, isPending: creating } = useMutation({
    mutationFn: (body) => adminCreateDiscount(body, token),
    onSuccess: () => { toast("Discount created!"); navigate("/admin/discounts"); },
    onError: (err) => toast(err.message || "Failed to create discount"),
  });

  const { mutate: updateDiscount, isPending: updating } = useMutation({
    mutationFn: (body) => adminUpdateDiscount(id, body, token),
    onSuccess: () => { toast("Discount updated!"); navigate("/admin/discounts"); },
    onError: (err) => toast(err.message || "Failed to update discount"),
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (form.method === "code" && !form.code.trim()) {
      toast("Discount code is required.");
      return;
    }
    if (form.method === "automatic" && !form.title.trim()) {
      toast("Title is required for an automatic discount.");
      return;
    }

    const body = {
      discount_class: discountClass,
      method: form.method,
      code: form.method === "code" ? form.code.trim() : null,
      title: form.method === "automatic" ? form.title.trim() : null,
      type: form.type,
      value: Number(form.value) || 0,
      applies_to: form.applies_to,
      product_ids: form.product_ids,
      buy_type: form.buy_type,
      buy_quantity: form.buy_quantity !== "" ? Number(form.buy_quantity) : null,
      buy_amount: form.buy_amount !== "" ? Number(form.buy_amount) : null,
      buy_applies_to: form.buy_applies_to,
      buy_product_ids: form.buy_product_ids,
      get_quantity: form.get_quantity !== "" ? Number(form.get_quantity) : null,
      get_product_ids: form.get_product_ids,
      get_discount_type: form.get_discount_type,
      get_discount_value: Number(form.get_discount_value) || 0,
      buy_x_get_y_max_uses_per_order:
        form.buy_x_get_y_max_uses_per_order !== "" ? Number(form.buy_x_get_y_max_uses_per_order) : null,
      eligibility: form.eligibility,
      customer_ids: form.customer_ids,
      min_purchase: form.min_purchase !== "" ? Number(form.min_purchase) : null,
      usage_limit: form.usage_limit !== "" ? Number(form.usage_limit) : null,
      one_per_customer: form.one_per_customer,
      starts_at: form.starts_at ? new Date(form.starts_at).toISOString() : new Date().toISOString(),
      ends_at: form.ends_at ? new Date(form.ends_at).toISOString() : null,
      active: form.active,
    };

    if (isEdit) updateDiscount(body);
    else createDiscount(body);
  };

  const isPending = creating || updating;

  if (!isEdit && !discountClass) return null; // redirecting to the list
  if (isEdit && loadingRecord) {
    return (
      <div className="admin-content">
        <p style={{ color: "var(--muted)" }}>Loading discount…</p>
      </div>
    );
  }

  const isValueClass = discountClass === "order" || discountClass === "product";

  return (
    <div className="admin-content">
      <header className="admin-detail-head">
        <Link className="admin-back-link" to="/admin/discounts">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
            <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Discounts
        </Link>
        <h1 className="page-head__title">{isEdit ? "Edit discount" : "Create discount"}</h1>
        <p style={{ color: "var(--muted)", fontSize: "var(--fs-sm)" }}>{CLASS_LABEL[discountClass]}</p>
      </header>

      <form onSubmit={handleSubmit} noValidate>
        {/* Method */}
        <div className="admin-card">
          <p className="admin-card__title">Method</p>
          <div className="admin-form-grid">
            <div className="field field--full">
              <div className="method-toggle" role="radiogroup" aria-label="Method">
                <button
                  type="button"
                  className={`method-toggle__opt${form.method === "code" ? " is-active" : ""}`}
                  onClick={() => setField("method", "code")}
                >
                  Discount code
                </button>
                <button
                  type="button"
                  className={`method-toggle__opt${form.method === "automatic" ? " is-active" : ""}`}
                  onClick={() => setField("method", "automatic")}
                >
                  Automatic discount
                </button>
              </div>
            </div>

            {form.method === "code" ? (
              <div className="field field--full">
                <label className="field__label" htmlFor="d-code">
                  Code <span className="field__req">*</span>
                </label>
                <div style={{ display: "flex", gap: "var(--sp-2)" }}>
                  <input
                    id="d-code"
                    className="input"
                    style={{ textTransform: "uppercase" }}
                    value={form.code}
                    onChange={(e) => setField("code", e.target.value.toUpperCase())}
                    placeholder="SUMMER20"
                    required
                  />
                  <button type="button" className="btn btn--secondary" onClick={() => setField("code", randomCode())}>
                    Generate
                  </button>
                </div>
                <p className="field__hint">Customers enter this code at checkout.</p>
              </div>
            ) : (
              <div className="field field--full">
                <label className="field__label" htmlFor="d-title">
                  Title <span className="field__req">*</span>
                </label>
                <input id="d-title" className="input" value={form.title} onChange={set("title")} placeholder="Summer sale" required />
                <p className="field__hint">Customers see this in their cart and at checkout — no code to enter.</p>
              </div>
            )}
          </div>
        </div>

        {/* Discount value — order / product only */}
        {isValueClass && (
          <div className="admin-card">
            <p className="admin-card__title">Discount value</p>
            <div className="admin-form-grid">
              <div className="field">
                <label className="field__label" htmlFor="d-type">Type</label>
                <div className="select-field">
                  <select id="d-type" className="select" value={form.type} onChange={set("type")}>
                    <option value="percentage">Percentage</option>
                    <option value="fixed">Fixed amount</option>
                  </select>
                  <Chevron />
                </div>
              </div>
              <div className="field">
                <label className="field__label" htmlFor="d-value">
                  Value <span className="field__req">*</span>
                </label>
                <input
                  id="d-value"
                  className="input"
                  type="number"
                  min="0"
                  max={form.type === "percentage" ? 100 : undefined}
                  step="1"
                  value={form.value}
                  onChange={set("value")}
                  placeholder={form.type === "percentage" ? "20" : "100"}
                  required
                />
                <p className="field__hint">{form.type === "percentage" ? "Percent off (1–100)" : "EGP off"}</p>
              </div>
            </div>
          </div>
        )}

        {/* Applies to — product only */}
        {discountClass === "product" && (
          <div className="admin-card">
            <p className="admin-card__title">Applies to</p>
            <div className="admin-form-grid">
              <div className="field field--full">
                <label className="field field--checkbox">
                  <input type="radio" name="applies_to" checked={form.applies_to === "all"} onChange={() => setField("applies_to", "all")} />
                  <span>All products</span>
                </label>
                <label className="field field--checkbox">
                  <input
                    type="radio"
                    name="applies_to"
                    checked={form.applies_to === "specific_products"}
                    onChange={() => setField("applies_to", "specific_products")}
                  />
                  <span>Specific products</span>
                </label>
              </div>
              {form.applies_to === "specific_products" && (
                <div className="field field--full">
                  <ProductPicker selectedIds={form.product_ids} onChange={(ids) => setField("product_ids", ids)} token={token} />
                </div>
              )}
            </div>
          </div>
        )}

        {/* Buy X Get Y — two cards */}
        {discountClass === "buy_x_get_y" && (
          <>
            <div className="admin-card">
              <p className="admin-card__title">Customer buys</p>
              <div className="admin-form-grid">
                <div className="field field--full">
                  <label className="field field--checkbox">
                    <input type="radio" name="buy_type" checked={form.buy_type === "quantity"} onChange={() => setField("buy_type", "quantity")} />
                    <span>Minimum quantity of items</span>
                  </label>
                  {form.buy_type === "quantity" && (
                    <div className="field" style={{ marginInlineStart: "1.9rem", maxWidth: "12rem" }}>
                      <label className="field__label" htmlFor="d-buy-qty">Quantity</label>
                      <input id="d-buy-qty" className="input" type="number" min="1" step="1" value={form.buy_quantity} onChange={set("buy_quantity")} required />
                    </div>
                  )}
                  <label className="field field--checkbox">
                    <input type="radio" name="buy_type" checked={form.buy_type === "amount"} onChange={() => setField("buy_type", "amount")} />
                    <span>Minimum purchase amount</span>
                  </label>
                  {form.buy_type === "amount" && (
                    <div className="field" style={{ marginInlineStart: "1.9rem", maxWidth: "12rem" }}>
                      <label className="field__label" htmlFor="d-buy-amt">Amount (EGP)</label>
                      <input id="d-buy-amt" className="input" type="number" min="1" step="1" value={form.buy_amount} onChange={set("buy_amount")} required />
                    </div>
                  )}
                </div>

                <div className="field field--full" style={{ marginBlockStart: "var(--sp-2)" }}>
                  <label className="field field--checkbox">
                    <input type="radio" name="buy_applies_to" checked={form.buy_applies_to === "all"} onChange={() => setField("buy_applies_to", "all")} />
                    <span>Any items</span>
                  </label>
                  <label className="field field--checkbox">
                    <input
                      type="radio"
                      name="buy_applies_to"
                      checked={form.buy_applies_to === "specific_products"}
                      onChange={() => setField("buy_applies_to", "specific_products")}
                    />
                    <span>Specific products</span>
                  </label>
                </div>
                {form.buy_applies_to === "specific_products" && (
                  <div className="field field--full">
                    <ProductPicker selectedIds={form.buy_product_ids} onChange={(ids) => setField("buy_product_ids", ids)} token={token} />
                  </div>
                )}
              </div>
            </div>

            <div className="admin-card">
              <p className="admin-card__title">Customer gets</p>
              <div className="admin-form-grid">
                <div className="field">
                  <label className="field__label" htmlFor="d-get-qty">
                    Quantity <span className="field__req">*</span>
                  </label>
                  <input id="d-get-qty" className="input" type="number" min="1" step="1" value={form.get_quantity} onChange={set("get_quantity")} required />
                </div>

                <div className="field field--full">
                  <label className="field__label">
                    Items <span className="field__req">*</span>
                  </label>
                  <ProductPicker selectedIds={form.get_product_ids} onChange={(ids) => setField("get_product_ids", ids)} token={token} />
                </div>

                <div className="field">
                  <label className="field__label" htmlFor="d-get-type">At a discounted value</label>
                  <div className="select-field">
                    <select id="d-get-type" className="select" value={form.get_discount_type} onChange={set("get_discount_type")}>
                      <option value="percentage">Percentage</option>
                      <option value="fixed">Amount off each</option>
                      <option value="free">Free</option>
                    </select>
                    <Chevron />
                  </div>
                </div>
                {form.get_discount_type !== "free" && (
                  <div className="field">
                    <label className="field__label" htmlFor="d-get-value">
                      Value <span className="field__req">*</span>
                    </label>
                    <input
                      id="d-get-value"
                      className="input"
                      type="number"
                      min="0"
                      max={form.get_discount_type === "percentage" ? 100 : undefined}
                      step="1"
                      value={form.get_discount_value}
                      onChange={set("get_discount_value")}
                      required
                    />
                  </div>
                )}

                <div className="field field--full">
                  <label className="field__label" htmlFor="d-max-uses">Limit number of uses per order</label>
                  <input
                    id="d-max-uses"
                    className="input"
                    type="number"
                    min="1"
                    step="1"
                    style={{ maxWidth: "12rem" }}
                    value={form.buy_x_get_y_max_uses_per_order}
                    onChange={set("buy_x_get_y_max_uses_per_order")}
                    placeholder="Unlimited"
                  />
                  <p className="field__hint">Leave blank for unlimited repeats within one order.</p>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Eligibility — every class */}
        <div className="admin-card">
          <p className="admin-card__title">Eligibility</p>
          <div className="admin-form-grid">
            <div className="field field--full">
              <label className="field field--checkbox">
                <input type="radio" name="eligibility" checked={form.eligibility === "all"} onChange={() => setField("eligibility", "all")} />
                <span>All customers</span>
              </label>
              <label className="field field--checkbox">
                <input
                  type="radio"
                  name="eligibility"
                  checked={form.eligibility === "specific_customers"}
                  onChange={() => setField("eligibility", "specific_customers")}
                />
                <span>Specific customers</span>
              </label>
            </div>
            {form.eligibility === "specific_customers" && (
              <div className="field field--full">
                <CustomerPicker selectedIds={form.customer_ids} onChange={(ids) => setField("customer_ids", ids)} token={token} />
              </div>
            )}
          </div>
        </div>

        {/* Minimum purchase requirement */}
        <div className="admin-card">
          <p className="admin-card__title">Minimum purchase requirement</p>
          <div className="admin-form-grid">
            <div className="field">
              <label className="field__label" htmlFor="d-min">Minimum order amount (EGP)</label>
              <input id="d-min" className="input" type="number" min="0" step="1" value={form.min_purchase} onChange={set("min_purchase")} placeholder="No minimum" />
              <p className="field__hint">Leave blank for no minimum.</p>
            </div>
          </div>
        </div>

        {/* Usage limits */}
        <div className="admin-card">
          <p className="admin-card__title">Usage limits</p>
          <div className="admin-form-grid">
            <div className="field">
              <label className="field__label" htmlFor="d-limit">Total uses</label>
              <input id="d-limit" className="input" type="number" min="1" step="1" value={form.usage_limit} onChange={set("usage_limit")} placeholder="Unlimited" />
              <p className="field__hint">Leave blank for unlimited uses.</p>
            </div>
            <label className="field field--checkbox">
              <input type="checkbox" checked={form.one_per_customer} onChange={setChecked("one_per_customer")} />
              <span>Limit to one use per customer</span>
            </label>
          </div>
        </div>

        {/* Active dates */}
        <div className="admin-card">
          <p className="admin-card__title">Active dates</p>
          <div className="admin-form-grid">
            <div className="field">
              <label className="field__label" htmlFor="d-start">Start date</label>
              <input id="d-start" className="input" type="datetime-local" value={form.starts_at} onChange={set("starts_at")} />
              <p className="field__hint">Defaults to now if left blank.</p>
            </div>
            <div className="field">
              <label className="field__label" htmlFor="d-end">End date</label>
              <input id="d-end" className="input" type="datetime-local" value={form.ends_at} onChange={set("ends_at")} />
              <p className="field__hint">Leave blank to never expire.</p>
            </div>
            <label className="field field--checkbox">
              <input type="checkbox" checked={form.active} onChange={setChecked("active")} />
              <span>Active</span>
            </label>
          </div>
        </div>

        <div className="admin-form-actions">
          <button className={`btn btn--primary${isPending ? " is-loading" : ""}`} type="submit" disabled={isPending}>
            {isPending ? "" : isEdit ? "Save changes" : "Create discount"}
          </button>
          <Link className="btn btn--ghost" to="/admin/discounts">Cancel</Link>
        </div>
      </form>
    </div>
  );
}
