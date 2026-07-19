import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/stores/auth";
import { adminGetOrders, adminGetProducts, adminGetCustomers } from "@/lib/api";
import { StatusBadge } from "@/components/admin/StatusBadge";

const LOW_STOCK_THRESHOLD = 5;

function timeAgo(iso) {
  const secs = (Date.now() - new Date(iso).getTime()) / 1000;
  if (secs < 60) return "just now";
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

const isToday = (iso) => {
  const d = new Date(iso);
  const now = new Date();
  return (
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear()
  );
};

const egp = (n) => `${Number(n || 0).toLocaleString()} EGP`;

export default function AdminDashboard() {
  const { token } = useAuth();

  const { data: ordersData, isLoading: ordersLoading } = useQuery({
    queryKey: ["admin-orders", token],
    queryFn: () => adminGetOrders(token),
    enabled: !!token,
  });
  const { data: productsData, isLoading: productsLoading } = useQuery({
    queryKey: ["admin-products", token],
    queryFn: () => adminGetProducts(token),
    enabled: !!token,
  });
  const { data: customersData, isLoading: customersLoading } = useQuery({
    queryKey: ["admin-customers", token],
    queryFn: () => adminGetCustomers(token),
    enabled: !!token,
  });

  const orders = ordersData?.data ?? [];
  const products = productsData?.data ?? [];
  const customers = customersData?.data ?? [];

  const countedOrders = orders.filter((o) => o.status !== "cancelled");
  const revenue = countedOrders.reduce((sum, o) => sum + Number(o.total || 0), 0);
  const revenueToday = countedOrders
    .filter((o) => isToday(o.created_at))
    .reduce((sum, o) => sum + Number(o.total || 0), 0);
  const ordersToday = orders.filter((o) => isToday(o.created_at)).length;

  const pendingOrders = orders
    .filter((o) => o.status === "pending")
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  const stockOf = (p) => p.variants?.reduce((sum, v) => sum + (v.quantity || 0), 0) ?? 0;
  const lowStock = products
    .filter((p) => p.status === "active" && stockOf(p) <= LOW_STOCK_THRESHOLD)
    .sort((a, b) => stockOf(a) - stockOf(b))
    .slice(0, 6);

  const recentOrders = [...orders]
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, 6);

  const registered = customers.filter((c) => c.is_registered).length;
  const loading = ordersLoading || productsLoading || customersLoading;

  const stats = [
    { label: "Revenue", value: egp(revenue), hint: revenueToday ? `${egp(revenueToday)} today` : "Excludes cancelled orders" },
    { label: "Orders", value: orders.length, hint: ordersToday ? `${ordersToday} today` : "No orders today yet" },
    { label: "Pending", value: pendingOrders.length, hint: pendingOrders.length ? "Awaiting confirmation" : "All caught up" },
    { label: "Customers", value: customers.length, hint: `${registered} registered` },
  ];

  return (
    <div className="admin-content">
      <header className="page-head page-head--compact">
        <h1 className="page-head__title">Overview</h1>
        <p className="admin-dash-date">
          {new Date().toLocaleDateString("en-GB", {
            weekday: "long", day: "numeric", month: "long", year: "numeric",
          })}
        </p>
      </header>

      <div className="admin-stats">
        {stats.map((s) => (
          <div className="stat" key={s.label}>
            {loading ? (
              <>
                <span className="skel skel--price" style={{ display: "block", blockSize: "1.6rem" }} />
                <p className="stat__label">{s.label}</p>
              </>
            ) : (
              <>
                <p className="stat__value">{s.value}</p>
                <p className="stat__label">{s.label}</p>
                <p className="stat__hint">{s.hint}</p>
              </>
            )}
          </div>
        ))}
      </div>

      <div className="admin-dash-grid">
        <section className="admin-card" aria-labelledby="dash-pending-title">
          <div className="admin-card__head">
            <h2 className="admin-card__title" id="dash-pending-title">Needs attention</h2>
            {pendingOrders.length > 0 && (
              <Link className="admin-card__link" to="/admin/orders?status=pending">
                Review all →
              </Link>
            )}
          </div>
          {ordersLoading ? (
            <div className="admin-dash-list" aria-hidden="true">
              {[...Array(3)].map((_, i) => (
                <div className="admin-dash-row" key={i}>
                  <span className="skel skel--name" />
                  <span className="skel skel--price" style={{ marginInlineStart: "auto" }} />
                </div>
              ))}
            </div>
          ) : pendingOrders.length === 0 ? (
            <p className="admin-dash-empty">No pending orders — everything has been handled.</p>
          ) : (
            <div className="admin-dash-list">
              {pendingOrders.slice(0, 5).map((o) => (
                <div className="admin-dash-row" key={o.id}>
                  <div className="admin-dash-row__main">
                    <span className="admin-dash-row__title">{o.customer_name || "Guest"}</span>
                    <span className="admin-dash-row__meta">
                      {[
                        o.order_items?.map((i) => i.name_snapshot).filter(Boolean).join(", "),
                        timeAgo(o.created_at),
                      ].filter(Boolean).join(" · ")}
                    </span>
                  </div>
                  <span className="admin-dash-row__val">{o.total ? egp(o.total) : "—"}</span>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="admin-card" aria-labelledby="dash-stock-title">
          <div className="admin-card__head">
            <h2 className="admin-card__title" id="dash-stock-title">Low stock</h2>
            <Link className="admin-card__link" to="/admin/products">All products →</Link>
          </div>
          {productsLoading ? (
            <div className="admin-dash-list" aria-hidden="true">
              {[...Array(3)].map((_, i) => (
                <div className="admin-dash-row" key={i}>
                  <span className="skel skel--badge" style={{ inlineSize: "2.25rem", blockSize: "2.25rem" }} />
                  <span className="skel skel--name" />
                </div>
              ))}
            </div>
          ) : lowStock.length === 0 ? (
            <p className="admin-dash-empty">Every active product is stocked above {LOW_STOCK_THRESHOLD} units.</p>
          ) : (
            <div className="admin-dash-list">
              {lowStock.map((p) => {
                const stock = stockOf(p);
                return (
                  <div className="admin-dash-row" key={p.id}>
                    {p.image ? (
                      <img className="admin-dash-thumb" src={p.image} alt="" />
                    ) : (
                      <div className="admin-dash-thumb admin-dash-thumb--empty" />
                    )}
                    <div className="admin-dash-row__main">
                      <span className="admin-dash-row__title">{p.en_name}</span>
                      <span className={`admin-dash-row__meta${stock === 0 ? " admin-dash-row__meta--danger" : ""}`}>
                        {stock === 0 ? "Out of stock" : `${stock} unit${stock === 1 ? "" : "s"} left`}
                      </span>
                    </div>
                    <Link className="btn btn--secondary btn--sm" to={`/admin/product?id=${p.id}`}>
                      Restock
                    </Link>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>

      <section className="admin-card" aria-labelledby="dash-recent-title">
        <div className="admin-card__head">
          <h2 className="admin-card__title" id="dash-recent-title">Recent orders</h2>
          <Link className="admin-card__link" to="/admin/orders">View all →</Link>
        </div>
        {ordersLoading ? (
          <div className="table-wrap">
            <table className="table" aria-label="Recent orders loading">
              <thead>
                <tr><th>Order</th><th>Customer</th><th>Status</th><th>Total</th><th>Date</th></tr>
              </thead>
              <tbody>
                {[...Array(4)].map((_, i) => (
                  <tr key={i} className="skel-row">
                    <td><span className="skel skel--id" /></td>
                    <td><span className="skel skel--name" /></td>
                    <td><span className="skel skel--badge" /></td>
                    <td><span className="skel skel--price" /></td>
                    <td><span className="skel skel--date" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : recentOrders.length === 0 ? (
          <p className="admin-dash-empty">Orders will appear here once customers check out.</p>
        ) : (
          <div className="table-wrap">
            <table className="table" aria-label="Recent orders">
              <thead>
                <tr><th>Order</th><th>Customer</th><th>Status</th><th>Total</th><th>Date</th></tr>
              </thead>
              <tbody>
                {recentOrders.map((o) => (
                  <tr key={o.id}>
                    <td><span className="order-id">{o.id?.slice(0, 8)}</span></td>
                    <td>
                      <div className="order-cell">
                        <span className="order-cell__primary">{o.customer_name || "Guest"}</span>
                        {o.order_items?.length > 0 && (
                          <span className="order-cell__secondary">
                            {o.order_items.map((i) => i.name_snapshot).join(", ")}
                          </span>
                        )}
                      </div>
                    </td>
                    <td><StatusBadge orderId={o.id} current={o.status} token={token} /></td>
                    <td className="num order-total-cell">{o.total ? egp(o.total) : "—"}</td>
                    <td className="order-date-cell">{timeAgo(o.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
