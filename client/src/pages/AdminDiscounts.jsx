import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/stores/auth";
import { adminGetDiscounts, adminDeleteDiscount } from "@/lib/api";
import { StatusPill } from "@/components/admin/StatusBadge";
import DiscountTypeModal from "@/components/admin/DiscountTypeModal";

const CLASS_LABEL = {
  order: "Amount off order",
  product: "Amount off products",
  buy_x_get_y: "Buy X get Y",
  shipping: "Free shipping",
};

const getDiscountLabel = (d) => {
  if (d.get_discount_type === "free") return "free";
  if (d.get_discount_type === "percentage") return `${d.get_discount_value}% off`;
  return `${Number(d.get_discount_value).toLocaleString()} EGP off`;
};

const valueLabel = (d) => {
  if (d.discount_class === "shipping") return "Free shipping";
  if (d.discount_class === "buy_x_get_y") {
    const trigger = d.buy_type === "quantity" ? `buy ${d.buy_quantity}` : `spend ${Number(d.buy_amount).toLocaleString()} EGP`;
    return `${trigger}, get ${d.get_quantity} ${getDiscountLabel(d)}`;
  }
  if (d.type === "percentage") return `${d.value}% off`;
  if (d.type === "fixed") return `${Number(d.value).toLocaleString()} EGP off`;
  return "—";
};

// Maps discount lifecycle to the existing order-status palette (green/blue/red/gray).
const statusOf = (d) => {
  if (!d.active) return { label: "Inactive", status: "pending" };
  const now = new Date();
  if (d.starts_at && new Date(d.starts_at) > now) return { label: "Scheduled", status: "confirmed" };
  if (d.ends_at && new Date(d.ends_at) < now) return { label: "Expired", status: "cancelled" };
  if (d.usage_limit != null && d.used_count >= d.usage_limit) return { label: "Used up", status: "cancelled" };
  return { label: "Active", status: "delivered" };
};

export default function AdminDiscounts() {
  const { token } = useAuth();
  const qc = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-discounts", token],
    queryFn: () => adminGetDiscounts(token),
    enabled: !!token,
  });

  const { mutate: deleteDiscount } = useMutation({
    mutationFn: (id) => adminDeleteDiscount(id, token),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-discounts"] }),
  });

  const discounts = data?.data ?? [];

  return (
    <div className="admin-content">
      <header className="page-head page-head--compact">
        <h1 className="page-head__title">Discounts</h1>
      </header>

      <div className="admin-card">
        <div className="admin-toolbar">
          <span style={{ color: "var(--muted)", fontSize: "var(--fs-sm)" }}>{discounts.length} discounts</span>
          <button className="btn btn--primary" type="button" onClick={() => setModalOpen(true)}>Create discount</button>
        </div>

        {isLoading ? (
          <p style={{ color: "var(--muted)" }}>Loading discounts…</p>
        ) : discounts.length === 0 ? (
          <div className="admin-empty-state">
            <svg width="36" height="36" viewBox="0 0 36 36" fill="none" aria-hidden="true">
              <rect x="4" y="10" width="20" height="20" rx="2" transform="rotate(-8 4 10)" stroke="currentColor" strokeWidth="1.4"/>
              <path d="M14 20l5-5M14 20l4 1-1-4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <p className="admin-empty-state__title">No discounts yet</p>
            <p className="admin-empty-state__sub">
              Create a discount or promotion your customers can use at checkout.
            </p>
            <button className="btn btn--secondary" style={{ marginBlockStart: "var(--sp-4)" }} type="button" onClick={() => setModalOpen(true)}>
              Create discount
            </button>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="table admin-clickable-table" aria-label="Discounts">
              <thead>
                <tr>
                  <th>Discount</th>
                  <th>Value</th>
                  <th>Status</th>
                  <th>Used</th>
                  <th>Ends</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {discounts.map((d) => {
                  const status = statusOf(d);
                  return (
                    <tr key={d.id}>
                      <td>
                        <div className="order-cell">
                          <span className="order-cell__primary">{d.method === "code" ? d.code : d.title}</span>
                          <span className="order-cell__secondary">
                            {CLASS_LABEL[d.discount_class]} · {d.method === "automatic" ? "Automatic" : "Code"}
                          </span>
                        </div>
                      </td>
                      <td>{valueLabel(d)}</td>
                      <td>
                        <StatusPill status={status.status} label={status.label} />
                      </td>
                      <td className="num">
                        {d.used_count}{d.usage_limit != null ? ` / ${d.usage_limit}` : ""}
                      </td>
                      <td className="order-date-cell">
                        {d.ends_at
                          ? new Date(d.ends_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
                          : "No end date"}
                      </td>
                      <td>
                        <div className="product-actions">
                          <Link className="btn btn--secondary" to={`/admin/discounts/${d.id}`}>Edit</Link>
                          <button
                            className="btn btn--danger"
                            type="button"
                            onClick={() => { if (confirm(`Delete "${d.method === "code" ? d.code : d.title}"?`)) deleteDiscount(d.id); }}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <DiscountTypeModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </div>
  );
}
