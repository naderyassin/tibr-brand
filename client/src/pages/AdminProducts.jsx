import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/stores/auth";
import { adminGetProducts, adminDeleteProduct } from "@/lib/api";
import { LINES, AUDIENCES, label } from "@/lib/taxonomy";

export default function AdminProducts() {
  const { token } = useAuth();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["admin-products", token],
    queryFn: () => adminGetProducts(token),
    enabled: !!token,
  });

  const { mutate: deleteProduct } = useMutation({
    mutationFn: (id) => adminDeleteProduct(id, token),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-products"] }),
  });

  const products = data?.data ?? [];

  return (
    <div className="admin-content">
      <header className="page-head page-head--compact">
        <h1 className="page-head__title">Products</h1>
      </header>

      <div className="admin-card">
        <div className="admin-toolbar">
          <span style={{ color: "var(--muted)", fontSize: "var(--fs-sm)" }}>{products.length} products</span>
          <Link className="btn btn--primary" to="/admin/product">Add product</Link>
        </div>
        {isLoading ? (
          <p style={{ color: "var(--muted)" }}>Loading products…</p>
        ) : (
          <div className="table-wrap">
            <table className="table admin-product-table" aria-label="Products">
              <thead>
                <tr>
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
                    {/* Price and stock are per-VARIANT now: show the range and the total. */}
                    <td className="num">
                      {p.variants?.length
                        ? (() => {
                            const prices = p.variants.map((v) => Number(v.price));
                            const lo = Math.min(...prices), hi = Math.max(...prices);
                            return lo === hi ? `${lo} EGP` : `${lo}–${hi} EGP`;
                          })()
                        : `${p.en_price ?? 0} EGP`}
                    </td>
                    <td className="num">
                      {p.variants?.length
                        ? p.variants.reduce((sum, v) => sum + (v.quantity || 0), 0)
                        : p.quantity}
                      {p.variants?.length > 1 && (
                        <span className="admin-product-meta__sizes"> ({p.variants.length} sizes)</span>
                      )}
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
    </div>
  );
}
