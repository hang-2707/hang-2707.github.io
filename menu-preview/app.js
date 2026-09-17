(() => {
  const items = Array.isArray(window.MENU_ITEMS) ? window.MENU_ITEMS : [];
  const money = new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 });
  const storageKey = "clean-menu-selection-v1";
  const viewKey = "clean-menu-view-v1";
  const noteKey = "clean-menu-note-v1";
  const langKey = "clean-menu-lang-v1";
  let selection = readJSON(storageKey, {});
  let language = localStorage.getItem(langKey) || "fr";

  const translations = {
    fr: {
      selected: "Sélection", eyebrow: "Les plats du jour", title: "On mange<br>quoi ?",
      intro: "Choisissez vos plats, ajoutez une note et envoyez-nous votre liste.", menu: "Menu",
      yourList: "Votre liste", chosen: "Plats choisis", note: "Note", subtotal: "Sous-total",
      copy: "Copier la liste", clear: "Tout effacer", empty: "Aucun plat sélectionné.<br>Appuyez sur + pour ajouter un plat.",
      added: "Ajouté à votre commande", copied: "Liste copiée",
      noItems: "Vous n’avez sélectionné aucun plat", copyTitle: "LISTE DE COMMANDE", noteLabel: "Note", copyFail: "Impossible de copier automatiquement",
      dishDetails: "Détails du plat", addOrder: "Ajouter"
    },
    en: {
      selected: "Selected", eyebrow: "Today’s dishes", title: "What shall<br>we eat?",
      intro: "Choose your dishes, add a note and send us your list.", menu: "Menu",
      yourList: "Your list", chosen: "Selected dishes", note: "Note", subtotal: "Subtotal",
      copy: "Copy order list", clear: "Clear all", empty: "No dishes selected.<br>Press + to add a dish.",
      added: "Added to your order", copied: "Order list copied",
      noItems: "You haven’t selected any dishes", copyTitle: "ORDER LIST", noteLabel: "Note", copyFail: "Unable to copy automatically",
      dishDetails: "Dish details", addOrder: "Add to order"
    }
  };

  const grid = document.querySelector("#menuGrid");
  const panel = document.querySelector("#selectionPanel");
  const selectedItems = document.querySelector("#selectedItems");
  const count = document.querySelector("#selectionCount");
  const total = document.querySelector("#selectionTotal");
  const note = document.querySelector("#orderNote");
  const toast = document.querySelector("#toast");
  const detailPanel = document.querySelector("#detailPanel");
  let detailItem = null;
  let detailImageIndex = 0;

  function dishName(item) { return language === "fr" ? item.nameFr : item.nameEn; }

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
      <article class="menu-card" data-detail="${item.id}" tabindex="0" role="button">
        <div class="dish-image">
          <img src="${item.images[0]}" alt="${dishName(item)}" loading="lazy">
        </div>
        <div class="dish-body">
          <div>
            <h3 class="dish-name">${dishName(item)}</h3>
            <p class="dish-price">${money.format(item.price)}</p>
          </div>
          <button class="add-button" type="button" data-add="${item.id}" aria-label="${dishName(item)}">+</button>
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
        <div><p>${dishName(item)}</p><small>${money.format(item.price)}</small></div>
        <div class="quantity" aria-label="${dishName(item)}">
          <button type="button" data-minus="${item.id}" aria-label="Bớt một">−</button>
          <strong>${selection[item.id]}</strong>
          <button type="button" data-add="${item.id}" aria-label="Thêm một">+</button>
        </div>
      </div>`).join("") : `<p class="empty-selection">${translations[language].empty}</p>`;
  }

  function changeQuantity(id, amount) {
    selection[id] = Math.max(0, (selection[id] || 0) + amount);
    if (!selection[id]) delete selection[id];
    save();
    if (amount > 0) {
      const item = items.find(entry => entry.id === id);
      if (item) showToast(`${translations[language].added}: ${dishName(item)}`);
    }
  }

  function applyLanguage() {
    const t = translations[language];
    document.documentElement.lang = language;
    document.querySelectorAll("[data-i18n]").forEach(el => { el.textContent = t[el.dataset.i18n]; });
    document.querySelectorAll("[data-i18n-html]").forEach(el => { el.innerHTML = t[el.dataset.i18nHtml]; });
    note.placeholder = "";
    document.querySelectorAll("[data-lang]").forEach(button => {
      const active = button.dataset.lang === language;
      button.classList.toggle("active", active);
      button.setAttribute("aria-pressed", String(active));
    });
    renderMenu();
    renderSelection();
    if (detailItem) renderDetail();
  }

  function renderDetail() {
    if (!detailItem) return;
    const images = detailItem.images || [];
    document.querySelector("#detailName").textContent = dishName(detailItem);
    document.querySelector("#detailPrice").textContent = money.format(detailItem.price);
    document.querySelector("#detailImageWrap").innerHTML = images.map((src, index) => `
      <div class="detail-slide${index === detailImageIndex ? " active" : ""}">
        <img src="${src}" alt="${dishName(detailItem)} — ${index + 1}">
      </div>`).join("");
    document.querySelector("#galleryDots").innerHTML = images.map((_, index) => `
      <button class="gallery-dot${index === detailImageIndex ? " active" : ""}" type="button" data-image-index="${index}" aria-label="Image ${index + 1}"></button>`).join("");
    document.querySelectorAll(".detail-slide img").forEach(img => {
      const markMissing = () => {
        img.parentElement.classList.add("no-image");
        img.parentElement.textContent = dishName(detailItem);
      };
      img.addEventListener("error", markMissing, { once: true });
      if (img.complete && img.naturalWidth === 0) markMissing();
    });
    const showArrows = images.length > 1;
    document.querySelector("#galleryPrev").hidden = !showArrows;
    document.querySelector("#galleryNext").hidden = !showArrows;
  }

  function openDetail(id) {
    detailItem = items.find(item => item.id === id);
    if (!detailItem) return;
    detailImageIndex = 0;
    renderDetail();
    detailPanel.classList.add("open");
    detailPanel.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
    detailPanel.querySelector(".detail-close").focus();
  }

  function closeDetail() {
    detailPanel.classList.remove("open");
    detailPanel.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
  }

  function changeDetailImage(amount) {
    if (!detailItem?.images?.length) return;
    detailImageIndex = (detailImageIndex + amount + detailItem.images.length) % detailItem.images.length;
    renderDetail();
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
    if (add) {
      changeQuantity(add.dataset.add, 1);
      return;
    }
    if (minus) changeQuantity(minus.dataset.minus, -1);
    if (event.target.closest("[data-close-panel]")) closePanel();
    if (event.target.closest("[data-close-detail]")) closeDetail();
    const detail = event.target.closest("[data-detail]");
    if (detail) openDetail(detail.dataset.detail);
    const dot = event.target.closest("[data-image-index]");
    if (dot) { detailImageIndex = Number(dot.dataset.imageIndex); renderDetail(); }
  });

  document.querySelector("#openSelection").addEventListener("click", openPanel);
  document.addEventListener("keydown", event => {
    if (event.key === "Escape" && panel.classList.contains("open")) closePanel();
    if (event.key === "Escape" && detailPanel.classList.contains("open")) closeDetail();
    if ((event.key === "Enter" || event.key === " ") && event.target.matches("[data-detail]")) { event.preventDefault(); openDetail(event.target.dataset.detail); }
  });

  document.querySelector("#galleryPrev").addEventListener("click", () => changeDetailImage(-1));
  document.querySelector("#galleryNext").addEventListener("click", () => changeDetailImage(1));
  document.querySelector("#detailAdd").addEventListener("click", () => { if (detailItem) changeQuantity(detailItem.id, 1); });

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

  document.querySelectorAll("[data-lang]").forEach(button => button.addEventListener("click", () => {
    language = button.dataset.lang;
    localStorage.setItem(langKey, language);
    applyLanguage();
  }));

  document.querySelector("#clearSelection").addEventListener("click", () => {
    selection = {};
    note.value = "";
    localStorage.removeItem(noteKey);
    save();
  });

  document.querySelector("#copySelection").addEventListener("click", async () => {
    const chosen = items.filter(item => selection[item.id] > 0);
    const t = translations[language];
    if (!chosen.length) return showToast(t.noItems);
    const lines = [t.copyTitle, ...chosen.map(item => `• ${dishName(item)} × ${selection[item.id]}`)];
    if (note.value.trim()) lines.push(`${t.noteLabel}: ${note.value.trim()}`);
    try {
      await navigator.clipboard.writeText(lines.join("\n"));
      showToast(t.copied);
    } catch {
      showToast(t.copyFail);
    }
  });

  applyLanguage();
  if (localStorage.getItem(viewKey) === "list") document.querySelector('[data-view="list"]').click();
})();
