// PRODUCT LIST. Edit this file to change products.
// Everything below is SAMPLE content for testing. None of it is real stock.
// When you add your real products, change SAMPLE_CONTENT to false (the "Sample" labels will disappear).
//
// For each product:
//   code         unique product code (no two products may share a code)
//   category     tops, dresses, skirts, trousers, skincare or beauty
//   price        price in MVR (a number, no commas)
//   sizes        sizes you sell, e.g. ["S","M","L","XL","XXL"]. Use [] for one-size items.
//   unavailable  (optional) sizes that are out of stock, e.g. ["XXL"]. They show crossed out.
//   status       "preorder", "ready" or "soldout"
//   added        date added, YEAR-MONTH-DAY. Used for "Newest first".
//   featured / isNew   true to show on the homepage
// Photos: save them in images/products/ named CODE-1.jpg, CODE-2.jpg, CODE-3.jpg, CODE-4.jpg
// (example: images/products/SAMPLE-T01-1.jpg). Portrait photos, about 1200 x 1600, work best.
let SAMPLE_CONTENT = true;
const CATEGORIES = [
  {slug:"tops", name:"Tops"}, {slug:"dresses", name:"Dresses"}, {slug:"skirts", name:"Skirts"},
  {slug:"trousers", name:"Trousers"}, {slug:"skincare", name:"Skincare"}, {slug:"beauty", name:"Beauty"}
];
const CLOTHING = ["S","M","L","XL","XXL"];
const PRODUCTS = [
  {code:"SAMPLE-T01", name:"Linen Wrap Top", category:"tops", price:220, sizes:CLOTHING, unavailable:["XXL"], status:"preorder", featured:true, isNew:true, added:"2026-11-08", description:"A relaxed wrap top in a soft linen blend. Sample description."},
  {code:"SAMPLE-T02", name:"Ribbed Knit Top", category:"tops", price:190, sizes:CLOTHING, status:"ready", added:"2026-10-20", description:"A fitted ribbed top for everyday wear. Sample description."},
  {code:"SAMPLE-T03", name:"Puff Sleeve Blouse", category:"tops", price:260, sizes:CLOTHING, unavailable:["S"], status:"preorder", added:"2026-10-05", description:"A light blouse with softly gathered sleeves. Sample description."},
  {code:"SAMPLE-D01", name:"Satin Midi Dress", category:"dresses", price:420, sizes:CLOTHING, status:"preorder", featured:true, isNew:true, added:"2026-11-07", description:"A flowing midi dress with a gentle sheen. Sample description."},
  {code:"SAMPLE-D02", name:"Floral Wrap Dress", category:"dresses", price:380, sizes:CLOTHING, status:"preorder", added:"2026-10-15", description:"A wrap dress in a delicate print. Sample description."},
  {code:"SAMPLE-D03", name:"Pleated Maxi Dress", category:"dresses", price:450, sizes:CLOTHING, status:"soldout", added:"2026-09-28", description:"A long pleated dress. Sample description."},
  {code:"SAMPLE-K01", name:"Pleated Midi Skirt", category:"skirts", price:240, sizes:CLOTHING, status:"preorder", isNew:true, added:"2026-11-05", description:"A swishy pleated skirt that sits at the waist. Sample description."},
  {code:"SAMPLE-K02", name:"Linen A-line Skirt", category:"skirts", price:210, sizes:CLOTHING, unavailable:["XL","XXL"], status:"preorder", added:"2026-10-10", description:"A simple A-line skirt in breathable linen. Sample description."},
  {code:"SAMPLE-R01", name:"Wide Leg Trousers", category:"trousers", price:290, sizes:CLOTHING, status:"preorder", isNew:true, added:"2026-11-03", description:"High-waisted trousers with a wide, easy leg. Sample description."},
  {code:"SAMPLE-R02", name:"Tailored Straight Trousers", category:"trousers", price:310, sizes:CLOTHING, status:"ready", added:"2026-10-01", description:"Smart straight-leg trousers. Sample description."},
  {code:"SAMPLE-S01", name:"Hydrating Face Serum", category:"skincare", price:240, sizes:[], status:"preorder", featured:true, isNew:true, added:"2026-11-06", description:"A lightweight daily serum. Sample description."},
  {code:"SAMPLE-S02", name:"Daily Gentle Cleanser", category:"skincare", price:150, sizes:[], status:"ready", added:"2026-10-12", description:"A mild cleanser for daily use. Sample description."},
  {code:"SAMPLE-S03", name:"Day Moisturiser", category:"skincare", price:210, sizes:[], status:"preorder", added:"2026-09-30", description:"A light moisturiser for daytime. Sample description."},
  {code:"SAMPLE-B01", name:"Soft Rose Lip Tint", category:"beauty", price:110, sizes:[], status:"preorder", featured:true, isNew:true, added:"2026-11-04", description:"A sheer, buildable lip colour. Sample description."},
  {code:"SAMPLE-B02", name:"Nude Blush Palette", category:"beauty", price:170, sizes:[], status:"preorder", added:"2026-10-18", description:"Soft neutral blush shades. Sample description."},
  {code:"SAMPLE-B03", name:"Volume Mascara", category:"beauty", price:95, sizes:[], status:"ready", added:"2026-10-02", description:"A lengthening black mascara. Sample description."}
];
const esc = s => String(s).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const money = n => "MVR " + Number(n).toLocaleString("en-US");
const STATUS_LABEL = {preorder:"Preorder", ready:"Ready stock", soldout:"Sold out"};
const findProduct = code => PRODUCTS.find(p => p.code === code);
const categoryName = slug => (CATEGORIES.find(c => c.slug === slug) || {}).name || "";
const availableSizes = p => p.sizes.filter(s => !(p.unavailable || []).includes(s));
const isSoldOut = p => p.status === "soldout" || (p.sizes.length > 0 && availableSizes(p).length === 0);
const productImages = (p, n = 2) => (p.images && p.images.length ? p.images.slice(0, n) : Array.from({length:n}, (_, i) => `images/products/${p.code}-${i+1}.jpg`));
// Safety check: every product code must be unique
(function () {
  const seen = {}, dups = [];
  PRODUCTS.forEach(p => { if (seen[p.code]) dups.push(p.code); seen[p.code] = 1; });
  if (dups.length) {
    console.error("Duplicate product codes: " + dups.join(", "));
    document.addEventListener("DOMContentLoaded", () => { const d = document.createElement("div"); d.className = "notice"; d.style.background = "#8b2b2b"; d.textContent = "Warning: duplicate product codes in products.js: " + dups.join(", "); document.body.prepend(d); });
  }
})();
