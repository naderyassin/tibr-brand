/* -------------------------------------------------------------
 * PRODUCTS.JS — Dynamic Catalog Controller & Category Layouts
 * ------------------------------------------------------------- */

document.addEventListener("DOMContentLoaded", () => {
  // 1. Core Catalog Dataset (Bilingual Classic-Modern Products with Sub-Categories)
  // 1. Core Catalog Dataset (Will be populated from Supabase)
  let products = [];

  // Function to load products from Supabase
  const loadProducts = async () => {
    try {
      const { data } = await window.apiClient.getProducts();

      if (data && data.length > 0) {
        products = data.map(item => ({
          id: item.id,
          category: item.category,
          subCategory: item.sub_category,
          gender: item.gender,
          sizes: Array.isArray(item.sizes) ? item.sizes : [],
          image: item.image,
          accentGlow: item.accent_glow,
          accentColor: item.accent_color,
          ar: {
            name: item.ar_name,
            collection: item.ar_collection,
            shortDesc: item.ar_short_desc,
            desc: item.ar_desc,
            specLeftVal: item.ar_spec_left,
            specRightVal: item.ar_spec_right,
            price: item.ar_price,
            mood: item.ar_mood
          },
          en: {
            name: item.en_name,
            collection: item.en_collection,
            shortDesc: item.en_short_desc,
            desc: item.en_desc,
            specLeftVal: item.en_spec_left,
            specRightVal: item.en_spec_right,
            price: item.en_price,
            mood: item.en_mood
          }
        }));
      }

      // Expose the catalog as the single shared source for the Shop PLP,
      // search, and wishlist; notify any listeners waiting on it.
      window.catalogProducts = products;
      document.dispatchEvent(new CustomEvent("productsLoaded", { detail: { products } }));

      // Initial render after loading
      renderCatalog(activeLang);
    } catch (error) {
      console.error('Error loading products from Supabase:', error);
    }
  };

  // DOM Layout Grid references
  const gridPerfumes = document.getElementById("perfumes-scent-grid");
  const containerClothes = document.getElementById("clothes-editorial-rows");
  const gridShoes = document.getElementById("shoes-lookbook-grid");

  // Home overview page references
  const homePerfumesGrid = document.getElementById("overview-perfumes-grid");
  const overviewPerfumeShowcase = document.getElementById("overview-perfume-showcase");
  const overviewPerfumeBottlesContainer = document.getElementById("overview-perfume-bottles-container");
  const overviewPerfumeProductInfo = document.getElementById("overview-perfume-product-info");
  const overviewPerfumeProductName = document.getElementById("overview-perfume-product-name");
  const overviewPerfumeProductSubtitle = document.getElementById("overview-perfume-product-subtitle");
  const overviewPerfumeProductNotes = document.getElementById("overview-perfume-product-notes");
  const overviewPerfumeNavDots = document.getElementById("overview-perfume-nav-dots");
  const overviewPerfumePrevBtn = document.getElementById("overview-perfume-prev-btn");
  const overviewPerfumeNextBtn = document.getElementById("overview-perfume-next-btn");
  const overviewPerfumeDiscoverBtn = document.getElementById("overview-perfume-discover-btn");
  const overviewPerfumeParticlesCanvas = document.getElementById("overview-perfume-particles-canvas");
  const homeClothesGrid = document.getElementById("overview-clothes-grid");
  const homeShoesGrid = document.getElementById("overview-shoes-grid");
  const perfumeShowcase = document.getElementById("perfume-showcase");
  const perfumeBottlesContainer = document.getElementById("perfume-bottles-container");
  const perfumeProductInfo = document.getElementById("perfume-product-info");
  const perfumeProductName = document.getElementById("perfume-product-name");
  const perfumeProductSubtitle = document.getElementById("perfume-product-subtitle");
  const perfumeProductNotes = document.getElementById("perfume-product-notes");
  const perfumeNavDots = document.getElementById("perfume-nav-dots");
  const perfumePrevBtn = document.getElementById("perfume-prev-btn");
  const perfumeNextBtn = document.getElementById("perfume-next-btn");
  const perfumeDiscoverBtn = document.getElementById("perfume-discover-btn");
  const perfumeParticlesCanvas = document.getElementById("perfume-particles-canvas");

  // Sub-filter DOM reference
  const subFilterWrapper = document.getElementById("perfume-subfilters");
  const genderFilterWrapper = document.getElementById("perfume-gender-filters");
  const clothesGenderFilterWrapper = document.getElementById("clothes-gender-filters");
  const shoesGenderFilterWrapper = document.getElementById("shoes-gender-filters");

  // Modal DOM references
  const modal = document.getElementById("product-modal");
  const modalClose = document.getElementById("modal-close");
  const modalImgContainer = modal ? modal.querySelector(".modal-img-container") : null;
  const mImg = document.getElementById("modal-perfume-img");
  const mGlow = document.getElementById("modal-glow-bg");
  const mCollection = document.getElementById("modal-perfume-collection");
  const mName = document.getElementById("modal-perfume-name");
  const mPrice = document.getElementById("modal-perfume-price");
  const mDesc = document.getElementById("modal-perfume-desc");
  const mSpecLeftTitle = document.getElementById("modal-spec-left-title");
  const mSpecRightTitle = document.getElementById("modal-spec-right-title");
  const mSpecLeftVal = document.getElementById("modal-perfume-top");
  const mSpecRightVal = document.getElementById("modal-perfume-base");
  const mMoodWrapper = document.getElementById("modal-mood-wrapper");
  const mMoodVal = document.getElementById("modal-perfume-mood");
  const mWaLink = document.getElementById("modal-whatsapp-link");
  const mSizeWrapper = document.getElementById("modal-size-wrapper");
  const mSizeOptions = document.getElementById("modal-size-options");

  let activeLang = localStorage.getItem("robabikia-lang") || "ar";
  let activeGender = null;
  let activeSubFilter = "all";
  let activeClothesGender = null;
  let activeShoesGender = null;
  let activeProductId = null;
  let selectedSize = null;
  let showcaseCurrent = 1;
  let showcaseTransitioning = false;
  let showcaseTimer = null;
  let showcaseParticles = [];
  let overviewShowcaseCurrent = 1;
  let overviewShowcaseTransitioning = false;
  let overviewShowcaseTimer = null;
  let overviewShowcaseParticles = [];

  // Custom builder states
  let builderTop = "فل بلدي (Jasmine)";
  let builderHeart = "ورد جوري (Damask Rose)";
  let builderBase = "عود ملكي (Royal Oud)";
  let builderVolume = "50ml";

  // --- HTML Rendering templates ---
  const getPerfumeSceneVariant = (imagePath = "", productId = "") => {
    const source = `${imagePath} ${productId}`.toLowerCase();
    if (source.includes("jasmine") || source.includes("etoilee") || source.includes("فل")) return "jasmine";
    if (source.includes("nostalgia") || source.includes("rouge") || source.includes("نوستالج")) return "nostalgia";
    return "oud";
  };

  const getPerfumeSceneHTML = (product, data, options = {}) => {
    const {
      compact = false,
      showMeta = true,
      sceneClass = ""
    } = options;

    const variant = getPerfumeSceneVariant(product.image, product.id);
    const kickerMap = {
      oud: "Luxury Scent Film",
      jasmine: "Floral Scent Film",
      nostalgia: "Vintage Scent Film"
    };

    return `
      <div class="cinematic-scene scene--${variant} ${compact ? "cinematic-scene--compact" : ""} ${sceneClass}" data-scene="${variant}">
        <div class="cinematic-scene__frame"></div>
        <div class="cinematic-scene__glow"></div>
        <div class="cinematic-scene__mist cinematic-scene__mist--1"></div>
        <div class="cinematic-scene__mist cinematic-scene__mist--2"></div>
        <div class="cinematic-scene__mist cinematic-scene__mist--3"></div>
        <div class="cinematic-scene__base">
          <img src="${product.image}" alt="${data.name}" class="cinematic-scene__image">
        </div>
        <div class="cinematic-scene__smoke">
          <span class="smoke-wisp smoke-wisp--1"></span>
          <span class="smoke-wisp smoke-wisp--2"></span>
          <span class="smoke-wisp smoke-wisp--3"></span>
          <span class="smoke-wisp smoke-wisp--4"></span>
        </div>
        <div class="cinematic-scene__bottle-wrap">
          <div class="cinematic-scene__bottle">
            <img src="${product.image}" alt="${data.name}" class="cinematic-scene__image">
            <span class="cinematic-scene__highlight"></span>
          </div>
        </div>
        <div class="cinematic-scene__vignette"></div>
        ${showMeta ? `
        <div class="cinematic-scene__meta">
          <span class="scene-kicker">${kickerMap[variant]}</span>
          <strong class="scene-title">${data.name}</strong>
          <span class="scene-copy">${data.collection}</span>
        </div>` : ""}
      </div>
    `;
  };
  
  // Template: Scent Card Layout (3 columns)
  const getCardHTML = (product, lang, discoverText, customClass = "") => {
    const data = product[lang];
    const notesSummary = product.category === "perfumes" ? data.specLeftVal : "";
    const visualHTML = product.category === "perfumes"
      ? getPerfumeSceneHTML(product, data, { compact: true, showMeta: false, sceneClass: "product-perfume-scene" })
      : `<img src="${product.image}" alt="${data.name}" class="product-img">`;
    return `
      <div class="product-card ${customClass}" id="card-${product.id}" style="--accent-glow: ${product.accentGlow};">
        <div class="product-img-wrapper">
          ${visualHTML}
        </div>
        <div class="product-info">
          <span class="product-collection">${data.collection}</span>
          <h3 class="product-title">${data.name}</h3>
          <p class="product-short-desc">${data.shortDesc}</p>
          ${notesSummary ? `<span class="product-card-notes">🌸 ${notesSummary}</span>` : ""}
          <div class="product-price">${data.price}</div>
          <button class="product-card-btn" data-id="${product.id}">${discoverText}</button>
        </div>
      </div>
    `;
  };

  // Template: Bilingual Card Layout (Masonry Magazine Grid)
  const getBilingualCardHTML = (product, lang, discoverText, customClass = "") => {
    const ar = product.ar;
    const en = product.en;
    const visualHTML = `<img src="${product.image}" alt="${ar.name}" class="product-img">`;
    return `
      <div class="product-card bilingual-card ${customClass}" id="card-${product.id}" style="--accent-glow: ${product.accentGlow || 'rgba(201, 168, 76, 0.15)'};">
        <div class="product-img-wrapper">
          ${visualHTML}
        </div>
        <div class="bilingual-info-split">
          <div class="info-split-en">
            <h3 class="bilingual-title-en">${en.name}</h3>
            <p class="bilingual-collection-en">${en.collection}</p>
            <p class="bilingual-desc-en">${en.shortDesc}</p>
            <div class="bilingual-price-en">${en.price}</div>
          </div>
          <div class="info-split-ar">
            <h3 class="bilingual-title-ar">${ar.name}</h3>
            <p class="bilingual-collection-ar">${ar.collection}</p>
            <p class="bilingual-desc-ar">${ar.shortDesc}</p>
            <div class="bilingual-price-ar">${ar.price}</div>
          </div>
        </div>
        <button class="product-card-btn bilingual-card-btn" data-id="${product.id}">${discoverText}</button>
      </div>
    `;
  };

  // Template: Zara-style Editorial layout (Alternating Rows)
  const getEditorialHTML = (product, lang, index, discoverText) => {
    const data = product[lang];
    const isReverse = index % 2 !== 0 ? "row-reverse" : "";
    return `
      <div class="editorial-row ${isReverse}" style="--accent-glow: ${product.accentGlow};">
        <div class="editorial-img-wrapper">
          <img src="${product.image}" alt="${data.name}" class="editorial-img">
        </div>
        <div class="editorial-content glass-panel">
          <span class="editorial-collection">${data.collection}</span>
          <h3 class="editorial-title">${data.name}</h3>
          <p class="editorial-desc">${data.desc}</p>
          <div class="editorial-price">${data.price}</div>
          <button class="btn btn-outline product-card-btn" data-id="${product.id}">${discoverText}</button>
        </div>
      </div>
    `;
  };

  // Template: Lookbook Layout (2 columns)
  const getLookbookHTML = (product, lang, discoverText) => {
    const data = product[lang];
    return `
      <div class="lookbook-card" style="--accent-glow: ${product.accentGlow};">
        <div class="lookbook-img-wrapper">
          <img src="${product.image}" alt="${data.name}" class="lookbook-img">
        </div>
        <div class="lookbook-info">
          <h3 class="lookbook-title">${data.name}</h3>
          <div class="lookbook-price">${data.price}</div>
          <button class="lookbook-btn product-card-btn" data-id="${product.id}">${discoverText}</button>
        </div>
      </div>
    `;
  };

  // Template: Interactive Custom Scent Builder Form HTML
  const getBuilderHTML = (lang) => {
    const dict = translations[lang];

    // Multi-language note selections
    const arTopNotes = ["فل بلدي", "ياسمين جبلي", "ليمون إيطالي دافئ", "نعناع بري منعش"];
    const enTopNotes = ["Local Jasmine", "Mountain Jasmine", "Warm Italian Lemon", "Fresh Wild Mint"];
    const topNotes = lang === "ar" ? arTopNotes : enTopNotes;

    const arHeartNotes = ["ورد جوري فاخر", "لافندر فرنسي هادئ", "قرفة الحسين الدافئة", "زنبق الوادي"];
    const enHeartNotes = ["Luxury Damask Rose", "Calming French Lavender", "Warm Al-Hussein Cinnamon", "Lily of the Valley"];
    const heartNotes = lang === "ar" ? arHeartNotes : enHeartNotes;

    const arBaseNotes = ["عود ملكي معتق", "مسك أبيض ناعم", "عنبر خام دافئ", "فانيليا معتقة غنية"];
    const enBaseNotes = ["Royal Aged Oud", "Soft White Musk", "Warm Raw Amber", "Rich Aged Vanilla"];
    const baseNotes = lang === "ar" ? arBaseNotes : enBaseNotes;

    // Reset default selected builder values to localized text if changed
    if (!topNotes.includes(builderTop)) builderTop = topNotes[0];
    if (!heartNotes.includes(builderHeart)) builderHeart = heartNotes[0];
    if (!baseNotes.includes(builderBase)) builderBase = baseNotes[0];

    return `
      <div class="scent-builder-container glass-panel animate-fade-up">
        <h3 class="builder-header-title">${dict["builder-title"]}</h3>
        <p class="builder-header-desc">${dict["builder-desc"]}</p>
        
        <div class="builder-form-grid">
          <!-- Top Notes Selector -->
          <div class="builder-select-group">
            <label>${dict["builder-top-note"]}</label>
            <select id="builder-select-top" class="builder-select">
              ${topNotes.map(note => `<option value="${note}" ${note === builderTop ? "selected" : ""}>${note}</option>`).join("")}
            </select>
          </div>

          <!-- Heart Notes Selector -->
          <div class="builder-select-group">
            <label>${dict["builder-heart-note"]}</label>
            <select id="builder-select-heart" class="builder-select">
              ${heartNotes.map(note => `<option value="${note}" ${note === builderHeart ? "selected" : ""}>${note}</option>`).join("")}
            </select>
          </div>

          <!-- Base Notes Selector -->
          <div class="builder-select-group">
            <label>${dict["builder-base-note"]}</label>
            <select id="builder-select-base" class="builder-select">
              ${baseNotes.map(note => `<option value="${note}" ${note === builderBase ? "selected" : ""}>${note}</option>`).join("")}
            </select>
          </div>

          <!-- Size Selector -->
          <div class="builder-select-group">
            <label>${dict["builder-size"]}</label>
            <div class="builder-sizes">
              <button class="builder-size-btn ${builderVolume === "50ml" ? "active" : ""}" data-volume="50ml">50ml</button>
              <button class="builder-size-btn ${builderVolume === "100ml" ? "active" : ""}" data-volume="100ml">100ml</button>
            </div>
          </div>
        </div>

        <a href="#" id="builder-submit-btn" target="_blank" class="btn btn-gold builder-submit-btn hover-vibrate">
          <span>${dict["builder-order-btn"]}</span>
        </a>
      </div>
    `;
  };

  // Compile Scent Builder Order details to WhatsApp
  const updateBuilderWhatsApp = () => {
    const submitBtn = document.getElementById("builder-submit-btn");
    if (!submitBtn) return;

    const phone = "201000000000";
    const template = translations[activeLang]["wa-msg-custom"];
    const message = template
      .replace("{top}", builderTop)
      .replace("{heart}", builderHeart)
      .replace("{base}", builderBase)
      .replace("{size}", builderVolume);

    submitBtn.href = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
  };

  const getShowcaseSlotProps = (index, current, total) => {
    const diff = ((index - current) % total + total) % total;
    const pos = diff > total / 2 ? diff - total : diff;

    if (pos === 0) {
      return { x: "50%", translateX: "-50%", scale: 1, zIndex: 10, size: 260, slot: "active" };
    } else if (pos === 1 || pos === -1) {
      const side = pos === 1 ? 1 : -1;
      return {
        x: `calc(50% + ${side * 160}px)`,
        translateX: "-50%",
        scale: 0.7,
        zIndex: 5,
        size: 200,
        slot: "side"
      };
    }

    return {
      x: `calc(50% + ${pos > 0 ? 320 : -320}px)`,
      translateX: "-50%",
      scale: 0.4,
      zIndex: 1,
      size: 160,
      slot: "far"
    };
  };

  const initShowcaseParticles = (canvasNode, particleStore) => {
    if (!canvasNode || canvasNode.dataset.bound === "true") return;
    const ctx = canvasNode.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      canvasNode.width = canvasNode.clientWidth;
      canvasNode.height = canvasNode.clientHeight;
    };

    class Particle {
      constructor() { this.reset(); }
      reset() {
        this.x = Math.random() * canvasNode.width;
        this.y = canvasNode.height + 20;
        this.size = Math.random() * 2 + 0.5;
        this.speedY = Math.random() * 0.6 + 0.2;
        this.speedX = (Math.random() - 0.5) * 0.4;
        this.opacity = Math.random() * 0.5 + 0.1;
        this.life = 0;
        this.maxLife = Math.random() * 200 + 100;
        this.gold = Math.random() > 0.5;
      }
      update() {
        this.x += this.speedX;
        this.y -= this.speedY;
        this.life++;
        if (this.life > this.maxLife) this.reset();
      }
      draw() {
        const progress = this.life / this.maxLife;
        const alpha = this.opacity * Math.sin(progress * Math.PI);
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fillStyle = this.gold
          ? `rgba(201,169,110,${alpha})`
          : `rgba(255,240,200,${alpha * 0.6})`;
        ctx.fill();
      }
    }

    const refill = () => {
      particleStore.length = 0;
      for (let i = 0; i < 80; i++) {
        const particle = new Particle();
        particle.life = Math.floor(Math.random() * particle.maxLife);
        particleStore.push(particle);
      }
    };

    const animate = () => {
      ctx.clearRect(0, 0, canvasNode.width, canvasNode.height);
      particleStore.forEach((particle) => {
        particle.update();
        particle.draw();
      });
      requestAnimationFrame(animate);
    };

    resize();
    refill();
    animate();
    window.addEventListener("resize", () => {
      resize();
      refill();
    });
    canvasNode.dataset.bound = "true";
  };

  const renderPerfumeShowcase = (perfumes, lang, refs, state) => {
    if (!refs.root || !refs.bottlesContainer || perfumes.length === 0) return;

    const showcaseItems = perfumes.slice(0, 3);
    if (state.current >= showcaseItems.length) state.current = 0;

    const updateInfo = () => {
      refs.productInfo?.classList.remove("visible");
      setTimeout(() => {
        const product = showcaseItems[state.current];
        const data = product[lang];
        if (refs.productName) refs.productName.textContent = data.name;
        if (refs.productSubtitle) refs.productSubtitle.textContent = data.collection;
        if (refs.productNotes) refs.productNotes.textContent = data.specLeftVal;
        refs.productInfo?.classList.add("visible");
      }, 300);
    };

    const goTo = (index) => {
      if (state.transitioning || index === state.current) return;
      state.transitioning = true;
      state.current = index;
      updateSlots();
      setTimeout(() => { state.transitioning = false; }, 900);
    };

    const buildDots = () => {
      if (!refs.navDots) return;
      refs.navDots.innerHTML = "";
      showcaseItems.forEach((_, index) => {
        const dot = document.createElement("div");
        dot.className = `dot${index === state.current ? " active" : ""}`;
        dot.addEventListener("click", () => goTo(index));
        refs.navDots.appendChild(dot);
      });
    };

    const buildSlots = () => {
      refs.bottlesContainer.innerHTML = "";
      showcaseItems.forEach((product, index) => {
        const props = getShowcaseSlotProps(index, state.current, showcaseItems.length);
        const slot = document.createElement("div");
        slot.className = `bottle-slot ${props.slot}`;
        slot.id = `${refs.prefix}-slot-${index}`;
        slot.style.left = props.x;
        slot.style.transform = `translateX(${props.translateX}) scale(${props.scale})`;
        slot.style.zIndex = props.zIndex;

        const glow = document.createElement("div");
        glow.className = "glow-ring";

        const img = document.createElement("img");
        img.src = product.image;
        img.alt = product[lang].name;
        img.style.width = `${props.size}px`;
        img.style.height = "400px";

        slot.appendChild(glow);
        slot.appendChild(img);
        slot.addEventListener("click", () => {
          if (!state.transitioning) goTo(index);
        });
        refs.bottlesContainer.appendChild(slot);
      });
      buildDots();
      updateInfo();
    };

    const updateSlots = () => {
      showcaseItems.forEach((product, index) => {
        const slot = document.getElementById(`${refs.prefix}-slot-${index}`);
        if (!slot) return;
        const props = getShowcaseSlotProps(index, state.current, showcaseItems.length);
        slot.style.left = props.x;
        slot.style.transform = `translateX(${props.translateX}) scale(${props.scale})`;
        slot.style.zIndex = props.zIndex;
        slot.className = `bottle-slot ${props.slot}`;
        const img = slot.querySelector("img");
        if (img) img.style.width = `${props.size}px`;
      });
      buildDots();
      updateInfo();
    };

    buildSlots();
    refs.prevBtn && (refs.prevBtn.onclick = () => {
      if (state.timer) clearInterval(state.timer);
      goTo((state.current - 1 + showcaseItems.length) % showcaseItems.length);
    });
    refs.nextBtn && (refs.nextBtn.onclick = () => {
      if (state.timer) clearInterval(state.timer);
      goTo((state.current + 1) % showcaseItems.length);
    });
    refs.discoverBtn && (refs.discoverBtn.onclick = () => {
      const currentProduct = showcaseItems[state.current];
      if (!currentProduct) return;
      // Open the dedicated 3D experience for this scent if recognised,
      // otherwise fall back to the in-page product modal.
      const match = /product_(\w+)\.png/.exec(currentProduct.image || "");
      const slug = match && ["oud", "jasmine", "nostalgia"].includes(match[1])
        ? match[1]
        : null;
      if (slug) {
        window.location.href = `3d-product.html?p=${slug}`;
      } else {
        openProductModal(currentProduct.id);
      }
    });

    if (state.timer) clearInterval(state.timer);
    state.timer = setInterval(() => {
      if (!state.transitioning) {
        goTo((state.current + 1) % showcaseItems.length);
      }
    }, 4000);

    initShowcaseParticles(refs.canvas, state.particles);
    setTimeout(() => refs.productInfo?.classList.add("visible"), 800);
  };

  // Render Layouts based on active language and filters
  const renderCatalog = (lang) => {
    const discoverText = translations[lang]["scents-discover-btn"];

    // 1. Separate items by category
    const perfumes = products.filter(p => p.category === "perfumes");
    const clothes = products.filter(p => p.category === "clothes");
    const shoes = products.filter(p => p.category === "shoes");

    // 2. Render Full Page Layouts
    if (gridPerfumes) {
      if (activeGender === null) {
        if (subFilterWrapper) subFilterWrapper.classList.add("hidden");
        gridPerfumes.classList.remove("builder-layout-active");
        gridPerfumes.innerHTML = perfumes.map(p => getCardHTML(p, lang, discoverText)).join("");
      } else {
        if (subFilterWrapper) subFilterWrapper.classList.remove("hidden");
        
        if (activeSubFilter === "custom") {
          // Toggle grid columns stylesheet for builder page layout
          gridPerfumes.classList.add("builder-layout-active");
          gridPerfumes.innerHTML = getBuilderHTML(lang);
          
          // Bind dynamic builder controls listeners
          bindBuilderListeners();
          updateBuilderWhatsApp();
        } else {
          gridPerfumes.classList.remove("builder-layout-active");
          const genderPerfumes = perfumes.filter(p => p.gender === activeGender || p.gender === "unisex");
          const filteredPerfumes = activeSubFilter === "all" 
            ? genderPerfumes 
            : genderPerfumes.filter(p => p.subCategory === activeSubFilter);
          gridPerfumes.innerHTML = filteredPerfumes.map(p => getCardHTML(p, lang, discoverText)).join("");
        }
      }
    }
    
    if (containerClothes) {
      const filteredClothes = activeClothesGender === null
        ? clothes
        : clothes.filter(c => c.gender === activeClothesGender || c.gender === "unisex");
      
      if (filteredClothes.length === 0) {
        containerClothes.innerHTML = "";
      } else {
        containerClothes.innerHTML = `
          <div class="clothes-asymmetric-grid">
            ${filteredClothes.map((c, idx) => {
              let modifier = "";
              // Alternating layout sizes: 1st tall, 3rd wide, others standard
              if (idx % 4 === 0) {
                modifier = "grid-card-tall";
              } else if (idx % 4 === 2) {
                modifier = "grid-card-wide";
              }
              return getBilingualCardHTML(c, lang, discoverText, modifier);
            }).join("")}
          </div>
        `;
      }
    }
    
    if (gridShoes) {
      const filteredShoes = activeShoesGender === null
        ? shoes
        : shoes.filter(s => s.gender === activeShoesGender || s.gender === "unisex");
      gridShoes.innerHTML = filteredShoes.map(s => getLookbookHTML(s, lang, discoverText)).join("");
    }

    // 3. Render Home Overview Previews (Home View)
    if (homePerfumesGrid && !overviewPerfumeShowcase) {
      homePerfumesGrid.innerHTML = perfumes.slice(0, 3).map(p => getCardHTML(p, lang, discoverText)).join("");
    }
    if (homeClothesGrid) {
      homeClothesGrid.innerHTML = clothes.slice(0, 1).map((c, idx) => getEditorialHTML(c, lang, idx, discoverText)).join("");
    }
    if (homeShoesGrid) {
      homeShoesGrid.innerHTML = shoes.slice(0, 2).map(s => getLookbookHTML(s, lang, discoverText)).join("");
    }

    renderPerfumeShowcase(perfumes, lang, {
      root: perfumeShowcase,
      bottlesContainer: perfumeBottlesContainer,
      productInfo: perfumeProductInfo,
      productName: perfumeProductName,
      productSubtitle: perfumeProductSubtitle,
      productNotes: perfumeProductNotes,
      navDots: perfumeNavDots,
      prevBtn: perfumePrevBtn,
      nextBtn: perfumeNextBtn,
      discoverBtn: perfumeDiscoverBtn,
      canvas: perfumeParticlesCanvas,
      prefix: "perfume-main"
    }, {
      get current() { return showcaseCurrent; },
      set current(value) { showcaseCurrent = value; },
      get transitioning() { return showcaseTransitioning; },
      set transitioning(value) { showcaseTransitioning = value; },
      get timer() { return showcaseTimer; },
      set timer(value) { showcaseTimer = value; },
      particles: showcaseParticles
    });

    renderPerfumeShowcase(perfumes, lang, {
      root: overviewPerfumeShowcase,
      bottlesContainer: overviewPerfumeBottlesContainer,
      productInfo: overviewPerfumeProductInfo,
      productName: overviewPerfumeProductName,
      productSubtitle: overviewPerfumeProductSubtitle,
      productNotes: overviewPerfumeProductNotes,
      navDots: overviewPerfumeNavDots,
      prevBtn: overviewPerfumePrevBtn,
      nextBtn: overviewPerfumeNextBtn,
      discoverBtn: overviewPerfumeDiscoverBtn,
      canvas: overviewPerfumeParticlesCanvas,
      prefix: "perfume-overview"
    }, {
      get current() { return overviewShowcaseCurrent; },
      set current(value) { overviewShowcaseCurrent = value; },
      get transitioning() { return overviewShowcaseTransitioning; },
      set transitioning(value) { overviewShowcaseTransitioning = value; },
      get timer() { return overviewShowcaseTimer; },
      set timer(value) { overviewShowcaseTimer = value; },
      particles: overviewShowcaseParticles
    });

    window.initCinematicScenes?.(document);
  };

  // Bind builder select menus and buttons selectors listeners
  const bindBuilderListeners = () => {
    const sTop = document.getElementById("builder-select-top");
    const sHeart = document.getElementById("builder-select-heart");
    const sBase = document.getElementById("builder-select-base");
    const sizeBtnsWrapper = document.querySelector(".builder-sizes");

    if (sTop) {
      sTop.addEventListener("change", (e) => {
        builderTop = e.target.value;
        updateBuilderWhatsApp();
      });
    }
    if (sHeart) {
      sHeart.addEventListener("change", (e) => {
        builderHeart = e.target.value;
        updateBuilderWhatsApp();
      });
    }
    if (sBase) {
      sBase.addEventListener("change", (e) => {
        builderBase = e.target.value;
        updateBuilderWhatsApp();
      });
    }
    if (sizeBtnsWrapper) {
      sizeBtnsWrapper.addEventListener("click", (e) => {
        const btn = e.target.closest(".builder-size-btn");
        if (btn) {
          const btns = sizeBtnsWrapper.querySelectorAll(".builder-size-btn");
          btns.forEach(b => b.classList.remove("active"));
          btn.classList.add("active");
          builderVolume = btn.getAttribute("data-volume");
          updateBuilderWhatsApp();
        }
      });
    }
  };

  // --- Modal Logic ---

  const selectSize = (sizeVal, btnNode) => {
    selectedSize = sizeVal;
    const buttons = mSizeOptions.querySelectorAll(".size-btn");
    buttons.forEach(btn => btn.classList.remove("active"));
    btnNode.classList.add("active");
    updateWhatsAppLink();
  };

  const updateWhatsAppLink = () => {
    if (!activeProductId) return;
    const product = products.find(p => p.id === activeProductId);
    if (!product) return;
    const data = product[activeLang];
    const phone = "201000000000";

    let messageText = "";
    if (product.category === "perfumes") {
      const msgTemplate = translations[activeLang]["wa-msg-prefix"];
      messageText = msgTemplate
        .replace("{name}", data.name)
        .replace("{collection}", data.collection)
        .replace("{price}", data.price);
    } else {
      const msgTemplate = translations[activeLang]["wa-msg-apparel"];
      const sizeStr = selectedSize || (activeLang === "ar" ? "لم يتم التحديد" : "Not Selected");
      messageText = msgTemplate
        .replace("{name}", data.name)
        .replace("{collection}", data.collection)
        .replace("{size}", sizeStr)
        .replace("{price}", data.price);
    }

    mWaLink.href = `https://wa.me/${phone}?text=${encodeURIComponent(messageText)}`;
  };

  const populateModal = (id, lang) => {
    const product = products.find(p => p.id === id);
    if (!product) return;
    const data = product[lang];

    mCollection.textContent = data.collection;
    mName.textContent = data.name;
    mPrice.textContent = data.price;
    mDesc.textContent = data.desc;
    mSpecLeftVal.textContent = data.specLeftVal;
    mSpecRightVal.textContent = data.specRightVal;
    modal.querySelector(".product-modal").style.borderColor = product.accentColor;

    if (product.category === "perfumes") {
      if (modalImgContainer) {
        modalImgContainer.innerHTML = `
          ${getPerfumeSceneHTML(product, data, { compact: false, showMeta: false, sceneClass: "modal-perfume-scene" })}
          <div class="modal-glow-bg" id="modal-glow-bg"></div>
        `;
      }
      mSpecLeftTitle.textContent = translations[lang]["modal-top-notes-title"];
      mSpecRightTitle.textContent = translations[lang]["modal-base-notes-title"];
      mMoodWrapper.style.display = "block";
      mMoodVal.textContent = data.mood;
      mSizeWrapper.style.display = "none";
      selectedSize = null;
    } else {
      if (modalImgContainer) {
        modalImgContainer.innerHTML = `
          <img src="${product.image}" id="modal-perfume-img" alt="${data.name}">
          <div class="modal-glow-bg" id="modal-glow-bg"></div>
        `;
      }
      mSpecLeftTitle.textContent = translations[lang]["modal-spec-left"];
      mSpecRightTitle.textContent = translations[lang]["modal-spec-right"];
      mMoodWrapper.style.display = "none";
      mSizeWrapper.style.display = "block";
      
      selectedSize = product.sizes[0];
      mSizeOptions.innerHTML = product.sizes.map(size => {
        const activeClass = size === selectedSize ? "active" : "";
        return `<button class="size-btn ${activeClass}" data-size="${size}">${size}</button>`;
      }).join("");
    }

    const currentGlow = modal ? modal.querySelector("#modal-glow-bg") : null;
    currentGlow?.style.setProperty("--accent-glow", product.accentGlow);
    window.initCinematicScenes?.(modalImgContainer || modal);

    updateWhatsAppLink();
  };

  const openProductModal = (id) => {
    activeProductId = id;
    window.activeProductId = id; // Exposed for orders.js
    window.activeModalProduct = products.find(product => product.id === id) || null;
    populateModal(id, activeLang);
    window.reviews?.load(id);
    modal.classList.add("active");
    document.body.style.overflow = "hidden";
  };

  const closeProductModal = () => {
    modal.classList.remove("active");
    activeProductId = null;
    selectedSize = null;
    window.activeModalProduct = null;
    if (!document.body.classList.contains("intro-active")) {
      document.body.style.overflow = "";
    }
  };

  // Bind Fragrances page Sub-filters Switcher delegates
  if (subFilterWrapper) {
    subFilterWrapper.addEventListener("click", (e) => {
      const btn = e.target.closest(".sub-btn");
      if (btn) {
        const buttons = subFilterWrapper.querySelectorAll(".sub-btn");
        buttons.forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        
        activeSubFilter = btn.getAttribute("data-sub");
        renderCatalog(activeLang);
      }
    });
  }

  // Bind Fragrances page Gender-filters Switcher delegates
  if (genderFilterWrapper) {
    genderFilterWrapper.addEventListener("click", (e) => {
      const btn = e.target.closest(".gender-btn");
      if (btn) {
        const targetGender = btn.getAttribute("data-gender");
        const buttons = genderFilterWrapper.querySelectorAll(".gender-btn");
        
        if (activeGender === targetGender) {
          // Toggle off
          btn.classList.remove("active");
          activeGender = null;
          
          // Reset sub-filter to "all" when turning off gender filter
          activeSubFilter = "all";
          if (subFilterWrapper) {
            const subBtns = subFilterWrapper.querySelectorAll(".sub-btn");
            subBtns.forEach(sb => {
              if (sb.getAttribute("data-sub") === "all") {
                sb.classList.add("active");
              } else {
                sb.classList.remove("active");
              }
            });
          }
        } else {
          // Select new gender
          buttons.forEach(b => b.classList.remove("active"));
          btn.classList.add("active");
          activeGender = targetGender;
        }
        
        renderCatalog(activeLang);
      }
    });
  }

  // Bind Apparel page Gender-filters Switcher delegates
  if (clothesGenderFilterWrapper) {
    clothesGenderFilterWrapper.addEventListener("click", (e) => {
      const btn = e.target.closest(".gender-btn");
      if (btn) {
        const targetGender = btn.getAttribute("data-gender");
        const buttons = clothesGenderFilterWrapper.querySelectorAll(".gender-btn");
        
        if (activeClothesGender === targetGender) {
          // Toggle off
          btn.classList.remove("active");
          activeClothesGender = null;
        } else {
          // Select new gender
          buttons.forEach(b => b.classList.remove("active"));
          btn.classList.add("active");
          activeClothesGender = targetGender;
        }
        
        renderCatalog(activeLang);
      }
    });
  }

  // Bind Footwear page Gender-filters Switcher delegates
  if (shoesGenderFilterWrapper) {
    shoesGenderFilterWrapper.addEventListener("click", (e) => {
      const btn = e.target.closest(".gender-btn");
      if (btn) {
        const targetGender = btn.getAttribute("data-gender");
        const buttons = shoesGenderFilterWrapper.querySelectorAll(".gender-btn");
        
        if (activeShoesGender === targetGender) {
          // Toggle off
          btn.classList.remove("active");
          activeShoesGender = null;
        } else {
          // Select new gender
          buttons.forEach(b => b.classList.remove("active"));
          btn.classList.add("active");
          activeShoesGender = targetGender;
        }
        
        renderCatalog(activeLang);
      }
    });
  }

  // Page dynamic click event delegation for discover action buttons
  document.body.addEventListener("click", (e) => {
    if (e.target && e.target.classList.contains("product-card-btn")) {
      const id = e.target.getAttribute("data-id");
      openProductModal(id);
    }
  });

  if (mSizeOptions) {
    mSizeOptions.addEventListener("click", (e) => {
      if (e.target && e.target.classList.contains("size-btn")) {
        const sizeVal = e.target.getAttribute("data-size");
        selectSize(sizeVal, e.target);
      }
    });
  }

  if (modalClose) {
    modalClose.addEventListener("click", closeProductModal);
  }

  if (modal) {
    modal.addEventListener("click", (e) => {
      if (e.target === modal) {
        closeProductModal();
      }
    });
  }

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && modal.classList.contains("active")) {
      closeProductModal();
    }
  });

  // Listen to Language Switch events from lang.js
  document.addEventListener("languageChanged", (e) => {
    activeLang = e.detail.lang;

    // Sync active sub-filters label translation
    if (subFilterWrapper) {
      const buttons = subFilterWrapper.querySelectorAll(".sub-btn");
      buttons.forEach(btn => {
        const key = btn.getAttribute("data-i18n");
        if (key && translations[activeLang][key]) {
          btn.textContent = translations[activeLang][key];
        }
      });
    }

    // Sync active gender filters label translation
    if (genderFilterWrapper) {
      const buttons = genderFilterWrapper.querySelectorAll(".gender-btn");
      buttons.forEach(btn => {
        const key = btn.getAttribute("data-i18n");
        if (key && translations[activeLang][key]) {
          btn.textContent = translations[activeLang][key];
        }
      });
    }

    if (clothesGenderFilterWrapper) {
      const buttons = clothesGenderFilterWrapper.querySelectorAll(".gender-btn");
      buttons.forEach(btn => {
        const key = btn.getAttribute("data-i18n");
        if (key && translations[activeLang][key]) {
          btn.textContent = translations[activeLang][key];
        }
      });
    }

    if (shoesGenderFilterWrapper) {
      const buttons = shoesGenderFilterWrapper.querySelectorAll(".gender-btn");
      buttons.forEach(btn => {
        const key = btn.getAttribute("data-i18n");
        if (key && translations[activeLang][key]) {
          btn.textContent = translations[activeLang][key];
        }
      });
    }

    // Update modal elements when language changes
    if (mSizeWrapper) {
      const sizeTitle = mSizeWrapper.querySelector(".modal-size-title");
      if (sizeTitle) {
        const key = sizeTitle.getAttribute("data-i18n");
        if (key && translations[activeLang][key]) {
          sizeTitle.textContent = translations[activeLang][key];
        }
      }
    }

    const dbOrderBtn = document.getElementById("modal-db-order-btn");
    if (dbOrderBtn) {
      const key = dbOrderBtn.getAttribute("data-i18n");
      if (key && translations[activeLang][key]) {
        dbOrderBtn.textContent = translations[activeLang][key];
      }
    }

    const waOrderBtn = document.getElementById("modal-whatsapp-link");
    if (waOrderBtn) {
      const span = waOrderBtn.querySelector("span");
      if (span) {
        const key = span.getAttribute("data-i18n");
        if (key && translations[activeLang][key]) {
          span.textContent = translations[activeLang][key];
        }
      }
    }

    renderCatalog(activeLang);

    if (activeProductId && modal.classList.contains("active")) {
      populateModal(activeProductId, activeLang);
    }
  });

  // Admin form submission
  const adminForm = document.getElementById("admin-form");
  const adminModal = document.getElementById("admin-modal");
  
  if (adminForm) {
    adminForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      
      const submitBtn = document.getElementById("admin-submit-btn");
      submitBtn.disabled = true;
      submitBtn.textContent = "جاري الحفظ... (Saving...)";
      
      const sizesInput = document.getElementById("admin-prod-sizes").value;
      const sizesArray = sizesInput.split(",").map(s => s.trim()).filter(s => s);

      const newProduct = {
        id: document.getElementById("admin-prod-id").value,
        category: document.getElementById("admin-prod-category").value,
        sub_category: document.getElementById("admin-prod-subcategory").value || null,
        gender: document.getElementById("admin-prod-gender").value,
        sizes: sizesArray,
        image: document.getElementById("admin-prod-image").value,
        accent_glow: document.getElementById("admin-prod-glow").value || null,
        accent_color: document.getElementById("admin-prod-color").value || null,
        
        ar_name: document.getElementById("admin-prod-name-ar").value,
        ar_collection: document.getElementById("admin-prod-collection-ar").value || null,
        ar_short_desc: document.getElementById("admin-prod-short-ar").value || null,
        ar_desc: document.getElementById("admin-prod-desc-ar").value || null,
        ar_spec_left: document.getElementById("admin-prod-spec-l-ar").value || null,
        ar_spec_right: document.getElementById("admin-prod-spec-r-ar").value || null,
        ar_price: document.getElementById("admin-prod-price-ar").value,
        ar_mood: document.getElementById("admin-prod-mood-ar").value || null,
        
        en_name: document.getElementById("admin-prod-name-en").value,
        en_collection: document.getElementById("admin-prod-collection-en").value || null,
        en_short_desc: document.getElementById("admin-prod-short-en").value || null,
        en_desc: document.getElementById("admin-prod-desc-en").value || null,
        en_spec_left: document.getElementById("admin-prod-spec-l-en").value || null,
        en_spec_right: document.getElementById("admin-prod-spec-r-en").value || null,
        en_price: document.getElementById("admin-prod-price-en").value,
        en_mood: document.getElementById("admin-prod-mood-en").value || null
      };

      try {
        await window.apiClient.createProduct(newProduct);
        
        alert("تم حفظ وإضافة المنتج بنجاح!");
        adminForm.reset();
        if (adminModal) {
          adminModal.classList.remove("active");
          document.body.style.overflow = "";
        }
        
        // Reload products dynamically
        await loadProducts();
        
      } catch (err) {
        alert("حدث خطأ أثناء حفظ المنتج: " + (err.message || err));
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = "حفظ وإضافة المنتج (Save Product)";
      }
    });
  }

  // Initial render
  loadProducts();
});
