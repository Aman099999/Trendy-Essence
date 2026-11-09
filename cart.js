// Shopping cart, saved in this browser (localStorage). Prices are always read from products.js.
const Cart = (function () {
  const KEY = "te_cart", MAX = 10;
  const clamp = n => Math.max(1, Math.min(MAX, n | 0));
  function read() { try { const a = JSON.parse(localStorage.getItem(KEY) || "[]"); return Array.isArray(a) ? a : []; } catch (e) { return []; } }
  function write(a) { try { localStorage.setItem(KEY, JSON.stringify(a)); updateBadge(); return true; } catch (e) { return false; } }
  function valid(i) {
    const p = findProduct(i.code);
    return p && !isSoldOut(p) && Number.isInteger(i.qty) && i.qty > 0 && (p.sizes.length ? availableSizes(p).includes(i.size) : i.size === "One size");
  }
  const items = () => read().filter(valid).map(i => ({code:i.code, size:i.size, qty:clamp(i.qty), product:findProduct(i.code)}));
  function add(code, size, qty) {
    const a = read(), f = a.find(i => i.code === code && i.size === size);
    if (f) f.qty = clamp(f.qty + qty); else a.push({code, size, qty:clamp(qty)});
    return write(a);
  }
  function setQty(code, size, qty) { const a = read(), f = a.find(i => i.code === code && i.size === size); if (f) { f.qty = clamp(qty); write(a); } }
  function changeSize(code, oldSize, newSize) {
    const a = read(), f = a.find(i => i.code === code && i.size === oldSize), g = a.find(i => i.code === code && i.size === newSize);
    if (!f || oldSize === newSize) return;
    if (g) { g.qty = clamp(g.qty + f.qty); a.splice(a.indexOf(f), 1); } else f.size = newSize;
    write(a);
  }
  const remove = (code, size) => write(read().filter(i => !(i.code === code && i.size === size)));
  const count = () => items().reduce((n, i) => n + i.qty, 0);
  const total = () => items().reduce((n, i) => n + i.qty * i.product.price, 0);
  function updateBadge() { const el = document.getElementById("cartCount"); if (el) el.textContent = count(); }
  return {items, add, setQty, changeSize, remove, count, total, updateBadge, MAX};
})();
