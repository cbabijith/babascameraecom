import { z } from "zod";

import { emailOutbox, getDatabase } from "@babascamera/db";

import {
  crossOriginFailure,
  isSameOrigin,
  readJsonBody,
  storefrontFailure,
  storefrontSuccess,
  validationFailureResponse,
} from "@/lib/api/storefront-api";

export const dynamic = "force-dynamic";

const CONTACT_TO_EMAIL =
  process.env.CONTACT_INBOX_EMAIL?.trim() || "enquiry@babas.co";

const contactSchema = z.object({
  name: z.string().trim().min(2).max(100),
  phone: z.string().trim().regex(/^[+0-9 ()-]{8,20}$/),
  email: z.email().max(320),
  message: z.string().trim().min(5).max(2000),
});

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return crossOriginFailure();
  const body = await readJsonBody(request);
  const parsed = contactSchema.safeParse(body);
  if (!parsed.success) return validationFailureResponse(parsed.error);
  const { name, phone, email, message } = parsed.data;
  try {
    const database = getDatabase();
    await database.insert(emailOutbox).values({
      toEmail: CONTACT_TO_EMAIL,
      template: "contact-enquiry",
      subject: `Website enquiry from ${name}`,
      dedupeKey: `contact-${crypto.randomUUID()}`,
      payload: { name, phone, email, message },
    });
    return storefrontSuccess(
      "Thank you — your message reached us. We reply within a day.",
    );
  } catch (error) {
    console.error("Contact enquiry failed", {
      type: error instanceof Error ? error.name : typeof error,
    });
    return storefrontFailure(
      "We could not submit your message. Please try again.",
      500,
    );
  }
}
