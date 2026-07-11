import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { adminGetProducts } from "@/lib/api";

/** Reusable product multi-select — chip tray of selections + searchable
 *  checkbox list. Used by discount "Applies to" / Buy X Get Y product
 *  targeting. Fetches the full catalog once (small enough to hold client-side,
 *  same assumption AdminProduct.jsx's own product list already makes). */
export default function ProductPicker({ selectedIds, onChange, token }) {
  const [query, setQuery] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["admin-products", token],
    queryFn: () => adminGetProducts(token),
    enabled: !!token,
  });

  const products = data?.data ?? [];
  const byId = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);
  const selected = selectedIds.map((id) => byId.get(id)).filter(Boolean);

  const q = query.trim().toLowerCase();
  const results = q
    ? products.filter((p) => p.en_name?.toLowerCase().includes(q) || p.brand?.toLowerCase().includes(q))
    : products;

  const toggle = (id) =>
    onChange(selectedIds.includes(id) ? selectedIds.filter((x) => x !== id) : [...selectedIds, id]);
  const remove = (id) => onChange(selectedIds.filter((x) => x !== id));

  return (
    <div className="picker">
      {selected.length > 0 && (
        <div className="picker__chips">
          {selected.map((p) => (
            <span key={p.id} className="picker__chip">
              {p.image ? (
                <img className="picker__chip-thumb" src={p.image} alt="" />
              ) : (
                <span className="picker__chip-thumb picker__chip-thumb--empty" />
              )}
              <span className="picker__chip-label">{p.en_name}</span>
              <button type="button" className="picker__chip-remove" onClick={() => remove(p.id)} aria-label={`Remove ${p.en_name}`}>
                ×
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="picker__search">
        <svg className="picker__search-icon" width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden="true">
          <circle cx="6.5" cy="6.5" r="4" stroke="currentColor" strokeWidth="1.4" />
          <path d="M9.5 9.5L12.5 12.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        </svg>
        <input
          className="picker__search-input"
          type="search"
          placeholder="Search products…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      <div className="picker__results">
        {isLoading ? (
          <p className="picker__empty">Loading products…</p>
        ) : results.length === 0 ? (
          <p className="picker__empty">No products found.</p>
        ) : (
          results.slice(0, 200).map((p) => {
            const checked = selectedIds.includes(p.id);
            return (
              <label key={p.id} className="picker__row">
                <input type="checkbox" checked={checked} onChange={() => toggle(p.id)} />
                {p.image ? (
                  <img className="picker__row-thumb" src={p.image} alt="" />
                ) : (
                  <span className="picker__row-thumb picker__row-thumb--empty" />
                )}
                <span className="picker__row-info">
                  <span className="picker__row-name">{p.en_name}</span>
                  <span className="picker__row-meta">
                    {[p.brand, p.en_price ? `${p.en_price} EGP` : null].filter(Boolean).join(" · ") || "—"}
                  </span>
                </span>
              </label>
            );
          })
        )}
      </div>
    </div>
  );
}
