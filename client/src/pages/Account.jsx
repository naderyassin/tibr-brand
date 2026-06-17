import { useEffect } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { useAuth } from "@/stores/auth";
import { getOrders, getProfile } from "@/lib/api";

const tabs = [
  { id: "orders", label: "Orders" },
  { id: "profile", label: "Profile" },
  { id: "addresses", label: "Addresses" },
  { id: "wishlist", label: "Wishlist" },
];

const STATUS_LABELS = {
  pending: "pending",
  confirmed: "confirmed",
  shipped: "shipped",
  delivered: "delivered",
  cancelled: "cancelled",
};

function OrderCard({ order }) {
  const name = order.products?.en_name || order.products?.ar_name || "Product";
  return (
    <div className="order-card">
      <div className="order-card__head" style={{ cursor: "default" }}>
        <div className="order-card__thumbs">
          {order.products?.image ? (
            <img className="order-card__thumb" src={order.products.image} alt={name} />
          ) : (
            <div className="order-card__thumb order-card__thumb--empty" />
          )}
        </div>
        <div className="order-card__info">
          <p className="order-card__ref">#{order.checkout_reference?.slice(0, 8).toUpperCase() || order.id?.slice(0, 8)}</p>
          <p className="order-card__meta">{new Date(order.created_at).toLocaleDateString()}</p>
        </div>
        <div className="order-card__side">
          <span className={`badge badge--${order.status || "pending"}`}>
            {STATUS_LABELS[order.status] || order.status}
          </span>
          {order.order_total && (
            <span className="order-card__price">{order.order_total} EGP</span>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Account() {
  const [params, setParams] = useSearchParams();
  const tab = params.get("tab") || "orders";
  const { user, token, signOut, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && !user) navigate("/login", { replace: true });
  }, [authLoading, user, navigate]);

  const { data: ordersData, isLoading: ordersLoading } = useQuery({
    queryKey: ["orders", token],
    queryFn: () => getOrders(token),
    enabled: !!token && tab === "orders",
  });

  const { data: profileData } = useQuery({
    queryKey: ["profile", token],
    queryFn: () => getProfile(token),
    enabled: !!token,
  });

  if (authLoading || !user) return null;

  const isAdmin = profileData?.data?.role === "admin";
  const setTab = (id) => setParams({ tab: id });

  return (
    <div className="store-container">
      <header className="page-head">
        <h1 className="page-head__title">My account</h1>
      </header>

      <div className="dashboard">
        <nav className="dash-nav" aria-label="Account sections">
          {tabs.map((t) => (
            <button
              key={t.id}
              className="dash-nav__item"
              aria-current={tab === t.id ? "true" : undefined}
              type="button"
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </button>
          ))}
          {isAdmin && (
            <Link className="dash-nav__item dash-nav__item--admin" to="/admin">
              Control panel
            </Link>
          )}
          <button
            className="dash-nav__item dash-nav__item--danger"
            type="button"
            onClick={async () => { await signOut(); navigate("/"); }}
          >
            Sign out
          </button>
        </nav>

        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28 }}
        >
          {tab === "orders" && (
            <div className="dash-panel is-active">
              <div className="dash-panel__head">
                <h2 className="dash-panel__title">Orders</h2>
              </div>
              {ordersLoading ? (
                <p style={{ color: "var(--muted)" }}>Loading orders…</p>
              ) : !ordersData?.data?.length ? (
                <p style={{ color: "var(--muted)" }}>
                  No orders yet. <Link to="/shop/perfumes" style={{ color: "var(--gold)" }}>Start shopping.</Link>
                </p>
              ) : (
                <div className="dash-orders">
                  {ordersData.data.map((o) => <OrderCard key={o.id} order={o} />)}
                </div>
              )}
            </div>
          )}

          {tab === "profile" && (
            <div className="dash-panel is-active">
              <div className="dash-panel__head">
                <h2 className="dash-panel__title">Profile</h2>
              </div>
              <div className="dash-card">
                <p style={{ color: "var(--ink-2)", marginBottom: "0.5rem" }}>
                  <strong style={{ color: "var(--ink)" }}>Email: </strong>{user.email}
                </p>
                {profileData?.data?.full_name && (
                  <p style={{ color: "var(--ink-2)" }}>
                    <strong style={{ color: "var(--ink)" }}>Name: </strong>{profileData.data.full_name}
                  </p>
                )}
              </div>
            </div>
          )}

          {tab === "addresses" && (
            <div className="dash-panel is-active">
              <div className="dash-panel__head">
                <h2 className="dash-panel__title">Addresses</h2>
              </div>
              <p style={{ color: "var(--muted)" }}>
                Manage your saved addresses for faster checkout.
              </p>
            </div>
          )}

          {tab === "wishlist" && (
            <div className="dash-panel is-active">
              <div className="dash-panel__head">
                <h2 className="dash-panel__title">Wishlist</h2>
              </div>
              <p style={{ color: "var(--muted)" }}>
                Your wishlist is empty. <Link to="/shop/perfumes" style={{ color: "var(--gold)" }}>Browse fragrances.</Link>
              </p>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
