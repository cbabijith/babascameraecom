import { renderToBuffer } from "@react-pdf/renderer";

import { resolveAdminAccess } from "@/features/auth/server/admin";
import { InvoiceDocument } from "@/features/orders/server/invoice";
import { getOrder } from "@/features/orders/server/readers";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  // Explicit API-grade auth: this route must not depend on a page-level
  // guard that could silently redirect (or regress) later.
  const access = await resolveAdminAccess();
  if (access.kind === "anonymous") {
    return Response.json({ error: "Authentication required." }, { status: 401 });
  }
  if (access.kind === "forbidden") {
    return Response.json({ error: access.reason }, { status: 403 });
  }

  const { id } = await params;
  const order = await getOrder(id);
  if (!order) return Response.json({ error: "Order not found." }, { status: 404 });
  const buffer = await renderToBuffer(InvoiceDocument({ order }));
  const filename = order.orderNumber.replace(/[^a-zA-Z0-9_-]/g, "_");
  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
