import { renderToBuffer } from "@react-pdf/renderer";

import { InvoiceDocument } from "@/features/orders/server/invoice";
import { getOrder } from "@/features/orders/server/readers";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
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
