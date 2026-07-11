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
import Fragrances from "@/pages/shop/Fragrances";
import SamplesTravel from "@/pages/shop/SamplesTravel";
import Bundle from "@/pages/shop/Bundle";
import BrandDirectory from "@/pages/shop/BrandDirectory";
import BrandCollection from "@/pages/shop/BrandCollection";
import NewArrivals from "@/pages/shop/NewArrivals";
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

          {/* Shop surface — O2morny-style tabs (ShopNav bar via ShopLayout) */}
          <Route element={<ShopLayout />}>
            <Route path="/shop" element={<ShopHome />} />
            <Route path="/shop/fragrances" element={<Fragrances />} />
            <Route path="/shop/fragrances/:sub" element={<Fragrances />} />
            <Route path="/shop/samples" element={<SamplesTravel />} />
            <Route path="/shop/samples/:sub" element={<SamplesTravel />} />
            <Route path="/shop/bundle" element={<Bundle />} />
            <Route path="/shop/bundle/:sub" element={<Bundle />} />
            <Route path="/shop/brands" element={<BrandDirectory />} />
            <Route path="/shop/brands/:brand" element={<BrandCollection />} />
            <Route path="/shop/new-arrivals" element={<NewArrivals />} />
          </Route>

          {/* Legacy category URLs → new tabs */}
          <Route path="/shop/perfumes" element={<Navigate to="/shop/fragrances" replace />} />
          <Route path="/shop/perfumes/original" element={<Navigate to="/shop/fragrances" replace />} />
          <Route path="/shop/perfumes/inspired" element={<Navigate to="/shop/fragrances" replace />} />
          <Route path="/shop/perfumes/signature" element={<Navigate to="/shop/fragrances" replace />} />
          <Route path="/shop/bakhoor" element={<Navigate to="/shop/fragrances/candles" replace />} />
          <Route path="/shop/home-fragrance" element={<Navigate to="/shop/fragrances/air-fresheners" replace />} />
          <Route path="/shop/body-splash" element={<Navigate to="/shop/fragrances" replace />} />

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
