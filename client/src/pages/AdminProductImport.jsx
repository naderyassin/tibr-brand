import { useState, useRef } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/stores/auth";
import { useToast } from "@/components/ui/Toast";
import {
  adminGetProducts, adminGetBrands, adminCreateBrand,
  adminGetOriginals, adminCreateProduct,
} from "@/lib/api";
import {
  CSV_COLUMNS, CSV_COLUMN_LABELS, buildCsvTemplate, blankCsvRow,
  parseCsv, parseClipboard, buildProductPayload,
} from "@/lib/csvImport";

const nextIdAfter = (products) =>
  (products || []).reduce((m, p) => {
    const n = parseInt(p.id, 10);
    return Number.isNaN(n) ? m : Math.max(m, n);
  }, 0) + 1;

const downloadTemplate = () => {
  const blob = new Blob([buildCsvTemplate()], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "tibr-products-template.csv";
  a.click();
  URL.revokeObjectURL(url);
};

let rowKeySeq = 0;

export default function AdminProductImport() {
  const { token } = useAuth();
  const qc = useQueryClient();
  const toast = useToast();
  const fileRef = useRef(null);
  const pasteRef = useRef(null);
  const nextProductId = useRef(1);

  const [rows, setRows] = useState([]); // { key, productId, raw, payload, errors, brandName, status, message }
  const [importing, setImporting] = useState(false);

  const { data: productsRes } = useQuery({
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

  const resolveRow = (raw, productId) => {
    const { payload, errors, brandName } = buildProductPayload(raw, { brands, originals, nextId: productId });
    return { payload, errors, brandName, status: errors.length ? "error" : "pending", message: errors.join(" ") };
  };

  const ensureNextProductId = () => {
    if (nextProductId.current === 1 && productsRes?.data) {
      nextProductId.current = nextIdAfter(productsRes.data);
    }
    return nextProductId.current++;
  };

  const appendRawRows = (rawRows) => {
    if (!rawRows.length) return;
    const added = rawRows.map((raw) => {
      const productId = ensureNextProductId();
      return { key: `r${rowKeySeq++}`, productId, raw, ...resolveRow(raw, productId) };
    });
    setRows((prev) => [...prev, ...added]);
  };

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const parsed = parseCsv(text);
    if (!parsed.length) toast("No rows found in that file.");
    else appendRawRows(parsed);
    e.target.value = "";
  };

  const loadPasted = () => {
    const text = pasteRef.current?.value || "";
    if (!text.trim()) return toast("Paste some rows first.");
    const parsed = parseClipboard(text);
    if (!parsed.length) return toast("Couldn't find any rows — make sure the header row is included.");
    appendRawRows(parsed);
    pasteRef.current.value = "";
  };

  const addBlankRow = () => appendRawRows([blankCsvRow()]);

  const removeRow = (key) => setRows((prev) => prev.filter((r) => r.key !== key));

  const editCell = (key, column, value) => {
    setRows((prev) => prev.map((r) => {
      if (r.key !== key) return r;
      const raw = { ...r.raw, [column]: value };
      return { key: r.key, productId: r.productId, raw, ...resolveRow(raw, r.productId) };
    }));
  };

  const readyCount = rows.filter((r) => r.status !== "error").length;
  const errorCount = rows.length - readyCount;

  const runImport = async () => {
    if (!readyCount || importing) return;
    setImporting(true);

    let liveBrands = brands;
    const createdBrandNames = new Map();

    const working = [...rows];
    const setRow = (i, patch) => {
      working[i] = { ...working[i], ...patch };
      setRows([...working]);
    };

    for (let i = 0; i < working.length; i++) {
      if (working[i].status === "error") continue;
      setRow(i, { status: "importing" });

      let { payload, brandName } = working[i];

      try {
        if (brandName) {
          const key = brandName.toLowerCase();
          let brand = createdBrandNames.get(key) || liveBrands.find((b) => b.name_en?.toLowerCase() === key);
          if (!brand) {
            const res = await adminCreateBrand({ name_en: brandName }, token);
            brand = res.data;
            createdBrandNames.set(key, brand);
            liveBrands = [...liveBrands, brand];
          }
          payload = { ...payload, brand_id: brand.id };
        }

        await adminCreateProduct(payload, token);
        setRow(i, { status: "success" });
      } catch (err) {
        setRow(i, { status: "error", message: err.message || "Failed to import." });
      }
    }

    setImporting(false);
    qc.invalidateQueries({ queryKey: ["admin-products"] });
    qc.invalidateQueries({ queryKey: ["admin-brands"] });

    const succeeded = working.filter((r) => r.status === "success").length;
    const failed = working.length - succeeded;
    toast(failed ? `Imported ${succeeded}, ${failed} failed.` : `Imported ${succeeded} products.`);
  };

  return (
    <div className="admin-content">
      <header className="page-head page-head--compact">
        <h1 className="page-head__title">Import products</h1>
      </header>

      <div className="admin-card">
        <p style={{ color: "var(--muted)", fontSize: "var(--fs-sm)", marginBlockEnd: "var(--sp-3)" }}>
          Build your list in Excel or Google Sheets (use the template for the column headers),
          then copy the rows — including the header — and paste them below. They land in an
          editable grid, so you can fix any cell right here before importing. Unknown brands
          are created automatically; an Original/Inspired perfume must already exist in
          Admin → Originals.
        </p>

        <div style={{ display: "flex", gap: "var(--sp-2)", flexWrap: "wrap", marginBlockEnd: "var(--sp-2)" }}>
          <button type="button" className="btn btn--secondary" onClick={downloadTemplate}>
            Download column template
          </button>
        </div>

        <div className="import-paste">
          <textarea
            ref={pasteRef}
            className="input import-paste__area"
            rows={4}
            placeholder="Paste rows copied from Excel/Google Sheets here (include the header row)…"
          />
          <div style={{ display: "flex", gap: "var(--sp-2)" }}>
            <button type="button" className="btn btn--primary" onClick={loadPasted}>
              Add pasted rows to grid
            </button>
            <button type="button" className="btn btn--secondary" onClick={() => fileRef.current?.click()}>
              …or upload a .csv file
            </button>
            <input
              ref={fileRef}
              type="file"
              accept=".csv,text/csv"
              onChange={handleFile}
              style={{ display: "none" }}
            />
          </div>
        </div>

        <div className="admin-toolbar" style={{ marginBlockStart: "var(--sp-4)" }}>
          <span style={{ color: "var(--muted)", fontSize: "var(--fs-sm)" }}>
            {rows.length ? `${rows.length} rows — ${readyCount} ready, ${errorCount} need fixing.` : "No rows yet."}
          </span>
          <div style={{ display: "flex", gap: "var(--sp-2)" }}>
            <button type="button" className="btn btn--secondary" onClick={addBlankRow}>+ Add row</button>
            <Link className="btn btn--secondary" to="/admin/products">Back to products</Link>
            <button
              type="button"
              className="btn btn--primary"
              disabled={!readyCount || importing}
              onClick={runImport}
            >
              {importing ? "Importing…" : `Import ${readyCount || ""} product${readyCount === 1 ? "" : "s"}`}
            </button>
          </div>
        </div>

        {rows.length > 0 && (
          <div className="import-grid-wrap">
            <table className="table import-grid" aria-label="Import grid">
              <thead>
                <tr>
                  <th>Status</th>
                  {CSV_COLUMNS.map((c) => <th key={c}>{CSV_COLUMN_LABELS[c]}</th>)}
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.key}>
                    <td
                      className="import-grid__status"
                      title={r.message}
                      style={{
                        color: r.status === "error" ? "var(--danger)"
                          : r.status === "success" ? "var(--success)"
                          : "var(--muted)"
                      }}
                    >
                      {r.status === "pending" && "Ready"}
                      {r.status === "importing" && "…"}
                      {r.status === "success" && "✓ Imported"}
                      {r.status === "error" && "⚠ Fix"}
                    </td>
                    {CSV_COLUMNS.map((c) => (
                      <td key={c}>
                        <input
                          className="input import-grid__cell"
                          value={r.raw[c] ?? ""}
                          onChange={(e) => editCell(r.key, c, e.target.value)}
                        />
                      </td>
                    ))}
                    <td>
                      <button
                        type="button"
                        className="btn btn--danger import-grid__remove"
                        aria-label="Remove row"
                        onClick={() => removeRow(r.key)}
                      >
                        ×
                      </button>
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
