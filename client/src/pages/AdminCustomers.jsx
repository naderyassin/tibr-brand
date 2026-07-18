import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/stores/auth";
import { adminGetCustomers } from "@/lib/api";

export default function AdminCustomers() {
  const { token } = useAuth();
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ["admin-customers", token],
    queryFn: () => adminGetCustomers(token),
    enabled: !!token,
  });

  const customers = data?.data ?? [];
  const [search, setSearch] = useState("");

  const visibleCustomers = customers.filter((c) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      c.name?.toLowerCase().includes(q) ||
      c.phone?.includes(q)
    );
  });

  return (
    <div className="admin-content">
      <header className="page-head page-head--compact">
        <h1 className="page-head__title">Customers</h1>
      </header>

      {customers.length > 0 && (
        <div className="admin-stats">
          <div className="stat">
            <p className="stat__value">{customers.length}</p>
            <p className="stat__label">Total Customers</p>
          </div>
          <div className="stat">
            <p className="stat__value">{customers.filter((c) => c.is_registered).length}</p>
            <p className="stat__label">Registered</p>
          </div>
          <div className="stat">
            <p className="stat__value">{customers.reduce((sum, c) => sum + c.order_count, 0)}</p>
            <p className="stat__label">Total Orders</p>
          </div>
          <div className="stat">
            <p className="stat__value">
              {customers.reduce((sum, c) => sum + c.total_spent, 0).toLocaleString()}
              <span style={{ fontSize: "var(--fs-sm)", color: "var(--muted)" }}> EGP</span>
            </p>
            <p className="stat__label">Total Revenue</p>
          </div>
        </div>
      )}

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
              placeholder="Search name, phone, email…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button className="admin-search__clear" type="button" onClick={() => setSearch("")} aria-label="Clear search">×</button>
            )}
          </div>
        </div>

        {isLoading ? (
          <div className="table-wrap">
            <table className="table" aria-label="Customers loading">
              <thead>
                <tr>
                  <th>Customer</th><th>Phone</th><th>Orders</th><th>Total spent</th><th>Last order</th>
                </tr>
              </thead>
              <tbody>
                {[...Array(5)].map((_, i) => (
                  <tr key={i} className="skel-row">
                    <td><span className="skel skel--name" /></td>
                    <td><span className="skel skel--phone" /></td>
                    <td><span className="skel skel--id" /></td>
                    <td><span className="skel skel--price" /></td>
                    <td><span className="skel skel--date" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : customers.length === 0 ? (
          <div className="admin-empty-state">
            <svg width="36" height="36" viewBox="0 0 36 36" fill="none" aria-hidden="true">
              <circle cx="18" cy="12" r="6" stroke="currentColor" strokeWidth="1.4"/>
              <path d="M7 31a11 11 0 0 1 22 0" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
            </svg>
            <p className="admin-empty-state__title">No customers yet</p>
            <p className="admin-empty-state__sub">
              Customers appear here automatically once orders start coming in.
            </p>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="table admin-clickable-table" aria-label="Customers">
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Phone</th>
                  <th>Orders</th>
                  <th>Total spent</th>
                  <th>Last order</th>
                </tr>
              </thead>
              <tbody>
                {visibleCustomers.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: "center", padding: "var(--sp-6)", color: "var(--muted)" }}>
                      No customers match your search.
                    </td>
                  </tr>
                ) : visibleCustomers.map((c) => (
                  <tr
                    key={c.id}
                    className="admin-row-link"
                    onClick={() => navigate(`/admin/customers/${encodeURIComponent(c.id)}`)}
                    tabIndex={0}
                    role="link"
                    aria-label={`View ${c.name || "guest"} details`}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") navigate(`/admin/customers/${encodeURIComponent(c.id)}`);
                    }}
                  >
                    <td>
                      <div className="order-cell">
                        <span className="order-cell__primary">{c.name || "Guest"}</span>
                        <span className="order-cell__secondary">
                          {c.is_registered ? "Registered" : "Guest"}
                        </span>
                      </div>
                    </td>
                    <td className="order-date-cell">{c.phone || "—"}</td>
                    <td className="num">{c.order_count}</td>
                    <td className="num order-total-cell">
                      {c.total_spent ? `${c.total_spent.toLocaleString()} EGP` : "—"}
                    </td>
                    <td className="order-date-cell">
                      {new Date(c.last_order_at).toLocaleDateString("en-GB", {
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
