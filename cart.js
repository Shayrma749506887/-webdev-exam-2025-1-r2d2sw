const API_BASE = "http://api.std-900.ist.mospolytech.ru/exam-2024-1/api";
const API_KEY = "4d54f5ce-e1a1-4554-bd67-70c06b301d2b";
const DELIVERY_BASE = 200;

const notificationContainer = document.getElementById("notification-container");
const cartGrid = document.getElementById("cart-grid");
const cartEmpty = document.getElementById("cart-empty");
const orderForm = document.getElementById("order-form");
const orderTotal = document.getElementById("order-total");
const orderDelivery = document.getElementById("order-delivery");

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

function readCart() {
  const raw = localStorage.getItem("mptv_cart");
  if (!raw) {
    return [];
  }
  try {
    const data = JSON.parse(raw);
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function writeCart(cart) {
  localStorage.setItem("mptv_cart", JSON.stringify(cart));
}

function formatRub(value) {
  const n = Number(value) || 0;
  return `${Math.round(n)} ₽`;
}

function renderStars(rating) {
  const value = Number(rating) || 0;
  const rounded = Math.round(Math.max(0, Math.min(5, value)));
  return "★".repeat(rounded) + "☆".repeat(5 - rounded);
}

function calcDeliveryPrice(date, slot) {
  if (!date || !slot) {
    return DELIVERY_BASE;
  }
  const d = new Date(date);
  const dayOfWeek = d.getDay();
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
  const slotStart = slot.split("-")[0];
  const hour = slotStart ? parseInt(slotStart.split(":")[0], 10) : 0;
  const isEvening = hour >= 18;
  const isWeekday = !isWeekend;

  let price = DELIVERY_BASE;
  if (isWeekend) {
    price += 300;
  } else if (isWeekday && isEvening) {
    price += 200;
  }
  return price;
}

function calcCartTotals(cart, deliveryDate, deliverySlot) {
  const itemsTotal = cart.reduce((sum, item) => {
    const price = Number(item.price) || Number(item.discount_price) || Number(item.actual_price) || 0;
    const qty = Number(item.quantity) || 1;
    return sum + price * qty;
  }, 0);
  const delivery = cart.length > 0 ? calcDeliveryPrice(deliveryDate, deliverySlot) : 0;
  return { itemsTotal, delivery, total: itemsTotal + delivery };
}

async function fetchGoodsByIds(ids) {
  const goodsMap = new Map();
  try {
    const url = `${API_BASE}/goods?api_key=${API_KEY}`;
    const response = await fetch(url);
    if (response.ok) {
      const data = await response.json();
      const items = Array.isArray(data) ? data : (data?.data || data?.items || data?.goods || []);
      items.forEach(item => {
        if (ids.includes(item.id)) {
          goodsMap.set(item.id, item);
        }
      });
    }
  } catch (error) {
    console.error("Ошибка загрузки товаров:", error);
  }
  return goodsMap;
}

async function renderCart() {
  const cart = readCart();
  if (!cartGrid || !cartEmpty) {
    return;
  }

  cartGrid.innerHTML = "";

  if (cart.length === 0) {
    cartEmpty.style.display = "block";
    updateSummary(cart);
    return;
  }

  cartEmpty.style.display = "none";

  const ids = cart.map(item => item.id);
  const goodsMap = await fetchGoodsByIds(ids);

  cart.forEach(item => {
    const goodsData = goodsMap.get(item.id) || item;
    const card = document.createElement("article");
    card.className = "product-card";

    const imageWrapper = document.createElement("div");
    imageWrapper.className = "product-image-wrapper";

    const imageUrl = goodsData.image_url || item.image_url;
    if (imageUrl) {
      const img = document.createElement("img");
      img.className = "product-image";
      img.src = imageUrl;
      img.alt = goodsData.name || item.name || "Товар";
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
    title.textContent = goodsData.name || item.name || "Название товара";

    const ratingRow = document.createElement("div");
    ratingRow.className = "product-rating";
    const ratingValue = Number(goodsData.rating || item.rating) || 0;
    if (ratingValue > 0) {
      const ratingText = document.createElement("span");
      ratingText.textContent = ratingValue.toFixed(1);
      const stars = document.createElement("span");
      stars.className = "stars";
      stars.textContent = renderStars(ratingValue);
      ratingRow.appendChild(ratingText);
      ratingRow.appendChild(stars);
    }

    const prices = document.createElement("div");
    prices.className = "product-prices";

    const actualPrice = Number(goodsData.actual_price || item.actual_price) || 0;
    const discountPrice = Number(goodsData.discount_price || item.discount_price) || 0;
    const currentPrice = Number(item.price) || (discountPrice > 0 ? discountPrice : actualPrice);

    const priceCurrent = document.createElement("span");
    priceCurrent.className = "price-current";
    priceCurrent.textContent = currentPrice > 0 ? formatRub(currentPrice) : "—";
    prices.appendChild(priceCurrent);

    if (discountPrice > 0 && actualPrice > 0 && discountPrice < actualPrice) {
      const priceOld = document.createElement("span");
      priceOld.className = "price-old";
      priceOld.textContent = formatRub(actualPrice);
      prices.appendChild(priceOld);

      const discount = document.createElement("span");
      discount.className = "price-discount";
      const percent = Math.round(((actualPrice - discountPrice) / actualPrice) * 100);
      discount.textContent = `-${percent}%`;
      prices.appendChild(discount);
    }

    const qtyRow = document.createElement("div");
    qtyRow.className = "cart-qty";
    const qty = Number(item.quantity) || 1;
    qtyRow.textContent = `Кол-во: ${qty}`;

    const footer = document.createElement("div");
    footer.className = "product-footer";
    const removeButton = document.createElement("button");
    removeButton.type = "button";
    removeButton.className = "button button-secondary product-add";
    removeButton.textContent = "Удалить";
    removeButton.addEventListener("click", () => {
      removeFromCart(item.id);
    });
    footer.appendChild(removeButton);

    body.appendChild(title);
    if (ratingRow.childNodes.length > 0) {
      body.appendChild(ratingRow);
    }
    body.appendChild(prices);
    body.appendChild(qtyRow);

    card.appendChild(imageWrapper);
    card.appendChild(body);
    card.appendChild(footer);
    cartGrid.appendChild(card);
  });

  if (orderForm) {
    updateSummary(cart);
  }
}

function updateSummary(cart) {
  if (!orderTotal || !orderDelivery || !orderForm) {
    return;
  }
  const formData = new FormData(orderForm);
  const deliveryDate = String(formData.get("date") || "").trim();
  const deliverySlot = String(formData.get("slot") || "").trim();
  const totals = calcCartTotals(cart, deliveryDate, deliverySlot);
  if (cart.length === 0) {
    orderTotal.textContent = "Итоговая стоимость: —";
    orderDelivery.textContent = "";
    return;
  }
  orderTotal.textContent = `Итоговая стоимость: ${formatRub(totals.total)}`;
  orderDelivery.textContent = `(стоимость доставки ${formatRub(totals.delivery)})`;
}

function removeFromCart(id) {
  const cart = readCart().filter(item => item.id !== id);
  writeCart(cart);
  renderCart();
  showNotification("Товар удалён из корзины", "info");
}

function readOrderForm() {
  const formData = new FormData(orderForm);
  return {
    name: String(formData.get("name") || "").trim(),
    email: String(formData.get("email") || "").trim(),
    phone: String(formData.get("phone") || "").trim(),
    mailing: formData.get("mailing") === "on",
    address: String(formData.get("address") || "").trim(),
    date: String(formData.get("date") || "").trim(),
    slot: String(formData.get("slot") || "").trim(),
    comment: String(formData.get("comment") || "").trim()
  };
}

function validateOrder(order, cart) {
  if (cart.length === 0) {
    return "Корзина пуста";
  }
  if (!order.name) {
    return "Введите имя";
  }
  if (!order.email || !order.email.includes("@")) {
    return "Введите корректный email";
  }
  if (!order.phone) {
    return "Введите номер телефона";
  }
  if (!order.address) {
    return "Введите адрес доставки";
  }
  if (!order.date) {
    return "Выберите дату доставки";
  }
  if (!order.slot) {
    return "Выберите временной интервал доставки";
  }
  return "";
}

function saveOrder(order, cart, apiResult) {
  const raw = localStorage.getItem("mptv_orders");
  let orders = [];
  if (raw) {
    try {
      orders = JSON.parse(raw);
      if (!Array.isArray(orders)) {
        orders = [];
      }
    } catch {
      orders = [];
    }
  }

  const totals = calcCartTotals(cart, order.date, order.slot);
  const orderRecord = {
    id: apiResult?.id || (crypto && crypto.randomUUID ? crypto.randomUUID() : String(Date.now())),
    created_at: apiResult?.created_at || new Date().toISOString(),
    customer: order,
    items: cart,
    totals
  };
  orders.unshift(orderRecord);
  localStorage.setItem("mptv_orders", JSON.stringify(orders));
}

function formatDateForAPI(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}.${month}.${year}`;
}

async function submitOrder(order, cart) {
  try {
    const totals = calcCartTotals(cart, order.date, order.slot);
    const goodIds = [];
    cart.forEach(item => {
      const qty = Number(item.quantity) || 1;
      for (let i = 0; i < qty; i++) {
        goodIds.push(item.id);
      }
    });

    const orderData = {
      full_name: order.name,
      email: order.email,
      phone: order.phone,
      delivery_address: order.address,
      delivery_date: formatDateForAPI(order.date),
      delivery_interval: order.slot,
      comment: order.comment || "",
      subscribe: order.mailing || false,
      good_ids: goodIds
    };

    const url = `${API_BASE}/orders?api_key=${API_KEY}`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(orderData)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Ошибка ${response.status}: ${errorText || "Не удалось оформить заказ"}`);
    }

    const result = await response.json();
    saveOrder(order, cart, result);
    writeCart([]);
    orderForm.reset();
    await renderCart();
    showNotification("Заказ успешно оформлен", "success");
    setTimeout(() => {
      window.location.href = "index.html";
    }, 1500);
  } catch (error) {
    console.error("Ошибка оформления заказа:", error);
    showNotification(error.message || "Ошибка при оформлении заказа", "error");
  }
}

function initCartPage() {
  renderCart();

  if (orderForm) {
    const dateInput = orderForm.elements["date"];
    const slotInput = orderForm.elements["slot"];
    if (dateInput) {
      dateInput.addEventListener("change", () => {
        const cart = readCart();
        updateSummary(cart);
      });
    }
    if (slotInput) {
      slotInput.addEventListener("change", () => {
        const cart = readCart();
        updateSummary(cart);
      });
    }

    orderForm.addEventListener("submit", async event => {
      event.preventDefault();
      const cart = readCart();
      const order = readOrderForm();
      const error = validateOrder(order, cart);
      if (error) {
        showNotification(error, "error");
        return;
      }
      await submitOrder(order, cart);
    });

    orderForm.addEventListener("reset", () => {
      showNotification("Форма очищена", "info");
    });
  }
}

document.addEventListener("DOMContentLoaded", () => {
  initCartPage();
});


