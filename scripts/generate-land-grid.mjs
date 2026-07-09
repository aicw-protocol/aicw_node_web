import { readFileSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { geoContains } from "d3-geo";

const GRID_STEP_DEG = 0.5;
const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

const land = JSON.parse(
  readFileSync(join(root, "public/maps/ne_110m_land.geojson"), "utf8"),
);

const latCount = Math.round(180 / GRID_STEP_DEG);
const lonCount = Math.round(360 / GRID_STEP_DEG);
const data = new Uint8Array(latCount * lonCount);
const latMin = -90 + GRID_STEP_DEG / 2;
const lonMin = -180 + GRID_STEP_DEG / 2;

console.log(`Building ${latCount} x ${lonCount} land grid (${GRID_STEP_DEG}° step)...`);
const started = Date.now();

for (let latIdx = 0; latIdx < latCount; latIdx += 1) {
  const lat = latMin + latIdx * GRID_STEP_DEG;
  for (let lonIdx = 0; lonIdx < lonCount; lonIdx += 1) {
    const lon = lonMin + lonIdx * GRID_STEP_DEG;
    if (geoContains(land, [lon, lat])) {
      data[latIdx * lonCount + lonIdx] = 1;
    }
  }
}

const header = Buffer.alloc(40);
header.writeDoubleLE(latMin, 0);
header.writeDoubleLE(GRID_STEP_DEG, 8);
header.writeDoubleLE(lonMin, 16);
header.writeDoubleLE(GRID_STEP_DEG, 24);
header.writeUInt32LE(latCount, 32);
header.writeUInt32LE(lonCount, 36);

const outPath = join(root, "public/maps/world-land-grid.bin");
writeFileSync(outPath, Buffer.concat([header, Buffer.from(data)]));

console.log(`Wrote ${outPath} (${header.length + data.length} bytes) in ${Date.now() - started}ms`);
