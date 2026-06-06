window.apiClient = {
  async request(path, options = {}) {
    const config = {
      method: options.method || "GET",
      headers: {
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        ...(options.headers || {})
      }
    };

    if (options.auth) {
      const {
        data: { session }
      } = await window.supabaseClient.auth.getSession();

      if (!session?.access_token) {
        throw new Error("يرجى تسجيل الدخول أولاً.");
      }

      config.headers.Authorization = `Bearer ${session.access_token}`;
    }

    if (options.body) {
      config.body = JSON.stringify(options.body);
    }

    const response = await fetch(path, config);
    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(payload.error || "حدث خطأ أثناء تنفيذ الطلب.");
    }

    return payload;
  },

  getProducts() {
    return this.request("/api/products");
  },

  getProfile() {
    return this.request("/api/profile", { auth: true });
  },

  createOrder(order) {
    return this.request("/api/orders", {
      method: "POST",
      auth: true,
      body: order
    });
  },

  createProduct(product) {
    return this.request("/api/products", {
      method: "POST",
      auth: true,
      body: product
    });
  }
};
