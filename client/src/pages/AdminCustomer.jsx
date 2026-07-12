import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/stores/auth";
import { adminGetCustomer } from "@/lib/api";
import { StatusBadge } from "@/components/admin/StatusBadge";

const fmtDate = (d) =>
  new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

export default function AdminCustomer() {
  const { id } = useParams();
  const { token } = useAuth();

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["admin-customer", id, token],
    queryFn: () => adminGetCustomer(id, token),
    enabled: !!token && !!id,
  });

  const customer = data?.data?.customer;
  const orders = data?.data?.orders ?? [];

  return (
    <div className="admin-content">
      <header className="admin-detail-head">
        <Link className="admin-back-link" to="/admin/customers">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
            <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Customers
        </Link>
        <h1 className="page-head__title">
          {isLoading ? "Loading…" : (customer?.name || "Guest customer")}
        </h1>
      </header>

      {isError ? (
        <div className="admin-card">
          <div className="admin-empty-state">
            <p className="admin-empty-state__title">Couldn’t load customer</p>
            <p className="admin-empty-state__sub">{error?.message || "Please try again."}</p>
            <Link className="btn btn--secondary" style={{ marginBlockStart: "var(--sp-4)" }} to="/admin/customers">
              Back to customers
            </Link>
          </div>
        </div>
      ) : isLoading ? (
        <div className="admin-card">
          <p style={{ color: "var(--muted)" }}>Loading customer…</p>
        </div>
      ) : (
        <>
          <div className="admin-stats">
            <div className="stat">
              <p className="stat__value">{customer.order_count}</p>
              <p className="stat__label">Orders</p>
            </div>
            <div className="stat">
              <p className="stat__value">
                {customer.total_spent ? customer.total_spent.toLocaleString() : "0"}
                <span style={{ fontSize: "var(--fs-sm)", color: "var(--muted)" }}> EGP</span>
              </p>
              <p className="stat__label">Total spent</p>
            </div>
            <div className="stat">
              <p className="stat__value" style={{ fontSize: "var(--fs-lg)" }}>{fmtDate(customer.first_order_at)}</p>
              <p className="stat__label">First order</p>
            </div>
            <div className="stat">
              <p className="stat__value" style={{ fontSize: "var(--fs-lg)" }}>{fmtDate(customer.last_order_at)}</p>
              <p className="stat__label">Last order</p>
            </div>
          </div>

          <div className="admin-detail-grid">
            {/* Contact / profile */}
            <div className="admin-card">
              <p className="admin-card__title">Contact</p>
              <dl className="admin-def-list">
                <div className="admin-def-list__row">
                  <dt>Name</dt>
                  <dd>{customer.name || "—"}</dd>
                </div>
                <div className="admin-def-list__row">
                  <dt>Phone</dt>
                  <dd>{customer.phone || "—"}</dd>
                </div>
                <div className="admin-def-list__row">
                  <dt>Address</dt>
                  <dd>{customer.address || "—"}</dd>
                </div>
                <div className="admin-def-list__row">
                  <dt>Type</dt>
                  <dd>{customer.is_registered ? "Registered account" : "Guest checkout"}</dd>
                </div>
              </dl>
            </div>

            {/* Order history */}
            <div className="admin-card">
              <p className="admin-card__title">Order history ({orders.length})</p>
              <div className="table-wrap">
                <table className="table" aria-label="Customer order history">
                  <thead>
                    <tr>
                      <th>Order</th>
                      <th>Product</th>
                      <th>Status</th>
                      <th>Total</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map((o) => (
                      <tr key={o.id}>
                        <td><span className="order-id">{o.id?.slice(0, 8)}</span></td>
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
                        <td className="order-date-cell">{fmtDate(o.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
