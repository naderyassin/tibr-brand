import { useEffect } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/stores/auth";
import { getProfile } from "@/lib/api";
import { ToastProvider } from "@/components/ui/Toast";
import "../../styles/store/admin.css";

const NAV_ITEMS = [
  {
    label: "Orders",
    to: "/admin/orders",
    match: ["/admin/orders"],
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
        <path d="M4 8l1.5-3.5A1.5 1.5 0 0 1 6.9 3.5h10.2a1.5 1.5 0 0 1 1.4 1L20 8" strokeLinecap="round" strokeLinejoin="round"/>
        <rect x="3.5" y="8" width="17" height="12" rx="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M8.5 12a3.5 3.5 0 0 0 7 0" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  },
  {
    label: "Products",
    to: "/admin/products",
    // also highlight while editing/creating a product at /admin/product
    match: ["/admin/products", "/admin/product"],
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
        <path d="M11.3 3.5h5.2a1.5 1.5 0 0 1 1.5 1.5v5.2a1.5 1.5 0 0 1-.44 1.06l-8 8a1.5 1.5 0 0 1-2.12 0l-5.2-5.2a1.5 1.5 0 0 1 0-2.12l8-8A1.5 1.5 0 0 1 11.3 3.5z" strokeLinecap="round" strokeLinejoin="round"/>
        <circle cx="14.5" cy="8.5" r="1.25" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  },
  {
    label: "Customers",
    to: "/admin/customers",
    match: ["/admin/customers"],
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
        <circle cx="12" cy="8" r="3.75" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M4.5 20a7.5 7.5 0 0 1 15 0" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  },
  {
    label: "Discounts",
    to: "/admin/discounts",
    match: ["/admin/discounts"],
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
        <path d="M20 12.5V6a1.5 1.5 0 0 0-1.5-1.5h-6.5L4 12.5l7.5 7.5L20 12.5z" strokeLinecap="round" strokeLinejoin="round"/>
        <circle cx="14.5" cy="8.5" r="1.25" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  },
];

export default function AdminLayout() {
  const { user, token, signOut, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!authLoading && !user) navigate("/login", { replace: true });
  }, [authLoading, user, navigate]);

  const { data: profileData, isLoading: profileLoading, isError: profileError } = useQuery({
    queryKey: ["profile", token],
    queryFn: () => getProfile(token),
    enabled: !!token,
    retry: false,
  });
  const role = profileData?.data?.role;
  const isAdmin = role === "admin" || role === "super_admin";

  useEffect(() => {
    if (profileLoading) return;
    if (profileError) { signOut(); navigate("/login", { replace: true }); return; }
    if (profileData && !isAdmin) navigate("/account", { replace: true });
  }, [profileLoading, profileError, profileData, isAdmin, navigate, signOut]);

  if (authLoading || !user || profileLoading || profileError || !isAdmin) return null;

  const isItemActive = (item) =>
    item.match.some((m) => location.pathname === m || location.pathname.startsWith(`${m}/`));

  return (
    <div className="admin-shell">
      <ToastProvider>
        <aside className="admin-sidebar">
          <div className="admin-sidebar__brand">
            <span className="admin-sidebar__brand-mark">TIBR</span>
            <span className="admin-sidebar__brand-tag">Admin</span>
          </div>

          <nav className="admin-sidebar__nav" aria-label="Admin sections">
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.label}
                to={item.to}
                className={`admin-sidebar__link${isItemActive(item) ? " is-active" : ""}`}
              >
                {item.icon}
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="admin-sidebar__footer">
            <div className="admin-sidebar__user">
              <span className="admin-sidebar__user-email">{user.email}</span>
              <span className="admin-sidebar__user-role">{role === "super_admin" ? "Super Admin" : "Admin"}</span>
            </div>
            <NavLink className="admin-sidebar__action" to="/shop">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              View store
            </NavLink>
            <button
              type="button"
              className="admin-sidebar__action admin-sidebar__action--danger"
              onClick={async () => { await signOut(); navigate("/"); }}
            >
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Sign out
            </button>
          </div>
        </aside>

        <Outlet />
      </ToastProvider>
    </div>
  );
}
