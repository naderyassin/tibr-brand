/* -------------------------------------------------------------
 * STORE / CART.JS — Cart page
 * Renders the localStorage cart, qty stepper, remove, summary.
 * Depends on chrome.js (window.RB).
 * ------------------------------------------------------------- */
(function () {
  "use strict";
  const root = document.getElementById("cart-root");
  if (!root || !window.RB) return;

  const icons = {
    minus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M5 12h14" stroke-linecap="round"/></svg>',
    plus:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M12 5v14M5 12h14" stroke-linecap="round"/></svg>',
    trash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M5 7h14M9 7V5h6v2M7 7l1 12h8l1-12" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    bag:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3" aria-hidden="true"><path d="M6 8h12l-1 12H7L6 8z" stroke-linejoin="round"/><path d="M9 8V6.5a3 3 0 0 1 6 0V8" stroke-linecap="round"/></svg>'
  };

  function nameOf(it) { return it.en_name || it.ar_name || ""; }

  function renderLine(it) {
    return `
    <div class="cart-line" data-id="${it.id}" data-size="${it.size}">
      <img class="cart-line__thumb" src="${it.image}" alt="${nameOf(it)}">
      <div class="cart-line__info">
        <p class="cart-line__name">${nameOf(it)}</p>
        <p class="cart-line__attr">${it.size ? "Size: " + it.size : ""}</p>
        <button class="cart-line__remove" type="button" data-remove>${icons.trash}Remove</button>
      </div>
      <div class="cart-line__end">
        <div class="stepper" role="group" aria-label="Quantity">
          <button class="stepper__btn" type="button" data-dec ${it.qty <= 1 ? "disabled" : ""} aria-label="Decrease">${icons.minus}</button>
          <span class="stepper__value">${String(it.qty)}</span>
          <button class="stepper__btn" type="button" data-inc aria-label="Increase">${icons.plus}</button>
        </div>
        <span class="cart-line__price">${RB.formatPrice(it.price * it.qty)}</span>
      </div>
    </div>`;
  }

  function render() {
    const items = RB.cart.items();

    if (!items.length) {
      root.innerHTML = `
      <div class="rb-empty">
        <span class="rb-empty__icon">${icons.bag}</span>
        <h2 class="rb-empty__title">Your cart is empty</h2>
        <p class="rb-empty__text">Start with the curated fragrance collection.</p>
        <a class="btn btn--primary" href="/shop/perfumes">Browse perfumes</a>
      </div>`;
      return;
    }

    const subtotal = RB.cart.subtotal();
    root.innerHTML = `
    <div class="cart">
      <section class="cart-lines" aria-label="Cart items">
        ${items.map(renderLine).join("")}
      </section>
      <aside class="summary" aria-label="Order summary">
        <h2 class="summary__title">Order summary</h2>
        <div class="summary__row"><span>Subtotal</span><span class="val">${RB.formatPrice(subtotal)}</span></div>
        <div class="summary__row"><span>Shipping</span><span class="val">Set at checkout</span></div>
        <div class="summary__row summary__row--total"><span>Total</span><span class="val">${RB.formatPrice(subtotal)}</span></div>
        <a class="btn btn--primary btn--block btn--lg" href="/checkout" style="margin-block-start: var(--sp-5);">Checkout</a>
        <p class="summary__note">Cash on delivery is available in every governorate.</p>
      </aside>
    </div>`;
  }

  root.addEventListener("click", (e) => {
    const line = e.target.closest(".cart-line");
    if (!line) return;
    const id = line.dataset.id, size = line.dataset.size;
    const it = RB.cart.items().find((x) => x.id === id && x.size === size);
    if (!it) return;
    if (e.target.closest("[data-inc]")) RB.cart.setQty(id, size, it.qty + 1);
    else if (e.target.closest("[data-dec]")) RB.cart.setQty(id, size, it.qty - 1);
    else if (e.target.closest("[data-remove]")) RB.cart.remove(id, size);
  });

  document.addEventListener("cartChanged", render);
  render();
})();
