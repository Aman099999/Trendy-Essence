(function () {
  const page = document.body.dataset.page, $ = id => document.getElementById(id);
  if (page === "list") { const g = $("grid"); if (g) g.innerHTML = '<p class="empty">Loading products...</p>'; }
  DB.ready.then(() => { if (page === "list") initList(); else if (page === "product") initProduct(); else if (page === "cart") initCart(); });

  function initList() {
    const cat = document.body.dataset.category || "all", onlyNew = document.body.dataset.mode === "new";
    let chip = cat;
    const grid = $("grid"), count = $("count"), q = $("q"), sort = $("sort"), chips = $("chips");
    if (onlyNew) sort.value = "new";
    if (cat === "all" && !onlyNew) {
      chips.innerHTML = [{slug:"all", name:"All"}].concat(CATEGORIES).map(c => `<button type="button" class="chip" data-c="${c.slug}" aria-pressed="${c.slug === "all"}">${esc(c.name)}</button>`).join("");
      chips.addEventListener("click", e => {
        const b = e.target.closest(".chip"); if (!b) return;
        chip = b.dataset.c; chips.querySelectorAll(".chip").forEach(x => x.setAttribute("aria-pressed", x === b)); apply();
      });
    } else chips.hidden = true;
    function apply() {
      const term = q.value.trim().toLowerCase();
      const list = PRODUCTS.filter(p => (chip === "all" || p.category === chip) && (!onlyNew || p.isNew) && (!term || (p.name + " " + p.code + " " + categoryName(p.category)).toLowerCase().includes(term)));
      if (sort.value === "low") list.sort((a, b) => a.price - b.price);
      else if (sort.value === "high") list.sort((a, b) => b.price - a.price);
      else if (sort.value === "new") list.sort((a, b) => b.added.localeCompare(a.added));
      count.textContent = list.length + (list.length === 1 ? " product" : " products");
      grid.innerHTML = list.length ? list.map(productCard).join("") : '<p class="empty">No products match your search. Try another word or category.</p>';
    }
    q.addEventListener("input", apply); sort.addEventListener("change", apply); apply();
  }

  function initProduct() {
    const root = $("productRoot"), p = findProduct(new URLSearchParams(location.search).get("code"));
    if (!p) { root.innerHTML = '<div class="empty-state"><h1>Product not found</h1><p>This product may have been removed.</p><a class="btn" href="shop.html">Browse the shop</a></div>'; return; }
    document.title = p.name + " | Trendy Essence";
    const imgs = productImages(p, 4), sold = isSoldOut(p), avail = availableSizes(p);
    const note = p.status === "preorder" ? "Preorder item. Estimated delivery is about 14 days. Payment is collected when your order arrives." : "Payment is collected when your order arrives.";
    const sizeBlock = p.sizes.length
      ? `<fieldset class="field"><legend>Size</legend><div class="pills">${p.sizes.map(s => { const ok = avail.includes(s); return `<label class="pill${ok ? "" : " na"}"><input type="radio" name="size" value="${esc(s)}"${ok ? "" : " disabled"}><span>${esc(s)}${ok ? "" : '<i class="sr-only"> (not available)</i>'}</span></label>`; }).join("")}</div>${avail.length < p.sizes.length ? '<p class="pnote">Crossed-out sizes are not available.</p>' : ""}</fieldset>`
      : `<p class="field"><span class="lbl">Size</span> One size</p>`;
    root.innerHTML = `<div class="pdp">
      <div class="gallery"><div class="pimg"><span class="mono" aria-hidden="true">TE</span><img id="mainImg" src="${esc(imgs[0])}" alt="${esc(p.name)}"></div>
        <div class="thumbs">${imgs.map((s, i) => `<button type="button" class="tb" data-src="${esc(s)}" aria-label="Show photo ${i + 1}"><img src="${esc(s)}" alt="" onerror="this.parentNode.remove()"></button>`).join("")}</div></div>
      <div class="pinfo">
        <nav class="crumbs" aria-label="Breadcrumb"><a href="shop.html">Shop</a> / <a href="${p.category}.html">${esc(categoryName(p.category))}</a></nav>
        <h1>${esc(p.name)}</h1>
        <p class="pcode">Product code ${esc(p.code)}</p>
        <p class="pprice">${money(p.price)}</p>
        <span class="badge inline">${sold ? "Sold out" : STATUS_LABEL[p.status]}</span>
        ${SAMPLE_CONTENT ? '<p class="samplebar">Sample product for testing only. It is not a real item and is not available to buy.</p>' : ""}
        <p class="pdesc">${esc(p.description)}</p>
        ${sizeBlock}
        <div class="field"><span class="lbl">Quantity</span>
          <div class="qty"><button type="button" id="dec" aria-label="Decrease quantity">&minus;</button><input id="qtyIn" type="number" min="1" max="${Cart.MAX}" value="1" aria-label="Quantity"><button type="button" id="inc" aria-label="Increase quantity">+</button></div></div>
        <p id="msg" class="msg" role="alert"></p>
        <button type="button" class="btn wide" id="addBtn"${sold ? " disabled" : ""}>${sold ? "Sold out" : "Add to cart"}</button>
        <p class="pnote">${note}</p></div></div>`;
    const main = $("mainImg"), qty = $("qtyIn"), msg = $("msg");
    main.onload = () => main.style.visibility = "visible"; main.onerror = () => main.style.visibility = "hidden";
    root.querySelectorAll(".tb").forEach(b => b.addEventListener("click", () => { main.src = b.dataset.src; }));
    const setQ = n => qty.value = Math.max(1, Math.min(Cart.MAX, n || 1));
    $("dec").onclick = () => setQ(+qty.value - 1); $("inc").onclick = () => setQ(+qty.value + 1);
    qty.onchange = () => setQ(parseInt(qty.value, 10));
    $("addBtn").onclick = () => {
      let size = "One size";
      if (p.sizes.length) { const c = root.querySelector('input[name="size"]:checked'); if (!c) { msg.className = "msg err"; msg.textContent = "Please choose a size."; return; } size = c.value; }
      if (Cart.add(p.code, size, parseInt(qty.value, 10) || 1)) { msg.className = "msg ok"; msg.innerHTML = 'Added to your cart. <a href="cart.html">View cart</a>'; }
      else { msg.className = "msg err"; msg.textContent = "Your browser is blocking the cart. Turn off private browsing and try again."; }
    };
  }

  function initCart() {
    const root = $("cartRoot");
    const row = i => { const p = i.product, im = productImages(p, 1)[0], link = "product.html?code=" + encodeURIComponent(i.code);
      const size = p.sizes.length
        ? `<label class="sizelbl">Size <select class="sel" data-act="size" aria-label="Size for ${esc(p.name)}">${availableSizes(p).map(s => `<option${s === i.size ? " selected" : ""}>${esc(s)}</option>`).join("")}</select></label>`
        : "One size";
      return `<div class="row" data-code="${esc(i.code)}" data-size="${esc(i.size)}">
        <a class="rthumb" href="${link}"><span class="mono" aria-hidden="true">TE</span><img src="${esc(im)}" alt="" onerror="this.remove()"></a>
        <div class="rinfo"><a class="rname" href="${link}">${esc(p.name)}</a>
          <p>${esc(p.code)} &middot; ${money(p.price)} each</p>
          <p>${size}</p>
          <div class="qty small"><button type="button" data-act="dec" aria-label="Decrease quantity"${i.qty <= 1 ? " disabled" : ""}>&minus;</button><span aria-live="polite">${i.qty}</span><button type="button" data-act="inc" aria-label="Increase quantity"${i.qty >= Cart.MAX ? " disabled" : ""}>+</button></div>
          <button type="button" class="linkbtn" data-act="remove">Remove</button></div>
        <p class="rtotal">${money(p.price * i.qty)}</p></div>`; };
    function draw() {
      const items = Cart.items();
      if (!items.length) { root.innerHTML = '<div class="empty-state"><p>Your cart is empty.</p><a class="btn" href="shop.html">Start shopping</a></div>'; return; }
      root.innerHTML = `<div class="cart-grid"><div class="cart-list">${items.map(row).join("")}</div>
        <aside class="summary"><h2>Order summary</h2>
          <p class="sumline"><span>Items</span><span>${Cart.count()}</span></p>
          <p class="sumline"><span>Subtotal</span><span>${money(Cart.total())}</span></p>
          <p class="sumline total"><span>Total</span><span>${money(Cart.total())}</span></p>
          <p class="pnote">Delivery charges, if any, are not included. Payment is collected when your order arrives. Preorder items are delivered in about 14 days.</p>
          ${SAMPLE_CONTENT ? '<p class="samplebar">These are sample items for testing.</p>' : ""}
          <a class="btn wide" href="checkout.html">Proceed to checkout</a>
          <a class="linkbtn" href="shop.html">Continue shopping</a></aside></div>`;
    }
    const find = el => { const r = el.closest(".row"); return {code:r.dataset.code, size:r.dataset.size}; };
    root.addEventListener("click", e => {
      const b = e.target.closest("button[data-act]"); if (!b) return;
      const {code, size} = find(b), it = Cart.items().find(x => x.code === code && x.size === size);
      if (b.dataset.act === "remove") Cart.remove(code, size); else if (it) Cart.setQty(code, size, it.qty + (b.dataset.act === "inc" ? 1 : -1));
      draw();
    });
    root.addEventListener("change", e => { const s = e.target.closest("select[data-act]"); if (!s) return; const {code, size} = find(s); Cart.changeSize(code, size, s.value); draw(); });
    draw();
  }
})();
