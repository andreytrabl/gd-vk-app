// ============================================================
// ГДЕ БЕНЗ — карта АЗС
//
// Сейчас работает на ДЕМО-ДАННЫХ (DEMO_STATIONS ниже).
// Когда появится backend (Этап 2), эти данные будут приходить с
// GET /api/stations — это тот же JSON, что main.py уже пишет на
// диск после каждой проверки ГдеБенз (координаты, адрес, марки,
// очередь), просто отдаваемый backend'ом наружу. Менять сам бот
// для этого не нужно.
//
// Формат станции (совпадает с тем, что бот уже собирает):
// {
//   id: "уникальный id станции",
//   address: "адрес",
//   lat: 54.19, lon: 37.62,
//   fuels: { ai92:"yes"|"unknown", ai95:..., ai98:..., ai100:..., diesel:... },
//   queue: "yes" | "unknown"
// }
// ============================================================

const FUEL_LABELS = {
  ai92: "АИ-92",
  ai95: "АИ-95",
  ai98: "АИ-98",
  ai100: "АИ-100",
  diesel: "Дизель",
};

const DEMO_STATIONS = [
  {
    id: "demo-1",
    address: "Тула, просп. Ленина, 112В",
    lat: 54.1900, lon: 37.6180,
    fuels: { ai92: "unknown", ai95: "yes", ai98: "unknown", ai100: "unknown", diesel: "yes" },
    queue: "yes",
  },
  {
    id: "demo-2",
    address: "Тула, ул. Рязанская, 48",
    lat: 54.1980, lon: 37.6420,
    fuels: { ai92: "yes", ai95: "yes", ai98: "unknown", ai100: "unknown", diesel: "unknown" },
    queue: "unknown",
  },
  {
    id: "demo-3",
    address: "Тула, Веневское шоссе, 4Б",
    lat: 54.2140, lon: 37.6470,
    fuels: { ai92: "unknown", ai95: "unknown", ai98: "unknown", ai100: "unknown", diesel: "unknown" },
    queue: "unknown",
  },
  {
    id: "demo-4",
    address: "Щёкино, ул. Советская, 10",
    lat: 54.0010, lon: 37.5390,
    fuels: { ai92: "unknown", ai95: "yes", ai98: "yes", ai100: "unknown", diesel: "unknown" },
    queue: "unknown",
  },
];

function buildRouteUrl(lat, lon) {
  // Яндекс.Карты: маршрут "от текущей геолокации" (пустой origin перед ~)
  // до точки lat,lon. Работает и в приложении Яндекс.Карт, и в браузере.
  return `https://yandex.ru/maps/?rtext=~${lat},${lon}&rtt=auto`;
}

function stationHasFuel(station) {
  return Object.values(station.fuels).some((v) => v === "yes");
}

function buildPopupHtml(station) {
  const fuelsYes = Object.entries(station.fuels)
    .filter(([, status]) => status === "yes")
    .map(([key]) => FUEL_LABELS[key])
    .join(", ");

  const queueLine =
    station.queue === "yes" ? `<div class="popup-queue">🚗 Очередь — есть</div>` : "";

  const fuelsLine = fuelsYes
    ? `<div class="popup-fuels">🟢 ${fuelsYes}</div>`
    : `<div class="popup-fuels">Данных о марках нет</div>`;

  const routeUrl = buildRouteUrl(station.lat, station.lon);

  return `
    <div class="popup-title">${station.address}</div>
    ${fuelsLine}
    ${queueLine}
    <a class="popup-route" href="${routeUrl}" target="_blank" rel="noopener">🧭 Построить маршрут</a>
  `;
}

function initMap() {
  const map = L.map("mapContainer", {
    zoomControl: true,
  }).setView([54.193, 37.617], 11); // центр — Тула

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: "© OpenStreetMap contributors",
  }).addTo(map);

  const markersById = {};

  DEMO_STATIONS.forEach((station) => {
    const hasFuel = stationHasFuel(station);

    const marker = L.circleMarker([station.lat, station.lon], {
      radius: 9,
      color: "#ffffff",
      weight: 2,
      fillColor: hasFuel ? "#2fa64f" : "#b5b7bd",
      fillOpacity: 1,
    }).addTo(map);

    marker.bindPopup(buildPopupHtml(station));
    markersById[station.id] = marker;
  });

  window.gdeBenzMap = map;
  window.gdeBenzMarkers = markersById;

  return markersById;
}

function openStationFromHash(markersById) {
  const match = window.location.hash.match(/station=([^&]+)/);
  if (!match) return;

  const stationId = decodeURIComponent(match[1]);
  const marker = markersById[stationId];
  if (!marker) return;

  // Так будет вести себя клик по персональному уведомлению после
  // подключения notifications.sendMessage (id станции придёт в fragment).
  switchTab("map");
  window.gdeBenzMap.setView(marker.getLatLng(), 14);
  marker.openPopup();
}

document.addEventListener("DOMContentLoaded", () => {
  const markersById = initMap();
  openStationFromHash(markersById);
});
