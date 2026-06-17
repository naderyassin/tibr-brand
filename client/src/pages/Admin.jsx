import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/stores/auth";
import { adminGetProducts, adminGetOrders, adminUpdateOrderStatus, adminDeleteProduct, getProfile } from "@/lib/api";

const STATUSES = ["pending", "confirmed", "shipped", "delivered", "cancelled"];

function StatusSelect({ orderId, current, token }) {
  const qc = useQueryClient();
  const { mutate, isPending } = useMutation({
    mutationFn: (status) => adminUpdateOrderStatus(orderId, status, token),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-orders"] }),
  });
  return (
    <select
      className="status-select"
      value={current}
      disabled={isPending}
      onChange={(e) => mutate(e.target.value)}
    >
      {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
    </select>
  );
}

export default function Admin() {
  const [activeTab, setActiveTab] = useState("orders");
  const { user, token, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();

  useEffect(() => {
    if (!authLoading && !user) navigate("/login", { replace: true });
  }, [authLoading, user, navigate]);

  // Verify admin role; non-admins are bounced to their account.
  const { data: profileData, isLoading: profileLoading } = useQuery({
    queryKey: ["profile", token],
    queryFn: () => getProfile(token),
    enabled: !!token,
  });
  const isAdmin = profileData?.data?.role === "admin";

  useEffect(() => {
    if (!profileLoading && profileData && !isAdmin) {
      navigate("/account", { replace: true });
    }
  }, [profileLoading, profileData, isAdmin, navigate]);

  const { data: ordersData, isLoading: ordersLoading } = useQuery({
    queryKey: ["admin-orders", token],
    queryFn: () => adminGetOrders(token),
    enabled: !!token && activeTab === "orders",
  });

  const { data: productsData, isLoading: productsLoading } = useQuery({
    queryKey: ["admin-products", token],
    queryFn: () => adminGetProducts(token),
    enabled: !!token && activeTab === "products",
  });

  const { mutate: deleteProduct } = useMutation({
    mutationFn: (id) => adminDeleteProduct(id, token),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-products"] }),
  });

  if (authLoading || !user || profileLoading || !isAdmin) return null;

  const orders = ordersData?.data ?? [];
  const products = productsData?.data ?? [];

  return (
    <div className="store-container">
      <header className="page-head page-head--compact">
        <h1 className="page-head__title">Admin</h1>
      </header>

      {activeTab === "orders" && (
        <div className="admin-stats">
          <div className="stat">
            <p className="stat__value">{orders.length}</p>
            <p className="stat__label">Total orders</p>
          </div>
          <div className="stat">
            <p className="stat__value stat__value--gold">
              {orders.filter((o) => o.status === "pending").length}
            </p>
            <p className="stat__label">Pending</p>
          </div>
        </div>
      )}

      <div className="admin-tabs">
        <button
          className={`admin-tab${activeTab === "orders" ? " is-active" : ""}`}
          type="button"
          onClick={() => setActiveTab("orders")}
        >
          Orders
        </button>
        <button
          className={`admin-tab${activeTab === "products" ? " is-active" : ""}`}
          type="button"
          onClick={() => setActiveTab("products")}
        >
          Products
        </button>
      </div>

      {activeTab === "orders" && (
        <div className="admin-pane is-active">
          {ordersLoading ? (
            <p style={{ color: "var(--muted)" }}>Loading orders…</p>
          ) : (
            <div className="table-wrap">
              <table className="table" aria-label="Orders">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Customer</th>
                    <th>Product</th>
                    <th>Status</th>
                    <th>Total</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((o) => (
                    <tr key={o.id}>
                      <td className="num">{o.id?.slice(0, 8)}</td>
                      <td>{o.customer_name}</td>
                      <td>{o.products?.en_name || "—"}</td>
                      <td>
                        <StatusSelect orderId={o.id} current={o.status} token={token} />
                      </td>
                      <td className="num">{o.order_total ? `${o.order_total} EGP` : "—"}</td>
                      <td>{new Date(o.created_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === "products" && (
        <div className="admin-pane is-active">
          <div className="admin-toolbar">
            <span style={{ color: "var(--muted)", fontSize: "var(--fs-sm)" }}>{products.length} products</span>
            <Link className="btn btn--primary" to="/admin/product">Add product</Link>
          </div>
          {productsLoading ? (
            <p style={{ color: "var(--muted)" }}>Loading products…</p>
          ) : (
            <div className="table-wrap">
              <table className="table admin-product-table" aria-label="Products">
                <thead>
                  <tr>
                    <th className="ap-thumb-cell" />
                    <th>Name</th>
                    <th>Category</th>
                    <th>Price</th>
                    <th>Stock</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((p) => (
                    <tr key={p.id}>
                      <td className="ap-thumb-cell">
                        {p.image ? (
                          <img className="ap-thumb" src={p.image} alt={p.en_name} />
                        ) : (
                          <div className="ap-thumb--empty" />
                        )}
                      </td>
                      <td>
                        <div className="admin-product-meta">
                          <span className="admin-product-meta__name">{p.en_name}</span>
                          <span className="admin-product-meta__sub">{p.ar_name}</span>
                        </div>
                      </td>
                      <td>{p.category}</td>
                      <td className="num">{p.en_price} EGP</td>
                      <td className="num">{p.quantity}</td>
                      <td>
                        <div className="product-actions">
                          <Link
                            className="btn btn--secondary"
                            to={`/admin/product?id=${p.id}`}
                          >
                            Edit
                          </Link>
                          <button
                            className="btn btn--danger"
                            type="button"
                            onClick={() => {
                              if (confirm(`Delete "${p.en_name}"?`)) deleteProduct(p.id);
                            }}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
