import "server-only";

import type { SupabaseClient, User } from "@supabase/supabase-js";
import type { Database } from "@babas/database";
import { uuidSchema, type OrderStatus } from "@babas/domain";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { getAuthenticatedUser } from "@/lib/supabase/user";
import { loadCatalog } from "./catalog";
import { createInvoicePdf } from "./invoice-pdf";
import { profilePatch } from "./profile-contract";
import {
  asBoolean,
  asNumber,
  asOptionalString,
  asRow,
  asString,
  type Row,
} from "./shapes";

export class CustomerDataError extends Error {
  constructor(message: string, readonly status = 400, readonly cause?: unknown) {
    super(message);
    this.name = "CustomerDataError";
  }
}

type AddressType = "home" | "work" | "other";

async function context(): Promise<{
  supabase: SupabaseClient<Database>;
  user: User;
}> {
  const [supabase, user] = await Promise.all([createClient(), getAuthenticatedUser()]);
  return { supabase, user };
}

function addressShape(value: unknown) {
  const row = asRow(value);
  return {
    _id: asString(row.id),
    user: asString(row.user_id),
    name: asString(row.recipient_name) || asString(row.name),
    phone: asString(row.phone),
    alternatePhone: asOptionalString(row.alternate_phone),
    building: asString(row.building),
    line1: asString(row.line1) || asString(row.address_line1),
    line2: asOptionalString(row.line2) || asOptionalString(row.address_line2),
    landmark: asOptionalString(row.landmark),
    city: asString(row.city),
    state: asString(row.state),
    country: asString(row.country, "India"),
    postalCode: asString(row.postal_code) || asString(row.pincode),
    addressType: asString(row.address_type, "home"),
    category: asBoolean(row.is_default_billing) ? "Billing" : "Shipping",
    isDefault:
      asBoolean(row.is_default_shipping) || asBoolean(row.is_default_billing),
    status: asBoolean(row.is_active, true) ? "Active" : "Inactive",
    createdAt: asString(row.created_at),
  };
}

export async function getProfile() {
  const { supabase, user } = await context();
  const { data, error } = await supabase
    .from("profiles")
    .select(
      "full_name,phone,customer_type,gstin,registered_company_name,account_status,created_at",
    )
    .eq("id", user.id)
    .maybeSingle();

  if (error) throw new CustomerDataError("Unable to load profile.", 500, error);
  const row = asRow(data);
  return {
    _id: user.id,
    name:
      asString(row.full_name) ||
      asString(user.user_metadata?.full_name),
    email: user.email ?? "",
    phone: asString(row.phone),
    userType: asString(row.customer_type, "Consumer"),
    isGSTRegistered: Boolean(row.gstin),
    gstData: row.gstin
      ? {
          gstNumber: asString(row.gstin),
          registeredCompanyName: asString(row.registered_company_name),
        }
      : undefined,
    status: row.account_status === "active" ? "Active" : "Inactive",
    createdAt: asString(row.created_at) || user.created_at,
    code: user.id.slice(0, 8).toUpperCase(),
  };
}

export async function updateProfile(payload: Record<string, unknown>) {
  const { supabase } = await context();
  const patch = profilePatch(payload);
  const { error } = await supabase.rpc("update_my_profile", {
    p_patch: patch,
  });
  if (error) throw new CustomerDataError("Unable to update profile.", 400, error);

  const fullName =
    patch && typeof patch === "object" && !Array.isArray(patch)
      ? patch.full_name
      : null;
  if (typeof fullName === "string" && fullName) {
    const { error: authError } = await supabase.auth.updateUser({
      data: { full_name: fullName },
    });
    if (authError) throw new CustomerDataError(authError.message, 400, authError);
  }

  return getProfile();
}

export async function listAddresses() {
  const { supabase, user } = await context();
  const { data, error } = await supabase
    .from("addresses")
    .select("*")
    .eq("user_id", user.id)
    .order("is_default_shipping", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) throw new CustomerDataError("Unable to load addresses.", 500, error);
  return (data ?? []).map(addressShape);
}

function addressWrite(payload: Record<string, unknown>, userId: string) {
  const requestedType = asString(payload.addressType).toLowerCase();
  const addressType: AddressType = ["home", "work", "other"].includes(requestedType)
    ? (requestedType as AddressType)
    : "home";
  return {
    user_id: userId,
    recipient_name: asString(payload.name),
    phone: asString(payload.phone),
    alternate_phone: asOptionalString(payload.alternatePhone),
    building: asString(payload.building),
    line1: asString(payload.line1),
    line2: asOptionalString(payload.line2),
    landmark: asOptionalString(payload.landmark),
    city: asString(payload.city),
    state: asString(payload.state),
    country: asString(payload.country, "India"),
    postal_code: asString(payload.postalCode),
    address_type: addressType,
    is_default_shipping: false,
    is_default_billing: false,
    is_active: true,
    updated_at: new Date().toISOString(),
  };
}

export async function createAddress(payload: Record<string, unknown>) {
  const { supabase, user } = await context();
  const write = addressWrite(payload, user.id);
  if (!write.recipient_name || !write.phone || !write.line1 || !write.postal_code) {
    throw new CustomerDataError("Name, phone, address, and postal code are required.");
  }
  const { data, error } = await supabase.from("addresses").insert(write).select("*").single();
  if (error) throw new CustomerDataError("Unable to create address.", 400, error);
  if (asBoolean(payload.isDefault)) {
    const kind =
      asString(payload.category, "Shipping").toLowerCase() === "billing"
        ? "billing"
        : "shipping";
    const { data: defaultAddress, error: defaultError } = await supabase.rpc(
      "set_default_address",
      { p_address_id: asString(asRow(data).id), p_kind: kind },
    );
    if (defaultError) {
      throw new CustomerDataError("Unable to set default address.", 400, defaultError);
    }
    return addressShape(defaultAddress);
  }
  return addressShape(data);
}

export async function updateAddress(id: string, payload: Record<string, unknown>) {
  const { supabase, user } = await context();
  const { data, error } = await supabase
    .from("addresses")
    .update(addressWrite(payload, user.id))
    .eq("id", id)
    .eq("user_id", user.id)
    .select("*")
    .single();
  if (error) throw new CustomerDataError("Unable to update address.", 400, error);
  if (asBoolean(payload.isDefault)) {
    const kind =
      asString(payload.category, "Shipping").toLowerCase() === "billing"
        ? "billing"
        : "shipping";
    const { data: defaultAddress, error: defaultError } = await supabase.rpc(
      "set_default_address",
      { p_address_id: id, p_kind: kind },
    );
    if (defaultError) {
      throw new CustomerDataError("Unable to set default address.", 400, defaultError);
    }
    return addressShape(defaultAddress);
  }
  return addressShape(data);
}

export async function deleteAddress(id: string) {
  const { supabase, user } = await context();
  const { error } = await supabase
    .from("addresses")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) throw new CustomerDataError("Unable to delete address.", 400, error);
}

async function ensureContainer(
  supabase: SupabaseClient<Database>,
  table: "carts" | "wishlists",
  userId: string,
) {
  const { data: existing, error: selectError } = await supabase
    .from(table)
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (selectError) throw new CustomerDataError(`Unable to load ${table}.`, 500, selectError);
  if (existing) return asRow(existing);

  const { data, error } = await supabase
    .from(table)
    .insert({ user_id: userId })
    .select("*")
    .single();
  if (error) throw new CustomerDataError(`Unable to create ${table}.`, 400, error);
  return asRow(data);
}

export async function listCart() {
  const { supabase, user } = await context();
  const { data: cart, error: cartError } = await supabase
    .from("carts")
    .select("*")
    .eq("user_id", user.id)
    .eq("status", "active")
    .maybeSingle();
  if (cartError) throw new CustomerDataError("Unable to load cart.", 500, cartError);
  if (!cart) return [];
  const { data, error } = await supabase
    .from("cart_items")
    .select("*")
    .eq("cart_id", asString(asRow(cart).id))
    .order("created_at", { ascending: true });
  if (error) throw new CustomerDataError("Unable to load cart.", 500, error);
  const variantIds = (data ?? []).map((value) => asString(asRow(value).variant_id));
  const { data: variants, error: variantError } = variantIds.length
    ? await supabase
        .from("product_variants")
        .select("id,product_id")
        .in("id", variantIds)
    : { data: [], error: null };
  if (variantError) {
    throw new CustomerDataError("Unable to load cart products.", 500, variantError);
  }
  const productByVariant = new Map(
    (variants ?? []).map((value) => {
      const row = asRow(value);
      return [asString(row.id), asString(row.product_id)];
    }),
  );
  const catalog = await loadCatalog(supabase);
  const productMap = new Map(catalog.products.map((product) => [product._id, product]));

  return (data ?? []).map((value) => {
    const row = asRow(value);
    return {
      _id: asString(row.id),
      user: user.id,
      product: productMap.get(productByVariant.get(asString(row.variant_id)) ?? ""),
      quantity: asNumber(row.quantity, 1),
      status: "ACTIVE",
      createdAt: asString(row.created_at),
      updatedAt: asString(row.updated_at),
    };
  });
}

async function defaultVariantId(
  supabase: SupabaseClient<Database>,
  productId: string,
) {
  const { data, error } = await supabase
    .from("product_variants")
    .select("id")
    .eq("product_id", productId)
    .eq("is_active", true)
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error || !data) {
    throw new CustomerDataError("Product is unavailable.", 409, error);
  }
  return asString(asRow(data).id);
}

export async function changeCartProduct(productId: string, delta: number) {
  const { supabase } = await context();
  const variantId = await defaultVariantId(supabase, productId);
  const { data, error } = await supabase.rpc("upsert_cart_item", {
    p_variant_id: variantId,
    p_quantity: Math.max(1, Math.floor(delta)),
    p_replace: false,
  });
  if (error) throw new CustomerDataError("Unable to update cart.", 400, error);

  const items = await listCart();
  return items.find((item) => item._id === asString(asRow(data).id)) ?? items.at(-1);
}

export async function changeCartItem(itemId: string, delta: number) {
  const { supabase, user } = await context();
  const { data: existing, error: readError } = await supabase
    .from("cart_items")
    .select("*,carts!inner(user_id,status)")
    .eq("id", itemId)
    .eq("carts.user_id", user.id)
    .eq("carts.status", "active")
    .single();
  if (readError) throw new CustomerDataError("Cart item not found.", 404, readError);
  const quantity = Math.max(1, asNumber(asRow(existing).quantity, 1) + delta);
  const { error } = await supabase.rpc("upsert_cart_item", {
    p_variant_id: asString(asRow(existing).variant_id),
    p_quantity: quantity,
    p_replace: true,
  });
  if (error) throw new CustomerDataError("Unable to update cart.", 400, error);
  return (await listCart()).find((item) => item._id === itemId);
}

export async function deleteCartItem(id: string) {
  const { supabase } = await context();
  const { data, error } = await supabase.rpc("remove_cart_item", {
    p_cart_item_id: id,
  });
  if (error) throw new CustomerDataError("Unable to remove cart item.", 400, error);
  if (!data) throw new CustomerDataError("Cart item not found.", 404);
}

export async function listWishlist() {
  const { supabase, user } = await context();
  const wishlist = await ensureContainer(supabase, "wishlists", user.id);
  const { data, error } = await supabase
    .from("wishlist_items")
    .select("*")
    .eq("wishlist_id", asString(wishlist.id))
    .order("created_at", { ascending: false });
  if (error) throw new CustomerDataError("Unable to load wishlist.", 500, error);
  const catalog = await loadCatalog(supabase);
  const productMap = new Map(catalog.products.map((product) => [product._id, product]));
  return (data ?? []).map((value) => {
    const row = asRow(value);
    return {
      _id: asString(row.id),
      product: productMap.get(asString(row.product_id)) ?? asString(row.product_id),
      createdAt: asString(row.created_at),
    };
  });
}

export async function addWishlist(productId: string) {
  const { supabase, user } = await context();
  const wishlist = await ensureContainer(supabase, "wishlists", user.id);
  const { data, error } = await supabase
    .from("wishlist_items")
    .upsert(
      { wishlist_id: asString(wishlist.id), product_id: productId },
      { onConflict: "wishlist_id,product_id" },
    )
    .select("*")
    .single();
  if (error) throw new CustomerDataError("Unable to add wishlist item.", 400, error);
  return (await listWishlist()).find((item) => item._id === asString(asRow(data).id));
}

export async function deleteWishlistItem(id: string) {
  const { supabase, user } = await context();
  const wishlist = await ensureContainer(supabase, "wishlists", user.id);
  const { error } = await supabase
    .from("wishlist_items")
    .delete()
    .eq("id", id)
    .eq("wishlist_id", asString(wishlist.id));
  if (error) throw new CustomerDataError("Unable to remove wishlist item.", 400, error);
}

function orderShape(orderValue: unknown, itemValues: unknown[], paymentValue?: unknown) {
  const order = asRow(orderValue);
  const payment = asRow(paymentValue);
  const address = asRow(order.shipping_address);
  const money = (value: unknown) => asNumber(value) / 100;
  const items = itemValues.map((value) => {
    const item = asRow(value);
    const image = asRow(item.image_snapshot);
    const imagePath = asString(image.path);
    return {
      quantity: asNumber(item.quantity, 1),
      product: {
        _id: asString(item.product_id),
        name: asString(item.product_name) || asString(item.name),
        slug: asOptionalString(item.product_slug),
        images: imagePath
          ? [{
              key: imagePath,
              bucket: asString(image.bucket),
              name: asString(image.alt, asString(item.product_name)),
            }]
          : [],
        brand: { name: asString(item.brand_name) },
      },
      name: asString(item.product_name) || asString(item.name),
      price: money(item.unit_price_minor),
      salePrice: money(item.unit_price_minor),
      actualPrice: item.unit_compare_at_minor
        ? money(item.unit_compare_at_minor)
        : money(item.unit_price_minor),
      brandName: asString(item.brand_name),
    };
  });
  const subtotal = money(order.items_subtotal_minor);
  const delivery = money(order.shipping_minor);
  const tax = money(order.tax_minor);
  const platform = money(order.gateway_fee_minor);
  const total = money(order.total_minor);

  return {
    _id: asString(order.id),
    code: asString(order.order_number) || asString(order.code),
    invoiceCode: asOptionalString(order.invoice_number),
    user: {
      id: asString(order.customer_id),
      email: asString(order.customer_email),
      name: asString(order.customer_name),
    },
    payment: {
      paymentGateway: asString(payment.provider).toUpperCase(),
      paymentMode: asString(order.payment_method).toUpperCase(),
      status: asString(payment.status) || asString(order.payment_status),
      amount: payment.amount_minor ? money(payment.amount_minor) : total,
      razorpayGatewayDetails: {
        orderId: asOptionalString(payment.provider_order_id),
        paymentLink: asOptionalString(payment.payment_link),
        type: asString(payment.provider_order_id) ? "PAYMENT_ORDER" : "PAYMENT_LINK",
      },
    },
    orderStatus: asString(order.status, "PLACED").toUpperCase(),
    orderPaymentStatus: (
      asString(payment.status) ||
      asString(order.payment_status) ||
      "PENDING"
    ).toUpperCase(),
    placedAt: asString(order.placed_at) || asString(order.created_at),
    createdAt: asString(order.created_at),
    items,
    deliveryCharges: delivery,
    summary: {
      itemsTotal: subtotal,
      discount: money(order.discount_minor),
      delivery,
      gst: tax,
      platformCharges: platform,
      total,
      totalCapturedAmount: money(order.paid_minor),
    },
    shippingAddress: addressShape({
      ...address,
      id: asString(address.id) || `${asString(order.id)}-address`,
      user_id: asString(order.customer_id),
    }),
    deliveryDetails: {
      trackingId: asOptionalString(order.tracking_number),
      partnerName: asOptionalString(order.shipping_partner),
      url: asOptionalString(order.tracking_url),
    },
  };
}

export async function listOrders(filters: {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  from?: string;
  to?: string;
} = {}) {
  const { supabase, user } = await context();
  let query = supabase
    .from("orders")
    .select("*", { count: "exact" })
    .eq("customer_id", user.id)
    .order("created_at", { ascending: false });
  if (filters.status) {
    query = query.eq("status", filters.status.toLowerCase() as OrderStatus);
  }
  if (filters.from) query = query.gte("created_at", filters.from);
  if (filters.to) query = query.lte("created_at", filters.to);
  if (filters.search) query = query.ilike("order_number", `%${filters.search}%`);
  const page = Math.max(1, filters.page ?? 1);
  const limit = Math.max(1, filters.limit ?? 10);
  query = query.range((page - 1) * limit, page * limit - 1);
  const { data, error, count } = await query;
  if (error) throw new CustomerDataError("Unable to load orders.", 500, error);
  const orderRows = (data ?? []) as Row[];
  const ids = orderRows.map((row) => asString(row.id));
  if (!ids.length) {
    return { results: [], currentPage: page, totalCount: 0, totalPages: 1 };
  }
  const [{ data: items, error: itemError }, { data: payments, error: paymentError }] =
    await Promise.all([
      supabase.from("order_items").select("*").in("order_id", ids),
      supabase
        .from("customer_payment_summaries")
        .select("*")
        .in("order_id", ids)
        .order("created_at", { ascending: false }),
    ]);
  if (itemError || paymentError) {
    throw new CustomerDataError("Unable to load order details.", 500, itemError || paymentError);
  }
  const itemRows = (items ?? []) as Row[];
  const paymentRows = (payments ?? []) as Row[];
  const results = orderRows.map((order) =>
    orderShape(
      order,
      itemRows.filter((item) => asString(item.order_id) === asString(order.id)),
      paymentRows.find((payment) => asString(payment.order_id) === asString(order.id)),
    ),
  );
  const totalCount = count ?? results.length;
  return {
    results,
    currentPage: page,
    totalCount,
    totalPages: Math.max(1, Math.ceil(totalCount / limit)),
  };
}

export async function getOrder(id: string) {
  const { supabase, user } = await context();
  const { data: order, error } = await supabase
    .from("orders")
    .select("*")
    .eq("id", id)
    .eq("customer_id", user.id)
    .single();
  if (error) throw new CustomerDataError("Order not found.", 404, error);
  const [{ data: items, error: itemError }, { data: payment, error: paymentError }] =
    await Promise.all([
      supabase.from("order_items").select("*").eq("order_id", id),
      supabase
        .from("customer_payment_summaries")
        .select("*")
        .eq("order_id", id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);
  if (itemError || paymentError) {
    throw new CustomerDataError("Unable to load order.", 500, itemError || paymentError);
  }
  return orderShape(order, items ?? [], payment);
}

export async function requestOrderTransition(
  orderId: string,
  transition: "CANCELLED" | "RETURN_REQUESTED",
  reason?: string,
  idempotencyKey?: string,
) {
  const { supabase, user } = await context();
  const { data: order, error: ownershipError } = await supabase
    .from("orders")
    .select("id,customer_id,status")
    .eq("id", orderId)
    .eq("customer_id", user.id)
    .single();
  if (ownershipError || !order) {
    throw new CustomerDataError("Order not found.", 404, ownershipError);
  }

  let error: unknown;
  if (transition === "CANCELLED") {
    const result = await supabase.rpc("cancel_order", {
      p_order_id: orderId,
      p_reason: reason?.trim() || "Cancelled by customer",
    });
    error = result.error;
  } else {
    const parsedIdempotencyKey = uuidSchema.safeParse(idempotencyKey?.trim());
    if (!parsedIdempotencyKey.success) {
      throw new CustomerDataError(
        "A valid return request identity is required.",
        400,
      );
    }
    const { data: orderItems, error: itemsError } = await supabase
      .from("order_items")
      .select("id,quantity")
      .eq("order_id", orderId);
    if (itemsError || !orderItems?.length) {
      throw new CustomerDataError("This order has no returnable items.", 409, itemsError);
    }
    const result = await supabase.rpc("request_return", {
      p_order_id: orderId,
      p_reason: reason?.trim() || "Customer requested a return",
      p_items: orderItems.map((item) => ({
        order_item_id: asString(asRow(item).id),
        quantity: asNumber(asRow(item).quantity, 1),
      })),
      p_idempotency_key: parsedIdempotencyKey.data,
    });
    error = result.error;
  }
  if (error) {
    throw new CustomerDataError(
      transition === "CANCELLED"
        ? "This order cannot be cancelled."
        : "This order is not eligible for return.",
      409,
      error,
    );
  }
  return getOrder(orderId);
}

export async function downloadInvoice(orderId: string) {
  const { supabase, user } = await context();
  const { data: order, error: orderError } = await supabase
    .from("orders")
    .select(
      "id,order_number,status,currency,customer_name,customer_email,customer_phone,shipping_address,items_subtotal_minor,discount_minor,shipping_minor,tax_minor,gateway_fee_minor,total_minor,created_at",
    )
    .eq("id", orderId)
    .eq("customer_id", user.id)
    .maybeSingle();
  if (orderError || !order) {
    throw new CustomerDataError("Order not found.", 404, orderError);
  }
  if (
    ["pending_payment", "payment_review", "cancelled", "failed"].includes(
      order.status,
    )
  ) {
    throw new CustomerDataError(
      "The invoice will be available after the order is confirmed.",
      409,
    );
  }

  const service = createServiceClient();
  const invoiceResult = await service
    .from("invoices")
    .select("id,invoice_number,bucket,object_path,issued_at")
    .eq("order_id", orderId)
    .maybeSingle();
  if (invoiceResult.error) {
    throw new CustomerDataError(
      "Unable to load the invoice.",
      500,
      invoiceResult.error,
    );
  }
  let invoice = invoiceResult.data;

  if (invoice?.object_path) {
    const { data: file, error: downloadError } = await service.storage
      .from(invoice.bucket || "invoices")
      .download(invoice.object_path);
    if (!downloadError && file) {
      return {
        bytes: await file.arrayBuffer(),
        filename: `${invoice.invoice_number}.pdf`,
      };
    }
  }

  if (!invoice) {
    const created = await service
      .from("invoices")
      .upsert(
        { order_id: orderId },
        { onConflict: "order_id", ignoreDuplicates: true },
      )
      .select("id,invoice_number,bucket,object_path,issued_at")
      .maybeSingle();
    if (created.error) {
      throw new CustomerDataError(
        "Unable to create the invoice.",
        500,
        created.error,
      );
    }
    invoice = created.data;
    if (!invoice) {
      const existing = await service
        .from("invoices")
        .select("id,invoice_number,bucket,object_path,issued_at")
        .eq("order_id", orderId)
        .single();
      if (existing.error || !existing.data) {
        throw new CustomerDataError(
          "Unable to create the invoice.",
          500,
          existing.error,
        );
      }
      invoice = existing.data;
    }
  }

  const { data: items, error: itemsError } = await supabase
    .from("order_items")
    .select(
      "product_name,sku,quantity,unit_price_minor,line_discount_minor,line_tax_minor,line_total_minor",
    )
    .eq("order_id", orderId)
    .order("created_at");
  if (itemsError || !items?.length) {
    throw new CustomerDataError(
      "Invoice line items are unavailable.",
      500,
      itemsError,
    );
  }

  const issuedAt = invoice.issued_at || new Date().toISOString();
  const bytes = await createInvoicePdf({
    invoiceNumber: invoice.invoice_number,
    orderNumber: order.order_number,
    issuedAt,
    currency: order.currency,
    customerName: order.customer_name,
    customerEmail: order.customer_email ?? "",
    customerPhone: order.customer_phone,
    shippingAddress: asRow(order.shipping_address),
    itemsSubtotalMinor: asNumber(order.items_subtotal_minor),
    discountMinor: asNumber(order.discount_minor),
    shippingMinor: asNumber(order.shipping_minor),
    taxMinor: asNumber(order.tax_minor),
    gatewayFeeMinor: asNumber(order.gateway_fee_minor),
    totalMinor: asNumber(order.total_minor),
    lines: items.map((item) => ({
      productName: item.product_name,
      sku: item.sku,
      quantity: item.quantity,
      unitPriceMinor: asNumber(item.unit_price_minor),
      discountMinor: asNumber(item.line_discount_minor),
      taxMinor: asNumber(item.line_tax_minor),
      totalMinor: asNumber(item.line_total_minor),
    })),
  });
  const bucket = invoice.bucket || "invoices";
  const objectPath = `${user.id}/${orderId}/${invoice.invoice_number}.pdf`;
  const { error: uploadError } = await service.storage
    .from(bucket)
    .upload(objectPath, bytes, {
      contentType: "application/pdf",
      cacheControl: "private, max-age=0",
      upsert: true,
    });
  if (uploadError) {
    throw new CustomerDataError(
      "Unable to store the invoice.",
      500,
      uploadError,
    );
  }
  const { error: updateError } = await service
    .from("invoices")
    .update({ object_path: objectPath, issued_at: issuedAt })
    .eq("id", invoice.id);
  if (updateError) {
    throw new CustomerDataError(
      "Unable to finalize the invoice.",
      500,
      updateError,
    );
  }

  const invoiceBuffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(invoiceBuffer).set(bytes);
  return {
    bytes: invoiceBuffer,
    filename: `${invoice.invoice_number}.pdf`,
  };
}

export async function createContactMessage(payload: Record<string, unknown>) {
  const supabase = await createClient();
  const write = {
    name: asString(payload.name),
    email: asString(payload.email),
    phone: asOptionalString(payload.phone),
    subject: asString(payload.subject, "Storefront enquiry"),
    message: asString(payload.message),
  };
  if (!write.name || !write.email || !write.message) {
    throw new CustomerDataError("Name, email, and message are required.");
  }
  const { error } = await supabase.from("contact_messages").insert(write);
  if (error) throw new CustomerDataError("Unable to send message.", 400, error);
}
