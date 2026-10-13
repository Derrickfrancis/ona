import { rankRoutes, getStopIdsBetween } from "@/lib/routing";
import { buildSteps } from "@/lib/directions";
import { getStops, getRoutes } from "@/lib/data";

const MAX_ORIGINS = 5;
const MAX_OPTIONS = 6;
const MAX_PARAM_LENGTH = 300;

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const originsParam =
    searchParams.get("origins") || searchParams.get("origin");
  const destination = searchParams.get("destination");

  if (!originsParam || !destination) {
    return Response.json(
      { error: "Both origin and destination are required." },
      { status: 400 },
    );
  }

  if (originsParam.length > MAX_PARAM_LENGTH) {
    return Response.json({ error: "Request too long." }, { status: 400 });
  }

  const origins = [
    ...new Set(
      originsParam
        .split(",")
        .map((id) => id.trim())
        .filter(Boolean),
    ),
  ];

  if (origins.length === 0 || origins.length > MAX_ORIGINS) {
    return Response.json(
      { error: "Invalid starting points." },
      { status: 400 },
    );
  }

  // Never trust client input blindly: check it against real stop IDs
  const stopsById = Object.fromEntries(
    getStops().map((stop) => [stop.id, stop]),
  );
  const allKnown =
    origins.every((id) => stopsById[id]) && stopsById[destination];
  if (!allKnown) {
    return Response.json({ error: "Unknown stop." }, { status: 400 });
  }

  if (origins.every((id) => id === destination)) {
    return Response.json(
      { error: "Origin and destination must differ." },
      { status: 400 },
    );
  }

  const result = rankRoutes(origins, destination);
  const routesById = Object.fromEntries(
    getRoutes().map((route) => [route.id, route]),
  );

  function describeStop(stopId) {
    const stop = stopsById[stopId];
    return { id: stopId, name: stop?.name, lat: stop?.lat, lng: stop?.lng };
  }

  const options = result.options.slice(0, MAX_OPTIONS).map((opt) => ({
    ...opt,
    startStopName: stopsById[opt.startStopId]?.name,
    steps: buildSteps(opt, stopsById, routesById),
    legs: opt.legs.map((leg) => ({
      ...leg,
      mode: routesById[leg.routeId]?.mode,
      modeTier: routesById[leg.routeId]?.modeTier,
      fromStopName: stopsById[leg.fromStopId]?.name,
      toStopName: stopsById[leg.toStopId]?.name,
      fromLat: stopsById[leg.fromStopId]?.lat,
      fromLng: stopsById[leg.fromStopId]?.lng,
      toLat: stopsById[leg.toStopId]?.lat,
      toLng: stopsById[leg.toStopId]?.lng,
      stopsAlong: getStopIdsBetween(
        leg.routeId,
        leg.fromStopId,
        leg.toStopId,
      ).map(describeStop),
    })),
  }));

  return Response.json({ options, bestReason: result.bestReason });
}
