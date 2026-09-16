import "server-only";

import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";

import type { ShippingAddressSnapshot } from "@babascamera/db";

type OrderRow = typeof import("@babascamera/db").orders.$inferSelect;
type OrderItemRow = typeof import("@babascamera/db").orderItems.$inferSelect;

const styles = StyleSheet.create({
  page: { padding: 36, fontSize: 10, color: "#0f172a" },
  title: { fontSize: 20, fontWeight: 700, marginBottom: 2 },
  subtitle: { fontSize: 12, color: "#334155", marginBottom: 6 },
  muted: { color: "#64748b", marginBottom: 3 },
  section: { marginTop: 20 },
  row: { flexDirection: "row", borderBottom: "1 solid #e2e8f0", paddingVertical: 7 },
  head: { color: "#64748b", borderTop: "1 solid #e2e8f0" },
  grow: { flexGrow: 1, paddingRight: 8 },
  qty: { width: 56, textAlign: "right" },
  money: { width: 90, textAlign: "right" },
  totalRow: { flexDirection: "row", justifyContent: "flex-end", marginTop: 4 },
  totalLabel: { width: 150, textAlign: "right", color: "#64748b", paddingRight: 8 },
  totalValue: { width: 90, textAlign: "right" },
  grandTotal: { marginTop: 10, flexDirection: "row", justifyContent: "flex-end" },
  grandTotalLabel: { width: 150, textAlign: "right", fontWeight: 700, paddingRight: 8 },
  grandTotalValue: { width: 90, textAlign: "right", fontSize: 12, fontWeight: 700 },
});

/** Standard PDF fonts cannot render the rupee sign, so mirror the admin invoice and use "INR". */
function inr(value: string | number) {
  const amount = Number(value);
  const safe = Number.isFinite(amount) ? amount : 0;
  return `INR ${safe.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatDate(value: Date | null) {
  if (!value) return "—";
  return value.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

export function InvoiceDocument({
  order,
  items,
}: {
  order: OrderRow;
  items: OrderItemRow[];
}) {
  const address: ShippingAddressSnapshot = order.shippingAddressSnapshot;
  const discount = Number(order.discount);
  const shipping = Number(order.shippingCharge);
  const platformCharges = Number(order.platformCharges);

  return (
    <Document title={`Invoice ${order.orderNumber}`}>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>Baba&apos;s Camera</Text>
        <Text style={styles.subtitle}>Tax Invoice</Text>
        <Text style={styles.muted}>Invoice for order {order.orderNumber}</Text>
        <Text style={styles.muted}>
          Customer: {order.customerName ?? order.customerEmail} · {order.customerEmail}
        </Text>
        <Text style={styles.muted}>
          Order placed: {formatDate(order.createdAt)}
          {order.deliveredAt ? ` · Delivered: ${formatDate(order.deliveredAt)}` : ""}
        </Text>

        <View style={styles.section}>
          <Text style={styles.head}>Shipping address</Text>
          <Text>{address.fullName}</Text>
          <Text>{address.phone}</Text>
          <Text>
            {address.line1}
            {address.line2 ? `, ${address.line2}` : ""}
          </Text>
          <Text>
            {address.city}, {address.state} {address.pincode}, {address.country}
          </Text>
        </View>

        <View style={styles.section}>
          <View style={[styles.row, styles.head]}>
            <Text style={styles.grow}>Item</Text>
            <Text style={styles.qty}>Qty</Text>
            <Text style={styles.money}>Unit price</Text>
            <Text style={styles.money}>Total</Text>
          </View>
          {items.map((item) => (
            <View key={item.id} style={styles.row}>
              <Text style={styles.grow}>
                {item.productName}
                {item.variantLabel ? ` · ${item.variantLabel}` : ""}
              </Text>
              <Text style={styles.qty}>{item.quantity} ×</Text>
              <Text style={styles.money}>{inr(item.unitPrice)}</Text>
              <Text style={styles.money}>{inr(item.total)}</Text>
            </View>
          ))}

          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Subtotal</Text>
            <Text style={styles.totalValue}>{inr(order.subtotal)}</Text>
          </View>
          {discount > 0 && (
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Discount</Text>
              <Text style={styles.totalValue}>- {inr(order.discount)}</Text>
            </View>
          )}
          {shipping > 0 && (
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Delivery</Text>
              <Text style={styles.totalValue}>{inr(order.shippingCharge)}</Text>
            </View>
          )}
          {platformCharges > 0 && (
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Payment gateway fee</Text>
              <Text style={styles.totalValue}>{inr(order.platformCharges)}</Text>
            </View>
          )}
          <View style={styles.grandTotal}>
            <Text style={styles.grandTotalLabel}>Total</Text>
            <Text style={styles.grandTotalValue}>{inr(order.total)}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text>
            Payment: {order.paymentMethod.toUpperCase()} · {order.paymentStatus.toUpperCase()}
          </Text>
          <Text style={styles.muted}>
            Generated from the immutable order item and address snapshots on {formatDate(new Date())}.
          </Text>
        </View>
      </Page>
    </Document>
  );
}
