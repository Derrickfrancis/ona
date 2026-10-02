import { rankRoutes } from "@/lib/routing";
import { getStops } from "@/lib/data";

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

  // Never trust client input blindly — check it against real stop IDs
  const validStopIds = new Set(getStops().map((s) => s.id));
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
  return Response.json(result);
}
