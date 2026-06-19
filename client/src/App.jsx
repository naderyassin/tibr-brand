import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import AppShell from "@/components/layout/AppShell";
import Perfumes from "@/pages/shop/Perfumes";
import Clothing from "@/pages/shop/Clothing";
import Sneakers from "@/pages/shop/Sneakers";
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
      <Routes>
        <Route element={<AppShell />}>
          {/* Catalog */}
          <Route path="/shop/perfumes" element={<Perfumes />} />
          {/* Clothing & Sneakers on hold — pages kept, redirect until ready */}
          <Route path="/shop/clothing" element={<Navigate to="/shop/perfumes" replace />} />
          <Route path="/shop/sneakers" element={<Navigate to="/shop/perfumes" replace />} />

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
