/* -------------------------------------------------------------
 * STORE / PRODUCT.JS — Product detail page (all categories)
 * Renders one product from the catalog by ?id=, wires size,
 * quantity, add-to-cart, related items. Depends on chrome.js.
 * ------------------------------------------------------------- */
(function () {
  "use strict";
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
  const bi = (ar, en) => `<span data-lang-ar>${ar}</span><span data-lang-en>${en}</span>`;
  const ph = (text) => `https://placehold.co/600x750/171311/c9a84c/png?text=${encodeURIComponent(text)}&font=playfair-display`;

  const CATS = {
    perfumes: { ar: "العطور", en: "Perfumes", href: "/shop/perfumes" },
    clothing: { ar: "الملابس", en: "Clothing", href: "/shop/clothing" },
    sneakers: { ar: "الأحذية", en: "Sneakers", href: "/shop/sneakers" }
  };
  const NOTES = { ar: "النفحات الأساسية", en: "Top notes" };
  const BASE  = { ar: "القاعدة", en: "Base notes" };
  const MAT   = { ar: "الخامة", en: "Material" };
  const DET   = { ar: "التفاصيل", en: "Details" };

  const PRODUCTS = {
    /* ---------------- PERFUMES (real photography) ---------------- */
    "oud-mystery": {
      category: "perfumes", ar_name: "سر العود", en_name: "Oud Mystery",
      ar_collection: "مجموعة الرجولة", en_collection: "Masculinity Collection",
      price: 450, image: "/assets/images/product_oud.png", gender: "men",
      ar_desc: "عطر جريء وساحر يمزج بين العود المعتق الفاخر والبخور التقليدي. رائحة عميقة تعكس عراقة التراث المصري.",
      en_desc: "A bold, enchanting blend of aged premium oud and traditional incense. A deep aroma rooted in Egyptian heritage.",
      s1l: NOTES, ar_s1: "العود الملكي، البخور", en_s1: "Royal Oud, Incense",
      s2l: BASE, ar_s2: "المسك، السرو", en_s2: "Musk, Cypress",
      ar_alt: "زجاجة عطر سر العود، عنبر نبيل يتصاعد منه البخور على خشب داكن",
      en_alt: "Oud Mystery bottle, noble amber with incense rising over dark wood",
      sizes: ["50ml", "100ml"]
    },
    "jasmine-memories": {
      category: "perfumes", ar_name: "ذاكرة الفل", en_name: "Jasmine Memories",
      ar_collection: "مجموعة النخبة", en_collection: "Heritage Line",
      price: 375, image: "/assets/images/product_jasmine.png", gender: "women",
      ar_desc: "يجسّد رائحة الياسمين الليلي على شرفات بيوت القاهرة القديمة، خليط حسّاس من الزهور البيضاء فوق قاعدة خشبية دافئة.",
      en_desc: "The scent of night jasmine on old Cairo balconies, a delicate blend of white florals over a warm wooden base.",
      s1l: NOTES, ar_s1: "الياسمين، الفل البلدي", en_s1: "Jasmine, Local Sambac",
      s2l: BASE, ar_s2: "العود، الصندل", en_s2: "Oud, Sandalwood",
      ar_alt: "زجاجة عطر ذاكرة الفل على قطيفة داكنة محاطة بأزهار الفل البيضاء",
      en_alt: "Jasmine Memories bottle on dark velvet, ringed by white jasmine blossoms",
      sizes: ["50ml", "100ml"]
    },
    "rose-elegance": {
      category: "perfumes", ar_name: "وردة الأناقة", en_name: "Rose Elegance",
      ar_collection: "مجموعة النخبة", en_collection: "Elite Collection",
      price: 350, image: "/assets/images/product_nostalgia.png", gender: "women",
      ar_desc: "رقّة الورد الدمشقي مع مسك أبيض ناعم. دفء حنيني يذكّر بحدائق القاهرة القديمة.",
      en_desc: "Damask rose softened by white musk. A nostalgic warmth recalling the gardens of old Cairo.",
      s1l: NOTES, ar_s1: "الورد الدمشقي، الفاو", en_s1: "Damask Rose, Fao",
      s2l: BASE, ar_s2: "المسك الأبيض، العنبر", en_s2: "White Musk, Amber",
      ar_alt: "زجاجة عطر وردة الأناقة الكريستالية بنفّاثة عنّابية على رخام داكن",
      en_alt: "Rose Elegance crystal bottle with a burgundy atomizer on dark marble",
      sizes: ["50ml", "100ml"]
    },

    /* ---------------- CLOTHING (placeholder images) ---------------- */
    "linen-abaya": {
      category: "clothing", ar_name: "عباية الكتان الفاخرة", en_name: "Linen Abaya",
      ar_collection: "مجموعة الكلاسيكيات", en_collection: "Classics Collection",
      price: 850, image: ph("Linen Abaya"), gender: "women",
      ar_desc: "عباية من كتان فاخر ١٠٠٪ مع تطريز يدوي دقيق، تجمع التقليد والحداثة بأناقة هادئة.",
      en_desc: "An abaya in 100% premium linen with fine hand embroidery, joining tradition and modernity with quiet elegance.",
      s1l: MAT, ar_s1: "كتان مصري ١٠٠٪", en_s1: "100% Egyptian linen",
      s2l: DET, ar_s2: "تطريز يدوي فني", en_s2: "Fine hand embroidery",
      ar_alt: "عباية كتان فاخرة بتطريز يدوي", en_alt: "Premium linen abaya with hand embroidery",
      sizes: ["XS", "S", "M", "L", "XL"]
    },
    "silk-dress": {
      category: "clothing", ar_name: "فستان الحرير الأنثوي", en_name: "Silk Dress",
      ar_collection: "مجموعة العصرية", en_collection: "Contemporary Line",
      price: 1200, image: ph("Silk Dress"), gender: "women",
      ar_desc: "فستان من حرير ناعم بقصّة عصرية وتفاصيل تراثية، يليق بالمناسبات الراقية.",
      en_desc: "A soft-silk dress with a contemporary cut and heritage details, made for refined occasions.",
      s1l: MAT, ar_s1: "حرير طبيعي ناعم", en_s1: "Soft natural silk",
      s2l: DET, ar_s2: "قصّة معاصرة أنيقة", en_s2: "Elegant contemporary cut",
      ar_alt: "فستان حرير أنثوي بقصة معاصرة", en_alt: "Feminine silk dress with a contemporary cut",
      sizes: ["XS", "S", "M", "L", "XL"]
    },
    "linen-shirt": {
      category: "clothing", ar_name: "قميص الكتان الكلاسيكي", en_name: "Linen Shirt",
      ar_collection: "مجموعة الرجولة", en_collection: "Men's Classics",
      price: 650, image: ph("Linen Shirt"), gender: "men",
      ar_desc: "قميص كتان مصري ١٠٠٪ خفيف وجيد التهوية، أناقة لا تخطئها العين في الطقس الحار.",
      en_desc: "A 100% Egyptian linen shirt, light and breathable, unmistakably elegant in the heat.",
      s1l: MAT, ar_s1: "كتان مصري ١٠٠٪", en_s1: "100% Egyptian linen",
      s2l: DET, ar_s2: "خياطة يدوية دقيقة", en_s2: "Precise hand stitching",
      ar_alt: "قميص كتان كلاسيكي للرجال", en_alt: "Classic men's linen shirt",
      sizes: ["S", "M", "L", "XL", "XXL"]
    },
    "cotton-vest": {
      category: "clothing", ar_name: "جيليه القطن المعاصر", en_name: "Cotton Vest",
      ar_collection: "مجموعة العصرية", en_collection: "Men's Contemporary",
      price: 750, image: ph("Cotton Vest"), gender: "men",
      ar_desc: "جيليه قطن عالي الجودة بقصّة عصرية وتفاصيل تراثية، مثالي للعمل والمناسبات.",
      en_desc: "A premium cotton vest with a modern cut and heritage details, ideal for work and occasions.",
      s1l: MAT, ar_s1: "قطن عالي الجودة", en_s1: "Premium cotton",
      s2l: DET, ar_s2: "قصّة عصرية دقيقة", en_s2: "Precise modern cut",
      ar_alt: "جيليه قطن معاصر للرجال", en_alt: "Contemporary men's cotton vest",
      sizes: ["S", "M", "L", "XL", "XXL"]
    },

    /* ---------------- SNEAKERS (placeholder data + images) ---------------- */
    "cairo-low": {
      category: "sneakers", ar_name: "كايرو لو", en_name: "Cairo Low",
      ar_collection: "مجموعة الجلد", en_collection: "Leather Line",
      price: 1800, image: ph("Cairo Low"), gender: "men",
      ar_desc: "حذاء جلدي منخفض بقَصّة نظيفة وجلد مدبوغ بالكامل، يجمع راحة اليوم وأناقة المدينة.",
      en_desc: "A clean-cut low-top in full-grain leather, pairing all-day comfort with city polish.",
      s1l: MAT, ar_s1: "جلد طبيعي مدبوغ", en_s1: "Full-grain leather",
      s2l: DET, ar_s2: "نعل مطاطي مرن", en_s2: "Flexible rubber sole",
      ar_alt: "حذاء جلدي منخفض الرقبة", en_alt: "Full-grain leather low-top sneaker",
      sizes: ["40", "41", "42", "43", "44", "45"]
    },
    "nile-runner": {
      category: "sneakers", ar_name: "نايل رنر", en_name: "Nile Runner",
      ar_collection: "مجموعة الجلد", en_collection: "Leather Line",
      price: 2100, image: ph("Nile Runner"), gender: "men",
      ar_desc: "حذاء رياضي بخامة شامواه ونعل خفيف، مستوحى من إيقاع المدينة على ضفاف النيل.",
      en_desc: "A suede runner on a lightweight sole, inspired by the city's rhythm along the Nile.",
      s1l: MAT, ar_s1: "شامواه طبيعي", en_s1: "Natural suede",
      s2l: DET, ar_s2: "نعل خفيف ممتص للصدمات", en_s2: "Lightweight cushioned sole",
      ar_alt: "حذاء رياضي من الشامواه", en_alt: "Suede runner sneaker",
      sizes: ["40", "41", "42", "43", "44", "45"]
    },
    "linen-court": {
      category: "sneakers", ar_name: "كورت الكتان", en_name: "Linen Court",
      ar_collection: "مجموعة الكانفاس", en_collection: "Canvas Line",
      price: 1500, image: ph("Linen Court"), gender: "women",
      ar_desc: "حذاء كانفاس كتاني بتصميم كورت كلاسيكي ولمسة معاصرة خفيفة.",
      en_desc: "A linen-canvas court shoe with a classic silhouette and a light contemporary touch.",
      s1l: MAT, ar_s1: "كانفاس كتان", en_s1: "Linen canvas",
      s2l: DET, ar_s2: "بطانة قطنية مريحة", en_s2: "Cotton comfort lining",
      ar_alt: "حذاء كورت من كانفاس الكتان", en_alt: "Linen-canvas court shoe",
      sizes: ["36", "37", "38", "39", "40", "41"]
    },
    "wadi-high": {
      category: "sneakers", ar_name: "وادي هاي", en_name: "Wadi High",
      ar_collection: "مجموعة الجلد", en_collection: "Leather Line",
      price: 2300, image: ph("Wadi High"), gender: "women",
      ar_desc: "حذاء جلدي مرتفع الرقبة بخطوط نظيفة ولون ترابي دافئ يذكّر بوديان الصحراء.",
      en_desc: "A leather high-top with clean lines and a warm earthen tone recalling desert valleys.",
      s1l: MAT, ar_s1: "جلد طبيعي", en_s1: "Full-grain leather",
      s2l: DET, ar_s2: "رقبة مبطّنة للدعم", en_s2: "Padded collar support",
      ar_alt: "حذاء جلدي مرتفع الرقبة", en_alt: "Leather high-top sneaker",
      sizes: ["36", "37", "38", "39", "40", "41"]
    }
  };

  const params = new URLSearchParams(location.search);
  const id = PRODUCTS[params.get("id")] ? params.get("id") : "oud-mystery";
  const p = PRODUCTS[id];
  const cat = CATS[p.category];

  // Category-aware breadcrumb + nav
  const catLink = $("#pdp-cat-link");
  if (catLink) { catLink.href = cat.href; catLink.innerHTML = bi(cat.ar, cat.en); }
  $$(".store-nav__link, .store-drawer__link").forEach((a) => {
    if (a.getAttribute("href") === cat.href) a.setAttribute("aria-current", "page");
    else if ((a.getAttribute("href") || "").startsWith("/shop/")) a.removeAttribute("aria-current");
  });

  // Fill fields (bilingual via spans; CSS shows the active language)
  $("#pdp-crumb").innerHTML = bi(p.ar_name, p.en_name);
  $("#pdp-collection").innerHTML = bi(p.ar_collection, p.en_collection);
  $("#pdp-title").innerHTML = bi(p.ar_name, p.en_name);
  $("#pdp-price").innerHTML = bi(RB.formatPrice(p.price, "ar"), RB.formatPrice(p.price, "en"));
  $("#pdp-desc").innerHTML = bi(p.ar_desc, p.en_desc);
  $("#pdp-spec1-label").innerHTML = bi(p.s1l.ar, p.s1l.en);
  $("#pdp-spec1").innerHTML = bi(p.ar_s1, p.en_s1);
  $("#pdp-spec2-label").innerHTML = bi(p.s2l.ar, p.s2l.en);
  $("#pdp-spec2").innerHTML = bi(p.ar_s2, p.en_s2);

  const img = $("#pdp-img");
  img.src = p.image;
  img.setAttribute("data-ar-alt", p.ar_alt);
  img.setAttribute("data-en-alt", p.en_alt);
  img.alt = RB.lang() === "ar" ? p.ar_alt : p.en_alt;

  document.title = RB.lang() === "ar" ? `${p.ar_name} · تِبْر` : `${p.en_name} · Tibr`;
  document.body.dataset.titleAr = `${p.ar_name} · تِبْر`;
  document.body.dataset.titleEn = `${p.en_name} · Tibr`;

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
    qtyValue.textContent = RB.lang() === "ar" ? RB.arDigits(qty) : String(qty);
    minus.disabled = qty <= 1;
  }
  minus.addEventListener("click", () => { if (qty > 1) { qty--; renderQty(); } });
  plus.addEventListener("click", () => { qty++; renderQty(); });
  renderQty();

  // Add to cart
  $("#pdp-add").addEventListener("click", () => {
    RB.addToCart({ id, ar_name: p.ar_name, en_name: p.en_name, price: p.price, image: p.image, size: selectedSize(), qty });
  });

  // Related (same category, others)
  const related = Object.keys(PRODUCTS).filter((k) => k !== id && PRODUCTS[k].category === p.category).slice(0, 3);
  $("#pdp-related").innerHTML = related.map((rid) => {
    const r = PRODUCTS[rid];
    return `
    <article class="product">
      <div class="product__media">
        <a class="product__link" href="/product?id=${rid}" aria-label="${r.ar_name}">
          <img class="product__img" src="${r.image}" loading="lazy" decoding="async" alt="${RB.lang() === "ar" ? r.ar_alt : r.en_alt}">
        </a>
      </div>
      <div class="product__body">
        <p class="product__collection">${bi(r.ar_collection, r.en_collection)}</p>
        <a class="product__name-link" href="/product?id=${rid}"><h3 class="product__name">${bi(r.ar_name, r.en_name)}</h3></a>
        <div class="product__meta"><span class="product__price">${bi(RB.formatPrice(r.price, "ar"), RB.formatPrice(r.price, "en"))}</span></div>
      </div>
    </article>`;
  }).join("");

  document.addEventListener("languageChanged", (e) => {
    const lang = e.detail.lang;
    img.alt = lang === "ar" ? p.ar_alt : p.en_alt;
    renderQty();
    $$("#pdp-related .product__img").forEach((im, i) => {
      const r = PRODUCTS[related[i]];
      if (r) im.alt = lang === "ar" ? r.ar_alt : r.en_alt;
    });
  });
})();
