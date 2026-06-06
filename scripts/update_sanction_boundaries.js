const fs = require("fs");

const featurePath = "public/data/map/features.geojson";
const sourceUrl = "https://raw.githubusercontent.com/datasets/geo-countries/master/data/countries.geojson";
const boundaryNames = {
  "Democratic People's Republic of Korea": "North Korea",
  "Myanmar (Burma)": "Myanmar",
  "Türkiye": "Turkey",
  Serbia: "Republic of Serbia"
};
const tolerance = 0.045;

function distanceToSegment(point, start, end) {
  const [x, y] = point;
  const [x1, y1] = start;
  const [x2, y2] = end;
  const dx = x2 - x1;
  const dy = y2 - y1;
  if (dx === 0 && dy === 0) return Math.hypot(x - x1, y - y1);
  const t = Math.max(0, Math.min(1, ((x - x1) * dx + (y - y1) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(x - (x1 + t * dx), y - (y1 + t * dy));
}

function simplifyLine(points) {
  if (points.length <= 8) return points;
  let maxDistance = 0;
  let index = 0;

  for (let i = 1; i < points.length - 1; i += 1) {
    const distance = distanceToSegment(points[i], points[0], points[points.length - 1]);
    if (distance > maxDistance) {
      maxDistance = distance;
      index = i;
    }
  }

  if (maxDistance > tolerance) {
    return [
      ...simplifyLine(points.slice(0, index + 1)).slice(0, -1),
      ...simplifyLine(points.slice(index))
    ];
  }

  return [points[0], points[points.length - 1]];
}

function ringArea(ring) {
  let sum = 0;
  for (let i = 0; i < ring.length - 1; i += 1) {
    sum += ring[i][0] * ring[i + 1][1] - ring[i + 1][0] * ring[i][1];
  }
  return Math.abs(sum / 2);
}

function simplifyRing(inputRing) {
  const isClosed = inputRing[0][0] === inputRing.at(-1)[0] && inputRing[0][1] === inputRing.at(-1)[1];
  const openRing = isClosed ? inputRing.slice(0, -1) : inputRing;
  if (openRing.length < 4) return null;

  const simplified = simplifyLine([...openRing, openRing[0]]);
  if (simplified.length < 4) return null;

  if (simplified[0][0] !== simplified.at(-1)[0] || simplified[0][1] !== simplified.at(-1)[1]) {
    simplified.push(simplified[0]);
  }

  return simplified.map(([lon, lat]) => [Number(lon.toFixed(4)), Number(lat.toFixed(4))]);
}

function simplifyGeometry(geometry) {
  const polygons = geometry.type === "Polygon" ? [geometry.coordinates] : geometry.coordinates;
  const simplifiedPolygons = [];

  polygons.forEach((polygon) => {
    const exterior = polygon[0];
    if (!exterior || ringArea(exterior) < 0.08) return;

    const ring = simplifyRing(exterior);
    if (ring && ringArea(ring) > 0.04) simplifiedPolygons.push([ring]);
  });

  return simplifiedPolygons.length === 1
    ? { type: "Polygon", coordinates: simplifiedPolygons[0] }
    : { type: "MultiPolygon", coordinates: simplifiedPolygons };
}

async function main() {
  const local = JSON.parse(fs.readFileSync(featurePath, "utf8"));
  const world = await fetch(sourceUrl).then((response) => {
    if (!response.ok) throw new Error(`Unable to fetch boundaries: ${response.status}`);
    return response.json();
  });
  const byName = new Map(world.features.map((feature) => [feature.properties.name, feature]));

  const features = local.features.map((feature) => {
    if (feature.properties.layer !== "sanctioned-countries") return feature;

    const boundaryName = boundaryNames[feature.properties.country] || feature.properties.country;
    const country = byName.get(boundaryName);
    if (!country) throw new Error(`Missing boundary for ${feature.properties.country} (${boundaryName})`);

    return {
      ...feature,
      geometry: simplifyGeometry(country.geometry)
    };
  });

  fs.writeFileSync(featurePath, `${JSON.stringify({ ...local, features }, null, 2)}\n`);

  const sanctioned = features.filter((feature) => feature.properties.layer === "sanctioned-countries");
  const polygonCount = sanctioned.reduce((sum, feature) => {
    return sum + (feature.geometry.type === "Polygon" ? 1 : feature.geometry.coordinates.length);
  }, 0);

  console.log(JSON.stringify({ sanctioned: sanctioned.length, polygonCount }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
