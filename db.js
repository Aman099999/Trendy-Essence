// Connects the website to Supabase (plain fetch, no extra libraries).
// If js/config.js is empty, the sample products in products.js are used.
// If Supabase is configured but cannot be reached, products are NOT faked: a clear message is shown.
const DB = (function () {
  const cfg = window.TE_CONFIG || {};
  const configured = !!(cfg.supabaseUrl && cfg.supabaseKey);
  const base = String(cfg.supabaseUrl || "").replace(/\/+$/, "");
  const state = {configured, source: configured ? "loading" : "sample", error: null};

  function headers() {
    const h = {"apikey": cfg.supabaseKey, "Content-Type": "application/json"};
    if (/^eyJ/.test(cfg.supabaseKey)) h.Authorization = "Bearer " + cfg.supabaseKey; // legacy anon key is a JWT
    return h;
  }
  async function request(path, options) {
    const ctl = new AbortController(), timer = setTimeout(() => ctl.abort(), 12000);
    try {
      const res = await fetch(base + path, Object.assign({headers: headers(), signal: ctl.signal}, options));
      const text = await res.text(); let body = null;
      try { body = text ? JSON.parse(text) : null; } catch (e) {}
      if (!res.ok) { const err = new Error((body && body.message) || ("Request failed (" + res.status + ")")); err.status = res.status; throw err; }
      return body;
    } finally { clearTimeout(timer); }
  }

  // Turns a database row into the shape the existing pages already use.
  function mapRow(r) {
    const avail = Array.isArray(r.available_sizes) ? r.available_sizes : [];
    const slug = r.categories && r.categories.slug;
    if (!slug) return null;
    const standard = avail.every(s => CLOTHING.includes(s));
    let sizes, unavailable = [];
    if (avail.length === 1 && avail[0] === "One size") sizes = [];
    else if (avail.length && !standard) sizes = avail.slice();
    else { sizes = CLOTHING.slice(); unavailable = CLOTHING.filter(s => !avail.includes(s)); }
    return {
      code: r.product_code, name: r.name, category: slug, price: Number(r.price_mvr),
      sizes, unavailable, description: r.description || "",
      status: avail.length ? (r.product_type === "ready_stock" ? "ready" : "preorder") : "soldout",
      featured: !!r.is_featured, added: r.created_at || "",
      isNew: r.created_at ? (Date.now() - new Date(r.created_at).getTime()) < 30 * 864e5 : false,
      images: (r.images || []).filter(u => /^https?:\/\//.test(u))
    };
  }

  async function load() {
    try {
      const rows = await request("/rest/v1/products?select=product_code,name,description,price_mvr,images,available_sizes,product_type,is_featured,created_at,categories(slug)&is_active=eq.true&order=created_at.desc");
      PRODUCTS.length = 0;
      (rows || []).map(mapRow).filter(Boolean).forEach(p => PRODUCTS.push(p));
      SAMPLE_CONTENT = false; state.source = "database";
    } catch (e) {
      PRODUCTS.length = 0; SAMPLE_CONTENT = false; state.source = "error"; state.error = e;
      console.error("Could not load products:", e);
      const d = document.createElement("div"); d.className = "notice"; d.style.background = "#8b2b2b";
      d.textContent = "We could not load the products right now. Please refresh the page or try again later.";
      document.body.prepend(d);
    }
  }
  const ready = configured ? load() : Promise.resolve();

  // Ready for the checkout and tracking pages (built in the next step).
  async function createOrder(customer, items) {
    return request("/rest/v1/rpc/create_order", {method: "POST", body: JSON.stringify({
      p_name: customer.name, p_phone: customer.phone, p_island: customer.island, p_address: customer.address,
      p_items: items.map(i => ({code: i.code, size: i.size, qty: i.qty}))})});
  }
  const trackOrder = (orderNumber, phone) => request("/rest/v1/rpc/track_order", {method: "POST", body: JSON.stringify({p_order_number: orderNumber, p_phone: phone})});

  return {state, ready, createOrder, trackOrder};
})();
