import { getStops } from "@/lib/data";

export async function GET() {
  const stops = getStops();
  return Response.json(stops);
}
