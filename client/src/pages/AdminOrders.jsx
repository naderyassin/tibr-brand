import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/stores/auth";
import { adminGetOrders } from "@/lib/api";
import { StatusBadge } from "@/components/admin/StatusBadge";

export default function AdminOrders() {
  const { token } = useAuth();
  const [statusFilter, setStatusFilter] = useState("all");
  const [orderSearch, setOrderSearch] = useState("");

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
        o.products?.en_name?.toLowerCase().includes(q)
      );
    });

  const FILTER_OPTIONS = [
    { key: "all",       label: "All",       count: counts.total },
    { key: "pending",   label: "Pending",   count: counts.pending },
    { key: "confirmed", label: "Confirmed", count: counts.confirmed },
    { key: "shipped",   label: "Shipped",   count: counts.shipped },
    { key: "delivered", label: "Delivered", count: counts.delivered },
    { key: "cancelled", label: "Cancelled", count: counts.cancelled },
  ];

  return (
    <div className="admin-content">
      <header className="page-head page-head--compact">
        <h1 className="page-head__title">Orders</h1>
      </header>

      <div className="admin-stats">
        <div className="stat">
          <p className="stat__value">{counts.total}</p>
          <p className="stat__label">Total Orders</p>
        </div>
        <div className="stat">
          <p className="stat__value" style={{ color: "var(--warning)" }}>{counts.pending}</p>
          <p className="stat__label">Pending</p>
        </div>
        <div className="stat">
          <p className="stat__value" style={{ color: "var(--gold)" }}>{counts.shipped}</p>
          <p className="stat__label">Shipped</p>
        </div>
        <div className="stat">
          <p className="stat__value" style={{ color: "var(--success)" }}>{counts.delivered}</p>
          <p className="stat__label">Delivered</p>
        </div>
      </div>

      <div className="admin-card">
        <div className="order-toolbar">
          <div className="order-search">
            <svg className="order-search__icon" width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden="true">
              <circle cx="6.5" cy="6.5" r="4" stroke="currentColor" strokeWidth="1.4"/>
              <path d="M9.5 9.5L12.5 12.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
            </svg>
            <input
              className="order-search__input"
              type="search"
              placeholder="Search name, phone, or order ID…"
              value={orderSearch}
              onChange={(e) => setOrderSearch(e.target.value)}
            />
            {orderSearch && (
              <button
                className="order-search__clear"
                type="button"
                onClick={() => setOrderSearch("")}
                aria-label="Clear search"
              >
                ×
              </button>
            )}
          </div>
        </div>

        <div className="order-filter-chips" role="group" aria-label="Filter by status">
          {FILTER_OPTIONS.map(({ key, label, count }) => (
            <button
              key={key}
              className="filter-chip"
              type="button"
              aria-pressed={statusFilter === key}
              onClick={() => setStatusFilter(key)}
            >
              {label}
              <span className="filter-chip__count">{count}</span>
            </button>
          ))}
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
            <table className="table" aria-label="Orders">
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
                  <tr key={o.id}>
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
                        <span className="order-cell__primary">{o.products?.en_name || "—"}</span>
                        {(o.size || o.qty) && (
                          <span className="order-cell__secondary">
                            {[o.size && `Size ${o.size}`, o.qty && `Qty ${o.qty}`].filter(Boolean).join(" · ")}
                          </span>
                        )}
                      </div>
                    </td>
                    <td>
                      <StatusBadge orderId={o.id} current={o.status} token={token} />
                    </td>
                    <td className="num order-total-cell">
                      {o.order_total ? `${Number(o.order_total).toLocaleString()} EGP` : "—"}
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
    </div>
  );
}
