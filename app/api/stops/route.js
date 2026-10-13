import { getStops } from "@/lib/data";

// Only the fields the browser needs. Internal notes and the "tell them"
// phrase stay on the server.
export async function GET() {
  const stops = getStops().map((stop) => ({
    id: stop.id,
    name: stop.name,
    lat: stop.lat,
    lng: stop.lng,
    aliases: stop.aliases || [],
    kind: stop.kind || "stop",
  }));

  return Response.json({ stops });
}
