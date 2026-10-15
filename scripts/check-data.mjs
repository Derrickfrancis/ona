// Checks that the four data files agree with each other.
// Run from the project folder:  node scripts/check-data.mjs
import fs from "fs";
import path from "path";

const dataDir = path.join(process.cwd(), "data");

function load(filename) {
  try {
    return JSON.parse(fs.readFileSync(path.join(dataDir, filename), "utf-8"));
  } catch (error) {
    console.log(
      `PROBLEM  data/${filename} could not be read: ${error.message}`,
    );
    console.log("         (a missing or extra comma is the usual cause)");
    process.exit(1);
  }
}

const stops = load("stops.json");
const routes = load("routes.json");
const routeStops = load("route_stops.json");
const segments = load("segments.json");

const problems = [];
const notes = [];

const stopsById = Object.fromEntries(stops.map((stop) => [stop.id, stop]));
const routesById = Object.fromEntries(routes.map((route) => [route.id, route]));
const stopName = (id) => stopsById[id]?.name || `${id} (not in stops.json)`;
const routeName = (id) => routesById[id]?.name || id;

// 1. Duplicate ids
for (const [label, list] of [
  ["stop", stops],
  ["route", routes],
]) {
  const seen = new Set();
  for (const item of list) {
    if (seen.has(item.id)) {
      problems.push(
        `The ${label} id "${item.id}" appears twice. Each id must be unique.`,
      );
    }
    seen.add(item.id);
  }
}

// 2. route_stops must point at real routes and stops
for (const entry of routeStops) {
  if (!routesById[entry.routeId]) {
    problems.push(
      `route_stops.json lists stop "${stopName(entry.stopId)}" for route "${entry.routeId}", but that route is not in routes.json.`,
    );
  }
  if (!stopsById[entry.stopId]) {
    problems.push(
      `route_stops.json uses the stop id "${entry.stopId}" (route "${routeName(entry.routeId)}"), which is not in stops.json.`,
    );
  }
}

// 3. Each route needs its stops in order, and a fare row for every hop
const stopsByRoute = {};
for (const entry of routeStops) {
  (stopsByRoute[entry.routeId] ||= []).push(entry);
}

const hopsByRoute = {};
for (const route of routes) {
  const entries = (stopsByRoute[route.id] || []).sort(
    (a, b) => a.sequence - b.sequence,
  );

  if (entries.length < 2) {
    problems.push(
      `Route "${route.name}" (${route.id}) has ${entries.length} stop(s) in route_stops.json. It needs at least 2, so it is ignored.`,
    );
    continue;
  }

  const sequences = entries.map((entry) => entry.sequence);
  if (new Set(sequences).size !== sequences.length) {
    problems.push(
      `Route "${route.name}" uses the same sequence number twice in route_stops.json.`,
    );
  }

  hopsByRoute[route.id] = [];
  for (let i = 0; i < entries.length - 1; i++) {
    const hop = { from: entries[i].stopId, to: entries[i + 1].stopId };
    hopsByRoute[route.id].push(hop);

    const hasRow = segments.some(
      (segment) =>
        segment.routeId === route.id &&
        segment.fromStop === hop.from &&
        segment.toStop === hop.to,
    );
    if (!hasRow) {
      problems.push(
        `Route "${route.name}" goes ${stopName(hop.from)} to ${stopName(hop.to)}, but segments.json has no row for that hop (routeId "${route.id}", fromStop "${hop.from}", toStop "${hop.to}"). The route is ignored until it has one.`,
      );
    }
  }
}

// 4. Every segment row must belong to a real hop
for (const segment of segments) {
  if (!routesById[segment.routeId]) {
    problems.push(
      `segments.json has a row for route "${segment.routeId}" (${stopName(segment.fromStop)} to ${stopName(segment.toStop)}), but that route is not in routes.json, so the row is never used.`,
    );
    continue;
  }
  const isRealHop = (hopsByRoute[segment.routeId] || []).some(
    (hop) => hop.from === segment.fromStop && hop.to === segment.toStop,
  );
  if (!isRealHop) {
    problems.push(
      `segments.json has a row ${stopName(segment.fromStop)} to ${stopName(segment.toStop)} on "${routeName(segment.routeId)}", but those two stops are not next to each other on that route in route_stops.json, so the row is never used.`,
    );
  }
}

// Notes: not errors, but they limit what the app can say
const noFare = segments.filter(
  (segment) => segment.fareMin == null || segment.fareMax == null,
);
const noTime = segments.filter((segment) => segment.avgMinutes == null);
const noCoordinates = stops.filter(
  (stop) => !Number.isFinite(stop.lat) || !Number.isFinite(stop.lng),
);
const noCallName = routes.filter((route) => !route.callName);
const usedStopIds = new Set(routeStops.map((entry) => entry.stopId));
const unusedStops = stops.filter((stop) => !usedStopIds.has(stop.id));
const landmarksWithoutPhrase = stops.filter(
  (stop) => stop.kind === "landmark" && !stop.tellThem,
);

const label = (segment) =>
  `${stopName(segment.fromStop)} to ${stopName(segment.toStop)}`;
if (noFare.length)
  notes.push(
    `${noFare.length} ride(s) have no fare yet: ${noFare.map(label).join("; ")}`,
  );
if (noTime.length)
  notes.push(
    `${noTime.length} ride(s) have no drive time yet: ${noTime.map(label).join("; ")}`,
  );
if (noCoordinates.length)
  notes.push(
    `Stops with no coordinates (the map can't show them): ${noCoordinates.map((stop) => stop.name).join(", ")}`,
  );
if (noCallName.length)
  notes.push(
    `Routes with no callName (directions will use the route name): ${noCallName.map((route) => route.name).join(", ")}`,
  );
if (unusedStops.length)
  notes.push(
    `Stops no route uses yet: ${unusedStops.map((stop) => stop.name).join(", ")}`,
  );
if (landmarksWithoutPhrase.length)
  notes.push(
    `Places with no "tellThem" phrase: ${landmarksWithoutPhrase.map((stop) => stop.name).join(", ")}`,
  );

console.log(
  `Checked ${stops.length} stops, ${routes.length} routes, ${routeStops.length} route-stop entries and ${segments.length} fare rows.\n`,
);

if (problems.length === 0) {
  console.log("No problems. The four files agree with each other.");
} else {
  console.log(
    `${problems.length} PROBLEM(S) that change what the app shows:\n`,
  );
  problems.forEach((problem, index) =>
    console.log(`${index + 1}. ${problem}\n`),
  );
}

if (notes.length) {
  console.log("Not errors, just not confirmed yet:");
  notes.forEach((note) => console.log(`  - ${note}`));
}

process.exit(problems.length === 0 ? 0 : 1);
