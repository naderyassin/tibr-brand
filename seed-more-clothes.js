const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const newClothes = [
  {
    id: "silk-heritage-scarf-women",
    category: "clothes",
    sub_category: "classic",
    gender: "women",
    sizes: ["One Size"],
    image: "assets/images/story_bg.png",
    accent_glow: "rgba(201, 168, 76, 0.15)",
    accent_color: "#c9a84c",
    ar_name: "وشاح الحرير التراثي",
    ar_collection: "مجموعة الحرير",
    ar_short_desc: "وشاح حرير بنقوش دافئة",
    ar_desc: "وشاح ناعم بنقوشات دافئة مستوحاة من العصور القديمة وفنون القاهرة العتيقة.",
    ar_spec_left: "حرير طبيعي 100%",
    ar_spec_right: "نقوش يدوية عتيقة",
    ar_price: "٤٥٠ ج.م",
    ar_mood: "تراثي فاخر",
    en_name: "Silk Heritage Scarf",
    en_collection: "Silk Collection",
    en_short_desc: "Pure silk with vintage motifs",
    en_desc: "A soft pure silk scarf featuring warm patterns inspired by ancient Cairo arts.",
    en_spec_left: "100% Natural Silk",
    en_spec_right: "Vintage Hand Print",
    en_price: "450 EGP",
    en_mood: "Vintage Luxury"
  },
  {
    id: "linen-jacket-men",
    category: "clothes",
    sub_category: "classic",
    gender: "men",
    sizes: ["M", "L", "XL", "XXL"],
    image: "assets/images/hero_bg.png",
    accent_glow: "rgba(139, 115, 85, 0.15)",
    accent_color: "#8b7355",
    ar_name: "جاكيت الكتان العصري",
    ar_collection: "مجموعة الكتان",
    ar_short_desc: "أناقة رسمية مريحة",
    ar_desc: "جاكيت من الكتان الفاخر يجمع بين الراحة والأناقة الرسمية في الصيف.",
    ar_spec_left: "كتان مصري فاخر",
    ar_spec_right: "قصة رسمية كلاسيكية",
    ar_price: "١٣٥٠ ج.م",
    ar_mood: "أناقة هيبة",
    en_name: "Modern Linen Jacket",
    en_collection: "Linen Collection",
    en_short_desc: "Comfortable formal elegance",
    en_desc: "A jacket crafted from premium linen that combines ease and summer formality.",
    en_spec_left: "Premium Egyptian Linen",
    en_spec_right: "Classic Formal Cut",
    en_price: "1350 EGP",
    en_mood: "Formal Elegance"
  },
  {
    id: "classic-trousers-men",
    category: "clothes",
    sub_category: "classic",
    gender: "men",
    sizes: ["30", "32", "34", "36", "38"],
    image: "assets/images/story_bg.png",
    accent_glow: "rgba(80, 80, 80, 0.15)",
    accent_color: "#505050",
    ar_name: "بنطال كلاسيكي مريح",
    ar_collection: "مجموعة كلاسيك",
    ar_short_desc: "بنطال صيفي خفيف",
    ar_desc: "بنطال كلاسيكي مصنوع من خامات طبيعية خفيفة ومريحة للحركة اليومية.",
    ar_spec_left: "مزيج قطن وكتان",
    ar_spec_right: "جيوب جانبية كلاسيكية",
    ar_price: "٨٠٠ ج.م",
    ar_mood: "عملي مريح",
    en_name: "Classic Comfort Trousers",
    en_collection: "Classic Line",
    en_short_desc: "Lightweight summer pants",
    en_desc: "Classic trousers made from lightweight natural blends for comfortable daily wear.",
    en_spec_left: "Cotton-Linen Blend",
    en_spec_right: "Classic Side Pockets",
    en_price: "800 EGP",
    en_mood: "Comfortable Casual"
  },
  {
    id: "nile-cotton-robe-women",
    category: "clothes",
    sub_category: "contemporary",
    gender: "women",
    sizes: ["S", "M", "L", "XL"],
    image: "assets/images/hero_bg.png",
    accent_glow: "rgba(123, 45, 62, 0.15)",
    accent_color: "#7b2d3e",
    ar_name: "روب القطن النيلي",
    ar_collection: "مجموعة النخبة",
    ar_short_desc: "روب منسوج يدوياً",
    ar_desc: "روب فاخر مصنوع من القطن المصري طويل التيلة المنسوج يدوياً بنقوش نيلية.",
    ar_spec_left: "قطن مصري 100%",
    ar_spec_right: "نسيج يدوي أصيل",
    ar_price: "١٦٠٠ ج.م",
    ar_mood: "فخامة منزلية",
    en_name: "Nile Cotton Robe",
    en_collection: "Elite Collection",
    en_short_desc: "Handwoven luxury robe",
    en_desc: "A luxurious robe made of handwoven long-staple Egyptian cotton with Nile patterns.",
    en_spec_left: "100% Egyptian Cotton",
    en_spec_right: "Authentic Handweave",
    en_price: "1600 EGP",
    en_mood: "Luxury Lounge"
  },
  {
    id: "embroidered-kimono-women",
    category: "clothes",
    sub_category: "contemporary",
    gender: "women",
    sizes: ["One Size"],
    image: "assets/images/story_bg.png",
    accent_glow: "rgba(212, 175, 55, 0.15)",
    accent_color: "#d4af37",
    ar_name: "كيمونو مطرز عتيق",
    ar_collection: "مجموعة التراث",
    ar_short_desc: "تصميم كيمونو واسع مطرز",
    ar_desc: "تصميم كيمونو واسع بتطريزات يدوية مستوحاة من فنون النسيج الإسلامية القديمة.",
    ar_spec_left: "كتان ناعم مطرز",
    ar_spec_right: "خياطة واسعة مريحة",
    ar_price: "١٤٥٠ ج.م",
    ar_mood: "تراثي عصري",
    en_name: "Vintage Embroidered Kimono",
    en_collection: "Heritage Line",
    en_short_desc: "Loose embroidered kimono",
    en_desc: "A loose kimono design featuring hand embroidery inspired by ancient Islamic textile arts.",
    en_spec_left: "Embroidered Soft Linen",
    en_spec_right: "Comfortable Loose Cut",
    en_price: "1450 EGP",
    en_mood: "Heritage Modern"
  },
  {
    id: "wool-coat-men",
    category: "clothes",
    sub_category: "classic",
    gender: "men",
    sizes: ["L", "XL", "XXL"],
    image: "assets/images/hero_bg.png",
    accent_glow: "rgba(75, 54, 33, 0.15)",
    accent_color: "#4b3621",
    ar_name: "معطف الصوف الكلاسيكي",
    ar_collection: "مجموعة الشتاء",
    ar_short_desc: "معطف شتوي طويل وثقيل",
    ar_desc: "معطف طويل من الصوف الفاخر يمنحك الدفء التام والهيبة الكلاسيكية الفريدة.",
    ar_spec_left: "صوف طبيعي ثقيل",
    ar_spec_right: "بطانة حريرية داخلية",
    ar_price: "٢٤٠٠ ج.م",
    ar_mood: "فخامة شتوية",
    en_name: "Classic Wool Coat",
    en_collection: "Winter Elite",
    en_short_desc: "Heavy long winter coat",
    en_desc: "A long coat of premium wool providing absolute warmth and unmatched classic prestige.",
    en_spec_left: "Heavy Natural Wool",
    en_spec_right: "Inner Silk Lining",
    en_price: "2400 EGP",
    en_mood: "Winter Luxury"
  },
  {
    id: "vintage-shawl-unisex",
    category: "clothes",
    sub_category: "classic",
    gender: "unisex",
    sizes: ["One Size"],
    image: "assets/images/story_bg.png",
    accent_glow: "rgba(160, 82, 45, 0.15)",
    accent_color: "#a0522d",
    ar_name: "شال التراث الدافئ",
    ar_collection: "مجموعة التراث",
    ar_short_desc: "شال مغزول يدوياً",
    ar_desc: "شال مغزول يدوياً من خامات الصوف والكتان لدفء كلاسيكي وأناقة أصيلة.",
    ar_spec_left: "مزيج صوف وكتان",
    ar_spec_right: "صناعة يدوية 100%",
    ar_price: "٧٠٠ ج.م",
    ar_mood: "تراثي دافئ",
    en_name: "Warm Vintage Shawl",
    en_collection: "Heritage Line",
    en_short_desc: "Hand-loomed cozy shawl",
    en_desc: "A hand-loomed shawl woven from wool and linen for vintage warmth and authentic style.",
    en_spec_left: "Wool-Linen Blend",
    en_spec_right: "100% Handcrafted",
    en_price: "700 EGP",
    en_mood: "Cozy Heritage"
  },
  {
    id: "linen-blouse-women",
    category: "clothes",
    sub_category: "contemporary",
    gender: "women",
    sizes: ["S", "M", "L"],
    image: "assets/images/hero_bg.png",
    accent_glow: "rgba(237, 224, 200, 0.15)",
    accent_color: "#ede0c8",
    ar_name: "بلوزة الكتان الناعمة",
    ar_collection: "مجموعة الكتان",
    ar_short_desc: "بلوزة صيفية مريحة",
    ar_desc: "بلوزة بأكمام واسعة وقصة مريحة تناسب أجواء الصيف وتمنحك إطلالة ناعمة.",
    ar_spec_left: "كتان خفيف ناعم",
    ar_spec_right: "أكمام واسعة منفوخة",
    ar_price: "٦٨٠ ج.م",
    ar_mood: "أنثوية مريحة",
    en_name: "Soft Linen Blouse",
    en_collection: "Linen Collection",
    en_short_desc: "Comfortable summer blouse",
    en_desc: "A blouse featuring bell sleeves and a relaxed fit, perfect for warm summer days.",
    en_spec_left: "Light Soft Linen",
    en_spec_right: "Flowy Bell Sleeves",
    en_price: "680 EGP",
    en_mood: "Relaxed Feminine"
  }
];

async function seedMoreClothes() {
  try {
    console.log(`Starting to seed ${newClothes.length} additional apparel products...`);

    for (const product of newClothes) {
      const { data, error } = await supabase
        .from("products")
        .insert([product])
        .select();

      if (error) {
        if (error.code === "23505") {
          // Unique key violation (already exists), update it instead
          const { error: updateError } = await supabase
            .from("products")
            .update(product)
            .eq("id", product.id);
          if (updateError) {
            console.error(`Error updating product ${product.id}:`, updateError.message);
          } else {
            console.log(`✓ Updated existing product: ${product.ar_name}`);
          }
        } else {
          console.error(`Error inserting product ${product.id}:`, error.message);
        }
      } else {
        console.log(`✓ Added product: ${product.ar_name}`);
      }
    }

    console.log("\n✅ Additional seeding completed!");
    process.exit(0);
  } catch (error) {
    console.error("Fatal error during additional seeding:", error);
    process.exit(1);
  }
}

seedMoreClothes();
