/**
 * Runtime shim for `next/server` inside the Hono backend. NextResponse is a
 * Web Response subclass with static helpers; the subset the storefront route
 * handlers use is provided here so they run verbatim under Bun/Hono.
 */
interface NextResponseInit extends ResponseInit {
  headers?: HeadersInit;
}

export class NextResponse extends Response {
  static json(body: unknown, init?: NextResponseInit): NextResponse {
    const headers = new Headers(init?.headers);
    headers.set("content-type", "application/json");
    return new NextResponse(JSON.stringify(body), { ...init, headers });
  }

  static redirect(url: string | URL, status = 307): NextResponse {
    return new NextResponse(null, { status, headers: { location: String(url) } });
  }

  static next(): never {
    throw new Error("NextResponse.next() is not supported in the Hono backend");
  }
}

export class NextRequest extends Request {}
