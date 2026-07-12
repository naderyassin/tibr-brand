import { useState, useEffect, useRef, useMemo } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/stores/auth";
import {
  adminGetProducts, adminCreateProduct, adminUpdateProduct,
  adminGetBrands, adminCreateBrand, adminGetOriginals, adminCreateOriginal,
} from "@/lib/api";
import { useToast } from "@/components/ui/Toast";
import { NOTES_CATALOG } from "@/lib/notesCatalog";
import {
  LINES, PRODUCT_TYPES, AUDIENCES, CLASSIFICATIONS, CONCENTRATIONS,
  LONGEVITY, SILLAGE, FAMILIES, SEASONS, STATUSES, NOTE_LAYERS,
  biLabel, requiresOriginal, slugify,
} from "@/lib/taxonomy";
import JoditEditor from "jodit-react";

// slug -> { en, ar, family }, so the form can hold note SLUGS (what the API
// wants) while showing bilingual labels.
const NOTE_BY_SLUG = new Map(
  Object.entries(NOTES_CATALOG).flatMap(([family, notes]) =>
    notes.map((n) => [slugify(n.en), { ...n, family }])
  )
);
const ALL_NOTES = [...NOTE_BY_SLUG.entries()].map(([slug, n]) => ({ slug, ...n }));

const EMPTY_VARIANT = {
  size_label: "", size_ml: "", sku: "", price: "", compare_at_price: "",
  quantity: "", is_default: false,
};

const EMPTY_FORM = {
  id: "", slug: "", status: "active",
  brand_id: "", line: "", original_perfume_id: "", product_type: "perfume", audience: "",
  classification: "", concentration: "", longevity: "", sillage: "",
  families: [], seasons: [], tags: "",
  ar_name: "", en_name: "", ar_desc: "", en_desc: "",
  images: [],
  variants: [{ ...EMPTY_VARIANT, is_default: true }],
  notes: { top: [], heart: [], base: [] },
  is_bestseller: false, is_spotlight: false,
};

const generateNextId = (products) => {
  const max = (products || []).reduce((m, p) => {
    const n = parseInt(p.id, 10);
    return Number.isNaN(n) ? m : Math.max(m, n);
  }, 0);
  return String(max + 1);
};

/* ── Multi-select chips, for families / seasons ─────────────────────────── */
function ChipSelect({ label, vocab, selected, onChange, hint }) {
  const toggle = (slug) =>
    onChange(selected.includes(slug) ? selected.filter((s) => s !== slug) : [...selected, slug]);

  return (
    <div className="field field--full">
      <label className="field__label">{label}</label>
      <div className="chip-row">
        {vocab.map((v) => (
          <button
            key={v.slug}
            type="button"
            className={`chip${selected.includes(v.slug) ? " is-on" : ""}`}
            onClick={() => toggle(v.slug)}
            aria-pressed={selected.includes(v.slug)}
          >
            {v.en} <span className="chip__ar">{v.ar}</span>
          </button>
        ))}
      </div>
      {hint && <p className="field__hint">{hint}</p>}
    </div>
  );
}

/* ── Searchable bilingual note picker. Holds slugs, shows labels. ───────── */
function NotesInput({ id, label, value, onChange }) {
  const inputRef = useRef(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    return ALL_NOTES
      .filter((n) => !value.includes(n.slug))
      .filter((n) => !q || n.en.toLowerCase().includes(q) || n.ar.includes(query.trim()))
      .slice(0, 80);
  }, [query, value]);

  const add = (slug) => { onChange([...value, slug]); setQuery(""); inputRef.current?.focus(); };
  const remove = (slug) => onChange(value.filter((s) => s !== slug));

  return (
    <div className="field field--full">
      <label className="field__label" htmlFor={id}>{label}</label>
      <div className="notes-tag-wrap" onClick={() => inputRef.current?.focus()}>
        <div className="notes-tags">
          {value.map((slug) => (
            <span key={slug} className="notes-tag">
              {NOTE_BY_SLUG.get(slug)?.en || slug}
              <button
                type="button"
                className="notes-tag__remove"
                onMouseDown={(e) => { e.preventDefault(); remove(slug); }}
                aria-label={`Remove ${slug}`}
              >×</button>
            </span>
          ))}
          <input
            ref={inputRef}
            id={id}
            className="notes-tag__input"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
            onFocus={() => setOpen(true)}
            onBlur={() => setTimeout(() => setOpen(false), 150)}
            placeholder={value.length ? "" : "ابحث عن نوتة… / search a note…"}
            autoComplete="off"
          />
        </div>
        {open && matches.length > 0 && (
          <div className="notes-dropdown" data-lenis-prevent>
            {matches.map((n) => (
              <button
                key={n.slug}
                type="button"
                className="notes-dropdown__item"
                onMouseDown={(e) => { e.preventDefault(); add(n.slug); }}
              >
                <span className="notes-dropdown__en">{n.en}</span>
                <span className="notes-dropdown__ar">{n.ar}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Variants: the whole point of the new model. Price, stock and SKU are
     per size, so 50ml can sell out while 100ml stays live. ──────────────── */
function VariantsEditor({ variants, onChange }) {
  const patch = (i, key, val) =>
    onChange(variants.map((v, idx) => (idx === i ? { ...v, [key]: val } : v)));

  const setDefault = (i) =>
    onChange(variants.map((v, idx) => ({ ...v, is_default: idx === i })));

  const add = () => onChange([...variants, { ...EMPTY_VARIANT, is_default: variants.length === 0 }]);

  const remove = (i) => {
    const next = variants.filter((_, idx) => idx !== i);
    if (next.length && !next.some((v) => v.is_default)) next[0].is_default = true;
    onChange(next);
  };

  return (
    <div className="field field--full">
      <div className="variants">
        <div className="variants__head">
          <span>Size</span><span>ml</span><span>SKU</span>
          <span>Price</span><span>Compare at</span><span>Stock</span>
          <span title="The size preselected on the product page">Default</span><span />
        </div>

        {variants.map((v, i) => (
          <div className="variants__row" key={i}>
            <input className="input" placeholder="50ml" value={v.size_label}
              onChange={(e) => {
                const label = e.target.value;
                patch(i, "size_label", label);
                // auto-fill ml from the label, but never fight a manual edit
                const ml = label.replace(/[^0-9.]/g, "");
                if (ml && !v.size_ml) patch(i, "size_ml", ml);
              }} />
            <input className="input" type="number" min="0" placeholder="50" value={v.size_ml}
              onChange={(e) => patch(i, "size_ml", e.target.value)} />
            <input className="input" placeholder="TIBR-1-50" value={v.sku}
              onChange={(e) => patch(i, "sku", e.target.value)} />
            <input className="input" type="number" min="0" step="1" placeholder="900" value={v.price}
              onChange={(e) => patch(i, "price", e.target.value)} required />
            <input className="input" type="number" min="0" step="1" placeholder="—" value={v.compare_at_price}
              onChange={(e) => patch(i, "compare_at_price", e.target.value)} />
            <input className="input" type="number" min="0" step="1" placeholder="0" value={v.quantity}
              onChange={(e) => patch(i, "quantity", e.target.value)} />
            <label className="variants__default">
              <input type="radio" name="variant-default" checked={!!v.is_default}
                onChange={() => setDefault(i)} />
            </label>
            <button type="button" className="variants__remove" onClick={() => remove(i)}
              disabled={variants.length === 1} aria-label="Remove size">×</button>
          </div>
        ))}
      </div>

      <button type="button" className="btn btn--outline btn--sm" onClick={add}>+ Add size</button>
      <p className="field__hint">
        Every size carries its own price and stock. Compare-at is the struck-through
        “was” price — leave it empty if the size isn’t on sale.
      </p>
    </div>
  );
}

/* ── Inline creator, so a new house or original doesn't force you off the page ── */
function InlineCreate({ open, onClose, title, fields, onSubmit, pending }) {
  const [draft, setDraft] = useState({});
  if (!open) return null;
  return (
    <div className="inline-create">
      <p className="inline-create__title">{title}</p>
      <div className="inline-create__grid">
        {fields.map((f) => (
          f.options ? (
            <select key={f.key} className="select" value={draft[f.key] || ""}
              onChange={(e) => setDraft((d) => ({ ...d, [f.key]: e.target.value }))}>
              <option value="">{f.label}</option>
              {f.options.map((o) => <option key={o.slug} value={o.slug}>{biLabel(f.options, o.slug)}</option>)}
            </select>
          ) : (
            <input key={f.key} className="input" placeholder={f.label} value={draft[f.key] || ""}
              onChange={(e) => setDraft((d) => ({ ...d, [f.key]: e.target.value }))} />
          )
        ))}
      </div>
      <div className="inline-create__actions">
        <button type="button" className="btn btn--primary btn--sm" disabled={pending}
          onClick={() => onSubmit(draft, () => setDraft({}))}>Add</button>
        <button type="button" className="btn btn--ghost btn--sm" onClick={onClose}>Cancel</button>
      </div>
    </div>
  );
}

export default function AdminProduct() {
  const [params] = useSearchParams();
  const editId = params.get("id");
  const { token } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const qc = useQueryClient();
  const fileInputRef = useRef(null);

  const [form, setForm] = useState(EMPTY_FORM);
  const [descLang, setDescLang] = useState("ar");
  const [uploading, setUploading] = useState(false);
  const [slugTouched, setSlugTouched] = useState(false);
  const [newBrand, setNewBrand] = useState(false);
  const [newOriginal, setNewOriginal] = useState(false);

  const { data: allProducts } = useQuery({
    queryKey: ["admin-products", token], queryFn: () => adminGetProducts(token), enabled: !!token,
  });
  const { data: brandsRes } = useQuery({
    queryKey: ["admin-brands", token], queryFn: () => adminGetBrands(token), enabled: !!token,
  });
  const { data: originalsRes } = useQuery({
    queryKey: ["admin-originals", token], queryFn: () => adminGetOriginals(token), enabled: !!token,
  });

  const brands = brandsRes?.data || [];
  const originals = originalsRes?.data || [];
  const houseBrand = brands.find((b) => b.is_house);

  useEffect(() => {
    if (!editId && allProducts?.data) {
      setForm((f) => ({ ...f, id: f.id || generateNextId(allProducts.data) }));
    }
  }, [allProducts, editId]);

  // Fill the form when editing. The API returns the full graph, so variants and
  // the notes pyramid come back with the product.
  useEffect(() => {
    if (!editId || !allProducts?.data) return;
    const p = allProducts.data.find((x) => x.id === editId);
    if (!p) return;

    setSlugTouched(true);
    setForm({
      id: p.id,
      slug: p.slug || "",
      status: p.status || "active",
      brand_id: p.brand_id || "",
      line: p.line || "",
      original_perfume_id: p.original_perfume_id || "",
      product_type: p.product_type || "perfume",
      audience: p.audience || "",
      classification: p.classification || "",
      concentration: p.concentration || "",
      longevity: p.longevity || "",
      sillage: p.sillage || "",
      families: p.families || [],
      seasons: p.seasons || [],
      tags: (p.tags || []).join(", "),
      ar_name: p.ar_name || "",
      en_name: p.en_name || "",
      ar_desc: p.ar_desc || "",
      en_desc: p.en_desc || "",
      images: p.images?.length ? p.images : (p.image ? [p.image] : []),
      variants: p.variants?.length
        ? p.variants.map((v) => ({
            size_label: v.size_label || "", size_ml: v.size_ml ?? "", sku: v.sku || "",
            price: v.price ?? "", compare_at_price: v.compare_at_price ?? "",
            quantity: v.quantity ?? "", is_default: !!v.is_default,
          }))
        : [{ ...EMPTY_VARIANT, is_default: true }],
      notes: {
        top: (p.notes?.top || []).map((n) => n.slug),
        heart: (p.notes?.heart || []).map((n) => n.slug),
        base: (p.notes?.base || []).map((n) => n.slug),
      },
      is_bestseller: !!p.is_bestseller,
      is_spotlight: !!p.is_spotlight,
    });
  }, [editId, allProducts]);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  const setChecked = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.checked }));

  // The slug follows the English name until you edit it by hand.
  const onNameChange = (e) => {
    const en_name = e.target.value;
    setForm((f) => ({ ...f, en_name, slug: slugTouched ? f.slug : slugify(en_name) }));
  };

  // An Inspired product is OUR make: the brand is always the house. Anything
  // else would list our dupes on the Dior brand page.
  useEffect(() => {
    if ((form.line === "inspired" || form.line === "signature") && houseBrand && form.brand_id !== houseBrand.id) {
      setForm((f) => ({ ...f, brand_id: houseBrand.id }));
    }
  }, [form.line, houseBrand]);

  const needsOriginal = requiresOriginal(form.line, form.product_type);

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/admin/upload", {
        method: "POST", headers: { Authorization: `Bearer ${token}` }, body: fd,
      });
      const json = await res.json();
      if (json.url) setForm((f) => ({ ...f, images: [...f.images, json.url] }));
      else toast(json.error || "Upload failed");
    } catch {
      toast("Upload failed");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const removeImage = (i) => setForm((f) => ({ ...f, images: f.images.filter((_, idx) => idx !== i) }));

  const { mutate: createBrand, isPending: creatingBrand } = useMutation({
    mutationFn: (body) => adminCreateBrand(body, token),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["admin-brands"] });
      setForm((f) => ({ ...f, brand_id: res.data.id }));
      setNewBrand(false);
      toast("Brand added");
    },
    onError: (e) => toast(e.message || "Failed to add brand"),
  });

  const { mutate: createOriginal, isPending: creatingOriginal } = useMutation({
    mutationFn: (body) => adminCreateOriginal(body, token),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["admin-originals"] });
      setForm((f) => ({ ...f, original_perfume_id: res.data.id }));
      setNewOriginal(false);
      toast("Original perfume added");
    },
    onError: (e) => toast(e.message || "Failed to add original"),
  });

  const { mutate: createProduct, isPending: creating } = useMutation({
    mutationFn: (body) => adminCreateProduct(body, token),
    onSuccess: () => { toast("Product created"); navigate("/admin"); },
    onError: (e) => toast(e.message || "Failed to create product"),
  });

  const { mutate: updateProduct, isPending: updating } = useMutation({
    mutationFn: ({ id, body }) => adminUpdateProduct(id, body, token),
    onSuccess: () => { toast("Product saved"); navigate("/admin"); },
    onError: (e) => toast(e.message || "Failed to update product"),
  });

  const isPending = creating || updating;

  const handleSubmit = (e) => {
    e.preventDefault();

    // Mirror the server's rules so the admin gets a sentence, not a 400.
    if (!form.en_name.trim() || !form.ar_name.trim()) return toast("Product name is required in both Arabic and English.");
    if (!form.brand_id) return toast("Pick a brand.");
    if (!form.line) return toast("Pick a line — Original, Inspired, or Signature.");
    if (!form.audience) return toast("Pick an audience — Men, Women, or Unisex.");
    if (!form.images.length) return toast("Add at least one image.");
    if (needsOriginal && !form.original_perfume_id) {
      return toast("An Original or Inspired perfume must be linked to an original perfume.");
    }
    if (!form.variants.some((v) => Number(v.price) > 0)) {
      return toast("Every size needs a price.");
    }

    const body = {
      id: form.id,
      slug: form.slug || slugify(form.en_name),
      status: form.status,
      brand_id: form.brand_id,
      line: form.line,
      // A signature product references no original; a non-perfume needn't.
      original_perfume_id: form.line === "signature" ? null : (form.original_perfume_id || null),
      product_type: form.product_type,
      audience: form.audience,
      classification: form.classification || null,
      concentration: form.concentration || null,
      longevity: form.longevity || null,
      sillage: form.sillage || null,
      families: form.families,
      seasons: form.seasons,
      tags: form.tags.split(",").map((t) => t.trim()).filter(Boolean),
      images: form.images,
      ar_name: form.ar_name.trim(),
      en_name: form.en_name.trim(),
      ar_desc: form.ar_desc,
      en_desc: form.en_desc,
      is_bestseller: form.is_bestseller,
      is_spotlight: form.is_spotlight,
      variants: form.variants
        .filter((v) => v.size_label.trim() || v.price !== "")
        .map((v) => ({
          size_label: v.size_label.trim() || "One size",
          size_ml: v.size_ml === "" ? null : Number(v.size_ml),
          sku: v.sku.trim() || null,
          price: Number(v.price),
          compare_at_price: v.compare_at_price === "" ? null : Number(v.compare_at_price),
          quantity: Number(v.quantity) || 0,
          is_default: !!v.is_default,
        })),
      notes: form.notes,
    };

    if (editId) updateProduct({ id: editId, body });
    else createProduct(body);
  };

  const descValue = descLang === "ar" ? form.ar_desc : form.en_desc;
  const setDesc = (html) =>
    setForm((f) => ({ ...f, [descLang === "ar" ? "ar_desc" : "en_desc"]: html }));

  return (
    <div className="admin-content">
      <div className="admin-panel">
        <div className="admin-panel__head">
          <h1 className="admin-panel__title">{editId ? "Edit product" : "New product"}</h1>
        </div>

        <form className="admin-form" onSubmit={handleSubmit}>
          <div className="co-stack">

            {/* 1 — Identity */}
            <div className="co-card">
              <p className="co-card__title"><span className="co-card__num">1</span> Identity</p>
              <div className="admin-form-grid">
                <div className="field">
                  <label className="field__label" htmlFor="p-en-name">
                    Name (EN) <span className="field__req">*</span>
                  </label>
                  <input id="p-en-name" className="input" value={form.en_name} onChange={onNameChange} required />
                </div>

                <div className="field">
                  <label className="field__label" htmlFor="p-ar-name">
                    الاسم (عربي) <span className="field__req">*</span>
                  </label>
                  <input id="p-ar-name" className="input" dir="rtl" value={form.ar_name}
                    onChange={set("ar_name")} required />
                </div>

                <div className="field">
                  <label className="field__label" htmlFor="p-slug">URL slug</label>
                  <input id="p-slug" className="input" value={form.slug}
                    onChange={(e) => { setSlugTouched(true); setForm((f) => ({ ...f, slug: slugify(e.target.value) })); }} />
                  <p className="field__hint">/product/{form.slug || "…"}</p>
                </div>

                <div className="field">
                  <label className="field__label" htmlFor="p-status">Status</label>
                  <select id="p-status" className="select" value={form.status} onChange={set("status")}>
                    {STATUSES.map((s) => <option key={s.slug} value={s.slug}>{biLabel(STATUSES, s.slug)}</option>)}
                  </select>
                  <p className="field__hint">Only Active products appear in the shop</p>
                </div>

                <div className="field">
                  <label className="field__label" htmlFor="p-line">
                    Line <span className="field__req">*</span>
                  </label>
                  <select id="p-line" className="select" value={form.line} onChange={set("line")} required>
                    <option value="">Choose…</option>
                    {LINES.map((l) => <option key={l.slug} value={l.slug}>{biLabel(LINES, l.slug)}</option>)}
                  </select>
                  <p className="field__hint">
                    {form.line === "inspired" ? "Our own make, inspired by an original — brand is locked to TIBR"
                      : form.line === "signature" ? "Bespoke — references no original"
                      : "A genuine designer bottle we resell"}
                  </p>
                </div>

                <div className="field">
                  <label className="field__label" htmlFor="p-type">
                    Product type <span className="field__req">*</span>
                  </label>
                  <select id="p-type" className="select" value={form.product_type} onChange={set("product_type")} required>
                    {PRODUCT_TYPES.map((t) => <option key={t.slug} value={t.slug}>{biLabel(PRODUCT_TYPES, t.slug)}</option>)}
                  </select>
                </div>

                <div className="field">
                  <label className="field__label" htmlFor="p-audience">
                    Audience <span className="field__req">*</span>
                  </label>
                  <select id="p-audience" className="select" value={form.audience} onChange={set("audience")} required>
                    <option value="">Choose…</option>
                    {AUDIENCES.map((a) => <option key={a.slug} value={a.slug}>{biLabel(AUDIENCES, a.slug)}</option>)}
                  </select>
                </div>

                <div className="field">
                  <label className="field__label" htmlFor="p-brand">
                    Brand <span className="field__req">*</span>
                  </label>
                  <select id="p-brand" className="select" value={form.brand_id} onChange={set("brand_id")}
                    disabled={form.line === "inspired" || form.line === "signature"} required>
                    <option value="">Choose…</option>
                    {brands.map((b) => (
                      <option key={b.id} value={b.id}>{b.name_en}{b.is_house ? " (house)" : ""}</option>
                    ))}
                  </select>
                  {form.line === "inspired" || form.line === "signature" ? (
                    <p className="field__hint">Locked to TIBR — it’s our make. The original house is set below.</p>
                  ) : (
                    <button type="button" className="field__link" onClick={() => setNewBrand((v) => !v)}>
                      + New brand
                    </button>
                  )}
                </div>

                {needsOriginal && (
                  <div className="field field--full">
                    <label className="field__label" htmlFor="p-original">
                      {form.line === "inspired" ? "Inspired by" : "This is the original"} <span className="field__req">*</span>
                    </label>
                    <select id="p-original" className="select" value={form.original_perfume_id}
                      onChange={set("original_perfume_id")} required>
                      <option value="">Choose an original perfume…</option>
                      {originals.map((o) => (
                        <option key={o.id} value={o.id}>
                          {o.brands?.name_en} — {o.name_en} ({o.audience})
                        </option>
                      ))}
                    </select>
                    <button type="button" className="field__link" onClick={() => setNewOriginal((v) => !v)}>
                      + New original perfume
                    </button>
                    <p className="field__hint">
                      {form.line === "inspired"
                        ? "Powers the “Inspired by Dior” pages and the cross-sell on the original’s page."
                        : "Links this bottle to the registry, so our inspired versions can point back at it."}
                    </p>
                  </div>
                )}

                <InlineCreate
                  open={newBrand} onClose={() => setNewBrand(false)} pending={creatingBrand}
                  title="New brand"
                  fields={[
                    { key: "name_en", label: "Name (EN) — e.g. Tom Ford" },
                    { key: "name_ar", label: "الاسم (عربي)" },
                    { key: "country", label: "Country code — FR, IT, EG…" },
                  ]}
                  onSubmit={(draft) => {
                    if (!draft.name_en?.trim()) return toast("Brand name (EN) is required.");
                    createBrand(draft);
                  }}
                />

                <InlineCreate
                  open={newOriginal} onClose={() => setNewOriginal(false)} pending={creatingOriginal}
                  title="New original perfume"
                  fields={[
                    { key: "name_en", label: "Name (EN) — e.g. Oud Wood" },
                    { key: "name_ar", label: "الاسم (عربي)" },
                    { key: "audience", label: "Audience", options: AUDIENCES },
                    { key: "year", label: "Year — 2018" },
                  ]}
                  onSubmit={(draft) => {
                    if (!draft.name_en?.trim()) return toast("Name (EN) is required.");
                    if (!draft.audience) return toast("Pick an audience.");
                    // The original's house is a real brand: pick it from the list first.
                    const brandId = form.line === "original" ? form.brand_id : null;
                    if (!brandId) return toast("Pick the original's house in the Brand field first, then add it.");
                    createOriginal({ ...draft, brand_id: brandId });
                  }}
                />
              </div>
            </div>

            {/* 2 — Media */}
            <div className="co-card">
              <p className="co-card__title"><span className="co-card__num">2</span> Media</p>
              <input ref={fileInputRef} type="file" accept="image/*" className="ap-file-hidden"
                onChange={handleFileChange} />

              {form.images.length === 0 && !uploading ? (
                <div className="ap-media-dropzone" onClick={() => fileInputRef.current?.click()} role="button" tabIndex={0}>
                  <div className="ap-media-dropzone__inner">
                    <button type="button" className="btn btn--outline ap-media-upload-btn">Upload image</button>
                  </div>
                  <p className="ap-media-dropzone__hint">The first image is the one shown on cards</p>
                </div>
              ) : (
                <div className="ap-media-grid">
                  {form.images.map((img, i) => (
                    <div key={i} className="ap-media-item">
                      <img src={img} alt={`Product media ${i + 1}`} />
                      <button type="button" className="ap-media-item__remove"
                        onClick={(e) => { e.stopPropagation(); removeImage(i); }}>✕</button>
                    </div>
                  ))}
                  {uploading && (
                    <div className="ap-media-item ap-media-item--loading">
                      <div className="ap-media-spinner" /><span>Uploading…</span>
                    </div>
                  )}
                  <button type="button" className="ap-media-add"
                    onClick={() => !uploading && fileInputRef.current?.click()}>+</button>
                </div>
              )}
            </div>

            {/* 3 — Sizes, price & stock */}
            <div className="co-card">
              <p className="co-card__title">
                <span className="co-card__num">3</span> Sizes, price &amp; stock
              </p>
              <VariantsEditor variants={form.variants}
                onChange={(variants) => setForm((f) => ({ ...f, variants }))} />
            </div>

            {/* 4 — Scent profile */}
            <div className="co-card">
              <p className="co-card__title"><span className="co-card__num">4</span> Scent profile</p>
              <div className="admin-form-grid">
                <div className="field">
                  <label className="field__label" htmlFor="p-class">Classification</label>
                  <select id="p-class" className="select" value={form.classification} onChange={set("classification")}>
                    <option value="">None</option>
                    {CLASSIFICATIONS.map((c) => <option key={c.slug} value={c.slug}>{biLabel(CLASSIFICATIONS, c.slug)}</option>)}
                  </select>
                </div>
                <div className="field">
                  <label className="field__label" htmlFor="p-conc">Concentration</label>
                  <select id="p-conc" className="select" value={form.concentration} onChange={set("concentration")}>
                    <option value="">None</option>
                    {CONCENTRATIONS.map((c) => <option key={c.slug} value={c.slug}>{biLabel(CONCENTRATIONS, c.slug)}</option>)}
                  </select>
                </div>
                <div className="field">
                  <label className="field__label" htmlFor="p-longevity">Longevity</label>
                  <select id="p-longevity" className="select" value={form.longevity} onChange={set("longevity")}>
                    <option value="">None</option>
                    {LONGEVITY.map((l) => <option key={l.slug} value={l.slug}>{biLabel(LONGEVITY, l.slug)}</option>)}
                  </select>
                </div>
                <div className="field">
                  <label className="field__label" htmlFor="p-sillage">Sillage</label>
                  <select id="p-sillage" className="select" value={form.sillage} onChange={set("sillage")}>
                    <option value="">None</option>
                    {SILLAGE.map((s) => <option key={s.slug} value={s.slug}>{biLabel(SILLAGE, s.slug)}</option>)}
                  </select>
                </div>

                <ChipSelect label="Fragrance family" vocab={FAMILIES} selected={form.families}
                  onChange={(families) => setForm((f) => ({ ...f, families }))}
                  hint="Leave empty to derive it from the notes below" />

                <ChipSelect label="Season" vocab={SEASONS} selected={form.seasons}
                  onChange={(seasons) => setForm((f) => ({ ...f, seasons }))}
                  hint="Empty = all-season" />

                <div className="field field--full">
                  <label className="field__label" htmlFor="p-tags">Tags</label>
                  <input id="p-tags" className="input" value={form.tags} onChange={set("tags")}
                    placeholder="luxury, classic, modern" />
                  <p className="field__hint">Free-form, comma separated — not a classification</p>
                </div>
              </div>
            </div>

            {/* 5 — Notes */}
            <div className="co-card">
              <p className="co-card__title"><span className="co-card__num">5</span> Notes</p>
              {NOTE_LAYERS.map((layer) => (
                <NotesInput
                  key={layer.slug}
                  id={`p-notes-${layer.slug}`}
                  label={`${layer.en} / ${layer.ar}`}
                  value={form.notes[layer.slug]}
                  onChange={(slugs) =>
                    setForm((f) => ({ ...f, notes: { ...f.notes, [layer.slug]: slugs } }))}
                />
              ))}
            </div>

            {/* 6 — Merchandising */}
            <div className="co-card">
              <p className="co-card__title"><span className="co-card__num">6</span> Merchandising</p>
              <div className="admin-form-grid">
                <label className="field field--checkbox">
                  <input type="checkbox" checked={form.is_bestseller} onChange={setChecked("is_bestseller")} />
                  <span>Best Seller</span>
                </label>
                <label className="field field--checkbox">
                  <input type="checkbox" checked={form.is_spotlight} onChange={setChecked("is_spotlight")} />
                  <span>Spotlight</span>
                </label>
              </div>
            </div>

            {/* 7 — Description */}
            <div className="co-card">
              <p className="co-card__title"><span className="co-card__num">7</span> Description</p>
              <div className="field">
                <div className="ap-desc-bar">
                  <label className="field__label" style={{ margin: 0 }}>Product description</label>
                  <div className="ap-desc-actions">
                    <div className="ap-lang-toggle">
                      <button type="button" className={`ap-lang-btn${descLang === "ar" ? " is-active" : ""}`}
                        onClick={() => setDescLang("ar")}>عر</button>
                      <button type="button" className={`ap-lang-btn${descLang === "en" ? " is-active" : ""}`}
                        onClick={() => setDescLang("en")}>EN</button>
                    </div>
                  </div>
                </div>
                <JoditEditor
                  key={descLang}
                  value={descValue}
                  onBlur={setDesc}
                  config={{
                    placeholder: descLang === "ar" ? "اكتب وصف المنتج…" : "Write a product description…",
                    direction: descLang === "ar" ? "rtl" : "ltr",
                    showCharsCounter: false, showWordsCounter: false, showXPathInStatusbar: false,
                    buttons: ["eraser", "paragraph", "bold", "italic", "underline", "brush", "align", "link", "table", "dots", "source"],
                  }}
                />
              </div>
            </div>

            <div className="admin-form-actions">
              <button className={`btn btn--primary${isPending ? " is-loading" : ""}`} type="submit" disabled={isPending}>
                {isPending ? "" : editId ? "Save changes" : "Create product"}
              </button>
              <Link className="btn btn--ghost" to="/admin">Cancel</Link>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
