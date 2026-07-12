import { create } from "zustand";
import { persist } from "zustand/middleware";

// A cart line is a VARIANT, not a product: 50ml and 100ml are different prices,
// different stock, different SKUs, and must be separate lines. The server prices
// the order from variant_id — the client never gets to say what something costs.
const pickVariant = (product, variant) =>
  variant
  || product.variants?.find((v) => v.is_default)
  || product.variants?.[0]
  || null;

export const useCart = create(
  persist(
    (set) => ({
      items: [],

      addItem: (product, variant = null, qty = 1) =>
        set((s) => {
          const v = pickVariant(product, variant);
          // Key on the variant when there is one; fall back to the product so a
          // legacy persisted cart still behaves.
          const key = v ? `v:${v.id}` : `p:${product.id}`;

          const existing = s.items.find((i) => i.key === key);
          if (existing) {
            return {
              items: s.items.map((i) =>
                i.key === key ? { ...i, qty: i.qty + qty } : i
              ),
            };
          }

          return {
            items: [
              ...s.items,
              {
                key,
                product,
                variantId: v?.id ?? null,
                size: v?.size_label ?? null,
                price: v ? Number(v.price) : (product.price ?? 0),
                qty,
              },
            ],
          };
        }),

      removeItem: (key) =>
        set((s) => ({ items: s.items.filter((i) => i.key !== key) })),

      updateQty: (key, qty) =>
        set((s) => ({
          items:
            qty < 1
              ? s.items.filter((i) => i.key !== key)
              : s.items.map((i) => (i.key === key ? { ...i, qty } : i)),
        })),

      clear: () => set({ items: [] }),
    }),
    {
      name: "rb-cart",
      version: 2,
      // v1 carried { product, size } and no price/variantId; the server can
      // still resolve those (productId + size -> variant), so keep them rather
      // than emptying someone's cart on deploy.
      migrate: (state) => ({
        ...state,
        items: (state?.items ?? []).map((i) => ({
          ...i,
          variantId: i.variantId ?? null,
          price: i.price ?? i.product?.price ?? 0,
        })),
      }),
    }
  )
);
