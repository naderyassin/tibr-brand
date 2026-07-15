import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/stores/auth";
import { supabase } from "@/lib/supabase";
import { adminGetCustomer, adminSetCustomerRole, getProfile } from "@/lib/api";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { useToast } from "@/components/ui/Toast";

const fmtDate = (d) =>
  new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

export default function AdminCustomer() {
  const { id } = useParams();
  const { token, user } = useAuth();
  const qc = useQueryClient();
  const toast = useToast();

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["admin-customer", id, token],
    queryFn: () => adminGetCustomer(id, token),
    enabled: !!token && !!id,
  });

  const customer = data?.data?.customer;
  const orders = data?.data?.orders ?? [];

  // Shares the ["profile", token] cache AdminLayout already populates — only
  // a super_admin is allowed to grant admin access to someone else.
  const { data: profileData } = useQuery({
    queryKey: ["profile", token],
    queryFn: () => getProfile(token),
    enabled: !!token,
  });
  const viewerIsSuperAdmin = profileData?.data?.role === "super_admin";

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmError, setConfirmError] = useState(null);
  const [confirmLoading, setConfirmLoading] = useState(false);

  const { mutate: promote } = useMutation({
    mutationFn: () => adminSetCustomerRole(customer.id, "admin", token),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-customer", id] });
      setConfirmOpen(false);
      setPassword("");
      toast?.(`${customer.name || "This customer"} is now an admin.`);
    },
    onError: (err) => setConfirmError(err.message || "Failed to update role."),
    onSettled: () => setConfirmLoading(false),
  });

  const handleConfirmPassword = async (e) => {
    e.preventDefault();
    setConfirmError(null);
    if (!password) { setConfirmError("Enter your password."); return; }

    setConfirmLoading(true);
    // Re-verify the acting admin's own password before granting admin —
    // a speed bump against someone using an unattended admin session.
    const { error: authError } = await supabase.auth.signInWithPassword({
      email: user?.email,
      password,
    });
    if (authError) {
      setConfirmError("Incorrect password.");
      setConfirmLoading(false);
      return;
    }
    promote();
  };

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
                {customer.is_registered && customer.email && (
                  <div className="admin-def-list__row">
                    <dt>Email</dt>
                    <dd>{customer.email}</dd>
                  </div>
                )}
                {customer.is_registered && (
                  <div className="admin-def-list__row">
                    <dt>Role</dt>
                    <dd>
                      {customer.role === "super_admin" ? "Super Admin" : customer.role === "admin" ? "Admin" : "Customer"}
                    </dd>
                  </div>
                )}
              </dl>

              {customer.is_registered && customer.role === "customer" && viewerIsSuperAdmin && (
                <button
                  className="btn btn--secondary"
                  type="button"
                  style={{ marginBlockStart: "var(--sp-4)" }}
                  onClick={() => setConfirmOpen(true)}
                >
                  Make admin
                </button>
              )}
              {!customer.is_registered && (
                <p style={{ color: "var(--muted)", fontSize: "var(--fs-sm)", marginBlockStart: "var(--sp-3)" }}>
                  Guest checkout — no account to promote.
                </p>
              )}
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

      {/* ── Confirm-password modal: re-verify the acting admin before granting admin ── */}
      <div
        className={`pw-modal-backdrop${confirmOpen ? " is-open" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-admin-title"
        onClick={(e) => { if (e.target === e.currentTarget) setConfirmOpen(false); }}
      >
        <div className="pw-modal__card">
          <div className="pw-modal__head">
            <h2 className="pw-modal__title" id="confirm-admin-title">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2" strokeLinejoin="round" /><path d="M8 11V7a4 4 0 0 1 8 0v4" strokeLinecap="round" /></svg>
              Confirm your password
            </h2>
            <button className="btn btn--ghost" type="button" onClick={() => setConfirmOpen(false)} aria-label="Close">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" style={{ width: "1.2rem", height: "1.2rem" }}><path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" /></svg>
            </button>
          </div>
          <form className="pw-modal__form" onSubmit={handleConfirmPassword} noValidate>
            <p style={{ color: "var(--muted)", fontSize: "var(--fs-sm)", margin: 0 }}>
              Enter your password to make <strong style={{ color: "var(--ink)" }}>{customer?.name || "this customer"}</strong>
              {customer?.email ? ` (${customer.email})` : ""} an admin.
            </p>
            <div className={`field${confirmError ? " is-invalid" : ""}`}>
              <label className="field__label" htmlFor="confirm-admin-password">Your password</label>
              <input
                id="confirm-admin-password"
                className="input"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
              {confirmError && <p className="field__error" role="alert">{confirmError}</p>}
            </div>
            <button
              className={`btn btn--primary btn--block${confirmLoading ? " is-loading" : ""}`}
              type="submit"
              disabled={confirmLoading}
            >
              {confirmLoading ? "" : "Confirm & grant admin"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
