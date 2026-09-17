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
      notePlaceholder: "Ex. : livraison à 18h30, peu épicé...", added: "Ajouté à votre commande", copied: "Liste copiée",
      noItems: "Vous n’avez sélectionné aucun plat", copyTitle: "LISTE DE COMMANDE", noteLabel: "Note", copyFail: "Impossible de copier automatiquement"
    },
    en: {
      selected: "Selected", eyebrow: "Today’s dishes", title: "What shall<br>we eat?",
      intro: "Choose your dishes, add a note and send us your list.", menu: "Menu",
      yourList: "Your list", chosen: "Selected dishes", note: "Note", subtotal: "Subtotal",
      copy: "Copy order list", clear: "Clear all", empty: "No dishes selected.<br>Press + to add a dish.",
      notePlaceholder: "E.g. delivery at 6:30 pm, mildly spicy...", added: "Added to your order", copied: "Order list copied",
      noItems: "You haven’t selected any dishes", copyTitle: "ORDER LIST", noteLabel: "Note", copyFail: "Unable to copy automatically"
    }
  };

  const grid = document.querySelector("#menuGrid");
  const panel = document.querySelector("#selectionPanel");
  const selectedItems = document.querySelector("#selectedItems");
  const count = document.querySelector("#selectionCount");
  const total = document.querySelector("#selectionTotal");
  const note = document.querySelector("#orderNote");
  const toast = document.querySelector("#toast");

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
      <article class="menu-card">
        <div class="dish-image">
          <img src="${item.image}" alt="${dishName(item)}" loading="lazy">
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
    note.placeholder = t.notePlaceholder;
    document.querySelectorAll("[data-lang]").forEach(button => {
      const active = button.dataset.lang === language;
      button.classList.toggle("active", active);
      button.setAttribute("aria-pressed", String(active));
    });
    renderMenu();
    renderSelection();
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
