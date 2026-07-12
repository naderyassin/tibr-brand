const req = async (method, path, body, token) => {
  const headers = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(path, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || "Request failed");
  return json;
};

export const api = {
  get: (path, token) => req("GET", path, null, token),
  post: (path, body, token) => req("POST", path, body, token),
  put: (path, body, token) => req("PUT", path, body, token),
  patch: (path, body, token) => req("PATCH", path, body, token),
  delete: (path, token) => req("DELETE", path, null, token),
};

// Products
// Facet counts for the filter sidebar — which values actually have stock behind
// them, so we never render a filter that leads nowhere.
export const getFacets = () => api.get("/api/facets");

/**
 * The one product query. Pass any subset of the taxonomy facets:
 *   getProducts({ audience: "men", family: "oud", sort: "price-asc" })
 *   getProducts({ inspired_by: "dior" })   // our versions of Dior originals
 * Empty values are dropped, so callers can spread filter state in directly.
 */
export const getProducts = (filters = {}) => {
  const qs = new URLSearchParams(
    Object.entries(filters).filter(([, v]) => v != null && v !== "")
  ).toString();
  return api.get(`/api/products${qs ? `?${qs}` : ""}`);
};
export const getProduct = (id) => api.get(`/api/products/${id}`);
export const getProductReviews = (id) => api.get(`/api/products/${id}/reviews`);
export const postReview = (id, body, token) =>
  api.post(`/api/products/${id}/reviews`, body, token);
export const getReviewsSummary = () => api.get("/api/reviews/summary");

// Profile
export const getProfile = (token) => api.get("/api/profile", token);
export const updateProfile = (body, token) => api.put("/api/profile", body, token);

// Addresses
export const getAddresses = (token) => api.get("/api/profile/addresses", token);
export const addAddress = (body, token) => api.post("/api/profile/addresses", body, token);
export const updateAddress = (id, body, token) => api.put(`/api/profile/addresses/${id}`, body, token);
export const deleteAddress = (id, token) => api.delete(`/api/profile/addresses/${id}`, token);
export const setDefaultAddress = (id, token) =>
  api.put(`/api/profile/addresses/${id}/default`, {}, token);

// Orders
export const getOrders = (token) => api.get("/api/orders", token);
export const checkout = (body, token) => api.post("/api/checkout", body, token);

// Discounts (shop-facing)
export const validateDiscount = (code, items, token) =>
  api.post("/api/discounts/validate", { code, items }, token);
export const getAutomaticDiscount = (items, token) =>
  api.post("/api/discounts/automatic", { items }, token);
export const getShippingDiscountThreshold = () => api.get("/api/discounts/shipping");

// Admin
export const adminGetProducts = (token) => api.get("/api/admin/products", token);
export const adminGetOrders = (token) => api.get("/api/admin/orders", token);
export const adminGetCustomers = (token) => api.get("/api/admin/customers", token);
export const adminGetCustomer = (id, token) =>
  api.get(`/api/admin/customers/${encodeURIComponent(id)}`, token);
export const adminUpdateOrderStatus = (id, status, token) =>
  api.patch(`/api/admin/orders/${id}`, { status }, token);
export const adminCreateProduct = (body, token) =>
  api.post("/api/admin/products", body, token);
export const adminUpdateProduct = (id, body, token) =>
  api.patch(`/api/admin/products/${id}`, body, token);
export const adminDeleteProduct = (id, token) =>
  api.delete(`/api/admin/products/${id}`, token);

// Catalog entities the product form picks from. Both are creatable inline so a
// new house — or an original a new Inspired product needs to reference — can be
// added without leaving the page.
export const adminGetBrands = (token) => api.get("/api/admin/brands", token);
export const adminCreateBrand = (body, token) =>
  api.post("/api/admin/brands", body, token);
export const adminGetOriginals = (token) => api.get("/api/admin/originals", token);
export const adminCreateOriginal = (body, token) =>
  api.post("/api/admin/originals", body, token);

export const adminGetDiscounts = (token) => api.get("/api/admin/discounts", token);
export const adminGetDiscount = (id, token) => api.get(`/api/admin/discounts/${id}`, token);
export const adminCreateDiscount = (body, token) =>
  api.post("/api/admin/discounts", body, token);
export const adminUpdateDiscount = (id, body, token) =>
  api.patch(`/api/admin/discounts/${id}`, body, token);
export const adminDeleteDiscount = (id, token) =>
  api.delete(`/api/admin/discounts/${id}`, token);
