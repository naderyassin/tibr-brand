import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { lazy, Suspense, useEffect } from "react";
import AppShell from "@/components/layout/AppShell";

function StartAtHomeAndScroll() {
  const { pathname } = useLocation();

  // Disable browser scroll restoration once, on initial mount
  useEffect(() => {
    if ('scrollRestoration' in history) {
      history.scrollRestoration = 'manual';
    }
  }, []);

  // Scroll to top on every navigation change. Lenis owns the scroll, so a plain
  // window.scrollTo(0,0) gets overwritten on the next animation frame — reset
  // THROUGH Lenis (immediate + force, so it wins even while the drawer has
  // scrolling locked). Fall back to native for the first frames before Lenis
  // initializes.
  useEffect(() => {
    const lenis = window.__lenis;
    if (lenis) lenis.scrollTo(0, { immediate: true, force: true });
    else window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}
// Eager: the landing at "/" (first paint) and the shop shell + listing page
// (the SPA fallback target and the most common entry). Everything else is
// code-split per route so storefront visitors never download the admin
// surface, the Jodit editor, Leaflet, or the notes catalog.
import Collection from "@/pages/shop/Collection";
import ShopLayout from "@/components/layout/ShopLayout";
import ShopHome from "@/pages/shop/ShopHome";
import CollectionPage from "@/pages/shop/CollectionPage";

const AboutPage = lazy(() => import("@/pages/shop/AboutPage"));
const Signature = lazy(() => import("@/pages/shop/Signature"));
const BrandDirectory = lazy(() => import("@/pages/shop/BrandDirectory"));
const BrandCollection = lazy(() => import("@/pages/shop/BrandCollection"));
const Blog = lazy(() => import("@/pages/Blog"));
const BlogPost = lazy(() => import("@/pages/BlogPost"));
const Product = lazy(() => import("@/pages/Product"));
const Cart = lazy(() => import("@/pages/Cart"));
const Checkout = lazy(() => import("@/pages/Checkout"));
const CheckoutCallback = lazy(() => import("@/pages/CheckoutCallback"));
const Login = lazy(() => import("@/pages/Login"));
const Signup = lazy(() => import("@/pages/Signup"));
const Account = lazy(() => import("@/pages/Account"));
const AdminLayout = lazy(() => import("@/components/layout/AdminLayout"));
const AdminOrders = lazy(() => import("@/pages/AdminOrders"));
const AdminProducts = lazy(() => import("@/pages/AdminProducts"));
const AdminCustomers = lazy(() => import("@/pages/AdminCustomers"));
const AdminCustomer = lazy(() => import("@/pages/AdminCustomer"));
const AdminDiscounts = lazy(() => import("@/pages/AdminDiscounts"));
const AdminDiscount = lazy(() => import("@/pages/AdminDiscount"));
const AdminProduct = lazy(() => import("@/pages/AdminProduct"));
const AdminProductImport = lazy(() => import("@/pages/AdminProductImport"));

export default function App() {
  return (
    <BrowserRouter>
      <StartAtHomeAndScroll />
      {/* Route chunks resolve in well under a frame on repeat visits; the
          fallback stays blank rather than flashing a spinner. */}
      <Suspense fallback={null}>
      <Routes>
        <Route element={<AppShell />}>
          {/* Landing */}
          <Route path="/" element={<Collection />} />

          {/* Shop surface. Every listing below is the SAME component — the path
              only seeds a filter preset (see ROUTE_PRESETS in lib/shopNav.js),
              and the query string refines it. Adding a shoppable category means
              adding a preset, not a page. */}
          <Route element={<ShopLayout />}>
            <Route path="/shop" element={<ShopHome />} />
            <Route path="/shop/all" element={<CollectionPage />} />
            <Route path="/shop/perfumes" element={<CollectionPage />} />
            <Route path="/shop/men" element={<CollectionPage />} />
            <Route path="/shop/women" element={<CollectionPage />} />
            <Route path="/shop/unisex" element={<CollectionPage />} />
            <Route path="/shop/original" element={<CollectionPage />} />
            <Route path="/shop/inspired" element={<CollectionPage />} />
            {/* Not a filtered listing — a 4-step quiz + ranked-match result.
                See client/src/pages/shop/Signature.jsx. Still nested under
                ShopLayout for the shared nav; ShopLayout itself has no
                grid/listing assumptions (just <ShopNav/> + <Outlet/>). */}
            <Route path="/shop/signature" element={<Signature />} />
            <Route path="/shop/arabian" element={<CollectionPage />} />
            <Route path="/shop/niche" element={<CollectionPage />} />
            <Route path="/shop/candles" element={<CollectionPage />} />
            <Route path="/shop/bakhoor" element={<CollectionPage />} />
            <Route path="/shop/home-fragrance" element={<CollectionPage />} />
            <Route path="/shop/sets" element={<CollectionPage />} />
            <Route path="/shop/samples" element={<CollectionPage />} />
            <Route path="/shop/new-arrivals" element={<CollectionPage />} />
            <Route path="/shop/spotlight" element={<CollectionPage />} />
            <Route path="/shop/bestsellers" element={<CollectionPage />} />
            <Route path="/shop/offers" element={<CollectionPage />} />
            <Route path="/shop/brands" element={<BrandDirectory />} />
            <Route path="/shop/brands/:brand" element={<BrandCollection />} />
          </Route>

          <Route path="/about" element={<AboutPage />} />

          {/* Retired URLs. The old sub-paths encoded a taxonomy that never
              existed in the database; they now resolve to the equivalent filter. */}
          <Route path="/shop/fragrances" element={<Navigate to="/shop/perfumes" replace />} />
          <Route path="/shop/fragrances/men" element={<Navigate to="/shop/perfumes?audience=men" replace />} />
          <Route path="/shop/fragrances/women" element={<Navigate to="/shop/perfumes?audience=women" replace />} />
          <Route path="/shop/fragrances/unisex" element={<Navigate to="/shop/perfumes?audience=unisex" replace />} />
          <Route path="/shop/fragrances/gulf" element={<Navigate to="/shop/arabian" replace />} />
          <Route path="/shop/fragrances/sets" element={<Navigate to="/shop/sets" replace />} />
          <Route path="/shop/fragrances/candles" element={<Navigate to="/shop/candles" replace />} />
          <Route path="/shop/fragrances/air-fresheners" element={<Navigate to="/shop/home-fragrance" replace />} />
          <Route path="/shop/fragrances/:sub" element={<Navigate to="/shop/perfumes" replace />} />
          <Route path="/shop/samples/:sub" element={<Navigate to="/shop/samples" replace />} />
          <Route path="/shop/bundle" element={<Navigate to="/shop/sets" replace />} />
          <Route path="/shop/bundle/:sub" element={<Navigate to="/shop/sets" replace />} />
          <Route path="/shop/perfumes/original" element={<Navigate to="/shop/original" replace />} />
          <Route path="/shop/perfumes/inspired" element={<Navigate to="/shop/inspired" replace />} />
          <Route path="/shop/perfumes/signature" element={<Navigate to="/shop/signature" replace />} />
          <Route path="/shop/body-splash" element={<Navigate to="/shop/all?concentration=mist" replace />} />

          {/* Blog */}
          <Route path="/blog" element={<Blog />} />
          <Route path="/blog/:slug" element={<BlogPost />} />

          {/* Product detail */}
          <Route path="/product" element={<Product />} />

          {/* Cart & checkout */}
          <Route path="/cart" element={<Cart />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/checkout/callback" element={<CheckoutCallback />} />

          {/* Auth */}
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />

          {/* Account */}
          <Route path="/account" element={<Account />} />
          <Route path="/wishlist" element={<Navigate to="/account?tab=wishlist" replace />} />

          {/* Fallback → shop home */}
          <Route path="*" element={<Navigate to="/shop" replace />} />
        </Route>

        {/* Admin — own shell, no storefront header/footer */}
        <Route element={<AdminLayout />}>
          <Route path="/admin" element={<Navigate to="/admin/orders" replace />} />
          <Route path="/admin/orders" element={<AdminOrders />} />
          <Route path="/admin/products" element={<AdminProducts />} />
          <Route path="/admin/customers" element={<AdminCustomers />} />
          <Route path="/admin/customers/:id" element={<AdminCustomer />} />
          <Route path="/admin/discounts" element={<AdminDiscounts />} />
          <Route path="/admin/discounts/new" element={<AdminDiscount />} />
          <Route path="/admin/discounts/:id" element={<AdminDiscount />} />
          <Route path="/admin/product" element={<AdminProduct />} />
          <Route path="/admin/products/import" element={<AdminProductImport />} />
        </Route>
      </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
