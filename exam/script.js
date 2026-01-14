const API_URL = "http://api.std-900.ist.mospolytech.ru/exam-2024-1/api/goods";
const API_KEY = "4d54f5ce-e1a1-4554-bd67-70c06b301d2b";

const state = {
  items: [],
  page: 1,
  perPage: 12,
  query: "",
  sort: "rating_desc",
  hasMore: true,
  filters: {
    categories: [],
    priceMin: null,
    priceMax: null,
    discountOnly: false
  }
};

const notificationContainer = document.getElementById("notification-container");
const catalogGrid = document.getElementById("catalog-grid");
const loadMoreButton = document.getElementById("load-more");
const sortSelect = document.getElementById("sort-select");
const searchForm = document.getElementById("search-form");
const searchInput = document.getElementById("search-input");
const filterApplyButton = document.getElementById("filter-apply");
const discountOnlyCheckbox = document.getElementById("discount-only");
const priceMinInput = document.getElementById("price-min");
const priceMaxInput = document.getElementById("price-max");

async function fetchGoods() {
  if (!state.hasMore) {
    return;
  }

  const params = new URLSearchParams();
  params.set("api_key", API_KEY);
  params.set("page", String(state.page));
  params.set("per_page", String(state.perPage));

  if (state.query.trim() !== "") {
    params.set("query", state.query.trim());
  }

  const url = `${API_URL}?${params.toString()}`;

  try {
    toggleLoadMore(true);
    const response = await fetch(url);
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Ошибка ${response.status}: ${errorText || "Не удалось загрузить товары"}`);
    }
    
    const responseData = await response.json();
    
    let data = responseData;
    if (responseData && typeof responseData === 'object' && !Array.isArray(responseData)) {
      if (Array.isArray(responseData.data)) {
        data = responseData.data;
      } else if (Array.isArray(responseData.items)) {
        data = responseData.items;
      } else if (Array.isArray(responseData.goods)) {
        data = responseData.goods;
      }
    }

    if (!Array.isArray(data)) {
      console.error("Получен некорректный формат ответа:", responseData);
      throw new Error("Некорректный формат ответа от сервера");
    }
    
    if (data.length > 0) {
      console.log(`Загружено ${data.length} товаров`);
    }

    if (data.length === 0) {
      if (state.page === 1 && state.items.length === 0) {
        showNotification("Товары не найдены", "info");
      }
      state.hasMore = false;
      updateLoadMoreVisibility();
      renderGoods();
      return;
    }

    state.items = state.items.concat(data);
    if (data.length < state.perPage) {
      state.hasMore = false;
    }
    updateCategoriesFromItems();
    updateLoadMoreVisibility();
    renderGoods();
  } catch (error) {
    console.error("Ошибка загрузки товаров:", error);
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      showNotification("Ошибка сети. Проверьте подключение к интернету или настройки CORS.", "error");
    } else {
      showNotification(error.message || "Ошибка при загрузке товаров", "error");
    }
  } finally {
    toggleLoadMore(false);
  }
}

let notificationTimeout = null;

function showNotification(message, type) {
  if (!notificationContainer) {
    return;
  }
  if (notificationTimeout) {
    clearTimeout(notificationTimeout);
  }
  notificationContainer.innerHTML = "";
  const notification = document.createElement("div");
  notification.className = "notification";
  if (type === "error") {
    notification.classList.add("notification-error");
  } else if (type === "success") {
    notification.classList.add("notification-success");
  } else {
    notification.classList.add("notification-info");
  }
  const text = document.createElement("span");
  text.textContent = message;
  const close = document.createElement("button");
  close.type = "button";
  close.className = "notification-close";
  close.textContent = "×";
  close.addEventListener("click", () => {
    notificationContainer.innerHTML = "";
    if (notificationTimeout) {
      clearTimeout(notificationTimeout);
      notificationTimeout = null;
    }
  });
  notification.appendChild(text);
  notification.appendChild(close);
  notificationContainer.appendChild(notification);
  notificationTimeout = setTimeout(() => {
    notificationContainer.innerHTML = "";
    notificationTimeout = null;
  }, 5000);
}

function getFilteredAndSortedItems() {
  const categories = state.filters.categories;
  const priceMin = state.filters.priceMin;
  const priceMax = state.filters.priceMax;
  const discountOnly = state.filters.discountOnly;

  let items = state.items.slice();

  items = items.filter(item => {
    const actualPrice = Number(item.actual_price) || 0;
    const discountPrice = Number(item.discount_price) || 0;
    const currentPrice = discountPrice > 0 ? discountPrice : actualPrice;
    const hasDiscount = discountPrice > 0 && discountPrice < actualPrice;
    
    if (discountOnly && !hasDiscount) {
      return false;
    }
    if (priceMin != null && currentPrice < priceMin) {
      return false;
    }
    if (priceMax != null && currentPrice > priceMax) {
      return false;
    }
    if (categories.length > 0) {
      const mainCat = item.main_category ? String(item.main_category).toLowerCase().trim() : "";
      const subCat = item.sub_category ? String(item.sub_category).toLowerCase().trim() : "";
      const matches = categories.some(cat => {
        const catLower = String(cat).toLowerCase().trim();
        const normalizedMainCat = mainCat.replace(/[&]/g, "&").replace(/\s+/g, " ");
        const normalizedSubCat = subCat.replace(/[&]/g, "&").replace(/\s+/g, " ");
        const normalizedCat = catLower.replace(/[&]/g, "&").replace(/\s+/g, " ");
        
        return normalizedMainCat === normalizedCat || 
               normalizedSubCat === normalizedCat ||
               normalizedMainCat.includes(normalizedCat) || 
               normalizedSubCat.includes(normalizedCat) ||
               normalizedCat.includes(normalizedMainCat) ||
               normalizedCat.includes(normalizedSubCat);
      });
      if (!matches) {
        return false;
      }
    }
    return true;
  });

  const compareByRating = (a, b) => {
    const ar = Number(a.rating) || 0;
    const br = Number(b.rating) || 0;
    return ar - br;
  };

  const compareByPrice = (a, b) => {
    const ap = Number(a.discount_price) || Number(a.actual_price) || 0;
    const bp = Number(b.discount_price) || Number(b.actual_price) || 0;
    return ap - bp;
  };

  if (state.sort === "rating_desc") {
    items.sort((a, b) => compareByRating(b, a));
  } else if (state.sort === "rating_asc") {
    items.sort(compareByRating);
  } else if (state.sort === "price_desc") {
    items.sort((a, b) => compareByPrice(b, a));
  } else if (state.sort === "price_asc") {
    items.sort(compareByPrice);
  }

  return items;
}

function renderGoods() {
  const items = getFilteredAndSortedItems();
  catalogGrid.innerHTML = "";

  if (items.length === 0) {
    const empty = document.createElement("div");
    empty.textContent = "Нет товаров для отображения.";
    catalogGrid.appendChild(empty);
    return;
  }

  items.forEach(item => {
    const card = document.createElement("article");
    card.className = "product-card";

    const imageWrapper = document.createElement("div");
    imageWrapper.className = "product-image-wrapper";

    if (item.image_url) {
      const img = document.createElement("img");
      img.className = "product-image";
      img.src = item.image_url;
      img.alt = item.name || "Товар";
      imageWrapper.appendChild(img);
    } else {
      const placeholder = document.createElement("div");
      placeholder.className = "product-placeholder";
      placeholder.textContent = "Изображение товара";
      imageWrapper.appendChild(placeholder);
    }

    const body = document.createElement("div");
    body.className = "product-body";

    const title = document.createElement("h2");
    title.className = "product-title";
    title.textContent = item.name || "Название товара";

    const ratingRow = document.createElement("div");
    ratingRow.className = "product-rating";
    const ratingValue = Number(item.rating) || null;
    if (ratingValue != null) {
      const ratingText = document.createElement("span");
      ratingText.textContent = ratingValue.toFixed(1);
      const stars = document.createElement("span");
      stars.className = "stars";
      const wholeStars = Math.round(Math.max(0, Math.min(5, ratingValue)));
      stars.textContent = "★".repeat(wholeStars) + "☆".repeat(5 - wholeStars);
      ratingRow.appendChild(ratingText);
      ratingRow.appendChild(stars);
    }

    const prices = document.createElement("div");
    prices.className = "product-prices";
    const actualPrice = Number(item.actual_price) || 0;
    const discountPrice = Number(item.discount_price) || 0;
    const currentPrice = discountPrice > 0 ? discountPrice : actualPrice;
    
    const priceCurrent = document.createElement("span");
    priceCurrent.className = "price-current";
    priceCurrent.textContent = currentPrice > 0 ? `${currentPrice.toFixed(0)} ₽` : "—";
    prices.appendChild(priceCurrent);

    if (discountPrice > 0 && discountPrice < actualPrice && actualPrice > 0) {
      const priceOld = document.createElement("span");
      priceOld.className = "price-old";
      priceOld.textContent = `${actualPrice.toFixed(0)} ₽`;
      prices.appendChild(priceOld);

      const discount = document.createElement("span");
      discount.className = "price-discount";
      const percent = Math.round(((actualPrice - discountPrice) / actualPrice) * 100);
      discount.textContent = `-${percent}%`;
      prices.appendChild(discount);
    }

    const footer = document.createElement("div");
    footer.className = "product-footer";
    const addButton = document.createElement("button");
    addButton.type = "button";
    addButton.className = "button button-primary product-add";
    addButton.textContent = "Добавить";
    addButton.addEventListener("click", () => {
      handleAddToCart(item);
    });
    footer.appendChild(addButton);

    body.appendChild(title);
    if (ratingRow.childNodes.length > 0) {
      body.appendChild(ratingRow);
    }
    body.appendChild(prices);

    card.appendChild(imageWrapper);
    card.appendChild(body);
    card.appendChild(footer);
    catalogGrid.appendChild(card);
  });
}

function toggleLoadMore(loading) {
  if (!loadMoreButton) {
    return;
  }
  if (loading) {
    loadMoreButton.disabled = true;
    loadMoreButton.textContent = "Загрузка...";
  } else {
    loadMoreButton.disabled = false;
    loadMoreButton.textContent = "Загрузить ещё";
  }
}

function updateLoadMoreVisibility() {
  if (!loadMoreButton) {
    return;
  }
  loadMoreButton.style.display = state.hasMore ? "inline-flex" : "none";
}

function handleAddToCart(item) {
  const raw = localStorage.getItem("mptv_cart");
  let cart = [];
  if (raw) {
    try {
      cart = JSON.parse(raw);
    } catch {
      cart = [];
    }
  }
  const existing = cart.find(cartItem => cartItem.id === item.id);
  if (existing) {
    existing.quantity += 1;
  } else {
    const actualPrice = Number(item.actual_price) || 0;
    const discountPrice = Number(item.discount_price) || 0;
    const currentPrice = discountPrice > 0 ? discountPrice : actualPrice;
    cart.push({
      id: item.id,
      name: item.name || "",
      image_url: item.image_url || "",
      rating: Number(item.rating) || 0,
      actual_price: actualPrice,
      discount_price: discountPrice,
      price: currentPrice,
      quantity: 1
    });
  }
  localStorage.setItem("mptv_cart", JSON.stringify(cart));
  showNotification("Товар добавлен в корзину", "info");
}

let categoriesInitialized = false;

function updateCategoriesFromItems() {
  if (state.items.length === 0 || categoriesInitialized) {
    return;
  }

  const categoryCounts = {};
  state.items.forEach(item => {
    if (item.main_category) {
      const cat = String(item.main_category).toLowerCase().trim();
      categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
    }
  });

  const sortedCategories = Object.entries(categoryCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([cat]) => cat);

  const categoryFilters = document.getElementById("category-filters");
  if (categoryFilters && sortedCategories.length > 0) {
    const categoryLabels = {
      "electronics": "Электроника",
      "sports & fitness": "Спорт и фитнес",
      "sports": "Спорт и фитнес",
      "fitness": "Спорт и фитнес",
      "home & kitchen": "Дом и кухня",
      "home": "Дом и кухня",
      "kitchen": "Дом и кухня",
      "clothing": "Одежда",
      "apparel": "Одежда",
      "books": "Книги",
      "book": "Книги",
      "toys & games": "Игрушки и игры",
      "toys": "Игрушки и игры",
      "beauty & personal care": "Красота и уход",
      "beauty": "Красота и уход"
    };

    const existingCheckboxes = categoryFilters.querySelectorAll('input[name="category"]');
    const selectedValues = Array.from(existingCheckboxes).filter(cb => cb.checked).map(cb => cb.value);
    
    existingCheckboxes.forEach((checkbox, index) => {
      if (index < sortedCategories.length) {
        const cat = sortedCategories[index];
        checkbox.value = cat;
        if (selectedValues.includes(checkbox.value)) {
          checkbox.checked = true;
        }
        const label = checkbox.parentElement.querySelector("span");
        if (label) {
          const displayName = categoryLabels[cat] || cat.split(" ").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
          label.textContent = displayName;
        }
      } else {
        checkbox.parentElement.style.display = "none";
      }
    });
    
    categoriesInitialized = true;
  }
}

function readFiltersFromControls() {
  const categoryCheckboxes = document.querySelectorAll('input[name="category"]:checked');
  const categories = Array.from(categoryCheckboxes).map(input => input.value);

  const priceMin = priceMinInput.value !== "" ? Number(priceMinInput.value) : null;
  const priceMax = priceMaxInput.value !== "" ? Number(priceMaxInput.value) : null;

  state.filters.categories = categories;
  state.filters.priceMin = Number.isFinite(priceMin) ? priceMin : null;
  state.filters.priceMax = Number.isFinite(priceMax) ? priceMax : null;
  state.filters.discountOnly = discountOnlyCheckbox.checked;
}

function initEvents() {
  if (loadMoreButton) {
    loadMoreButton.addEventListener("click", () => {
      if (!state.hasMore) {
        return;
      }
      state.page += 1;
      fetchGoods();
    });
  }

  if (sortSelect) {
    sortSelect.addEventListener("change", () => {
      state.sort = sortSelect.value;
      renderGoods();
    });
  }

  if (searchForm && searchInput) {
    searchForm.addEventListener("submit", event => {
      event.preventDefault();
      state.query = searchInput.value || "";
      state.page = 1;
      state.items = [];
      state.hasMore = true;
      updateLoadMoreVisibility();
      fetchGoods();
    });
  }

  if (filterApplyButton) {
    filterApplyButton.addEventListener("click", () => {
      readFiltersFromControls();
      renderGoods();
    });
  }
}

document.addEventListener("DOMContentLoaded", () => {
  if (!notificationContainer || !catalogGrid) {
    console.error("Не найдены необходимые элементы DOM");
    return;
  }
  initEvents();
  fetchGoods();
});


