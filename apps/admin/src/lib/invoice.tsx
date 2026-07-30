import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";

import type { getOrder } from "@/lib/data";
import { formatMoney } from "@/lib/money";

type Order = NonNullable<Awaited<ReturnType<typeof getOrder>>>;

const styles = StyleSheet.create({
  page: { padding: 36, fontSize: 10, color: "#0f172a" },
  title: { fontSize: 20, fontWeight: 700, marginBottom: 6 },
  muted: { color: "#64748b", marginBottom: 3 },
  section: { marginTop: 20 },
  row: { flexDirection: "row", borderBottom: "1 solid #e2e8f0", paddingVertical: 7 },
  grow: { flexGrow: 1 },
  qty: { width: 48, textAlign: "right" },
  money: { width: 90, textAlign: "right" },
  total: { marginTop: 12, textAlign: "right", fontSize: 14, fontWeight: 700 },
});

function invoiceMoney(value: string) {
  return formatMoney(value).replace("₹", "INR ");
}

export function InvoiceDocument({ order }: { order: Order }) {
  const address = order.shippingAddressSnapshot;
  return (
    <Document title={`Invoice ${order.orderNumber}`}>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>Baba&apos;s Camera</Text>
        <Text style={styles.muted}>Invoice for order {order.orderNumber}</Text>
        <Text style={styles.muted}>Customer: {order.customerName ?? order.customerEmail} · {order.customerEmail}</Text>
        <View style={styles.section}>
          <Text>{address.fullName}</Text><Text>{address.phone}</Text>
          <Text>{address.line1}{address.line2 ? `, ${address.line2}` : ""}</Text>
          <Text>{address.city}, {address.state} {address.pincode}, {address.country}</Text>
        </View>
        <View style={styles.section}>
          {order.items.map((item) => (
            <View key={item.id} style={styles.row}>
              <Text style={styles.grow}>{item.productName}{item.variantLabel ? ` · ${item.variantLabel}` : ""}</Text>
              <Text style={styles.qty}>{item.quantity} ×</Text>
              <Text style={styles.money}>{invoiceMoney(item.unitPrice)}</Text>
              <Text style={styles.money}>{invoiceMoney(item.total)}</Text>
            </View>
          ))}
          <Text style={styles.total}>Total: {invoiceMoney(order.total)}</Text>
        </View>
        <View style={styles.section}>
          <Text>Payment: {order.paymentMethod.toUpperCase()} · {order.paymentStatus}</Text>
          <Text style={styles.muted}>This invoice was generated from the immutable order item and address snapshots.</Text>
        </View>
      </Page>
    </Document>
  );
}
