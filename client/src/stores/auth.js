import { create } from "zustand";

// supabase-js is ~212 kB — a static import here put it in the entry chunk, so
// every visitor downloaded and parsed the whole auth SDK before the landing
// hero could paint, even though an anonymous shopper never touches it. Loading
// it on first use keeps it out of the critical path; the import is cached after
// the first call, and every consumer below is already async so nothing else
// changes. (Pages that genuinely need the client — Login, SecurityCenter,
// AdminCustomer — are lazy routes, so they pull the same chunk on demand.)
let clientPromise = null;
const getSupabase = () => {
  if (!clientPromise) clientPromise = import("@/lib/supabase").then((m) => m.supabase);
  return clientPromise;
};

// `token` is stored as plain state (not a getter): Zustand's set() does
// Object.assign({}, state, partial), which would evaluate a getter once and
// freeze its value — silently breaking every authenticated request.
export const useAuth = create((set) => ({
  user: null,
  session: null,
  token: null,
  loading: true,

  init: async () => {
    const supabase = await getSupabase();
    const { data: { session } } = await supabase.auth.getSession();
    set({ session, user: session?.user ?? null, token: session?.access_token ?? null, loading: false });

    supabase.auth.onAuthStateChange((_event, session) => {
      set({ session, user: session?.user ?? null, token: session?.access_token ?? null });
    });
  },

  signIn: async (email, password) => {
    const supabase = await getSupabase();
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    set({ session: data.session, user: data.user, token: data.session?.access_token ?? null });
    return data;
  },

  signUp: async (email, password, meta = {}) => {
    const supabase = await getSupabase();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: meta },
    });
    if (error) throw error;
    return data;
  },

  signOut: async () => {
    const supabase = await getSupabase();
    await supabase.auth.signOut();
    set({ session: null, user: null, token: null });
  },
}));
