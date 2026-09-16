import { renderToBuffer } from "@react-pdf/renderer";

import { and, asc, eq, getDatabase, orderItems, orders } from "@babascamera/db";
import { getOptionalUser } from "@/lib/auth/session";
import { InvoiceDocument } from "@/features/order/server/invoice";

export const dynamic = "force-dynamic";

/**
 * Customer-facing order invoice.
 *
 * Mirrors the admin invoice route but authenticates the storefront session
 * instead of an admin role: the requester must own the order, and the order
 * must be delivered before an invoice is issued.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getOptionalUser();
  if (!user) {
    return Response.json({ error: "Please log in to continue." }, { status: 401 });
  }

  const { id } = await params;
  const database = getDatabase();
  const [order] = await database
    .select()
    .from(orders)
    .where(and(eq(orders.id, id), eq(orders.userId, user.id)))
    .limit(1);

  // Same response whether the order is missing or owned by someone else, so
  // ids of other customers' orders cannot be probed.
  if (!order) {
    return Response.json({ error: "Order not found." }, { status: 404 });
  }

  if (order.status !== "delivered") {
    return Response.json(
      { error: "Invoices are available once the order has been delivered." },
      { status: 403 },
    );
  }

  const items = await database
    .select()
    .from(orderItems)
    .where(eq(orderItems.orderId, order.id))
    .orderBy(asc(orderItems.createdAt));

  const buffer = await renderToBuffer(InvoiceDocument({ order, items }));
  const filename = order.orderNumber.replace(/[^a-zA-Z0-9_-]/g, "_");
  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="invoice-${filename}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
