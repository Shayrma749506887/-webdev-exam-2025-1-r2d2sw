const API_BASE = "http://api.std-900.ist.mospolytech.ru/exam-2024-1/api";
const API_KEY = "4d54f5ce-e1a1-4554-bd67-70c06b301d2b";

const notificationContainer = document.getElementById("notification-container");
const ordersBody = document.getElementById("orders-body");
const modalBackdrop = document.getElementById("modal-backdrop");
const viewModal = document.getElementById("view-modal");
const editModal = document.getElementById("edit-modal");
const deleteModal = document.getElementById("delete-modal");
const editForm = document.getElementById("edit-form");
const editSaveBtn = document.getElementById("edit-save");
const deleteConfirmBtn = document.getElementById("delete-confirm");

let currentOrderId = null;
let notificationTimeout = null;

function showNotification(message, type) {
  if (!notificationContainer) return;
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
  notification.append(text, close);
  notificationContainer.appendChild(notification);
  notificationTimeout = setTimeout(() => {
    notificationContainer.innerHTML = "";
    notificationTimeout = null;
  }, 5000);
}

function readOrders() {
  const raw = localStorage.getItem("mptv_orders");
  if (!raw) return [];
  try {
    const data = JSON.parse(raw);
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function writeOrders(orders) {
  localStorage.setItem("mptv_orders", JSON.stringify(orders));
}

function formatRub(value) {
  const n = Number(value) || 0;
  return `${Math.round(n)} ₽`;
}

function formatDateTime(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = v => String(v).padStart(2, "0");
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function parseDateToInputFormat(dateStr) {
  if (!dateStr) return "";
  if (dateStr.includes(".")) {
    const parts = dateStr.split(".");
    if (parts.length === 3) {
      return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
  }
  const d = new Date(dateStr);
  if (!isNaN(d.getTime())) {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }
  return dateStr;
}

function renderOrders() {
  const orders = readOrders();
  if (!ordersBody) return;
  ordersBody.innerHTML = "";

  if (orders.length === 0) {
    const row = document.createElement("tr");
    row.className = "orders-empty";
    const cell = document.createElement("td");
    cell.colSpan = 6;
    cell.textContent = "Заказов нет";
    row.appendChild(cell);
    ordersBody.appendChild(row);
    return;
  }

  orders.forEach((order, index) => {
    const tr = document.createElement("tr");

    const tdIdx = document.createElement("td");
    tdIdx.textContent = `${index + 1}.`;

    const tdDate = document.createElement("td");
    tdDate.textContent = formatDateTime(order.created_at);

    const tdItems = document.createElement("td");
    const names = (order.items || []).map(i => i.name || "").filter(Boolean);
    tdItems.textContent = names.join(", ");

    const tdCost = document.createElement("td");
    tdCost.textContent = order.totals ? formatRub(order.totals.total) : "—";

    const tdDelivery = document.createElement("td");
    const deliveryDate = order.customer?.date || "";
    const deliverySlot = order.customer?.slot || "";
    tdDelivery.textContent = deliveryDate && deliverySlot ? `${deliveryDate} ${deliverySlot}` : "";

    const tdActions = document.createElement("td");
    tdActions.className = "orders-actions";

    const btnView = document.createElement("button");
    btnView.type = "button";
    btnView.className = "action-btn";
    btnView.textContent = "👁";
    btnView.title = "Просмотр";
    btnView.addEventListener("click", () => openView(order.id));

    const btnEdit = document.createElement("button");
    btnEdit.type = "button";
    btnEdit.className = "action-btn";
    btnEdit.textContent = "✎";
    btnEdit.title = "Редактировать";
    btnEdit.addEventListener("click", () => openEdit(order.id));

    const btnDelete = document.createElement("button");
    btnDelete.type = "button";
    btnDelete.className = "action-btn";
    btnDelete.textContent = "🗑";
    btnDelete.title = "Удалить";
    btnDelete.addEventListener("click", () => openDelete(order.id));

    tdActions.append(btnView, btnEdit, btnDelete);

    tr.append(tdIdx, tdDate, tdItems, tdCost, tdDelivery, tdActions);
    ordersBody.appendChild(tr);
  });
}

function openModal(modal) {
  if (!modal || !modalBackdrop) return;
  modal.classList.add("modal-open");
  modalBackdrop.classList.add("modal-open");
}

function closeModals() {
  [viewModal, editModal, deleteModal].forEach(m => {
    if (m) m.classList.remove("modal-open");
  });
  if (modalBackdrop) modalBackdrop.classList.remove("modal-open");
  currentOrderId = null;
}

function openView(id) {
  const order = readOrders().find(o => o.id === id);
  if (!order || !viewModal) return;
  currentOrderId = id;
  const body = document.getElementById("view-modal-body");
  if (body) {
    body.innerHTML = `
      <div class="order-view">
        <div><strong>Дата оформления</strong><div>${formatDateTime(order.created_at) || "—"}</div></div>
        <div><strong>Имя</strong><div>${order.customer?.name || "—"}</div></div>
        <div><strong>Номер телефона</strong><div>${order.customer?.phone || "—"}</div></div>
        <div><strong>Email</strong><div>${order.customer?.email || "—"}</div></div>
        <div><strong>Адрес доставки</strong><div>${order.customer?.address || "—"}</div></div>
        <div><strong>Дата доставки</strong><div>${order.customer?.date || "—"}</div></div>
        <div><strong>Время доставки</strong><div>${order.customer?.slot || "—"}</div></div>
        <div><strong>Состав заказа</strong><div>${(order.items || []).map(i => i.name).join(", ") || "—"}</div></div>
        <div><strong>Стоимость</strong><div>${order.totals ? formatRub(order.totals.total) : "—"}</div></div>
        <div><strong>Комментарий</strong><div>${order.customer?.comment || "—"}</div></div>
      </div>
    `;
  }
  openModal(viewModal);
}

function calcDeliveryPrice(date, slot) {
  if (!date || !slot) {
    return 200;
  }
  const dateStr = date.includes(".") ? date : parseDateToInputFormat(date);
  const d = dateStr.includes("-") ? new Date(dateStr) : new Date(dateStr.split(".").reverse().join("-"));
  if (isNaN(d.getTime())) {
    return 200;
  }
  const dayOfWeek = d.getDay();
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
  const slotStart = slot.split("-")[0];
  const hour = slotStart ? parseInt(slotStart.split(":")[0], 10) : 0;
  const isEvening = hour >= 18;
  const isWeekday = !isWeekend;

  let price = 200;
  if (isWeekend) {
    price += 300;
  } else if (isWeekday && isEvening) {
    price += 200;
  }
  return price;
}

function updateEditOrderTotal() {
  if (!editForm || !currentOrderId) return;
  const order = readOrders().find(o => o.id === currentOrderId);
  if (!order) return;

  const formData = new FormData(editForm);
  const date = String(formData.get("date") || "").trim();
  const slot = String(formData.get("slot") || "").trim();
  
  const itemsTotal = order.totals?.items || order.totals?.total - (order.totals?.delivery || 0) || 0;
  const delivery = calcDeliveryPrice(date, slot);
  const total = itemsTotal + delivery;

  const totalDisplay = document.getElementById("edit-order-total");
  const deliveryDisplay = document.getElementById("edit-order-delivery");
  if (totalDisplay) {
    totalDisplay.textContent = `Итоговая стоимость: ${formatRub(total)}`;
  }
  if (deliveryDisplay) {
    deliveryDisplay.textContent = `(стоимость доставки ${formatRub(delivery)})`;
  }
}

function openEdit(id) {
  const order = readOrders().find(o => o.id === id);
  if (!order || !editModal || !editForm) return;
  currentOrderId = id;
  editForm.reset();
  editForm.elements["name"].value = order.customer?.name || "";
  editForm.elements["phone"].value = order.customer?.phone || "";
  editForm.elements["email"].value = order.customer?.email || "";
  editForm.elements["address"].value = order.customer?.address || "";
  editForm.elements["date"].value = parseDateToInputFormat(order.customer?.date || "");
  editForm.elements["slot"].value = order.customer?.slot || "";
  editForm.elements["comment"].value = order.customer?.comment || "";
  
  const dateInput = editForm.elements["date"];
  const slotInput = editForm.elements["slot"];
  if (dateInput) {
    dateInput.removeEventListener("change", updateEditOrderTotal);
    dateInput.addEventListener("change", updateEditOrderTotal);
  }
  if (slotInput) {
    slotInput.removeEventListener("change", updateEditOrderTotal);
    slotInput.addEventListener("change", updateEditOrderTotal);
  }
  
  updateEditOrderTotal();
  openModal(editModal);
}

function openDelete(id) {
  currentOrderId = id;
  openModal(deleteModal);
}

function formatDateForAPI(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) {
    if (dateStr.includes(".")) {
      return dateStr;
    }
    return dateStr;
  }
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}.${month}.${year}`;
}

async function saveEdit() {
  if (!currentOrderId || !editForm) return;
  const formData = new FormData(editForm);
  const order = readOrders().find(o => o.id === currentOrderId);
  if (!order) return;

  const dateValue = String(formData.get("date") || "").trim();
  const updateData = {
    full_name: String(formData.get("name") || "").trim(),
    phone: String(formData.get("phone") || "").trim(),
    email: String(formData.get("email") || "").trim(),
    delivery_address: String(formData.get("address") || "").trim(),
    delivery_date: formatDateForAPI(dateValue),
    delivery_interval: String(formData.get("slot") || "").trim(),
    comment: String(formData.get("comment") || "").trim()
  };

  try {
    const url = `${API_BASE}/orders/${currentOrderId}?api_key=${API_KEY}`;
    const response = await fetch(url, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(updateData)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Ошибка ${response.status}: ${errorText || "Не удалось обновить заказ"}`);
    }

    const orders = readOrders();
    const idx = orders.findIndex(o => o.id === currentOrderId);
    if (idx !== -1) {
      const formData = new FormData(editForm);
      const date = String(formData.get("date") || "").trim();
      const slot = String(formData.get("slot") || "").trim();
      const itemsTotal = orders[idx].totals?.items || orders[idx].totals?.total - (orders[idx].totals?.delivery || 0) || 0;
      const delivery = calcDeliveryPrice(date, slot);
      
      orders[idx].customer = {
        ...orders[idx].customer,
        name: updateData.full_name,
        phone: updateData.phone,
        email: updateData.email,
        address: updateData.delivery_address,
        date: updateData.delivery_date,
        slot: updateData.delivery_interval,
        comment: updateData.comment
      };
      orders[idx].totals = {
        items: itemsTotal,
        delivery: delivery,
        total: itemsTotal + delivery
      };
      writeOrders(orders);
      renderOrders();
    }
    showNotification("Заказ успешно обновлён", "success");
    closeModals();
  } catch (error) {
    console.error("Ошибка обновления заказа:", error);
    showNotification(error.message || "Ошибка при обновлении заказа", "error");
  }
}

async function confirmDelete() {
  if (!currentOrderId) return;
  try {
    const url = `${API_BASE}/orders/${currentOrderId}?api_key=${API_KEY}`;
    const response = await fetch(url, {
      method: "DELETE"
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Ошибка ${response.status}: ${errorText || "Не удалось удалить заказ"}`);
    }

    const orders = readOrders().filter(o => o.id !== currentOrderId);
    writeOrders(orders);
    renderOrders();
    showNotification("Заказ успешно удалён", "success");
    closeModals();
  } catch (error) {
    console.error("Ошибка удаления заказа:", error);
    showNotification(error.message || "Ошибка при удалении заказа", "error");
  }
}

function initOrdersPage() {
  renderOrders();

  document.querySelectorAll("[data-modal-close]").forEach(btn => {
    btn.addEventListener("click", closeModals);
  });
  if (modalBackdrop) {
    modalBackdrop.addEventListener("click", closeModals);
  }
  if (editSaveBtn) {
    editSaveBtn.addEventListener("click", saveEdit);
  }
  if (deleteConfirmBtn) {
    deleteConfirmBtn.addEventListener("click", confirmDelete);
  }
}

document.addEventListener("DOMContentLoaded", initOrdersPage);


