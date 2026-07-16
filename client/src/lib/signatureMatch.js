// Scent-finder matching logic — pure functions, no network, unit-testable.
//
// Given the quiz answers and the product catalog (as returned by
// getProducts(), i.e. already normalized by server.js's normalizeProduct:
// each product carries `notes: { top: [], heart: [], base: [] }`, `audience`,
// `families` (text[]), `seasons` (text[]), `sillage`), rank the catalog by
// how well it matches what the shopper said they love.
//
// Scoring model:
//   1. Hard excludes (never shown, regardless of score):
//        - audience mismatch, EXCEPT a `unisex` product always matches any
//          audience, and answering `unisex` always matches any product.
//        - any product that contains a note the shopper marked as hated,
//          at ANY layer.
//   2. Weighted note hits — the dry-down (base) matters more than a top note
//      that's gone in 15 minutes: base > heart > top.
//   3. Family overlap — a softer secondary signal so a product that shares
//      the *character* of what they love (e.g. "woody") still surfaces even
//      when it has no exact note match. Families for the shopper's loved
//      notes are resolved via the notes catalog (NOTES_BY_SLUG), so this
//      works from HERO_NOTES slugs without the caller doing that lookup.
//   4. Season / sillage — gentle boosts, never filters.
//   5. Score is normalized against the best score achievable for THIS
//      shopper's answers, so "100" always means "as good a match as this
//      quiz can produce," not an arbitrary raw unit.
//
// NOTE on data reality: as of this writing most products in the DB have an
// empty note pyramid (product_notes is untagged) but DO carry a `families`
// array. That means, in practice, family overlap is often the only signal
// with any signal in it. The algorithm still prioritizes exact note hits
// when they exist — this isn't a workaround, it's what "family overlap as a
// secondary signal" degrades to gracefully when the primary signal is absent
// for a given product.

import { NOTES_BY_SLUG } from "./notesCatalog.js";

const LAYER_WEIGHT = { base: 5, heart: 3, top: 1 };
const FAMILY_WEIGHT = 2;
const SEASON_BOOST = 2;
const SILLAGE_BOOST = 2;
const LAYERS = ["top", "heart", "base"];

const asArray = (v) => (Array.isArray(v) ? v : []);

/** Resolve a set of note slugs to the (unique) families they belong to. */
function familiesOf(slugs) {
  const families = new Set();
  for (const slug of slugs) {
    const note = NOTES_BY_SLUG.get(slug);
    if (note?.family) families.add(note.family);
  }
  return families;
}

/** families explicitly on the product, else derived from its tagged notes. */
function effectiveFamilies(product) {
  const explicit = asArray(product.families);
  if (explicit.length) return new Set(explicit);
  const fromNotes = new Set();
  for (const layer of LAYERS) {
    for (const n of asArray(product.notes?.[layer])) {
      if (n?.family) fromNotes.add(n.family);
    }
  }
  return fromNotes;
}

/** Every note slug on the product, across all three layers, with its layer. */
function pyramidEntries(product) {
  const entries = [];
  for (const layer of LAYERS) {
    for (const n of asArray(product.notes?.[layer])) {
      if (n?.slug) entries.push({ ...n, layer });
    }
  }
  return entries;
}

function audienceMatches(productAudience, wantedAudience) {
  if (!wantedAudience) return true; // no preference stated — exclude nothing
  if (!productAudience) return true; // product didn't declare one — don't punish it
  if (productAudience === "unisex" || wantedAudience === "unisex") return true;
  return productAudience === wantedAudience;
}

/** Score one product. Returns null if the product is hard-excluded. */
function scoreProduct(product, ctx) {
  const { audience, loveSet, hateSet, loveFamilies, season, sillage } = ctx;

  if (!audienceMatches(product.audience, audience)) return null;

  const entries = pyramidEntries(product);
  if (hateSet.size && entries.some((n) => hateSet.has(n.slug))) return null;

  // A loved note can only count once even if it somehow appears in more than
  // one layer — take the layer with the higher weight, don't double-score it.
  const bestPerSlug = new Map();
  for (const entry of entries) {
    if (!loveSet.has(entry.slug)) continue;
    const w = LAYER_WEIGHT[entry.layer] || 0;
    const existing = bestPerSlug.get(entry.slug);
    if (!existing || w > existing.weight) bestPerSlug.set(entry.slug, { ...entry, weight: w });
  }
  const hits = [...bestPerSlug.values()];
  const noteScore = hits.reduce((sum, h) => sum + h.weight, 0);

  const productFamilies = effectiveFamilies(product);
  const familyMatches = [...loveFamilies].filter((f) => productFamilies.has(f));
  const familyScore = familyMatches.length * FAMILY_WEIGHT;

  const seasons = asArray(product.seasons);
  const seasonMatched = !!(season && seasons.length && seasons.includes(season));
  const sillageMatched = !!(sillage && product.sillage && product.sillage === sillage);

  const raw =
    noteScore + familyScore + (seasonMatched ? SEASON_BOOST : 0) + (sillageMatched ? SILLAGE_BOOST : 0);

  return {
    product,
    raw,
    hits: hits.sort((a, b) => (LAYER_WEIGHT[b.layer] || 0) - (LAYER_WEIGHT[a.layer] || 0)),
    familyMatches,
    seasonMatched,
    sillageMatched,
  };
}

/**
 * Rank `products` against the quiz answers.
 *
 * @param {object} answers
 * @param {string}   [answers.audience] - "men" | "women" | "unisex"
 * @param {string[]} [answers.love]     - note slugs the shopper loves
 * @param {string[]} [answers.hate]     - note slugs the shopper can't stand
 * @param {string}   [answers.season]   - "spring" | "summer" | "fall" | "winter"
 * @param {string}   [answers.sillage]  - "intimate" | "moderate" | "strong" | "enormous"
 * @param {object[]} products - as returned by getProducts()'s `data`
 * @returns {{ results: Array, hasInput: boolean }}
 *   `results` is sorted best-first; each entry is
 *   { product, score (0-100), hits, familyMatches, seasonMatched, sillageMatched }.
 *   `score` is normalized to the best score these answers could produce, so
 *   100 = as good a match as this quiz can make, not an absolute unit.
 */
export function matchSignature(answers = {}, products = []) {
  const { audience, love = [], hate = [], season, sillage } = answers;

  const loveSet = new Set(love.filter(Boolean));
  const hateSet = new Set(hate.filter(Boolean));
  const loveFamilies = familiesOf(loveSet);

  const hasNoteInput = loveSet.size > 0;
  const hasAnyInput = hasNoteInput || !!audience || !!season || !!sillage || hateSet.size > 0;

  const ctx = { audience, loveSet, hateSet, loveFamilies, season, sillage };

  const scored = [];
  for (const product of asArray(products)) {
    const result = scoreProduct(product, ctx);
    if (result) scored.push(result);
  }

  // Normalize against the best score these answers could theoretically
  // produce: every loved note landing in the base layer, plus every loved
  // family being present, plus the season/sillage boosts (if asked about).
  const maxNoteScore = loveSet.size * LAYER_WEIGHT.base;
  const maxFamilyScore = loveFamilies.size * FAMILY_WEIGHT;
  const maxSeasonBoost = season ? SEASON_BOOST : 0;
  const maxSillageBoost = sillage ? SILLAGE_BOOST : 0;
  const ceiling = maxNoteScore + maxFamilyScore + maxSeasonBoost + maxSillageBoost;

  const results = scored
    .map((r) => ({
      ...r,
      // No signal was even possible to score against (a fully-empty quiz) —
      // treat every survivor as an equal, honest "50" rather than a
      // misleading 0 or 100.
      score: ceiling > 0 ? Math.max(0, Math.min(100, Math.round((r.raw / ceiling) * 100))) : 50,
    }))
    .sort((a, b) => b.score - a.score || b.raw - a.raw);

  return { results, hasInput: hasAnyInput };
}

/**
 * Convenience split for the result screen: one hero + up to `altCount`
 * secondary alternates. Returns { hero: null, alternates: [] } gracefully
 * when there's nothing to show.
 */
export function pickTopMatches({ results }, altCount = 3) {
  if (!results?.length) return { hero: null, alternates: [] };
  const [hero, ...rest] = results;
  return { hero, alternates: rest.slice(0, altCount) };
}
