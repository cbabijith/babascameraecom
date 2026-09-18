import "server-only";

import {
  and,
  emailOutbox,
  eq,
  getDatabase,
  lte,
  or,
} from "@babascamera/db";
import { Resend } from "resend";

function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

const EXTRA_PAYLOAD_LABELS: Record<string, string> = {
  paymentMethod: "Payment method",
  carrier: "Carrier",
  trackingNumber: "Tracking number",
};

function renderMessage(row: {
  template: string;
  subject: string;
  payload: Record<string, unknown>;
}) {
  if (row.template === "contact-enquiry") {
    const contactLabels: Record<string, string> = {
      name: "Name",
      phone: "Phone",
      email: "Email",
      message: "Message",
    };
    const contactLines = Object.entries(contactLabels)
      .filter(([key]) => String(row.payload[key] ?? "").length > 0)
      .map(([key, label]) => `${label}: ${String(row.payload[key])}`)
      .join("\n");
    const contactHtml = Object.entries(contactLabels)
      .filter(([key]) => String(row.payload[key] ?? "").length > 0)
      .map(
        ([key, label]) =>
          `<p><strong>${escapeHtml(label)}:</strong> ${escapeHtml(row.payload[key])}</p>`,
      )
      .join("");
    return {
      text: `${row.subject}\n\n${contactLines}`,
      html: `<h1>${escapeHtml(row.subject)}</h1>${contactHtml}`,
    };
  }
  const orderNumber = escapeHtml(row.payload.orderNumber);
  const total = escapeHtml(row.payload.total);
  const extras = Object.entries(EXTRA_PAYLOAD_LABELS)
    .filter(([key]) => {
      const raw = row.payload[key];
      return raw !== undefined && raw !== null && String(raw).length > 0;
    })
    .map(([key, label]) => {
      const value = escapeHtml(row.payload[key]);
      return `<br><strong>${escapeHtml(label)}:</strong> ${value}`;
    })
    .join("");
  const textExtras = Object.entries(EXTRA_PAYLOAD_LABELS)
    .filter(([key]) => {
      const raw = row.payload[key];
      return raw !== undefined && raw !== null && String(raw).length > 0;
    })
    .map(([key, label]) => `${label}: ${String(row.payload[key])}`)
    .join("\n");
  return {
    text: `${row.subject}\n\nOrder: ${String(row.payload.orderNumber ?? "")}\nTotal: INR ${String(row.payload.total ?? "")}${textExtras ? `\n${textExtras}` : ""}`,
    html: `<h1>${escapeHtml(row.subject)}</h1><p>Thank you for shopping with Baba's Camera.</p><p><strong>Order:</strong> ${orderNumber}<br><strong>Total:</strong> INR ${total}${extras}</p>`,
  };
}

async function deliver(row: {
  toEmail: string;
  template: string;
  subject: string;
  dedupeKey: string;
  payload: Record<string, unknown>;
}) {
  const adapter = process.env.EMAIL_ADAPTER?.trim() || "resend";
  if (adapter === "console" && process.env.NODE_ENV !== "production") {
    console.info("Development email accepted", {
      to: row.toEmail,
      dedupeKey: row.dedupeKey,
    });
    return;
  }
  if (adapter !== "resend") {
    throw new Error("A production-safe email adapter is not configured.");
  }
  const key = process.env.RESEND_API_KEY?.trim();
  const from = process.env.RESEND_FROM_EMAIL?.trim();
  if (!key || !from) throw new Error("Resend is not configured.");
  const message = renderMessage(row);
  const { error } = await new Resend(key).emails.send(
    {
      from,
      to: row.toEmail,
      subject: row.subject,
      text: message.text,
      html: message.html,
    },
    { idempotencyKey: row.dedupeKey },
  );
  if (error) throw new Error(`Resend rejected the email: ${error.message}`);
}

async function claimBatch(limit: number) {
  const database = getDatabase();
  return database.transaction(async (transaction) => {
    const stale = new Date(Date.now() - 10 * 60 * 1000);
    const rows = await transaction
      .select()
      .from(emailOutbox)
      .where(
        or(
          and(
            eq(emailOutbox.status, "pending"),
            lte(emailOutbox.nextAttemptAt, new Date()),
          ),
          and(
            eq(emailOutbox.status, "processing"),
            lte(emailOutbox.updatedAt, stale),
          ),
        ),
      )
      .orderBy(emailOutbox.createdAt)
      .limit(Math.min(Math.max(limit, 1), 50))
      .for("update", { skipLocked: true });
    for (const row of rows) {
      await transaction
        .update(emailOutbox)
        .set({
          status: "processing",
          attemptCount: row.attemptCount + 1,
          updatedAt: new Date(),
        })
        .where(eq(emailOutbox.id, row.id));
    }
    return rows.map((row) => ({
      ...row,
      attemptCount: row.attemptCount + 1,
    }));
  });
}

export async function processEmailOutbox(limit = 20) {
  const rows = await claimBatch(limit);
  let sent = 0;
  let failed = 0;
  for (const row of rows) {
    try {
      await deliver({
        toEmail: row.toEmail,
        template: row.template,
        subject: row.subject,
        dedupeKey: row.dedupeKey,
        payload: row.payload,
      });
      await getDatabase()
        .update(emailOutbox)
        .set({
          status: "sent",
          sentAt: new Date(),
          lastError: null,
          updatedAt: new Date(),
        })
        .where(eq(emailOutbox.id, row.id));
      sent += 1;
    } catch (error) {
      const terminal = row.attemptCount >= 5;
      await getDatabase()
        .update(emailOutbox)
        .set({
          status: terminal ? "failed" : "pending",
          nextAttemptAt: new Date(
            Date.now() +
              Math.min(60, 2 ** row.attemptCount) * 60 * 1000,
          ),
          lastError:
            error instanceof Error
              ? error.message.slice(0, 500)
              : "Unknown email error",
          updatedAt: new Date(),
        })
        .where(eq(emailOutbox.id, row.id));
      failed += 1;
    }
  }
  return { claimed: rows.length, sent, failed };
}
