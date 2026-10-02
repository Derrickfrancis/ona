import { findDirectRoutes } from "@/lib/routing"; // adjust path if not using the alias

export async function GET() {
  const result = findDirectRoutes("stop_isolo_market", "stop_oshodi_terminal");
  return Response.json({ directRoutes: result });
}
