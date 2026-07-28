// Per-IP request accounting, so "is something hammering the site?" is a
// question we can actually answer.
//
// The rate limiters in ./rateLimit cap abuse but are silent about it — when the
// host reports Max Processes near its ceiling there is no way to tell a genuine
// traffic spike from one crawler in a refresh loop. This keeps a rolling tally
// per IP and exposes it at GET /api/admin/traffic (admin-only, see
// routes/admin.js).
//
// In-process and deliberately lossy: two fixed windows (current + previous) are
// kept so the endpoint always has a full window to report, and the whole table
// is dropped on rotation. Nothing is persisted and no request bodies, headers,
// user ids, or query strings are recorded — only the IP, the path, and counts.
//
// IMPORTANT: the site runs clustered (ecosystem.config.js), and these counters
// live in ONE worker. A report therefore covers only the share of traffic that
// worker happened to handle — real totals are roughly this times the worker
// count. That is fine for the question it exists to answer ("is one IP hitting
// us far harder than everyone else?"), since the ranking holds within a worker,
// but the absolute numbers are a floor, not a total. The report labels itself
// with `worker` and `note` so nobody reads them as site-wide.

const WINDOW_MS = 15 * 60 * 1000;
const MAX_TRACKED_IPS = 2000;
// Per IP we keep at most this many distinct paths; past that only the total
// still climbs. Enough to spot a refresh loop, bounded against a path-fuzzer.
const MAX_PATHS_PER_IP = 25;

const newWindow = () => ({ startedAt: Date.now(), ips: new Map() });

let current = newWindow();
let previous = null;

const rotateIfDue = () => {
  if (Date.now() - current.startedAt < WINDOW_MS) return;
  previous = current;
  current = newWindow();
};

// Hashed bundles, images and fonts are cached hard and dominate the request
// count without telling us anything about visitor behaviour. Document loads
// (no extension) and /api calls are what a refresh loop actually repeats.
const isCountable = (reqPath) => !/\.[a-z0-9]+$/i.test(reqPath) || reqPath.endsWith(".html");

const trafficMonitor = (req, _res, next) => {
  rotateIfDue();

  if (!isCountable(req.path)) return next();

  const ip = req.ip || "unknown";
  let entry = current.ips.get(ip);

  if (!entry) {
    // Bounded: once the table is full, stop tracking NEW ips for this window
    // rather than evicting — the heavy hitters we care about are already in.
    if (current.ips.size >= MAX_TRACKED_IPS) return next();
    entry = { total: 0, api: 0, paths: new Map(), firstSeen: Date.now(), lastSeen: 0 };
    current.ips.set(ip, entry);
  }

  entry.total += 1;
  if (req.path.startsWith("/api/")) entry.api += 1;
  entry.lastSeen = Date.now();

  const seen = entry.paths.get(req.path);
  if (seen !== undefined) entry.paths.set(req.path, seen + 1);
  else if (entry.paths.size < MAX_PATHS_PER_IP) entry.paths.set(req.path, 1);

  next();
};

const summarize = (window, limit) => {
  if (!window) return null;

  const rows = [...window.ips.entries()].map(([ip, e]) => {
    // The single most-repeated path is the refresh-loop tell: a real visitor
    // browses many paths, a loop hits one over and over.
    let topPath = null;
    let topPathCount = 0;
    for (const [p, n] of e.paths) {
      if (n > topPathCount) { topPath = p; topPathCount = n; }
    }

    const spanMinutes = Math.max(1, (e.lastSeen - e.firstSeen) / 60000);

    return {
      ip,
      total: e.total,
      api: e.api,
      distinct_paths: e.paths.size,
      top_path: topPath,
      top_path_count: topPathCount,
      requests_per_minute: Number((e.total / spanMinutes).toFixed(1)),
      // Heuristic, not a verdict: many requests, nearly all to one path.
      looks_like_loop: e.total >= 30 && topPathCount / e.total > 0.8,
      first_seen: new Date(e.firstSeen).toISOString(),
      last_seen: new Date(e.lastSeen).toISOString(),
    };
  });

  rows.sort((a, b) => b.total - a.total);

  return {
    window_started_at: new Date(window.startedAt).toISOString(),
    window_minutes: WINDOW_MS / 60000,
    distinct_ips: window.ips.size,
    total_requests: rows.reduce((sum, r) => sum + r.total, 0),
    truncated: window.ips.size >= MAX_TRACKED_IPS,
    top_ips: rows.slice(0, limit),
  };
};

// PM2 exposes the instance number; fall back to the pid when run standalone.
const WORKER_ID = process.env.NODE_APP_INSTANCE ?? process.env.pm_id ?? `pid:${process.pid}`;

/** Snapshot of the current and previous windows, heaviest IPs first. */
const trafficReport = (limit = 25) => {
  rotateIfDue();
  return {
    worker: String(WORKER_ID),
    note: "Counts are for THIS worker only; the site runs clustered, so site-wide totals are higher. Rankings and the loop flag are still meaningful — refresh a few times to sample other workers.",
    current: summarize(current, limit),
    previous: summarize(previous, limit),
  };
};

module.exports = { trafficMonitor, trafficReport };
