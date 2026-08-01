import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useAuth } from "@/stores/auth";
import { useT, useLang } from "@/stores/lang";
import { useWishlist } from "@/stores/wishlist";
import { useToast } from "@/components/ui/Toast";
import SecurityCenter from "@/components/account/SecurityCenter";
import ProductCard from "@/components/catalog/ProductCard";
import {
  getOrders, getProfile, updateProfile, getProducts,
  getAddresses, addAddress, updateAddress, deleteAddress, setDefaultAddress,
  getPaymentMethods, addPaymentMethod, updatePaymentMethod, deletePaymentMethod, setDefaultPaymentMethod,
  getBillingDetails, saveBillingDetails,
} from "@/lib/api";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const GOVERNORATES = [
  ["Cairo", "القاهرة"], ["Giza", "الجيزة"], ["Alexandria", "الإسكندرية"],
  ["Qalyubia", "القليوبية"], ["Dakahlia", "الدقهلية"], ["Sharqia", "الشرقية"],
  ["Gharbia", "الغربية"], ["Monufia", "المنوفية"], ["Beheira", "البحيرة"],
  ["Kafr El Sheikh", "كفر الشيخ"], ["Damietta", "دمياط"],
  ["Port Said", "بورسعيد"], ["Ismailia", "الإسماعيلية"], ["Suez", "السويس"],
  ["Faiyum", "الفيوم"], ["Beni Suef", "بني سويف"], ["Minya", "المنيا"],
  ["Asyut", "أسيوط"], ["Sohag", "سوهاج"], ["Qena", "قنا"], ["Luxor", "الأقصر"],
  ["Aswan", "أسوان"], ["Red Sea", "البحر الأحمر"], ["New Valley", "الوادي الجديد"],
  ["Matrouh", "مطروح"], ["North Sinai", "شمال سيناء"], ["South Sinai", "جنوب سيناء"],
].map(([en, ar]) => ({ en, ar, slug: en.toLowerCase().replace(/\s+/g, "-") }));

const STATUS_META = {
  pending:   { label: "Pending",   label_ar: "قيد الانتظار", dot: "var(--warning)",  bg: "oklch(0.808 0.105 72 / 0.12)", text: "var(--warning)" },
  confirmed: { label: "Confirmed", label_ar: "مؤكد",        dot: "var(--info)",     bg: "oklch(0.760 0.060 232 / 0.12)", text: "var(--info)" },
  shipped:   { label: "Shipped",   label_ar: "تم الشحن",     dot: "var(--gold)",     bg: "var(--gold-ghost)",              text: "var(--gold)" },
  delivered: { label: "Delivered", label_ar: "تم التوصيل",   dot: "var(--success)",  bg: "var(--success-fill)",            text: "var(--success)" },
  cancelled: { label: "Cancelled", label_ar: "ملغي",         dot: "var(--danger)",   bg: "var(--danger-fill)",             text: "var(--danger)" },
};

const PAYMENT_LABELS = {
  cash_on_delivery: { label: "Cash on delivery", label_ar: "الدفع عند الاستلام" },
  vodafone_cash: { label: "Vodafone Cash", label_ar: "فودافون كاش" },
  instapay: { label: "InstaPay", label_ar: "إنستاباي" },
};

const fmtEGP = (v, currency) => `${Number(v ?? 0).toLocaleString()} ${currency}`;

// Saved wallet types the Billing tab can store. Handles only — no card data.
const PM_TYPES = [
  {
    id: "vodafone_cash", label: "Vodafone Cash", label_ar: "فودافون كاش",
    handleLabel: "Wallet phone number", handleLabel_ar: "رقم المحفظة", placeholder: "01XXXXXXXXX",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="5" y="2" width="14" height="20" rx="2" />
        <path d="M9 7h6M9 11h6M9 15h4" />
        <circle cx="15" cy="17" r="1" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
  {
    id: "instapay", label: "InstaPay", label_ar: "إنستاباي",
    handleLabel: "InstaPay address", handleLabel_ar: "عنوان إنستاباي", placeholder: "name@instapay",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z" />
      </svg>
    ),
  },
];

const EMPTY_PM = { type: "vodafone_cash", handle: "", label: "", is_default: false };
const EMPTY_BILLING = { full_name: "", company: "", tax_id: "", governorate: "", city: "", street: "" };

// Wallet phone numbers are partially masked in the list; InstaPay addresses show
// as entered (they're not secret the way a raw number feels).
const maskHandle = (type, handle) => {
  if (!handle) return "";
  if (type === "vodafone_cash") {
    const d = String(handle);
    return d.length > 5 ? `${d.slice(0, 3)}••••${d.slice(-2)}` : d;
  }
  return handle;
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
    id: "orders", label: "Orders", label_ar: "الطلبات",
    icon: (
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
        <rect x="4" y="2" width="12" height="16" rx="1.5" strokeLinejoin="round" />
        <path d="M7 7h6M7 10h6M7 13h4" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    id: "billing", label: "Billing", label_ar: "الفواتير",
    icon: (
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
        <path d="M5 2.5h10a1 1 0 0 1 1 1V17l-2-1.2L12 17l-2-1.2L8 17l-2-1.2L4 17V3.5a1 1 0 0 1 1-1z" strokeLinejoin="round" />
        <path d="M7.5 7.5h5M7.5 10.5h3" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    id: "profile", label: "Profile", label_ar: "الملف الشخصي",
    icon: (
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
        <circle cx="10" cy="6" r="3.5" />
        <path d="M3 17c0-3.314 3.134-6 7-6s7 2.686 7 6" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    id: "addresses", label: "Addresses", label_ar: "العناوين",
    icon: (
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
        <path d="M10 18s-7-4.5-7-10a7 7 0 0 1 14 0c0 5.5-7 10-7 10z" strokeLinejoin="round" />
        <circle cx="10" cy="8" r="2.5" />
      </svg>
    ),
  },
  {
    id: "wishlist", label: "Wishlist", label_ar: "المفضلة",
    icon: (
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
        <path d="M10 17s-8-4.8-8-9.5A4.5 4.5 0 0 1 10 4.2 4.5 4.5 0 0 1 18 7.5C18 12.2 10 17 10 17z" strokeLinejoin="round" />
      </svg>
    ),
  },
];

function StatusPill({ status }) {
  const t = useT();
  const meta = STATUS_META[status] ?? STATUS_META.pending;
  return (
    <span
      className="order-status-pill"
      style={{ "--sb-bg": meta.bg, "--sb-text": meta.text, "--sb-dot": meta.dot }}
    >
      <span className="order-status-pill__dot" aria-hidden="true" />
      {t(meta.label, meta.label_ar)}
    </span>
  );
}

// Fulfilment stages, in order. An order's `status` maps to a point on this
// track; anything before it reads as complete. `cancelled` is off-track.
const STATUS_STEPS = ["pending", "confirmed", "shipped", "delivered"];

// An order IS a row, with its line items attached. Snapshots (name/price/image)
// are historical — renaming or repricing a product never rewrites what was
// bought — so the card reads them straight off the order, not live products.
function OrderCard({ order }) {
  const t = useT();
  const currency = t("EGP", "ج.م");
  const [open, setOpen] = useState(false);
  const items = order.order_items || [];
  const ref = (order.checkout_reference || order.id || "").slice(0, 8).toUpperCase();
  const dateStr = new Date(order.created_at).toLocaleDateString("en-GB", {
    day: "numeric", month: "short", year: "numeric",
  });
  const status = order.status || "pending";
  const cancelled = status === "cancelled";
  const stepIndex = STATUS_STEPS.indexOf(status);
  const subtotal = order.subtotal ?? items.reduce((s, l) => s + (l.unit_price || 0) * (l.qty || 0), 0);
  const discount = order.discount_amount || 0;
  const total = order.total ?? Math.max(0, subtotal - discount);

  return (
    <div className={`order${open ? " is-open" : ""}`}>
      <button
        type="button"
        className="order__summary"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <div className="order__thumbs">
          {items.slice(0, 3).map((item, i) =>
            item.image_snapshot ? (
              <img
                key={item.id}
                className="order__thumb"
                src={item.image_snapshot}
                alt={item.name_snapshot || ""}
                style={{ zIndex: 3 - i }}
              />
            ) : (
              <div key={item.id} className="order__thumb order__thumb--empty" style={{ zIndex: 3 - i }} />
            )
          )}
          {items.length > 3 && (
            <div className="order__thumb order__thumb--more">+{items.length - 3}</div>
          )}
        </div>

        <div className="order__meta">
          <span className="order__id">#{ref}</span>
          <span className="order__when">
            {dateStr}
            <span className="order-card__dot-sep" aria-hidden="true" />
            {items.length} {items.length !== 1 ? t("items", "منتجات") : t("item", "منتج")}
          </span>
        </div>

        <span className="order__status-cell"><StatusPill status={status} /></span>
        {order.total != null && <span className="order__total">{fmtEGP(order.total, currency)}</span>}

        <svg className="order__chevron" width="18" height="18" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path d="M4 6L8 10L12 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div className="order__body">
          {cancelled ? (
            <div className="order__track">
              <div className="order__step is-cancel">
                <span className="order__step-bar" />
                <span className="order__step-name">{t("This order was cancelled", "تم إلغاء هذا الطلب")}</span>
              </div>
            </div>
          ) : (
            <div className="order__track" role="list" aria-label={t("Fulfilment progress", "حالة التنفيذ")}>
              {STATUS_STEPS.map((s, i) => (
                <div key={s} className={`order__step${i <= stepIndex ? " is-done" : ""}`} role="listitem">
                  <span className="order__step-bar" />
                  <span className="order__step-name">{t(STATUS_META[s].label, STATUS_META[s].label_ar)}</span>
                </div>
              ))}
            </div>
          )}

          <div className="order__lines">
            {items.map((item) => {
              const name = item.name_snapshot || "Product";
              return (
                <div key={item.id} className="order-item">
                  {item.image_snapshot ? (
                    <img className="order-item__img" src={item.image_snapshot} alt={name} />
                  ) : (
                    <div className="order-item__img order-item__img--empty" />
                  )}
                  <div className="order-item__info">
                    <span className="order-item__name">{name}</span>
                    <div className="order-item__tags">
                      {item.size_snapshot && <span className="order-item__tag">{item.size_snapshot}</span>}
                      {item.qty > 1 && <span className="order-item__tag">×{item.qty}</span>}
                    </div>
                  </div>
                  {item.unit_price != null && (
                    <span className="order-item__price">{fmtEGP(item.unit_price, currency)}</span>
                  )}
                </div>
              );
            })}
          </div>

          <div className="order__totals">
            <div className="order__trow"><span>{t("Subtotal", "الإجمالي الفرعي")}</span><span>{fmtEGP(subtotal, currency)}</span></div>
            {discount > 0 && (
              <div className="order__trow">
                <span>{t("Discount", "الخصم")}{order.discount_code ? ` (${order.discount_code})` : ""}</span>
                <span>−{fmtEGP(discount, currency)}</span>
              </div>
            )}
            <div className="order__trow"><span>{t("Shipping", "الشحن")}</span><span>{t("Free", "مجاني")}</span></div>
            <div className="order__trow order__trow--grand"><span>{t("Total", "الإجمالي")}</span><span>{fmtEGP(total, currency)}</span></div>
          </div>
        </div>
      )}
    </div>
  );
}

// A billing record IS an order, viewed through a money lens. Rendered inline as
// a Stripe-style history table (see the Billing tab) rather than its own row
// component now — this stays a formatting helper for one table row.
function BillingTableRow({ order, onView }) {
  const t = useT();
  const currency = t("EGP", "ج.م");
  const ref = (order.checkout_reference || order.id || "").slice(0, 8).toUpperCase();
  const dateStr = new Date(order.created_at).toLocaleDateString("en-GB", {
    day: "numeric", month: "short", year: "numeric",
  });
  const itemCount = (order.order_items || []).reduce((n, l) => n + (l.qty || 0), 0);
  const payMeta = PAYMENT_LABELS[order.payment_method];

  return (
    <tr>
      <td data-label={t("Invoice", "الفاتورة")}><span className="bill-table__ref">#{ref}</span></td>
      <td data-label={t("Date", "التاريخ")}>{dateStr}</td>
      <td data-label={t("Items", "المنتجات")} className="bill-table__num">{itemCount}</td>
      <td data-label={t("Method", "الطريقة")}>{payMeta ? t(payMeta.label, payMeta.label_ar) : order.payment_method || "—"}</td>
      <td data-label={t("Status", "الحالة")}><StatusPill status={order.status || "pending"} /></td>
      <td data-label={t("Amount", "المبلغ")} className="bill-table__amount">{fmtEGP(order.total, currency)}</td>
      <td className="bill-table__action">
        <button type="button" className="btn btn--secondary bill-table__view" onClick={() => onView(order)}>
          <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true" style={{ width: "0.95rem", height: "0.95rem" }}>
            <path d="M5 2.5h10a1 1 0 0 1 1 1V17l-2-1.2L12 17l-2-1.2L8 17l-2-1.2L4 17V3.5a1 1 0 0 1 1-1z" strokeLinejoin="round" />
          </svg>
          {t("Invoice", "الفاتورة")}
        </button>
      </td>
    </tr>
  );
}

// A printable "paper" invoice — deliberately a light sheet on the dark UI so it
// reads as a real document and prints clean (see the @media print rules in CSS,
// keyed off the #invoice-print id below). Money and item text come from the
// order's own snapshots, never live product data. Identity/tax lines come from
// the user's current billing details (company, tax ID, billing address) when set,
// falling back to the order's own customer snapshot.
function InvoiceDoc({ order, billing }) {
  const t = useT();
  const currency = t("EGP", "ج.م");
  if (!order) return null;
  const ref = (order.checkout_reference || order.id || "").slice(0, 8).toUpperCase();
  const dateStr = new Date(order.created_at).toLocaleDateString("en-GB", {
    day: "2-digit", month: "short", year: "numeric",
  });
  const lines = order.order_items || [];
  const subtotal = order.subtotal ?? lines.reduce((s, l) => s + (l.unit_price || 0) * (l.qty || 0), 0);
  const discount = order.discount_amount || 0;
  const total = order.total ?? Math.max(0, subtotal - discount);
  const payMeta = PAYMENT_LABELS[order.payment_method];
  const statusMeta = STATUS_META[order.status];

  return (
    <div className="invoice-doc" id="invoice-print">
      <div className="invoice-doc__head">
        <div>
          <p className="invoice-doc__brand">TIBR</p>
          <p className="invoice-doc__brand-sub">تِبْر · Fragrance House</p>
        </div>
        <div className="invoice-doc__head-right">
          <p className="invoice-doc__label">{t("Invoice", "الفاتورة")}</p>
          <p className="invoice-doc__ref">#{ref}</p>
          <p className="invoice-doc__date">{dateStr}</p>
        </div>
      </div>

      <div className="invoice-doc__parties">
        <div>
          <p className="invoice-doc__ptitle">{t("Billed to", "الفاتورة باسم")}</p>
          <p className="invoice-doc__pname">{billing?.full_name || order.customer_name || "—"}</p>
          {billing?.company && <p className="invoice-doc__pline">{billing.company}</p>}
          {order.customer_phone && <p className="invoice-doc__pline">{order.customer_phone}</p>}
          {(billing?.street || order.customer_address) && (
            <p className="invoice-doc__pline">{billing?.street || order.customer_address}</p>
          )}
          {billing?.tax_id && <p className="invoice-doc__pline invoice-doc__pline--tax">{t("Tax ID:", "الرقم الضريبي:")} {billing.tax_id}</p>}
        </div>
        <div className="invoice-doc__parties-right">
          <p className="invoice-doc__ptitle">{t("Payment", "الدفع")}</p>
          <p className="invoice-doc__pline">{payMeta ? t(payMeta.label, payMeta.label_ar) : order.payment_method || "—"}</p>
          <p className="invoice-doc__ptitle invoice-doc__ptitle--gap">{t("Status", "الحالة")}</p>
          <p className="invoice-doc__pline">{statusMeta ? t(statusMeta.label, statusMeta.label_ar) : t("Pending", "قيد الانتظار")}</p>
        </div>
      </div>

      <table className="invoice-doc__table">
        <thead>
          <tr>
            <th>{t("Item", "المنتج")}</th>
            <th className="invoice-doc__col-num">{t("Qty", "الكمية")}</th>
            <th className="invoice-doc__col-num">{t("Unit", "السعر")}</th>
            <th className="invoice-doc__col-num">{t("Amount", "المبلغ")}</th>
          </tr>
        </thead>
        <tbody>
          {lines.map((l) => (
            <tr key={l.id}>
              <td>
                <span className="invoice-doc__item-name">{l.name_snapshot || t("Product", "منتج")}</span>
                {l.size_snapshot && <span className="invoice-doc__item-size">{l.size_snapshot}</span>}
              </td>
              <td className="invoice-doc__col-num">{l.qty}</td>
              <td className="invoice-doc__col-num">{fmtEGP(l.unit_price, currency)}</td>
              <td className="invoice-doc__col-num">{fmtEGP((l.unit_price || 0) * (l.qty || 0), currency)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="invoice-doc__totals">
        <div className="invoice-doc__trow"><span>{t("Subtotal", "الإجمالي الفرعي")}</span><span>{fmtEGP(subtotal, currency)}</span></div>
        {discount > 0 && (
          <div className="invoice-doc__trow">
            <span>{t("Discount", "الخصم")}{order.discount_code ? ` (${order.discount_code})` : ""}</span>
            <span>−{fmtEGP(discount, currency)}</span>
          </div>
        )}
        <div className="invoice-doc__trow"><span>{t("Shipping", "الشحن")}</span><span>{t("Free", "مجاني")}</span></div>
        <div className="invoice-doc__trow invoice-doc__trow--grand"><span>{t("Total", "الإجمالي")}</span><span>{fmtEGP(total, currency)}</span></div>
      </div>

      <p className="invoice-doc__foot">{t("Thank you for shopping with TIBR", "شكرًا لتسوّقك مع تِبْر")} — الأصالة والحنين والفخامة</p>
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
    // The Addresses panel animates in (Framer Motion), so the container may not be at its
    // final size when Leaflet reads it — recompute once the layout settles, and again on any
    // later resize, otherwise the map renders as a gray box with no tiles.
    const settle = setTimeout(() => m.invalidateSize(), 120);
    const ro = new ResizeObserver(() => m.invalidateSize());
    ro.observe(ref.current);
    const el = ref.current;
    return () => { clearTimeout(settle); ro.disconnect(); m.remove(); el && (el._lmap = null); };
  }, [lat, lon]);
  return <div ref={ref} className="addr-card__map" />;
}

export default function Account() {
  const t = useT();
  const lang = useLang((s) => s.lang);
  const currency = t("EGP", "ج.م");
  const [params, setParams] = useSearchParams();
  const tab = params.get("tab") || "orders";
  const { user, token, signOut, loading: authLoading } = useAuth();
  const wishlistItems = useWishlist((s) => s.items);
  const wishlistLoaded = useWishlist((s) => s.loaded);
  const navigate = useNavigate();
  const toast = useToast();
  const qc = useQueryClient();

  const [invoiceOrder, setInvoiceOrder] = useState(null);

  const [pmFormOpen, setPmFormOpen] = useState(false);
  const [pmForm, setPmForm] = useState(EMPTY_PM);
  const [editingPmId, setEditingPmId] = useState(null);
  const [pmSaving, setPmSaving] = useState(false);
  const [billingForm, setBillingForm] = useState(EMPTY_BILLING);

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

  const requestPreciseLocation = () => {
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude: lat, longitude: lon } = pos.coords;
        setGpsLoading(false);
        setAddrLat(lat); setAddrLon(lon);
        setGpsCoords({ lat, lon });
        reverseGeocode(lat, lon);
        toast(t("Location pinned — drag the marker to adjust", "تم تحديد الموقع — اسحب العلامة للتعديل"));
      },
      (err) => {
        setGpsLoading(false);
        if (err.code === 1) {
          toast(t("Location access denied — enable it in your browser's site settings to detect your address.", "تم رفض إذن الموقع — فعّله من إعدادات المتصفح لتحديد عنوانك."));
        } else {
          toast(t("Could not get your location.", "تعذّر تحديد موقعك."));
        }
      },
      // enableHighAccuracy asks the device for GPS/Wi-Fi-grade positioning rather than
      // coarse IP-based estimation; maximumAge: 0 forbids the browser from handing back a
      // cached fix, since a stale one can read as a "fake" location if the user has moved.
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 },
    );
  };

  const locateForAddress = () => {
    if (!navigator.geolocation) { toast(t("Geolocation not supported.", "تحديد الموقع غير مدعوم.")); return; }
    // Explicitly resolve the permission state first rather than firing getCurrentPosition
    // blind — on browsers that support the Permissions API this lets us give a precise
    // "access denied" message up front instead of a generic failure after the fact.
    if (navigator.permissions?.query) {
      navigator.permissions.query({ name: "geolocation" }).then(
        (status) => {
          if (status.state === "denied") {
            toast(t("Location access denied — enable it in your browser's site settings to detect your address.", "تم رفض إذن الموقع — فعّله من إعدادات المتصفح لتحديد عنوانك."));
            return;
          }
          requestPreciseLocation();
        },
        () => requestPreciseLocation(),
      );
    } else {
      requestPreciseLocation();
    }
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
      // The map lives inside the address modal, which scales in over ~380ms. Recompute size
      // both early and after that entrance settles, otherwise Leaflet reads the mid-animation
      // (scaled) dimensions and renders a gray, mis-tiled map.
      setTimeout(() => m.invalidateSize(), 100);
      setTimeout(() => m.invalidateSize(), 480);
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
    // Enabled everywhere (not just orders/billing) so the hero's order stat is
    // accurate on any tab. Small payload, already fetched on the default tab.
    enabled: !!token,
  });

  const { data: profileData } = useQuery({
    queryKey: ["profile", token],
    queryFn: () => getProfile(token),
    enabled: !!token,
  });

  const { data: addressesData, isLoading: addrLoading } = useQuery({
    queryKey: ["addresses", token],
    queryFn: () => getAddresses(token),
    // Enabled everywhere: billing's "prefill from a saved address" control and
    // the hero's address stat both read it, beyond the Addresses tab itself.
    enabled: !!token,
  });

  const { data: pmData, isLoading: pmLoading } = useQuery({
    queryKey: ["payment-methods", token],
    queryFn: () => getPaymentMethods(token),
    enabled: !!token && tab === "billing",
  });

  const { data: billingData } = useQuery({
    queryKey: ["billing-details", token],
    queryFn: () => getBillingDetails(token),
    enabled: !!token && tab === "billing",
  });

  // Recommended fragrances for the wishlist empty state — only fetched once the
  // wishlist is confirmed empty, so a full wishlist never pays for it.
  const wishlistEmpty = wishlistLoaded && wishlistItems.length === 0;
  const { data: recoData, isLoading: recoLoading } = useQuery({
    queryKey: ["reco-products"],
    queryFn: () => getProducts({ type: "perfume" }),
    enabled: tab === "wishlist" && wishlistEmpty,
    staleTime: 5 * 60 * 1000,
  });
  const recoProducts = (recoData?.data ?? []).slice(0, 3);

  const [profileForm, setProfileForm] = useState({ full_name: "", gender: "", date_of_birth: "" });
  useEffect(() => {
    if (profileData?.data) {
      const p = profileData.data;
      setProfileForm({
        full_name: p.full_name || "",
        gender: p.gender || "",
        date_of_birth: p.date_of_birth || "",
      });
    }
  }, [profileData]);

  useEffect(() => {
    if (billingData?.data) {
      const b = billingData.data;
      setBillingForm({
        full_name: b.full_name || "", company: b.company || "", tax_id: b.tax_id || "",
        governorate: b.governorate || "", city: b.city || "", street: b.street || "",
      });
    }
  }, [billingData]);

  const { mutate: saveProfile, isPending: profileSaving } = useMutation({
    mutationFn: (body) => updateProfile(body, token),
    onSuccess: () => { toast(t("Profile saved!", "تم حفظ الملف الشخصي!")); qc.invalidateQueries({ queryKey: ["profile"] }); },
    onError: (err) => toast(err.message || t("Failed to save profile", "تعذّر حفظ الملف الشخصي")),
  });

  const { mutate: removeAddress } = useMutation({
    mutationFn: (id) => deleteAddress(id, token),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["addresses"] }),
    onError: (err) => toast(err.message || t("Failed to delete address", "تعذّر حذف العنوان")),
  });

  const { mutate: makeDefault } = useMutation({
    mutationFn: (id) => setDefaultAddress(id, token),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["addresses"] }),
    onError: (err) => toast(err.message || t("Failed to set default", "تعذّر تعيين الافتراضي")),
  });

  const { mutate: removePm } = useMutation({
    mutationFn: (id) => deletePaymentMethod(id, token),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["payment-methods"] }),
    onError: (err) => toast(err.message || t("Failed to delete payment method", "تعذّر حذف وسيلة الدفع")),
  });

  const { mutate: makePmDefault } = useMutation({
    mutationFn: (id) => setDefaultPaymentMethod(id, token),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["payment-methods"] }),
    onError: (err) => toast(err.message || t("Failed to set default", "تعذّر تعيين الافتراضي")),
  });

  const { mutate: saveBilling, isPending: billingSaving } = useMutation({
    mutationFn: (body) => saveBillingDetails(body, token),
    onSuccess: () => { toast(t("Billing details saved!", "تم حفظ بيانات الفوترة!")); qc.invalidateQueries({ queryKey: ["billing-details"] }); },
    onError: (err) => toast(err.message || t("Failed to save billing details", "تعذّر حفظ بيانات الفوترة")),
  });

  const openEditPm = (pm) => {
    setPmForm({ type: pm.type, handle: pm.handle || "", label: pm.label || "", is_default: pm.is_default || false });
    setEditingPmId(pm.id);
    setPmFormOpen(true);
  };
  const closePmForm = () => { setPmFormOpen(false); setPmForm(EMPTY_PM); setEditingPmId(null); };
  const handleSavePm = async (e) => {
    e.preventDefault();
    if (!pmForm.handle.trim()) { toast(t("Please enter the wallet number or address.", "من فضلك أدخل رقم المحفظة أو العنوان.")); return; }
    setPmSaving(true);
    try {
      if (editingPmId) { await updatePaymentMethod(editingPmId, pmForm, token); toast(t("Payment method updated!", "تم تحديث وسيلة الدفع!")); }
      else { await addPaymentMethod(pmForm, token); toast(t("Payment method saved!", "تم حفظ وسيلة الدفع!")); }
      qc.invalidateQueries({ queryKey: ["payment-methods"] });
      closePmForm();
    } catch (err) {
      toast(err.message || t("Failed to save payment method", "تعذّر حفظ وسيلة الدفع"));
    } finally {
      setPmSaving(false);
    }
  };

  // Copy a saved delivery address into the billing form — an explicit action, not
  // an auto-bind, because billing details are allowed to differ from delivery.
  // The name comes from the profile (addresses have no person name, only a label).
  const fillBillingFromAddress = (addr) => {
    if (!addr) return;
    setBillingForm((f) => ({
      ...f,
      full_name:   f.full_name || profileData?.data?.full_name || "",
      governorate: addr.governorate || f.governorate,
      city:        addr.city && addr.city !== addr.governorate ? addr.city : f.city,
      street:      addr.street || f.street,
    }));
    toast(t("Filled from saved address", "تم التعبئة من عنوان محفوظ"));
  };

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
      toast(t("Please fill in governorate and street address.", "من فضلك أدخل المحافظة وعنوان الشارع."));
      return;
    }
    setAddrSaving(true);
    try {
      const payload = { ...addrForm, latitude: addrLat, longitude: addrLon };
      if (editingAddrId) {
        await updateAddress(editingAddrId, payload, token);
        toast(t("Address updated!", "تم تحديث العنوان!"));
      } else {
        await addAddress(payload, token);
        toast(t("Address saved!", "تم حفظ العنوان!"));
      }
      qc.invalidateQueries({ queryKey: ["addresses"] });
      closeAddrForm();
    } catch (err) {
      toast(err.message || t("Failed to save address", "تعذّر حفظ العنوان"));
    } finally {
      setAddrSaving(false);
    }
  };

  if (authLoading || !user) return null;

  const setTab = (id) => setParams({ tab: id });
  const addresses = addressesData?.data ?? [];

  const firstName = profileData?.data?.full_name?.split(/\s+/)[0] || null;
  const initials = (() => {
    const name = profileData?.data?.full_name;
    if (name) return name.split(/\s+/).slice(0, 2).map((n) => n[0]?.toUpperCase()).join("");
    return (user.email?.[0] || "?").toUpperCase();
  })();

  // Hero overview stats — real figures, dashes while their queries settle.
  const ordersCount = ordersData?.data?.length;
  const addressCount = addresses.length;
  const memberSince = (() => {
    const iso = user?.created_at || profileData?.data?.created_at;
    if (!iso) return null;
    const d = new Date(iso);
    return Number.isNaN(d.getTime())
      ? null
      : d.toLocaleDateString("en-GB", { month: "long", year: "numeric" });
  })();

  return (
    <div className="store-container">

      {/* ── Account hero ── */}
      <header className="acct-hero">
        <div className="acct-hero__identity">
          <div className="acct-hero__avatar" aria-hidden="true">
            <span>{initials}</span>
          </div>
          <div className="acct-hero__text">
            <p className="acct-hero__eyebrow">
              <span className="acct-hero__spark" aria-hidden="true" />
              {memberSince ? t(`Member since ${memberSince}`, `عضو منذ ${memberSince}`) : t("TIBR account", "حساب تِبْر")}
            </p>
            <h1 className="acct-hero__name">
              {firstName ? t(`Welcome back, ${firstName}`, `أهلاً بعودتك، ${firstName}`) : t("My account", "حسابي")}
            </h1>
            <p className="acct-hero__email">{user.email}</p>
          </div>
        </div>

        <dl className="acct-stats" aria-label={t("Account overview", "نظرة عامة على الحساب")}>
          <div className="acct-stat">
            <dt className="acct-stat__label">{t("Orders", "الطلبات")}</dt>
            <dd className="acct-stat__value">{ordersCount ?? "—"}</dd>
          </div>
          <div className="acct-stat">
            <dt className="acct-stat__label">{t("Saved", "المحفوظات")}</dt>
            <dd className="acct-stat__value">{wishlistLoaded ? wishlistItems.length : "—"}</dd>
          </div>
          <div className="acct-stat">
            <dt className="acct-stat__label">{t("Addresses", "العناوين")}</dt>
            <dd className="acct-stat__value">{addressCount || 0}</dd>
          </div>
        </dl>
      </header>

      <div className="dashboard">
        {/* ── Navigation rail ── */}
        <nav className="acct-nav" aria-label={t("Account sections", "أقسام الحساب")}>
          <div className="acct-nav__list">
            {TABS.map((tabItem) => {
              const count = tabItem.id === "orders" ? ordersCount
                : tabItem.id === "wishlist" ? (wishlistLoaded ? wishlistItems.length : undefined)
                : tabItem.id === "addresses" ? addressCount
                : undefined;
              return (
                <button
                  key={tabItem.id}
                  className="acct-nav__item"
                  aria-current={tab === tabItem.id ? "true" : undefined}
                  type="button"
                  onClick={() => setTab(tabItem.id)}
                >
                  {tabItem.icon}
                  <span className="acct-nav__item-label">{t(tabItem.label, tabItem.label_ar)}</span>
                  {count != null && count > 0 && <span className="acct-nav__count">{count}</span>}
                </button>
              );
            })}
            <hr className="acct-nav__sep" />
            <button
              className="acct-nav__item acct-nav__item--danger acct-nav__signout"
              type="button"
              onClick={async () => { await signOut(); navigate("/"); }}
            >
              <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                <path d="M13 3h4a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1h-4" strokeLinecap="round" />
                <path d="M9 14l-4-4 4-4M5 10h9" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span className="acct-nav__item-label">{t("Sign out", "تسجيل الخروج")}</span>
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
            <div className="acct-panel">
              <div className="acct-section">
                <div className="acct-section__head">
                  <div>
                    <h2 className="acct-section__title">{t("Orders", "الطلبات")}</h2>
                    <p className="acct-section__desc">{t("Track fulfilment and revisit everything you've bought.", "تابع حالة الشحن وراجع كل ما اشتريته.")}</p>
                  </div>
                  {ordersData?.data?.length > 0 && (
                    <Link className="btn btn--secondary" to="/shop/perfumes">{t("Continue shopping", "متابعة التسوق")}</Link>
                  )}
                </div>

                {ordersLoading ? (
                  <div className="orders-list">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="acct-skel-card">
                        <span className="skel acct-skel-card__thumb" />
                        <div className="acct-skel-card__lines">
                          <span className="skel acct-skel-line" style={{ inlineSize: "6rem" }} />
                          <span className="skel acct-skel-line" style={{ inlineSize: "9rem" }} />
                        </div>
                        <span className="skel acct-skel-card__pill" />
                      </div>
                    ))}
                  </div>
                ) : !ordersData?.data?.length ? (
                  <div className="acct-empty">
                    <span className="acct-empty__mark" aria-hidden="true">
                      <svg viewBox="0 0 40 40" fill="none">
                        <rect x="8" y="4" width="24" height="32" rx="2.5" stroke="currentColor" strokeWidth="1.5" />
                        <path d="M14 13h12M14 19h12M14 25h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                      </svg>
                    </span>
                    <h3 className="acct-empty__title">{t("No orders yet", "لا توجد طلبات بعد")}</h3>
                    <p className="acct-empty__sub">
                      {t("When you place your first order, it'll live here — with live fulfilment status and every invoice.", "بمجرد أن تضع طلبك الأول، سيظهر هنا — مع حالة الشحن الحية وكل فاتورة.")}
                    </p>
                    <div className="acct-empty__actions">
                      <Link className="btn btn--primary" to="/shop/perfumes">{t("Start shopping", "ابدأ التسوق")}</Link>
                    </div>
                  </div>
                ) : (
                  <div className="orders-list">
                    {ordersData.data.map((o) => <OrderCard key={o.id} order={o} />)}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Billing ── */}
          {tab === "billing" && (
            <div className="acct-panel">
              {/* Payment methods */}
              <div className="acct-section">
                <div className="acct-section__head">
                  <div>
                    <h2 className="acct-section__title">{t("Payment methods", "وسائل الدفع")}</h2>
                    <p className="acct-section__desc">{t("Saved wallets for a faster checkout. We store the handle only — never a balance or PIN.", "محافظ محفوظة لإتمام الشراء بسرعة. نخزّن الرقم أو العنوان فقط — أبدًا الرصيد أو الرقم السري.")}</p>
                  </div>
                  {!pmFormOpen && (
                    <button className="btn btn--secondary" type="button" onClick={() => setPmFormOpen(true)}>
                      {t("Add method", "إضافة وسيلة")}
                    </button>
                  )}
                </div>

                {pmLoading ? (
                  <div className="wallets">
                    {[...Array(2)].map((_, i) => (
                      <div key={i} className="wallet">
                        <div className="wallet__row">
                          <span className="skel wallet__icon" style={{ border: 0 }} />
                          <div className="acct-skel-card__lines" style={{ flex: 1 }}>
                            <span className="skel acct-skel-line" style={{ inlineSize: "7rem" }} />
                            <span className="skel acct-skel-line" style={{ inlineSize: "10rem" }} />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : pmData?.data?.length ? (
                  <div className="wallets">
                    {pmData.data.map((pm) => {
                      const meta = PM_TYPES.find((pt) => pt.id === pm.type);
                      return (
                        <div key={pm.id} className={`wallet${pm.is_default ? " wallet--default" : ""}`}>
                          <div className="wallet__row">
                            <span className="wallet__icon" aria-hidden="true">{meta?.icon}</span>
                            <div className="wallet__info">
                              <span className="wallet__label">
                                {pm.label || (meta ? t(meta.label, meta.label_ar) : t("Wallet", "محفظة"))}
                                {pm.is_default && <span className="acct-badge">{t("Default", "افتراضي")}</span>}
                              </span>
                              <span className="wallet__handle">
                                {meta && t(meta.label, meta.label_ar)} · {maskHandle(pm.type, pm.handle)}
                              </span>
                            </div>
                          </div>
                          <div className="wallet__actions">
                            {!pm.is_default && (
                              <button className="acct-link-btn" type="button" onClick={() => makePmDefault(pm.id)}>
                                {t("Set default", "تعيين كافتراضي")}
                              </button>
                            )}
                            <span className="wallet__spacer" />
                            <button className="acct-icon-btn" type="button" onClick={() => openEditPm(pm)} aria-label={t("Edit payment method", "تعديل وسيلة الدفع")}>
                              <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                                <path d="M14.5 2.5a2 2 0 0 1 2.83 2.83L7 15.67 3 17l1.33-4L14.5 2.5z" strokeLinejoin="round" />
                              </svg>
                            </button>
                            <button className="acct-icon-btn acct-icon-btn--danger" type="button" onClick={() => { if (confirm(t("Delete this payment method?", "هل تريد حذف وسيلة الدفع هذه؟"))) removePm(pm.id); }} aria-label={t("Delete payment method", "حذف وسيلة الدفع")}>
                              <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                                <path d="M3 5h14M8 5V3h4v2M6 5l1 12h6l1-12" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  !pmFormOpen && (
                    <button type="button" className="acct-blank" onClick={() => setPmFormOpen(true)}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="M12 5v14M5 12h14" strokeLinecap="round" /></svg>
                      <span>{t("Add your first wallet for faster checkout", "أضف أول محفظة لإتمام الشراء بسرعة")}</span>
                    </button>
                  )
                )}

                {pmFormOpen && (
                  <form className="panel" onSubmit={handleSavePm} noValidate style={{ marginBlockStart: "var(--sp-4)" }}>
                    <div className="panel__body">
                      <div className="form-grid">
                        <div className="field">
                          <label className="field__label" htmlFor="pm-type">{t("Type", "النوع")}</label>
                          <div className="select-field">
                            <select
                              id="pm-type"
                              className="select"
                              value={pmForm.type}
                              onChange={(e) => setPmForm((f) => ({ ...f, type: e.target.value }))}
                            >
                              {PM_TYPES.map((pt) => <option key={pt.id} value={pt.id}>{t(pt.label, pt.label_ar)}</option>)}
                            </select>
                            <svg className="select-field__chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
                          </div>
                        </div>
                        <div className="field">
                          <label className="field__label" htmlFor="pm-handle">
                            {(() => {
                              const pt = PM_TYPES.find((x) => x.id === pmForm.type);
                              return pt && t(pt.handleLabel, pt.handleLabel_ar);
                            })()} <span className="field__req">*</span>
                          </label>
                          <input
                            id="pm-handle"
                            className="input"
                            value={pmForm.handle}
                            onChange={(e) => setPmForm((f) => ({ ...f, handle: e.target.value }))}
                            placeholder={PM_TYPES.find((pt) => pt.id === pmForm.type)?.placeholder}
                            inputMode={pmForm.type === "vodafone_cash" ? "numeric" : "text"}
                            autoComplete="off"
                            required
                          />
                        </div>
                        <div className="field field--full">
                          <label className="field__label" htmlFor="pm-label">{t("Label (optional)", "التسمية (اختياري)")}</label>
                          <input
                            id="pm-label"
                            className="input"
                            value={pmForm.label}
                            onChange={(e) => setPmForm((f) => ({ ...f, label: e.target.value }))}
                            placeholder={t("e.g. My Vodafone line", "مثال: خط فودافون الخاص بي")}
                          />
                        </div>
                        <div className="field--full addr-form__check">
                          <label>
                            <input
                              type="checkbox"
                              checked={pmForm.is_default}
                              onChange={(e) => setPmForm((f) => ({ ...f, is_default: e.target.checked }))}
                            />
                            {t("Set as default payment method", "تعيين كوسيلة الدفع الافتراضية")}
                          </label>
                        </div>
                      </div>
                    </div>
                    <div className="panel__foot">
                      <button className="btn btn--secondary" type="button" onClick={closePmForm}>{t("Cancel", "إلغاء")}</button>
                      <button className={`btn btn--primary${pmSaving ? " is-loading" : ""}`} type="submit" disabled={pmSaving}>
                        {pmSaving ? "" : editingPmId ? t("Update method", "تحديث الوسيلة") : t("Save method", "حفظ الوسيلة")}
                      </button>
                    </div>
                  </form>
                )}
              </div>

              {/* Billing details */}
              <div className="acct-section">
                <div className="acct-section__head">
                  <div>
                    <h2 className="acct-section__title acct-section__sub-title">{t("Billing details", "بيانات الفوترة")}</h2>
                    <p className="acct-section__desc">{t("The name, tax info and address printed on your invoices.", "الاسم والبيانات الضريبية والعنوان المطبوعة على فواتيرك.")}</p>
                  </div>
                </div>

                <form
                  className="panel"
                  noValidate
                  onSubmit={(e) => { e.preventDefault(); saveBilling(billingForm); }}
                >
                  <div className="panel__body">
                    {addressesData?.data?.length > 0 && (
                      <div className="field field--full" style={{ marginBlockEnd: "var(--sp-5)" }}>
                        <label className="field__label" htmlFor="bl-copy">{t("Prefill from a saved address", "التعبئة من عنوان محفوظ")}</label>
                        <div className="select-field">
                          <select
                            id="bl-copy"
                            className="select"
                            value=""
                            onChange={(e) => fillBillingFromAddress(addressesData.data.find((a) => a.id === e.target.value))}
                          >
                            <option value="">{t("Choose an address…", "اختر عنوانًا…")}</option>
                            {addressesData.data.map((a) => {
                              const govMeta = GOVERNORATES.find((g) => g.slug === a.governorate);
                              return (
                                <option key={a.id} value={a.id}>
                                  {(a.label || t("Address", "العنوان"))}
                                  {govMeta ? ` — ${t(govMeta.en, govMeta.ar)}` : ""}
                                  {a.is_default ? ` (${t("default", "افتراضي")})` : ""}
                                </option>
                              );
                            })}
                          </select>
                          <svg className="select-field__chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
                        </div>
                      </div>
                    )}

                    <div className="form-grid">
                      <div className="field">
                        <label className="field__label" htmlFor="bl-name">{t("Full name", "الاسم الكامل")}</label>
                        <input id="bl-name" className="input" value={billingForm.full_name} onChange={(e) => setBillingForm((f) => ({ ...f, full_name: e.target.value }))} autoComplete="name" placeholder={t("Recipient on the invoice", "اسم المستلم على الفاتورة")} />
                      </div>
                      <div className="field">
                        <label className="field__label" htmlFor="bl-company">{t("Company (optional)", "الشركة (اختياري)")}</label>
                        <input id="bl-company" className="input" value={billingForm.company} onChange={(e) => setBillingForm((f) => ({ ...f, company: e.target.value }))} placeholder={t("Company name", "اسم الشركة")} />
                      </div>
                      <div className="field">
                        <label className="field__label" htmlFor="bl-tax">{t("Tax ID (optional)", "الرقم الضريبي (اختياري)")}</label>
                        <input id="bl-tax" className="input" value={billingForm.tax_id} onChange={(e) => setBillingForm((f) => ({ ...f, tax_id: e.target.value }))} inputMode="numeric" placeholder={t("Tax registration number", "رقم التسجيل الضريبي")} />
                      </div>
                      <div className="field">
                        <label className="field__label" htmlFor="bl-gov">{t("Governorate", "المحافظة")}</label>
                        <div className="select-field">
                          <select id="bl-gov" className="select" value={billingForm.governorate} onChange={(e) => setBillingForm((f) => ({ ...f, governorate: e.target.value }))}>
                            <option value="">{t("Select governorate", "اختر المحافظة")}</option>
                            {GOVERNORATES.map((g) => (
                              <option key={g.slug} value={g.slug}>{t(g.en, g.ar)}</option>
                            ))}
                          </select>
                          <svg className="select-field__chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
                        </div>
                      </div>
                      <div className="field">
                        <label className="field__label" htmlFor="bl-city">{t("City / Area (optional)", "المدينة / المنطقة (اختياري)")}</label>
                        <input id="bl-city" className="input" value={billingForm.city} onChange={(e) => setBillingForm((f) => ({ ...f, city: e.target.value }))} placeholder={t("City or district", "المدينة أو الحي")} />
                      </div>
                      <div className="field field--full">
                        <label className="field__label" htmlFor="bl-street">{t("Billing address", "عنوان الفوترة")}</label>
                        <input id="bl-street" className="input" value={billingForm.street} onChange={(e) => setBillingForm((f) => ({ ...f, street: e.target.value }))} placeholder={t("Street, building, floor…", "الشارع، المبنى، الطابق…")} />
                      </div>
                    </div>
                  </div>
                  <div className="panel__foot">
                    <span className="panel__foot-note">{t("Shown on every invoice you download.", "يظهر على كل فاتورة تحمّلها.")}</span>
                    <button className={`btn btn--primary${billingSaving ? " is-loading" : ""}`} type="submit" disabled={billingSaving}>
                      {billingSaving ? "" : t("Save billing details", "حفظ بيانات الفوترة")}
                    </button>
                  </div>
                </form>
              </div>

              {/* Billing history */}
              <div className="acct-section">
                <div className="acct-section__head">
                  <div>
                    <h2 className="acct-section__title acct-section__sub-title">{t("Billing history", "سجل الفواتير")}</h2>
                    <p className="acct-section__desc">{t("Every order and its invoice, in one place.", "كل طلب وفاتورته، في مكان واحد.")}</p>
                  </div>
                </div>

                {ordersLoading ? (
                  <div className="orders-list">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="acct-skel-card">
                        <div className="acct-skel-card__lines">
                          <span className="skel acct-skel-line" style={{ inlineSize: "6rem" }} />
                          <span className="skel acct-skel-line" style={{ inlineSize: "9rem" }} />
                        </div>
                        <span className="skel acct-skel-card__pill" style={{ gridColumn: 3 }} />
                      </div>
                    ))}
                  </div>
                ) : !ordersData?.data?.length ? (
                  <div className="acct-empty">
                    <span className="acct-empty__mark" aria-hidden="true">
                      <svg viewBox="0 0 40 40" fill="none">
                        <path d="M11 5h18a1 1 0 0 1 1 1v29l-3.5-2L24 35l-3.5-2L17 35l-3.5-2L10 35V6a1 1 0 0 1 1-1z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
                        <path d="M15 14h10M15 20h10M15 26h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                      </svg>
                    </span>
                    <h3 className="acct-empty__title">{t("No invoices yet", "لا توجد فواتير بعد")}</h3>
                    <p className="acct-empty__sub">{t("Your invoices appear here the moment your first order is placed.", "تظهر فواتيرك هنا بمجرد وضع طلبك الأول.")}</p>
                    <div className="acct-empty__actions">
                      <Link className="btn btn--primary" to="/shop/perfumes">{t("Start shopping", "ابدأ التسوق")}</Link>
                    </div>
                  </div>
                ) : (
                  <div className="bill-table-wrap">
                    <table className="bill-table">
                      <thead>
                        <tr>
                          <th>{t("Invoice", "الفاتورة")}</th>
                          <th>{t("Date", "التاريخ")}</th>
                          <th className="bill-table__num">{t("Items", "المنتجات")}</th>
                          <th>{t("Method", "الطريقة")}</th>
                          <th>{t("Status", "الحالة")}</th>
                          <th className="bill-table__num">{t("Amount", "المبلغ")}</th>
                          <th aria-label={t("Actions", "إجراءات")} />
                        </tr>
                      </thead>
                      <tbody>
                        {ordersData.data.map((o) => (
                          <BillingTableRow key={o.id} order={o} onView={setInvoiceOrder} />
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Profile ── */}
          {tab === "profile" && (
            <div className="acct-panel">
              {/* Identity card */}
              <div className="acct-idcard">
                <div className="acct-idcard__avatar" aria-hidden="true"><span>{initials}</span></div>
                <div className="acct-idcard__text">
                  <p className="acct-idcard__name">{profileForm.full_name || user.email?.split("@")[0]}</p>
                  <p className="acct-idcard__email">{user.email}</p>
                </div>
                {memberSince && <span className="acct-idcard__since">{t(`Since ${memberSince}`, `منذ ${memberSince}`)}</span>}
              </div>

              {/* Personal info */}
              <div className="acct-section">
                <div className="acct-section__head">
                  <div>
                    <h2 className="acct-section__title acct-section__sub-title">{t("Personal information", "المعلومات الشخصية")}</h2>
                    <p className="acct-section__desc">{t("How we address you, and where to reach you about an order.", "كيف نخاطبك، وكيف نتواصل معك بخصوص طلب ما.")}</p>
                  </div>
                </div>
                <form
                  className="panel"
                  noValidate
                  onSubmit={(e) => { e.preventDefault(); saveProfile(profileForm); }}
                >
                  <div className="panel__body">
                    <div className="form-grid">
                  <div className="field">
                    <label className="field__label" htmlFor="pf-name">{t("Full name", "الاسم الكامل")}</label>
                    <input
                      id="pf-name"
                      className="input"
                      value={profileForm.full_name}
                      onChange={(e) => setProfileForm((f) => ({ ...f, full_name: e.target.value }))}
                      autoComplete="name"
                      placeholder={t("Your name", "اسمك")}
                    />
                  </div>
                  <div className="field">
                    <label className="field__label" htmlFor="pf-gender">{t("Gender", "الجنس")}</label>
                    <div className="select-field">
                      <select
                        id="pf-gender"
                        className="select"
                        value={profileForm.gender}
                        onChange={(e) => setProfileForm((f) => ({ ...f, gender: e.target.value }))}
                      >
                        <option value="">{t("Select", "اختر")}</option>
                        <option value="male">{t("Male", "ذكر")}</option>
                        <option value="female">{t("Female", "أنثى")}</option>
                      </select>
                      <svg className="select-field__chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
                    </div>
                  </div>
                  <div className="field">
                    <label className="field__label" htmlFor="pf-dob">{t("Date of birth", "تاريخ الميلاد")}</label>
                    <input
                      id="pf-dob"
                      className="input"
                      type="date"
                      value={profileForm.date_of_birth}
                      onChange={(e) => setProfileForm((f) => ({ ...f, date_of_birth: e.target.value }))}
                    />
                  </div>
                    </div>
                  </div>
                  <div className="panel__foot">
                    <button
                      className={`btn btn--primary${profileSaving ? " is-loading" : ""}`}
                      type="submit"
                      disabled={profileSaving}
                    >
                      {profileSaving ? "" : t("Save changes", "حفظ التغييرات")}
                    </button>
                  </div>
                </form>
              </div>

              {/* Sign-in & security — OTP-gated email / password / phone changes */}
              <SecurityCenter phone={profileData?.data?.phone_number} />
            </div>
          )}

          {/* ── Addresses ── */}
          {tab === "addresses" && (
            <div className="acct-panel">
              <div className="acct-section">
                <div className="acct-section__head">
                  <div>
                    <h2 className="acct-section__title">{t("Addresses", "العناوين")}</h2>
                    <p className="acct-section__desc">{t("Save where you want your fragrances delivered. Your default is used first at checkout.", "احفظ أين تريد توصيل عطورك. عنوانك الافتراضي يُستخدم أولًا عند الدفع.")}</p>
                  </div>
                  {addresses.length > 0 && (
                    <button className="btn btn--secondary" type="button" onClick={() => setAddrFormOpen(true)}>
                      {t("Add address", "إضافة عنوان")}
                    </button>
                  )}
                </div>

                {addrLoading ? (
                  <div className="addr-cards">
                    {[...Array(2)].map((_, i) => (
                      <div key={i} className="addr">
                        <span className="skel" style={{ blockSize: "150px", display: "block" }} />
                        <div className="addr__content">
                          <span className="skel acct-skel-line" style={{ inlineSize: "5rem" }} />
                          <span className="skel acct-skel-line" style={{ inlineSize: "80%" }} />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : addresses.length === 0 ? (
                  <div className="acct-empty">
                    <span className="acct-empty__mark" aria-hidden="true">
                      <svg viewBox="0 0 36 36" fill="none">
                        <path d="M18 32s-13-8-13-18a13 13 0 0 1 26 0c0 10-13 18-13 18z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
                        <circle cx="18" cy="14" r="4" stroke="currentColor" strokeWidth="1.5" />
                      </svg>
                    </span>
                    <h3 className="acct-empty__title">{t("No addresses saved", "لا توجد عناوين محفوظة")}</h3>
                    <p className="acct-empty__sub">{t("Add a delivery address once and checkout becomes a single tap — pin it on the map or detect it automatically.", "أضف عنوان توصيل مرة واحدة ليصبح الدفع بضغطة واحدة — حدده على الخريطة أو اكتشفه تلقائيًا.")}</p>
                    <div className="acct-empty__actions">
                      <button className="btn btn--primary" type="button" onClick={() => setAddrFormOpen(true)}>{t("Add address", "إضافة عنوان")}</button>
                    </div>
                  </div>
                ) : (
                  <div className="addr-cards">
                    {addresses.map((addr) => {
                      const govMeta = GOVERNORATES.find((g) => g.slug === addr.governorate);
                      return (
                      <div key={addr.id} className={`addr${addr.is_default ? " addr--default" : ""}`}>
                        {addr.latitude != null && addr.longitude != null ? (
                          <div className="addr__map"><AddrCardMap lat={addr.latitude} lon={addr.longitude} /></div>
                        ) : (
                          <div className="addr__nomap" aria-hidden="true">
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 22s-8-4.5-8-11.8A8 8 0 0 1 12 2a8 8 0 0 1 8 8.2c0 7.3-8 11.8-8 11.8z" /><circle cx="12" cy="10" r="3" /></svg>
                          </div>
                        )}
                        <div className="addr__content">
                          <div className="addr__head">
                            <span className="addr__label">{addr.label || t("Address", "العنوان")}</span>
                            {addr.is_default && <span className="acct-badge">{t("Default", "افتراضي")}</span>}
                          </div>
                          <div className="addr__lines">
                            {addr.governorate && (
                              <span>{govMeta ? t(govMeta.en, govMeta.ar) : addr.governorate.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}</span>
                            )}
                            {addr.street && <span>{addr.street}</span>}
                            {addr.phone && <span className="addr__phone">{addr.phone}</span>}
                          </div>
                          <div className="addr__actions">
                            {!addr.is_default && (
                              <button className="acct-link-btn" type="button" onClick={() => makeDefault(addr.id)}>
                                {t("Set default", "تعيين كافتراضي")}
                              </button>
                            )}
                            <span className="addr__spacer" />
                            <button className="acct-icon-btn" type="button" onClick={() => openEditAddr(addr)} aria-label={t("Edit address", "تعديل العنوان")}>
                              <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                                <path d="M14.5 2.5a2 2 0 0 1 2.83 2.83L7 15.67 3 17l1.33-4L14.5 2.5z" strokeLinejoin="round" />
                              </svg>
                            </button>
                            <button className="acct-icon-btn acct-icon-btn--danger" type="button" onClick={() => { if (confirm(t("Delete this address?", "هل تريد حذف هذا العنوان؟"))) removeAddress(addr.id); }} aria-label={t("Delete address", "حذف العنوان")}>
                              <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                                <path d="M3 5h14M8 5V3h4v2M6 5l1 12h6l1-12" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      </div>
                      );
                    })}
                  </div>
                )}

              <div
                className={`pw-modal-backdrop addr-modal-backdrop${addrFormOpen ? " is-open" : ""}`}
                role="dialog"
                aria-modal="true"
                aria-labelledby="addr-modal-title"
                onClick={(e) => { if (e.target === e.currentTarget) closeAddrForm(); }}
              >
                <div className="pw-modal__card addr-modal__card">
                  <div className="addr-modal__head">
                    <div>
                      <h2 className="pw-modal__title" id="addr-modal-title">{editingAddrId ? t("Edit address", "تعديل العنوان") : t("New address", "عنوان جديد")}</h2>
                      <p className="pw-modal__sub">{t("Search a place, drop a pin on the map, or detect your location.", "ابحث عن مكان، أو حدد نقطة على الخريطة، أو اكتشف موقعك.")}</p>
                    </div>
                    <button className="acct-icon-btn" type="button" onClick={closeAddrForm} aria-label={t("Close", "إغلاق")}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" style={{ width: "1.1rem", height: "1.1rem" }}><path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" /></svg>
                    </button>
                  </div>
                  <form className="addr-modal__form" onSubmit={handleSaveAddr} noValidate>
                    <div className="addr-modal__scroll">
                    <div className="form-grid">
                    <div className="field">
                      <label className="field__label" htmlFor="af-label">{t("Label", "التسمية")}</label>
                      <input
                        id="af-label"
                        className="input"
                        value={addrForm.label}
                        onChange={(e) => setAddrForm((f) => ({ ...f, label: e.target.value }))}
                        placeholder={t("Home, Work, Parents…", "المنزل، العمل، بيت الأهل…")}
                      />
                    </div>
                    <div className="field">
                      <label className="field__label" htmlFor="af-phone">{t("Phone (optional)", "الهاتف (اختياري)")}</label>
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
                        {t("Governorate", "المحافظة")} <span className="field__req">*</span>
                      </label>
                      <div className="select-field">
                        <select
                          id="af-gov"
                          className="select"
                          value={addrForm.governorate}
                          onChange={(e) => setAddrForm((f) => ({ ...f, governorate: e.target.value }))}
                          required
                        >
                          <option value="">{t("Select governorate", "اختر المحافظة")}</option>
                          {GOVERNORATES.map((g) => (
                            <option key={g.slug} value={g.slug}>{t(g.en, g.ar)}</option>
                          ))}
                        </select>
                        <svg className="select-field__chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
                      </div>
                    </div>
                    <div className="field field--full">
                      <label className="field__label" htmlFor="af-street">
                        {t("Street address", "عنوان الشارع")} <span className="field__req">*</span>
                      </label>
                      <input
                        id="af-street"
                        className="input"
                        value={addrForm.street}
                        onChange={(e) => setAddrForm((f) => ({ ...f, street: e.target.value }))}
                        placeholder={t("Street, building, floor…", "الشارع، المبنى، الطابق…")}
                        required
                      />
                    </div>

                    <div className="field--full locpick">
                      <div className="locpick__panel">
                        <p className="locpick__title">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" /></svg>
                          {t("Search any location", "ابحث عن أي موقع")}
                        </p>
                        <p className="locpick__hint">{t("Type a landmark, street, or area", "اكتب معلمًا، شارعًا، أو منطقة")}</p>
                        <input
                          id="loc-search"
                          className="input"
                          type="search"
                          value={locSearch}
                          onChange={(e) => searchLocation(e.target.value)}
                          placeholder={t("e.g. Cairo Tower, Maadi, Heliopolis…", "مثال: برج القاهرة، المعادي، مصر الجديدة…")}
                          autoComplete="off"
                        />
                        {locSearching && (
                          <p style={{ fontSize: "var(--fs-xs)", color: "var(--muted)", marginBlockStart: "var(--sp-1)" }}>{t("Searching…", "جارٍ البحث…")}</p>
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
                      <div className="locpick__or"><span>{t("or", "أو")}</span></div>
                      <div className="locpick__panel">
                        <p className="locpick__title">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="3" /><path d="M12 2v3m0 14v3M2 12h3m14 0h3" /><circle cx="12" cy="12" r="9" strokeDasharray="2 4" /></svg>
                          {t("Use my current location", "استخدم موقعي الحالي")}
                        </p>
                        <p className="locpick__hint">{t("Let the browser detect where you are", "دع المتصفح يكتشف مكانك")}</p>
                        <button
                          type="button"
                          className={`btn btn--ghost locate-btn${gpsLoading ? " is-loading" : ""}`}
                          onClick={locateForAddress}
                          disabled={gpsLoading}
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="3" /><path d="M12 2v3m0 14v3M2 12h3m14 0h3" /><circle cx="12" cy="12" r="9" strokeDasharray="2 4" /></svg>
                          {gpsLoading ? t("Detecting…", "جارٍ الاكتشاف…") : t("Detect my location", "اكتشف موقعي")}
                        </button>
                        {gpsCoords && (
                          <div className="gps-pin">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 22s-8-4.5-8-11.8A8 8 0 0 1 12 2a8 8 0 0 1 8 8.2c0 7.3-8 11.8-8 11.8z" /><circle cx="12" cy="10" r="3" /></svg>
                            <span>{gpsCoords.lat.toFixed(6)}°, {gpsCoords.lon.toFixed(6)}°</span>
                            <a className="gps-pin__link" href={`https://www.openstreetmap.org/?mlat=${gpsCoords.lat}&mlon=${gpsCoords.lon}&zoom=16`} target="_blank" rel="noopener noreferrer">{t("View on map", "عرض على الخريطة")}</a>
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
                        {t("Set as default delivery address", "تعيين كعنوان التوصيل الافتراضي")}
                      </label>
                    </div>
                    </div>
                    </div>
                    <div className="addr-modal__foot">
                      <button className="btn btn--secondary" type="button" onClick={closeAddrForm}>
                        {t("Cancel", "إلغاء")}
                      </button>
                      <button
                        className={`btn btn--primary${addrSaving ? " is-loading" : ""}`}
                        type="submit"
                        disabled={addrSaving}
                      >
                        {addrSaving ? "" : editingAddrId ? t("Update address", "تحديث العنوان") : t("Save address", "حفظ العنوان")}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
              </div>
            </div>
          )}

          {/* ── Wishlist ── */}
          {tab === "wishlist" && (
            <div className="acct-panel">
              <div className="acct-section">
                <div className="acct-section__head">
                  <div>
                    <h2 className="acct-section__title">{t("Wishlist", "المفضلة")}</h2>
                    <p className="acct-section__desc">{t("The fragrances you've saved to revisit — your personal collection.", "العطور التي حفظتها للرجوع إليها — مجموعتك الخاصة.")}</p>
                  </div>
                  {wishlistLoaded && wishlistItems.length > 0 && (
                    <span className="dash-panel__count">{t(`${wishlistItems.length} saved`, `${wishlistItems.length} محفوظ`)}</span>
                  )}
                </div>

              {!wishlistLoaded ? (
                <div className="catalog-grid dash-wishlist-grid" aria-hidden="true">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="wl-card-skel">
                      <span className="skel wl-card-skel__img" />
                      <span className="skel wl-card-skel__line" />
                      <span className="skel wl-card-skel__line wl-card-skel__line--short" />
                    </div>
                  ))}
                </div>
              ) : wishlistItems.length === 0 ? (
                <div className="wl-empty">
                  <div className="wl-empty__hero">
                    <span className="wl-empty__mark" aria-hidden="true">
                      <svg viewBox="0 0 48 48" fill="none">
                        <path
                          d="M24 40S8 30.5 8 19.8A8.8 8.8 0 0 1 24 12a8.8 8.8 0 0 1 16 7.8C40 30.5 24 40 24 40z"
                          stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"
                        />
                      </svg>
                    </span>
                    <h3 className="wl-empty__title">{t("Your collection awaits", "مجموعتك في انتظارك")}</h3>
                    <p className="wl-empty__sub">
                      {t("Every TIBR fragrance carries a story. Save the ones that move you, and they'll be waiting here — ready whenever you are.", "كل عطر من تِبْر يحمل قصة. احفظ ما يلامس مشاعرك، وسيكون في انتظارك هنا — جاهزًا وقتما تشاء.")}
                    </p>
                    <div className="wl-empty__actions">
                      <Link className="btn btn--primary" to="/shop/perfumes">
                        {t("Explore fragrances", "استكشف العطور")}
                      </Link>
                      <Link className="btn btn--secondary" to="/">
                        {t("Discover the house", "اكتشف البيت")}
                      </Link>
                    </div>
                  </div>

                  {(recoLoading || recoProducts.length > 0) && (
                    <section className="wl-reco" aria-label={t("Recommended fragrances", "عطور مقترحة")}>
                      <div className="wl-reco__head">
                        <h4 className="wl-reco__title">{t("You might fall for", "قد يعجبك")}</h4>
                        <Link className="wl-reco__link" to="/shop/perfumes">
                          {t("Browse all", "تصفح الكل")}
                          <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
                            <path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </Link>
                      </div>
                      {recoLoading ? (
                        <div className="catalog-grid dash-wishlist-grid" aria-hidden="true">
                          {[...Array(3)].map((_, i) => (
                            <div key={i} className="wl-card-skel">
                              <span className="skel wl-card-skel__img" />
                              <span className="skel wl-card-skel__line" />
                              <span className="skel wl-card-skel__line wl-card-skel__line--short" />
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="catalog-grid dash-wishlist-grid">
                          {recoProducts.map((p, i) => (
                            <ProductCard key={p.id} product={p} index={i} />
                          ))}
                        </div>
                      )}
                    </section>
                  )}
                </div>
              ) : (
                <div className="catalog-grid dash-wishlist-grid">
                  {wishlistItems.map((p, i) => (
                    <ProductCard key={p.id} product={p} index={i} />
                  ))}
                </div>
              )}
              </div>
            </div>
          )}

        </motion.div>
      </div>

      {/* ── Invoice modal ── */}
      <div
        className={`inv-modal-backdrop${invoiceOrder ? " is-open" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label={t("Invoice", "الفاتورة")}
        onClick={(e) => { if (e.target === e.currentTarget) setInvoiceOrder(null); }}
      >
        <div className="inv-modal__card">
          <div className="inv-modal__bar">
            <button className="btn btn--secondary" type="button" onClick={() => window.print()}>
              <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true" style={{ width: "1rem", height: "1rem" }}>
                <path d="M5 8V3h10v5M5 14H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v4a1 1 0 0 1-1 1h-1" strokeLinejoin="round" />
                <path d="M5 12h10v5H5z" strokeLinejoin="round" />
              </svg>
              {t("Print / Save PDF", "طباعة / حفظ PDF")}
            </button>
            <button className="btn btn--ghost" type="button" onClick={() => setInvoiceOrder(null)} aria-label={t("Close", "إغلاق")}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" style={{ width: "1.2rem", height: "1.2rem" }}><path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" /></svg>
            </button>
          </div>
          <div className="inv-modal__scroll">
            <InvoiceDoc order={invoiceOrder} billing={billingData?.data} />
          </div>
        </div>
      </div>
    </div>
  );
}
