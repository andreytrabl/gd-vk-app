// ============================================================
// ГДЕ БЕНЗ — Mini App, ЭТАП 1
//
// На этом этапе backend ещё не существует (появится на Этапе 2).
// Запрос на сохранение настроек уже написан по-боевому (fetch на
// /api/subscribers/register), но пока backend не поднят — он
// будет падать с ошибкой сети, и это ожидаемо. Пользователю в
// таком случае показывается человекочитаемое сообщение, а не
// stack trace (см. requirement #8 ТЗ).
// ============================================================

// Когда появится backend (Этап 2), сюда впишем его настоящий адрес.
// Пока backend не запущен, запрос будет падать — это нормально для Этапа 1.
const API_BASE_URL = "";

const statusBox = document.getElementById("statusBox");
const notifyBtn = document.getElementById("notifyBtn");
const saveBtn = document.getElementById("saveBtn");
const saveStatus = document.getElementById("saveStatus");
const debugBox = document.getElementById("debugBox");

let vkUserId = null;
let notificationsEnabled = null; // true / false / null (неизвестно)

function getLaunchParams() {
  const params = new URLSearchParams(window.location.search);
  return {
    vk_user_id: params.get("vk_user_id"),
    vk_are_notifications_enabled: params.get("vk_are_notifications_enabled"),
  };
}

function setStatus(text, mode) {
  statusBox.textContent = text;
  statusBox.classList.remove("ok", "off");
  if (mode === "ok") statusBox.classList.add("ok");
  if (mode === "off") statusBox.classList.add("off");
}

function renderStatus() {
  if (!vkUserId) {
    setStatus("Откройте приложение внутри VK для включения уведомлений");
    notifyBtn.disabled = true;
    return;
  }

  if (notificationsEnabled === true) {
    setStatus("Уведомления включены", "ok");
  } else if (notificationsEnabled === false) {
    setStatus("Уведомления выключены", "off");
  } else {
    setStatus("Статус уведомлений неизвестен");
  }
}

function getSelectedFuels() {
  const boxes = document.querySelectorAll(".fuel-toggle");
  const fuels = [];
  boxes.forEach((box) => {
    if (box.checked) fuels.push(box.dataset.fuel);
  });
  return fuels;
}

async function init() {
  const launch = getLaunchParams();
  vkUserId = launch.vk_user_id || null;
  notificationsEnabled =
    launch.vk_are_notifications_enabled === "1"
      ? true
      : launch.vk_are_notifications_enabled === "0"
      ? false
      : null;

  debugBox.textContent = vkUserId
    ? `VK ID: ${vkUserId}`
    : "Открыто вне VK (launch-параметров нет)";

  if (window.vkBridge) {
    try {
      await window.vkBridge.send("VKWebAppInit");
    } catch (e) {
      // Инициализация не удалась — считаем, что мы не внутри VK.
      console.warn("VKWebAppInit failed", e);
    }

    // Необязательное уточнение данных о пользователе (имя и т.д.).
    // Не критично для MVP — если не получится, просто игнорируем.
    if (vkUserId) {
      try {
        const userInfo = await window.vkBridge.send("VKWebAppGetUserInfo");
        if (userInfo && userInfo.first_name) {
          debugBox.textContent = `VK ID: ${vkUserId} (${userInfo.first_name})`;
        }
      } catch (e) {
        console.warn("VKWebAppGetUserInfo failed", e);
      }
    }
  }

  renderStatus();
}

notifyBtn.addEventListener("click", async () => {
  if (!window.vkBridge || !vkUserId) {
    setStatus("Откройте приложение внутри VK для включения уведомлений");
    return;
  }

  try {
    const result = await window.vkBridge.send("VKWebAppAllowNotifications");
    notificationsEnabled = !!(result && result.result);
  } catch (e) {
    // Пользователь отказал или произошла ошибка — в обоих случаях
    // считаем уведомления выключенными и не показываем технику.
    notificationsEnabled = false;
  }

  renderStatus();
});

saveBtn.addEventListener("click", async () => {
  if (!vkUserId) {
    saveStatus.textContent = "Сначала откройте приложение внутри VK.";
    return;
  }

  const fuels = getSelectedFuels();
  saveStatus.textContent = "Сохраняю…";

  try {
    const response = await fetch(`${API_BASE_URL}/api/subscribers/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_id: Number(vkUserId),
        fuels: fuels,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    saveStatus.textContent = "Настройки сохранены.";
  } catch (e) {
    console.warn("Save failed", e);
    saveStatus.textContent =
      "Не удалось сохранить на сервере (сервер подключим на следующем этапе).";
  }
});

init();
