// Pure input-parsing helpers shared across services and routes. No I/O, no
// dependencies — safe to import from anywhere in the backend.

const normalizeSizes = (sizes) => {
  if (Array.isArray(sizes)) {
    return sizes;
  }

  if (typeof sizes === "string" && sizes.trim()) {
    try {
      const parsed = JSON.parse(sizes);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    } catch (_) {
      return sizes.split(/[,،]/).map((size) => size.trim()).filter(Boolean);
    }
  }

  return [];
};

const trimValue = (value) => (typeof value === "string" ? value.trim() : value);

const slugifyValue = (value) =>
  String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

const parseStringArray = (value, allowed) => {
  const raw = Array.isArray(value)
    ? value
    : typeof value === "string"
      ? value.split(/[,،]/)
      : [];
  const out = [...new Set(raw.map((v) => trimValue(v)).filter(Boolean))];
  return allowed ? out.filter((v) => allowed.has(v)) : out;
};

const parseBool = (value) => value === true || value === "true" || value === "on" || value === "1";

const parsePrice = (price) => {
  if (typeof price === "number") return price;
  return Number(
    String(price || "")
      .replace(/[٠-٩]/g, (digit) => String(digit.charCodeAt(0) - 0x0660))
      .replace(/[^0-9.]/g, "")
  ) || 0;
};

const asIdArray = (v) => (Array.isArray(v) ? v.map(String).filter(Boolean) : []);

module.exports = {
  normalizeSizes,
  trimValue,
  slugifyValue,
  parseStringArray,
  parseBool,
  parsePrice,
  asIdArray,
};
