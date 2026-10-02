import fs from "fs";
import path from "path";

function readJson(filename) {
  const filePath = path.join(process.cwd(), "data", filename);
  const raw = fs.readFileSync(filePath, "utf-8");
  return JSON.parse(raw);
}

export function getStops() {
  return readJson("stops.json");
}

export function getRoutes() {
  return readJson("routes.json");
}

export function getRouteStops() {
  return readJson("route_stops.json");
}

export function getSegments() {
  return readJson("segments.json");
}
