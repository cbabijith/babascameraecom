import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { and, asc, eq, getDatabase, homeBanners } from "@babascamera/db";
import { withTtlCache } from "@/lib/data/ttl-cache";
import {
  getCatalogProduct,
  listBestSellingProducts,
  listBrands,
  listCatalogProductsPage,
  listCategories,
  listRelatedProducts,
} from "@/features/catalog";
import { getSpecificDeliverySettings } from "@/lib/data/settings";
import {
  legacyImage as image,
  legacyProductCard as product,
  legacyProductDetail,
} from "@/features/catalog/services/legacy-product-payload";
import {
  AuthDataError,
  forgotPassword,
  getUserProfile,
  googleAuth,
  loginUser,
  logoutUser,
  registerUser,
  resetPassword,
  updateUserProfile,
} from "@/features/auth";
import {
  addCartProduct,
  CartDataError,
  checkoutCartUser,
  decrementCartItem,
  fetchCartItems,
  incrementCartItem,
  removeCartItem,
} from "@/features/cart";
import {
  AddressDataError,
  addUserAddress,
  deleteUserAddress,
  getUserAddresses,
  updateUserAddress,
} from "@/features/address";
import {
  cancelUserOrder,
  attachBankTransferToOrder,
  createOrderFromCheckout,
  fetchOrderById,
  fetchUserOrders,
  OrderDataError,
  payPendingOrder,
  uploadProofFile,
} from "@/features/order";
import {
  addToWishlist,
  fetchWishlist,
  removeFromWishlist,
  WishlistDataError,
} from "@/features/wishlist";







function success(payload: Record<string, unknown>, cacheSeconds?: number) {
  const response = NextResponse.json({ success: true, message: "OK", ...payload });
  // Public catalog reads repeat on every visit; let browsers and CDNs reuse
  // them briefly. User-scoped responses must never pass a cacheSeconds.
  if (cacheSeconds) {
    response.headers.set(
      "Cache-Control",
      `public, max-age=0, s-maxage=${cacheSeconds}, stale-while-revalidate=${cacheSeconds * 2}`,
    );
  }
  return response;
}

/** Cache window shared by the public catalog GETs below. */
const CATALOG_CACHE_SECONDS = 60;

function apiErrorResponse(error: unknown) {
  if (
    error instanceof AuthDataError ||
    error instanceof CartDataError ||
    error instanceof AddressDataError ||
    error instanceof OrderDataError ||
    error instanceof WishlistDataError
  ) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: error.status },
    );
  }




  const message =
    error instanceof Error && error.message
      ? error.message
      : "Unexpected server error.";
  return NextResponse.json({ success: false, message }, { status: 500 });
}


function legacySort(value: string | null) {
  switch (value) {
    case "name_asc": return "newest" as const;
    case "price_asc": return "price-asc" as const;
    case "price_desc": return "price-desc" as const;
    case "popular": return "featured" as const;
    default: return "newest" as const;
  }
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  const { path } = await context.params;
  const [resource, identifier] = path;
  const query = request.nextUrl.searchParams;

  if (resource === "health") return success({ result: { status: "ok" } });

  if (resource === "category") {
    const categories = await listCategories();
    if (identifier) {
      const found = categories.find((item) => item.id === identifier || item.slug === identifier);
      if (!found) return NextResponse.json({ success: false, message: "Category not found" }, { status: 404 });
      return success({
        result: {
          _id: found.id, name: found.name, image: image(found.imageUrl, found.name),
          status: "Active", visibility: "Show", position: 0, createdAt: new Date().toISOString(), code: found.slug,
        }
      }, CATALOG_CACHE_SECONDS);
    }
    return success({
      results: categories.map((item, position) => ({
        _id: item.id, name: item.name, image: image(item.imageUrl, item.name),
        status: "Active", visibility: "Show", position, createdAt: new Date().toISOString(), code: item.slug,
      })), totalCount: categories.length, currentPage: 1, totalPages: 1, latestCount: categories.length
    }, CATALOG_CACHE_SECONDS);
  }

  if (resource === "brand") {
    const brands = await listBrands();
    if (identifier && identifier !== "active") {
      const found = brands.find((item) => item.id === identifier || item.slug === identifier);
      if (!found) return NextResponse.json({ success: false, message: "Brand not found" }, { status: 404 });
      return success({ result: { _id: found.id, name: found.name, image: image(found.logoUrl, found.name), code: found.slug, status: "Active", visibility: "Show" } }, CATALOG_CACHE_SECONDS);
    }
    return success({ results: brands.map((item) => ({ _id: item.id, name: item.name, image: image(item.logoUrl, item.name), code: item.slug, status: "Active", visibility: "Show" })), totalCount: brands.length, currentPage: 1, totalPages: 1, latestCount: brands.length }, CATALOG_CACHE_SECONDS);
  }

  if (resource === "product") {
    if (identifier) {
      const found = await getCatalogProduct(identifier);
      if (!found) return NextResponse.json({ success: false, message: "Product not found" }, { status: 404 });
      const [relatedProducts] = await Promise.all([
        listRelatedProducts({ id: found.id, categorySlug: found.categorySlug }),
      ]);
      return success({ result: legacyProductDetail(found, relatedProducts) }, CATALOG_CACHE_SECONDS);
    }
    const categoryValue = query.get("category");
    const brandValue = query.get("brand");
    const search = query.get("search");

    let categorySlug: string | undefined;
    let brandSlug: string | undefined;

    if (categoryValue) {
      const categories = await listCategories();
      categorySlug = categories.find((item) => item.id === categoryValue || item.slug === categoryValue)?.slug;
    }

    if (brandValue) {
      const brands = await listBrands();
      brandSlug = brands.find((item) => item.id === brandValue || item.slug === brandValue)?.slug;
    }
    const page = Math.max(Number(query.get("page")) || 1, 1);
    const limit = Math.min(Math.max(Number(query.get("limit")) || 20, 1), 60);
    const result = await listCatalogProductsPage({
      ...(search ? { query: search } : {}),
      ...(categorySlug ? { categorySlug } : {}),
      ...(brandSlug ? { brandSlug } : {}),
      sort: legacySort(query.get("sort")),
      limit,
      offset: (page - 1) * limit,
    });
    return success({ results: result.products.map(product), totalCount: result.total, currentPage: page, totalPages: Math.max(Math.ceil(result.total / limit), 1), latestCount: result.products.length }, CATALOG_CACHE_SECONDS);
  }

  if (resource === "banner") {
    const rows = await withTtlCache("storefront:active-banners", () =>
      getDatabase()
        .select()
        .from(homeBanners)
        .where(eq(homeBanners.isActive, true))
        .orderBy(asc(homeBanners.position)),
    );

    const requestedType = query.get("type");

    let banners = rows.map((item, index) => {
      let bannerType = "Hero";
      if (index === 0) bannerType = "Featured_Product_Primary";
      else if (index === 1) bannerType = "Featured_Product_Secondary";

      return {
        _id: item.id,
        heading: item.headline ?? "",
        subHeading: item.subheading ?? "",
        tagline: "",
        ctaName: item.buttonLabel ?? "Shop now",
        ctaHref: item.destinationUrl?.trim() ? item.destinationUrl : undefined,
        type: requestedType || bannerType,
        collections: [],
        status: "Active",
        visibility: "Show",
        position: item.position,
        mediaFile: image(item.desktopMediaUrl, item.altText ?? "Banner"),
        createdAt: item.createdAt.toISOString(),
        code: item.id,
      };
    });

    if (requestedType === "Featured_Product_Primary") {
      banners = banners.slice(0, 1);
    } else if (requestedType === "Featured_Product_Secondary") {
      banners = banners.length > 1 ? banners.slice(1, 2) : banners.slice(0, 1);
    }

    if (identifier) {
      const found = banners.find((item) => item._id === identifier);
      if (!found) return NextResponse.json({ success: false, message: "Banner not found" }, { status: 404 });
      return success({ result: found }, CATALOG_CACHE_SECONDS);
    }
    return success({ results: banners, totalCount: banners.length, currentPage: 1, totalPages: 1, latestCount: banners.length }, CATALOG_CACHE_SECONDS);
  }


  if (resource === "collection") {
    const products = await listBestSellingProducts(8);
    const items = products.map(product);
    return success({ results: items.length ? [{ _id: "featured", name: "Featured gear", value: 0, products: items, status: "Active", position: 0, createdAt: new Date().toISOString() }] : [], currentPage: 1, totalCount: items.length ? 1 : 0, totalPages: 1, latestCount: items.length ? 1 : 0 }, CATALOG_CACHE_SECONDS);
  }

  if (resource === "user" && identifier === "profile") {
    try {
      const profile = await getUserProfile();
      return success({ result: profile });
    } catch (error) {
      return apiErrorResponse(error);
    }
  }

  if (resource === "cart") {
    try {
      const results = await fetchCartItems();
      return success({ results });
    } catch (error) {
      return apiErrorResponse(error);
    }
  }

  if (resource === "addressbook" && identifier === "user") {
    try {
      const results = await getUserAddresses();
      return success({
        results,
        currentPage: 1,
        latestCount: results.length,
        totalCount: results.length,
        totalPages: 1,
      });
    } catch (error) {
      return apiErrorResponse(error);
    }
  }

  if (resource === "order") {
    try {
      if (identifier === "user") {
        const status = query.get("status") ?? undefined;
        const from = query.get("from") ?? undefined;
        const to = query.get("to") ?? undefined;
        const search = query.get("search") ?? undefined;

        const results = await fetchUserOrders({ status, from, to, search });
        return success({
          results,
          currentPage: 1,
          latestCount: results.length,
          totalCount: results.length,
          totalPages: 1,
        });
      }
      if (identifier) {
        // Ownership check: order details expose customer PII (name, phone,
        // address) and must only be readable by the owning session — same
        // rule cancelUserOrder enforces.
        const { getOptionalUser } = await import("@/lib/auth/session");
        const { orders: ordersTable } = await import("@babascamera/db");
        const user = await getOptionalUser();
        if (user) {
          const db = getDatabase();
          const [owned] = await db
            .select({ id: ordersTable.id })
            .from(ordersTable)
            .where(
              and(eq(ordersTable.id, identifier), eq(ordersTable.userId, user.id)),
            )
            .limit(1);
          if (!owned) {
            return NextResponse.json(
              { success: false, message: "Order not found" },
              { status: 404 },
            );
          }
        } else {
          return NextResponse.json(
            { success: false, message: "Order not found" },
            { status: 404 },
          );
        }
        const result = await fetchOrderById(identifier);
        return success({ result });
      }
    } catch (error) {
      return apiErrorResponse(error);
    }
  }

  if (resource === "wishlist") {
    try {
      const results = await fetchWishlist();
      return success({
        results,
        totalCount: results.length,
      });
    } catch (error) {
      return apiErrorResponse(error);
    }
  }

  if (resource === "settings") {
    try {
      const scope = query.get("scope") || query.get("type") || "Delivery";
      const result = await getSpecificDeliverySettings(scope);
      return success({ result });
    } catch (error) {
      return apiErrorResponse(error);
    }
  }

  if (resource === "notification") {
    return success({ results: [] });
  }

  return NextResponse.json(
    { success: false, message: `Endpoint not available: ${resource}${identifier ? "/" + identifier : ""}` },
    { status: 404 }
  );
}

// --- POST Handler ---
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  try {
    const { path } = await context.params;
    const [resource, identifier] = path;

    if (resource === "user" && identifier === "register") {
      const body = await request.json().catch(() => ({}));
      const result = await registerUser(body);
      return success({ result });
    }

    if (resource === "user" && identifier === "login") {
      const body = await request.json().catch(() => ({}));
      const result = await loginUser(body);
      return success({ result });
    }

    if (resource === "user" && (identifier === "g-auth" || identifier === "g-auth-signup")) {
      const gAccessToken =
        request.nextUrl.searchParams.get("gAccessToken") ??
        request.nextUrl.searchParams.get("accessToken") ??
        undefined;
      const result = await googleAuth({ gAccessToken });
      return success({ result });
    }

    if (resource === "user" && (identifier === "forgot-password" || identifier === "forget-password")) {
      const body = await request.json().catch(() => ({}));
      const res = await forgotPassword(body);
      return success({ message: res.message });
    }

    if (resource === "user" && identifier === "reset-password") {
      const body = await request.json().catch(() => ({}));
      const res = await resetPassword(body);
      return success({ message: res.message });
    }

    if (resource === "user" && identifier === "logout") {
      const res = await logoutUser();
      return success(res);
    }

    if (resource === "cart" && identifier === "product" && path[2]) {
      const result = await addCartProduct(path[2]);
      return success({ result });
    }

    if (resource === "addressbook" && identifier === "user") {
      const body = await request.json().catch(() => ({}));
      const result = await addUserAddress(body);
      return success({ result });
    }

    if (resource === "file") {
      const formData = await request.formData();
      const file = formData.get("file");
      if (!(file instanceof File)) {
        return NextResponse.json(
          { success: false, message: "A proof file is required." },
          { status: 400 },
        );
      }
      const result = await uploadProofFile(file);
      return success({ result, data: result, _id: result._id });
    }

    if (resource === "order" && (identifier === "user" || identifier === "buy-now")) {
      const body = await request.json().catch(() => ({}));
      const result = await createOrderFromCheckout(body, identifier === "buy-now");
      return success({ result, order: result });
    }

    if (resource === "order" && identifier === "bank-proof") {
      const body = await request.json().catch(() => ({}));
      const result = await attachBankTransferToOrder(body);
      return success({ result, order: result });
    }

    if (resource === "order" && (path[2] === "pay" || identifier === "pay")) {
      const targetOrderId = identifier === "pay" ? path[2] : identifier;
      if (!targetOrderId) {
        return NextResponse.json(
          { success: false, message: "Order ID is required." },
          { status: 400 }
        );
      }
      const result = await payPendingOrder(targetOrderId);
      return success({ result });
    }

    if (resource === "wishlist" && identifier) {
      const result = await addToWishlist(identifier);
      return success({ result });
    }

    if (resource === "notification") {
      const targetProductId = identifier === "add" ? path[2] : identifier;
      return success({
        result: {
          _id: `notif-${targetProductId || "default"}`,
          product: targetProductId,
        },
      });
    }

    return NextResponse.json(
      { success: false, message: `Endpoint not available: ${resource}${identifier ? "/" + identifier : ""}` },
      { status: 404 }
    );
  } catch (error) {
    return apiErrorResponse(error);
  }
}


export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  try {
    const { path } = await context.params;
    const [resource, identifier] = path;

    if (resource === "user" && identifier === "login") {
      const body = await request.json().catch(() => ({}));
      const result = await loginUser(body);
      return success({ result });
    }

    if (resource === "user" && (identifier === "forget-password" || identifier === "forgot-password")) {
      const body = await request.json().catch(() => ({}));
      const res = await forgotPassword(body);
      return success({ message: res.message });
    }

    if (resource === "user" && identifier === "reset-password") {
      const body = await request.json().catch(() => ({}));
      const res = await resetPassword(body);
      return success({ message: res.message });
    }

    if (resource === "user" && identifier === "profile") {
      const body = await request.json().catch(() => ({}));
      const res = await updateUserProfile(body);
      return success(res);
    }

    if (resource === "cart" && identifier === "increment" && path[2]) {
      const result = await incrementCartItem(path[2]);
      return success({ result });
    }

    if (resource === "cart" && identifier === "decrement" && path[2]) {
      const result = await decrementCartItem(path[2]);
      return success({ result: result ?? undefined });
    }

    if (resource === "cart" && identifier === "checkout" && path[2] === "user") {
      const res = await checkoutCartUser();
      return success(res);
    }

    if (resource === "addressbook" && identifier) {
      const body = await request.json().catch(() => ({}));
      const result = await updateUserAddress(identifier, body);
      return success({ result });
    }

    if (resource === "order" && identifier) {
      const body = await request.json().catch(() => ({}));
      const isCancel = path[2] === "cancel" || String(body.status).toLowerCase() === "cancelled" || String(body.action).toLowerCase() === "cancel";
      if (isCancel) {
        const result = await cancelUserOrder(identifier, body.reason);
        return success({ result, message: "Order cancelled successfully." });
      }
    }

    return NextResponse.json(
      { success: false, message: `Endpoint not available: ${resource}${identifier ? "/" + identifier : ""}` },
      { status: 404 }
    );
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  try {
    const { path } = await context.params;
    const [resource, identifier] = path;

    if (resource === "user" && identifier === "logout") {
      const res = await logoutUser();
      return success(res);
    }

    if (resource === "cart" && identifier) {
      await removeCartItem(identifier);
      return success({ message: "Cart item removed." });
    }

    if (resource === "addressbook" && (identifier === "user" ? path[2] : identifier)) {
      const targetId = identifier === "user" ? path[2] : identifier;
      if (targetId) {
        await deleteUserAddress(targetId);
        return success({ message: "Address deleted." });
      }
    }

    if (resource === "wishlist" && (identifier === "user" ? path[2] : identifier)) {
      const targetId = identifier === "user" ? path[2] : identifier;
      if (targetId) {
        await removeFromWishlist(targetId);
        return success({ message: "Item removed from wishlist." });
      }
    }

    if (resource === "notification") {
      return success({ message: "Notification removed." });
    }

    return NextResponse.json(
      { success: false, message: `Endpoint not available: ${resource}${identifier ? "/" + identifier : ""}` },
      { status: 404 }
    );
  } catch (error) {
    return apiErrorResponse(error);
  }
}





