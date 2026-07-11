import { Outlet } from "react-router-dom";
import ShopNav from "./ShopNav";

// Wraps every /shop/* route so the O2morny-style category bar renders on the
// shop surface only — the landing (`/`) header is untouched.
export default function ShopLayout() {
  return (
    <>
      <ShopNav />
      <Outlet />
    </>
  );
}
