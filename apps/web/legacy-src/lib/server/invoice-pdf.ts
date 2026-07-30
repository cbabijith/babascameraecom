import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";

export type InvoiceLine = {
  productName: string;
  sku: string;
  quantity: number;
  unitPriceMinor: number;
  discountMinor: number;
  taxMinor: number;
  totalMinor: number;
};

export type InvoiceDocumentInput = {
  invoiceNumber: string;
  orderNumber: string;
  issuedAt: string;
  currency: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  shippingAddress: Record<string, unknown>;
  itemsSubtotalMinor: number;
  discountMinor: number;
  shippingMinor: number;
  taxMinor: number;
  gatewayFeeMinor: number;
  totalMinor: number;
  lines: InvoiceLine[];
};

const pageWidth = 595.28;
const pageHeight = 841.89;
const margin = 44;

function printable(value: unknown, fallback = "") {
  const normalized = String(value ?? fallback).normalize("NFKD");
  return normalized.replace(/[^\x20-\x7e]/g, "?").trim();
}

function money(valueMinor: number, currency: string) {
  const value = Number.isFinite(valueMinor) ? valueMinor : 0;
  return `${printable(currency, "INR")} ${(value / 100).toFixed(2)}`;
}

function addressLine(address: Record<string, unknown>) {
  return [
    address.recipient_name,
    address.building,
    address.line1,
    address.line2,
    address.landmark,
    address.city,
    address.state,
    address.postal_code,
    address.country,
  ]
    .map((value) => printable(value))
    .filter(Boolean)
    .join(", ");
}

function truncate(font: PDFFont, text: string, maxWidth: number, size: number) {
  const safe = printable(text);
  if (font.widthOfTextAtSize(safe, size) <= maxWidth) return safe;
  let value = safe;
  while (
    value.length > 1 &&
    font.widthOfTextAtSize(`${value}...`, size) > maxWidth
  ) {
    value = value.slice(0, -1);
  }
  return `${value}...`;
}

function drawRight(
  page: PDFPage,
  font: PDFFont,
  text: string,
  x: number,
  y: number,
  size: number,
) {
  const safe = printable(text);
  page.drawText(safe, {
    x: x - font.widthOfTextAtSize(safe, size),
    y,
    size,
    font,
    color: rgb(0.12, 0.15, 0.2),
  });
}

function drawPageHeader(
  page: PDFPage,
  regular: PDFFont,
  bold: PDFFont,
  input: InvoiceDocumentInput,
  continuation: boolean,
) {
  page.drawRectangle({
    x: 0,
    y: pageHeight - 116,
    width: pageWidth,
    height: 116,
    color: rgb(0.055, 0.07, 0.1),
  });
  page.drawRectangle({
    x: margin,
    y: pageHeight - 91,
    width: 72,
    height: 4,
    color: rgb(0.91, 0.14, 0.16),
  });
  page.drawText("BABAS CAMERA", {
    x: margin,
    y: pageHeight - 56,
    size: 22,
    font: bold,
    color: rgb(1, 1, 1),
  });
  page.drawText(continuation ? "ORDER INVOICE - CONTINUED" : "ORDER INVOICE", {
    x: margin,
    y: pageHeight - 78,
    size: 10,
    font: regular,
    color: rgb(0.84, 0.86, 0.9),
  });
  drawRight(
    page,
    bold,
    printable(input.invoiceNumber),
    pageWidth - margin,
    pageHeight - 56,
    13,
  );
  drawRight(
    page,
    regular,
    `Order ${printable(input.orderNumber)}`,
    pageWidth - margin,
    pageHeight - 76,
    9,
  );
}

export async function createInvoicePdf(input: InvoiceDocumentInput) {
  const document = await PDFDocument.create();
  document.setTitle(`Order Invoice ${printable(input.invoiceNumber)}`);
  document.setAuthor("Babas Camera");
  document.setCreator("Babas Camera Commerce");
  document.setCreationDate(new Date(input.issuedAt));

  const regular = await document.embedFont(StandardFonts.Helvetica);
  const bold = await document.embedFont(StandardFonts.HelveticaBold);
  let page = document.addPage([pageWidth, pageHeight]);
  drawPageHeader(page, regular, bold, input, false);
  let y = pageHeight - 145;

  page.drawText("BILL TO", {
    x: margin,
    y,
    size: 9,
    font: bold,
    color: rgb(0.42, 0.46, 0.53),
  });
  page.drawText("ISSUED", {
    x: 390,
    y,
    size: 9,
    font: bold,
    color: rgb(0.42, 0.46, 0.53),
  });
  y -= 19;
  page.drawText(truncate(bold, input.customerName, 310, 11), {
    x: margin,
    y,
    size: 11,
    font: bold,
    color: rgb(0.12, 0.15, 0.2),
  });
  page.drawText(printable(new Date(input.issuedAt).toLocaleDateString("en-IN")), {
    x: 390,
    y,
    size: 10,
    font: regular,
    color: rgb(0.12, 0.15, 0.2),
  });
  y -= 16;
  const contact = [input.customerEmail, input.customerPhone]
    .map((value) => printable(value))
    .filter(Boolean)
    .join(" | ");
  page.drawText(truncate(regular, contact, 310, 9), {
    x: margin,
    y,
    size: 9,
    font: regular,
    color: rgb(0.3, 0.34, 0.4),
  });
  y -= 15;
  page.drawText(truncate(regular, addressLine(input.shippingAddress), 500, 8), {
    x: margin,
    y,
    size: 8,
    font: regular,
    color: rgb(0.3, 0.34, 0.4),
  });
  y -= 29;

  const drawTableHeader = () => {
    page.drawRectangle({
      x: margin,
      y: y - 5,
      width: pageWidth - margin * 2,
      height: 23,
      color: rgb(0.94, 0.95, 0.97),
    });
    page.drawText("ITEM", { x: margin + 7, y: y + 3, size: 8, font: bold });
    page.drawText("QTY", { x: 330, y: y + 3, size: 8, font: bold });
    page.drawText("UNIT", { x: 375, y: y + 3, size: 8, font: bold });
    page.drawText("TAX", { x: 450, y: y + 3, size: 8, font: bold });
    drawRight(page, bold, "TOTAL", pageWidth - margin - 7, y + 3, 8);
    y -= 26;
  };
  drawTableHeader();

  for (const line of input.lines) {
    if (y < 105) {
      page.drawText("Continued on next page", {
        x: margin,
        y: 60,
        size: 8,
        font: regular,
        color: rgb(0.42, 0.46, 0.53),
      });
      page = document.addPage([pageWidth, pageHeight]);
      drawPageHeader(page, regular, bold, input, true);
      y = pageHeight - 150;
      drawTableHeader();
    }
    const itemText = `${printable(line.productName)} (${printable(line.sku)})`;
    page.drawText(truncate(regular, itemText, 265, 8), {
      x: margin + 7,
      y,
      size: 8,
      font: regular,
      color: rgb(0.12, 0.15, 0.2),
    });
    page.drawText(String(line.quantity), {
      x: 335,
      y,
      size: 8,
      font: regular,
    });
    drawRight(
      page,
      regular,
      money(line.unitPriceMinor, input.currency),
      438,
      y,
      8,
    );
    drawRight(
      page,
      regular,
      money(line.taxMinor, input.currency),
      500,
      y,
      8,
    );
    drawRight(
      page,
      regular,
      money(line.totalMinor, input.currency),
      pageWidth - margin - 7,
      y,
      8,
    );
    y -= 20;
  }

  if (y < 190) {
    page = document.addPage([pageWidth, pageHeight]);
    drawPageHeader(page, regular, bold, input, true);
    y = pageHeight - 150;
  }
  const totalsX = 350;
  const totals = [
    ["Subtotal", input.itemsSubtotalMinor],
    ["Discount", -input.discountMinor],
    ["Delivery", input.shippingMinor],
    ["Tax", input.taxMinor],
    ["Payment fee", input.gatewayFeeMinor],
  ] as const;
  y -= 14;
  for (const [label, amount] of totals) {
    page.drawText(label, {
      x: totalsX,
      y,
      size: 9,
      font: regular,
      color: rgb(0.3, 0.34, 0.4),
    });
    drawRight(
      page,
      regular,
      money(amount, input.currency),
      pageWidth - margin,
      y,
      9,
    );
    y -= 18;
  }
  page.drawLine({
    start: { x: totalsX, y: y + 8 },
    end: { x: pageWidth - margin, y: y + 8 },
    thickness: 1,
    color: rgb(0.82, 0.84, 0.88),
  });
  page.drawText("TOTAL", {
    x: totalsX,
    y: y - 8,
    size: 11,
    font: bold,
    color: rgb(0.12, 0.15, 0.2),
  });
  drawRight(
    page,
    bold,
    money(input.totalMinor, input.currency),
    pageWidth - margin,
    y - 8,
    11,
  );

  page.drawText(
    "This computer-generated order invoice is available from your authenticated account.",
    {
      x: margin,
      y: 42,
      size: 7.5,
      font: regular,
      color: rgb(0.42, 0.46, 0.53),
    },
  );

  return document.save();
}
