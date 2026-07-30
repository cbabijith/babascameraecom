import { PDFDocument } from "pdf-lib";
import { describe, expect, it } from "vitest";

import { createInvoicePdf } from "./invoice-pdf";

describe("invoice PDF", () => {
  it("creates a readable multi-line PDF document", async () => {
    const bytes = await createInvoicePdf({
      invoiceNumber: "INV-20260729-00000001",
      orderNumber: "ORD-20260729-00000001",
      issuedAt: "2026-07-29T12:00:00.000Z",
      currency: "INR",
      customerName: "Local Test Customer",
      customerEmail: "customer@example.invalid",
      customerPhone: "+919999999999",
      shippingAddress: {
        building: "Test Building",
        line1: "Test Street",
        city: "Thiruvananthapuram",
        state: "Kerala",
        postal_code: "695001",
        country: "India",
      },
      itemsSubtotalMinor: 1_999_000,
      discountMinor: 0,
      shippingMinor: 0,
      taxMinor: 304_932,
      gatewayFeeMinor: 0,
      totalMinor: 1_999_000,
      lines: [
        {
          productName: "Sony FE 50mm F1.8 Lens",
          sku: "SONY-SEL50F18F",
          quantity: 1,
          unitPriceMinor: 1_999_000,
          discountMinor: 0,
          taxMinor: 304_932,
          totalMinor: 1_999_000,
        },
      ],
    });

    expect(new TextDecoder().decode(bytes.slice(0, 5))).toBe("%PDF-");
    const loaded = await PDFDocument.load(bytes);
    expect(loaded.getPageCount()).toBe(1);
    expect(loaded.getTitle()).toBe("Invoice INV-20260729-00000001");
  });
});
