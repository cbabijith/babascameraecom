import { auth } from "@/lib/auth/auth";
import { toNextJsHandler } from "better-auth/next-js";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const handler = toNextJsHandler(auth.handler);
  return handler.GET(request);
}

export async function POST(request: Request) {
  const handler = toNextJsHandler(auth.handler);
  return handler.POST(request);
}

