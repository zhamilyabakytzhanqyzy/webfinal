/* Browser-only frontend prototype. Replace localStorage with Deno API calls later. */
"use strict";

const K = {
  users: "amirito.users",
  products: "amirito.products",
  orders: "amirito.orders",
  favorites: "amirito.favorites",
  current: "amirito.currentUser",
  cart: "amirito.cart",
  receipt: "amirito.lastReceipt"
};

const CATEGORIES = [
  { key: "Sandwiches", title: "Sandwiches", emoji: "🥪" },
  { key: "Drinks", title: "Drinks", emoji: "🥤" },
  { key: "Snacks", title: "Snacks", emoji: "🍪" }
];

const DEMO_USERS = [
  { username: "customer1", password: "p455w0rd", fullName: "Customer One", email: "customer1@example.com", role: "customer" },
  { username: "customer2", password: "p455w0rd", fullName: "Customer Two", email: "customer2@example.com", role: "customer" },
  { username: "admin", password: "p455w0rd", fullName: "Amirito Admin", email: "admin@example.com", role: "admin" }
];

function read(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    return value === null ? fallback : JSON.parse(value);
  } catch {
    return fallback;
  }
}

function write(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function initialiseData() {
  if (!localStorage.getItem(K.users)) write(K.users, DEMO_USERS);
  if (!localStorage.getItem(K.products)) write(K.products, []);
  if (!localStorage.getItem(K.orders)) write(K.orders, []);
  if (!localStorage.getItem(K.favorites)) write(K.favorites, {});
}

function users() { return read(K.users, []); }
function products() { return read(K.products, []); }
function orders() { return read(K.orders, []); }
function currentUser() {
  const username = localStorage.getItem(K.current);
  return users().find((user) => user.username === username) || null;
}
function cart() { return read(K.cart, {}); }
function favorites() { return read(K.favorites, {}); }

function price(pence) {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(Number(pence || 0) / 100);
}

function safe(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[char]);
}

function message(text, type = "error") {
  const element = document.getElementById("message");
  if (!element) return;
  element.textContent = text;
  element.className = `message ${type}`;
}

function requireRole(role) {
  const user = currentUser();
  if (!user) {
    location.href = "login.html";
    return null;
  }
  if (role && user.role !== role) {
    location.href = user.role === "admin" ? "admin.html" : "customer-home.html";
    return null;
  }
  return user;
}

function sharedUI() {
  document.querySelectorAll("[data-current-year]").forEach((el) => el.textContent = new Date().getFullYear());
  const host = document.getElementById("headerActions");
  if (!host) return;

  const user = currentUser();
  if (!user) {
    host.innerHTML = '<a class="btn light" href="login.html">Sign in</a><a class="btn" href="register.html">Sign up</a>';
    return;
  }

  host.innerHTML = `<a class="btn light" href="${user.role === "admin" ? "admin.html" : "account.html"}">${safe(user.username)}</a><button class="btn outline" id="logout" type="button">Sign out</button>`;
  document.getElementById("logout").addEventListener("click", () => {
    localStorage.removeItem(K.current);
    localStorage.removeItem(K.cart);
    location.href = "index.html";
  });
}

function initLogin() {
  const form = document.getElementById("loginForm");
  if (!form) return;

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const username = form.elements.username.value.trim().toLowerCase();
    const password = form.elements.password.value;
    const user = users().find((item) => item.username.toLowerCase() === username && item.password === password);

    if (!user) {
      message("The username or password is incorrect.");
      return;
    }

    localStorage.setItem(K.current, user.username);
    if (user.role === "admin") {
      location.href = "admin.html";
    } else {
      const prior = orders().some((order) => order.username === user.username);
      location.href = prior ? "orders.html" : "customer-home.html";
    }
  });
}

function initRegister() {
  const form = document.getElementById("registerForm");
  if (!form) return;

  form.addEventListener("submit", (event) => {
    event.preventDefault();

    const fullName = form.elements.fullName.value.trim();
    const username = form.elements.username.value.trim().toLowerCase();
    const email = form.elements.email.value.trim().toLowerCase();
    const password = form.elements.password.value;

    if (fullName.length < 2) return message("Please enter your full name.");
    if (!/^[a-z0-9_-]{3,24}$/.test(username)) return message("Username must be 3–24 characters using letters, numbers, _ or -.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return message("Please enter a valid email address.");
    if (password.length < 8) return message("Password must contain at least 8 characters.");

    const allUsers = users();
    if (allUsers.some((user) => user.username === username || user.email.toLowerCase() === email)) {
      return message("That username or email is already registered.");
    }

    allUsers.push({ username, password, fullName, email, role: "customer" });
    write(K.users, allUsers);
    localStorage.setItem(K.current, username);
    location.href = "customer-home.html";
  });
}

function productImage(product, className = "product-image") {
  if (product.image) return `<img class="${className}" src="${product.image}" alt="${safe(product.name)}">`;
  const category = CATEGORIES.find((item) => item.key === product.category);
  return `<div class="${className} placeholder" role="img" aria-label="Image placeholder">${category?.emoji || "🥪"}</div>`;
}

function card(product, options = {}) {
  const user = currentUser();
  const ids = user ? (favorites()[user.username] || []) : [];
  const liked = ids.includes(product.id);
  return `
    <article class="product-card">
      <div class="product-image-wrap">
        ${productImage(product)}
        ${options.fav && user?.role === "customer" ? `<button class="heart ${liked ? "liked" : ""}" data-fav="${safe(product.id)}" type="button" aria-pressed="${liked}">${liked ? "♥" : "♡"}</button>` : ""}
      </div>
      <div class="product-body">
        <span class="category-label">${safe(product.category)}</span>
        <h3>${safe(product.name)}</h3>
        <p>${safe(product.description || "Freshly prepared with care.")}</p>
        <strong class="price">${price(product.price)}</strong>
        ${options.choose ? `<button class="btn wide" data-choose="${safe(product.id)}" type="button">Choose item</button>` : ""}
        ${options.remove ? `<button class="btn danger wide" data-remove="${safe(product.id)}" type="button">Remove</button>` : ""}
      </div>
    </article>`;
}

function attachFavorites(container, renderAgain) {
  container.querySelectorAll("[data-fav]").forEach((button) => {
    button.addEventListener("click", () => {
      const user = requireRole("customer");
      if (!user) return;
      const all = favorites();
      const ids = all[user.username] || [];
      const id = button.dataset.fav;
      all[user.username] = ids.includes(id) ? ids.filter((saved) => saved !== id) : [...ids, id];
      write(K.favorites, all);
      renderAgain();
    });
  });
}

function renderMenu() {
  const host = document.getElementById("menu");
  if (!host) return;
  const allProducts = products();
  const user = currentUser();

  if (!allProducts.length) {
    host.innerHTML = `<div class="empty"><span>🥪</span><h2>The menu is getting ready</h2><p>No products have been added yet. The admin can sign in and add menu items.</p>${user?.role === "admin" ? '<a class="btn" href="add-product.html">Add first product</a>' : ""}</div>`;
    return;
  }

  host.innerHTML = CATEGORIES.map((category) => {
    const items = allProducts.filter((item) => item.category === category.key);
    if (!items.length) return "";
    return `<section class="category"><div class="section-heading"><div><p class="eyebrow">${category.emoji} FRESH PICKS</p><h2>${category.title}</h2></div><span class="count">${items.length} items</span></div><div class="products">${items.map((item) => card(item, { fav: true, choose: user?.role === "customer" })).join("")}</div></section>`;
  }).join("");

  attachFavorites(host, renderMenu);
  host.querySelectorAll("[data-choose]").forEach((button) => button.addEventListener("click", () => {
    if (!requireRole("customer")) return;
    const item = allProducts.find((product) => product.id === button.dataset.choose);
    const selected = cart();
    selected[item.category] = item.id;
    write(K.cart, selected);
    message(`${item.name} added to your selection.`, "success");
    renderMenu();
  }));

  const selectedCount = Object.keys(cart()).length;
  const bar = document.getElementById("cartBar");
  if (bar) {
    bar.hidden = !(user?.role === "customer" && selectedCount > 0);
    document.getElementById("cartText").textContent = `${selectedCount} of 3 categories selected`;
  }
}

function initMenu() {
  renderMenu();
  document.getElementById("continueCheckout")?.addEventListener("click", () => {
    if (!requireRole("customer")) return;
    const selected = cart();
    const missing = CATEGORIES.filter((category) => !selected[category.key]);
    if (missing.length) return message(`Choose one ${missing.map((item) => item.key.toLowerCase()).join(", ")} to continue.`);
    location.href = "checkout.html";
  });
}

function initCheckout() {
  if (!requireRole("customer")) return;
  const selected = cart();
  const allProducts = products();
  const chosen = CATEGORIES.map((category) => allProducts.find((item) => item.id === selected[category.key])).filter(Boolean);
  const summary = document.getElementById("summary");

  if (chosen.length !== 3) {
    summary.innerHTML = '<div class="empty"><h2>Selection incomplete</h2><p>Choose one sandwich, one drink and one snack.</p><a class="btn" href="menu.html">Return to menu</a></div>';
    document.getElementById("total").textContent = price(0);
    return;
  }

  summary.innerHTML = chosen.map((item) => `<div class="summary-item">${productImage(item, "summary-image")}<div><span class="category-label">${safe(item.category)}</span><strong>${safe(item.name)}</strong></div><strong>${price(item.price)}</strong></div>`).join("");
  document.getElementById("total").textContent = price(chosen.reduce((sum, item) => sum + Number(item.price), 0));

  const user = currentUser();
  const previous = orders().filter((order) => order.username === user.username).sort((a, b) => b.createdAt - a.createdAt)[0];
  document.getElementById("customerName").value = previous?.customerName || user.fullName || "";
  document.getElementById("address").value = previous?.address || "";
  document.getElementById("phone").value = previous?.phone || "";

  document.getElementById("orderForm").addEventListener("submit", (event) => {
    event.preventDefault();
    const name = event.currentTarget.elements.customerName.value.trim();
    const address = event.currentTarget.elements.address.value.trim();
    const phone = event.currentTarget.elements.phone.value.trim();

    if (name.length < 2 || address.length < 5 || phone.length < 5) return message("Please enter your name, complete address and phone number.");

    const order = {
      id: crypto.randomUUID(),
      number: `AM-${Date.now().toString(36).toUpperCase()}`,
      username: user.username,
      customerName: name,
      address,
      phone,
      items: chosen.map((item) => ({ id: item.id, name: item.name, category: item.category, price: item.price })),
      total: chosen.reduce((sum, item) => sum + Number(item.price), 0),
      status: "Active",
      createdAt: Date.now()
    };

    const allOrders = orders();
    allOrders.push(order);
    write(K.orders, allOrders);
    localStorage.setItem(K.receipt, order.id);
    localStorage.removeItem(K.cart);
    location.href = "receipt.html";
  });
}

function initReceipt() {
  const host = document.getElementById("receipt");
  if (!host) return;
  const id = localStorage.getItem(K.receipt);
  const order = orders().find((item) => item.id === id);

  if (!order) {
    host.innerHTML = '<p>No receipt found. Please place an order first.</p><a class="btn" href="menu.html">Go to menu</a>';
    return;
  }

  host.innerHTML = `
    <div class="receipt-meta">
      <div><span>Order number</span><strong>${safe(order.number)}</strong></div>
      <div><span>Date</span><strong>${safe(new Date(order.createdAt).toLocaleString("en-GB"))}</strong></div>
      <div><span>Customer</span><strong>${safe(order.customerName)}</strong></div>
      <div><span>Delivery address</span><strong>${safe(order.address)}</strong></div>
      <div><span>Phone</span><strong>${safe(order.phone)}</strong></div>
    </div>
    <h2>Order summary</h2>
    ${order.items.map((item) => `<div class="receipt-line"><span>${safe(item.name)}</span><strong>${price(item.price)}</strong></div>`).join("")}
    <div class="total"><span>Total</span><strong>${price(order.total)}</strong></div>`;
  document.getElementById("printReceipt").addEventListener("click", () => window.print());
}

function initAccount() {
  const user = requireRole("customer");
  if (!user) return;
  document.getElementById("accountName").textContent = user.fullName || user.username;
  document.getElementById("accountEmail").textContent = user.email || "";
}

function orderCard(order, admin = false) {
  return `<article class="order-card"><div class="row"><div><span class="category-label">ORDER ${safe(order.number)}</span><h3>${safe(order.customerName)}</h3></div><span class="badge ${order.status === "Completed" ? "complete" : ""}">${order.status === "Completed" ? "✓ Completed" : "In preparation"}</span></div><p>${safe(order.address)}</p>${admin ? `<p>Customer: ${safe(order.username)} · ${safe(order.phone)}</p>` : ""}<div class="order-lines">${order.items.map((item) => `<div class="receipt-line"><span>${safe(item.name)} <small>(${safe(item.category)})</small></span><strong>${price(item.price)}</strong></div>`).join("")}</div><div class="total"><span>Total</span><strong>${price(order.total)}</strong></div>${admin && order.status === "Active" ? `<button class="btn" data-picked="${safe(order.id)}" type="button">Picked ✓</button>` : ""}</article>`;
}

function initOrders() {
  const user = requireRole("customer");
  if (!user) return;
  const own = orders().filter((order) => order.username === user.username).sort((a, b) => b.createdAt - a.createdAt);
  const active = own.filter((order) => order.status === "Active");
  const past = own.filter((order) => order.status === "Completed");

  document.getElementById("activeOrders").innerHTML = active.length ? active.map((order) => orderCard(order)).join("") : '<div class="empty"><h2>No Order Placed</h2><p>Your next lunch is waiting.</p><a class="btn" href="menu.html">Place order</a></div>';
  document.getElementById("pastOrders").innerHTML = past.length ? past.map((order) => orderCard(order)).join("") : '<div class="empty"><h2>No past orders yet</h2></div>';

  document.querySelectorAll("[data-tab]").forEach((button) => button.addEventListener("click", () => {
    const activeTab = button.dataset.tab === "active";
    document.getElementById("activeOrders").hidden = !activeTab;
    document.getElementById("pastOrders").hidden = activeTab;
    document.querySelectorAll("[data-tab]").forEach((tab) => tab.classList.toggle("active", tab === button));
  }));
}

function renderFavorites() {
  const host = document.getElementById("favorites");
  if (!host) return;
  const user = currentUser();
  const ids = favorites()[user.username] || [];
  const saved = products().filter((item) => ids.includes(item.id));
  host.innerHTML = saved.length ? saved.map((item) => card(item, { fav: true })).join("") : '<div class="empty"><h2>No favourites saved</h2><p>Tap the heart on an item in the menu.</p><a class="btn" href="menu.html">Explore menu</a></div>';
  attachFavorites(host, renderFavorites);
}

function initFavorites() {
  if (!requireRole("customer")) return;
  renderFavorites();
}

function initAddProduct() {
  if (!requireRole("admin")) return;
  const form = document.getElementById("productForm");
  const description = document.getElementById("description");
  const priceInput = document.getElementById("price");
  const imageInput = document.getElementById("image");
  const imagePreview = document.getElementById("imagePreview");
  let imageData = "";

  description.addEventListener("input", () => {
    document.getElementById("charCount").textContent = `${description.value.length} / 100`;
  });

  priceInput.addEventListener("input", () => {
    document.getElementById("priceOutput").textContent = `${priceInput.value}p`;
  });

  imageInput.addEventListener("change", () => {
    const file = imageInput.files[0];
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      imageInput.value = "";
      return message("Choose a JPG, PNG or WEBP image.");
    }
    if (file.size > 2 * 1024 * 1024) {
      imageInput.value = "";
      return message("Image must be 2 MB or smaller.");
    }

    const reader = new FileReader();
    reader.addEventListener("load", () => {
      imageData = reader.result;
      imagePreview.src = imageData;
      imagePreview.hidden = false;
      document.getElementById("imagePlaceholder").hidden = true;
    });
    reader.readAsDataURL(file);
  });

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const category = form.elements.category.value;
    const name = form.elements.name.value.trim();
    const descriptionText = form.elements.description.value.trim();
    const priceNumber = Number(form.elements.price.value);

    if (!CATEGORIES.some((item) => item.key === category)) return message("Choose a category.");
    if (name.length < 2 || name.length > 60) return message("Product name must be 2–60 characters.");
    if (descriptionText.length > 100) return message("Description must be no more than 100 characters.");
    if (priceNumber < 50 || priceNumber > 500) return message("Price must be between 50p and 500p.");

    const all = products();
    all.push({ id: crypto.randomUUID(), category, name, description: descriptionText, price: priceNumber, image: imageData, createdAt: Date.now() });

    try {
      write(K.products, all);
      location.href = "admin.html";
    } catch (error) {
      console.error(error);
      message("Could not save this image in browser storage. Try a smaller file.");
    }
  });
}

function initAdmin() {
  if (!requireRole("admin")) return;
  const host = document.getElementById("adminProducts");

  function render() {
    const all = products();
    host.innerHTML = CATEGORIES.map((category) => {
      const items = all.filter((item) => item.category === category.key);
      return `<section class="category"><div class="section-heading"><div><p class="eyebrow">${category.emoji} MENU CATEGORY</p><h2>${category.title}</h2></div><span class="count">${items.length} products</span></div>${items.length ? `<div class="products">${items.map((item) => card(item, { remove: true })).join("")}</div>` : `<div class="empty-category">No ${category.title.toLowerCase()} added yet.</div>`}</section>`;
    }).join("");

    host.querySelectorAll("[data-remove]").forEach((button) => button.addEventListener("click", () => {
      const item = all.find((product) => product.id === button.dataset.remove);
      if (!item || !confirm(`Remove "${item.name}" from the menu?`)) return;
      write(K.products, products().filter((product) => product.id !== item.id));
      const favs = favorites();
      Object.keys(favs).forEach((username) => favs[username] = favs[username].filter((id) => id !== item.id));
      write(K.favorites, favs);
      render();
      message(`${item.name} removed from the menu.`, "success");
    }));
  }

  render();
}

function initAdminOrders() {
  if (!requireRole("admin")) return;
  const host = document.getElementById("adminOrders");

  function render() {
    const active = orders().filter((order) => order.status === "Active").sort((a, b) => a.createdAt - b.createdAt);
    host.innerHTML = active.length ? active.map((order) => orderCard(order, true)).join("") : '<div class="empty"><h2>All orders are picked</h2><p>New customer orders will appear here.</p></div>';

    host.querySelectorAll("[data-picked]").forEach((button) => button.addEventListener("click", () => {
      const all = orders();
      const order = all.find((item) => item.id === button.dataset.picked);
      if (!order) return;
      order.status = "Completed";
      order.completedAt = Date.now();
      write(K.orders, all);
      render();
    }));
  }

  render();
}

function initAdminBalance() {
  if (!requireRole("admin")) return;
  const completed = orders().filter((order) => order.status === "Completed");
  const total = completed.reduce((sum, order) => sum + Number(order.total), 0);
  document.getElementById("balance").textContent = price(total);
  document.getElementById("completedCount").textContent = `${completed.length} completed orders`;
}

function initCustomerHome() {
  const user = requireRole("customer");
  if (!user) return;
  const host = document.getElementById("customerHomeContent");
  const latest = orders().filter((order) => order.username === user.username).sort((a, b) => b.createdAt - a.createdAt)[0];

  if (!latest) {
    host.innerHTML = `<section class="empty"><span>🥪</span><p class="eyebrow">LUNCH IS CALLING</p><h1>No Order Placed</h1><p>You haven't placed an order yet. Choose your lunch for today.</p><a class="btn" href="menu.html">Place order</a></section>`;
    return;
  }

  host.innerHTML = `<section class="panel"><p class="eyebrow">YOUR LATEST ORDER</p><h1>Order #${safe(latest.number)}</h1><span class="badge">${latest.status === "Completed" ? "✓ Completed" : "In preparation"}</span>${latest.items.map((item) => `<div class="receipt-line"><span>${safe(item.name)}</span><strong>${price(item.price)}</strong></div>`).join("")}<div class="total"><span>Total</span><strong>${price(latest.total)}</strong></div><a class="btn" href="orders.html">View order history</a></section>`;
}

function initHome() {
  const user = currentUser();
  if (user?.role === "admin") {
    location.href = "admin.html";
  } else if (user?.role === "customer") {
    const main = document.querySelector("main");
    main.innerHTML = `<section class="intro"><p class="eyebrow">WELCOME BACK</p><h1>Your lunch, sorted.</h1><p>Place an order or check your latest lunch.</p></section><div id="customerHomeContent"></div>`;
    initCustomerHome();
  }
}

document.addEventListener("DOMContentLoaded", () => {
  initialiseData();
  sharedUI();

  const pages = {
    home: initHome,
    login: initLogin,
    register: initRegister,
    menu: initMenu,
    checkout: initCheckout,
    receipt: initReceipt,
    account: initAccount,
    orders: initOrders,
    favorites: initFavorites,
    admin: initAdmin,
    "add-product": initAddProduct,
    "admin-orders": initAdminOrders,
    "admin-balance": initAdminBalance,
    "customer-home": initCustomerHome
  };

  pages[document.body.dataset.page]?.();
});
