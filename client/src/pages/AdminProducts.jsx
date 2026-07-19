import { useState, useRef } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/stores/auth";
import { adminGetProducts, adminDeleteProduct } from "@/lib/api";
import { LINES, AUDIENCES, PRODUCT_TYPES, label } from "@/lib/taxonomy";

export default function AdminProducts() {
  const { token } = useAuth();
  const qc = useQueryClient();
  const [category, setCategory] = useState("all");
  const [filterOpen, setFilterOpen] = useState(false);
  const [filterRect, setFilterRect] = useState(null);
  const filterTriggerRef = useRef(null);
  const [search, setSearch] = useState("");

  // Bulk operations state
  const [selectedIds, setSelectedIds] = useState([]);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-products", token],
    queryFn: () => adminGetProducts(token),
    enabled: !!token,
  });

  const { mutate: deleteProduct } = useMutation({
    mutationFn: (id) => adminDeleteProduct(id, token),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-products"] });
      setSelectedIds((prev) => prev.filter((id) => id !== id));
    },
  });

  const allProducts = data?.data ?? [];
  const typeTabs = PRODUCT_TYPES.filter((t) => allProducts.some((p) => p.product_type === t.slug));
  const audienceTabs = AUDIENCES.filter((a) => allProducts.some((p) => p.audience === a.slug));
  const groupBy = typeTabs.length > 1 ? "product_type" : "audience";
  const categories = groupBy === "product_type" ? typeTabs : audienceTabs;
  
  const products = allProducts
    .filter((p) => category === "all" || p[groupBy] === category)
    .filter((p) => {
      if (!search.trim()) return true;
      const q = search.trim().toLowerCase();
      return (
        p.en_name?.toLowerCase().includes(q) ||
        p.ar_name?.toLowerCase().includes(q) ||
        p.variants?.some((v) => v.sku?.toLowerCase().includes(q))
      );
    });

  const filterOptions = [
    { slug: "all", label: "All", count: allProducts.length },
    ...categories.map((t) => ({
      slug: t.slug,
      label: t.en,
      count: allProducts.filter((p) => p[groupBy] === t.slug).length,
    })),
  ];
  const activeFilterLabel = filterOptions.find((o) => o.slug === category)?.label ?? "All";

  const openFilter = () => {
    if (filterTriggerRef.current) setFilterRect(filterTriggerRef.current.getBoundingClientRect());
    setFilterOpen(true);
  };

  // Checkbox Handlers
  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(products.map((p) => p.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectRow = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Bulk Actions
  const handleBulkExport = () => {
    const selectedProducts = allProducts.filter((p) => selectedIds.includes(p.id));
    let csv = "ID,Name (EN),Name (AR),Brand,Audience,Concentration,SKUs,Prices,Quantities\n";
    
    selectedProducts.forEach((p) => {
      const skus = p.variants?.map((v) => v.sku).filter(Boolean).join(" | ") || "";
      const prices = p.variants?.map((v) => v.price).filter(Boolean).join(" | ") || "";
      const quantities = p.variants?.map((v) => v.quantity).filter(Boolean).join(" | ") || "";
      
      const escapeCSV = (str) => `"${String(str || "").replace(/"/g, '""')}"`;
      
      csv += `${p.id},${escapeCSV(p.en_name)},${escapeCSV(p.ar_name)},${escapeCSV(p.brands?.name_en)},${p.audience || ""},${p.concentration || ""},${escapeCSV(skus)},${escapeCSV(prices)},${escapeCSV(quantities)}\n`;
    });
    
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `tibr_products_export_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleBulkDelete = async () => {
    if (!confirm(`Are you sure you want to delete ${selectedIds.length} products?`)) return;
    
    try {
      await Promise.all(selectedIds.map((id) => adminDeleteProduct(id, token)));
      qc.invalidateQueries({ queryKey: ["admin-products"] });
      setSelectedIds([]);
      alert("Selected products deleted successfully.");
    } catch (err) {
      alert("Failed to delete some products.");
    }
  };

  return (
    <div className="admin-content">
      <header className="page-head page-head--compact admin-head">
        <h1 className="page-head__title">Products</h1>
        <div className="page-head__actions">
          <Link className="btn btn--secondary" to="/admin/products/import">Import CSV</Link>
          <Link className="btn btn--primary" to="/admin/product">Add product</Link>
        </div>
      </header>

      <div className="admin-card">
        <div className="admin-search-toolbar">
          <div className="admin-search">
            <svg className="admin-search__icon" width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden="true">
              <circle cx="6.5" cy="6.5" r="4" stroke="currentColor" strokeWidth="1.4"/>
              <path d="M9.5 9.5L12.5 12.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
            </svg>
            <input
              className="admin-search__input"
              type="search"
              placeholder="Search name or product code (SKU)…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button className="admin-search__clear" type="button" onClick={() => setSearch("")} aria-label="Clear search">×</button>
            )}
          </div>
        </div>

        <div className="admin-toolbar">
          <span style={{ color: "var(--muted)", fontSize: "var(--fs-sm)" }}>{products.length} products</span>
          {!isLoading && categories.length > 1 && (
            <button
              ref={filterTriggerRef}
              type="button"
              className="btn btn--secondary admin-filter-btn"
              onClick={openFilter}
              aria-haspopup="listbox"
              aria-expanded={filterOpen}
            >
              <span>Filter: {activeFilterLabel}</span>
              <svg className="admin-filter-btn__chevron" width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
                <path d="M2.5 3.75L5 6.25L7.5 3.75" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          )}
        </div>

        {isLoading ? (
          <div className="table-wrap">
            <table className="table admin-product-table" aria-label="Products loading">
              <thead>
                <tr>
                  <th className="bulk-select-cell" />
                  <th className="ap-thumb-cell" />
                  <th>Name</th><th>Listing</th><th>Price</th><th>Stock</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {[...Array(5)].map((_, i) => (
                  <tr key={i} className="skel-row">
                    <td className="bulk-select-cell" />
                    <td className="ap-thumb-cell">
                      <span className="skel" style={{ display: "block", inlineSize: "44px", blockSize: "44px", borderRadius: "var(--r-sm)" }} />
                    </td>
                    <td><span className="skel skel--name" /></td>
                    <td><span className="skel skel--product" /></td>
                    <td><span className="skel skel--price" /></td>
                    <td><span className="skel skel--id" /></td>
                    <td><span className="skel skel--badge" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : allProducts.length === 0 ? (
          <div className="admin-empty-state">
            <svg width="36" height="36" viewBox="0 0 36 36" fill="none" aria-hidden="true">
              <path d="M13 5h12l3 6v18a2 2 0 0 1-2 2H10a2 2 0 0 1-2-2V11l3-6z" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M8 11h20M15 5v6M23 5v6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
            </svg>
            <p className="admin-empty-state__title">No products yet</p>
            <p className="admin-empty-state__sub">
              Add your first product or import a catalog from CSV to start selling.
            </p>
            <Link className="btn btn--primary" style={{ marginBlockStart: "var(--sp-4)" }} to="/admin/product">
              Add product
            </Link>
          </div>
        ) : products.length === 0 ? (
          <div className="admin-empty-state">
            <svg width="36" height="36" viewBox="0 0 36 36" fill="none" aria-hidden="true">
              <circle cx="15" cy="15" r="9" stroke="currentColor" strokeWidth="1.4"/>
              <path d="M22 22l8 8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
            </svg>
            <p className="admin-empty-state__title">No products found</p>
            <p className="admin-empty-state__sub">Try a different search term or filter.</p>
            <button
              className="btn btn--secondary"
              style={{ marginBlockStart: "var(--sp-4)" }}
              type="button"
              onClick={() => { setSearch(""); setCategory("all"); }}
            >
              Clear filters
            </button>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="table admin-product-table" aria-label="Products">
              <thead>
                <tr>
                  <th className="bulk-select-cell">
                    <input
                      type="checkbox"
                      className="bulk-select-checkbox"
                      checked={products.length > 0 && selectedIds.length === products.length}
                      onChange={handleSelectAll}
                    />
                  </th>
                  <th className="ap-thumb-cell" />
                  <th>Name</th>
                  <th>Listing</th>
                  <th>Price</th>
                  <th>Stock</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => (
                  <tr key={p.id}>
                    <td className="bulk-select-cell">
                      <input
                        type="checkbox"
                        className="bulk-select-checkbox"
                        checked={selectedIds.includes(p.id)}
                        onChange={() => handleSelectRow(p.id)}
                      />
                    </td>
                    <td className="ap-thumb-cell">
                      {p.image ? (
                        <img className="ap-thumb" src={p.image} alt={p.en_name} />
                      ) : (
                        <div className="ap-thumb--empty" />
                      )}
                    </td>
                    <td>
                      <div className="admin-product-meta">
                        <span className="admin-product-meta__name">{p.en_name}</span>
                      </div>
                    </td>
                    <td>
                      {[p.brands?.name_en, p.line && label(LINES, p.line), p.audience && label(AUDIENCES, p.audience)]
                        .filter(Boolean).join(" · ") || "—"}
                      {p.status !== "active" && (
                        <span className="admin-product-meta__status"> · {p.status}</span>
                      )}
                    </td>
                    <td className="num">
                      {p.variants?.length
                        ? (() => {
                            const prices = p.variants.map((v) => Number(v.price) || 0);
                            const min = Math.min(...prices);
                            const max = Math.max(...prices);
                            if (min === max) return `${min.toLocaleString()} EGP`;
                            return `${min.toLocaleString()} – ${max.toLocaleString()} EGP`;
                          })()
                        : "—"}
                    </td>
                    <td className="num">
                      {p.variants?.length
                        ? `${p.variants.reduce((sum, v) => sum + (v.quantity || 0), 0)} units`
                        : "0 units"}
                    </td>
                    <td>
                      <div className="product-actions">
                        <Link
                          className="btn btn--secondary"
                          to={`/admin/product?id=${p.id}`}
                        >
                          Edit
                        </Link>
                        <button
                          className="btn btn--danger"
                          type="button"
                          onClick={() => {
                            if (confirm(`Delete "${p.en_name}"?`)) deleteProduct(p.id);
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Floating Bulk Actions Bar ── */}
      {selectedIds.length > 0 && (
        <div className="bulk-actions-bar">
          <span className="bulk-actions-bar__count">
            {selectedIds.length} product{selectedIds.length === 1 ? "" : "s"} selected
          </span>
          <div className="bulk-actions-bar__divider" />
          <div className="bulk-actions-bar__btns">
            <button
              type="button"
              className="btn btn--secondary"
              onClick={handleBulkExport}
            >
              Export Selected (CSV)
            </button>
            <button
              type="button"
              className="btn btn--danger"
              onClick={handleBulkDelete}
            >
              Delete Selected
            </button>
          </div>
        </div>
      )}

      {filterOpen && filterRect && createPortal(
        <>
          <div className="admin-popover-scrim" onClick={() => setFilterOpen(false)} />
          <ul
            className="admin-popover"
            style={{
              position: "fixed",
              top: `${filterRect.bottom + window.scrollY + 6}px`,
              left: `${filterRect.left + window.scrollX}px`,
              minWidth: `${filterRect.width}px`,
              zIndex: 1000,
            }}
            role="listbox"
            aria-label="Filter products"
          >
            {filterOptions.map((o) => (
              <li key={o.slug} role="presentation">
                <button
                  type="button"
                  className={`admin-popover__opt${category === o.slug ? " is-active" : ""}`}
                  role="option"
                  aria-selected={category === o.slug}
                  onClick={() => {
                    setCategory(o.slug);
                    setFilterOpen(false);
                    setSelectedIds([]); // Reset bulk select on filter change
                  }}
                >
                  <span>{o.label}</span>
                  <span className="count">{o.count}</span>
                </button>
              </li>
            ))}
          </ul>
        </>,
        document.body
      )}
    </div>
  );
}
