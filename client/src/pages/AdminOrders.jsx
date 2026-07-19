import { useState, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/stores/auth";
import { adminGetOrders } from "@/lib/api";
import { StatusBadge, STATUSES } from "@/components/admin/StatusBadge";

const PAYMENT_LABELS = {
  cash_on_delivery: "Cash on Delivery (الدفع عند الاستلام)",
  vodafone_cash: "Vodafone Cash (فودافون كاش)",
  instapay: "InstaPay (انستا باي)"
};

const getWhatsAppLink = (phone, name, orderId) => {
  if (!phone) return "";
  let clean = phone.replace(/\D/g, "");
  // Egyptian numbers start with 01...
  if (clean.startsWith("0")) clean = clean.substring(1);
  if (!clean.startsWith("20")) clean = "20" + clean;
  const msg = `مرحباً يا ${name || "عميلنا العزيز"}، بخصوص طلبك رقم ${orderId.slice(0, 8)} من تبر (TIBR)...`;
  return `https://wa.me/${clean}?text=${encodeURIComponent(msg)}`;
};

export default function AdminOrders() {
  const { token } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const statusParam = searchParams.get("status");
  const statusFilter = STATUSES.includes(statusParam) ? statusParam : "all";
  const setStatusFilter = (key) =>
    setSearchParams(key === "all" ? {} : { status: key });
  const [orderSearch, setOrderSearch] = useState("");
  const [activeOrderId, setActiveOrderId] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-orders", token],
    queryFn: () => adminGetOrders(token),
    enabled: !!token,
  });

  const orders = data?.data ?? [];

  const counts = {
    total: orders.length,
    pending: orders.filter((o) => o.status === "pending").length,
    confirmed: orders.filter((o) => o.status === "confirmed").length,
    shipped: orders.filter((o) => o.status === "shipped").length,
    delivered: orders.filter((o) => o.status === "delivered").length,
    cancelled: orders.filter((o) => o.status === "cancelled").length,
  };

  const visibleOrders = orders
    .filter((o) => statusFilter === "all" || o.status === statusFilter)
    .filter((o) => {
      if (!orderSearch) return true;
      const q = orderSearch.toLowerCase();
      return (
        o.customer_name?.toLowerCase().includes(q) ||
        o.customer_phone?.includes(q) ||
        o.id?.toLowerCase().includes(q) ||
        o.order_items?.some((i) => i.name_snapshot?.toLowerCase().includes(q))
      );
    });

  const selectedOrder = useMemo(() => {
    return activeOrderId ? orders.find((o) => o.id === activeOrderId) : null;
  }, [activeOrderId, orders]);

  const FILTER_OPTIONS = [
    { key: "all",       label: "All",       count: counts.total,      color: "var(--ink)" },
    { key: "pending",   label: "Pending",   count: counts.pending,    color: "var(--warning)" },
    { key: "confirmed", label: "Confirmed", count: counts.confirmed,  color: "var(--info)" },
    { key: "shipped",   label: "Shipped",   count: counts.shipped,    color: "var(--gold)" },
    { key: "delivered", label: "Delivered", count: counts.delivered,  color: "var(--success)" },
    { key: "cancelled", label: "Cancelled", count: counts.cancelled,  color: "var(--danger)" },
  ];

  // Steps helper for the order workflow stepper in the drawer
  const steps = ["pending", "confirmed", "shipped", "delivered"];
  const currentStepIdx = selectedOrder ? steps.indexOf(selectedOrder.status) : -1;

  return (
    <div className="admin-content" style={{ position: "relative" }}>
      <header className="page-head page-head--compact">
        <h1 className="page-head__title">Orders</h1>
      </header>

      {/* Interactive stats cards grid for order states */}
      <div className="admin-stat-filter-grid" role="group" aria-label="Filter by status">
        {FILTER_OPTIONS.map(({ key, label, count, color }) => (
          <button
            key={key}
            type="button"
            className={`stat-filter-card${statusFilter === key ? " is-active" : ""}`}
            onClick={() => setStatusFilter(key)}
          >
            <span className="stat-filter-card__value" style={{ color }}>{count}</span>
            <span className="stat-filter-card__label">{label}</span>
          </button>
        ))}
      </div>

      <div className="admin-card">
        <div className="admin-search-toolbar">
          <div className="admin-search">
            <svg className="admin-search__icon" width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden="true">
              <circle cx="6.5" cy="6.5" r="4" stroke="currentColor" strokeWidth="1.4"/>
              <path d="M9.5 9.5L12.5 12.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
            </svg>
            <input
              className="admin-search__input"
              type="search"
              placeholder="Search name, phone, or order ID…"
              value={orderSearch}
              onChange={(e) => setOrderSearch(e.target.value)}
            />
            {orderSearch && (
              <button
                className="admin-search__clear"
                type="button"
                onClick={() => setOrderSearch("")}
                aria-label="Clear search"
              >
                ×
              </button>
            )}
          </div>
        </div>

        {isLoading ? (
          <div className="table-wrap">
            <table className="table" aria-label="Orders loading">
              <thead>
                <tr>
                  <th>Order</th><th>Customer</th><th>Product</th>
                  <th>Status</th><th>Total</th><th>Date</th>
                </tr>
              </thead>
              <tbody>
                {[...Array(5)].map((_, i) => (
                  <tr key={i} className="skel-row">
                    <td><span className="skel skel--id" /></td>
                    <td>
                      <span className="skel skel--name" />
                      <span className="skel skel--phone" />
                    </td>
                    <td><span className="skel skel--product" /></td>
                    <td><span className="skel skel--badge" /></td>
                    <td><span className="skel skel--price" /></td>
                    <td><span className="skel skel--date" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : visibleOrders.length === 0 ? (
          <div className="admin-empty-state">
            <svg width="36" height="36" viewBox="0 0 36 36" fill="none" aria-hidden="true">
              <rect x="6" y="3" width="24" height="30" rx="2" stroke="currentColor" strokeWidth="1.4"/>
              <path d="M11 12h14M11 18h14M11 24h8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
            </svg>
            <p className="admin-empty-state__title">No orders found</p>
            <p className="admin-empty-state__sub">
              {statusFilter !== "all" || orderSearch
                ? "Try a different filter or search term"
                : "Orders will appear here once customers check out"}
            </p>
            {(statusFilter !== "all" || orderSearch) && (
              <button
                className="btn btn--secondary"
                style={{ marginBlockStart: "var(--sp-4)" }}
                onClick={() => { setStatusFilter("all"); setOrderSearch(""); }}
              >
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <div className="table-wrap">
            <table className="table admin-clickable-table" aria-label="Orders">
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Customer</th>
                  <th>Product</th>
                  <th>Status</th>
                  <th>Total</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {visibleOrders.map((o) => (
                  <tr
                    key={o.id}
                    className="admin-row-link"
                    onClick={(e) => {
                      if (e.target.closest(".status-badge")) return;
                      setActiveOrderId(o.id);
                    }}
                  >
                    <td>
                      <span className="order-id">{o.id?.slice(0, 8)}</span>
                    </td>
                    <td>
                      <div className="order-cell">
                        <span className="order-cell__primary">{o.customer_name || "—"}</span>
                        {o.customer_phone && (
                          <span className="order-cell__secondary">{o.customer_phone}</span>
                        )}
                      </div>
                    </td>
                    <td>
                      <div className="order-cell">
                        <span className="order-cell__primary">
                          {o.order_items?.length
                            ? o.order_items.map((i) => i.name_snapshot).join(", ")
                            : "—"}
                        </span>
                        {o.order_items?.length > 0 && (
                          <span className="order-cell__secondary">
                            {o.order_items
                              .map((i) => [i.size_snapshot, i.qty > 1 ? `×${i.qty}` : null].filter(Boolean).join(" "))
                              .filter(Boolean)
                              .join(" · ")}
                          </span>
                        )}
                      </div>
                    </td>
                    <td>
                      <StatusBadge orderId={o.id} current={o.status} token={token} />
                    </td>
                    <td className="num order-total-cell">
                      {o.total ? `${Number(o.total).toLocaleString()} EGP` : "—"}
                    </td>
                    <td className="order-date-cell">
                      {new Date(o.created_at).toLocaleDateString("en-GB", {
                        day: "numeric", month: "short", year: "numeric",
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Slide-Out Order Detail Drawer ── */}
      {selectedOrder && (
        <>
          <div className="order-drawer-scrim" onClick={() => setActiveOrderId(null)} />
          <div className="order-drawer" role="dialog" aria-modal="true" aria-labelledby="drawer-title">
            <header className="order-drawer__head">
              <h2 className="order-drawer__title" id="drawer-title">
                Order #{selectedOrder.id?.slice(0, 8)}
              </h2>
              <button
                type="button"
                className="btn btn--secondary"
                style={{ minBlockSize: "2rem", paddingInline: "var(--sp-3)" }}
                onClick={() => setActiveOrderId(null)}
              >
                Close
              </button>
            </header>

            <div className="order-drawer__body">
              {/* Stepper Progress Timeline */}
              {selectedOrder.status !== "cancelled" ? (
                <div className="order-stepper">
                  {steps.map((st, idx) => {
                    const isActive = st === selectedOrder.status;
                    const isCompleted = currentStepIdx >= idx;
                    return (
                      <div
                        key={st}
                        className={`order-step${isActive ? " is-active" : ""}${isCompleted && !isActive ? " is-completed" : ""}`}
                      >
                        <div className="order-step__dot">
                          {isCompleted && !isActive ? "✓" : idx + 1}
                        </div>
                        <span className="order-step__label">{st}</span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="admin-empty-state" style={{ paddingBlock: "12px", border: "1px dashed var(--danger)", background: "var(--danger-fill)" }}>
                  <p className="admin-empty-state__title" style={{ color: "var(--danger)", fontSize: "var(--fs-sm)", margin: 0 }}>
                    This order has been cancelled.
                  </p>
                </div>
              )}

              {/* Status Update dropdown */}
              <div className="order-drawer-section">
                <h3 className="order-drawer-section__title">Actions</h3>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "4px" }}>
                  <span style={{ fontSize: "var(--fs-sm)", color: "var(--ink-2)" }}>Update Status:</span>
                  <StatusBadge orderId={selectedOrder.id} current={selectedOrder.status} token={token} />
                </div>
              </div>

              {/* Customer information */}
              <div className="order-drawer-section">
                <h3 className="order-drawer-section__title">Customer Details</h3>
                <dl className="admin-def-list" style={{ marginTop: "4px" }}>
                  <div className="admin-def-list__row">
                    <dt>Name</dt>
                    <dd>{selectedOrder.customer_name || "—"}</dd>
                  </div>
                  <div className="admin-def-list__row">
                    <dt>Phone</dt>
                    <dd>{selectedOrder.customer_phone || "—"}</dd>
                  </div>
                  <div className="admin-def-list__row">
                    <dt>Address</dt>
                    <dd>{selectedOrder.customer_address || "—"}</dd>
                  </div>
                </dl>
                {selectedOrder.customer_phone && (
                  <a
                    href={getWhatsAppLink(selectedOrder.customer_phone, selectedOrder.customer_name, selectedOrder.id)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="whatsapp-chat-btn"
                    style={{ marginTop: "var(--sp-2)" }}
                  >
                    <svg viewBox="0 0 448 512" width="16" height="16" aria-hidden="true">
                      <path d="M380.9 97.1C339 55.1 283.2 32 223.9 32c-122.4 0-222 99.6-222 222 0 39.1 10.2 77.3 29.6 111L0 480l117.7-30.9c32.4 17.7 68.9 27 106.1 27h.1c122.3 0 224.1-99.6 224.1-222 0-59.3-25.2-115-67.1-157zm-157 341.6c-33.2 0-65.7-8.9-94-25.7l-6.7-4-69.8 18.3L72 359.2l-4.4-7c-18.5-29.4-28.2-63.3-28.2-98.2 0-101.7 82.8-184.5 184.6-184.5 49.3 0 95.6 19.2 130.4 54.1 34.8 34.9 56.2 81.2 56.1 130.5 0 101.8-84.9 184.6-186.6 184.6zm101.2-138.2c-5.5-2.8-32.8-16.2-37.9-18-5.1-1.9-8.8-2.8-12.5 2.8-3.7 5.6-14.3 18-17.6 21.8-3.2 3.7-6.5 4.2-12 1.4-32.6-16.3-54-29.1-75.5-66-5.7-9.8 5.7-9.1 16.3-30.3 1.8-3.7 .9-6.9-.5-9.7-1.4-2.8-12.5-30.1-17.1-41.2-4.5-10.8-9.1-9.3-12.5-9.5-3.2-.2-6.9-.2-10.6-.2-3.7 0-9.7 1.4-14.8 6.9-5.1 5.6-19.4 19-19.4 46.3 0 27.3 19.9 53.7 22.6 57.4 2.8 3.7 39.1 59.7 94.8 83.8 35.2 15.2 49 16.5 66.6 13.9 10.7-1.6 32.8-13.4 37.4-26.4 4.6-13 4.6-24.1 3.2-26.4-1.3-2.5-5-3.9-10.5-6.6z"/>
                    </svg>
                    Chat on WhatsApp
                  </a>
                )}
              </div>

              {/* Payment Details */}
              <div className="order-drawer-section">
                <h3 className="order-drawer-section__title">Payment details</h3>
                <dl className="admin-def-list" style={{ marginTop: "4px" }}>
                  <div className="admin-def-list__row">
                    <dt>Method</dt>
                    <dd>{PAYMENT_LABELS[selectedOrder.payment_method] || selectedOrder.payment_method || "—"}</dd>
                  </div>
                  {selectedOrder.checkout_reference && (
                    <div className="admin-def-list__row">
                      <dt>Reference</dt>
                      <dd>{selectedOrder.checkout_reference}</dd>
                    </div>
                  )}
                </dl>
              </div>

              {/* Items Breakdown */}
              <div className="order-drawer-section">
                <h3 className="order-drawer-section__title">Items ({selectedOrder.order_items?.length || 0})</h3>
                <div className="order-drawer-items" style={{ marginTop: "4px" }}>
                  {selectedOrder.order_items?.map((item) => (
                    <div key={item.id} className="order-drawer-item">
                      {item.image_snapshot ? (
                        <img className="order-drawer-item__img" src={item.image_snapshot} alt="" />
                      ) : (
                        <div className="order-drawer-item__empty" />
                      )}
                      <div className="order-drawer-item__main">
                        <p className="order-drawer-item__title">{item.name_snapshot}</p>
                        <p className="order-drawer-item__meta">
                          {item.size_snapshot} · {item.qty} unit{item.qty === 1 ? "" : "s"}
                        </p>
                      </div>
                      <span className="order-drawer-item__price">
                        {((item.unit_price - (item.discount_amount || 0)) * item.qty).toLocaleString()} EGP
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Order Financial Summary */}
              <div className="order-drawer-section">
                <h3 className="order-drawer-section__title">Financial Summary</h3>
                <dl className="admin-def-list" style={{ marginTop: "4px" }}>
                  <div className="admin-def-list__row">
                    <dt>Subtotal</dt>
                    <dd className="num">{Number(selectedOrder.subtotal || 0).toLocaleString()} EGP</dd>
                  </div>
                  {Number(selectedOrder.discount_amount || 0) > 0 && (
                    <div className="admin-def-list__row" style={{ color: "var(--danger)" }}>
                      <dt style={{ color: "var(--danger)" }}>Discount {selectedOrder.discount_code ? `(${selectedOrder.discount_code})` : ""}</dt>
                      <dd className="num">- {Number(selectedOrder.discount_amount).toLocaleString()} EGP</dd>
                    </div>
                  )}
                  {Number(selectedOrder.shipping || 0) > 0 && (
                    <div className="admin-def-list__row">
                      <dt>Shipping</dt>
                      <dd className="num">+{Number(selectedOrder.shipping).toLocaleString()} EGP</dd>
                    </div>
                  )}
                  <div className="admin-def-list__row" style={{ fontWeight: "bold", borderBlockStart: "2px solid var(--line-strong)" }}>
                    <dt style={{ color: "var(--ink)", fontWeight: "bold" }}>Total</dt>
                    <dd className="num" style={{ color: "var(--ink)", fontWeight: "bold" }}>
                      {Number(selectedOrder.total || 0).toLocaleString()} EGP
                    </dd>
                  </div>
                </dl>
              </div>
            </div>

            <footer className="order-drawer__footer">
              <button
                type="button"
                className="btn btn--secondary"
                onClick={() => setActiveOrderId(null)}
              >
                Close Details
              </button>
            </footer>
          </div>
        </>
      )}
    </div>
  );
}
