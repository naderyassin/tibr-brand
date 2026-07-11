import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { adminGetCustomers } from "@/lib/api";

/** Reusable customer multi-select for discount "Specific customers"
 *  eligibility. Registered customers only — guests have no stable id a
 *  discount could target. Same chip-tray + search + checkbox-list shape
 *  as ProductPicker. */
export default function CustomerPicker({ selectedIds, onChange, token }) {
  const [query, setQuery] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["admin-customers", token],
    queryFn: () => adminGetCustomers(token),
    enabled: !!token,
  });

  const customers = (data?.data ?? []).filter((c) => c.is_registered);
  const byId = useMemo(() => new Map(customers.map((c) => [c.id, c])), [customers]);
  const selected = selectedIds.map((id) => byId.get(id)).filter(Boolean);

  const q = query.trim().toLowerCase();
  const results = q
    ? customers.filter((c) => c.name?.toLowerCase().includes(q) || c.phone?.includes(q))
    : customers;

  const toggle = (id) =>
    onChange(selectedIds.includes(id) ? selectedIds.filter((x) => x !== id) : [...selectedIds, id]);
  const remove = (id) => onChange(selectedIds.filter((x) => x !== id));

  return (
    <div className="picker">
      {selected.length > 0 && (
        <div className="picker__chips">
          {selected.map((c) => (
            <span key={c.id} className="picker__chip">
              <span className="picker__chip-thumb picker__chip-thumb--empty" />
              <span className="picker__chip-label">{c.name || "Guest"}</span>
              <button type="button" className="picker__chip-remove" onClick={() => remove(c.id)} aria-label={`Remove ${c.name}`}>
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
          placeholder="Search customers…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      <div className="picker__results">
        {isLoading ? (
          <p className="picker__empty">Loading customers…</p>
        ) : results.length === 0 ? (
          <p className="picker__empty">No registered customers found.</p>
        ) : (
          results.slice(0, 200).map((c) => {
            const checked = selectedIds.includes(c.id);
            return (
              <label key={c.id} className="picker__row">
                <input type="checkbox" checked={checked} onChange={() => toggle(c.id)} />
                <span className="picker__row-thumb picker__row-thumb--empty" />
                <span className="picker__row-info">
                  <span className="picker__row-name">{c.name || "Guest"}</span>
                  <span className="picker__row-meta">
                    {[c.phone, `${c.order_count} order${c.order_count === 1 ? "" : "s"}`].filter(Boolean).join(" · ")}
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
