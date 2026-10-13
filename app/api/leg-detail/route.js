import { getLegDetails, getStopIdsBetween } from "@/lib/routing";
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

  const stopsById = Object.fromEntries(
    getStops().map((stop) => [stop.id, stop]),
  );
  const routesById = Object.fromEntries(
    getRoutes().map((route) => [route.id, route]),
  );
  if (!stopsById[fromStopId] || !stopsById[toStopId] || !routesById[routeId]) {
    return Response.json({ error: "Unknown stop or route." }, { status: 400 });
  }

  const leg = getLegDetails(routeId, fromStopId, toStopId);
  if (!leg) {
    return Response.json({ error: "That leg is not valid." }, { status: 400 });
  }

  function describeStop(stopId) {
    const stop = stopsById[stopId];
    return { id: stopId, name: stop?.name, lat: stop?.lat, lng: stop?.lng };
  }

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
    stopsAlong: getStopIdsBetween(routeId, fromStopId, toStopId).map(
      describeStop,
    ),
    ...leg,
  });
}
