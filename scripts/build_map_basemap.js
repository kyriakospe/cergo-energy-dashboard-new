const fs = require("fs");

const sourceUrl = "https://raw.githubusercontent.com/datasets/geo-countries/master/data/countries.geojson";
const outputPath = "public/data/map/countries.geojson";
const tolerance = 0.08;

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
  const output = [];

  polygons.forEach((polygon) => {
    const exterior = polygon[0];
    if (!exterior || ringArea(exterior) < 0.04) return;
    const ring = simplifyRing(exterior);
    if (ring && ringArea(ring) > 0.02) output.push([ring]);
  });

  return output.length === 1
    ? { type: "Polygon", coordinates: output[0] }
    : { type: "MultiPolygon", coordinates: output };
}

async function main() {
  const source = await fetch(sourceUrl).then((response) => {
    if (!response.ok) throw new Error(`Unable to fetch country boundaries: ${response.status}`);
    return response.json();
  });

  const features = source.features
    .map((feature) => ({
      type: "Feature",
      properties: {
        name: feature.properties.name,
        iso3: feature.properties["ISO3166-1-Alpha-3"]
      },
      geometry: simplifyGeometry(feature.geometry)
    }))
    .filter((feature) => feature.geometry.coordinates.length);

  fs.writeFileSync(outputPath, `${JSON.stringify({ type: "FeatureCollection", features })}\n`);
  console.log(JSON.stringify({ countries: features.length, outputPath }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
