import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useAuth } from "@/stores/auth";
import { useToast } from "@/components/ui/Toast";
import { supabase } from "@/lib/supabase";
import {
  getOrders, getProfile, updateProfile,
  getAddresses, addAddress, updateAddress, deleteAddress, setDefaultAddress,
} from "@/lib/api";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const GOVERNORATES = [
  "Cairo", "Giza", "Alexandria", "Qalyubia", "Dakahlia", "Sharqia",
  "Gharbia", "Monufia", "Beheira", "Kafr El Sheikh", "Damietta",
  "Port Said", "Ismailia", "Suez", "Faiyum", "Beni Suef", "Minya",
  "Asyut", "Sohag", "Qena", "Luxor", "Aswan", "Red Sea", "New Valley",
  "Matrouh", "North Sinai", "South Sinai",
];

const STATUS_META = {
  pending:   { label: "Pending",   dot: "var(--warning)",  bg: "oklch(0.808 0.105 72 / 0.12)", text: "var(--warning)" },
  confirmed: { label: "Confirmed", dot: "var(--info)",     bg: "oklch(0.760 0.060 232 / 0.12)", text: "var(--info)" },
  shipped:   { label: "Shipped",   dot: "var(--gold)",     bg: "var(--gold-ghost)",              text: "var(--gold)" },
  delivered: { label: "Delivered", dot: "var(--success)",  bg: "var(--success-fill)",            text: "var(--success)" },
  cancelled: { label: "Cancelled", dot: "var(--danger)",   bg: "var(--danger-fill)",             text: "var(--danger)" },
};

const GOV_SLUG_MAP = {
  "cairo": "Cairo", "giza": "Giza", "alexandria": "Alexandria",
  "qalyubia": "Qalyubia", "dakahlia": "Dakahlia", "sharqia": "Sharqia",
  "gharbia": "Gharbia", "monufia": "Monufia", "beheira": "Beheira",
  "kafr-el-sheikh": "Kafr El Sheikh", "damietta": "Damietta",
  "port-said": "Port Said", "ismailia": "Ismailia", "suez": "Suez",
  "faiyum": "Faiyum", "beni-suef": "Beni Suef", "minya": "Minya",
  "asyut": "Asyut", "sohag": "Sohag", "qena": "Qena", "luxor": "Luxor",
  "aswan": "Aswan", "red-sea": "Red Sea", "new-valley": "New Valley",
  "matrouh": "Matrouh", "north-sinai": "North Sinai", "south-sinai": "South Sinai",
};

const TABS = [
  {
    id: "orders", label: "Orders",
    icon: (
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
        <rect x="4" y="2" width="12" height="16" rx="1.5" strokeLinejoin="round" />
        <path d="M7 7h6M7 10h6M7 13h4" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    id: "profile", label: "Profile",
    icon: (
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
        <circle cx="10" cy="6" r="3.5" />
        <path d="M3 17c0-3.314 3.134-6 7-6s7 2.686 7 6" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    id: "addresses", label: "Addresses",
    icon: (
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
        <path d="M10 18s-7-4.5-7-10a7 7 0 0 1 14 0c0 5.5-7 10-7 10z" strokeLinejoin="round" />
        <circle cx="10" cy="8" r="2.5" />
      </svg>
    ),
  },
  {
    id: "wishlist", label: "Wishlist",
    icon: (
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
        <path d="M10 17s-8-4.8-8-9.5A4.5 4.5 0 0 1 10 4.2 4.5 4.5 0 0 1 18 7.5C18 12.2 10 17 10 17z" strokeLinejoin="round" />
      </svg>
    ),
  },
];

function StatusPill({ status }) {
  const meta = STATUS_META[status] ?? STATUS_META.pending;
  return (
    <span
      className="order-status-pill"
      style={{ "--sb-bg": meta.bg, "--sb-text": meta.text, "--sb-dot": meta.dot }}
    >
      <span className="order-status-pill__dot" aria-hidden="true" />
      {meta.label}
    </span>
  );
}

// An order IS a row now, with its lines attached. The old client-side grouping
// by checkout_reference existed only because `orders` stored one row per line.
function groupOrders(orders) {
  return (orders || []).map((o) => ({
    key: o.id,
    ref: o.checkout_reference || o.id,
    created_at: o.created_at,
    status: o.status,
    order_total: o.total,
    items: o.order_items || [],
  }));
}

function OrderCard({ group }) {
  const [open, setOpen] = useState(false);
  const ref = (group.ref || group.key || "").slice(0, 8).toUpperCase();
  const dateStr = new Date(group.created_at).toLocaleDateString("en-GB", {
    day: "numeric", month: "short", year: "numeric",
  });

  return (
    <div className={`order-card${open ? " is-open" : ""}`}>
      <button
        type="button"
        className="order-card__trigger"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <div className="order-card__thumbs">
          {group.items.slice(0, 3).map((item, i) =>
            item.image_snapshot ? (
              <img
                key={item.id}
                className="order-card__thumb"
                src={item.image_snapshot}
                alt={item.name_snapshot || ""}
                style={{ zIndex: 3 - i }}
              />
            ) : (
              <div key={item.id} className="order-card__thumb order-card__thumb--empty" style={{ zIndex: 3 - i }} />
            )
          )}
          {group.items.length > 3 && (
            <div className="order-card__thumb order-card__thumb--more">+{group.items.length - 3}</div>
          )}
        </div>

        <div className="order-card__meta">
          <span className="order-card__ref">#{ref}</span>
          <span className="order-card__sub">
            {dateStr}
            <span className="order-card__dot-sep" aria-hidden="true" />
            {group.items.length} item{group.items.length !== 1 ? "s" : ""}
          </span>
        </div>

        <div className="order-card__aside">
          <StatusPill status={group.status || "pending"} />
          {group.order_total != null && (
            <span className="order-card__total">{Number(group.order_total).toLocaleString()} EGP</span>
          )}
        </div>

        <svg
          className={`order-card__chevron${open ? " is-open" : ""}`}
          width="16" height="16" viewBox="0 0 16 16" fill="none"
          aria-hidden="true"
        >
          <path d="M4 6L8 10L12 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div className="order-card__body">
          {/* Snapshots, not live product data — an order is a historical record.
              Renaming or repricing a product must not rewrite what was bought. */}
          {group.items.map((item) => {
            const name = item.name_snapshot || "Product";
            const price = item.unit_price;
            return (
              <div key={item.id} className="order-line">
                {item.image_snapshot ? (
                  <img className="order-line__img" src={item.image_snapshot} alt={name} />
                ) : (
                  <div className="order-line__img order-line__img--empty" />
                )}
                <div className="order-line__info">
                  <span className="order-line__name">{name}</span>
                  <div className="order-line__tags">
                    {item.size_snapshot && <span className="order-line__tag">{item.size_snapshot}</span>}
                    {item.qty > 1 && <span className="order-line__tag">×{item.qty}</span>}
                  </div>
                </div>
                {price != null && (
                  <span className="order-line__price">{Number(price).toLocaleString()} EGP</span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

const EMPTY_ADDR = { label: "Home", phone: "", governorate: "", street: "", is_default: false };

function AddrCardMap({ lat, lon }) {
  const ref = useRef(null);
  useEffect(() => {
    if (!ref.current || ref.current._lmap) return;
    const m = L.map(ref.current, {
      center: [lat, lon], zoom: 14,
      zoomControl: false, dragging: false,
      scrollWheelZoom: false, doubleClickZoom: false,
      boxZoom: false, keyboard: false, attributionControl: false,
    });
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19 }).addTo(m);
    L.marker([lat, lon]).addTo(m);
    ref.current._lmap = m;
    return () => { m.remove(); ref.current && (ref.current._lmap = null); };
  }, [lat, lon]);
  return <div ref={ref} className="addr-card__map" />;
}

export default function Account() {
  const [params, setParams] = useSearchParams();
  const tab = params.get("tab") || "orders";
  const { user, token, signOut, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const qc = useQueryClient();

  const [pwOpen, setPwOpen] = useState(false);
  const [pwForm, setPwForm] = useState({ current: "", next: "", confirm: "" });
  const [pwError, setPwError] = useState(null);
  const [pwLoading, setPwLoading] = useState(false);

  const [addrFormOpen, setAddrFormOpen] = useState(false);
  const [addrForm, setAddrForm] = useState(EMPTY_ADDR);
  const [addrSaving, setAddrSaving] = useState(false);
  const [editingAddrId, setEditingAddrId] = useState(null);

  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsCoords, setGpsCoords] = useState(null);
  const [addrLat, setAddrLat] = useState(null);
  const [addrLon, setAddrLon] = useState(null);
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);

  const [locSearch, setLocSearch] = useState("");
  const [locResults, setLocResults] = useState([]);
  const [locSearching, setLocSearching] = useState(false);
  const searchTimerRef = useRef(null);

  const searchLocation = (q) => {
    setLocSearch(q);
    clearTimeout(searchTimerRef.current);
    if (!q.trim()) { setLocResults([]); return; }
    searchTimerRef.current = setTimeout(() => {
      setLocSearching(true);
      fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=5&accept-language=en`, {
        headers: { "User-Agent": "TIBR/1.0 (nadeerysin@gmail.com)" },
      })
        .then((r) => r.json())
        .then((results) => { setLocResults(results); setLocSearching(false); })
        .catch(() => setLocSearching(false));
    }, 400);
  };

  const reverseGeocode = (lat, lon) => {
    fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&accept-language=en`, {
      headers: { "User-Agent": "TIBR/1.0 (nadeerysin@gmail.com)" },
    })
      .then((r) => r.json())
      .then((data) => {
        const addr = data.address || {};
        const sr = (addr.state || "").replace(/\s*governorate\s*/gi, "").trim().toLowerCase().replace(/\s+/g, "-");
        const govMatch = GOV_SLUG_MAP[sr] ||
          Object.entries(GOV_SLUG_MAP).find(([k]) => sr.includes(k) || k.includes(sr))?.[1];
        if (govMatch) setAddrForm((f) => ({ ...f, governorate: govMatch.toLowerCase().replace(/\s+/g, "-") }));
        if (addr.road) {
          const pts = [addr.road, addr.neighbourhood, addr.suburb].filter(Boolean);
          setAddrForm((f) => ({ ...f, street: pts.slice(0, 2).join(", ") }));
        }
      })
      .catch(() => {});
  };

  const pickSearchResult = (result) => {
    const lat = parseFloat(result.lat);
    const lon = parseFloat(result.lon);
    setAddrLat(lat); setAddrLon(lon);
    setGpsCoords({ lat, lon });
    setLocSearch(""); setLocResults([]);
    reverseGeocode(lat, lon);
  };

  const locateForAddress = () => {
    if (!navigator.geolocation) { toast("Geolocation not supported."); return; }
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude: lat, longitude: lon } = pos.coords;
        setGpsLoading(false);
        setAddrLat(lat); setAddrLon(lon);
        setGpsCoords({ lat, lon });
        reverseGeocode(lat, lon);
        toast("Location pinned — drag the marker to adjust");
      },
      (err) => {
        setGpsLoading(false);
        toast(err.code === 1 ? "Location access denied." : "Could not get your location.");
      },
      { enableHighAccuracy: true, timeout: 12000 },
    );
  };

  useEffect(() => {
    if (addrLat == null || addrLon == null || !mapContainerRef.current) return;
    if (!mapRef.current) {
      const m = L.map(mapContainerRef.current).setView([addrLat, addrLon], 15);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© <a href='https://openstreetmap.org/copyright'>OpenStreetMap</a>",
        maxZoom: 19,
      }).addTo(m);
      mapRef.current = m;
      markerRef.current = L.marker([addrLat, addrLon], { draggable: true }).addTo(m);
      markerRef.current.on("dragend", (e) => {
        const p = e.target.getLatLng();
        setAddrLat(p.lat); setAddrLon(p.lng);
        setGpsCoords({ lat: p.lat, lon: p.lng });
        reverseGeocode(p.lat, p.lng);
      });
      m.on("click", (e) => {
        setAddrLat(e.latlng.lat); setAddrLon(e.latlng.lng);
        setGpsCoords({ lat: e.latlng.lat, lon: e.latlng.lng });
        reverseGeocode(e.latlng.lat, e.latlng.lng);
      });
      setTimeout(() => m.invalidateSize(), 100);
    } else {
      markerRef.current?.setLatLng([addrLat, addrLon]);
      mapRef.current.panTo([addrLat, addrLon]);
    }
  }, [addrLat, addrLon]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!addrFormOpen && mapRef.current) {
      mapRef.current.remove();
      mapRef.current = null;
      markerRef.current = null;
      setGpsCoords(null);
      setAddrLat(null);
      setAddrLon(null);
    }
  }, [addrFormOpen]);

  useEffect(() => {
    if (!authLoading && !user) navigate("/login", { replace: true });
  }, [authLoading, user, navigate]);

  const { data: ordersData, isLoading: ordersLoading } = useQuery({
    queryKey: ["orders", token],
    queryFn: () => getOrders(token),
    enabled: !!token && tab === "orders",
  });

  const { data: profileData } = useQuery({
    queryKey: ["profile", token],
    queryFn: () => getProfile(token),
    enabled: !!token,
  });

  const { data: addressesData, isLoading: addrLoading } = useQuery({
    queryKey: ["addresses", token],
    queryFn: () => getAddresses(token),
    enabled: !!token && tab === "addresses",
  });

  const [profileForm, setProfileForm] = useState({ full_name: "", phone: "", gender: "", date_of_birth: "" });
  useEffect(() => {
    if (profileData?.data) {
      const p = profileData.data;
      setProfileForm({
        full_name: p.full_name || "",
        phone: p.phone || "",
        gender: p.gender || "",
        date_of_birth: p.date_of_birth || "",
      });
    }
  }, [profileData]);

  const { mutate: saveProfile, isPending: profileSaving } = useMutation({
    mutationFn: (body) => updateProfile(body, token),
    onSuccess: () => { toast("Profile saved!"); qc.invalidateQueries({ queryKey: ["profile"] }); },
    onError: (err) => toast(err.message || "Failed to save profile"),
  });

  const { mutate: removeAddress } = useMutation({
    mutationFn: (id) => deleteAddress(id, token),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["addresses"] }),
    onError: (err) => toast(err.message || "Failed to delete address"),
  });

  const { mutate: makeDefault } = useMutation({
    mutationFn: (id) => setDefaultAddress(id, token),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["addresses"] }),
    onError: (err) => toast(err.message || "Failed to set default"),
  });

  const openEditAddr = (addr) => {
    setAddrForm({
      label: addr.label || "Home",
      phone: addr.phone || "",
      governorate: addr.governorate || "",
      street: addr.street || "",
      is_default: addr.is_default || false,
    });
    setEditingAddrId(addr.id);
    if (addr.latitude != null) { setAddrLat(addr.latitude); setAddrLon(addr.longitude); }
    setAddrFormOpen(true);
  };

  const closeAddrForm = () => {
    setAddrFormOpen(false);
    setAddrForm(EMPTY_ADDR);
    setEditingAddrId(null);
  };

  const handleSaveAddr = async (e) => {
    e.preventDefault();
    if (!addrForm.governorate || !addrForm.street) {
      toast("Please fill in governorate and street address.");
      return;
    }
    setAddrSaving(true);
    try {
      const payload = { ...addrForm, latitude: addrLat, longitude: addrLon };
      if (editingAddrId) {
        await updateAddress(editingAddrId, payload, token);
        toast("Address updated!");
      } else {
        await addAddress(payload, token);
        toast("Address saved!");
      }
      qc.invalidateQueries({ queryKey: ["addresses"] });
      closeAddrForm();
    } catch (err) {
      toast(err.message || "Failed to save address");
    } finally {
      setAddrSaving(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPwError(null);
    if (pwForm.next.length < 8) { setPwError("Password must be at least 8 characters."); return; }
    if (pwForm.next !== pwForm.confirm) { setPwError("Passwords do not match."); return; }
    setPwLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: pwForm.next });
      if (error) throw error;
      toast("Password updated!");
      setPwOpen(false);
      setPwForm({ current: "", next: "", confirm: "" });
    } catch (err) {
      setPwError(err.message || "Failed to update password.");
    } finally {
      setPwLoading(false);
    }
  };

  if (authLoading || !user) return null;

  const isAdmin = profileData?.data?.role === "admin";
  const setTab = (id) => setParams({ tab: id });
  const addresses = addressesData?.data ?? [];

  const firstName = profileData?.data?.full_name?.split(/\s+/)[0] || null;
  const initials = (() => {
    const name = profileData?.data?.full_name;
    if (name) return name.split(/\s+/).slice(0, 2).map((n) => n[0]?.toUpperCase()).join("");
    return (user.email?.[0] || "?").toUpperCase();
  })();

  return (
    <div className="store-container">

      {/* ── Greeting header ── */}
      <div className="acct-greeting">
        <div className="acct-avatar">
          <span>{initials}</span>
        </div>
        <div className="acct-greeting__text">
          <h1 className="acct-greeting__name">
            {firstName ? `Welcome back, ${firstName}` : "My Account"}
          </h1>
          <p className="acct-greeting__email">{user.email}</p>
        </div>
      </div>

      <div className="dashboard">
        {/* ── Sidebar nav ── */}
        <nav className="dash-nav" aria-label="Account sections">
          <div className="dash-nav__group">
            {TABS.map((t) => (
              <button
                key={t.id}
                className="dash-nav__item"
                aria-current={tab === t.id ? "true" : undefined}
                type="button"
                onClick={() => setTab(t.id)}
              >
                {t.icon}
                <span>{t.label}</span>
              </button>
            ))}
          </div>

          {isAdmin && (
            <div className="dash-nav__admin">
              <Link className="dash-nav__item dash-nav__item--admin" to="/admin">
                <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                  <path d="M10 2l2.5 6H18l-4.5 3.3 1.7 5.7L10 13.5 4.8 17 6.5 11.3 2 8h5.5z" strokeLinejoin="round" />
                </svg>
                <span>Control panel</span>
              </Link>
            </div>
          )}

          <div className="dash-nav__footer">
            <button
              className="dash-nav__item dash-nav__item--danger"
              type="button"
              onClick={async () => { await signOut(); navigate("/"); }}
            >
              <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                <path d="M13 3h4a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1h-4" strokeLinecap="round" />
                <path d="M9 14l-4-4 4-4M5 10h9" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span>Sign out</span>
            </button>
          </div>
        </nav>

        {/* ── Tab content ── */}
        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
        >

          {/* ── Orders ── */}
          {tab === "orders" && (
            <div className="dash-panel is-active">
              <div className="dash-panel__head">
                <h2 className="dash-panel__title">Orders</h2>
              </div>

              {ordersLoading ? (
                <div className="dash-orders">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="order-card-skel">
                      <div className="order-card-skel__thumbs">
                        <span className="skel skel--thumb" />
                        <span className="skel skel--thumb" />
                      </div>
                      <div className="order-card-skel__meta">
                        <span className="skel skel--ref" />
                        <span className="skel skel--date" />
                      </div>
                      <span className="skel skel--badge" />
                    </div>
                  ))}
                </div>
              ) : !ordersData?.data?.length ? (
                <div className="dash-empty">
                  <svg width="40" height="40" viewBox="0 0 40 40" fill="none" aria-hidden="true">
                    <rect x="8" y="4" width="24" height="32" rx="2" stroke="currentColor" strokeWidth="1.4" />
                    <path d="M14 13h12M14 19h12M14 25h8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                  </svg>
                  <p className="dash-empty__title">No orders yet</p>
                  <p className="dash-empty__sub">Your orders will appear here once you start shopping</p>
                  <Link className="btn btn--primary" to="/shop/perfumes">Start shopping</Link>
                </div>
              ) : (
                <div className="dash-orders">
                  {groupOrders(ordersData.data).map((g) => <OrderCard key={g.key} group={g} />)}
                </div>
              )}
            </div>
          )}

          {/* ── Profile ── */}
          {tab === "profile" && (
            <div className="dash-panel is-active">
              {/* Profile header */}
              <div className="profile-head">
                <div className="acct-avatar acct-avatar--lg">
                  <span>{initials}</span>
                </div>
                <div>
                  <p className="profile-head__name">{profileForm.full_name || user.email?.split("@")[0]}</p>
                  <p className="profile-head__email">{user.email}</p>
                </div>
              </div>

              {/* Personal info */}
              <div className="dash-section">
                <h3 className="dash-section__title">Personal info</h3>
                <form
                  className="dash-form"
                  noValidate
                  onSubmit={(e) => { e.preventDefault(); saveProfile(profileForm); }}
                >
                  <div className="field">
                    <label className="field__label" htmlFor="pf-name">Full name</label>
                    <input
                      id="pf-name"
                      className="input"
                      value={profileForm.full_name}
                      onChange={(e) => setProfileForm((f) => ({ ...f, full_name: e.target.value }))}
                      autoComplete="name"
                      placeholder="Your name"
                    />
                  </div>
                  <div className="field">
                    <label className="field__label" htmlFor="pf-phone">Phone</label>
                    <input
                      id="pf-phone"
                      className="input"
                      type="tel"
                      inputMode="numeric"
                      value={profileForm.phone}
                      onChange={(e) => setProfileForm((f) => ({ ...f, phone: e.target.value }))}
                      autoComplete="tel"
                      placeholder="01XXXXXXXXX"
                    />
                  </div>
                  <div className="field">
                    <label className="field__label" htmlFor="pf-gender">Gender</label>
                    <div className="select-field">
                      <select
                        id="pf-gender"
                        className="select"
                        value={profileForm.gender}
                        onChange={(e) => setProfileForm((f) => ({ ...f, gender: e.target.value }))}
                      >
                        <option value="">Select</option>
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                      </select>
                      <svg className="select-field__chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
                    </div>
                  </div>
                  <div className="field">
                    <label className="field__label" htmlFor="pf-dob">Date of birth</label>
                    <input
                      id="pf-dob"
                      className="input"
                      type="date"
                      value={profileForm.date_of_birth}
                      onChange={(e) => setProfileForm((f) => ({ ...f, date_of_birth: e.target.value }))}
                    />
                  </div>
                  <div className="field--full dash-form__actions">
                    <button
                      className={`btn btn--primary${profileSaving ? " is-loading" : ""}`}
                      type="submit"
                      disabled={profileSaving}
                    >
                      {profileSaving ? "" : "Save changes"}
                    </button>
                  </div>
                </form>
              </div>

              {/* Account / security */}
              <div className="dash-section">
                <div className="dash-section__row">
                  <div>
                    <h3 className="dash-section__title">Account</h3>
                    <p className="dash-section__sub">Email and password settings</p>
                  </div>
                </div>
                <div className="dash-section__fields">
                  <div className="field">
                    <label className="field__label" htmlFor="pf-email">Email</label>
                    <input
                      id="pf-email"
                      className="input"
                      type="email"
                      value={user.email}
                      readOnly
                    />
                    <p className="field__hint">Email can&apos;t be changed here.</p>
                  </div>
                  <div className="dash-security-row">
                    <div>
                      <p className="dash-security-row__label">Password</p>
                      <p className="dash-security-row__sub">Last changed: unknown</p>
                    </div>
                    <button className="btn btn--secondary" type="button" onClick={() => setPwOpen(true)}>
                      Change password
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── Addresses ── */}
          {tab === "addresses" && (
            <div className="dash-panel is-active">
              <div className="dash-panel__head">
                <h2 className="dash-panel__title">Addresses</h2>
                {!addrFormOpen && (
                  <button className="btn btn--secondary" type="button" onClick={() => setAddrFormOpen(true)}>
                    + Add address
                  </button>
                )}
              </div>

              {addrLoading ? (
                <p style={{ color: "var(--muted)", fontSize: "var(--fs-sm)" }}>Loading addresses…</p>
              ) : addresses.length === 0 && !addrFormOpen ? (
                <div className="dash-empty">
                  <svg width="36" height="36" viewBox="0 0 36 36" fill="none" aria-hidden="true">
                    <path d="M18 32s-13-8-13-18a13 13 0 0 1 26 0c0 10-13 18-13 18z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
                    <circle cx="18" cy="14" r="4" stroke="currentColor" strokeWidth="1.4" />
                  </svg>
                  <p className="dash-empty__title">No saved addresses</p>
                  <p className="dash-empty__sub">Add a delivery address for faster checkout</p>
                  <button className="btn btn--secondary" type="button" onClick={() => setAddrFormOpen(true)}>
                    Add address
                  </button>
                </div>
              ) : (
                <div className="addr-grid">
                  {addresses.map((addr) => (
                    <div key={addr.id} className={`addr-card${addr.is_default ? " addr-card--default" : ""}`}>
                      {addr.latitude != null && addr.longitude != null && (
                        <AddrCardMap lat={addr.latitude} lon={addr.longitude} />
                      )}
                      <div className="addr-card__content">
                        <div className="addr-card__head">
                          <span className="addr-card__label">{addr.label || "Address"}</span>
                          {addr.is_default && <span className="addr-badge">Default</span>}
                        </div>
                        <div className="addr-card__body">
                          {addr.governorate && (
                            <span>{addr.governorate.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}</span>
                          )}
                          {addr.street && <span>{addr.street}</span>}
                          {addr.phone && <span className="addr-card__phone">{addr.phone}</span>}
                        </div>
                        <div className="addr-card__actions">
                          {!addr.is_default && (
                            <button
                              className="btn btn--ghost addr-card__icon-btn"
                              type="button"
                              onClick={() => makeDefault(addr.id)}
                            >
                              Set default
                            </button>
                          )}
                          <button
                            className="btn btn--ghost addr-card__icon-btn"
                            type="button"
                            onClick={() => openEditAddr(addr)}
                            aria-label="Edit address"
                          >
                            <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ width: "1rem", height: "1rem" }} aria-hidden="true">
                              <path d="M14.5 2.5a2 2 0 0 1 2.83 2.83L7 15.67 3 17l1.33-4L14.5 2.5z" strokeLinejoin="round" />
                            </svg>
                          </button>
                          <button
                            className="btn btn--ghost addr-card__icon-btn addr-card__del"
                            type="button"
                            onClick={() => { if (confirm("Delete this address?")) removeAddress(addr.id); }}
                            aria-label="Delete address"
                          >
                            <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ width: "1rem", height: "1rem" }} aria-hidden="true">
                              <path d="M3 5h14M8 5V3h4v2M6 5l1 12h6l1-12" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {addrFormOpen && (
                <div className="addr-form-wrap">
                  <h3 className="addr-form-wrap__title">{editingAddrId ? "Edit address" : "New address"}</h3>
                  <form className="addr-form" onSubmit={handleSaveAddr} noValidate>
                    <div className="field">
                      <label className="field__label" htmlFor="af-label">Label</label>
                      <input
                        id="af-label"
                        className="input"
                        value={addrForm.label}
                        onChange={(e) => setAddrForm((f) => ({ ...f, label: e.target.value }))}
                        placeholder="Home, Work, Parents…"
                      />
                    </div>
                    <div className="field">
                      <label className="field__label" htmlFor="af-phone">Phone (optional)</label>
                      <input
                        id="af-phone"
                        className="input"
                        type="tel"
                        inputMode="numeric"
                        value={addrForm.phone}
                        onChange={(e) => setAddrForm((f) => ({ ...f, phone: e.target.value }))}
                        placeholder="01XXXXXXXXX"
                      />
                    </div>
                    <div className="field">
                      <label className="field__label" htmlFor="af-gov">
                        Governorate <span className="field__req">*</span>
                      </label>
                      <div className="select-field">
                        <select
                          id="af-gov"
                          className="select"
                          value={addrForm.governorate}
                          onChange={(e) => setAddrForm((f) => ({ ...f, governorate: e.target.value }))}
                          required
                        >
                          <option value="">Select governorate</option>
                          {GOVERNORATES.map((g) => (
                            <option key={g} value={g.toLowerCase().replace(/\s+/g, "-")}>{g}</option>
                          ))}
                        </select>
                        <svg className="select-field__chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
                      </div>
                    </div>
                    <div className="field field--full">
                      <label className="field__label" htmlFor="af-street">
                        Street address <span className="field__req">*</span>
                      </label>
                      <input
                        id="af-street"
                        className="input"
                        value={addrForm.street}
                        onChange={(e) => setAddrForm((f) => ({ ...f, street: e.target.value }))}
                        placeholder="Street, building, floor…"
                        required
                      />
                    </div>

                    <div className="field--full loc-options-wrap">
                      <div className="loc-panel">
                        <p className="loc-panel__title">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" /></svg>
                          Search any location
                        </p>
                        <p className="loc-panel__hint">Type a landmark, street, or area</p>
                        <input
                          id="loc-search"
                          className="input"
                          type="search"
                          value={locSearch}
                          onChange={(e) => searchLocation(e.target.value)}
                          placeholder="e.g. Cairo Tower, Maadi, Heliopolis…"
                          autoComplete="off"
                        />
                        {locSearching && (
                          <p style={{ fontSize: "var(--fs-xs)", color: "var(--muted)", marginBlockStart: "var(--sp-1)" }}>Searching…</p>
                        )}
                        {locResults.length > 0 && (
                          <ul className="loc-results">
                            {locResults.map((r) => (
                              <li key={r.place_id}>
                                <button type="button" className="loc-result-btn" onClick={() => pickSearchResult(r)}>
                                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flexShrink: 0, color: "var(--gold)" }}><path d="M12 22s-8-4.5-8-11.8A8 8 0 0 1 12 2a8 8 0 0 1 8 8.2c0 7.3-8 11.8-8 11.8z" /><circle cx="12" cy="10" r="3" /></svg>
                                  <span>{r.display_name}</span>
                                </button>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                      <div className="loc-or-divider"><span>or</span></div>
                      <div className="loc-panel">
                        <p className="loc-panel__title">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="3" /><path d="M12 2v3m0 14v3M2 12h3m14 0h3" /><circle cx="12" cy="12" r="9" strokeDasharray="2 4" /></svg>
                          Use my current location
                        </p>
                        <p className="loc-panel__hint">Let the browser detect where you are</p>
                        <button
                          type="button"
                          className={`btn btn--ghost locate-btn${gpsLoading ? " is-loading" : ""}`}
                          onClick={locateForAddress}
                          disabled={gpsLoading}
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="3" /><path d="M12 2v3m0 14v3M2 12h3m14 0h3" /><circle cx="12" cy="12" r="9" strokeDasharray="2 4" /></svg>
                          {gpsLoading ? "Detecting…" : "Detect my location"}
                        </button>
                        {gpsCoords && (
                          <div className="gps-pin">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 22s-8-4.5-8-11.8A8 8 0 0 1 12 2a8 8 0 0 1 8 8.2c0 7.3-8 11.8-8 11.8z" /><circle cx="12" cy="10" r="3" /></svg>
                            <span>{gpsCoords.lat.toFixed(6)}°, {gpsCoords.lon.toFixed(6)}°</span>
                            <a className="gps-pin__link" href={`https://www.openstreetmap.org/?mlat=${gpsCoords.lat}&mlon=${gpsCoords.lon}&zoom=16`} target="_blank" rel="noopener noreferrer">View on map</a>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="field--full" style={{ display: addrLat != null ? "block" : "none" }}>
                      <div className="addr-map-wrap">
                        <div ref={mapContainerRef} style={{ height: "100%", width: "100%" }} />
                      </div>
                    </div>

                    <div className="field--full addr-form__check">
                      <label>
                        <input
                          type="checkbox"
                          checked={addrForm.is_default}
                          onChange={(e) => setAddrForm((f) => ({ ...f, is_default: e.target.checked }))}
                        />
                        Set as default delivery address
                      </label>
                    </div>
                    <div className="field--full addr-form__actions">
                      <button
                        className={`btn btn--primary${addrSaving ? " is-loading" : ""}`}
                        type="submit"
                        disabled={addrSaving}
                      >
                        {addrSaving ? "" : editingAddrId ? "Update address" : "Save address"}
                      </button>
                      <button className="btn btn--secondary" type="button" onClick={closeAddrForm}>
                        Cancel
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </div>
          )}

          {/* ── Wishlist ── */}
          {tab === "wishlist" && (
            <div className="dash-panel is-active">
              <div className="dash-panel__head">
                <h2 className="dash-panel__title">Wishlist</h2>
              </div>
              <div className="dash-empty">
                <svg width="44" height="44" viewBox="0 0 44 44" fill="none" aria-hidden="true">
                  <path d="M22 38s-18-10.5-18-21A10 10 0 0 1 22 9.4 10 10 0 0 1 40 17c0 10.5-18 21-18 21z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
                </svg>
                <p className="dash-empty__title">Nothing saved yet</p>
                <p className="dash-empty__sub">Browse our collections and save the pieces that speak to you</p>
                <div className="dash-empty__actions">
                  <Link className="btn btn--primary" to="/shop/perfumes">Fragrances</Link>
                </div>
              </div>
            </div>
          )}

        </motion.div>
      </div>

      {/* ── Password modal ── */}
      <div
        className={`pw-modal-backdrop${pwOpen ? " is-open" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="pw-modal-title"
        onClick={(e) => { if (e.target === e.currentTarget) setPwOpen(false); }}
      >
        <div className="pw-modal__card">
          <div className="pw-modal__head">
            <h2 className="pw-modal__title" id="pw-modal-title">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2" strokeLinejoin="round" /><path d="M8 11V7a4 4 0 0 1 8 0v4" strokeLinecap="round" /></svg>
              Change password
            </h2>
            <button className="btn btn--ghost" type="button" onClick={() => setPwOpen(false)} aria-label="Close">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" style={{ width: "1.2rem", height: "1.2rem" }}><path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" /></svg>
            </button>
          </div>
          <form className="pw-modal__form" onSubmit={handleChangePassword} noValidate>
            <div className="field">
              <label className="field__label" htmlFor="pw-new">New password</label>
              <input
                id="pw-new"
                className="input"
                type="password"
                value={pwForm.next}
                onChange={(e) => setPwForm((f) => ({ ...f, next: e.target.value }))}
                autoComplete="new-password"
                required
              />
              <p className="field__hint">At least 8 characters.</p>
            </div>
            <div className={`field${pwError ? " is-invalid" : ""}`}>
              <label className="field__label" htmlFor="pw-confirm">Confirm new password</label>
              <input
                id="pw-confirm"
                className="input"
                type="password"
                value={pwForm.confirm}
                onChange={(e) => setPwForm((f) => ({ ...f, confirm: e.target.value }))}
                autoComplete="new-password"
                required
              />
              {pwError && <p className="field__error" role="alert">{pwError}</p>}
            </div>
            <button
              className={`btn btn--primary btn--block${pwLoading ? " is-loading" : ""}`}
              type="submit"
              disabled={pwLoading}
            >
              {pwLoading ? "" : "Update password"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
