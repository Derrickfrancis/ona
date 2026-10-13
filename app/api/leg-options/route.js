import { getLegOptionsFrom } from "@/lib/routing";
import { getStops, getRoutes } from "@/lib/data";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const fromStopId = searchParams.get("fromStopId");

  if (!fromStopId) {
    return Response.json({ error: "fromStopId is required." }, { status: 400 });
  }

  const stopsById = Object.fromEntries(
    getStops().map((stop) => [stop.id, stop]),
  );
  if (!stopsById[fromStopId]) {
    return Response.json({ error: "Unknown stop." }, { status: 400 });
  }

  const routesById = Object.fromEntries(
    getRoutes().map((route) => [route.id, route]),
  );

  const options = getLegOptionsFrom(fromStopId).map((opt) => ({
    routeId: opt.routeId,
    mode: routesById[opt.routeId]?.mode,
    routeName: routesById[opt.routeId]?.name,
    callName: routesById[opt.routeId]?.callName,
    destinations: opt.destinations.map((stopId) => ({
      id: stopId,
      name: stopsById[stopId]?.name,
    })),
  }));

  return Response.json({ options });
}
