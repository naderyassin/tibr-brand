import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useAuth } from "@/stores/auth";
import { useToast } from "@/components/ui/Toast";
import { supabase } from "@/lib/supabase";
import {
  getOrders, getProfile, updateProfile,
  getAddresses, addAddress, updateAddress, deleteAddress, setDefaultAddress,
} from "@/lib/api";

// Fix Leaflet's broken default icon paths when bundled with Vite
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

const STATUS_LABELS = {
  pending: "pending", confirmed: "confirmed",
  shipped: "shipped", delivered: "delivered", cancelled: "cancelled",
};

const tabs = [
  {
    id: "orders", label: "Orders",
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/><path d="M9 12h6M9 16h4"/></svg>,
  },
  {
    id: "profile", label: "Profile",
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
  },
  {
    id: "addresses", label: "Addresses",
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><path d="M12 22s-8-4.5-8-11.8A8 8 0 0 1 12 2a8 8 0 0 1 8 8.2c0 7.3-8 11.8-8 11.8z" strokeLinejoin="round"/><circle cx="12" cy="10" r="3"/></svg>,
  },
  {
    id: "wishlist", label: "Wishlist",
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>,
  },
];

// Group flat order-item rows by checkout_reference (or id as fallback)
function groupOrders(rows) {
  const map = new Map();
  for (const row of rows) {
    const key = row.checkout_reference || row.id;
    if (!map.has(key)) map.set(key, { key, items: [], ref: row.checkout_reference, created_at: row.created_at, status: row.status, order_total: row.order_total });
    map.get(key).items.push(row);
  }
  return [...map.values()];
}

function OrderCard({ group }) {
  const [open, setOpen] = useState(false);
  const ref = group.ref?.slice(0, 8).toUpperCase() || group.key?.slice(0, 8).toUpperCase();
  return (
    <div className={`order-card${open ? " order-card--open" : ""}`}>
      <button type="button" className="order-card__head" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
        <div className="order-card__thumbs">
          {group.items.map((item) =>
            item.products?.image ? (
              <img key={item.id} className="order-card__thumb" src={item.products.image} alt={item.products?.en_name || item.products?.ar_name || ""} />
            ) : (
              <div key={item.id} className="order-card__thumb order-card__thumb--empty" />
            )
          )}
        </div>
        <div className="order-card__info">
          <p className="order-card__ref">#{ref}</p>
          <p className="order-card__meta">{new Date(group.created_at).toLocaleDateString()}</p>
          <p className="order-card__meta" style={{ color: "var(--muted-faint)" }}>{group.items.length} item{group.items.length !== 1 ? "s" : ""}</p>
        </div>
        <div className="order-card__side">
          <span className={`badge badge--${group.status || "pending"}`}>
            {STATUS_LABELS[group.status] || group.status}
          </span>
          {group.order_total && (
            <span className="order-card__price">{group.order_total} EGP</span>
          )}
          <svg className={`order-card__chevron${open ? " order-card__chevron--up" : ""}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>
        </div>
      </button>

      {open && (
        <div className="order-card__items">
          {group.items.map((item) => {
            const name = item.products?.en_name || item.products?.ar_name || "Product";
            const price = item.unit_price ?? item.products?.en_price ?? item.products?.ar_price ?? "";
            return (
              <div key={item.id} className="order-item">
                {item.products?.image ? (
                  <img className="order-item__img" src={item.products.image} alt={name} />
                ) : (
                  <div className="order-item__img order-item__img--empty" />
                )}
                <div className="order-item__info">
                  <p className="order-item__name">{name}</p>
                  <div className="order-item__meta">
                    {item.size && <span className="order-item__pill">{item.size}</span>}
                    {item.qty > 1 && <span className="order-item__pill">×{item.qty}</span>}
                  </div>
                </div>
                {price && <span className="order-item__price">{price} EGP</span>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

const EMPTY_ADDR = { label: "Home", phone: "", governorate: "", street: "", is_default: false };
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

  // Password modal
  const [pwOpen, setPwOpen] = useState(false);
  const [pwForm, setPwForm] = useState({ current: "", next: "", confirm: "" });
  const [pwError, setPwError] = useState(null);
  const [pwLoading, setPwLoading] = useState(false);

  // Address form
  const [addrFormOpen, setAddrFormOpen] = useState(false);
  const [addrForm, setAddrForm] = useState(EMPTY_ADDR);
  const [addrSaving, setAddrSaving] = useState(false);
  const [editingAddrId, setEditingAddrId] = useState(null);

  // GPS + map
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsCoords, setGpsCoords] = useState(null);
  const [addrLat, setAddrLat] = useState(null);
  const [addrLon, setAddrLon] = useState(null);
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);

  // Location search
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
        headers: { "User-Agent": "Robabikia/1.0 (nadeerysin@gmail.com)" },
      })
        .then((r) => r.json())
        .then((results) => { setLocResults(results); setLocSearching(false); })
        .catch(() => setLocSearching(false));
    }, 400);
  };

  const pickSearchResult = (result) => {
    const lat = parseFloat(result.lat);
    const lon = parseFloat(result.lon);
    setAddrLat(lat);
    setAddrLon(lon);
    setGpsCoords({ lat, lon });
    setLocSearch("");
    setLocResults([]);
    reverseGeocode(lat, lon);
  };

  const reverseGeocode = (lat, lon) => {
    fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&accept-language=en`, {
      headers: { "User-Agent": "Robabikia/1.0 (nadeerysin@gmail.com)" },
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

  const locateForAddress = () => {
    if (!navigator.geolocation) { toast("Geolocation not supported."); return; }
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude: lat, longitude: lon } = pos.coords;
        setGpsLoading(false);
        setAddrLat(lat);
        setAddrLon(lon);
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

  // Init / update Leaflet map after addrLat/addrLon state is set and container is in DOM
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
        setAddrLat(p.lat);
        setAddrLon(p.lng);
        setGpsCoords({ lat: p.lat, lon: p.lng });
        reverseGeocode(p.lat, p.lng);
      });
      m.on("click", (e) => {
        setAddrLat(e.latlng.lat);
        setAddrLon(e.latlng.lng);
        setGpsCoords({ lat: e.latlng.lat, lon: e.latlng.lng });
        reverseGeocode(e.latlng.lat, e.latlng.lng);
      });
      setTimeout(() => m.invalidateSize(), 100);
    } else {
      markerRef.current?.setLatLng([addrLat, addrLon]);
      mapRef.current.panTo([addrLat, addrLon]);
    }
  }, [addrLat, addrLon]); // eslint-disable-line react-hooks/exhaustive-deps

  // Destroy map when form closes
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

  // Profile edit form state (synced from server data)
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

  return (
    <div className="store-container">
      <header className="page-head">
        <h1 className="page-head__title">My account</h1>
      </header>

      <div className="dashboard">
        <nav className="dash-nav" aria-label="Account sections">
          {tabs.map((t) => (
            <button
              key={t.id}
              className="dash-nav__item"
              aria-current={tab === t.id ? "true" : undefined}
              type="button"
              onClick={() => setTab(t.id)}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
          {isAdmin && (
            <Link className="dash-nav__item dash-nav__item--admin" to="/admin">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><path d="M12 2l3 7h7l-5.5 4 2 7L12 16l-6.5 4 2-7L2 9h7z" strokeLinejoin="round"/></svg>
              Control panel
            </Link>
          )}
          <button
            className="dash-nav__item dash-nav__item--danger"
            type="button"
            onClick={async () => { await signOut(); navigate("/"); }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><path d="M15 12H6m0 0l3-3m-3 3l3 3" strokeLinecap="round" strokeLinejoin="round"/><path d="M13 4h5a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-5" strokeLinecap="round"/></svg>
            Sign out
          </button>
        </nav>

        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28 }}
        >
          {/* ── Orders ── */}
          {tab === "orders" && (
            <div className="dash-panel is-active">
              <div className="dash-panel__head">
                <h2 className="dash-panel__title">Orders</h2>
              </div>
              {ordersLoading ? (
                <p style={{ color: "var(--muted)" }}>Loading orders…</p>
              ) : !ordersData?.data?.length ? (
                <p style={{ color: "var(--muted)" }}>
                  No orders yet.{" "}
                  <Link to="/shop/perfumes" style={{ color: "var(--gold)" }}>Start shopping.</Link>
                </p>
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
              <div className="dash-panel__head">
                <h2 className="dash-panel__title">Profile</h2>
              </div>
              <div className="dash-card">
                <form
                  className="dash-form"
                  noValidate
                  onSubmit={(e) => { e.preventDefault(); saveProfile(profileForm); }}
                >
                  <div className="field">
                    <label className="field__label" htmlFor="pf-name">Name</label>
                    <input
                      id="pf-name"
                      className="input"
                      value={profileForm.full_name}
                      onChange={(e) => setProfileForm((f) => ({ ...f, full_name: e.target.value }))}
                      autoComplete="name"
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
                  <div className="field field--full">
                    <label className="field__label" htmlFor="pf-email">Email</label>
                    <input
                      id="pf-email"
                      className="input"
                      type="email"
                      value={user.email}
                      readOnly
                    />
                    <p className="field__hint">Email can't be changed here.</p>
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
                      <svg className="select-field__chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>
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
                  <div className="field--full" style={{ display: "flex", gap: "var(--sp-3)", flexWrap: "wrap", alignItems: "center" }}>
                    <button
                      className={`btn btn--primary${profileSaving ? " is-loading" : ""}`}
                      type="submit"
                      disabled={profileSaving}
                    >
                      {profileSaving ? "" : "Save changes"}
                    </button>
                    <button
                      className="btn btn--secondary"
                      type="button"
                      onClick={() => setPwOpen(true)}
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true" style={{ width: "1rem", height: "1rem" }}><rect x="5" y="11" width="14" height="10" rx="2" strokeLinejoin="round"/><path d="M8 11V7a4 4 0 0 1 8 0v4" strokeLinecap="round"/></svg>
                      Change password
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* ── Addresses ── */}
          {tab === "addresses" && (
            <div className="dash-panel is-active">
              <div className="dash-panel__head">
                <h2 className="dash-panel__title">Addresses</h2>
                {!addrFormOpen && (
                  <button
                    className="btn btn--secondary"
                    type="button"
                    onClick={() => setAddrFormOpen(true)}
                  >
                    + Add address
                  </button>
                )}
              </div>

              {addrLoading ? (
                <p style={{ color: "var(--muted)" }}>Loading addresses…</p>
              ) : addresses.length === 0 ? (
                <p className="addr-empty">No saved addresses yet.</p>
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
                          {addr.governorate && <span>{addr.governorate.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase())}</span>}
                          {addr.street && <span>{addr.street}</span>}
                          {addr.phone && <span className="addr-card__phone">{addr.phone}</span>}
                        </div>
                        <div className="addr-card__actions">
                          {!addr.is_default && (
                            <button
                              className="btn btn--ghost addr-card__icon-btn"
                              type="button"
                              onClick={() => makeDefault(addr.id)}
                              title="Set as default"
                            >
                              Set default
                            </button>
                          )}
                          <button
                            className="btn btn--ghost addr-card__icon-btn"
                            type="button"
                            onClick={() => openEditAddr(addr)}
                            title="Edit address"
                          >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true" style={{ width: "1rem", height: "1rem" }}><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                          </button>
                          <button
                            className="btn btn--ghost addr-card__icon-btn addr-card__del"
                            type="button"
                            onClick={() => { if (confirm("Delete this address?")) removeAddress(addr.id); }}
                            title="Delete address"
                          >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true" style={{ width: "1rem", height: "1rem" }}><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/></svg>
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
                        <svg className="select-field__chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>
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
                    {/* ── Pin on map: two options ── */}
                    <div className="field--full loc-options-wrap">

                      {/* Option A: Search */}
                      <div className="loc-panel">
                        <p className="loc-panel__title">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
                          Search any location
                        </p>
                        <p className="loc-panel__hint">Type a landmark, street, or area — pick from the results</p>
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
                                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flexShrink: 0, color: "var(--gold)" }}><path d="M12 22s-8-4.5-8-11.8A8 8 0 0 1 12 2a8 8 0 0 1 8 8.2c0 7.3-8 11.8-8 11.8z"/><circle cx="12" cy="10" r="3"/></svg>
                                  <span>{r.display_name}</span>
                                </button>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>

                      <div className="loc-or-divider"><span>or</span></div>

                      {/* Option B: GPS */}
                      <div className="loc-panel">
                        <p className="loc-panel__title">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M12 2v3m0 14v3M2 12h3m14 0h3"/><circle cx="12" cy="12" r="9" strokeDasharray="2 4"/></svg>
                          Use my current location
                        </p>
                        <p className="loc-panel__hint">Let the browser detect where you are now</p>
                        <button
                          type="button"
                          className={`btn btn--ghost locate-btn${gpsLoading ? " is-loading" : ""}`}
                          onClick={locateForAddress}
                          disabled={gpsLoading}
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M12 2v3m0 14v3M2 12h3m14 0h3"/><circle cx="12" cy="12" r="9" strokeDasharray="2 4"/></svg>
                          {gpsLoading ? "Detecting…" : "Detect my location"}
                        </button>
                        {gpsCoords && (
                          <div className="gps-pin">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 22s-8-4.5-8-11.8A8 8 0 0 1 12 2a8 8 0 0 1 8 8.2c0 7.3-8 11.8-8 11.8z"/><circle cx="12" cy="10" r="3"/></svg>
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
                      <button
                        className="btn btn--secondary"
                        type="button"
                        onClick={closeAddrForm}
                      >
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
              <p style={{ color: "var(--muted)" }}>
                Your wishlist is empty.{" "}
                <Link to="/shop/perfumes" style={{ color: "var(--gold)" }}>Browse fragrances.</Link>
              </p>
            </div>
          )}
        </motion.div>
      </div>

      {/* ── Change password modal ── */}
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
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2" strokeLinejoin="round"/><path d="M8 11V7a4 4 0 0 1 8 0v4" strokeLinecap="round"/></svg>
              Change password
            </h2>
            <button className="btn btn--ghost" type="button" onClick={() => setPwOpen(false)} aria-label="Close">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" style={{ width: "1.2rem", height: "1.2rem" }}><path d="M6 6l12 12M18 6L6 18" strokeLinecap="round"/></svg>
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
