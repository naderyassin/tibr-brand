// Tiny in-process TTL cache for the public catalog reads.
//
// /api/products and /api/facets are the hottest endpoints on the site and their
// answers are identical for every visitor, yet each cold page view cost two or
// three round trips to Supabase (the listing, the facet tally, and the active
// automatic discounts). Under normal traffic that is what pushes the host's
// Max Processes over its limit. Entries are dropped wholesale on any admin
// write via bust(), so a catalog edit is still visible immediately.
//
// The cache itself is per-process, but the site runs CLUSTERED (see
// ecosystem.config.js) — so a bust() in the worker that handled an admin save
// would leave every sibling worker serving the old catalog until its TTL ran
// out. Workers therefore coordinate through a stamp file on the shared disk:
// bust() writes a fresh token, and every worker re-reads that token at most
// once a second and drops its cache when it changes. That bounds cross-worker
// staleness after an edit to ~1s instead of the full 60s TTL, with no Redis and
// no dependency on PM2's internals. Correct with one worker too — the file just
// never disagrees with itself.

const fs = require("fs");
const os = require("os");
const path = require("path");

// Overridable so the effect can be measured (CATALOG_CACHE_TTL_MS=0 turns the
// cache off entirely and every read goes to Supabase, as it did before).
const DEFAULT_TTL_MS = Number.isFinite(Number(process.env.CATALOG_CACHE_TTL_MS))
  && process.env.CATALOG_CACHE_TTL_MS !== ""
  ? Number(process.env.CATALOG_CACHE_TTL_MS)
  : 60 * 1000;
const MAX_ENTRIES = 300;

// key -> { value, expires, generation }. `value` holds the in-flight PROMISE,
// not the resolved data, so N concurrent misses collapse into one query
// (single-flight) instead of a thundering herd against Supabase.
const store = new Map();
let generation = 0;

// ── Cross-worker invalidation ────────────────────────────────────────────────
// Compared by CONTENT, not mtime: filesystem timestamp resolution varies, and a
// token is unambiguous. Lives in the OS temp dir so it never pollutes the repo
// or a deploy; if it is missing (first boot, temp cleaned) that simply reads as
// "nothing has been busted", which is the correct starting state.
const STAMP_PATH = path.join(os.tmpdir(), "tibr-catalog-cache.stamp");
const SIBLING_CHECK_MS = 1000;

let lastStamp = null;
let lastStampCheck = 0;

const readStamp = () => {
  try {
    return fs.readFileSync(STAMP_PATH, "utf8");
  } catch {
    return ""; // no stamp yet — nobody has busted anything
  }
};

// Drop the local cache if another worker has busted since we last looked.
// Throttled, so the hot path costs one small read per second, not per request.
const syncWithSiblings = () => {
  const now = Date.now();
  if (now - lastStampCheck < SIBLING_CHECK_MS) return;
  lastStampCheck = now;

  const stamp = readStamp();
  if (lastStamp === null) {
    lastStamp = stamp; // first look — adopt whatever is there, don't clear
    return;
  }
  if (stamp !== lastStamp) {
    lastStamp = stamp;
    generation += 1;
    store.clear();
  }
};

const evictOldest = () => {
  const oldest = store.keys().next().value;
  if (oldest !== undefined) store.delete(oldest);
};

/**
 * Resolve `key` from cache, or run `loader()` and cache its promise for `ttlMs`.
 * A rejected loader is never cached — the next request retries.
 */
const remember = (key, ttlMs, loader) => {
  syncWithSiblings();

  const hit = store.get(key);
  if (hit && hit.generation === generation && hit.expires > Date.now()) {
    // Refresh LRU position.
    store.delete(key);
    store.set(key, hit);
    return hit.value;
  }
  store.delete(key);

  const promise = Promise.resolve().then(loader);
  promise.catch(() => {
    if (store.get(key)?.value === promise) store.delete(key);
  });

  if (store.size >= MAX_ENTRIES) evictOldest();
  store.set(key, { value: promise, expires: Date.now() + ttlMs, generation });
  return promise;
};

// Invalidate everything, here and in every sibling worker. Bumping the
// generation (rather than only clearing) also poisons any promise still in
// flight from before the write, so a slow read started pre-write can never be
// stored as a post-write answer.
//
// The stamp write is best-effort: if the temp dir is not writable we still
// invalidate locally and siblings fall back to expiring on their own TTL, which
// is the old behaviour rather than a failure.
const bust = () => {
  generation += 1;
  store.clear();

  const stamp = `${Date.now()}-${process.pid}-${Math.random().toString(36).slice(2)}`;
  try {
    fs.writeFileSync(STAMP_PATH, stamp);
    // Adopt our own stamp so the next sync doesn't read it back as somebody
    // else's change and clear a cache we have already just cleared.
    lastStamp = stamp;
    lastStampCheck = Date.now();
  } catch {
    /* best effort — local invalidation above already happened */
  }
};

/**
 * Build a stable cache key from a query object, ignoring parameter order and
 * any param outside `allowed` — so junk query strings can't shard the cache.
 */
const queryKey = (prefix, query = {}, allowed = []) => {
  const parts = allowed
    .filter((k) => query[k] != null && query[k] !== "")
    .sort()
    .map((k) => `${k}=${String(query[k])}`);
  return `${prefix}:${parts.join("&")}`;
};

module.exports = { remember, bust, queryKey, DEFAULT_TTL_MS };
