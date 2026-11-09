function productCard(p) {
  const imgs = productImages(p);
  return `<a class="card${isSoldOut(p) ? " soldout" : ""}" href="product.html?code=${encodeURIComponent(p.code)}">
    <div class="thumb"><span class="mono" aria-hidden="true">TE</span>
      <img src="${esc(imgs[0])}" alt="${esc(p.name)}" loading="lazy" onerror="this.remove()">
      ${imgs[1] ? `<img class="alt-img" src="${esc(imgs[1])}" alt="" loading="lazy" onerror="this.remove()">` : ""}
      <span class="badge">${isSoldOut(p) ? "Sold out" : SAMPLE_CONTENT ? "Sample" : STATUS_LABEL[p.status]}</span></div>
    <div class="info"><h3>${esc(p.name)}</h3><p class="code">${esc(p.code)}</p><p class="price">${money(p.price)}</p></div></a>`;
}
const homeFill = (id, test) => { const el = document.getElementById(id); if (el) el.innerHTML = PRODUCTS.filter(test).slice(0, 4).map(productCard).join(""); };
DB.ready.then(() => {
  homeFill("featuredGrid", p => p.featured);
  homeFill("newGrid", p => p.isNew);
  if (!SAMPLE_CONTENT) document.querySelectorAll(".sample-note").forEach(e => e.remove());
  Cart.updateBadge();
});

// Category tiles: use a photo from images/categories/ when one exists
document.querySelectorAll(".cat[data-img]").forEach(el => {
  const im = new Image();
  im.onload = () => { el.style.setProperty("--img", `url("${el.dataset.img}")`); el.classList.add("photo"); };
  im.src = el.dataset.img;
});

const menuBtn = document.getElementById("menuBtn"), nav = document.getElementById("nav");
menuBtn.addEventListener("click", () => { const open = nav.classList.toggle("open"); menuBtn.setAttribute("aria-expanded", open); });
document.getElementById("year").textContent = new Date().getFullYear();
