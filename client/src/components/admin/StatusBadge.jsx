import { useState, useRef } from "react";
import { createPortal } from "react-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { adminUpdateOrderStatus } from "@/lib/api";

export const STATUSES = ["pending", "confirmed", "shipped", "delivered", "cancelled"];

export const STATUS_META = {
  pending:   { label: "Pending",   dot: "var(--warning)",  bg: "oklch(0.808 0.105 72 / 0.12)",  text: "var(--warning)" },
  confirmed: { label: "Confirmed", dot: "var(--info)",     bg: "oklch(0.760 0.060 232 / 0.12)", text: "var(--info)" },
  shipped:   { label: "Shipped",   dot: "var(--gold)",     bg: "var(--gold-ghost)",             text: "var(--gold)" },
  delivered: { label: "Delivered", dot: "var(--success)",  bg: "var(--success-fill)",           text: "var(--success)" },
  cancelled: { label: "Cancelled", dot: "var(--danger)",   bg: "var(--danger-fill)",            text: "var(--danger)" },
};

/** Read-only status pill (no dropdown) — used where changing status isn't wanted.
 *  `status` picks the color (reuses the order-status palette); `label` overrides
 *  the text for non-order contexts (e.g. discount status: Active/Expired/…). */
export function StatusPill({ status, label }) {
  const meta = STATUS_META[status] ?? STATUS_META.pending;
  return (
    <span
      className="status-badge status-badge--static"
      style={{ "--sb-bg": meta.bg, "--sb-text": meta.text, "--sb-dot": meta.dot }}
    >
      <span className="status-badge__dot" aria-hidden="true" />
      <span className="status-badge__label">{label ?? meta.label}</span>
    </span>
  );
}

/** Interactive status badge with a change-status dropdown. */
export function StatusBadge({ orderId, current, token }) {
  const [open, setOpen] = useState(false);
  const [rect, setRect] = useState(null);
  const triggerRef = useRef(null);
  const qc = useQueryClient();

  const { mutate, isPending } = useMutation({
    mutationFn: (status) => adminUpdateOrderStatus(orderId, status, token),
    onSuccess: () => {
      // Refresh every admin view that reflects order status (list + customer detail).
      qc.invalidateQueries({
        predicate: (q) => typeof q.queryKey[0] === "string" && q.queryKey[0].startsWith("admin-"),
      });
      setOpen(false);
    },
  });

  const openDropdown = () => {
    if (triggerRef.current) setRect(triggerRef.current.getBoundingClientRect());
    setOpen(true);
  };

  const meta = STATUS_META[current] ?? STATUS_META.pending;

  return (
    <>
      <button
        ref={triggerRef}
        className="status-badge"
        style={{ "--sb-bg": meta.bg, "--sb-text": meta.text, "--sb-dot": meta.dot }}
        onClick={openDropdown}
        disabled={isPending}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`Status: ${meta.label}. Click to change.`}
      >
        <span className="status-badge__dot" aria-hidden="true" />
        <span className="status-badge__label">{meta.label}</span>
        <svg className="status-badge__chevron" width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
          <path d="M2.5 3.75L5 6.25L7.5 3.75" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      {open && rect && createPortal(
        <div className="admin-theme" style={{ display: "contents" }}>
          <div className="status-overlay" onClick={() => setOpen(false)} aria-hidden="true" />
          <div
            className="status-dropdown"
            role="listbox"
            aria-label="Change order status"
            style={{
              top: `${rect.bottom + 4}px`,
              left: `${rect.left}px`,
              minWidth: `${Math.max(rect.width, 148)}px`,
            }}
          >
            {STATUSES.map((s) => {
              const m = STATUS_META[s];
              const isActive = s === current;
              return (
                <button
                  key={s}
                  role="option"
                  aria-selected={isActive}
                  className={`status-dropdown__option${isActive ? " is-current" : ""}`}
                  style={{ "--sb-dot": m.dot, "--sb-text": m.text }}
                  onClick={() => !isActive && mutate(s)}
                  disabled={isPending}
                >
                  <span className="status-badge__dot" aria-hidden="true" />
                  <span>{m.label}</span>
                  {isActive && (
                    <svg className="status-dropdown__check" width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                      <path d="M2 6L5 9L10 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </button>
              );
            })}
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
