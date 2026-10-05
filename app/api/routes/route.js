import { rankRoutes } from "@/lib/routing";
import { getStops, getRoutes } from "@/lib/data";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const origin = searchParams.get("origin");
  const destination = searchParams.get("destination");

  if (!origin || !destination) {
    return Response.json(
      { error: "Both origin and destination are required." },
      { status: 400 },
    );
  }

  const validStopIds = new Set(getStops().map((stop) => stop.id));
  if (!validStopIds.has(origin) || !validStopIds.has(destination)) {
    return Response.json({ error: "Unknown stop." }, { status: 400 });
  }

  if (origin === destination) {
    return Response.json(
      { error: "Origin and destination must differ." },
      { status: 400 },
    );
  }

  const result = rankRoutes(origin, destination);

  // Enrich each leg with mode and stop names, so the UI doesn't need to
  // look anything up itself
  const routesById = Object.fromEntries(
    getRoutes().map((route) => [route.id, route]),
  );
  const stopsById = Object.fromEntries(
    getStops().map((stop) => [stop.id, stop]),
  );

  const enriched = {
    ...result,
    options: result.options.map((opt) => ({
      ...opt,
      legs: opt.legs.map((leg) => ({
        ...leg,
        mode: routesById[leg.routeId]?.mode,
        modeTier: routesById[leg.routeId]?.modeTier,
        fromStopName: stopsById[leg.fromStopId]?.name,
        toStopName: stopsById[leg.toStopId]?.name,
      })),
    })),
  };

  return Response.json(enriched);
}
