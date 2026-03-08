(function () {
  const CURRENCY = "USD";

  const money = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: CURRENCY,
  });

  function getProducts() {
    return window.BLOOM_PRODUCTS || [];
  }

  function trackEvent(name, payload = {}) {
    const event = { event: name, ts: new Date().toISOString(), ...payload };
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push(event);
    window.dispatchEvent(new CustomEvent("bloom:analytics", { detail: event }));
  }

  function getProductById(id) {
    return getProducts().find((p) => p.id === id);
  }

  function getCart() {
    try {
      return JSON.parse(localStorage.getItem("bloom_cart") || "[]");
    } catch {
      return [];
    }
  }

  function saveCart(cart) {
    localStorage.setItem("bloom_cart", JSON.stringify(cart));
    updateCartBadge();
  }

  function getOrderRequests() {
    try {
      return JSON.parse(localStorage.getItem("bloom_order_requests") || "[]");
    } catch {
      return [];
    }
  }

  function addToCart(productId, qty = 1) {
    const cart = getCart();
    const existing = cart.find((i) => i.productId === productId);
    if (existing) existing.qty += qty;
    else cart.push({ productId, qty });
    saveCart(cart);
    const product = getProductById(productId);
    trackEvent("add_to_cart", { productId, qty, price: product?.price || 0, name: product?.name || "" });
  }

  function setCartQty(productId, qty) {
    const cart = getCart();
    const item = cart.find((i) => i.productId === productId);
    if (!item) return;
    item.qty = qty;
    const next = cart.filter((i) => i.qty > 0);
    saveCart(next);
  }

  function removeFromCart(productId) {
    saveCart(getCart().filter((i) => i.productId !== productId));
  }

  function cartCount() {
    return getCart().reduce((acc, item) => acc + item.qty, 0);
  }

  function cartSummary() {
    const rows = getCart()
      .map((item) => {
        const product = getProductById(item.productId);
        if (!product) return null;
        return {
          ...item,
          product,
          subtotal: product.price * item.qty,
        };
      })
      .filter(Boolean);

    const subtotal = rows.reduce((acc, r) => acc + r.subtotal, 0);
    const shipping = rows.length ? 4.99 : 0;
    const total = subtotal + shipping;

    return { rows, subtotal, shipping, total };
  }

  function updateCartBadge() {
    document.querySelectorAll("[data-cart-count]").forEach((el) => {
      el.textContent = cartCount();
    });
  }

  function stars(rating) {
    const rounded = Math.round(rating);
    return "★".repeat(rounded) + "☆".repeat(5 - rounded);
  }

  function productCard(p) {
    return `<article class="product-card">
      <a href="product.html?id=${encodeURIComponent(p.id)}" class="product-image-wrap">
        <img src="${p.image}" alt="${p.name}" loading="lazy" class="product-image" />
      </a>
      <div class="product-body">
        <p class="meta-row">${p.category} · ${p.skinType.join(", ")}</p>
        <h3><a href="product.html?id=${encodeURIComponent(p.id)}">${p.name}</a></h3>
        <p class="short">${p.short}</p>
        <p class="price">${money.format(p.price)}</p>
        <p class="rating">${stars(p.rating)} <span>(${p.reviews})</span></p>
        <button class="btn small" data-add="${p.id}" ${p.stock === 0 ? "disabled" : ""}>
          ${p.stock === 0 ? "Out of stock" : "Add to cart"}
        </button>
      </div>
    </article>`;
  }

  function wireAddToCart(root = document) {
    root.querySelectorAll("[data-add]").forEach((btn) => {
      btn.addEventListener("click", () => {
        addToCart(btn.dataset.add, 1);
        btn.textContent = "Added ✓";
        setTimeout(() => (btn.textContent = "Add to cart"), 900);
      });
    });
  }

  function initShopPage() {
    const mount = document.getElementById("shop-grid");
    if (!mount) return;

    const q = document.getElementById("search");
    const cat = document.getElementById("category");
    const sort = document.getElementById("sort");

    const render = () => {
      let items = [...getProducts()];
      const qv = (q.value || "").trim().toLowerCase();
      const cv = cat.value;
      const sv = sort.value;

      if (qv) {
        items = items.filter(
          (p) =>
            p.name.toLowerCase().includes(qv) ||
            p.short.toLowerCase().includes(qv) ||
            p.concern.join(" ").toLowerCase().includes(qv) ||
            p.ingredients.join(" ").toLowerCase().includes(qv)
        );
      }

      if (cv !== "all") items = items.filter((p) => p.category === cv);

      if (sv === "price-asc") items.sort((a, b) => a.price - b.price);
      if (sv === "price-desc") items.sort((a, b) => b.price - a.price);
      if (sv === "rating") items.sort((a, b) => b.rating - a.rating);

      mount.innerHTML = items.length
        ? items.map(productCard).join("")
        : `<p class="empty">No products matched your filters.</p>`;
      wireAddToCart(mount);
    };

    [q, cat, sort].forEach((el) => el && el.addEventListener("input", render));
    render();
  }

  function initProductPage() {
    const mount = document.getElementById("product-view");
    if (!mount) return;
    const id = new URLSearchParams(window.location.search).get("id");
    const p = getProductById(id);

    if (!p) {
      mount.innerHTML = `<p class="empty">Product not found. <a href="shop.html">Back to shop</a></p>`;
      return;
    }

    mount.innerHTML = `<div class="product-layout">
      <img src="${p.image}" alt="${p.name}" class="product-hero-image" />
      <div>
        <p class="meta-row">${p.category} · ${p.skinType.join(", ")}</p>
        <h1>${p.name}</h1>
        <p class="short">${p.short}</p>
        <p>${p.details || ""}</p>
        <p class="price">${money.format(p.price)}</p>
        <p class="rating">${stars(p.rating)} <span>(${p.reviews} reviews)</span></p>
        <ul class="facts">
          <li><strong>Concerns:</strong> ${p.concern.join(", ")}</li>
          <li><strong>Ingredients:</strong> ${p.ingredients.join(", ")}</li>
          <li><strong>Stock:</strong> ${p.stock > 0 ? p.stock + " units" : "Out of stock"}</li>
          <li><strong>Cruelty Free:</strong> ${p.crueltyFree ? "Yes" : "No"}</li>
          <li><strong>Vegan:</strong> ${p.vegan ? "Yes" : "No"}</li>
        </ul>
        <button class="btn" data-add="${p.id}" ${p.stock === 0 ? "disabled" : ""}>
          ${p.stock === 0 ? "Out of stock" : "Add to cart"}
        </button>
      </div>
    </div>`;

    wireAddToCart(mount);
  }

  function initCartPage() {
    const mount = document.getElementById("cart-view");
    if (!mount) return;

    const render = () => {
      const summary = cartSummary();

      if (!summary.rows.length) {
        mount.innerHTML = `<p class="empty">Your cart is empty. <a href="shop.html">Browse products</a>.</p>`;
        return;
      }

      mount.innerHTML = `
        <div class="cart-layout">
          <div>
            ${summary.rows
              .map(
                (r) => `<article class="cart-item">
                  <img src="${r.product.image}" alt="${r.product.name}" />
                  <div>
                    <h3>${r.product.name}</h3>
                    <p>${money.format(r.product.price)} each</p>
                    <label>Qty
                      <input type="number" min="1" value="${r.qty}" data-qty="${r.productId}" />
                    </label>
                    <button class="link-btn" data-remove="${r.productId}">Remove</button>
                  </div>
                  <p class="subtotal">${money.format(r.subtotal)}</p>
                </article>`
              )
              .join("")}
          </div>
          <aside class="order-box">
            <h3>Order Request Summary</h3>
            <p>Subtotal: <strong>${money.format(summary.subtotal)}</strong></p>
            <p>Shipping: <strong>${money.format(summary.shipping)}</strong></p>
            <p>Total: <strong>${money.format(summary.total)}</strong></p>

            <form id="order-form" class="order-form">
              <input required name="name" placeholder="Full Name" />
              <input required name="email" type="email" placeholder="Email" />
              <input required name="phone" placeholder="Phone" />
              <textarea required name="address" placeholder="Delivery Address"></textarea>
              <button class="btn" type="submit">Place Order Request</button>
              <p class="tiny">No payment is collected yet. We will contact you to confirm delivery and payment options.</p>
            </form>
          </aside>
        </div>`;

      mount.querySelectorAll("[data-qty]").forEach((input) => {
        input.addEventListener("change", () => {
          const qty = Math.max(1, Number(input.value || 1));
          setCartQty(input.dataset.qty, qty);
          render();
        });
      });

      mount.querySelectorAll("[data-remove]").forEach((btn) => {
        btn.addEventListener("click", () => {
          trackEvent("remove_from_cart", { productId: btn.dataset.remove });
          removeFromCart(btn.dataset.remove);
          render();
        });
      });

      const form = mount.querySelector("#order-form");
      form.addEventListener("submit", (e) => {
        e.preventDefault();
        const data = Object.fromEntries(new FormData(form).entries());
        const orderRequest = {
          id: `REQ-${Date.now()}`,
          createdAt: new Date().toISOString(),
          customer: data,
          items: summary.rows.map((r) => ({
            productId: r.productId,
            name: r.product.name,
            qty: r.qty,
            unitPrice: r.product.price,
          })),
          totals: {
            subtotal: summary.subtotal,
            shipping: summary.shipping,
            total: summary.total,
          },
          paymentStatus: "pending-contact",
        };

        const existing = getOrderRequests();
        existing.push(orderRequest);
        localStorage.setItem("bloom_order_requests", JSON.stringify(existing));
        trackEvent("order_request_submitted", {
          requestId: orderRequest.id,
          total: orderRequest.totals.total,
          items: orderRequest.items.length,
          email: orderRequest.customer.email,
        });
        saveCart([]);

        mount.innerHTML = `<div class="success-box">
          <h2>Order request received ✅</h2>
          <p>Request ID: <strong>${orderRequest.id}</strong></p>
          <p>We will contact you shortly to confirm delivery and payment arrangement.</p>
          <a class="btn" href="shop.html">Continue Shopping</a>
        </div>`;
      });
    };

    render();
  }

  function download(filename, content, type) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function asCsv(orders) {
    const headers = [
      "id",
      "createdAt",
      "customerName",
      "email",
      "phone",
      "address",
      "itemCount",
      "total",
      "paymentStatus"
    ];
    const rows = orders.map((o) => [
      o.id,
      o.createdAt,
      o.customer?.name || "",
      o.customer?.email || "",
      o.customer?.phone || "",
      (o.customer?.address || "").replace(/\n/g, " "),
      o.items?.reduce((a, i) => a + (i.qty || 0), 0) || 0,
      o.totals?.total || 0,
      o.paymentStatus || ""
    ]);
    return [headers, ...rows]
      .map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))
      .join("\n");
  }

  function initOrdersPage() {
    const mount = document.getElementById("orders-view");
    if (!mount) return;

    const orders = getOrderRequests().sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));

    if (!orders.length) {
      mount.innerHTML = `<p class="empty">No order requests found yet.</p>`;
    } else {
      mount.innerHTML = orders
        .map(
          (o) => `<article class="order-box" style="margin-bottom:.75rem">
            <p><strong>${o.id}</strong> · ${new Date(o.createdAt).toLocaleString()}</p>
            <p><strong>Customer:</strong> ${o.customer?.name || "-"} (${o.customer?.phone || "-"})</p>
            <p><strong>Email:</strong> ${o.customer?.email || "-"}</p>
            <p><strong>Address:</strong> ${o.customer?.address || "-"}</p>
            <p><strong>Items:</strong> ${(o.items || []).map((i) => `${i.name} x${i.qty}`).join(", ")}</p>
            <p><strong>Total:</strong> ${money.format(o.totals?.total || 0)} · <strong>Status:</strong> ${o.paymentStatus}</p>
          </article>`
        )
        .join("");
    }

    const jsonBtn = document.getElementById("export-json");
    const csvBtn = document.getElementById("export-csv");

    if (jsonBtn) {
      jsonBtn.addEventListener("click", () => {
        download(`order-requests-${Date.now()}.json`, JSON.stringify(orders, null, 2), "application/json");
      });
    }

    if (csvBtn) {
      csvBtn.addEventListener("click", () => {
        download(`order-requests-${Date.now()}.csv`, asCsv(orders), "text/csv;charset=utf-8");
      });
    }
  }

  function initYear() {
    document.querySelectorAll("[data-year]").forEach((el) => {
      el.textContent = new Date().getFullYear();
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    updateCartBadge();
    initYear();
    initShopPage();
    initProductPage();
    initCartPage();
    initOrdersPage();
  });
})();
