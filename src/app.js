const layerConfig = [
  { id: "pipelines", label: "Pipelines", color: "#6fb7d6", kind: "line", checked: true },
  { id: "lng-terminals", label: "LNG Terminals", color: "#d7a85a", kind: "point", checked: true },
  { id: "shipping-traffic", label: "Shipping Traffic", color: "#c58ccf", kind: "line", checked: true },
  { id: "trade-routes", label: "Trade Routes", color: "#75b98b", kind: "line", checked: true },
  { id: "mining-sites", label: "Mining Sites", color: "#d98686", kind: "point", checked: true },
  { id: "chokepoints", label: "Chokepoints", color: "#d9e1e3", kind: "point", checked: true },
  { id: "processing-plants", label: "Processing Plants", color: "#a995d7", kind: "point", checked: true },
  { id: "commodity-ports", label: "Commodity Ports", color: "#70c8bb", kind: "point", checked: true },
  { id: "commodity-hubs", label: "Commodity Hubs", color: "#d69563", kind: "point", checked: true },
  { id: "critical-minerals", label: "Critical Minerals", color: "#c7d66f", kind: "point", checked: true },
  { id: "sanctioned-countries", label: "Sanctioned Countries", color: "#d87398", kind: "polygon", checked: true }
];

const tabs = ["energy", "commodities", "agriculture"];
const timeframes = ["MTD", "1M", "QTD", "3M", "6M", "YTD", "1Y", "3Y", "5Y", "10Y"];

let selectedAssetIndex = 0;
let map;
let popup;
let activeMapFeatures = [];
let overlayFrame = 0;
let state = {
  futures: "energy",
  stocks: "energy",
  news: "all",
  timeframe: "MTD",
  data: {}
};

const $ = (selector) => document.querySelector(selector);
const formatPct = (value) => `${value > 0 ? "+" : ""}${Number(value || 0).toFixed(2)}%`;

async function getData(path) {
  const response = await fetch(path, { cache: "no-store" });
  if (!response.ok) throw new Error(`Unable to load ${path}`);
  return response.json();
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#039;"
  })[char]);
}

function titleCase(value) {
  return value === "all" ? "All" : value[0].toUpperCase() + value.slice(1);
}

function renderLayerToolbar() {
  $("#layerToolbar").innerHTML = `
    <div class="layer-actions" aria-label="Layer visibility controls">
      <button type="button" class="layer-action" data-layer-action="none">Remove all</button>
      <button type="button" class="layer-action" data-layer-action="all">Add all</button>
    </div>
    <div class="layer-toggle-list">
      ${layerConfig.map((layer) => `
        <label class="layer-toggle">
          <input type="checkbox" data-layer="${layer.id}" ${layer.checked ? "checked" : ""} />
          <span class="checkmark"></span>
          <span class="layer-color-dot" style="--layer-color:${layer.color}"></span>
          ${layer.label}
        </label>
      `).join("")}
    </div>
  `;

  $("#mapLegend").innerHTML = layerConfig.slice(0, 8).map((layer) => `
    <span class="legend-pill"><span class="legend-dot" style="--legend-color:${layer.color}"></span>${layer.label}</span>
  `).join("");

  $("#layerToolbar").addEventListener("change", (event) => {
    const target = event.target;
    if (!target.dataset.layer) return;
    setLayerVisibility(target.dataset.layer, target.checked);
  });

  $("#layerToolbar").addEventListener("click", (event) => {
    const action = event.target.dataset.layerAction;
    if (!action) return;

    const visible = action === "all";
    layerConfig.forEach((layer) => {
      setLayerVisibility(layer.id, visible);
      const checkbox = $(`#layerToolbar input[data-layer="${layer.id}"]`);
      if (checkbox) checkbox.checked = visible;
    });
  });
}

function setLayerVisibility(layerId, visible) {
  const layer = layerConfig.find((item) => item.id === layerId);
  if (layer) layer.checked = visible;
  document.querySelectorAll(`[data-map-layer="${layerId}"]`).forEach((node) => {
    node.style.display = visible ? "" : "none";
  });
}

function applyLayerVisibility(group, layer) {
  group.style.display = layer.checked ? "" : "none";
}

function sanctionOpacity(feature) {
  return 0.16;
}

function splitFeaturesByLayer(featureCollection) {
  return layerConfig.reduce((acc, layer) => {
    acc[layer.id] = {
      type: "FeatureCollection",
      features: featureCollection.features
        .filter((feature) => feature.properties.layer === layer.id)
        .map((feature) => ({
          ...feature,
          properties: {
            ...feature.properties,
            layerLabel: layer.label
          }
        }))
    };
    return acc;
  }, {});
}

function assetSummary(feature) {
  const props = feature.properties || {};
  return {
    name: props.name,
    layer: props.layerLabel || layerConfig.find((layer) => layer.id === props.layer)?.label || props.layer,
    country: props.country,
    status: props.status,
    relevance: props.relevance || props.commodity || props.capacity || "Energy and commodities infrastructure",
    source: `${props.source || "CERGO"}${props.updatedAt ? `, ${props.updatedAt}` : ""}`
  };
}

function popupHtml(feature) {
  const item = assetSummary(feature);
  return `
    <strong>${escapeHtml(item.name)}</strong>
    <span>${escapeHtml(item.layer)} / ${escapeHtml(item.country)}</span>
    <span>${escapeHtml(item.status)} / ${escapeHtml(item.relevance)}</span>
  `;
}

function openAsset(feature) {
  const item = assetSummary(feature);
  $("#assetPanel").classList.add("open");
  $("#assetPanel").innerHTML = `
    <button class="panel-close" id="panelClose" aria-label="Close asset details">x</button>
    <span class="eyebrow">${escapeHtml(item.layer)}</span>
    <h2>${escapeHtml(item.name)}</h2>
    <dl>
      <div><dt>Country</dt><dd>${escapeHtml(item.country)}</dd></div>
      <div><dt>Status</dt><dd>${escapeHtml(item.status)}</dd></div>
      <div><dt>Relevance</dt><dd>${escapeHtml(item.relevance)}</dd></div>
      <div><dt>Source</dt><dd>${escapeHtml(item.source)}</dd></div>
    </dl>
  `;
  $("#panelClose").addEventListener("click", () => $("#assetPanel").classList.remove("open"));
}

function initMapLibre(mapData) {
  if (!window.maplibregl) {
    throw new Error("MapLibre did not load");
  }

  map = new maplibregl.Map({
    container: "map",
    center: [18, 18],
    zoom: 1.15,
    minZoom: 1,
    maxZoom: 7,
    attributionControl: false,
    style: {
      version: 8,
      sources: {
        carto: {
          type: "raster",
          tiles: [
            "https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png",
            "https://b.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png",
            "https://c.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png"
          ],
          tileSize: 256,
          attribution: "© OpenStreetMap contributors © CARTO"
        }
      },
      layers: [{ id: "carto", type: "raster", source: "carto" }]
    }
  });
  window.cergoMap = map;

  map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "bottom-right");
  map.addControl(new maplibregl.AttributionControl({ compact: true }), "bottom-left");
  popup = new maplibregl.Popup({ closeButton: false, closeOnClick: false, offset: 14 });
  activeMapFeatures = mapData.features.map((feature) => ({
    ...feature,
    properties: {
      ...feature.properties,
      layerLabel: layerConfig.find((layer) => layer.id === feature.properties.layer)?.label
    }
  }));

  map.on("load", () => {
    $("#mapStatus").textContent = "MapLibre live map / synchronized infrastructure layers";
    $("#mapStatus").classList.add("ready");
    $("#mapOverlay").classList.add("projected-map");
    scheduleProjectedOverlay();
    map.on("render", scheduleProjectedOverlay);
    map.on("resize", scheduleProjectedOverlay);
    bindMapCycle(activeMapFeatures);
  });
}

function bindMapCycle(features) {
  const assets = features.filter((feature) => feature.geometry.type === "Point");
  $("#cycleAsset").addEventListener("click", () => {
    selectedAssetIndex = (selectedAssetIndex + 1) % assets.length;
    const feature = assets[selectedAssetIndex];
    openAsset(feature);
    if (map && feature.geometry.type === "Point") {
      map.flyTo({ center: feature.geometry.coordinates, zoom: Math.max(map.getZoom(), 3), speed: 0.8 });
    }
  });
}

function project([lon, lat]) {
  return [(lon + 180) * (1200 / 360), (90 - lat) * (440 / 180)];
}

function mapProject(coord) {
  const normalized = Array.isArray(coord?.[0]) ? coord[0] : coord;
  const [lon, lat] = normalized || [];
  if (!map) return project([lon, lat]);
  const lng = Number(lon);
  const latitude = Number(lat);
  if (!Number.isFinite(lng) || !Number.isFinite(latitude)) return null;
  const point = map.project({ lng, lat: latitude });
  return [point.x, point.y];
}

function pathFromCoords(coords) {
  return coords.map((coord, index) => {
    const [x, y] = project(coord);
    return `${index === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`;
  }).join(" ");
}

function polygonFromCoords(coords) {
  return coords.map((coord) => project(coord).map((n) => n.toFixed(1)).join(",")).join(" ");
}

function polygonRings(geometry) {
  if (geometry.type === "Polygon") return [geometry.coordinates[0]];
  if (geometry.type === "MultiPolygon") return geometry.coordinates.map((polygon) => polygon[0]);
  return [];
}

function renderFallbackMap(mapData) {
  const overlay = $("#mapOverlay");
  overlay.classList.add("active");
  $("#mapStatus").textContent = "Map tiles unavailable / local GeoJSON fallback";

  mapData.features.forEach((feature) => {
    const layer = layerConfig.find((item) => item.id === feature.properties.layer);
    if (!layer) return;
    feature.properties.layerLabel = layer.label;
    const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
    group.dataset.mapLayer = layer.id;
    applyLayerVisibility(group, layer);

    if (feature.geometry.type === "LineString") {
      const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
      path.setAttribute("d", pathFromCoords(feature.geometry.coordinates));
      path.setAttribute("class", layer.id === "pipelines" ? "pipeline-line" : layer.id === "shipping-traffic" ? "shipping-line route-line" : "trade-line route-line");
      path.setAttribute("stroke", layer.color);
      group.append(path);
    }

    if (feature.geometry.type === "Polygon" || feature.geometry.type === "MultiPolygon") {
      polygonRings(feature.geometry).forEach((ring) => {
        const polygon = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
        polygon.setAttribute("points", polygonFromCoords(ring));
        polygon.setAttribute("class", "sanction-poly");
        polygon.style.setProperty("fill", layer.color);
        polygon.style.setProperty("stroke", layer.color);
        polygon.style.setProperty("fill-opacity", sanctionOpacity(feature).toFixed(2));
        polygon.style.setProperty("stroke-opacity", Math.min(sanctionOpacity(feature) + 0.42, 0.92).toFixed(2));
        group.append(polygon);
      });
    }

    if (feature.geometry.type === "Point") {
      const [x, y] = project(feature.geometry.coordinates);
      const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      circle.setAttribute("cx", x);
      circle.setAttribute("cy", y);
      circle.setAttribute("r", layer.id === "chokepoints" ? 7 : 5);
      circle.setAttribute("fill", layer.color);
      circle.setAttribute("class", "asset-dot asset-icon");
      circle.addEventListener("mouseenter", (event) => showSvgTooltip(event, feature));
      circle.addEventListener("mousemove", (event) => showSvgTooltip(event, feature));
      circle.addEventListener("mouseleave", hideSvgTooltip);
      circle.addEventListener("click", () => openAsset(feature));
      group.append(circle);
    }

    overlay.append(group);
  });
}

function scheduleProjectedOverlay() {
  if (overlayFrame) return;
  overlayFrame = requestAnimationFrame(() => {
    overlayFrame = 0;
    renderProjectedOverlay();
  });
}

function renderProjectedOverlay() {
  const overlay = $("#mapOverlay");
  if (!map || !activeMapFeatures.length) return;

  const container = map.getContainer();
  overlay.setAttribute("viewBox", `0 0 ${container.clientWidth} ${container.clientHeight}`);

  const nodes = activeMapFeatures.map((feature) => {
    const layer = layerConfig.find((item) => item.id === feature.properties.layer);
    if (!layer) return null;

    const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
    group.dataset.mapLayer = layer.id;
    applyLayerVisibility(group, layer);

    if (feature.geometry.type === "LineString") {
      const projected = feature.geometry.coordinates.map(mapProject).filter(Boolean);
      if (projected.length < 2) return null;
      const d = projected.map(([x, y], index) => {
        return `${index === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`;
      }).join(" ");
      const glow = document.createElementNS("http://www.w3.org/2000/svg", "path");
      const path = document.createElementNS("http://www.w3.org/2000/svg", "path");

      [glow, path].forEach((node) => {
        node.setAttribute("d", d);
        node.setAttribute("stroke", layer.color);
        node.addEventListener("mouseenter", (event) => showSvgTooltip(event, feature));
        node.addEventListener("mousemove", (event) => showSvgTooltip(event, feature));
        node.addEventListener("mouseleave", hideSvgTooltip);
        node.addEventListener("click", () => openAsset(feature));
      });

      glow.setAttribute("class", "projected-line-glow");
      path.setAttribute("class", `projected-line ${layer.id === "pipelines" ? "solid-line" : "dashed-line"}`);
      group.append(glow, path);
    }

    if (feature.geometry.type === "Polygon" || feature.geometry.type === "MultiPolygon") {
      polygonRings(feature.geometry).forEach((ring) => {
        const polygon = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
        const projected = ring.map(mapProject).filter(Boolean);
        if (projected.length < 3) return;
        const points = projected
          .map((coord) => coord.map((n) => n.toFixed(1)).join(","))
          .join(" ");
        polygon.setAttribute("points", points);
        polygon.setAttribute("class", "projected-sanction-poly");
        polygon.style.setProperty("fill", layer.color);
        polygon.style.setProperty("stroke", layer.color);
        polygon.style.setProperty("fill-opacity", sanctionOpacity(feature).toFixed(2));
        polygon.style.setProperty("stroke-opacity", Math.min(sanctionOpacity(feature) + 0.42, 0.92).toFixed(2));
        polygon.addEventListener("mouseenter", (event) => showSvgTooltip(event, feature));
        polygon.addEventListener("mousemove", (event) => showSvgTooltip(event, feature));
        polygon.addEventListener("mouseleave", hideSvgTooltip);
        polygon.addEventListener("click", () => openAsset(feature));
        group.append(polygon);
      });
    }

    if (feature.geometry.type === "Point") {
      const projected = mapProject(feature.geometry.coordinates);
      if (!projected) return null;
      const [x, y] = projected;
      const glow = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");

      [glow, circle].forEach((node) => {
        node.setAttribute("cx", x);
        node.setAttribute("cy", y);
        node.setAttribute("fill", layer.color);
        node.addEventListener("mouseenter", (event) => showSvgTooltip(event, feature));
        node.addEventListener("mousemove", (event) => showSvgTooltip(event, feature));
        node.addEventListener("mouseleave", hideSvgTooltip);
        node.addEventListener("click", () => openAsset(feature));
      });

      glow.setAttribute("r", layer.id === "chokepoints" ? 18 : 14);
      glow.setAttribute("class", "projected-dot-glow");
      circle.setAttribute("r", layer.id === "chokepoints" ? 8 : 6);
      circle.setAttribute("class", "projected-dot");
      group.append(glow, circle);
    }

    return group;
  }).filter(Boolean);

  overlay.replaceChildren(...nodes);
}

function showSvgTooltip(event, feature) {
  const item = assetSummary(feature);
  const tooltip = $("#mapTooltip");
  const stageRect = $("#mapStage").getBoundingClientRect();
  tooltip.style.left = `${Math.min(event.clientX - stageRect.left + 14, stageRect.width - 276)}px`;
  tooltip.style.top = `${Math.max(event.clientY - stageRect.top - 16, 12)}px`;
  tooltip.style.display = "block";
  tooltip.innerHTML = `<strong>${escapeHtml(item.name)}</strong><span>${escapeHtml(item.layer)} / ${escapeHtml(item.country)}</span><span>${escapeHtml(item.status)} / ${escapeHtml(item.source)}</span>`;
}

function hideSvgTooltip() {
  $("#mapTooltip").style.display = "none";
}

async function renderMap() {
  const mapData = await getData("public/data/map/features.geojson");
  try {
    initMapLibre(mapData);
  } catch (error) {
    renderFallbackMap(mapData);
  }
}

function drawSparkline(values, positive) {
  const numeric = values.filter((value) => Number.isFinite(Number(value))).map(Number);
  if (numeric.length < 2) return "";
  const min = Math.min(...numeric);
  const max = Math.max(...numeric);
  const range = max - min || 1;
  const points = numeric.map((value, index) => {
    const x = (index / (numeric.length - 1)) * 120 + 3;
    const y = 29 - ((value - min) / range) * 24;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");
  const color = positive ? "#16834f" : "#c43f3f";
  return `
    <svg class="spark" viewBox="0 0 126 34" role="img" aria-label="Price trend">
      <polyline points="${points}" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
    </svg>`;
}

function renderTabs(container, values, active, onClick) {
  container.innerHTML = values.map((value) => `
    <button class="tab-button ${value === active ? "active" : ""}" data-value="${value}">
      ${titleCase(value)}
    </button>
  `).join("");
  container.querySelectorAll("button").forEach((button) => {
    button.addEventListener("click", () => onClick(button.dataset.value));
  });
}

function renderNews() {
  renderTabs($("#newsFilters"), ["all", ...tabs], state.news, (value) => {
    state.news = value;
    renderNews();
  });
  const items = state.data.news
    .filter((item) => state.news === "all" || item.category === state.news)
    .slice(0, 6);
  $("#newsList").innerHTML = items.map((item) => `
    <a class="news-item ${escapeHtml(item.category)}" href="${escapeHtml(item.url)}" target="_blank" rel="noreferrer">
      <span class="headline">${escapeHtml(item.title)}<br><span class="meta">${escapeHtml(item.source)} / ${escapeHtml(item.publishedAt)}</span></span>
      <span class="source">${escapeHtml(item.category)}</span>
    </a>
  `).join("");
}

function renderWatchlist(kind) {
  const selector = `[data-tabs="${kind}"]`;
  renderTabs($(selector), tabs, state[kind], (value) => {
    state[kind] = value;
    renderWatchlist(kind);
  });
  const target = kind === "futures" ? $("#futuresList") : $("#stocksList");
  target.innerHTML = state.data[kind][state[kind]].map((item) => `
    <div class="watch-row">
      <div>
        <span class="row-title">${escapeHtml(item.name)}</span>
        <span class="row-subtitle">${escapeHtml(item.symbol)} / ${escapeHtml(item.source)}${item.updatedAt ? ` / ${escapeHtml(item.updatedAt)}` : ""}</span>
      </div>
      <span class="price">${escapeHtml(item.currency || "")}${Number(item.price || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
      <span class="change ${item.changePct1D >= 0 ? "positive" : "negative"}">${formatPct(item.changePct1D)}</span>
      ${drawSparkline(item.sparkline || [], item.changePct1D >= 0)}
    </div>
  `).join("");
}

function renderRankings() {
  renderTabs($("#timeTabs"), timeframes, state.timeframe, (value) => {
    state.timeframe = value;
    renderRankings();
  });
  const items = state.data.rankings[state.timeframe] || [];
  const max = Math.max(1, ...items.map((item) => Math.abs(item.value)));
  $("#rankings").innerHTML = items.map((item) => {
    const width = Math.max(18, (Math.abs(item.value) / max) * 100);
    const isPositive = item.value >= 0;
    return `
      <div class="ranking-item" style="--bar:${width.toFixed(1)}%;--bar-color:${isPositive ? "var(--green-panel)" : "var(--red-panel)"}">
        <span>${escapeHtml(item.name)}</span>
        <strong>${formatPct(item.value)}</strong>
      </div>
    `;
  }).join("");
}

function renderCountries() {
  $("#countryList").innerHTML = state.data.countries.map((item) => `
    <div class="country-row">
      <span class="flag" style="background:${escapeHtml(item.flagCss)}" aria-hidden="true"></span>
      <div>
        <span class="row-title">${escapeHtml(item.index)} ${escapeHtml(item.country)}</span>
        <span class="row-subtitle">${escapeHtml(item.exchange)}${item.source ? ` / ${escapeHtml(item.source)}` : ""}</span>
      </div>
      <span class="change ${item.changePct1D >= 0 ? "positive" : "negative"}">${formatPct(item.changePct1D)}</span>
      <span class="price">${Number(item.value || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
    </div>
  `).join("");
}

function renderHeaderMarket() {
  const crude = state.data.futures.energy?.[0];
  if (!crude) return;
  $("#stripPrice").textContent = `${crude.symbol} ${crude.currency || ""}${Number(crude.price).toFixed(2)}`;
  $("#stripChange").textContent = formatPct(crude.changePct1D);
  $("#stripChange").className = crude.changePct1D >= 0 ? "positive" : "negative";
}

async function boot() {
  renderLayerToolbar();
  await renderMap();
  const [news, futures, stocks, countries, rankings] = await Promise.all([
    getData("public/data/news.json"),
    getData("public/data/futures.json"),
    getData("public/data/stocks.json"),
    getData("public/data/country-indices.json"),
    getData("public/data/performance-rankings.json")
  ]);
  state.data = { news, futures, stocks, countries, rankings };
  renderHeaderMarket();
  renderNews();
  renderWatchlist("futures");
  renderWatchlist("stocks");
  renderRankings();
  renderCountries();
  $("#panelClose").addEventListener("click", () => $("#assetPanel").classList.remove("open"));
  $("#refreshButton").addEventListener("click", () => window.location.reload());
}

boot().catch((error) => {
  document.body.insertAdjacentHTML("beforeend", `<pre class="load-error">${escapeHtml(error.message)}</pre>`);
});
