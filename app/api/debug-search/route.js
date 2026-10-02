import { searchRoutes } from "@/lib/routing"; // adjust path to match your import style

export async function GET() {
  const results = searchRoutes("stop_isolo_market", "stop_obalende");
  return Response.json(results);
}
