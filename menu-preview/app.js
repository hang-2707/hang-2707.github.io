(() => {
  const items = Array.isArray(window.MENU_ITEMS) ? window.MENU_ITEMS : [];
  const money = new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 });
  const storageKey = "clean-menu-selection-v1";
  const viewKey = "clean-menu-view-v1";
  const noteKey = "clean-menu-note-v1";
  let selection = readJSON(storageKey, {});

  const grid = document.querySelector("#menuGrid");
  const panel = document.querySelector("#selectionPanel");
  const selectedItems = document.querySelector("#selectedItems");
  const count = document.querySelector("#selectionCount");
  const total = document.querySelector("#selectionTotal");
  const note = document.querySelector("#orderNote");
  const toast = document.querySelector("#toast");

  function readJSON(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
    catch { return fallback; }
  }

  function save() {
    localStorage.setItem(storageKey, JSON.stringify(selection));
    renderSelection();
  }

  function renderMenu() {
    grid.innerHTML = items.map(item => `
      <article class="menu-card">
        <div class="dish-image">
          <img src="${item.image}" alt="${item.name}" loading="lazy">
        </div>
        <div class="dish-body">
          <div>
            <h3 class="dish-name">${item.name}</h3>
            <p class="dish-price">${money.format(item.price)}</p>
          </div>
          <button class="add-button" type="button" data-add="${item.id}" aria-label="Thêm ${item.name}">+</button>
        </div>
      </article>`).join("");

    grid.querySelectorAll("img").forEach(img => {
      const markMissing = () => img.parentElement.classList.add("no-image");
      img.addEventListener("error", markMissing, { once: true });
      if (img.complete && img.naturalWidth === 0) markMissing();
    });
  }

  function renderSelection() {
    const chosen = items.filter(item => selection[item.id] > 0);
    const itemCount = chosen.reduce((sum, item) => sum + selection[item.id], 0);
    const orderTotal = chosen.reduce((sum, item) => sum + item.price * selection[item.id], 0);
    count.textContent = itemCount;
    total.textContent = money.format(orderTotal);
    selectedItems.innerHTML = chosen.length ? chosen.map(item => `
      <div class="selected-row">
        <div><p>${item.name}</p><small>${money.format(item.price)}</small></div>
        <div class="quantity" aria-label="Số lượng ${item.name}">
          <button type="button" data-minus="${item.id}" aria-label="Bớt một">−</button>
          <strong>${selection[item.id]}</strong>
          <button type="button" data-add="${item.id}" aria-label="Thêm một">+</button>
        </div>
      </div>`).join("") : '<p class="empty-selection">Chưa có món nào.<br>Nhấn dấu + để thêm món.</p>';
  }

  function changeQuantity(id, amount) {
    selection[id] = Math.max(0, (selection[id] || 0) + amount);
    if (!selection[id]) delete selection[id];
    save();
  }

  function openPanel() {
    panel.classList.add("open");
    panel.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
    panel.querySelector(".icon-button").focus();
  }

  function closePanel() {
    panel.classList.remove("open");
    panel.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
    document.querySelector("#openSelection").focus();
  }

  function showToast(message) {
    toast.textContent = message;
    toast.classList.add("show");
    window.clearTimeout(showToast.timer);
    showToast.timer = window.setTimeout(() => toast.classList.remove("show"), 1800);
  }

  document.addEventListener("click", event => {
    const add = event.target.closest("[data-add]");
    const minus = event.target.closest("[data-minus]");
    if (add) changeQuantity(add.dataset.add, 1);
    if (minus) changeQuantity(minus.dataset.minus, -1);
    if (event.target.closest("[data-close-panel]")) closePanel();
  });

  document.querySelector("#openSelection").addEventListener("click", openPanel);
  document.addEventListener("keydown", event => { if (event.key === "Escape" && panel.classList.contains("open")) closePanel(); });

  document.querySelectorAll("[data-view]").forEach(button => button.addEventListener("click", () => {
    const view = button.dataset.view;
    grid.classList.toggle("list", view === "list");
    document.querySelectorAll("[data-view]").forEach(item => {
      const active = item === button;
      item.classList.toggle("active", active);
      item.setAttribute("aria-pressed", String(active));
    });
    localStorage.setItem(viewKey, view);
  }));

  note.value = localStorage.getItem(noteKey) || "";
  note.addEventListener("input", () => localStorage.setItem(noteKey, note.value));

  document.querySelector("#clearSelection").addEventListener("click", () => {
    selection = {};
    note.value = "";
    localStorage.removeItem(noteKey);
    save();
  });

  document.querySelector("#copySelection").addEventListener("click", async () => {
    const chosen = items.filter(item => selection[item.id] > 0);
    if (!chosen.length) return showToast("Bạn chưa chọn món nào");
    const lines = ["DANH SÁCH MÓN", ...chosen.map(item => `• ${item.name} × ${selection[item.id]} — ${money.format(item.price * selection[item.id])}`)];
    if (note.value.trim()) lines.push(`Ghi chú: ${note.value.trim()}`);
    lines.push(`Tạm tính: ${money.format(chosen.reduce((sum, item) => sum + item.price * selection[item.id], 0))}`);
    try {
      await navigator.clipboard.writeText(lines.join("\n"));
      showToast("Đã sao chép danh sách");
    } catch {
      showToast("Không thể sao chép tự động");
    }
  });

  renderMenu();
  renderSelection();
  if (localStorage.getItem(viewKey) === "list") document.querySelector('[data-view="list"]').click();
})();
