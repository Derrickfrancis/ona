import { getLegDetails } from "@/lib/routing";
import { getStops, getRoutes } from "@/lib/data";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const routeId = searchParams.get("routeId");
  const fromStopId = searchParams.get("fromStopId");
  const toStopId = searchParams.get("toStopId");

  if (!routeId || !fromStopId || !toStopId) {
    return Response.json(
      { error: "routeId, fromStopId and toStopId are required." },
      { status: 400 },
    );
  }

  const validStopIds = new Set(getStops().map((stop) => stop.id));
  const validRouteIds = new Set(getRoutes().map((route) => route.id));
  if (
    !validStopIds.has(fromStopId) ||
    !validStopIds.has(toStopId) ||
    !validRouteIds.has(routeId)
  ) {
    return Response.json({ error: "Unknown stop or route." }, { status: 400 });
  }

  const leg = getLegDetails(routeId, fromStopId, toStopId);
  if (!leg) {
    return Response.json({ error: "That leg is not valid." }, { status: 400 });
  }

  const routesById = Object.fromEntries(
    getRoutes().map((route) => [route.id, route]),
  );
  const stopsById = Object.fromEntries(
    getStops().map((stop) => [stop.id, stop]),
  );

  return Response.json({
    routeId,
    mode: routesById[routeId]?.mode,
    fromStopId,
    toStopId,
    fromStopName: stopsById[fromStopId]?.name,
    toStopName: stopsById[toStopId]?.name,
    fromLat: stopsById[fromStopId]?.lat,
    fromLng: stopsById[fromStopId]?.lng,
    toLat: stopsById[toStopId]?.lat,
    toLng: stopsById[toStopId]?.lng,
    ...leg,
  });
}
