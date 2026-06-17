import { useState, useEffect, useRef } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/stores/auth";
import { adminGetProducts, adminCreateProduct, adminUpdateProduct } from "@/lib/api";
import { useToast } from "@/components/ui/Toast";

const TAXONOMY = {
  perfumes: { children: {
    men:    { label: "Men — رجالي", children: {
      oud:      { label: "Oud — عود" },
      oriental: { label: "Oriental — شرقي" },
      woody:    { label: "Woody — خشبي" },
      fresh:    { label: "Fresh — منعش" },
      aquatic:  { label: "Aquatic — مائي" },
      citrus:   { label: "Citrus — حمضي" },
    }},
    women:  { label: "Women — نسائي", children: {
      floral:   { label: "Floral — زهري" },
      oriental: { label: "Oriental — شرقي" },
      oud:      { label: "Oud — عود" },
      fresh:    { label: "Fresh — منعش" },
      powdery:  { label: "Powdery — بودري" },
      citrus:   { label: "Citrus — حمضي" },
    }},
    unisex: { label: "Unisex — للجنسين", children: {
      oud:      { label: "Oud — عود" },
      oriental: { label: "Oriental — شرقي" },
      woody:    { label: "Woody — خشبي" },
      fresh:    { label: "Fresh — منعش" },
      aquatic:  { label: "Aquatic — مائي" },
    }},
  }},
  clothing: { children: {
    men:    { label: "Men — رجالي", children: {
      tshirts:    { label: "T-Shirts — تيشيرتات" },
      shirts:     { label: "Shirts — قمصان" },
      pants:      { label: "Pants — بناطيل" },
      jackets:    { label: "Jackets — جاكيتات" },
      sportswear: { label: "Sportswear — رياضي" },
      galabiya:   { label: "Galabiya — جلابية" },
    }},
    women:  { label: "Women — نسائي", children: {
      dresses:    { label: "Dresses — فساتين" },
      tops:       { label: "Tops — توبات" },
      pants:      { label: "Pants — بناطيل" },
      abayas:     { label: "Abayas — عبايات" },
      sportswear: { label: "Sportswear — رياضي" },
      galabiya:   { label: "Galabiya — جلابية" },
    }},
    kids:   { label: "Kids — أطفال", children: {
      boys:   { label: "Boys — أولاد", children: {
        tshirts: { label: "T-Shirts — تيشيرتات" },
        pants:   { label: "Pants — بناطيل" },
        jackets: { label: "Jackets — جاكيتات" },
      }},
      girls:  { label: "Girls — بنات", children: {
        dresses: { label: "Dresses — فساتين" },
        tops:    { label: "Tops — توبات" },
        pants:   { label: "Pants — بناطيل" },
      }},
      unisex: { label: "Unisex — للجنسين", children: {
        tshirts: { label: "T-Shirts — تيشيرتات" },
        pants:   { label: "Pants — بناطيل" },
      }},
    }},
    unisex: { label: "Unisex — للجنسين", children: {
      tshirts:    { label: "T-Shirts — تيشيرتات" },
      hoodies:    { label: "Hoodies — هودي" },
      sweatpants: { label: "Sweatpants — سويت بانت" },
      sportswear: { label: "Sportswear — رياضي" },
    }},
  }},
  sneakers: { children: {
    men:    { label: "Men — رجالي", children: {
      running:  { label: "Running — جري" },
      casual:   { label: "Casual — كاجوال" },
      classic:  { label: "Classic — كلاسيك" },
      hightop:  { label: "High-top — هاي توب" },
      athletic: { label: "Athletic — رياضي" },
    }},
    women:  { label: "Women — نسائي", children: {
      running:  { label: "Running — جري" },
      casual:   { label: "Casual — كاجوال" },
      platform: { label: "Platform — بلاتفورم" },
      classic:  { label: "Classic — كلاسيك" },
      athletic: { label: "Athletic — رياضي" },
    }},
    kids:   { label: "Kids — أطفال", children: {
      boys:   { label: "Boys — أولاد", children: {
        running: { label: "Running — جري" },
        casual:  { label: "Casual — كاجوال" },
        classic: { label: "Classic — كلاسيك" },
      }},
      girls:  { label: "Girls — بنات", children: {
        running: { label: "Running — جري" },
        casual:  { label: "Casual — كاجوال" },
        classic: { label: "Classic — كلاسيك" },
      }},
      unisex: { label: "Unisex — للجنسين", children: {
        running: { label: "Running — جري" },
        casual:  { label: "Casual — كاجوال" },
      }},
    }},
    unisex: { label: "Unisex — للجنسين", children: {
      running:  { label: "Running — جري" },
      casual:   { label: "Casual — كاجوال" },
      classic:  { label: "Classic — كلاسيك" },
      athletic: { label: "Athletic — رياضي" },
    }},
  }},
};

const LEVEL_LABELS = ["Gender", "Type", "Style"];
const ID_PAD = { perfumes: 1, clothing: 2, sneakers: 3 };
const CATEGORIES = ["perfumes", "clothing", "sneakers"];
const HAS_COLOR = new Set(["clothing", "sneakers"]);

function generateNextId(category, products) {
  const pad = ID_PAD[category] || 1;
  const catProducts = products.filter((p) => p.category === category);
  let maxNum = 0;
  catProducts.forEach((p) => {
    const num = parseInt(p.id, 10);
    if (!isNaN(num) && num > maxNum) maxNum = num;
  });
  return String(maxNum + 1).padStart(pad, "0");
}

function getEffectivePath(category, path) {
  const root = TAXONOMY[category];
  if (!root?.children) return [];
  const result = [];
  let current = root;
  for (let i = 0; i < 3; i++) {
    if (!current?.children) break;
    const entries = Object.entries(current.children);
    if (!entries.length) break;
    const selected = path[i] || entries[0][0];
    result.push(selected);
    current = current.children[selected];
  }
  return result;
}

function SubcatChain({ category, path, onChange }) {
  const root = TAXONOMY[category];
  if (!root?.children || !Object.keys(root.children).length) return null;

  function renderLevel(children, depth) {
    const entries = Object.entries(children);
    if (!entries.length) return null;
    const selected = path[depth] || entries[0][0];
    const selectedNode = children[selected];
    return (
      <>
        <div className="ap-subcat-level">
          <label className="field__label" htmlFor={`subcat-${depth}`}>
            {LEVEL_LABELS[depth] || "Detail"} <span className="field__req">*</span>
          </label>
          <div className="select-field">
            <select
              id={`subcat-${depth}`}
              className="select"
              value={selected}
              onChange={(e) => {
                const newPath = path.slice(0, depth);
                newPath[depth] = e.target.value;
                onChange(newPath);
              }}
            >
              {entries.map(([key, val]) => (
                <option key={key} value={key}>{val.label}</option>
              ))}
            </select>
            <svg className="select-field__chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>
          </div>
        </div>
        {selectedNode?.children && Object.keys(selectedNode.children).length > 0 &&
          renderLevel(selectedNode.children, depth + 1)}
      </>
    );
  }

  return (
    <div className="field field--full">
      <div className="ap-subcat-chain">
        {renderLevel(root.children, 0)}
      </div>
    </div>
  );
}

const EMPTY_FORM = {
  id: "",
  category: "perfumes",
  name: "",
  price: "",
  quantity: "",
  color: "",
  sizes: "",
  desc: "",
  image: "",
};

export default function AdminProduct() {
  const [params] = useSearchParams();
  const editId = params.get("id");
  const { user, token, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const fileInputRef = useRef(null);

  const [form, setForm] = useState(EMPTY_FORM);
  const [imgPreview, setImgPreview] = useState("");
  const [subcatPath, setSubcatPath] = useState([]);
  const [fileInfo, setFileInfo] = useState(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) navigate("/login", { replace: true });
  }, [authLoading, user, navigate]);

  const { data: allProducts } = useQuery({
    queryKey: ["admin-products", token],
    queryFn: () => adminGetProducts(token),
    enabled: !!token,
  });

  // Auto-generate ID in create mode when products load
  useEffect(() => {
    if (!editId && allProducts?.data) {
      setForm((f) => ({ ...f, id: generateNextId(f.category, allProducts.data) }));
    }
  }, [allProducts, editId]);

  // Fill form when editing
  useEffect(() => {
    if (editId && allProducts?.data) {
      const p = allProducts.data.find((x) => x.id === editId);
      if (p) {
        setForm({
          id: p.id,
          category: p.category || "perfumes",
          name: p.en_name || p.ar_name || "",
          price: p.en_price ?? p.ar_price ?? "",
          quantity: p.quantity ?? "",
          color: p.en_color || p.ar_color || "",
          sizes: Array.isArray(p.sizes) ? p.sizes.join(", ") : (p.sizes || ""),
          desc: p.en_desc || p.ar_desc || "",
          image: p.image || "",
        });
        setImgPreview(p.image || "");
        setSubcatPath([p.sub_category, p.sub_category_2, p.sub_category_3].filter(Boolean));
      }
    }
  }, [editId, allProducts]);

  function onCategoryChange(cat) {
    if (editId) return;
    const nextId = allProducts?.data ? generateNextId(cat, allProducts.data) : "";
    setForm((f) => ({ ...f, category: cat, id: nextId }));
    setSubcatPath([]);
  }

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  // Image file upload
  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const localUrl = URL.createObjectURL(file);
    setImgPreview(localUrl);
    setFileInfo({ name: file.name });
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/admin/upload", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      const json = await res.json();
      if (json.url) {
        setForm((f) => ({ ...f, image: json.url }));
        setImgPreview(json.url);
        URL.revokeObjectURL(localUrl);
      }
    } catch {
      toast("Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const clearFile = () => {
    if (fileInputRef.current) fileInputRef.current.value = "";
    setFileInfo(null);
    setForm((f) => ({ ...f, image: "" }));
    setImgPreview("");
  };

  const handleUrlChange = (url) => {
    setForm((f) => ({ ...f, image: url }));
    setImgPreview(url);
  };

  const handleAutoDesc = () => {
    const catLabels = { perfumes: "perfume", clothing: "clothing piece", sneakers: "sneaker" };
    const catLabel = catLabels[form.category] || form.category;
    const parts = [];
    if (form.name) parts.push(`${form.name} is a premium ${catLabel} by Tibr.`);
    else parts.push(`A premium ${catLabel} by Tibr.`);
    if (form.color) parts.push(`Available in ${form.color}.`);
    if (form.sizes) parts.push(`Comes in ${form.sizes}.`);
    if (form.price) parts.push(`Priced at ${form.price} EGP.`);
    if (form.category === "perfumes") parts.push("A luxurious scent crafted from the finest ingredients, inspired by the heritage and spirit of Egypt.");
    else if (form.category === "clothing") parts.push("Designed for those who appreciate quality craftsmanship and timeless Egyptian style.");
    else if (form.category === "sneakers") parts.push("Built for comfort and style, reflecting the modern Egyptian aesthetic.");
    setForm((f) => ({ ...f, desc: parts.join(" ") }));
  };

  const { mutate: createProduct, isPending: creating } = useMutation({
    mutationFn: (body) => adminCreateProduct(body, token),
    onSuccess: () => { toast("Product created!"); navigate("/admin"); },
    onError: (err) => toast(err.message || "Failed to create product"),
  });

  const { mutate: updateProduct, isPending: updating } = useMutation({
    mutationFn: ({ id, body }) => adminUpdateProduct(id, body, token),
    onSuccess: () => { toast("Product updated!"); navigate("/admin"); },
    onError: (err) => toast(err.message || "Failed to update product"),
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const effectivePath = getEffectivePath(form.category, subcatPath);
    const price = Number(form.price);
    const body = {
      id: form.id,
      category: form.category,
      ar_name: form.name,
      en_name: form.name,
      ar_price: price,
      en_price: price,
      quantity: Number(form.quantity) || 0,
      ar_color: form.color || null,
      en_color: form.color || null,
      sizes: form.sizes.split(",").map((s) => s.trim()).filter(Boolean),
      ar_desc: form.desc,
      en_desc: form.desc,
      image: form.image,
      sub_category: effectivePath[0] || "",
      sub_category_2: effectivePath[1] || "",
      sub_category_3: effectivePath[2] || "",
      review_avg: 0,
      review_count: 0,
    };
    if (editId) {
      updateProduct({ id: editId, body });
    } else {
      createProduct(body);
    }
  };

  if (authLoading || !user) return null;

  const isPending = creating || updating;
  const showColor = HAS_COLOR.has(form.category);

  return (
    <div className="store-container">
      <div className="admin-panel">
        <div className="admin-panel__head">
          <div>
            <p className="admin-panel__title">{editId ? "Edit product" : "New product"}</p>
            <p className="admin-panel__sub">
              {editId
                ? "Edit the product details, then save your changes."
                : "Fill in the product details, then save them to the database."}
            </p>
          </div>
          <Link className="btn btn--ghost" to="/admin">← Back to admin</Link>
        </div>

        <form className="admin-product-shell" onSubmit={handleSubmit} noValidate>
          {/* ── Left: form fields ── */}
          <div className="admin-product-form">

            {/* Identity */}
            <div className="co-card">
              <p className="co-card__title">
                <span className="co-card__num">1</span> Identity
              </p>
              <div className="admin-form-grid">
                <div className="field">
                  <label className="field__label" htmlFor="p-cat">
                    Category <span className="field__req">*</span>
                  </label>
                  <div className="select-field">
                    <select
                      id="p-cat"
                      className="select"
                      value={form.category}
                      onChange={(e) => onCategoryChange(e.target.value)}
                      disabled={!!editId}
                    >
                      {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <svg className="select-field__chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>
                  </div>
                </div>

                <div className="field">
                  <label className="field__label" htmlFor="p-id">Product ID</label>
                  <input
                    id="p-id"
                    className="input"
                    value={form.id}
                    readOnly
                    style={{ opacity: 0.6 }}
                    title="Auto-assigned by the system"
                  />
                  <p className="field__hint">Auto-assigned based on category</p>
                </div>

                <div className="field field--full">
                  <label className="field__label" htmlFor="p-name">
                    Name <span className="field__req">*</span>
                  </label>
                  <input
                    id="p-name"
                    className="input"
                    value={form.name}
                    onChange={set("name")}
                    required
                  />
                </div>

                <SubcatChain
                  category={form.category}
                  path={subcatPath}
                  onChange={setSubcatPath}
                />
              </div>
            </div>

            {/* Pricing & Stock */}
            <div className="co-card">
              <p className="co-card__title">
                <span className="co-card__num">2</span> Pricing &amp; Stock
              </p>
              <div className="admin-form-grid">
                <div className="field">
                  <label className="field__label" htmlFor="p-price">
                    Price (EGP) <span className="field__req">*</span>
                  </label>
                  <input
                    id="p-price"
                    className="input"
                    type="number"
                    min="0"
                    step="1"
                    value={form.price}
                    onChange={set("price")}
                    required
                  />
                </div>
                <div className="field">
                  <label className="field__label" htmlFor="p-qty">Stock qty</label>
                  <input
                    id="p-qty"
                    className="input"
                    type="number"
                    min="0"
                    step="1"
                    value={form.quantity}
                    onChange={set("quantity")}
                  />
                </div>
              </div>
            </div>

            {/* Attributes */}
            <div className="co-card">
              <p className="co-card__title">
                <span className="co-card__num">3</span> Attributes
              </p>
              <div className="admin-form-grid">
                {showColor && (
                  <div className="field field--full">
                    <label className="field__label" htmlFor="p-color">Color</label>
                    <input
                      id="p-color"
                      className="input"
                      value={form.color}
                      onChange={set("color")}
                      placeholder="Black, Red, Navy…"
                    />
                  </div>
                )}
                <div className="field field--full">
                  <label className="field__label" htmlFor="p-sizes">Sizes / Volumes</label>
                  <input
                    id="p-sizes"
                    className="input"
                    value={form.sizes}
                    onChange={set("sizes")}
                    placeholder="S, M, L — or — 50ml, 100ml"
                  />
                  <p className="field__hint">Separate with commas</p>
                </div>
              </div>
            </div>

            {/* Description */}
            <div className="co-card">
              <p className="co-card__title">
                <span className="co-card__num">4</span> Description
              </p>
              <div className="field">
                <div className="ap-desc-bar">
                  <label className="field__label" htmlFor="p-desc" style={{ margin: 0 }}>
                    Product description
                  </label>
                  <button type="button" className="ap-autogen-btn" onClick={handleAutoDesc}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
                      <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z" strokeWidth="1.5"/>
                    </svg>
                    Auto-generate
                  </button>
                </div>
                <textarea
                  id="p-desc"
                  className="textarea"
                  value={form.desc}
                  onChange={set("desc")}
                  rows={4}
                  placeholder="Write a description, or click Auto-generate to build one from the product details above."
                />
              </div>
            </div>

            <div className="admin-form-actions">
              <button
                className={`btn btn--primary${isPending ? " is-loading" : ""}`}
                type="submit"
                disabled={isPending}
              >
                {isPending ? "" : editId ? "Save changes" : "Create product"}
              </button>
              <Link className="btn btn--ghost" to="/admin">Cancel</Link>
            </div>
          </div>

          {/* ── Right: image sidebar ── */}
          <div>
            <div className="co-card">
              <p className="co-card__title">
                <span className="co-card__num">✦</span> Image
              </p>

              {/* Preview — click anywhere to browse */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="ap-file-hidden"
                onChange={handleFileChange}
              />
              <div
                className={`ap-preview-img${uploading ? " ap-preview-img--loading" : ""}`}
                onClick={() => !uploading && fileInputRef.current?.click()}
                role="button"
                tabIndex={0}
                aria-label="Click to upload product image"
                onKeyDown={(e) => e.key === "Enter" && !uploading && fileInputRef.current?.click()}
              >
                {imgPreview ? (
                  <img src={imgPreview} alt="Product preview" />
                ) : (
                  <>
                    <div className="ap-preview-icon" aria-hidden="true">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                        <rect x="2" y="8" width="20" height="13" rx="2" strokeWidth="1.5"/>
                        <circle cx="12" cy="14.5" r="3.5" strokeWidth="1.5"/>
                        <circle cx="12" cy="14.5" r="1.4" fill="currentColor" opacity=".4" stroke="none"/>
                        <path d="M8 8V7a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v1" strokeWidth="1.5"/>
                      </svg>
                    </div>
                    <span className="ap-preview-hint">
                      {uploading ? "Uploading…" : "Click to browse"}
                    </span>
                  </>
                )}
              </div>

              {/* File info + URL */}
              <div className="ap-img-picker">
                {fileInfo && (
                  <div className="ap-file-info">
                    <span className="ap-file-name">{fileInfo.name}</span>
                    <button type="button" className="ap-file-clear" onClick={clearFile} aria-label="Remove file">✕</button>
                  </div>
                )}

                <div className="ap-url-divider"><span>or</span></div>

                <div className="field">
                  <label className="field__label" htmlFor="p-img-url">
                    Image URL <span className="field__req">*</span>
                  </label>
                  <input
                    id="p-img-url"
                    className="input"
                    type="url"
                    value={form.image}
                    onChange={(e) => handleUrlChange(e.target.value)}
                    placeholder="https://…"
                  />
                </div>
              </div>

              <div className="ap-preview-meta">
                <div className="ap-meta-row">
                  <span className="ap-meta-key">Category</span>
                  <span className="ap-meta-val" style={{ textTransform: "capitalize" }}>{form.category}</span>
                </div>
                <div className="ap-meta-row">
                  <span className="ap-meta-key">Status</span>
                  <span style={{ fontSize: "var(--fs-xs)", color: "var(--success)" }}>● Draft</span>
                </div>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
