import { create } from "zustand";

// Controls the auth popup opened from the header. mode: null | "login" | "signup".
export const useAuthModal = create((set) => ({
  mode: null,
  openLogin: () => set({ mode: "login" }),
  openSignup: () => set({ mode: "signup" }),
  closeModal: () => set({ mode: null }),
}));
