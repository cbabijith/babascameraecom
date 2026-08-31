import { z } from "zod";

import { publicActionError } from "@/lib/actions/result";
import { processOrderRefund } from "@/features/orders/services/refund-service";

const bodySchema = z.object({
  reason: z.string().trim().max(500).optional(),
}).strict();

function isSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  const requestUrl = new URL(request.url);
  const forwardedHost = request.headers.get("x-forwarded-host");
  const host = forwardedHost ?? request.headers.get("host") ?? requestUrl.host;
  const forwardedProto = request.headers.get("x-forwarded-proto");
  const expectedOrigin = `${forwardedProto ?? requestUrl.protocol.replace(":", "")}://${host}`;
  try {
    return new URL(origin).origin === new URL(expectedOrigin).origin;
  } catch {
    return false;
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isSameOrigin(request)) {
    return Response.json({ error: "Cross-origin refund requests are not allowed." }, { status: 403 });
  }
  const { id } = await params;
  const parsedId = z.string().uuid().safeParse(id);
  if (!parsedId.success) return Response.json({ error: "Invalid order ID." }, { status: 400 });
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Request body must be JSON." }, { status: 400 });
  }
  const parsedBody = bodySchema.safeParse(body);
  if (!parsedBody.success) {
    return Response.json({ error: "Invalid refund request." }, { status: 400 });
  }
  try {
    await processOrderRefund(parsedId.data, parsedBody.data.reason);
    return Response.json({ ok: true, idempotencyKey: parsedId.data });
  } catch (error) {
    const message = publicActionError(error, "Refund failed. Check the order and provider state before retrying.");
    return Response.json({ error: message }, { status: 409 });
  }
}
