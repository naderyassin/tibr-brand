import { useState, useEffect, useRef } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/stores/auth";
import { adminGetProducts, adminCreateProduct, adminUpdateProduct } from "@/lib/api";
import { useToast } from "@/components/ui/Toast";

const OLFACTORY_UNIVERSES = {
  aldehyde:       { label: "Aldehyde — ألدهيدي" },
  ambery:         { label: "Ambery — عنبري" },
  aquatic:        { label: "Aquatic — مائي" },
  aromatic:       { label: "Aromatic — عطري" },
  chypre:         { label: "Chypre — شيبر" },
  citrus:         { label: "Citrus — حمضي" },
  floral:         { label: "Floral — زهري" },
  fougere:        { label: "Fougere — فوجيري" },
  fresh:          { label: "Fresh — طازج" },
  fruity:         { label: "Fruity — فاكهي" },
  gourmand:       { label: "Gourmand — حلواني" },
  green:          { label: "Green — أخضر" },
  leathery:       { label: "Leathery — جلدي" },
  marine:         { label: "Marine — بحري" },
  musky:          { label: "Musky — مسكي" },
  new_freshness:  { label: "New Freshness — نضارة جديدة" },
  oriental:       { label: "Oriental — شرقي" },
  powdery:        { label: "Powdery — بودري" },
  smoky:          { label: "Smoky — دخاني" },
  spicy:          { label: "Spicy — توابلي" },
  vanilla:        { label: "Vanilla — فانيليا" },
  woody:          { label: "Woody — خشبي" },
};

const TAXONOMY = {
  perfumes: { children: {
    men:    { label: "Men — رجالي",     children: OLFACTORY_UNIVERSES },
    women:  { label: "Women — نسائي",   children: OLFACTORY_UNIVERSES },
    unisex: { label: "Unisex — للجنسين", children: OLFACTORY_UNIVERSES },
  }},
};

const LEVEL_LABELS = ["Gender", "Olfactory Universe — الكون العطري", "Style"];

const NOTES_CATALOG = {
  citrus: [
    { en: "Bergamot",              ar: "برغموت" },
    { en: "Bigarade",              ar: "بيجاراد / برتقال مر" },
    { en: "Bitter Orange",         ar: "برتقال مر" },
    { en: "Black Lemon",           ar: "لومي أسود" },
    { en: "Blood Orange",          ar: "برتقال دموي" },
    { en: "Buddha's Hand",         ar: "يد بوذا" },
    { en: "Calamansi",             ar: "كالامانسي" },
    { en: "Candied Lemon",         ar: "ليمون مُحلى" },
    { en: "Chen Pi",               ar: "قشر اليوسفي المجفف" },
    { en: "Chinotto",              ar: "كينوتو" },
    { en: "Citron",                ar: "أترج" },
    { en: "Citrus Japonica",       ar: "يوزو / كمكوات" },
    { en: "Citrus Water",          ar: "ماء الحمضيات" },
    { en: "Citruses",              ar: "حمضيات عامة" },
    { en: "Clementine",            ar: "كليمانتين" },
    { en: "Crystalfizz",           ar: "كريستال فيز" },
    { en: "Finger Lime",           ar: "ليمون الأصابع" },
    { en: "Grapefruit",            ar: "جريب فروت" },
    { en: "Grapefruit Leaf",       ar: "ورق الجريب فروت" },
    { en: "Grapefruit Peel",       ar: "قشر الجريب فروت" },
    { en: "Grapefruit Soda",       ar: "صودا الجريب فروت" },
    { en: "Green Tangerine",       ar: "يوسفي أخضر" },
    { en: "Hassaku",               ar: "هاساكو" },
    { en: "Hatkora Lemon",         ar: "ليمون هاتكورا" },
    { en: "Kabosu",                ar: "كابوسو" },
    { en: "Kaffir Lime",           ar: "ليمون كفير" },
    { en: "Kumquat",               ar: "كمكوات" },
    { en: "Lemon",                 ar: "ليمون" },
    { en: "Lemon Balm",            ar: "مليسة / بلسم الليمون" },
    { en: "Lemon Myrtle",          ar: "ميرتل الليمون" },
    { en: "Lemon Tree",            ar: "شجرة الليمون" },
    { en: "Lemon Verbena",         ar: "لويزة الليمون" },
    { en: "Lemon Zest",            ar: "بشر الليمون" },
    { en: "Lemongrass",            ar: "عشب الليمون" },
    { en: "Lime",                  ar: "ليمون حامض" },
    { en: "Limetta",               ar: "ليميتا" },
    { en: "Litsea Cubeba",         ar: "ليتسيا كوبيبا" },
    { en: "Mandarin Orange",       ar: "يوسفي" },
    { en: "Mandora",               ar: "ماندورا" },
    { en: "Methyl Pamplemousse",   ar: "ميثيل بامبل موس" },
    { en: "Murcott",               ar: "موركوت" },
    { en: "Neroli",                ar: "نيرولي" },
    { en: "Orange",                ar: "برتقال" },
    { en: "Palestinian Sweet Lime",ar: "ليمون حلو فلسطيني" },
    { en: "Perfume Lemon",         ar: "ليمون عطري" },
    { en: "Petitgrain",            ar: "بتيت جرين" },
    { en: "Pokan",                 ar: "بوكان" },
    { en: "Pomelo",                ar: "بوملي" },
    { en: "Quenepa",               ar: "كينيبا" },
    { en: "Rangpur",               ar: "ليمون رانجوبور" },
    { en: "Red Mandarin",          ar: "يوسفي أحمر" },
    { en: "Rind Bergamot",         ar: "قشر البرغموت" },
    { en: "Shiikuwasha",           ar: "شييكواشا" },
    { en: "Sudachi Citrus",        ar: "سوداتشي" },
    { en: "Tangelo",               ar: "تانجيلو" },
    { en: "Tangerine",             ar: "يوسفي" },
    { en: "Tangerine Zest",        ar: "بشر اليوسفي" },
    { en: "Yuzu",                  ar: "يوزو" },
  ],
  fruity: [
    { en: "Acai Berry", ar: "توت الآساي" },
    { en: "Acerola", ar: "أسيرولا" },
    { en: "Acorn", ar: "بلوط" },
    { en: "Akebia fruit", ar: "فاكهة الأكيبيا" },
    { en: "Almond", ar: "لوز" },
    { en: "Apple", ar: "تفاح" },
    { en: "Apple Juice", ar: "عصير التفاح" },
    { en: "Apple Pulp", ar: "لب التفاح" },
    { en: "Apple Sherbet", ar: "شربات التفاح" },
    { en: "Apricot", ar: "مشمش" },
    { en: "Arctic Bramble", ar: "توت العليق القطبي" },
    { en: "Argan", ar: "أركان" },
    { en: "Artichoke", ar: "خرشوف" },
    { en: "Ashberry", ar: "توت الرماد" },
    { en: "Banana", ar: "موز" },
    { en: "Barberry", ar: "البرباريس" },
    { en: "Bearberry", ar: "عنب الدب" },
    { en: "Beetroot", ar: "بنجر / شمندر" },
    { en: "Berries", ar: "توت بري" },
    { en: "Bitter melon", ar: "البطيخ المر" },
    { en: "Black Cherry", ar: "كرز أسود" },
    { en: "Black Currant", ar: "كشمش أسود" },
    { en: "Black Sapote", ar: "سبوتة سوداء" },
    { en: "Black Walnut", ar: "جوز أسود" },
    { en: "Blackberry", ar: "توت العليق الأسود" },
    { en: "Blackthorn", ar: "البرقوق البري" },
    { en: "Blueberry", ar: "توت أزرق" },
    { en: "Boysenberry", ar: "بويزنبيري" },
    { en: "Brazil Nut", ar: "جوز البرازيل" },
    { en: "Breadnut", ar: "جوز الخبز" },
    { en: "Buriti", ar: "بوريتي" },
    { en: "Burning Cherry", ar: "كرز محترق" },
    { en: "Cabernet Grape", ar: "عنب كابيرنيه" },
    { en: "Calafate", ar: "كالافات" },
    { en: "Candlenut", ar: "جوز الشمع" },
    { en: "Cantaloupe", ar: "كانتالوب / شمام" },
    { en: "Carambola", ar: "فاكهة النجمة / كارامبولا" },
    { en: "Carrot", ar: "جزر" },
    { en: "Cashew", ar: "كاجو" },
    { en: "Cassowary Fruit", ar: "فاكهة الكاسواري" },
    { en: "Cauliflower", ar: "قرنبيط" },
    { en: "Cepes", ar: "فطر البورسيني" },
    { en: "Chayote", ar: "شايوت" },
    { en: "Cherimoya", ar: "شيريمويا" },
    { en: "Cherry", ar: "كرز" },
    { en: "Cherry Jam", ar: "مربى الكرز" },
    { en: "Chestnut", ar: "كستناء" },
    { en: "Chia Seed", ar: "بذور الشيا" },
    { en: "Chickpeas", ar: "حمص" },
    { en: "Chinese Magnolia", ar: "ماغنوليا صينية" },
    { en: "Cider Apple", ar: "تفاح السدر" },
    { en: "Cloudberry", ar: "توت السحاب" },
    { en: "Coco De Mer", ar: "جوز الهند البحري" },
    { en: "Cocoa shell", ar: "قشرة الكاكاو" },
    { en: "Coconut", ar: "جوز الهند" },
    { en: "Coconut Water", ar: "ماء جوز الهند" },
    { en: "Cogumelo Porcino", ar: "فطر بورسيني" },
    { en: "Conifer", ar: "صنوبريات" },
    { en: "Corn", ar: "ذرة" },
    { en: "Corn Silk", ar: "حرير الذرة" },
    { en: "Count's Fruit", ar: "فاكهة الكونت" },
    { en: "Cranberry", ar: "توت بري أحمر" },
    { en: "Crimson Fruits", ar: "فواكه قرمذية" },
    { en: "Cucumber", ar: "خيار" },
    { en: "Cupuaçu", ar: "كوبواسو" },
    { en: "Currant Leaf and Bud", ar: "أوراق وبراعم الكشمش" },
    { en: "Cyperus Scariosus", ar: "السعد الهندي" },
    { en: "Daikon Radish", ar: "فجل ديكون" },
    { en: "Dark Plum Wu Mei", ar: "برقوق داكن (وو مي)" },
    { en: "Decalepis hamiltonii", ar: "ديكاليبس هاملتوني" },
    { en: "Dewberry", ar: "ندى التوت" },
    { en: "Dried Apple Crisp", ar: "رقائق التفاح المجفف" },
    { en: "Dried Apricot", ar: "مشمش مجفف" },
    { en: "Dried Fruits", ar: "فواكه مجففة" },
    { en: "Durian", ar: "دوريان" },
    { en: "Elderberry", ar: "توت البيلسان" },
    { en: "Feijoa Fruit", ar: "فيجوا" },
    { en: "Fig", ar: "تين" },
    { en: "Fig Leaf", ar: "ورق التين" },
    { en: "Fig Milk", ar: "حليب التين" },
    { en: "Filbertone", ar: "فيلبرتون" },
    { en: "Flowering Gourd", ar: "قرع مزهر" },
    { en: "Forest Fruits", ar: "فواكه الغابة" },
    { en: "Frosted Berries", ar: "توت مثلج" },
    { en: "Fruit Salad", ar: "سلطة فواكه" },
    { en: "Fruity Notes", ar: "نوتات فاكهية" },
    { en: "Fuji Apple", ar: "تفاح فوجي" },
    { en: "Gariguette Strawberry", ar: "فراولة غاريغيت" },
    { en: "Genipapo", ar: "جينيبابو" },
    { en: "Goji Berries", ar: "توت الغوجي" },
    { en: "Goldenberry", ar: "الحرنكش / التوت الذهبي" },
    { en: "Gooseberry", ar: "عنب الثعلب" },
    { en: "Grains", ar: "حبوب" },
    { en: "Grape Seed", ar: "بذور العنب" },
    { en: "Grapes", ar: "عنب" },
    { en: "Green Anjou Pears", ar: "كمثرى أنجو الخضراء" },
    { en: "Green Banana", ar: "موز أخضر" },
    { en: "Green Grape", ar: "عنب أخضر" },
    { en: "Green Pear", ar: "كمثرى خضراء" },
    { en: "Green Plum", ar: "برقوق أخضر" },
    { en: "Greengage", ar: "برقوق أخضر جرين جيج" },
    { en: "Ground Cherry", ar: "حرنكش الأرض" },
    { en: "Guarana", ar: "غوارانا" },
    { en: "Guava", ar: "جوافة" },
    { en: "Guava Nectar", ar: "رحيق الجوافة" },
    { en: "Hazelnut", ar: "بندق" },
    { en: "Hog Plum", ar: "برقوق الخنزير" },
    { en: "Honeydew Melon", ar: "شمام عسلي" },
    { en: "Isabella Grape", ar: "عنب إيزابيلا" },
    { en: "Jabuticaba", ar: "جابوتيكابا" },
    { en: "Jackfruit", ar: "جاك فروت" },
    { en: "Japanese Loquat", ar: "اسكدنيا يابانية" },
    { en: "Jobs Tears", ar: "دموع أيوب" },
    { en: "Kiwi", ar: "كيوي" },
    { en: "Kumbaru", ar: "كومبارو" },
    { en: "Lingonberry", ar: "لينجونبيري" },
    { en: "Litchi", ar: "ليتشي" },
    { en: "Loganberry", ar: "لوغانبيري" },
    { en: "Longan Berries", ar: "توت لونغان" },
    { en: "Lotus Seed", ar: "بذور اللوتس" },
    { en: "Lucuma", ar: "لوكوما" },
    { en: "Macadamia", ar: "مكاديميا" },
    { en: "Mahonia", ar: "ماهونيا" },
    { en: "Malt", ar: "شعير" },
    { en: "Mamey", ar: "مامي" },
    { en: "Mango", ar: "مانجو" },
    { en: "Mangosteen", ar: "مانغوستين" },
    { en: "Maninka", ar: "مانينكا" },
    { en: "Maqui Berry", ar: "توت الماكي" },
    { en: "Marian Plum", ar: "برقوق ماريان" },
    { en: "Medlar", ar: "زعرور" },
    { en: "Melon", ar: "شمام" },
    { en: "Millet", ar: "دخن" },
    { en: "Mirabelle", ar: "برقوق ميرابيل" },
    { en: "Miracle Berry", ar: "التوت المعجزة" },
    { en: "Moepel Accord", ar: "أكورد المويبيل" },
    { en: "Mulberry", ar: "توت" },
    { en: "Mung Bean", ar: "فاصوليا الماش" },
    { en: "Mushroom", ar: "فطر / عيش الغراب" },
    { en: "Nalca", ar: "نالكا" },
    { en: "Nashi Pear", ar: "كمثرى ناشي" },
    { en: "Nectarine", ar: "نكتارين" },
    { en: "Nutty Notes", ar: "نوتات مكسرات" },
    { en: "Okra Seeds", ar: "بذور البامية" },
    { en: "Olive", ar: "زيتون" },
    { en: "Papaya", ar: "بابايا" },
    { en: "Passionfruit", ar: "ماراكوجا / فاكهة العاطفة" },
    { en: "Pea", ar: "بازلاء" },
    { en: "Peach", ar: "خوخ (دراق)" },
    { en: "Peanut", ar: "فول سوداني" },
    { en: "Pear", ar: "كمثرى" },
    { en: "Pecan", ar: "بيكان" },
    { en: "Persimmon", ar: "كاكي" },
    { en: "Peruvian Pepper", ar: "فلفل بيروفي" },
    { en: "Pineapple", ar: "أناناس" },
    { en: "Pinot Noir Grapes", ar: "عنب بينو نوار" },
    { en: "Pistachio", ar: "فستق" },
    { en: "Pitahaya", ar: "فاكهة التنين" },
    { en: "Pitanga", ar: "بيتانغا" },
    { en: "Plantain", ar: "موز للطهي" },
    { en: "Plum", ar: "خوخ/برقوق" },
    { en: "Pomegranate", ar: "رمان" },
    { en: "Potato", ar: "بطاطس" },
    { en: "Prickly Pear", ar: "تين شوكي" },
    { en: "Pumpkin", ar: "قرع" },
    { en: "Purple Yam", ar: "يام أرجواني" },
    { en: "Quandong", ar: "كواندونغ" },
    { en: "Quince", ar: "سفرجل" },
    { en: "Rambutan", ar: "رامبوتان" },
    { en: "Raspberry", ar: "توت العليق الأحمر" },
    { en: "Red Apple", ar: "تفاح أحمر" },
    { en: "Red Berries", ar: "توت أحمر" },
    { en: "Red Currant", ar: "كشمش أحمر" },
    { en: "Red Fruits", ar: "فواكه حمراء" },
    { en: "Red Fruits Smoothie", ar: "عصير الفواكه الحمراء" },
    { en: "Red Mulberry", ar: "توت أحمر" },
    { en: "Rhubarb", ar: "راوند" },
    { en: "Roasted Nuts", ar: "مكسرات محمصة" },
    { en: "Rose Apple", ar: "تفاح الورد" },
    { en: "Rowanberry", ar: "توت الروان" },
    { en: "Salak", ar: "صالاك" },
    { en: "Santol", ar: "سانتول" },
    { en: "Sapodilla", ar: "سابوديلا" },
    { en: "Sarsaparilla", ar: "سرساباريلا" },
    { en: "Sea Buckthorn", ar: "نبق البحر" },
    { en: "Seriguela", ar: "سيريغويلا" },
    { en: "Serrano Pepper", ar: "فلفل سيرانو" },
    { en: "Shea Butter", ar: "زبدة الشيا" },
    { en: "Shea Nuts", ar: "مكسرات الشيا" },
    { en: "Silverberry", ar: "توت فضي" },
    { en: "Snowberry", ar: "توت الثلج" },
    { en: "Sour Cherry", ar: "كرز حامض" },
    { en: "Soursop", ar: "قشطة / جوانابانا" },
    { en: "Soybean", ar: "فول الصويا" },
    { en: "Squash", ar: "كوسة/قرع" },
    { en: "Star Apple", ar: "تفاح النجمة" },
    { en: "Strawberry", ar: "فراولة" },
    { en: "Strawberry Jam", ar: "مربى الفراولة" },
    { en: "SugarLoaf Pineapple", ar: "أناناس سو" },
    { en: "Garlic", ar: "ثوم" },
    { en: "Tamanu", ar: "تامانو" },
    { en: "Tapioca", ar: "تابيوكا" },
    { en: "Taro", ar: "قلقاس" },
    { en: "Tayberry", ar: "توت تاي" },
    { en: "Tomato", ar: "طماطم" },
    { en: "Tropical Fruits", ar: "فواكه استوائية" },
    { en: "Tropicalone", ar: "تروبيكالون" },
    { en: "Tucumã", ar: "توكوما" },
    { en: "Vegetal Notes", ar: "نوتات نباتية" },
    { en: "Walnut", ar: "جوز" },
    { en: "Walnut Milk", ar: "حليب الجوز" },
    { en: "Water Fruit", ar: "فاكهة مائية" },
    { en: "Watermelon", ar: "بطيخ أحمر" },
    { en: "Wattleseed", ar: "بذور الواتل" },
    { en: "White Currant", ar: "كشمش أبيض" },
    { en: "White Grape", ar: "عنب أبيض" },
    { en: "White Mulberry", ar: "توت أبيض" },
    { en: "Wild Strawberry", ar: "فراولة بر" },
    { en: "Williams Pear", ar: "كمثرى ويليامز" },
    { en: "Winterberry", ar: "توت الشتاء" },
    { en: "Wintermelon", ar: "بطيخ الشتاء" },
    { en: "Wolfberry", ar: "تُوت الذئب (غوجي)" },
    { en: "Yellow Cherry", ar: "كرز أصفر" },
    { en: "Yellow Fruits", ar: "فواكه صفراء" },
    { en: "Yuca Cassava", ar: "كاسافا" },
    { en: "Yumberry", ar: "يومبيري" },
    { en: "Zucchini", ar: "كوسة" },
  ],
  floral: [
    { en: "Abelia", ar: "أبيليا" },
    { en: "Acacia", ar: "أكاسيا / طلح" },
    { en: "Acerola Blossom", ar: "زهر الأسيرولا" },
    { en: "African Marigold", ar: "مخملية أفريقية" },
    { en: "Aglaia", ar: "أغلايا" },
    { en: "Alba Rose", ar: "الورد الأبيض" },
    { en: "Albizia", ar: "ألبيزيا" },
    { en: "Almond Blossom", ar: "زهر اللوز" },
    { en: "Alpinia", ar: "ألبينيا" },
    { en: "Alstroemeria", ar: "ألستروميريا" },
    { en: "Althaea", ar: "خبازة / ختمية" },
    { en: "Alumroot", ar: "ألومروت" },
    { en: "Alyssum", ar: "أليسار / أليسوم" },
    { en: "Amarillys", ar: "أماريليس" },
    { en: "Amazon Moonflower", ar: "زهرة القمر الأمازونية" },
    { en: "Amethyst Flower", ar: "زهرة الجمشت" },
    { en: "Anemone", ar: "شقائق النعمان" },
    { en: "Angel's Trumpet", ar: "بوق الملاك" },
    { en: "Apple Blossom", ar: "زهر التفاح" },
    { en: "Apricot Blossom", ar: "زهر المشمش" },
    { en: "Ashoka Flower", ar: "زهرة أشوكا" },
    { en: "Asian Clintonia", ar: "كلينتونيا آسيوية" },
    { en: "Astragalus", ar: "قتاد / أستراغالوس" },
    { en: "Azalea", ar: "أزاليا" },
    { en: "Azteca Lily", ar: "زنبق الأزتيك" },
    { en: "Baby’s Breath", ar: "نفس الطفل / الجبسوفيلا" },
    { en: "Banana Flower", ar: "زهرة الموز" },
    { en: "Banksia Australian", ar: "بانكسيا أسترالية" },
    { en: "Begonia", ar: "بيغونيا" },
    { en: "Belladona", ar: "ست الحسن / بلادونا" },
    { en: "Bellflower", ar: "زهرة الجرس" },
    { en: "Bergamot Blossom", ar: "زهر البرغموت" },
    { en: "Bird cherry", ar: "كرز الطيور" },
    { en: "Black Currant Blossom", ar: "زهر الكشمش الأسود" },
    { en: "Blackberry Blossom", ar: "زهر توت العليق الأسود" },
    { en: "Blue Lilies", ar: "زنابق زرقاء" },
    { en: "Blue Pea Flower", ar: "زهرة البازلاء الزرقاء" },
    { en: "Blue Poppy", ar: "خشخاش أزرق" },
    { en: "Bluebell", ar: "جريس أزرق" },
    { en: "Bottlebrush", ar: "فرشاة الزجاج" },
    { en: "Bougainvillea", ar: "جهنية" },
    { en: "Bouvardia", ar: "بوفارديا" },
    { en: "Bread Flower", ar: "زهرة الخبز" },
    { en: "Bromelia", ar: "بروميليا" },
    { en: "Buddleia", ar: "بودليا" },
    { en: "Butomus Umbellatus", ar: "بوتوموس مظلي" },
    { en: "Buttercup", ar: "حوذان" },
    { en: "Cacao Blossom", ar: "زهر الكاكاو" },
    { en: "Cactus Blossom", ar: "زهر الصبار" },
    { en: "Calendula", ar: "أقحوان / كاليندولا" },
    { en: "Calla Lily", ar: "زنبق الكالا" },
    { en: "Camellia", ar: "كاميليا" },
    { en: "Campion Flower", ar: "سيلينة" },
    { en: "Cananga", ar: "كانانغا" },
    { en: "Cannonball Flower", ar: "زهرة شجرة المدفع" },
    { en: "Carambola Blossom", ar: "زهر الكارامبولا" },
    { en: "Cardamom Flower", ar: "زهرة الهيل" },
    { en: "Carnation", ar: "قرنفل" },
    { en: "Cashew Flower", ar: "زهرة الكاجو" },
    { en: "Celosia", ar: "سيلوسيا" },
    { en: "Chai Hu", ar: "تشاي هو" },
    { en: "Chamomile", ar: "بابونج" },
    { en: "Champaca", ar: "شامباكا" },
    { en: "Cherry Blossom", ar: "زهر الكرز" },
    { en: "Chimonanthus", ar: "شيمونانثوس" },
    { en: "China Rose", ar: "الورد الصيني" },
    { en: "Chinotto blossom", ar: "زهر الكينوتو" },
    { en: "Chocolate Flower", ar: "زهرة الشوكولاتة" },
    { en: "Christmas Tree", ar: "شجرة الصنوبر" },
    { en: "Chrysanthemum", ar: "أقحوان" },
    { en: "Cistus Incanus", ar: "قستوس رمادي" },
    { en: "Clematis", ar: "ياسمين بري / كليماتيس" },
    { en: "Clover", ar: "برسيم" },
    { en: "Coconut Blossom", ar: "زهر جوز الهند" },
    { en: "Coffee Blossom", ar: "زهر القهوة" },
    { en: "Cornflower", ar: "زهرة الذرة / العنبر" },
    { en: "Cosmos Flower", ar: "زهرة الكوزموس" },
    { en: "Costus", ar: "قسط" },
    { en: "Cotton Flower", ar: "زهرة القطن" },
    { en: "Creamy Flowers", ar: "زهور كريمية" },
    { en: "Crinum Lily", ar: "زنبق الكرينوم" },
    { en: "Cucumber Flower", ar: "زهرة الخيار" },
    { en: "Cyclamen", ar: "بخور مريم / سيكلامين" },
    { en: "Dahlia", ar: "داليا" },
    { en: "Daisy", ar: "أقحوان بري / ديزي" },
    { en: "Dandelion", ar: "هندباء البرية" },
    { en: "Daphne", ar: "دافني" },
    { en: "Daylily", ar: "زنبق النهار" },
    { en: "Deadnettle", ar: "لاميون" },
    { en: "Delonix", ar: "ديلونيكس" },
    { en: "Desert Rose", ar: "وردة الصحراء" },
    { en: "Dianthus", ar: "قرنفل" },
    { en: "Diviniris", ar: "ديفينيريس" },
    { en: "Dogwood Blossom", ar: "زهر شجرة القرانيا" },
    { en: "Dove Tree", ar: "شجرة الحمامة" },
    { en: "Dried Rose", ar: "ورد مجفف" },
    { en: "Dyer's Greenweed", ar: "وزال الصباغين" },
    { en: "Edelweiss", ar: "إديلوايس" },
    { en: "Eglantine Rose", ar: "الورد البري" },
    { en: "Elderflower", ar: "زهر البيلسان" },
    { en: "Encian", ar: "جنطيانا" },
    { en: "Erigeron", ar: "أريغارون" },
    { en: "Euphorbia", ar: "فربيون" },
    { en: "Eustoma", ar: "يوستوما" },
    { en: "Evergreen", ar: "دائم الخضرة" },
    { en: "Field Scabious", ar: "جرب الحقول" },
    { en: "Fig Blossom", ar: "زهر التين" },
    { en: "Fire Lily", ar: "زنبق النار" },
    { en: "Flamingo Flower", ar: "زهرة الفلامنغو / أنثوريوم" },
    { en: "Flax", ar: "كتان" },
    { en: "Floral Notes", ar: "نوتات زهرية" },
    { en: "Forget Me Not", ar: "لا تنساني" },
    { en: "Fragonia", ar: "فراغونيا" },
    { en: "Freesia", ar: "فريزيا" },
    { en: "French Marigold", ar: "قطيفة فرنسية" },
    { en: "Fringed Pink", ar: "قرنفل مهدب" },
    { en: "Fuchsia", ar: "فوشيا" },
    { en: "Geranium", ar: "جيرانيوم" },
    { en: "Gerbera", ar: "جربارة" },
    { en: "Gladiolus", ar: "دلبوث" },
    { en: "Goldenrod", ar: "عصا الذهب" },
    { en: "Gorse", ar: "جولق" },
    { en: "Grapeflower", ar: "زهر العنب" },
    { en: "Great Burnet", ar: "بوقيصا كبرى" },
    { en: "Green Nard", ar: "ناردين أخضر" },
    { en: "Green Tea Flower", ar: "زهرة الشاي الأخضر" },
    { en: "Grevillea", ar: "غريفيليا" },
    { en: "Guava Blossom", ar: "زهر الجوافة" },
    { en: "Guayacan", ar: "غواياكان" },
    { en: "Gustavia Flower", ar: "زهرة غوستافيا" },
    { en: "Hawthorn", ar: "زعرور" },
    { en: "Hazel Blossom", ar: "زهر البندق" },
    { en: "Heather", ar: "خلنج" },
    { en: "Heliotrope", ar: "رقيب الشمس / هليوتروب" },
    { en: "Hellabore Flower", ar: "زهرة الخربق" },
    { en: "Hemlock", ar: "شوكران" },
    { en: "Hibiscus", ar: "كركديه" },
    { en: "Hoary Stock", ar: "منثور رمادي" },
    { en: "Holly Flower", ar: "زهرة البهشية" },
    { en: "Hollyhock", ar: "خطمية" },
    { en: "Honeybush", ar: "شجيرة العسل" },
    { en: "Honeydew Blossom", ar: "زهر الشمام العسلي" },
    { en: "Hortensia", ar: "كوبية / هورتنسيا" },
    { en: "Hoya Carnosa", ar: "هويا كارنوسا" },
    { en: "Hyacinth", ar: "ياقوتية / هياسينث" },
    { en: "Hyssop", ar: "زوفا" },
    { en: "Impatiens", ar: "بلسم / إمباتينز" },
    { en: "Inula", ar: "عينات / إينولا" },
    { en: "Iris", ar: "سوسن" },
    { en: "Iris Butter", ar: "زبدة السوسن" },
    { en: "Iris Pallida", ar: "السوسن الشاحب" },
    { en: "Jacaranda", ar: "جاكراندا" },
    { en: "Jade Flower", ar: "زهرة اليشم" },
    { en: "Jarana Flower", ar: "زهرة جارانا" },
    { en: "Jasmine Orchid", ar: "أوركيد الياسمين" },
    { en: "Jujube Blossom", ar: "زهر العناب" },
    { en: "Kadam", ar: "كادام" },
    { en: "Kangaroo Paw", ar: "مخلب الكنغر" },
    { en: "Kanuka", ar: "كانوكا" },
    { en: "Kanzan Cherry", ar: "كرز كانزان" },
    { en: "Karmaflor", ar: "كارمافلور" },
    { en: "Kiwi blossom", ar: "زهر الكيوي" },
    { en: "Kudzu", ar: "كودزو" },
    { en: "Laburnum", ar: "شجرة المطر الذهبي" },
    { en: "Lady of the Night", ar: "سيدة الليل" },
    { en: "Lady Slipper Orchid", ar: "أوركيد خف السيدة" },
    { en: "Lamduan Flower", ar: "زهرة اللامدوان" },
    { en: "Lamprocapnos", ar: "قلب ينزف" },
    { en: "Lantana", ar: "لانتانا" },
    { en: "Larkspur", ar: "عائق" },
    { en: "Laurel Blossom", ar: "زهر الغار" },
    { en: "Lavender", ar: "خزامى / لافندر" },
    { en: "Leatherwood", ar: "خشب جلدي" },
    { en: "Ledum", ar: "ليدوم" },
    { en: "Liatrix", ar: "لياتريس" },
    { en: "Licorice Flower", ar: "زهرة عرق السوس" },
    { en: "Lilac", ar: "ليلك" },
    { en: "Lily-of-the-Valley", ar: "زنبق الوادي" },
    { en: "Lime Blossom", ar: "زهر الليمون الحامض" },
    { en: "Litchi Blossom", ar: "زهر الليتشي" },
    { en: "Longoza", ar: "لونغوزا" },
    { en: "Lotus", ar: "لوتس" },
    { en: "Lupin", ar: "ترمس" },
    { en: "Lydia Broom", ar: "وزال ليديا" },
    { en: "Lysylang", ar: "ليسيلانغ" },
    { en: "Macadamia Flower", ar: "زهرة المكاديميا" },
    { en: "Madonna Lily", ar: "زنبق مادونا" },
    { en: "Magnolia", ar: "ماغنوليا" },
    { en: "Magnolia Brooklynensis", ar: "ماغنوليا بروكلين" },
    { en: "Magnolia Leaf", ar: "ورق الماغنوليا" },
    { en: "Mahonial", ar: "ماهونيال" },
    { en: "Malva", ar: "خبيزة" },
    { en: "Mango Blossom", ar: "زهر المانجو" },
    { en: "Mariposa Lily", ar: "زنبق ماريبوسا" },
    { en: "Mayflower", ar: "زهرة مايو" },
    { en: "Meadowsweet", ar: "حلوة المروج" },
    { en: "Melilotus", ar: "حندقوق" },
    { en: "Melissa Flower", ar: "زهرة المليسة" },
    { en: "Michelia", ar: "ميشيليا" },
    { en: "Michelia leaf", ar: "ورق الميشيليا" },
    { en: "Mignonette", ar: "مينيونيت" },
    { en: "Milkweeds", ar: "صقلاب" },
    { en: "Mimosa", ar: "ميموزا" },
    { en: "Mimusops Elengi", ar: "بيكول / ميموزوبس" },
    { en: "Mirabilis", ar: "شب الليل" },
    { en: "Monarda", ar: "موناردا" },
    { en: "Monoi Oil", ar: "زيت المونوي" },
    { en: "Moringa Blossom", ar: "زهر المورينجا" },
    { en: "Morning Glory", ar: "مجد الصباح" },
    { en: "Moss Flox", ar: "فلوكس الطحلب" },
    { en: "Myrtle", ar: "آس / مرسين" },
    { en: "Narcissus", ar: "نرجس" },
    { en: "Nard", ar: "ناردين" },
    { en: "Nasturtium", ar: "أبو خنجر" },
    { en: "Nectarine Blossom", ar: "زهر النكتارين" },
    { en: "Nerium Oleander", ar: "دفلى" },
    { en: "Nigella", ar: "حبة البركة" },
    { en: "Night Blooming Jasmine", ar: "ياسمين ليلي" },
    { en: "Nom Maew", ar: "نوم مايو" },
    { en: "Olive flower", ar: "زهر الزيتون" },
    { en: "Opium", ar: "أفيون" },
    { en: "Orange Cassia", ar: "كاسيا البرتقال" },
    { en: "Orange Flower Water", ar: "ماء زهر البرتقال" },
    { en: "Orange Jasmine", ar: "ياسمين البرتقال" },
    { en: "Orchard Blossom", ar: "زهر البساتين" },
    { en: "Orchid", ar: "أوركيد" },
    { en: "Orchid Black Diamond", ar: "أوركيد الماس الأسود" },
    { en: "Orchid Cactus", ar: "أوركيد الصبار" },
    { en: "Orchid Pink Leopard", ar: "أوركيد النمر الوردي" },
    { en: "Ornithogalum", ar: "نجمة بيت لحم" },
    { en: "Orris Root", ar: "جذر السوسن" },
    { en: "Osmanthus", ar: "أوسمانثوس" },
    { en: "Osmanthus milk", ar: "حليب الأوسمانثوس" },
    { en: "Pansy", ar: "زهرة الثالوث" },
    { en: "Papaya Blossom", ar: "زهر البابايا" },
    { en: "Paramela", ar: "باراميلا" },
    { en: "Passion Flower", ar: "زهرة الآلام" },
    { en: "Pataqueira", ar: "باتاكيرا" },
    { en: "Peach Blossom", ar: "زهر الخوخ" },
    { en: "Pear Blossom", ar: "زهر الكمثرى" },
    { en: "Pelargonium", ar: "بيلارغونيوم" },
    { en: "Peony", ar: "عود الصليب / بيوني" },
    { en: "Periwinkle", ar: "ونيكة" },
    { en: "Petalia", ar: "بيتاليا" },
    { en: "Petunia", ar: "بيتونيا" },
    { en: "Phlox", ar: "فلوكس" },
    { en: "Pikul Flower", ar: "زهرة بيكول" },
    { en: "Pineapple Blossom", ar: "زهر الأناناس" },
    { en: "Pink Flamingo Heliconia", ar: "هليكونيا الفلامنغو الوردي" },
    { en: "Pink Lily", ar: "زنبق وردي" },
    { en: "Pinwheel Flower", ar: "زهرة دولاب الهواء" },
    { en: "Pitahaya Flower", ar: "زهرة فاكهة التنين" },
    { en: "Pittosporum", ar: "بيتوسبوروم" },
    { en: "Plum Blossom", ar: "زهر البرقوق" },
    { en: "Plumeria", ar: "بلوميريا / ياسمين هندي" },
    { en: "Poinsettia", ar: "بنت القنصل" },
    { en: "Pomegranate Blossom", ar: "زهر الرمان" },
    { en: "Poppy", ar: "خشخاش" },
    { en: "Portlandia", ar: "بورتلانديا" },
    { en: "Primrose", ar: "زهرة الربيع" },
    { en: "Princess Tree", ar: "شجرة الأميرة" },
    { en: "Privet", ar: "شبة" },
    { en: "Protea", ar: "بروتيا" },
    { en: "Prunella", ar: "برونيلا" },
    { en: "Purple Coneflower", ar: "القنفذية الأرجوانية" },
    { en: "Queen of the Night", ar: "ملكة الليل" },
    { en: "Rangoon Creeper", ar: "الياسمين الأحمر" },
    { en: "Raspberry Blossom", ar: "زهر توت العليق" },
    { en: "Redwood Flower", ar: "زهرة الخشب الأحمر" },
    { en: "Reseda", ar: "خزامى صفراء" },
    { en: "Rhododendron", ar: "ردندرة" },
    { en: "Rosa Alba", ar: "الورد الأبيض" },
    { en: "Rosa Rubiginosa", ar: "الورد الياقوتي" },
    { en: "Rose", ar: "ورد" },
    { en: "Rose Hip", ar: "ثمر الورد" },
    { en: "Rose Japanese", ar: "الورد الياباني" },
    { en: "Rose Mallow", ar: "ختمية وردية" },
    { en: "Rosebay Willowherb", ar: "سنفية ضيقة الأوراق" },
    { en: "Rosebud", ar: "برعم الورد" },
    { en: "Roselle", ar: "كركديه" },
    { en: "Rosyfolia", ar: "روزيفوليا" },
    { en: "Safflower", ar: "عصفر" },
    { en: "Sainfoins", ar: "بيقية" },
    { en: "Sand Lily", ar: "زنبق الرمل" },
    { en: "Sandalwood Flower", ar: "زهرة خشب الصندل" },
    { en: "Santolina", ar: "سانتولينا" },
    { en: "Saucer Magnolia", ar: "ماغنوليا الكوب" },
    { en: "Sea Daffodil", ar: "نرجس البحر" },
    { en: "Siberian Rhododendron", ar: "ردندرة سيبيرية" },
    { en: "Silk Tree Blossom", ar: "زهر شجرة الحرير" },
    { en: "Silverthorn Flower", ar: "زهرة الشوك الفضي" },
    { en: "Skeleton Flower", ar: "زهرة الهيكل" },
    { en: "Smoketree", ar: "شجرة الدخان" },
    { en: "Snakeroot", ar: "جذر الأفعى" },
    { en: "Snow Lotus", ar: "لوتس الثلج" },
    { en: "Snowdrops", ar: "نقطة الثلج" },
    { en: "Solomon's Seal", ar: "ختم سليمان" },
    { en: "Sophora Toromiro", ar: "سوفورا تورومير" },
    { en: "Sour Cherry Blossom", ar: "زهر الكرز الحامض" },
    { en: "Spanish Broom", ar: "غريز إسباني" },
    { en: "Spiraea", ar: "سبيريا" },
    { en: "St. John's Wort", ar: "نبتة القديس يوحنا" },
    { en: "Star Magnolia", ar: "مانيوليا النجمة" },
    { en: "Starflower", ar: "زهرة النجمة" },
    { en: "Strawberry Flower", ar: "زهرة الفرا" },
    { en: "Strelitzia", ar: "نجمة الجنة" },
    { en: "Strobilanthes Callosa", ar: "ستروبيلانثيس" },
    { en: "Sunflower", ar: "دوار الشمس" },
    { en: "Sweet Pea", ar: "بسلة حلوة" },
    { en: "Taif Rose", ar: "وردة الطائف" },
    { en: "Tamarisk", ar: "طرفاء" },
    { en: "Tobacco Blossom", ar: "زهرة التبغ" },
    { en: "Transparent Flowers", ar: "زهور شفافة" },
    { en: "Trillium", ar: "ثلاثية الأوراق" },
    { en: "Tulip", ar: "خزامى / توليب" },
    { en: "Tussilago farfara", ar: "مرعى السعال" },
    { en: "Vanilla Bahiana", ar: "فانيليا باهيانية" },
    { en: "Viburnum", ar: "فيبورنوم" },
    { en: "Violet", ar: "بنفسج" },
    { en: "Violet Wood", ar: "خشب البنفسج" },
    { en: "Violet Sorrel", ar: "حميض البنفسج" },
    { en: "Wallflower", ar: "زهرة الجدار" },
    { en: "Waratah", ar: "وراتاه" },
    { en: "Water Flowers", ar: "زهور مائية" },
    { en: "Water Hyacinth", ar: "رسن مائي" },
    { en: "Water Lily", ar: "زنبق الماء" },
    { en: "Weeping Cherry Blossom", ar: "زهر الكرز الباكي" },
    { en: "White Champaca", ar: "شامباكا بيضاء" },
    { en: "White Dahlia", ar: "داليا بيضاء" },
    { en: "White Ginger Lily", ar: "زنبق الزنجبيل الأبيض" },
    { en: "White Lace Flower", ar: "زهرة الدانتيل البيضاء" },
    { en: "White Tea Blossom", ar: "زهرة الشاي الأبيض" },
    { en: "Wildflowers", ar: "زهور برية" },
    { en: "Winter Daphne", ar: "دافني الشتاء" },
    { en: "Wisteria", ar: "ويستيريا" },
    { en: "Wrightia", ar: "رايتيا" },
    { en: "Yellow Bells", ar: "أجراس صفراء" },
    { en: "Yellow Flowers", ar: "زهور صفراء" },
    { en: "Ylang-Ylang", ar: "يلانغ يلانغ" },
    { en: "Yunnan Osmanthus", ar: "أوزمانثوس يونان" },
    { en: "Yuzu Flower", ar: "زهرة اليوزو" },
    { en: "Zinnia", ar: "زينيا" },
    // White Flowers
    { en: "Arum Lily", ar: "زنبق الأروم" },
    { en: "Belanis", ar: "بيلانيس" },
    { en: "Black Locust", ar: "السنط الأسود" },
    { en: "Boronia", ar: "بورونيا" },
    { en: "Carissa", ar: "كاريسا" },
    { en: "Datura", ar: "داتورا" },
    { en: "Frangipani", ar: "فرنجيباني" },
    { en: "Gardenia", ar: "غاردينيا" },
    { en: "Grapefruit Blossom", ar: "زهر الجريب فروت" },
    { en: "Honeysuckle", ar: "صريمة الجدي" },
    { en: "Jasmine", ar: "ياسمين" },
    { en: "Karo-Karounde", ar: "كارو كاروندي" },
    { en: "Lemon Blossom", ar: "زهر الليمون" },
    { en: "Lily", ar: "زنبق" },
    { en: "Mandarin Orange Blossom", ar: "زهر اليوسفي" },
    { en: "Melati", ar: "ياسمين إندونيسي" },
    { en: "Mock Orange", ar: "الياسمين الكاذب" },
    { en: "Moon Flower", ar: "زهرة القمر" },
    { en: "Night Blooming Cereus", ar: "صبار ملكة الليل" },
    { en: "Orange Blossom", ar: "زهر البرتقال" },
    { en: "Stephanotis", ar: "ياسمين مدغشقر" },
    { en: "Syringa", ar: "ليلك كاذب" },
    { en: "Tangerine Blossom", ar: "زهر اليوسفي" },
    { en: "Tiare Flower", ar: "زهرة التياري" },
    { en: "Tuberose", ar: "مسك الروم" },
    { en: "White Flowers", ar: "زهور بيضاء" },
    { en: "White Tobacco", ar: "التبغ الأبيض" },
  ],
  spicy: [
    { en: "Allspice", ar: "بهار حلو" },
    { en: "Anise", ar: "يانسون" },
    { en: "Asafoetida", ar: "حلتيت" },
    { en: "Baking Spices", ar: "بهارات الخبيز" },
    { en: "Bay Leaf", ar: "ورق الغار" },
    { en: "Bengal Pepper", ar: "فلفل البنغال" },
    { en: "Biryani", ar: "بهارات البرياني" },
    { en: "Black Sesame", ar: "سمسم أسود" },
    { en: "Cacao Pod", ar: "قرن الكاكاو" },
    { en: "Caraway", ar: "كروية" },
    { en: "Cardamom", ar: "هيل (حبهان)" },
    { en: "Carolina Reaper", ar: "كارولينا ريبر" },
    { en: "Carum", ar: "كروية / كاروم" },
    { en: "Cassia", ar: "قرفة صينية" },
    { en: "Chutney", ar: "صلصة التشاتني" },
    { en: "Cinnamon", ar: "قرفة" },
    { en: "Cinnamon Leaf", ar: "ورق القرفة" },
    { en: "Clove Leaf", ar: "ورق القرنفل" },
    { en: "Cloves", ar: "قرنفل (توابل)" },
    { en: "Coffee", ar: "قهوة" },
    { en: "Coffee CO2", ar: "مستخلص القهوة" },
    { en: "Coffee Tincture", ar: "صبغة القهوة" },
    { en: "Coriander", ar: "كزبرة" },
    { en: "Cubeb", ar: "كبابة صينية" },
    { en: "Cumin", ar: "كمون" },
    { en: "Curcuma", ar: "كركم" },
    { en: "Curry", ar: "كاري" },
    { en: "Curry Tree", ar: "شجرة الكاري" },
    { en: "Dill", ar: "شبت" },
    { en: "Fennel", ar: "شمر" },
    { en: "Fenugreek", ar: "حلبة" },
    { en: "Galanga", ar: "خولنجان" },
    { en: "Ghost Pepper", ar: "فلفل شبح" },
    { en: "Ginger", ar: "زنجبيل" },
    { en: "Green Coffee", ar: "قهوة خضراء" },
    { en: "Guinea Pepper", ar: "فلفل غينيا" },
    { en: "Indian Spices", ar: "توابل هندية" },
    { en: "Japanese Pepper", ar: "فلفل ياباني" },
    { en: "Kaempferia Galanga", ar: "خولنجان طبي" },
    { en: "Kopi Luwak", ar: "قهوة كوبي لواك" },
    { en: "Licorice", ar: "عرق سوس" },
    { en: "Mace", ar: "قشرة جوزة الطيب" },
    { en: "Mustard Seed", ar: "بذور الخردل" },
    { en: "Nutmeg", ar: "جوزة الطيب" },
    { en: "Oily Notes", ar: "نوتات زيتية" },
    { en: "Oriental Notes", ar: "نوتات شرقية" },
    { en: "Pepper", ar: "فلفل" },
    { en: "Peppertree", ar: "شجرة الفلفل" },
    { en: "Pimento", ar: "فلفل حلو" },
    { en: "Pimento Leaf", ar: "ورق الفلفل الحلو" },
    { en: "Pimento Seeds", ar: "بذور الفلفل الحلو" },
    { en: "Pink Pepper", ar: "فلفل وردي" },
    { en: "Priprioca", ar: "بريبريوكا" },
    { en: "Saffron", ar: "زعفران" },
    { en: "Safraleine", ar: "سافرالين" },
    { en: "Sesame", ar: "سمسم" },
    { en: "Siam Cardamom", ar: "هيل سيامي" },
    { en: "Sichuan Pepper", ar: "فلفل سيشوان" },
    { en: "Spicy Notes", ar: "نوتات حارة / توابلية" },
    { en: "Spiked Pepper", ar: "فلفل مدبب" },
    { en: "Star Anise", ar: "يانسون نجمي" },
    { en: "Sumac", ar: "سماق" },
    { en: "Tamarind", ar: "تمر هندي" },
    { en: "Timur", ar: "تيمور" },
    { en: "Tonka Bean", ar: "حبوب التونكا" },
    { en: "Toscanol", ar: "توسكانول" },
    { en: "Ultravanil", ar: "ألترافانيل" },
    { en: "Vanilla", ar: "فانيليا" },
    { en: "Wan Sao Lhong", ar: "وان ساو لونغ" },
    { en: "Wasabi", ar: "واسابي" },
    { en: "Water Pepper", ar: "فلفل الماء" },
    { en: "West Indian Bay", ar: "ورق غار غرب الهند" },
  ],
};

const ID_PAD = { perfumes: 1 };
const CATEGORIES = ["perfumes"];
const HAS_COLOR = new Set();

function generateNextId(category, products) {
  const pad = ID_PAD[category] || 1;
  const catProducts = products.filter((p) => p.category === category);
  let maxNum = 0;
  catProducts.forEach((p) => {
    const num = parseInt(p.id, 10);
    if (!isNaN(num) && num > maxNum) maxNum = num;
  });
  return String(maxNum + 1).padStart(pad, "0");
}

function getEffectivePath(category, path) {
  const root = TAXONOMY[category];
  if (!root?.children) return [];
  const result = [];
  let current = root;
  for (let i = 0; i < 3; i++) {
    if (!current?.children) break;
    const entries = Object.entries(current.children);
    if (!entries.length) break;
    const selected = path[i] || entries[0][0];
    result.push(selected);
    current = current.children[selected];
  }
  return result;
}

function SubcatChain({ category, path, onChange }) {
  const root = TAXONOMY[category];
  if (!root?.children || !Object.keys(root.children).length) return null;

  function renderLevel(children, depth) {
    const entries = Object.entries(children);
    if (!entries.length) return null;
    const selected = path[depth] || entries[0][0];
    const selectedNode = children[selected];
    return (
      <>
        <div className="ap-subcat-level">
          <label className="field__label" htmlFor={`subcat-${depth}`}>
            {LEVEL_LABELS[depth] || "Detail"} <span className="field__req">*</span>
          </label>
          <div className="select-field">
            <select
              id={`subcat-${depth}`}
              className="select"
              value={selected}
              onChange={(e) => {
                const newPath = path.slice(0, depth);
                newPath[depth] = e.target.value;
                onChange(newPath);
              }}
            >
              {entries.map(([key, val]) => (
                <option key={key} value={key}>{val.label}</option>
              ))}
            </select>
            <svg className="select-field__chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>
          </div>
        </div>
        {selectedNode?.children && Object.keys(selectedNode.children).length > 0 &&
          renderLevel(selectedNode.children, depth + 1)}
      </>
    );
  }

  return (
    <div className="field field--full">
      <div className="ap-subcat-chain">
        {renderLevel(root.children, 0)}
      </div>
    </div>
  );
}

function NotesTagInput({ id, label, value, onChange, universe, placeholder, hint }) {
  const inputRef = useRef(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  const tags = value ? value.split(",").map(t => t.trim()).filter(Boolean) : [];
  const catalog = (() => {
    if (query === "" && universe) {
      return NOTES_CATALOG[universe] || [];
    }
    // Flat list of all notes across all categories
    const all = Object.values(NOTES_CATALOG).flat();
    // Deduplicate by English name to prevent duplicates in search results
    const seen = new Set();
    return all.filter(n => {
      const key = n.en.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  })();

  const filtered = catalog.filter(n =>
    !tags.some(t => t.toLowerCase() === n.en.toLowerCase()) &&
    (query === "" ||
      n.en.toLowerCase().includes(query.toLowerCase()) ||
      n.ar.includes(query))
  );

  const addFromCatalog = (note) => {
    onChange([...tags, note.en].join(", "));
    setQuery("");
    inputRef.current?.focus();
  };

  const addCustom = () => {
    const trimmed = query.trim();
    if (trimmed && !tags.some(t => t.toLowerCase() === trimmed.toLowerCase())) {
      onChange([...tags, trimmed].join(", "));
    }
    setQuery("");
  };

  const removeTag = (tag) => onChange(tags.filter(t => t !== tag).join(", "));

  const handleKeyDown = (e) => {
    if ((e.key === "Enter" || e.key === ",") && query.trim()) {
      e.preventDefault();
      addCustom();
    } else if (e.key === "Backspace" && !query && tags.length) {
      removeTag(tags[tags.length - 1]);
    }
  };

  return (
    <div className="field field--full">
      {label && <label className="field__label" htmlFor={id}>{label}</label>}
      <div
        className="notes-tag-wrap"
        onClick={() => inputRef.current?.focus()}
      >
        <div className="notes-tags">
          {tags.map(t => (
            <span key={t} className="notes-tag">
              {t}
              <button
                type="button"
                className="notes-tag__remove"
                onMouseDown={(e) => { e.preventDefault(); removeTag(t); }}
                aria-label={`Remove ${t}`}
              >×</button>
            </span>
          ))}
          <input
            ref={inputRef}
            id={id}
            className="notes-tag__input"
            value={query}
            onChange={e => { setQuery(e.target.value); setOpen(true); }}
            onFocus={() => setOpen(true)}
            onBlur={() => setTimeout(() => setOpen(false), 150)}
            onKeyDown={handleKeyDown}
            placeholder={tags.length === 0 ? placeholder : ""}
            autoComplete="off"
          />
        </div>
        {open && filtered.length > 0 && (
          <div className="notes-dropdown">
            {filtered.slice(0, 100).map(n => (
              <button
                key={n.en}
                type="button"
                className="notes-dropdown__item"
                onMouseDown={(e) => { e.preventDefault(); addFromCatalog(n); }}
              >
                <span className="notes-dropdown__en">{n.en}</span>
                <span className="notes-dropdown__ar">{n.ar}</span>
              </button>
            ))}
          </div>
        )}
      </div>
      {hint && <p className="field__hint">{hint}</p>}
    </div>
  );
}

const EMPTY_FORM = {
  id: "",
  category: "perfumes",
  name: "",
  price: "",
  quantity: "",
  color: "",
  sizes: "",
  gender: "",
  top_notes: "",
  mid_notes: "",
  base_notes: "",
  desc: "",
  image: "",
};

export default function AdminProduct() {
  const [params] = useSearchParams();
  const editId = params.get("id");
  const { user, token, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const fileInputRef = useRef(null);

  const [form, setForm] = useState(EMPTY_FORM);
  const [imgPreview, setImgPreview] = useState("");
  const [subcatPath, setSubcatPath] = useState([]);
  const [fileInfo, setFileInfo] = useState(null);
  const [descLang, setDescLang] = useState("ar");
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) navigate("/login", { replace: true });
  }, [authLoading, user, navigate]);

  const { data: allProducts } = useQuery({
    queryKey: ["admin-products", token],
    queryFn: () => adminGetProducts(token),
    enabled: !!token,
  });

  // Auto-generate ID in create mode when products load
  useEffect(() => {
    if (!editId && allProducts?.data) {
      setForm((f) => ({ ...f, id: generateNextId(f.category, allProducts.data) }));
    }
  }, [allProducts, editId]);

  // Fill form when editing
  useEffect(() => {
    if (editId && allProducts?.data) {
      const p = allProducts.data.find((x) => x.id === editId);
      if (p) {
        setForm({
          id: p.id,
          category: p.category || "perfumes",
          name: p.en_name || p.ar_name || "",
          price: p.en_price ?? p.ar_price ?? "",
          quantity: p.quantity ?? "",
          color: p.en_color || p.ar_color || "",
          sizes: Array.isArray(p.sizes) ? p.sizes.join(", ") : (p.sizes || ""),
          gender: "",
          top_notes: "",
          mid_notes: "",
          base_notes: "",
          desc: p.en_desc || p.ar_desc || "",
          image: p.image || "",
        });
        setImgPreview(p.image || "");
        setSubcatPath([p.sub_category, p.sub_category_2, p.sub_category_3].filter(Boolean));
      }
    }
  }, [editId, allProducts]);

  function onCategoryChange(cat) {
    if (editId) return;
    const nextId = allProducts?.data ? generateNextId(cat, allProducts.data) : "";
    setForm((f) => ({ ...f, category: cat, id: nextId }));
    setSubcatPath([]);
  }

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  // Image file upload
  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const localUrl = URL.createObjectURL(file);
    setImgPreview(localUrl);
    setFileInfo({ name: file.name });
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/admin/upload", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      const json = await res.json();
      if (json.url) {
        setForm((f) => ({ ...f, image: json.url }));
        setImgPreview(json.url);
        URL.revokeObjectURL(localUrl);
      }
    } catch {
      toast("Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const clearFile = () => {
    if (fileInputRef.current) fileInputRef.current.value = "";
    setFileInfo(null);
    setForm((f) => ({ ...f, image: "" }));
    setImgPreview("");
  };

  const handleUrlChange = (url) => {
    setForm((f) => ({ ...f, image: url }));
    setImgPreview(url);
  };

  const handleAutoDesc = () => {
    const name = form.name || (descLang === "ar" ? "هذا العطر" : "this fragrance");
    const g = form.gender;
    const top = form.top_notes.trim();
    const mid = form.mid_notes.trim();
    const base = form.base_notes.trim();

    const templates = {
      ar: {
        openings: {
          men: [
            `${name} — عطر يليق بالرجل الذي يصنع حضوره دون أن يقول كلمة.`,
            `من قلب الأناقة الشرقية، يأتي ${name} ليكون توقيعك الشخصي الذي لا يُنسى.`,
            `${name} ليس مجرد عطر — هو حضور يسبقك ويبقى بعدك في كل مكان تدخله.`,
            `صُمّم ${name} للرجل الذي يختار بعناية، ولا يرضى إلا بما يعكس شخصيته الحقيقية.`,
            `لأن الرجل الحقيقي يُعرف برائحته قبل اسمه — ${name} هو توقيعك الصامت.`,
            `${name} يتحدث عنك حين تصمت، ويُكمل شخصيتك حين تكون في أوجها.`,
            `في ${name} ستجد ما يعكس قوتك الهادئة وأناقتك الطبيعية التي لا تحتاج إلى مجهود.`,
            `بُني ${name} لرجل لا يتبع الموضة، بل يصنعها.`,
            `${name} — عطر يجمع بين الجرأة والرقي في توازن لا يتقنه إلا القليلون.`,
            `لا يُكرّر ${name} نفسه على أي جلد، لأنه يتكيّف مع من يرتديه ويصبح جزءاً منه.`,
            `${name} ليس للجميع — هو لمن يعرف قيمة التفصيل ولا يتنازل عنه.`,
            `في عالم مليء بالصخب، ${name} هو سكينتك الفارهة التي لا تُشبه أحداً.`,
          ],
          women: [
            `${name} — عطر يحكي قصة أنثى تعرف قيمتها ولا تحتاج إلى إثبات.`,
            `برقة الأزهار وعمق الخشب، ${name} يُجسّد أناقةً تُحسّ ولا توصف.`,
            `${name} هو ذلك السحر الذي يبقى في الذاكرة طويلاً بعد أن تُغادري.`,
            `لأن المرأة الراقية تختار ما يعكس روحها لا ما يُملى عليها — ${name} خُلق لك.`,
            `${name} ليس عطراً فحسب — هو شعور تحمليه معكِ أينما ذهبتِ.`,
            `رشّة واحدة من ${name} تكفي لتقول كل ما تريدين قوله دون أن تنطقي بحرف.`,
            `${name} يمنحكِ ذلك الغموض المحبّب الذي يجعل من يلتقيكِ يتساءل عن سرّ سحرك.`,
            `صُنع ${name} لتلك الأنثى التي تتركها الأماكن تُفتقدها حين تغادر.`,
            `${name} — نسمة من ثقة وجرأة ورقة في آنٍ واحد، تماماً كما أنتِ.`,
            `حين يُصبح العطر جزءاً من هويّتك، يُصبح ${name} اسمك الثاني.`,
            `${name} يُحرّك مشاعر من حولك قبل أن تُقولي كلمة أو تُطلقي ابتسامة.`,
            `للمرأة التي تحمل في روحها فخامة لا تُشترى — ${name} يُكمل ما بدأته.`,
          ],
          unisex: [
            `${name} — تجربة عطرية تتخطى الحدود وتمسّ الروح مباشرةً.`,
            `لا قيود ولا حواجز، ${name} يختار من يستحق الفرادة ويرفض الاعتيادي.`,
            `${name} وُلد لأولئك الذين يرفضون التصنيف ويبحثون عن الاستثنائي.`,
            `للروح الحرة التي تعرف ما تريد — ${name} هو الإجابة.`,
            `${name} يتجاوز الأعراف ليصل إلى ما هو أهم — الشعور الحقيقي.`,
            `لا هوية محددة تقيّد ${name}، بل هو يتشكّل وفق هوية من يرتديه.`,
            `${name} لمن يؤمن أن الأناقة ليست نوعاً، بل أسلوب حياة.`,
            `يجمع ${name} ما بين القوة والرقة في معادلة مثالية لكل من يبحث عن التوازن.`,
            `${name} — حين يكون العطر تعبيراً عن الروح لا عن النوع.`,
            `لأن الجمال الحقيقي لا يحدّه جنس ولا قيد — ${name} هو حريتك المُعطّرة.`,
            `${name} صُنع لمن يتجاوز التوقعات ويصنع قواعده بنفسه.`,
            `تجد في ${name} ما يشبه شخصيتك تماماً: معقد، ساحر، ولا يُنسى.`,
          ],
          default: [
            `${name} — عطر استثنائي من بيت TIBR، صُنع ليكتمل به أسلوبك.`,
            `${name} يجمع بين الأصالة والفخامة في كل رذاذة، ليصبح جزءاً لا يُنسى من هويّتك.`,
            `من بيت TIBR يأتي ${name}، عطر يحمل في طياته عبق التراث وروح العصر.`,
            `${name} — حين تلتقي الجودة الحقيقية بالذوق الرفيع في زجاجة واحدة.`,
            `لكل شخص عطر يصنع له هويته — و${name} هو ذلك العطر.`,
            `${name} ليس مجرد إضافة لروتينك اليومي، بل هو الفارق الذي يصنع الأثر.`,
            `في ${name} تختبر ما تعنيه الفخامة الحقيقية، تلك التي لا تصرخ بل تُهمس.`,
            `صُنع ${name} لمن يُدرك أن التفاصيل الصغيرة هي ما يصنع الفارق الكبير.`,
            `${name} — خلاصة حرفية ومحبة وشغف بفن العطور في كل قطرة.`,
            `تجربة ${name} تبدأ من أول رشّة وتتعمق مع الوقت لتصبح جزءاً منك.`,
            `لا يُشبه ${name} ما اعتدت عليه — وهذا بالضبط ما يجعله لا يُنسى.`,
            `${name} من TIBR — حيث تُصنع العطور بعناية بالغة لتُرافقك في أهم لحظاتك.`,
          ],
        },
        notes: [
          (t, m, b) => { const p = []; if (t) p.push(`تنفتح رحلته بـ${t}`); if (m) p.push(`ثم تتكشّف ${m} في قلبه بدفء وعمق`); if (b) p.push(`ليختتم بقاعدة ${b} الفاخرة التي تلتصق بالجلد طويلاً`); return p.join("، ") + (p.length ? "." : ""); },
          (t, m, b) => { const p = []; if (t) p.push(`أولى لمساته ${t} المنعشة`); if (m) p.push(`يتبعها قلب من ${m} يملأ الحواس`); if (b) p.push(`والقاعدة من ${b} التي تبقى أثراً راسخاً على الجلد`); return p.join("، ") + (p.length ? "." : ""); },
          (t, m, b) => { const p = []; if (t) p.push(`يبدأ بطاقة ${t} التي توقظ الحواس`); if (m) p.push(`وفي منتصف رحلته تسطع ${m} بكل بهائها`); if (b) p.push(`قبل أن تستقر ${b} الثمينة على جلدك كأثر لا يُنسى`); return p.join("، ") + (p.length ? "." : ""); },
          (t, m, b) => { const p = []; if (t) p.push(`${t} هي بداية قصته`); if (m) p.push(`و${m} هي مقطعه الأكثر إثارةً`); if (b) p.push(`أما ${b} فهي الخاتمة التي تجعلك لا تنساه`); return p.join("، ") + (p.length ? "." : ""); },
          (t, m, b) => { const p = []; if (t) p.push(`ينطلق برشاقة ${t}`); if (m) p.push(`يتعمق بـ${m} الساحرة التي تسكن الوجدان`); if (b) p.push(`ويختم بعناق ${b} الدافئ الذي يمنحك الثقة`); return p.join("، ") + (p.length ? "." : ""); },
          (t, m, b) => { const p = []; if (t) p.push(`في أعلاه ${t} التي تأسر الأنفاس من اللحظة الأولى`); if (m) p.push(`في وسطه ${m} بكل ما تحمله من روعة`); if (b) p.push(`وفي قاعه ${b} تمنحه ثقلاً راقياً لا يُضاهى`); return p.join("، ") + (p.length ? "." : ""); },
        ],
        sizes: (s) => `متوفر في: ${s}.`,
        closings: [
          "من TIBR — لأنك تستحق عطراً بمستوى طموحك.",
          "صُنع في مصر، بروح تتجاوز الحدود.",
          "لأن العطر الحقيقي لا يُشترى، بل يُختار.",
          "من وحي التراث المصري العريق، يصل إليك اليوم بلمسة فخامة معاصرة.",
          "تجربة عطرية لن تنساها، وعطر لن يغفله من حولك أينما ذهبت.",
          "TIBR — أصالة لا تتنازل عن الفخامة.",
          "اختر ما يعكسك، اختر TIBR.",
          "لأن أفضل لحظاتك تستحق أفضل عطر.",
          "من قلب مصر إلى حواسك — هذا هو TIBR.",
          "كل زجاجة حكاية، وحكايتك تبدأ من هنا.",
          "TIBR — حيث يتحوّل العطر إلى هوية.",
          "ليس للجميع، للمميّزين فحسب.",
          "صُنع بشغف، ليُرتدى بفخر.",
          "تراث عريق في زجاجة معاصرة — هذا هو وعد TIBR.",
          "عطر واحد يكفي ليقول من أنت دون أن تنطق بكلمة.",
          `الفخامة الحقيقية لا تُصرخ — هي تُهمس، وهذا ما يفعله ${name}.`,
          "لأن الذين يتذكرونك يتذكرون رائحتك أولاً.",
          "TIBR — لأن الأصالة ليست ماضياً، هي أسلوب حياة.",
        ],
      },
      en: {
        openings: {
          men: [
            `${name} — a fragrance for the man who commands attention without saying a word.`,
            `From the heart of Eastern elegance, ${name} becomes your silent signature.`,
            `${name} is not just a scent — it's the presence that arrives before you do and lingers long after you leave.`,
            `Crafted for the man who chooses with intention and settles for nothing less than remarkable.`,
            `True men are remembered by their scent before their name — ${name} is yours.`,
            `${name} speaks for you when you stay silent, completing you at your finest.`,
            `In ${name}, find a reflection of your quiet strength and effortless refinement.`,
            `${name} was built for the man who doesn't follow trends — he sets them.`,
            `Bold yet refined, ${name} strikes the balance only few can wear with confidence.`,
            `${name} adapts to you, becoming something entirely your own on your skin.`,
            `Not for everyone — ${name} is for those who understand that details make the difference.`,
            `In a world full of noise, ${name} is your luxurious, unmistakable silence.`,
          ],
          women: [
            `${name} — a fragrance that tells the story of a woman who knows her worth.`,
            `Delicate florals, deep woods — ${name} embodies an elegance that is felt, not explained.`,
            `${name} is the kind of magic that stays in memory long after you've left the room.`,
            `Because a woman of taste chooses what reflects her soul — ${name} was made for you.`,
            `${name} is more than a perfume — it's a feeling you carry with you everywhere.`,
            `A single touch of ${name} says everything you want to say without uttering a word.`,
            `${name} gives you that captivating mystery that makes everyone wonder about your secret.`,
            `Made for the woman who is missed the moment she walks out the door.`,
            `Confidence, boldness, and softness all at once — ${name} is exactly who you are.`,
            `When a fragrance becomes part of your identity, ${name} becomes your second name.`,
            `${name} moves the emotions of those around you before you even speak or smile.`,
            `For the woman who carries luxury in her soul — ${name} completes what you've already begun.`,
          ],
          unisex: [
            `${name} — a fragrance experience that transcends boundaries and touches the soul directly.`,
            `No limits, no rules — ${name} chooses those who deserve to stand apart.`,
            `${name} was born for those who reject labels and seek the truly exceptional.`,
            `For the free spirit who knows what it wants — ${name} is the answer.`,
            `${name} goes beyond convention to reach what matters most — the feeling.`,
            `No fixed identity constrains ${name} — it shapes itself to the one who wears it.`,
            `${name} is for those who believe elegance is not a gender, but a way of life.`,
            `Strength and softness in perfect balance — ${name} is for those who seek both.`,
            `${name} — when a fragrance is an expression of the soul, not the gender.`,
            `Because real beauty knows no limits — ${name} is your scented freedom.`,
            `${name} was made for those who exceed expectations and write their own rules.`,
            `In ${name} you find exactly what mirrors your personality: complex, captivating, unforgettable.`,
          ],
          default: [
            `${name} — an exceptional fragrance from TIBR, crafted to complete your signature style.`,
            `${name} brings together heritage and luxury in every spritz, becoming an unforgettable part of who you are.`,
            `From the house of TIBR comes ${name}, carrying the essence of tradition and the spirit of the modern age.`,
            `${name} — where true quality meets refined taste, all in one bottle.`,
            `Every person has a scent that defines them — ${name} is yours.`,
            `${name} is not just an addition to your routine — it's the detail that makes all the difference.`,
            `In ${name}, experience what true luxury means: not loud, but unmistakably present.`,
            `Crafted for those who understand that small details create the biggest impressions.`,
            `${name} — the result of craftsmanship, passion, and a deep love for the art of perfumery.`,
            `The experience of ${name} begins with the first spritz and deepens over time to become a part of you.`,
            `${name} is unlike anything you've worn before — and that's precisely what makes it unforgettable.`,
            `${name} by TIBR — where every fragrance is made with care to accompany your most important moments.`,
          ],
        },
        notes: [
          (t, m, b) => { const p = []; if (t) p.push(`it opens with ${t}`); if (m) p.push(`then unfolds into a heart of ${m}`); if (b) p.push(`before settling into a warm base of ${b} that lingers on the skin for hours`); return p.length ? `The journey begins as ${p.join(", ")}.` : ""; },
          (t, m, b) => { const p = []; if (t) p.push(`A fresh burst of ${t} makes the first impression`); if (m) p.push(`giving way to a heart of ${m} that fills the senses`); if (b) p.push(`while ${b} anchors the dry-down with lasting depth`); return p.join(", ") + (p.length ? "." : ""); },
          (t, m, b) => { const p = []; if (t) p.push(`${t} awakens the senses on first contact`); if (m) p.push(`${m} radiates at its fullest in the heart`); if (b) p.push(`and ${b} leaves an impression that refuses to fade`); return p.join("; ") + (p.length ? "." : ""); },
          (t, m, b) => { const p = []; if (t) p.push(`${t} opens the story`); if (m) p.push(`${m} is its most compelling chapter`); if (b) p.push(`and ${b} is the closing note you won't forget`); return p.join(", ") + (p.length ? "." : ""); },
          (t, m, b) => { const p = []; if (t) p.push(`It launches with the brightness of ${t}`); if (m) p.push(`deepens through ${m} with warmth and soul`); if (b) p.push(`and closes with the embrace of ${b} that stays close to the skin`); return p.join(", ") + (p.length ? "." : ""); },
          (t, m, b) => { const p = []; if (t) p.push(`Top: ${t}`); if (m) p.push(`heart: ${m}`); if (b) p.push(`base: ${b} — a rich, grounding finish`); return p.join(" — ") + (p.length ? "." : ""); },
        ],
        sizes: (s) => `Available in: ${s}.`,
        closings: [
          "By TIBR — because you deserve a fragrance that matches your ambition.",
          "Made in Egypt, with a spirit that knows no borders.",
          "Because the right fragrance is not bought — it is chosen.",
          "Inspired by Egypt's rich heritage, reimagined for the contemporary connoisseur.",
          "A scent experience you won't forget, worn by those who refuse to go unnoticed.",
          "TIBR — where authenticity never compromises on luxury.",
          "Choose what reflects you. Choose TIBR.",
          "Because your best moments deserve your best scent.",
          "From the heart of Egypt to your senses — this is TIBR.",
          "Every bottle holds a story. Your story starts here.",
          "TIBR — where fragrance becomes identity.",
          "Not for everyone. For the discerning few.",
          "Crafted with passion. Worn with pride.",
          "Ancient heritage. Modern luxury. One promise — TIBR.",
          "One fragrance is all it takes to say who you are without saying a word.",
          `True luxury doesn't shout — it whispers. And ${name} whispers perfectly.`,
          "Because those who remember you, remember your scent first.",
          "TIBR — because authenticity is not a past, it's a way of life.",
        ],
      },
    };

    const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
    const t = templates[descLang];
    const openingList = t.openings[g] || t.openings.default;
    const paragraphs = [pick(openingList)];

    if (top || mid || base) {
      const sentence = pick(t.notes)(top, mid, base);
      if (sentence) paragraphs.push(sentence);
    }

    if (form.sizes) paragraphs.push(t.sizes(form.sizes));

    paragraphs.push(pick(t.closings));

    setForm((f) => ({ ...f, desc: paragraphs.join("\n\n") }));
  };

  const { mutate: createProduct, isPending: creating } = useMutation({
    mutationFn: (body) => adminCreateProduct(body, token),
    onSuccess: () => { toast("Product created!"); navigate("/admin"); },
    onError: (err) => toast(err.message || "Failed to create product"),
  });

  const { mutate: updateProduct, isPending: updating } = useMutation({
    mutationFn: ({ id, body }) => adminUpdateProduct(id, body, token),
    onSuccess: () => { toast("Product updated!"); navigate("/admin"); },
    onError: (err) => toast(err.message || "Failed to update product"),
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const effectivePath = getEffectivePath(form.category, subcatPath);
    const price = Number(form.price);
    const body = {
      id: form.id,
      category: form.category,
      ar_name: form.name,
      en_name: form.name,
      ar_price: price,
      en_price: price,
      quantity: Number(form.quantity) || 0,
      ar_color: form.color || null,
      en_color: form.color || null,
      sizes: form.sizes.split(",").map((s) => s.trim()).filter(Boolean),
      ar_desc: form.desc,
      en_desc: form.desc,
      image: form.image,
      sub_category: effectivePath[0] || "",
      sub_category_2: effectivePath[1] || "",
      sub_category_3: effectivePath[2] || "",
      review_avg: 0,
      review_count: 0,
    };
    if (editId) {
      updateProduct({ id: editId, body });
    } else {
      createProduct(body);
    }
  };

  if (authLoading || !user) return null;

  const isPending = creating || updating;
  const showColor = HAS_COLOR.has(form.category);

  return (
    <div className="store-container">
      <div className="admin-panel">
        <div className="admin-panel__head">
          <div>
            <p className="admin-panel__title">{editId ? "Edit product" : "New product"}</p>
            <p className="admin-panel__sub">
              {editId
                ? "Edit the product details, then save your changes."
                : "Fill in the product details, then save them to the database."}
            </p>
          </div>
          <Link className="btn btn--ghost" to="/admin">← Back to admin</Link>
        </div>

        <form className="admin-product-shell" onSubmit={handleSubmit} noValidate>
          {/* ── Left: form fields ── */}
          <div className="admin-product-form">

            {/* Identity & Attributes */}
            <div className="co-card">
              <p className="co-card__title">
                <span className="co-card__num">1</span> Identity &amp; Attributes
              </p>
              <div className="admin-form-grid">
                <div className="field">
                  <label className="field__label" htmlFor="p-cat">
                    Category <span className="field__req">*</span>
                  </label>
                  <div className="select-field">
                    <select
                      id="p-cat"
                      className="select"
                      value={form.category}
                      onChange={(e) => onCategoryChange(e.target.value)}
                      disabled={!!editId}
                    >
                      {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <svg className="select-field__chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>
                  </div>
                </div>

                <div className="field">
                  <label className="field__label" htmlFor="p-id">Product ID</label>
                  <input
                    id="p-id"
                    className="input"
                    value={form.id}
                    readOnly
                    style={{ opacity: 0.6 }}
                    title="Auto-assigned by the system"
                  />
                  <p className="field__hint">Auto-assigned based on category</p>
                </div>

                <div className="field field--full">
                  <label className="field__label" htmlFor="p-name">
                    Name <span className="field__req">*</span>
                  </label>
                  <input
                    id="p-name"
                    className="input"
                    value={form.name}
                    onChange={set("name")}
                    required
                  />
                </div>

                <SubcatChain
                  category={form.category}
                  path={subcatPath}
                  onChange={setSubcatPath}
                />

                {showColor && (
                  <div className="field field--full">
                    <label className="field__label" htmlFor="p-color">Color</label>
                    <input
                      id="p-color"
                      className="input"
                      value={form.color}
                      onChange={set("color")}
                      placeholder="Black, Red, Navy…"
                    />
                  </div>
                )}

                <div className="field field--full">
                  <label className="field__label" htmlFor="p-gender">Gender / الجنس</label>
                  <div className="select-field">
                    <select
                      id="p-gender"
                      className="select"
                      value={form.gender}
                      onChange={set("gender")}
                    >
                      <option value="">— اختر —</option>
                      <option value="men">للرجال</option>
                      <option value="women">للنساء</option>
                      <option value="unisex">للجنسين</option>
                    </select>
                    <svg className="select-field__chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>
                  </div>
                </div>

                <NotesTagInput
                  id="p-top"
                  label="Top notes / النوتات الأولى"
                  universe={subcatPath[1]}
                  value={form.top_notes}
                  onChange={(v) => setForm(f => ({ ...f, top_notes: v }))}
                  placeholder="ابحث أو اكتب نوتة…"
                  hint="مستخدمة في توليد الوصف — اضغط Enter أو فاصلة لإضافة نوتة مخصصة"
                />
                <NotesTagInput
                  id="p-mid"
                  label="Heart notes / النوتات الوسطى"
                  universe={subcatPath[1]}
                  value={form.mid_notes}
                  onChange={(v) => setForm(f => ({ ...f, mid_notes: v }))}
                  placeholder="ابحث أو اكتب نوتة…"
                />
                <NotesTagInput
                  id="p-base"
                  label="Base notes / النوتات الأساسية"
                  universe={subcatPath[1]}
                  value={form.base_notes}
                  onChange={(v) => setForm(f => ({ ...f, base_notes: v }))}
                  placeholder="ابحث أو اكتب نوتة…"
                />

                <div className="field field--full">
                  <label className="field__label" htmlFor="p-sizes">Sizes / Volumes</label>
                  <input
                    id="p-sizes"
                    className="input"
                    value={form.sizes}
                    onChange={set("sizes")}
                    placeholder="S, M, L — or — 50ml, 100ml"
                  />
                  <p className="field__hint">Separate with commas</p>
                </div>
              </div>
            </div>

            {/* Pricing & Stock */}
            <div className="co-card">
              <p className="co-card__title">
                <span className="co-card__num">2</span> Pricing &amp; Stock
              </p>
              <div className="admin-form-grid">
                <div className="field">
                  <label className="field__label" htmlFor="p-price">
                    Price (EGP) <span className="field__req">*</span>
                  </label>
                  <input
                    id="p-price"
                    className="input"
                    type="number"
                    min="0"
                    step="1"
                    value={form.price}
                    onChange={set("price")}
                    required
                  />
                </div>
                <div className="field">
                  <label className="field__label" htmlFor="p-qty">Stock qty</label>
                  <input
                    id="p-qty"
                    className="input"
                    type="number"
                    min="0"
                    step="1"
                    value={form.quantity}
                    onChange={set("quantity")}
                  />
                </div>
              </div>
            </div>

            {/* Description */}
            <div className="co-card">
              <p className="co-card__title">
                <span className="co-card__num">3</span> Description
              </p>
              <div className="field">
                <div className="ap-desc-bar">
                  <label className="field__label" htmlFor="p-desc" style={{ margin: 0 }}>
                    Product description
                  </label>
                  <div className="ap-desc-actions">
                    <div className="ap-lang-toggle">
                      <button
                        type="button"
                        className={`ap-lang-btn${descLang === "ar" ? " is-active" : ""}`}
                        onClick={() => setDescLang("ar")}
                      >عر</button>
                      <button
                        type="button"
                        className={`ap-lang-btn${descLang === "en" ? " is-active" : ""}`}
                        onClick={() => setDescLang("en")}
                      >EN</button>
                    </div>
                    <button type="button" className="ap-autogen-btn" onClick={handleAutoDesc}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
                        <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z" strokeWidth="1.5"/>
                      </svg>
                      Auto-generate
                    </button>
                  </div>
                </div>
                <textarea
                  id="p-desc"
                  className="textarea"
                  value={form.desc}
                  onChange={set("desc")}
                  rows={4}
                  placeholder="Write a description, or click Auto-generate to build one from the product details above."
                />
              </div>
            </div>

            <div className="admin-form-actions">
              <button
                className={`btn btn--primary${isPending ? " is-loading" : ""}`}
                type="submit"
                disabled={isPending}
              >
                {isPending ? "" : editId ? "Save changes" : "Create product"}
              </button>
              <Link className="btn btn--ghost" to="/admin">Cancel</Link>
            </div>
          </div>

          {/* ── Right: image sidebar ── */}
          <div>
            <div className="co-card">
              <p className="co-card__title">
                <span className="co-card__num">✦</span> Image
              </p>

              {/* Preview — click anywhere to browse */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="ap-file-hidden"
                onChange={handleFileChange}
              />
              <div
                className={`ap-preview-img${uploading ? " ap-preview-img--loading" : ""}`}
                onClick={() => !uploading && fileInputRef.current?.click()}
                role="button"
                tabIndex={0}
                aria-label="Click to upload product image"
                onKeyDown={(e) => e.key === "Enter" && !uploading && fileInputRef.current?.click()}
              >
                {imgPreview ? (
                  <img src={imgPreview} alt="Product preview" />
                ) : (
                  <>
                    <div className="ap-preview-icon" aria-hidden="true">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                        <rect x="2" y="8" width="20" height="13" rx="2" strokeWidth="1.5"/>
                        <circle cx="12" cy="14.5" r="3.5" strokeWidth="1.5"/>
                        <circle cx="12" cy="14.5" r="1.4" fill="currentColor" opacity=".4" stroke="none"/>
                        <path d="M8 8V7a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v1" strokeWidth="1.5"/>
                      </svg>
                    </div>
                    <span className="ap-preview-hint">
                      {uploading ? "Uploading…" : "Click to browse"}
                    </span>
                  </>
                )}
              </div>

              {/* File info + URL */}
              <div className="ap-img-picker">
                {fileInfo && (
                  <div className="ap-file-info">
                    <span className="ap-file-name">{fileInfo.name}</span>
                    <button type="button" className="ap-file-clear" onClick={clearFile} aria-label="Remove file">✕</button>
                  </div>
                )}

                <div className="ap-url-divider"><span>or</span></div>

                <div className="field">
                  <label className="field__label" htmlFor="p-img-url">
                    Image URL <span className="field__req">*</span>
                  </label>
                  <input
                    id="p-img-url"
                    className="input"
                    type="url"
                    value={form.image}
                    onChange={(e) => handleUrlChange(e.target.value)}
                    placeholder="https://…"
                  />
                </div>
              </div>

              <div className="ap-preview-meta">
                <div className="ap-meta-row">
                  <span className="ap-meta-key">Category</span>
                  <span className="ap-meta-val" style={{ textTransform: "capitalize" }}>{form.category}</span>
                </div>
                <div className="ap-meta-row">
                  <span className="ap-meta-key">Status</span>
                  <span style={{ fontSize: "var(--fs-xs)", color: "var(--success)" }}>● Draft</span>
                </div>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
