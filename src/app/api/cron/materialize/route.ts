import { materializeRecurring } from "@/lib/materialize";

export const dynamic = "force-dynamic";

async function handle(request: Request) {
  const secret = process.env.CRON_SECRET;
  const authorization = request.headers.get("authorization");

  if (!secret || authorization !== `Bearer ${secret}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const created = await materializeRecurring(null);
  return Response.json({ created });
}

export async function POST(request: Request) {
  return handle(request);
}

export async function GET(request: Request) {
  return handle(request);
}
