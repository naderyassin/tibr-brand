import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/stores/auth";
import { getProfile, adminGetOrders } from "@/lib/api";
import { ToastProvider } from "@/components/ui/Toast";
import "../../styles/store/admin.css";

const NAV_ITEMS = [
  {
    label: "Overview",
    to: "/admin",
    match: ["/admin"],
    exact: true,
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
        <rect x="3.5" y="3.5" width="7" height="7" rx="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        <rect x="13.5" y="3.5" width="7" height="7" rx="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        <rect x="3.5" y="13.5" width="7" height="7" rx="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        <rect x="13.5" y="13.5" width="7" height="7" rx="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  },
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

  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [theme, setTheme] = useState(
    () => localStorage.getItem("admin-theme") || "light"
  );

  const toggleTheme = () => {
    setTheme((prev) => {
      const next = prev === "light" ? "dark" : "light";
      localStorage.setItem("admin-theme", next);
      return next;
    });
  };

  useEffect(() => {
    if (theme === "dark") {
      document.documentElement.classList.add("theme-dark");
      document.documentElement.classList.remove("theme-light");
    } else {
      document.documentElement.classList.add("theme-light");
      document.documentElement.classList.remove("theme-dark");
    }
    return () => {
      document.documentElement.classList.remove("theme-dark", "theme-light");
    };
  }, [theme]);

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

  // Shares the ["admin-orders"] cache with the dashboard/orders pages, so this
  // costs no extra request once either page has loaded.
  const { data: ordersData } = useQuery({
    queryKey: ["admin-orders", token],
    queryFn: () => adminGetOrders(token),
    enabled: !!token && isAdmin,
  });
  const pendingCount =
    ordersData?.data?.filter((o) => o.status === "pending").length ?? 0;

  if (authLoading || !user || profileLoading || profileError || !isAdmin) return null;

  const isItemActive = (item) =>
    item.exact
      ? item.match.includes(location.pathname)
      : item.match.some((m) => location.pathname === m || location.pathname.startsWith(`${m}/`));

  return (
    <div className={`admin-shell theme-${theme}`}>
      <ToastProvider>
        {/* Mobile Header Bar */}
        <header className="admin-header-bar">
          <button
            type="button"
            className="admin-menu-toggle"
            onClick={() => setIsMobileOpen(true)}
            aria-label="Open navigation menu"
          >
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
              <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" />
            </svg>
          </button>
          <span className="admin-header-brand-mark">TIBR</span>
        </header>

        {/* Mobile Sidebar Scrim */}
        {isMobileOpen && (
          <div
            className="admin-sidebar-scrim"
            onClick={() => setIsMobileOpen(false)}
            aria-hidden="true"
          />
        )}

        <aside className={`admin-sidebar${isMobileOpen ? " is-open" : ""}`}>
          <div className="admin-sidebar__brand">
            <span className="admin-sidebar__brand-mark">TIBR</span>
            <span className="admin-sidebar__brand-tag">Admin</span>
          </div>

          <nav className="admin-sidebar__nav" aria-label="Admin sections">
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.label}
                to={item.to}
                onClick={() => setIsMobileOpen(false)}
                className={`admin-sidebar__link${isItemActive(item) ? " is-active" : ""}`}
              >
                {item.icon}
                <span>{item.label}</span>
                {item.label === "Orders" && pendingCount > 0 && (
                  <span className="admin-sidebar__count" aria-label={`${pendingCount} pending`}>
                    {pendingCount}
                  </span>
                )}
              </NavLink>
            ))}
          </nav>

          <div className="admin-sidebar__footer">
            <div className="admin-sidebar__user">
              <span className="admin-sidebar__user-email">{user.email}</span>
              <span className="admin-sidebar__user-role">{role === "super_admin" ? "Super Admin" : "Admin"}</span>
            </div>

            {/* Theme Toggle Button */}
            <button
              type="button"
              className="admin-sidebar__action"
              onClick={toggleTheme}
              aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
            >
              {theme === "light" ? (
                <>
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                    <path d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m0-12.728l.707.707m10.607 10.607l.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <span>Light theme</span>
                </>
              ) : (
                <>
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                    <path d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <span>Dark theme</span>
                </>
              )}
            </button>

            <NavLink className="admin-sidebar__action" to="/shop">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span>View store</span>
            </NavLink>

            <button
              type="button"
              className="admin-sidebar__action admin-sidebar__action--danger"
              onClick={async () => { await signOut(); navigate("/"); }}
            >
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span>Sign out</span>
            </button>
          </div>
        </aside>

        <div className={`admin-theme theme-${theme}`} style={{ display: "contents" }}>
          <Outlet />
        </div>
      </ToastProvider>
    </div>
  );
}
