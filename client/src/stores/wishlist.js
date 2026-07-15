import { create } from "zustand";
import { getWishlist, addToWishlist, removeFromWishlist } from "@/lib/api";

// Saving is account-bound (there's an Account → Wishlist tab to show it), so
// unlike the cart there's no guest/localStorage mode — `toggle` requires a
// token and the caller is responsible for sending signed-out users to /login.
export const useWishlist = create((set, get) => ({
  ids: new Set(),
  items: [],
  loaded: false,

  // Called from main.jsx whenever the auth token changes (sign in/out, or
  // initial session resolution) so the store always reflects who's logged in.
  load: async (token) => {
    if (!token) {
      set({ ids: new Set(), items: [], loaded: true });
      return;
    }
    try {
      const { data } = await getWishlist(token);
      set({ items: data, ids: new Set(data.map((p) => p.id)), loaded: true });
    } catch {
      set({ loaded: true });
    }
  },

  has: (productId) => get().ids.has(productId),

  toggle: async (product, token) => {
    const id = product.id;
    const wasSaved = get().ids.has(id);

    set((s) => {
      const ids = new Set(s.ids);
      if (wasSaved) {
        ids.delete(id);
        return { ids, items: s.items.filter((p) => p.id !== id) };
      }
      ids.add(id);
      return { ids, items: [product, ...s.items] };
    });

    try {
      if (wasSaved) await removeFromWishlist(id, token);
      else await addToWishlist(id, token);
      return !wasSaved;
    } catch (e) {
      // Roll back the optimistic update on a failed request.
      set((s) => {
        const ids = new Set(s.ids);
        if (wasSaved) ids.add(id);
        else ids.delete(id);
        return {
          ids,
          items: wasSaved ? [product, ...s.items] : s.items.filter((p) => p.id !== id),
        };
      });
      throw e;
    }
  },
}));
