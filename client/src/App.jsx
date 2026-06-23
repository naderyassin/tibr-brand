import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useEffect } from "react";
import AppShell from "@/components/layout/AppShell";

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}
import Collection from "@/pages/shop/Collection";
import Perfumes from "@/pages/shop/Perfumes";
import Product from "@/pages/Product";
import Cart from "@/pages/Cart";
import Checkout from "@/pages/Checkout";
import Login from "@/pages/Login";
import Signup from "@/pages/Signup";
import Account from "@/pages/Account";
import Admin from "@/pages/Admin";
import AdminProduct from "@/pages/AdminProduct";

export default function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <Routes>
        <Route element={<AppShell />}>
          {/* Catalog */}
          <Route path="/" element={<Collection />} />
          <Route path="/shop/perfumes" element={<Perfumes />} />

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

          {/* Admin */}
          <Route path="/admin" element={<Admin />} />
          <Route path="/admin/product" element={<AdminProduct />} />

          {/* Fallback → perfumes */}
          <Route path="*" element={<Navigate to="/shop/perfumes" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
