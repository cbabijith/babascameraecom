import "server-only";

import { randomUUID } from "node:crypto";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import type { Database } from "@babas/database";
import {
  PAYMENT_PROOF_BUCKET,
  PAYMENT_PROOF_MAX_BYTES,
  type PaymentMethod,
} from "@babas/domain";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { getAuthenticatedUser } from "@/lib/supabase/user";
import { configuredPaymentProvider, createProviderOrder } from "./payments";
import { asNumber, asRow, asString, type Row } from "./shapes";
import { checkoutIdempotencyKey } from "./checkout-idempotency";
import { authoritativeCheckoutMethod } from "./checkout-session-contract";
import { validatedPendingBankTransfer } from "./bank-transfer-contract";
import {
  validatePaymentProofBytes,
  validatedProofExtension,
} from "./proof-file";

export type CheckoutMethod = "RAZORPAY" | "BANK_TRANSFER" | "COD";

export type CheckoutRequest = {
  mode?: "cart" | "buy_now";
  items?: Array<{ productId: string; quantity: number }>;
  addressId: string;
  paymentMethod: CheckoutMethod;
  couponCode?: string;
  idempotencyKey?: string;
  checkoutSessionId?: string;
  bankTransfer?: {
    referenceNumber: string;
    accountName: string;
    proofPath: string;
  };
};

type NormalizedCheckoutRequest = Omit<
  CheckoutRequest,
  "paymentMethod" | "items" | "idempotencyKey"
> & {
  paymentMethod: CheckoutMethod;
  items: NonNullable<CheckoutRequest["items"]>;
  idempotencyKey: string;
};

export class CheckoutError extends Error {
  constructor(message: string, readonly status = 400, readonly cause?: unknown) {
    super(message);
    this.name = "CheckoutError";
  }
}

async function authenticatedContext(): Promise<{
  supabase: SupabaseClient<Database>;
  user: User;
}> {
  const [supabase, user] = await Promise.all([createClient(), getAuthenticatedUser()]);
  return { supabase, user };
}

function rpcErrorMessage(error: unknown): string {
  const row = asRow(error);
  return asString(row.message) || asString(row.details) || "Checkout operation failed.";
}

async function cartId(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<string | null> {
  const { data, error } = await supabase
    .from("carts")
    .select("id")
    .eq("user_id", userId)
    .eq("status", "active")
    .maybeSingle();
  if (error) throw new CheckoutError("Unable to read cart.", 500, error);
  return data ? asString(asRow(data).id) : null;
}

function normalizeRequest(input: CheckoutRequest): NormalizedCheckoutRequest {
  const method = String(input.paymentMethod ?? "").toUpperCase() as CheckoutMethod;
  if (!["RAZORPAY", "BANK_TRANSFER", "COD"].includes(method)) {
    throw new CheckoutError("Unsupported payment method.");
  }
  if (!input.addressId) throw new CheckoutError("Shipping address is required.");
  const items = (input.items ?? [])
    .filter((item) => item.productId && Number.isFinite(item.quantity))
    .map((item) => ({
      productId: item.productId,
      quantity: Math.max(1, Math.floor(item.quantity)),
    }));
  if (input.mode === "buy_now" && !items.length) {
    throw new CheckoutError("A buy-now item is required.");
  }
  return {
    ...input,
    paymentMethod: method,
    items,
    idempotencyKey: checkoutIdempotencyKey(input.idempotencyKey),
  };
}

function databasePaymentMethod(method: CheckoutMethod): PaymentMethod {
  return method.toLowerCase() as PaymentMethod;
}

function minorToMajor(value: unknown): number {
  return asNumber(value) / 100;
}

async function checkoutItems(
  supabase: SupabaseClient<Database>,
  items: NonNullable<CheckoutRequest["items"]>,
) {
  if (!items.length) return null;
  const requestedIds = [...new Set(items.map((item) => item.productId))];
  const { data, error } = await supabase
    .from("product_variants")
    .select("id,product_id,is_default,created_at")
    .in("product_id", requestedIds)
    .eq("is_active", true)
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: true });
  if (error) throw new CheckoutError("Unable to resolve product variants.", 400, error);

  const defaultByProduct = new Map<string, string>();
  for (const value of data ?? []) {
    const row = asRow(value);
    const productId = asString(row.product_id);
    if (productId && !defaultByProduct.has(productId)) {
      defaultByProduct.set(productId, asString(row.id));
    }
  }

  return items.map((item) => {
    const variantId = defaultByProduct.get(item.productId);
    if (!variantId) {
      throw new CheckoutError("One or more products are unavailable.", 409);
    }
    return { variant_id: variantId, quantity: item.quantity };
  });
}

export async function quoteCheckout(inputValue: CheckoutRequest) {
  const input = normalizeRequest(inputValue);
  const { supabase, user } = await authenticatedContext();
  const userCartId = input.mode === "buy_now" ? null : await cartId(supabase, user.id);
  if (input.mode !== "buy_now" && !userCartId) {
    throw new CheckoutError("Your cart is empty.", 409);
  }
  const rpcItems =
    input.mode === "buy_now"
      ? await checkoutItems(supabase, input.items ?? [])
      : null;
  const { data, error } = await supabase.rpc("quote_checkout", {
    p_address_id: input.addressId,
    p_payment_method: databasePaymentMethod(input.paymentMethod),
    p_idempotency_key: input.idempotencyKey,
    p_cart_id: userCartId,
    p_items: rpcItems,
    p_coupon_code: input.couponCode ?? null,
  });
  if (error) throw new CheckoutError(rpcErrorMessage(error), 409, error);
  const row = Array.isArray(data) ? asRow(data[0]) : asRow(data);
  return quoteShape(row, input);
}

function quoteShape(row: Row, input: NormalizedCheckoutRequest) {
  return {
    checkoutSessionId:
      asString(row.checkout_session_id) ||
      asString(row.session_id) ||
      asString(row.id),
    subtotal: minorToMajor(row.items_subtotal_minor),
    discount: minorToMajor(row.discount_minor),
    delivery: minorToMajor(row.shipping_minor),
    tax: minorToMajor(row.tax_minor),
    paymentFee: minorToMajor(row.gateway_fee_minor),
    total: minorToMajor(row.total_minor),
    totalMinor: asNumber(row.total_minor),
    currency: asString(row.currency, "INR"),
    paymentMethod: input.paymentMethod,
    idempotencyKey: input.idempotencyKey,
  };
}

function normalizeOrderResult(data: unknown): Row {
  if (Array.isArray(data)) return asRow(data[0]);
  const row = asRow(data);
  return asRow(row.order ?? row);
}

export async function createOrderFromCheckout(inputValue: CheckoutRequest) {
  const input = normalizeRequest(inputValue);
  const { supabase, user } = await authenticatedContext();
  const service = createServiceClient();
  let validatedTransfer: ReturnType<
    typeof validatedPendingBankTransfer
  > | null = null;
  if (input.paymentMethod === "BANK_TRANSFER") {
    try {
      validatedTransfer = validatedPendingBankTransfer(
        user.id,
        input.bankTransfer,
        process.env.BANK_TRANSFER_PROOF_BUCKET?.trim() ||
        PAYMENT_PROOF_BUCKET,
      );
    } catch (error) {
      throw new CheckoutError(
        error instanceof Error ? error.message : "Bank transfer details are invalid.",
      );
    }
  }

  let quote: ReturnType<typeof quoteShape>;
  if (input.checkoutSessionId) {
    const { data: session, error: sessionError } = await supabase
      .from("checkout_sessions")
      .select(
        "id,user_id,address_id,payment_method,status,currency,items_subtotal_minor,discount_minor,shipping_minor,tax_minor,gateway_fee_minor,total_minor,idempotency_key,expires_at",
      )
      .eq("id", input.checkoutSessionId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (sessionError || !session) {
      throw new CheckoutError("Checkout quote was not found.", 404, sessionError);
    }
    let authoritativeMethod: CheckoutMethod;
    try {
      authoritativeMethod = authoritativeCheckoutMethod(session, {
        addressId: input.addressId,
        paymentMethod: input.paymentMethod,
        idempotencyKey: input.idempotencyKey,
      });
    } catch (error) {
      throw new CheckoutError(
        error instanceof Error ? error.message : "Checkout quote does not match.",
        409,
        error,
      );
    }
    quote = quoteShape(asRow(session), {
      ...input,
      addressId: session.address_id,
      paymentMethod: authoritativeMethod,
      idempotencyKey: session.idempotency_key,
    });
  } else {
    quote = await quoteCheckout(input);
  }
  if (!quote.checkoutSessionId) {
    throw new CheckoutError("Checkout quote did not create a session.", 500);
  }

  if (quote.paymentMethod === "BANK_TRANSFER") {
    if (!validatedTransfer) {
      throw new CheckoutError("Bank transfer details do not match the quote.");
    }
    const { data: existingOrder, error: existingOrderError } = await service
      .from("orders")
      .select("id")
      .eq("checkout_session_id", quote.checkoutSessionId)
      .maybeSingle();
    if (existingOrderError) {
      throw new CheckoutError(
        "Unable to validate the payment proof.",
        500,
        existingOrderError,
      );
    }
    const pendingFolder = `${user.id}/pending`;
    const { data: pendingFiles, error: pendingError } = await service.storage
      .from(validatedTransfer.bucket)
      .list(pendingFolder, {
        search: validatedTransfer.filename,
        limit: 10,
      });
    let proofExists = Boolean(
      pendingFiles?.some((file) => file.name === validatedTransfer?.filename),
    );
    if (pendingError) {
      throw new CheckoutError(
        "Unable to validate the payment proof.",
        400,
        pendingError,
      );
    }
    if (!proofExists && existingOrder?.id) {
      const { data: finalizedFiles, error: finalizedError } =
        await service.storage
          .from(validatedTransfer.bucket)
          .list(`${user.id}/${existingOrder.id}`, {
            search: validatedTransfer.filename,
            limit: 10,
          });
      if (finalizedError) {
        throw new CheckoutError(
          "Unable to validate the payment proof.",
          400,
          finalizedError,
        );
      }
      proofExists = Boolean(
        finalizedFiles?.some(
          (file) => file.name === validatedTransfer?.filename,
        ),
      );
    }
    if (!proofExists) {
      throw new CheckoutError(
        "Payment proof was not found. Upload it again before placing the order.",
        400,
      );
    }
  }

  const { data: created, error: createError } = await supabase.rpc(
    "create_order_from_checkout",
    { p_checkout_session_id: quote.checkoutSessionId },
  );
  if (createError) {
    throw new CheckoutError(rpcErrorMessage(createError), 409, createError);
  }
  const order = normalizeOrderResult(created);
  const orderId = asString(order.created_order_id);
  const paymentAttemptId = asString(order.created_payment_attempt_id);
  if (!orderId) throw new CheckoutError("Order creation returned no order id.", 500);
  if (!paymentAttemptId) {
    throw new CheckoutError("Order creation returned no payment attempt id.", 500);
  }
  const { data: existingAttempt, error: attemptError } = await service
    .from("payment_attempts")
    .select(
      "id,order_id,provider,provider_order_id,provider_payment_id,amount_minor,currency,status",
    )
    .eq("id", paymentAttemptId)
    .maybeSingle();
  if (attemptError || !existingAttempt) {
    throw new CheckoutError("Payment attempt was not found.", 500, attemptError);
  }

  if (quote.paymentMethod === "BANK_TRANSFER") {
    if (!validatedTransfer) {
      throw new CheckoutError("Bank transfer details do not match the quote.");
    }
    const { data: existingSubmission, error: submissionLookupError } =
      await service
        .from("bank_transfer_submissions")
        .select(
          "id,order_id,payment_attempt_id,reference_number,account_name,amount_minor,proof_bucket,proof_path,status,review_note,reviewed_by,reviewed_at,submitted_at,updated_at",
        )
        .eq("order_id", orderId)
        .maybeSingle();
    if (submissionLookupError) {
      throw new CheckoutError(
        "Unable to read bank transfer submission.",
        500,
        submissionLookupError,
      );
    }
    if (existingSubmission) {
      const expectedProofPath = `${user.id}/${orderId}/${validatedTransfer.filename}`;
      if (
        existingSubmission.reference_number !==
          validatedTransfer.referenceNumber ||
        existingSubmission.account_name !== validatedTransfer.accountName ||
        existingSubmission.proof_path !== expectedProofPath
      ) {
        throw new CheckoutError(
          "Bank transfer replay does not match the original submission.",
          409,
        );
      }
      return {
        order,
        quote,
        paymentAttempt: asRow(existingAttempt),
        submission: existingSubmission,
      };
    }

    const sourcePath = validatedTransfer.sourcePath;
    const filename = validatedTransfer.filename;
    const proofPath = `${user.id}/${orderId}/${filename}`;
    const bucket = validatedTransfer.bucket;
    const { error: moveError } = await service.storage
      .from(bucket)
      .move(sourcePath, proofPath);
    if (moveError) {
      const destinationFolder = `${user.id}/${orderId}`;
      const { data: destinationFiles, error: destinationError } =
        await service.storage
          .from(bucket)
          .list(destinationFolder, { search: filename, limit: 10 });
      const destinationExists = Boolean(
        destinationFiles?.some((file) => file.name === filename),
      );
      if (destinationError || !destinationExists) {
        throw new CheckoutError("Unable to finalize payment proof.", 400, moveError);
      }
    }
    const { data: submission, error } = await supabase.rpc("submit_bank_transfer", {
      p_order_id: orderId,
      p_reference_number: validatedTransfer.referenceNumber,
      p_account_name: validatedTransfer.accountName,
      p_proof_path: proofPath,
    });
    if (error) {
      if (!moveError) {
        await service.storage.from(bucket).move(proofPath, sourcePath);
      }
      throw new CheckoutError("Unable to submit bank transfer details.", 400, error);
    }
    return {
      order,
      quote,
      paymentAttempt: asRow(existingAttempt),
      submission,
    };
  }

  if (quote.paymentMethod === "COD") {
    return { order, quote, paymentAttempt: asRow(existingAttempt) };
  }

  if (existingAttempt.provider_order_id) {
    return {
      order,
      quote,
      paymentAttempt: asRow(existingAttempt),
      providerOrder: {
        provider: configuredPaymentProvider(),
        providerOrderId: existingAttempt.provider_order_id,
        amountPaise: existingAttempt.amount_minor,
        currency: existingAttempt.currency,
        raw: { reused: true },
      },
    };
  }

  const providerOrder = await createProviderOrder({
    orderId,
    receipt: asString(order.created_order_number) || orderId,
    amountMinor: quote.totalMinor,
    currency: quote.currency,
    userId: user.id,
  });
  if (
    providerOrder.amountPaise !== quote.totalMinor ||
    providerOrder.currency.toUpperCase() !== quote.currency.toUpperCase()
  ) {
    throw new CheckoutError(
      "Payment provider amount or currency does not match the order.",
      500,
    );
  }
  const { data: attempt, error: attachError } = await service.rpc(
    "attach_provider_order",
    {
      p_payment_attempt_id: paymentAttemptId,
      p_provider_order_id: providerOrder.providerOrderId,
    },
  );
  if (attachError) {
    const { data: racedAttempt } = await service
      .from("payment_attempts")
      .select(
        "id,order_id,provider,provider_order_id,provider_payment_id,amount_minor,currency,status",
      )
      .eq("id", paymentAttemptId)
      .maybeSingle();
    if (!racedAttempt?.provider_order_id) {
      throw new CheckoutError("Unable to initialize online payment.", 500, attachError);
    }
    return {
      order,
      quote,
      paymentAttempt: asRow(racedAttempt),
      providerOrder: {
        provider: configuredPaymentProvider(),
        providerOrderId: racedAttempt.provider_order_id,
        amountPaise: racedAttempt.amount_minor,
        currency: racedAttempt.currency,
        raw: { reused: true },
      },
    };
  }
  return {
    order,
    quote,
    paymentAttempt: asRow(attempt),
    providerOrder,
  };
}

export async function uploadBankTransferProof(file: File) {
  const { user } = await authenticatedContext();
  if (file.size <= 0 || file.size > PAYMENT_PROOF_MAX_BYTES) {
    throw new CheckoutError("Proof file must be between 1 byte and 10 MB.");
  }
  let extension: string;
  try {
    extension = validatedProofExtension(file.name, file.type);
  } catch (error) {
    throw new CheckoutError(
      error instanceof Error ? error.message : "Unsupported proof file type.",
    );
  }
  const objectPath = `${user.id}/pending/${randomUUID()}.${extension}`;
  const bucket =
    process.env.BANK_TRANSFER_PROOF_BUCKET?.trim() || PAYMENT_PROOF_BUCKET;
  const service = createServiceClient();
  const bytes = new Uint8Array(await file.arrayBuffer());
  try {
    validatePaymentProofBytes(bytes, file.type);
  } catch (error) {
    throw new CheckoutError(
      error instanceof Error
        ? error.message
        : "Payment proof contents are invalid.",
    );
  }
  const { error } = await service.storage.from(bucket).upload(objectPath, bytes, {
    contentType: file.type,
    upsert: false,
    cacheControl: "private, max-age=0",
  });
  if (error) throw new CheckoutError("Unable to upload payment proof.", 400, error);
  return { path: objectPath, bucket };
}

export async function deletePendingBankTransferProof(pathValue: string) {
  const { user } = await authenticatedContext();
  const path = pathValue.replace(/^\/+/, "");
  if (!path.startsWith(`${user.id}/pending/`)) {
    throw new CheckoutError("Payment proof path is invalid.");
  }
  const bucket =
    process.env.BANK_TRANSFER_PROOF_BUCKET?.trim() || PAYMENT_PROOF_BUCKET;
  const service = createServiceClient();
  const { error } = await service.storage.from(bucket).remove([path]);
  if (error) {
    throw new CheckoutError("Unable to remove payment proof.", 400, error);
  }
}
