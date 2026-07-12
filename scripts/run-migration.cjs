// Runs a .sql file against DATABASE_URL inside a transaction.
//   node run-migration.cjs <file.sql> [--commit]
// Without --commit it ROLLBACKs — a dry run that still prints every result grid.
const { readFileSync } = require("fs");
const { Client } = require("pg");

for (const l of readFileSync(".env", "utf8").split("\n")) {
  const m = l.match(/^([A-Z_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2].trim();
}

const file = process.argv[2];
const commit = process.argv.includes("--commit");
const sql = readFileSync(file, "utf8");

const table = (rows) => {
  if (!rows.length) return "  (no rows)";
  const cols = Object.keys(rows[0]);
  const w = cols.map((c) => Math.max(c.length, ...rows.map((r) => String(r[c] ?? "").length)));
  const line = (cells) => "  " + cells.map((v, i) => String(v ?? "").padEnd(w[i])).join("  ");
  return [line(cols), "  " + w.map((n) => "-".repeat(n)).join("  "), ...rows.map((r) => line(cols.map((c) => r[c])))].join("\n");
};

(async () => {
  const c = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  await c.connect();
  console.log(`${commit ? "COMMIT" : "DRY RUN (ROLLBACK)"} — ${file}\n`);
  try {
    await c.query("BEGIN");
    const res = await c.query(sql); // multi-statement: returns an array of results
    const results = Array.isArray(res) ? res : [res];
    let grid = 0;
    for (const r of results) {
      if (r.command === "SELECT" && r.rows.length) {
        console.log(`--- result grid ${++grid} ---`);
        console.log(table(r.rows), "\n");
      }
    }
    const counts = results.filter((r) => ["INSERT", "UPDATE", "DELETE"].includes(r.command));
    if (counts.length) console.log("rows written:", counts.map((r) => `${r.command} ${r.rowCount}`).join(", "), "\n");

    if (commit) { await c.query("COMMIT"); console.log("COMMITTED."); }
    else { await c.query("ROLLBACK"); console.log("ROLLED BACK — database unchanged."); }
  } catch (e) {
    await c.query("ROLLBACK").catch(() => {});
    console.error("FAILED — rolled back, database unchanged.");
    console.error(`  ${e.severity || "ERROR"} ${e.code || ""}: ${e.message}`);
    if (e.detail)   console.error(`  detail: ${e.detail}`);
    if (e.hint)     console.error(`  hint:   ${e.hint}`);
    if (e.position) console.error(`  at character ${e.position}`);
    process.exitCode = 1;
  } finally {
    await c.end();
  }
})();
