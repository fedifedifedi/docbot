import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

/** Liveness + database check, used by Railway's healthcheck. */
export async function GET() {
  try {
    await getDb().$queryRaw`SELECT 1`;
    return Response.json({ status: "ok", db: "ok" });
  } catch (error) {
    console.error("[health] database check failed", error);
    return Response.json({ status: "error", db: "unreachable" }, { status: 503 });
  }
}
