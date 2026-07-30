import { NextResponse } from "next/server";
import {
  getBanner,
  getBrand,
  getCategory,
  getStoreSettings,
  listBanners,
  listBrands,
  listCategories,
  listCollections,
  listProducts,
} from "@/lib/server/catalog";
import {
  addWishlist,
  changeCartItem,
  changeCartProduct,
  createAddress,
  createContactMessage,
  deleteAddress,
  deleteCartItem,
  deleteWishlistItem,
  downloadInvoice,
  getOrder,
  getProfile,
  listAddresses,
  listCart,
  listOrders,
  listWishlist,
  requestOrderTransition,
  updateAddress,
  updateProfile,
} from "@/lib/server/customer";
import {
  createOrderFromCheckout,
  uploadBankTransferProof,
  type CheckoutMethod,
  type CheckoutRequest,
} from "@/lib/server/checkout";
import { apiErrorResponse } from "@/lib/server/route-response";
import { asNumber, asRow, asString } from "@/lib/server/shapes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ segments: string[] }>;
};

function ok(
  message: string,
  value?: unknown,
  plural = false,
  extra: Record<string, unknown> = {},
) {
  return NextResponse.json({
    success: true,
    message,
    ...(plural ? { results: value ?? [] } : value === undefined ? {} : { result: value }),
    ...extra,
  });
}

function notFound(message = "Resource not found.") {
  return NextResponse.json({ success: false, message }, { status: 404 });
}

function integer(value: string | null, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.trunc(parsed) : fallback;
}

function checkoutInput(payloadValue: unknown, buyNow: boolean): CheckoutRequest {
  const payload = asRow(payloadValue);
  const rawProducts = Array.isArray(payload.products) ? payload.products : [];
  const method = asString(payload.method, "RAZORPAY").toUpperCase() as CheckoutMethod;
  const bank = asRow(payload.bankTransferDetails);
  return {
    mode: buyNow ? "buy_now" : "cart",
    addressId: asString(payload.shippingAddress),
    paymentMethod: method,
    items: rawProducts.map((value) => {
      const row = asRow(value);
      return {
        productId: asString(row.product) || asString(row.productId),
        quantity: Math.max(1, asNumber(row.quantity, 1)),
      };
    }),
    couponCode: asString(payload.couponCode) || undefined,
    idempotencyKey:
      asString(payload.idempotencyKey) ||
      asString(payload.idempotency_key) ||
      undefined,
    checkoutSessionId:
      asString(payload.checkoutSessionId) ||
      asString(payload.checkout_session_id) ||
      undefined,
    bankTransfer:
      method === "BANK_TRANSFER"
        ? {
            referenceNumber: asString(bank.referenceNumber),
            accountName: asString(bank.accountName),
            proofPath: asString(bank.proofFile) || asString(bank.proofPath),
          }
        : undefined,
  };
}

function legacyOrderResult(value: Awaited<ReturnType<typeof createOrderFromCheckout>>) {
  const rawOrder = asRow(value.order);
  const attempt = asRow(value.paymentAttempt);
  const providerOrder = asRow(value.providerOrder);
  const orderId = asString(rawOrder.created_order_id);
  const provider = (
    asString(providerOrder.provider) || asString(attempt.provider)
  ).toUpperCase();
  return {
    order: {
      ...rawOrder,
      _id: orderId,
      code: asString(rawOrder.created_order_number),
      totalOrderPrice: value.quote.total,
    },
    transaction: {
      _id: asString(attempt.id),
      order: orderId,
      user: "",
      paymentType: "ORDER",
      paymentMode: value.quote.paymentMethod === "COD" ? "COD" : "PRE-PAID",
      paymentTiming: value.quote.paymentMethod === "COD" ? "ON_DELIVERY" : "IMMEDIATE",
      paymentGateway: provider,
      amount: value.quote.total,
      dueAmount: value.quote.total,
      capturedAmount: 0,
      refundAmount: 0,
      status: asString(attempt.status, "INITIATED"),
      code: asString(attempt.code),
      razorpayGatewayDetails: {
        orderId:
          asString(providerOrder.providerOrderId) ||
          asString(attempt.provider_order_id),
        type: "PAYMENT_ORDER",
      },
      mock: provider === "MOCK",
    },
  };
}

export async function GET(request: Request, context: RouteContext) {
  try {
    const { segments } = await context.params;
    const path = segments.map(decodeURIComponent);
    const url = new URL(request.url);

    if (path[0] === "product") {
      if (path[1]) {
        const result = await listProducts({ id: path[1], limit: 1 });
        return result.results[0] ? ok("Product loaded.", result.results[0]) : notFound("Product not found.");
      }
      const result = await listProducts({
        categoryId: url.searchParams.get("category") || undefined,
        brandId: url.searchParams.get("brand") || undefined,
        search: url.searchParams.get("search") || undefined,
        sort: url.searchParams.get("sort") || undefined,
        page: integer(url.searchParams.get("page"), 1),
        limit: integer(url.searchParams.get("limit"), 20),
      });
      return ok("Products loaded.", result.results, true, {
        currentPage: result.page,
        totalPages: result.totalPages,
        totalCount: result.totalCount,
      });
    }

    if (path[0] === "category") {
      if (path[1]) {
        const category = await getCategory(path[1]);
        return category ? ok("Category loaded.", category) : notFound("Category not found.");
      }
      const categories = await listCategories(url.searchParams.get("brand") || undefined);
      return ok("Categories loaded.", categories, true, {
        currentPage: 1,
        totalPages: 1,
        totalCount: categories.length,
      });
    }

    if (path[0] === "brand") {
      if (path[1] && path[1] !== "active") {
        const brand = await getBrand(path[1]);
        return brand ? ok("Brand loaded.", brand) : notFound("Brand not found.");
      }
      const brands = await listBrands();
      return ok("Brands loaded.", brands, true, {
        totalCount: brands.length,
      });
    }

    if (path[0] === "banner") {
      if (path[1]) {
        const banner = await getBanner(path[1]);
        return banner ? ok("Banner loaded.", banner) : notFound("Banner not found.");
      }
      const banners = await listBanners(url.searchParams.get("type") || undefined);
      return ok("Banners loaded.", banners, true, {
        totalCount: banners.length,
      });
    }

    if (path[0] === "collection") {
      const collections = await listCollections();
      return ok("Collections loaded.", collections, true, {
        totalCount: collections.length,
      });
    }

    if (path[0] === "settings" && path[1] === "specific") {
      const data = await getStoreSettings(url.searchParams.get("scope") || undefined);
      return ok("Settings loaded.", { data });
    }

    if (path[0] === "user" && path[1] === "profile") {
      return ok("Profile loaded.", await getProfile());
    }

    if (path[0] === "addressbook" && path[1] === "user") {
      const addresses = await listAddresses();
      return ok("Addresses loaded.", addresses, true, {
        currentPage: 1,
        totalPages: 1,
        totalCount: addresses.length,
        latestCount: addresses.length,
      });
    }

    if (path[0] === "cart") {
      return ok("Cart loaded.", await listCart(), true);
    }

    if (path[0] === "wishlist") {
      return ok("Wishlist loaded.", await listWishlist(), true);
    }

    if (path[0] === "notification") {
      return ok("Notifications loaded.", [], true, { totalCount: 0 });
    }

    if (path[0] === "order" && path[1] === "user") {
      const orders = await listOrders({
        page: integer(url.searchParams.get("page"), 1),
        limit: integer(url.searchParams.get("limit"), 10),
        search: url.searchParams.get("search") || undefined,
        status: url.searchParams.get("status") || undefined,
        from: url.searchParams.get("from") || undefined,
        to: url.searchParams.get("to") || undefined,
      });
      return ok("Orders loaded.", orders.results, true, {
        currentPage: orders.currentPage,
        totalPages: orders.totalPages,
        totalCount: orders.totalCount,
      });
    }

    if (path[0] === "order" && path[1]) {
      return ok("Order loaded.", await getOrder(path[1]));
    }

    return notFound();
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const { segments } = await context.params;
    const path = segments.map(decodeURIComponent);

    if (path[0] === "file") {
      const form = await request.formData();
      const value = form.get("file");
      if (!(value instanceof File)) {
        return NextResponse.json(
          { success: false, message: "A proof file is required." },
          { status: 400 },
        );
      }
      const result = await uploadBankTransferProof(value);
      return ok("Proof uploaded.", { _id: result.path, ...result });
    }

    const body = asRow(await request.json());

    if (path[0] === "contact") {
      await createContactMessage(body);
      return ok("Message sent.", { id: null });
    }

    if (path[0] === "addressbook" && path[1] === "user") {
      return ok("Address created.", await createAddress(body));
    }

    if (path[0] === "cart" && path[1] === "product" && path[2]) {
      return ok("Added to cart.", await changeCartProduct(path[2], 1));
    }

    if (path[0] === "wishlist" && path[1]) {
      return ok("Added to wishlist.", await addWishlist(path[1]));
    }

    if (path[0] === "notification" && path[1] === "add" && path[2]) {
      return ok("Notification registered.", { product: path[2] });
    }

    if (path[0] === "order" && (path[1] === "user" || path[1] === "buy-now")) {
      const result = await createOrderFromCheckout(
        checkoutInput(body, path[1] === "buy-now"),
      );
      return ok("Order created.", legacyOrderResult(result));
    }

    if (path[0] === "order" && path[1] && path[2] === "cancel") {
      return ok(
        "Cancellation requested.",
        await requestOrderTransition(path[1], "CANCELLED", asString(body.reason)),
      );
    }

    if (path[0] === "order" && path[1] && path[2] === "return") {
      return ok(
        "Return requested.",
        await requestOrderTransition(
          path[1],
          "RETURN_REQUESTED",
          asString(body.reason),
          asString(body.idempotencyKey) || asString(body.idempotency_key),
        ),
      );
    }

    return notFound();
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { segments } = await context.params;
    const path = segments.map(decodeURIComponent);
    const body =
      request.headers.get("content-length") === "0"
        ? {}
        : asRow(await request.json().catch(() => ({})));

    if (path[0] === "order" && path[1] === "generate-invoice" && path[2]) {
      const invoice = await downloadInvoice(path[2]);
      return new NextResponse(invoice.bytes, {
        status: 200,
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="${invoice.filename.replace(/["\r\n]/g, "")}"`,
          "Cache-Control": "private, no-store",
        },
      });
    }

    if (path[0] === "user" && path[1] === "profile") {
      return ok("Profile updated.", await updateProfile(body));
    }

    if (path[0] === "addressbook" && path[1]) {
      return ok("Address updated.", await updateAddress(path[1], body));
    }

    if (path[0] === "cart" && path[1] === "increment" && path[2]) {
      return ok("Cart updated.", await changeCartItem(path[2], 1));
    }

    if (path[0] === "cart" && path[1] === "decrement" && path[2]) {
      return ok("Cart updated.", await changeCartItem(path[2], -1));
    }

    if (path[0] === "cart" && path[1] === "checkout" && path[2] === "user") {
      return NextResponse.json({
        success: true,
        message: "Cart is ready for server-authoritative checkout.",
      });
    }

    return notFound();
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const { segments } = await context.params;
    const path = segments.map(decodeURIComponent);

    if (path[0] === "cart" && path[1]) {
      await deleteCartItem(path[1]);
      return ok("Cart item removed.");
    }

    if (path[0] === "wishlist" && path[1] === "user" && path[2]) {
      await deleteWishlistItem(path[2]);
      return ok("Wishlist item removed.");
    }

    if (path[0] === "addressbook" && path[1] === "user" && path[2]) {
      await deleteAddress(path[2]);
      return ok("Address deleted.");
    }

    if (path[0] === "notification" && path[1]) {
      return ok("Notification removed.");
    }

    return notFound();
  } catch (error) {
    return apiErrorResponse(error);
  }
}
