import { rankRoutes } from "@/lib/routing";

export async function GET() {
  const result = rankRoutes("stop_isolo_market", "stop_obalende");
  return Response.json(result);
}
