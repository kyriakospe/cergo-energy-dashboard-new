const fs = require("fs");

const featurePath = "public/data/map/features.geojson";
const updatedAt = "Jun 2026";

function line(layer, name, country, status, source, coordinates, extra = {}) {
  return {
    type: "Feature",
    properties: { layer, name, country, status, source, updatedAt, ...extra },
    geometry: { type: "LineString", coordinates }
  };
}

function point(layer, name, country, status, source, coordinates, extra = {}) {
  return {
    type: "Feature",
    properties: { layer, name, country, status, source, updatedAt, ...extra },
    geometry: { type: "Point", coordinates }
  };
}

const additions = [
  line("pipelines", "Nord Stream Corridor", "Russia / Germany", "Partially offline / damaged", "CERGO curated from public pipeline references", [[28, 60], [24, 58], [20, 56], [15, 55], [12, 54.5]]),
  line("pipelines", "Yamal-Europe Pipeline", "Russia / Belarus / Poland / Germany", "Constrained / route available", "CERGO curated from public pipeline references", [[55, 67], [45, 60], [31, 53], [23, 52], [14, 52]]),
  line("pipelines", "Druzhba Oil Pipeline", "Russia / Belarus / Ukraine / EU", "Operating / constrained by sanctions and war risk", "CERGO curated from public pipeline references", [[38, 55], [31, 53], [25, 50], [20, 49], [17, 48]]),
  line("pipelines", "Baku-Tbilisi-Ceyhan Pipeline", "Azerbaijan / Georgia / Turkey", "Operating", "CERGO curated from public pipeline references", [[50, 40.4], [45, 41.6], [40, 40], [35.9, 36.8]]),
  line("pipelines", "Trans Adriatic Pipeline", "Greece / Albania / Italy", "Operating", "CERGO curated from public pipeline references", [[22, 40.5], [20, 40.7], [19, 41], [16.5, 40.6], [14.2, 40.8]]),
  line("pipelines", "Trans-Mediterranean Pipeline", "Algeria / Tunisia / Italy", "Operating", "CERGO curated from public pipeline references", [[3.1, 30.6], [8.8, 34.7], [11.5, 37.2], [14.2, 37.6]]),
  line("pipelines", "Medgaz Pipeline", "Algeria / Spain", "Operating", "CERGO curated from public pipeline references", [[-1.2, 35.7], [-1.9, 36.3], [-2.9, 36.8]]),
  line("pipelines", "Maghreb-Europe Pipeline", "Algeria / Morocco / Spain", "Partially constrained", "CERGO curated from public pipeline references", [[2.9, 32], [-2.2, 34.6], [-5.8, 35.8], [-5.6, 36.1]]),
  line("pipelines", "West-East Gas Pipeline", "China", "Operating", "CERGO curated from public pipeline references", [[87, 43], [98, 39], [108, 35], [116, 32], [121, 31]]),
  line("pipelines", "Central Asia-China Gas Pipeline", "Turkmenistan / Uzbekistan / Kazakhstan / China", "Operating", "CERGO curated from public pipeline references", [[58, 38], [66, 40], [76, 43], [86, 43], [94, 42]]),
  line("pipelines", "East-West Crude Oil Pipeline", "Saudi Arabia", "Operating", "CERGO curated from public pipeline references", [[49.6, 26.8], [45, 25.6], [40.4, 24.2], [39, 22.6]]),
  line("pipelines", "TAPI Pipeline Route", "Turkmenistan / Afghanistan / Pakistan / India", "Planned / delayed", "CERGO curated from public pipeline references", [[58.4, 37.9], [63.8, 34.4], [67, 31.5], [70.2, 30.2], [74.3, 31.5]]),
  line("pipelines", "Trans-Saharan Gas Pipeline Route", "Nigeria / Niger / Algeria", "Proposed", "CERGO curated from public pipeline references", [[7.5, 5.5], [8.6, 13.5], [7.6, 21], [3.1, 30.6]]),
  line("pipelines", "Keystone Pipeline System", "Canada / United States", "Operating", "CERGO curated from public pipeline references", [[-110, 53], [-106, 49], [-102, 44], [-98, 39], [-96, 35], [-95, 30]]),
  line("pipelines", "Trans Mountain Pipeline", "Canada", "Operating / expanded", "CERGO curated from public pipeline references", [[-113.5, 53.5], [-120, 51], [-122.9, 49.2]]),
  line("pipelines", "Southern Gas Corridor", "Azerbaijan / Turkey / Europe", "Operating", "CERGO curated from public pipeline references", [[49.5, 40.4], [43, 40], [35, 39], [26, 40], [20, 41], [14, 41]]),

  point("chokepoints", "Bab el-Mandeb Strait", "Yemen / Djibouti / Eritrea", "Active / high risk", "EIA World Oil Transit Chokepoints", [43.4, 12.6], { relevance: "Red Sea crude, products, LNG, and container transit" }),
  point("chokepoints", "Panama Canal", "Panama", "Active / drought-sensitive", "EIA World Oil Transit Chokepoints", [-79.7, 9.1], { relevance: "Atlantic-Pacific refined products, LNG, and container transit" }),
  point("chokepoints", "Turkish Straits", "Turkey", "Active", "EIA World Oil Transit Chokepoints", [29.0, 41.1], { relevance: "Black Sea oil, grain, and bulk trade" }),
  point("chokepoints", "Danish Straits", "Denmark / Sweden", "Active", "EIA World Oil Transit Chokepoints", [12.6, 55.7], { relevance: "Baltic crude, products, and LNG access" }),
  point("chokepoints", "Cape of Good Hope", "South Africa", "Major diversion route", "EIA World Oil Transit Chokepoints", [18.5, -34.4], { relevance: "Alternative route for Suez and Red Sea disruptions" }),
  point("chokepoints", "Strait of Gibraltar", "Spain / Morocco", "Active", "CERGO curated maritime chokepoints", [-5.6, 35.95], { relevance: "Mediterranean-Atlantic oil, LNG, and container access" }),
  point("chokepoints", "Lombok Strait", "Indonesia", "Active", "CERGO curated maritime chokepoints", [115.8, -8.6], { relevance: "Deepwater alternative to Malacca" }),
  point("chokepoints", "Sunda Strait", "Indonesia", "Active", "CERGO curated maritime chokepoints", [105.9, -6.0], { relevance: "Indonesia archipelago shipping route" }),
  point("chokepoints", "Mozambique Channel", "Mozambique / Madagascar", "Active", "CERGO curated maritime chokepoints", [43.5, -18.0], { relevance: "East Africa LNG and tanker route" }),
  point("chokepoints", "English Channel", "United Kingdom / France", "Active", "CERGO curated maritime chokepoints", [1.5, 50.3], { relevance: "Northwest Europe products, LNG, and container traffic" }),

  point("lng-terminals", "Corpus Christi LNG", "United States", "Operating / expanding", "EIA LNG export terminal coverage", [-97.3, 27.9], { capacity: "Major US LNG export terminal", commodity: "LNG export" }),
  point("lng-terminals", "Freeport LNG", "United States", "Operating", "EIA LNG export terminal coverage", [-95.3, 28.95], { capacity: "Major US LNG export terminal", commodity: "LNG export" }),
  point("lng-terminals", "Cameron LNG", "United States", "Operating", "EIA LNG export terminal coverage", [-93.3, 30.0], { capacity: "Major US LNG export terminal", commodity: "LNG export" }),
  point("lng-terminals", "Plaquemines LNG", "United States", "Operating / ramping", "EIA LNG export terminal coverage", [-89.9, 29.3], { capacity: "New US Gulf LNG export capacity", commodity: "LNG export" }),
  point("lng-terminals", "Golden Pass LNG", "United States", "Under construction / startup expected", "EIA LNG export terminal coverage", [-93.9, 29.75], { capacity: "Major US Gulf LNG project", commodity: "LNG export" }),
  point("lng-terminals", "Gorgon LNG", "Australia", "Operating", "CERGO curated LNG terminal coverage", [115.4, -20.8], { capacity: "Major LNG export terminal", commodity: "LNG export" }),
  point("lng-terminals", "North West Shelf LNG", "Australia", "Operating", "CERGO curated LNG terminal coverage", [116.8, -20.6], { capacity: "Major LNG export terminal", commodity: "LNG export" }),
  point("lng-terminals", "Yamal LNG", "Russia", "Operating", "CERGO curated LNG terminal coverage", [72.1, 71.3], { capacity: "Arctic LNG export", commodity: "LNG export" }),
  point("lng-terminals", "Sakhalin-2 LNG", "Russia", "Operating", "CERGO curated LNG terminal coverage", [142.9, 46.6], { capacity: "Far East LNG export", commodity: "LNG export" }),
  point("lng-terminals", "Bintulu LNG", "Malaysia", "Operating", "CERGO curated LNG terminal coverage", [113.1, 3.3], { capacity: "Major LNG export terminal", commodity: "LNG export" }),
  point("lng-terminals", "Bonny LNG", "Nigeria", "Operating", "CERGO curated LNG terminal coverage", [7.2, 4.4], { capacity: "Major LNG export terminal", commodity: "LNG export" }),
  point("lng-terminals", "Rovuma LNG / Coral South", "Mozambique", "Operating / developing", "CERGO curated LNG terminal coverage", [40.6, -12.4], { capacity: "East Africa LNG export", commodity: "LNG export" }),
  point("lng-terminals", "Snohvit LNG", "Norway", "Operating", "CERGO curated LNG terminal coverage", [23.7, 70.7], { capacity: "Arctic LNG export", commodity: "LNG export" }),
  point("lng-terminals", "Zeebrugge LNG Terminal", "Belgium", "Operating", "CERGO curated LNG terminal coverage", [3.2, 51.3], { capacity: "Northwest Europe LNG import and transshipment", commodity: "LNG import" }),
  point("lng-terminals", "Gate LNG Terminal", "Netherlands", "Operating", "CERGO curated LNG terminal coverage", [4.0, 51.95], { capacity: "Northwest Europe LNG import", commodity: "LNG import" }),

  line("shipping-traffic", "Asia-Europe Container Route", "Global", "Active / Red Sea-sensitive", "CERGO curated shipping lanes", [[121, 31], [105, 1], [80, 7], [58, 13], [43, 13], [32, 30], [5, 51]]),
  line("shipping-traffic", "Cape Diversion Route", "Global", "Active during Red Sea disruption", "CERGO curated shipping lanes", [[103, 1], [78, -10], [52, -25], [20, -35], [-5, 35], [5, 51]]),
  line("shipping-traffic", "Trans-Pacific Container Route", "Global", "Active", "CERGO curated shipping lanes", [[121, 31], [145, 36], [-170, 42], [-135, 45], [-122, 37]]),
  line("shipping-traffic", "US Gulf to Europe Products Route", "Global", "Active", "CERGO curated shipping lanes", [[-94, 29], [-75, 32], [-45, 42], [-15, 48], [4, 52]]),
  line("shipping-traffic", "Brazil to Europe Atlantic Route", "Global", "Active", "CERGO curated shipping lanes", [[-46, -24], [-35, -10], [-25, 10], [-14, 32], [-5, 43], [4, 52]]),
  line("shipping-traffic", "Australia to North Asia Bulk Route", "Global", "Active", "CERGO curated shipping lanes", [[118, -22], [122, -10], [128, 5], [134, 22], [140, 36]]),

  line("trade-routes", "US Gulf LNG to Europe", "United States / Europe", "Active", "CERGO curated trade routes", [[-94, 29], [-70, 35], [-45, 43], [-20, 49], [4, 52]]),
  line("trade-routes", "Qatar LNG to Europe", "Qatar / Europe", "Active / route-risk sensitive", "CERGO curated trade routes", [[51.5, 25.9], [43, 13], [32, 30], [16, 38], [4, 52]]),
  line("trade-routes", "Qatar LNG to North Asia", "Qatar / Japan / Korea / China", "Active", "CERGO curated trade routes", [[51.5, 25.9], [64, 19], [80, 8], [103, 2], [121, 22], [139, 35]]),
  line("trade-routes", "West Africa Crude to Europe", "Nigeria / Angola / Europe", "Active", "CERGO curated trade routes", [[7, 4], [2, 12], [-8, 25], [-5, 36], [4, 52]]),
  line("trade-routes", "Black Sea Grain Route", "Ukraine / Mediterranean", "Active / war-risk sensitive", "CERGO curated trade routes", [[31, 46], [29, 41], [25, 38], [18, 36], [10, 36]]),
  line("trade-routes", "Chile Copper to North Asia", "Chile / China", "Active", "CERGO curated trade routes", [[-70, -24], [-95, -20], [-130, -10], [-170, 10], [140, 30], [121, 31]]),

  point("commodity-ports", "Port of Rotterdam", "Netherlands", "Operating", "CERGO curated port coverage", [4.1, 51.95], { commodity: "Oil products, LNG, chemicals, bulk" }),
  point("commodity-ports", "Port of Singapore", "Singapore", "Operating", "CERGO curated port coverage", [103.8, 1.3], { commodity: "Oil products, bunkering, containers" }),
  point("commodity-ports", "Port of Fujairah", "United Arab Emirates", "Operating", "CERGO curated port coverage", [56.35, 25.15], { commodity: "Crude and refined products storage" }),
  point("commodity-ports", "Port of Ras Tanura", "Saudi Arabia", "Operating", "CERGO curated port coverage", [50.15, 26.65], { commodity: "Crude exports" }),
  point("commodity-ports", "Port of Houston", "United States", "Operating", "CERGO curated port coverage", [-95.0, 29.73], { commodity: "Oil products, petrochemicals, LNG-linked Gulf trade" }),
  point("commodity-ports", "Port of Corpus Christi", "United States", "Operating", "CERGO curated port coverage", [-97.4, 27.8], { commodity: "Crude, LNG, products" }),
  point("commodity-ports", "Port of Newcastle", "Australia", "Operating", "CERGO curated port coverage", [151.8, -32.9], { commodity: "Coal and bulk commodities" }),
  point("commodity-ports", "Port Hedland", "Australia", "Operating", "CERGO curated port coverage", [118.6, -20.3], { commodity: "Iron ore" }),
  point("commodity-ports", "Port of Richards Bay", "South Africa", "Operating", "CERGO curated port coverage", [32.1, -28.8], { commodity: "Coal and bulk commodities" }),
  point("commodity-ports", "Port of Tubarao", "Brazil", "Operating", "CERGO curated port coverage", [-40.2, -20.3], { commodity: "Iron ore" }),
  point("commodity-ports", "Port of Ningbo-Zhoushan", "China", "Operating", "CERGO curated port coverage", [122.1, 29.9], { commodity: "Crude, iron ore, containers" }),

  point("commodity-hubs", "Henry Hub", "United States", "Operating", "CERGO curated commodity hubs", [-92.1, 30.1], { commodity: "US natural gas benchmark" }),
  point("commodity-hubs", "TTF Gas Hub", "Netherlands", "Operating", "CERGO curated commodity hubs", [5.2, 52.1], { commodity: "European natural gas benchmark" }),
  point("commodity-hubs", "JKM LNG Marker", "Japan / Korea", "Benchmark", "CERGO curated commodity hubs", [135.0, 35.0], { commodity: "Northeast Asia LNG benchmark" }),
  point("commodity-hubs", "Fujairah Oil Storage Hub", "United Arab Emirates", "Operating", "CERGO curated commodity hubs", [56.35, 25.15], { commodity: "Oil products and bunkering" }),
  point("commodity-hubs", "ARA Oil Products Hub", "Netherlands / Belgium", "Operating", "CERGO curated commodity hubs", [4.4, 51.9], { commodity: "Amsterdam-Rotterdam-Antwerp products hub" }),
  point("commodity-hubs", "Shanghai Futures Exchange", "China", "Operating", "CERGO curated commodity hubs", [121.5, 31.2], { commodity: "Metals and energy futures" }),
  point("commodity-hubs", "LME London", "United Kingdom", "Operating", "CERGO curated commodity hubs", [-0.1, 51.5], { commodity: "Base metals benchmark" }),
  point("commodity-hubs", "Chicago Board of Trade", "United States", "Operating", "CERGO curated commodity hubs", [-87.6, 41.9], { commodity: "Agriculture futures benchmark" }),

  point("mining-sites", "Grasberg Copper-Gold Mine", "Indonesia", "Operating", "USGS / CERGO curated", [137.1, -4.05], { commodity: "Copper and gold" }),
  point("mining-sites", "Collahuasi Copper Mine", "Chile", "Operating", "USGS / CERGO curated", [-68.7, -20.9], { commodity: "Copper" }),
  point("mining-sites", "Cerro Verde Copper Mine", "Peru", "Operating", "USGS / CERGO curated", [-71.6, -16.5], { commodity: "Copper" }),
  point("mining-sites", "Carajas Iron Ore Complex", "Brazil", "Operating", "USGS / CERGO curated", [-50.2, -6.0], { commodity: "Iron ore" }),
  point("mining-sites", "Sishen Iron Ore Mine", "South Africa", "Operating", "USGS / CERGO curated", [23.0, -27.8], { commodity: "Iron ore" }),
  point("mining-sites", "Oyu Tolgoi Copper-Gold Mine", "Mongolia", "Operating", "USGS / CERGO curated", [106.9, 43.0], { commodity: "Copper and gold" }),
  point("mining-sites", "Norilsk Nickel Complex", "Russia", "Operating", "USGS / CERGO curated", [88.2, 69.3], { commodity: "Nickel, copper, palladium" }),
  point("mining-sites", "Jwaneng Diamond Mine", "Botswana", "Operating", "USGS / CERGO curated", [24.7, -24.6], { commodity: "Diamonds" }),
  point("mining-sites", "Khumani / Kalahari Manganese Field", "South Africa", "Operating", "USGS / CERGO curated", [22.9, -27.5], { commodity: "Manganese" }),
  point("mining-sites", "Antamina Mine", "Peru", "Operating", "USGS / CERGO curated", [-77.1, -9.55], { commodity: "Copper and zinc" }),

  point("critical-minerals", "Salar de Atacama Lithium Brine", "Chile", "Operating", "USGS / CERGO curated", [-68.25, -23.5], { commodity: "Lithium" }),
  point("critical-minerals", "Salar de Uyuni Lithium Resource", "Bolivia", "Developing", "USGS / CERGO curated", [-67.5, -20.1], { commodity: "Lithium" }),
  point("critical-minerals", "Mt Marion Lithium", "Australia", "Operating", "USGS / CERGO curated", [121.5, -31.0], { commodity: "Lithium" }),
  point("critical-minerals", "Jadar Lithium Project", "Serbia", "Proposed / contested", "USGS / CERGO curated", [19.3, 44.4], { commodity: "Lithium" }),
  point("critical-minerals", "Tenke Fungurume", "Democratic Republic of the Congo", "Operating", "USGS / CERGO curated", [26.1, -10.6], { commodity: "Copper and cobalt" }),
  point("critical-minerals", "Mutanda Mining", "Democratic Republic of the Congo", "Operating", "USGS / CERGO curated", [26.4, -10.8], { commodity: "Cobalt and copper" }),
  point("critical-minerals", "Weda Bay Nickel", "Indonesia", "Operating", "USGS / CERGO curated", [128.0, 0.5], { commodity: "Nickel" }),
  point("critical-minerals", "Voisey's Bay Nickel Mine", "Canada", "Operating", "USGS / CERGO curated", [-62.1, 56.3], { commodity: "Nickel and cobalt" }),
  point("critical-minerals", "Mountain Pass Rare Earth Mine", "United States", "Operating", "USGS / CERGO curated", [-115.5, 35.5], { commodity: "Rare earths" }),
  point("critical-minerals", "Bayan Obo Rare Earth District", "China", "Operating", "USGS / CERGO curated", [109.97, 41.8], { commodity: "Rare earths" }),
  point("critical-minerals", "Graphite Fields Cabo Delgado", "Mozambique", "Operating / developing", "USGS / CERGO curated", [39.1, -13.0], { commodity: "Graphite" }),

  point("processing-plants", "Ras Laffan Industrial City", "Qatar", "Operating", "CERGO curated processing assets", [51.5, 25.9], { commodity: "LNG and gas processing" }),
  point("processing-plants", "Ruwais Refining Complex", "United Arab Emirates", "Operating", "CERGO curated processing assets", [52.7, 24.1], { commodity: "Refining and petrochemicals" }),
  point("processing-plants", "Jamnagar Refinery Complex", "India", "Operating", "CERGO curated processing assets", [70.1, 22.3], { commodity: "Refining and petrochemicals" }),
  point("processing-plants", "Ulsan Refining and Petrochemical Complex", "South Korea", "Operating", "CERGO curated processing assets", [129.35, 35.5], { commodity: "Refining and petrochemicals" }),
  point("processing-plants", "Ningbo Petrochemical Complex", "China", "Operating", "CERGO curated processing assets", [121.8, 29.9], { commodity: "Refining and petrochemicals" }),
  point("processing-plants", "Jurong Island Petrochemical Complex", "Singapore", "Operating", "CERGO curated processing assets", [103.7, 1.25], { commodity: "Refining and petrochemicals" }),
  point("processing-plants", "Antwerp Refining and Chemical Cluster", "Belgium", "Operating", "CERGO curated processing assets", [4.3, 51.25], { commodity: "Refining and petrochemicals" }),
  point("processing-plants", "Baytown Refinery and Chemical Complex", "United States", "Operating", "CERGO curated processing assets", [-95.0, 29.75], { commodity: "Refining and petrochemicals" }),
  point("processing-plants", "Kwinana Lithium Hydroxide Plant", "Australia", "Operating", "CERGO curated processing assets", [115.8, -32.2], { commodity: "Lithium processing" }),
  point("processing-plants", "Morowali Nickel Industrial Park", "Indonesia", "Operating", "CERGO curated processing assets", [121.9, -2.8], { commodity: "Nickel processing" })
];

const data = JSON.parse(fs.readFileSync(featurePath, "utf8"));
const existing = new Set(data.features.map((feature) => `${feature.properties.layer}::${feature.properties.name}`));
const fresh = additions.filter((feature) => !existing.has(`${feature.properties.layer}::${feature.properties.name}`));

data.features.push(...fresh);
fs.writeFileSync(featurePath, `${JSON.stringify(data, null, 2)}\n`);

const counts = data.features.reduce((acc, feature) => {
  acc[feature.properties.layer] = (acc[feature.properties.layer] || 0) + 1;
  return acc;
}, {});

console.log(JSON.stringify({ added: fresh.length, counts }, null, 2));
