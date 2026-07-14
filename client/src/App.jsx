import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useEffect } from "react";
import AppShell from "@/components/layout/AppShell";
import AdminLayout from "@/components/layout/AdminLayout";

function StartAtHomeAndScroll() {
  const { pathname } = useLocation();

  // Disable browser scroll restoration once, on initial mount
  useEffect(() => {
    if ('scrollRestoration' in history) {
      history.scrollRestoration = 'manual';
    }
  }, []);

  // Scroll to top on every navigation change
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}
import Collection from "@/pages/shop/Collection";
import ShopLayout from "@/components/layout/ShopLayout";
import ShopHome from "@/pages/shop/ShopHome";
import AboutPage from "@/pages/shop/AboutPage";
import CollectionPage from "@/pages/shop/CollectionPage";
import BrandDirectory from "@/pages/shop/BrandDirectory";
import BrandCollection from "@/pages/shop/BrandCollection";
import Blog from "@/pages/Blog";
import BlogPost from "@/pages/BlogPost";
import Product from "@/pages/Product";
import Cart from "@/pages/Cart";
import Checkout from "@/pages/Checkout";
import Login from "@/pages/Login";
import Signup from "@/pages/Signup";
import Account from "@/pages/Account";
import AdminOrders from "@/pages/AdminOrders";
import AdminProducts from "@/pages/AdminProducts";
import AdminCustomers from "@/pages/AdminCustomers";
import AdminCustomer from "@/pages/AdminCustomer";
import AdminDiscounts from "@/pages/AdminDiscounts";
import AdminDiscount from "@/pages/AdminDiscount";
import AdminProduct from "@/pages/AdminProduct";

export default function App() {
  return (
    <BrowserRouter>
      <StartAtHomeAndScroll />
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
            <Route path="/about" element={<AboutPage />} />
            <Route path="/shop/all" element={<CollectionPage />} />
            <Route path="/shop/perfumes" element={<CollectionPage />} />
            <Route path="/shop/men" element={<CollectionPage />} />
            <Route path="/shop/women" element={<CollectionPage />} />
            <Route path="/shop/unisex" element={<CollectionPage />} />
            <Route path="/shop/original" element={<CollectionPage />} />
            <Route path="/shop/inspired" element={<CollectionPage />} />
            <Route path="/shop/signature" element={<CollectionPage />} />
            <Route path="/shop/arabian" element={<CollectionPage />} />
            <Route path="/shop/niche" element={<CollectionPage />} />
            <Route path="/shop/candles" element={<CollectionPage />} />
            <Route path="/shop/bakhoor" element={<CollectionPage />} />
            <Route path="/shop/home-fragrance" element={<CollectionPage />} />
            <Route path="/shop/sets" element={<CollectionPage />} />
            <Route path="/shop/samples" element={<CollectionPage />} />
            <Route path="/shop/new-arrivals" element={<CollectionPage />} />
            <Route path="/shop/brands" element={<BrandDirectory />} />
            <Route path="/shop/brands/:brand" element={<BrandCollection />} />
          </Route>

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
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
