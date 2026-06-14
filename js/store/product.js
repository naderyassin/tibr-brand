/* -------------------------------------------------------------
 * STORE / PRODUCT.JS — Product detail page (all categories)
 * Renders one product from the catalog by ?id=, wires size,
 * quantity, add-to-cart, related items. Depends on chrome.js.
 * ------------------------------------------------------------- */
(function () {
  "use strict";
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
  const ph = (text) => `https://placehold.co/600x750/171311/c9a84c/png?text=${encodeURIComponent(text)}&font=playfair-display`;

  const CATS = {
    perfumes: { en: "Perfumes", href: "/shop/perfumes" },
    clothing: { en: "Clothing", href: "/shop/clothing" },
    sneakers: { en: "Sneakers", href: "/shop/sneakers" }
  };
  const NOTES = "Top notes";
  const BASE  = "Base notes";
  const MAT   = "Material";
  const DET   = "Details";

  const PRODUCTS = {
    /* ---------------- PERFUMES (real photography) ---------------- */
    "oud-mystery": {
      category: "perfumes", en_name: "Oud Mystery",
      en_collection: "Masculinity Collection",
      price: 450, image: "/assets/images/product_oud.webp", gender: "men",
      en_desc: "A bold, enchanting blend of aged premium oud and traditional incense. A deep aroma rooted in Egyptian heritage.",
      s1l: NOTES, en_s1: "Royal Oud, Incense",
      s2l: BASE, en_s2: "Musk, Cypress",
      en_alt: "Oud Mystery bottle, noble amber with incense rising over dark wood",
      sizes: ["50ml", "100ml"]
    },
    "jasmine-memories": {
      category: "perfumes", en_name: "Jasmine Memories",
      en_collection: "Heritage Line",
      price: 375, image: "/assets/images/product_jasmine.webp", gender: "women",
      en_desc: "The scent of night jasmine on old Cairo balconies, a delicate blend of white florals over a warm wooden base.",
      s1l: NOTES, en_s1: "Jasmine, Local Sambac",
      s2l: BASE, en_s2: "Oud, Sandalwood",
      en_alt: "Jasmine Memories bottle on dark velvet, ringed by white jasmine blossoms",
      sizes: ["50ml", "100ml"]
    },
    "rose-elegance": {
      category: "perfumes", en_name: "Rose Elegance",
      en_collection: "Elite Collection",
      price: 350, image: "/assets/images/product_nostalgia.webp", gender: "women",
      en_desc: "Damask rose softened by white musk. A nostalgic warmth recalling the gardens of old Cairo.",
      s1l: NOTES, en_s1: "Damask Rose, Fao",
      s2l: BASE, en_s2: "White Musk, Amber",
      en_alt: "Rose Elegance crystal bottle with a burgundy atomizer on dark marble",
      sizes: ["50ml", "100ml"]
    },

    /* ---------------- CLOTHING (placeholder images) ---------------- */
    "linen-abaya": {
      category: "clothing", en_name: "Linen Abaya",
      en_collection: "Classics Collection",
      price: 850, image: ph("Linen Abaya"), gender: "women",
      en_desc: "An abaya in 100% premium linen with fine hand embroidery, joining tradition and modernity with quiet elegance.",
      s1l: MAT, en_s1: "100% Egyptian linen",
      s2l: DET, en_s2: "Fine hand embroidery",
      en_alt: "Premium linen abaya with hand embroidery",
      sizes: ["XS", "S", "M", "L", "XL"]
    },
    "silk-dress": {
      category: "clothing", en_name: "Silk Dress",
      en_collection: "Contemporary Line",
      price: 1200, image: ph("Silk Dress"), gender: "women",
      en_desc: "A soft-silk dress with a contemporary cut and heritage details, made for refined occasions.",
      s1l: MAT, en_s1: "Soft natural silk",
      s2l: DET, en_s2: "Elegant contemporary cut",
      en_alt: "Feminine silk dress with a contemporary cut",
      sizes: ["XS", "S", "M", "L", "XL"]
    },
    "linen-shirt": {
      category: "clothing", en_name: "Linen Shirt",
      en_collection: "Men's Classics",
      price: 650, image: ph("Linen Shirt"), gender: "men",
      en_desc: "A 100% Egyptian linen shirt, light and breathable, unmistakably elegant in the heat.",
      s1l: MAT, en_s1: "100% Egyptian linen",
      s2l: DET, en_s2: "Precise hand stitching",
      en_alt: "Classic men's linen shirt",
      sizes: ["S", "M", "L", "XL", "XXL"]
    },
    "cotton-vest": {
      category: "clothing", en_name: "Cotton Vest",
      en_collection: "Men's Contemporary",
      price: 750, image: ph("Cotton Vest"), gender: "men",
      en_desc: "A premium cotton vest with a modern cut and heritage details, ideal for work and occasions.",
      s1l: MAT, en_s1: "Premium cotton",
      s2l: DET, en_s2: "Precise modern cut",
      en_alt: "Contemporary men's cotton vest",
      sizes: ["S", "M", "L", "XL", "XXL"]
    },

    /* ---------------- SNEAKERS (placeholder data + images) ---------------- */
    "cairo-low": {
      category: "sneakers", en_name: "Cairo Low",
      en_collection: "Leather Line",
      price: 1800, image: ph("Cairo Low"), gender: "men",
      en_desc: "A clean-cut low-top in full-grain leather, pairing all-day comfort with city polish.",
      s1l: MAT, en_s1: "Full-grain leather",
      s2l: DET, en_s2: "Flexible rubber sole",
      en_alt: "Full-grain leather low-top sneaker",
      sizes: ["40", "41", "42", "43", "44", "45"]
    },
    "nile-runner": {
      category: "sneakers", en_name: "Nile Runner",
      en_collection: "Leather Line",
      price: 2100, image: ph("Nile Runner"), gender: "men",
      en_desc: "A suede runner on a lightweight sole, inspired by the city's rhythm along the Nile.",
      s1l: MAT, en_s1: "Natural suede",
      s2l: DET, en_s2: "Lightweight cushioned sole",
      en_alt: "Suede runner sneaker",
      sizes: ["40", "41", "42", "43", "44", "45"]
    },
    "linen-court": {
      category: "sneakers", en_name: "Linen Court",
      en_collection: "Canvas Line",
      price: 1500, image: ph("Linen Court"), gender: "women",
      en_desc: "A linen-canvas court shoe with a classic silhouette and a light contemporary touch.",
      s1l: MAT, en_s1: "Linen canvas",
      s2l: DET, en_s2: "Cotton comfort lining",
      en_alt: "Linen-canvas court shoe",
      sizes: ["36", "37", "38", "39", "40", "41"]
    },
    "wadi-high": {
      category: "sneakers", en_name: "Wadi High",
      en_collection: "Leather Line",
      price: 2300, image: ph("Wadi High"), gender: "women",
      en_desc: "A leather high-top with clean lines and a warm earthen tone recalling desert valleys.",
      s1l: MAT, en_s1: "Full-grain leather",
      s2l: DET, en_s2: "Padded collar support",
      en_alt: "Leather high-top sneaker",
      sizes: ["36", "37", "38", "39", "40", "41"]
    }
  };

  const params = new URLSearchParams(location.search);
  const id = PRODUCTS[params.get("id")] ? params.get("id") : "oud-mystery";
  const p = PRODUCTS[id];
  const cat = CATS[p.category];

  // Category-aware breadcrumb + nav
  const catLink = $("#pdp-cat-link");
  if (catLink) { catLink.href = cat.href; catLink.textContent = cat.en; }
  $$(".store-nav__link, .store-drawer__link").forEach((a) => {
    if (a.getAttribute("href") === cat.href) a.setAttribute("aria-current", "page");
    else if ((a.getAttribute("href") || "").startsWith("/shop/")) a.removeAttribute("aria-current");
  });

  // Fill fields
  $("#pdp-crumb").textContent = p.en_name;
  $("#pdp-collection").textContent = p.en_collection;
  $("#pdp-title").textContent = p.en_name;
  $("#pdp-price").textContent = RB.formatPrice(p.price);
  $("#pdp-desc").textContent = p.en_desc;
  $("#pdp-spec1-label").textContent = p.s1l;
  $("#pdp-spec1").textContent = p.en_s1;
  $("#pdp-spec2-label").textContent = p.s2l;
  $("#pdp-spec2").textContent = p.en_s2;

  const img = $("#pdp-img");
  img.src = p.image;
  img.alt = p.en_alt;

  document.title = `${p.en_name} · Tibr`;

  // Sizes
  const sizesWrap = $("#pdp-sizes");
  sizesWrap.innerHTML = p.sizes.map((s, i) =>
    `<label class="size-chip"><input type="radio" name="size" value="${s}"${i === 0 ? " checked" : ""}><span>${s}</span></label>`
  ).join("");
  const selectedSize = () => (sizesWrap.querySelector("input:checked") || {}).value || p.sizes[0];

  // Quantity stepper
  let qty = 1;
  const qtyValue = $("#qty-value"), minus = $("#qty-minus"), plus = $("#qty-plus");
  function renderQty() {
    qtyValue.textContent = String(qty);
    minus.disabled = qty <= 1;
  }
  minus.addEventListener("click", () => { if (qty > 1) { qty--; renderQty(); } });
  plus.addEventListener("click", () => { qty++; renderQty(); });
  renderQty();

  // Add to cart
  $("#pdp-add").addEventListener("click", () => {
    RB.addToCart({ id, en_name: p.en_name, price: p.price, image: p.image, size: selectedSize(), qty });
  });

  // Related (same category, others)
  const related = Object.keys(PRODUCTS).filter((k) => k !== id && PRODUCTS[k].category === p.category).slice(0, 3);
  $("#pdp-related").innerHTML = related.map((rid) => {
    const r = PRODUCTS[rid];
    return `
    <article class="product">
      <div class="product__media">
        <a class="product__link" href="/product?id=${rid}" aria-label="${r.en_name}">
          <img class="product__img" src="${r.image}" loading="lazy" decoding="async" alt="${r.en_alt}">
        </a>
      </div>
      <div class="product__body">
        <p class="product__collection">${r.en_collection}</p>
        <a class="product__name-link" href="/product?id=${rid}"><h3 class="product__name">${r.en_name}</h3></a>
        <div class="product__meta"><span class="product__price">${RB.formatPrice(r.price)}</span></div>
      </div>
    </article>`;
  }).join("");
})();
