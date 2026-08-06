import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { asc, eq, getDatabase, homeBanners } from "@babascamera/db";
import {
  getCatalogProduct,
  listBestSellingProducts,
  listBrands,
  listCatalogProductsPage,
  listCategories,
  listRelatedProducts,
} from "@/features/catalog";
import { getSpecificDeliverySettings } from "@/lib/data/settings";
import { productImageUrl } from "@/lib/storage";
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
  createUserAddress,
  deleteUserAddress,
  getUserAddresses,
  updateUserAddress,
} from "@/features/address";
import {
  cancelUserOrder,
  createOrderFromCheckout,
  fetchOrderById,
  fetchUserOrders,
  OrderDataError,
  uploadProofFile,
} from "@/features/order";
import {
  addToWishlist,
  fetchWishlist,
  removeFromWishlist,
  WishlistDataError,
} from "@/features/wishlist";







interface LegacyImage {
  _id: string;
  name: string;
  key: string;
  mimetype: string;
  size: number;
  thumbnail: boolean;
}

function image(key: string | null | undefined, name = "image"): LegacyImage {
  return {
    _id: key ?? name,
    name,
    key: productImageUrl(key),
    mimetype: "image/*",
    size: 0,
    thumbnail: false,
  };
}

function product(row: Awaited<ReturnType<typeof listCatalogProductsPage>>["products"][number]) {
  const actualPrice = Number(row.mrp);
  const salePrice = Number(row.salePrice);
  return {
    _id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description ?? row.shortDescription ?? "",
    keyFeatures: row.shortDescription ?? "",
    specification: "",
    images: [image(row.image, row.name)],
    category: {
      _id: row.categorySlug ?? "uncategorized",
      name: row.categoryName ?? "Uncategorized",
      image: image(null, "category"),
      code: row.categorySlug ?? "uncategorized",
    },
    brand: {
      _id: row.brandSlug ?? "unbranded",
      name: row.brandName ?? "Baba's Camera",
      image: image(null, "brand"),
      code: row.brandSlug ?? "unbranded",
    },
    price: {
      actualPrice,
      salePrice,
      gst: 0,
      discountPrice: Math.max(actualPrice - salePrice, 0),
      taxStatus: "Inclusive",
    },
    quantity: row.stock,
    lowStockMinQuantity: 0,
    status: "Active",
    visibility: "Show",
    createdAt: new Date().toISOString(),
    code: row.slug,
  };
}

function success(payload: Record<string, unknown>) {
  return NextResponse.json({ success: true, message: "OK", ...payload });
}

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
      });
    }
    return success({
      results: categories.map((item, position) => ({
        _id: item.id, name: item.name, image: image(item.imageUrl, item.name),
        status: "Active", visibility: "Show", position, createdAt: new Date().toISOString(), code: item.slug,
      })), totalCount: categories.length, currentPage: 1, totalPages: 1, latestCount: categories.length
    });
  }

  if (resource === "brand") {
    const brands = await listBrands();
    if (identifier && identifier !== "active") {
      const found = brands.find((item) => item.id === identifier || item.slug === identifier);
      if (!found) return NextResponse.json({ success: false, message: "Brand not found" }, { status: 404 });
      return success({ result: { _id: found.id, name: found.name, image: image(found.logoUrl, found.name), code: found.slug, status: "Active", visibility: "Show" } });
    }
    return success({ results: brands.map((item) => ({ _id: item.id, name: item.name, image: image(item.logoUrl, item.name), code: item.slug, status: "Active", visibility: "Show" })), totalCount: brands.length, currentPage: 1, totalPages: 1, latestCount: brands.length });
  }

  if (resource === "product") {
    if (identifier) {
      const found = await getCatalogProduct(identifier);
      if (!found) return NextResponse.json({ success: false, message: "Product not found" }, { status: 404 });
      const [relatedProducts] = await Promise.all([
        listRelatedProducts({ id: found.id, categorySlug: found.categorySlug }),
      ]);
      const listing = product(found);
      return success({
        result: {
          ...listing,
          sku: found.sku,
          specification: found.description ?? "",
          keyFeatures: found.shortDescription ?? "",
          averageRating: found.averageRating,
          reviewCount: found.reviewCount,
          images: found.images.map((item) => image(item.url, item.altText ?? found.name)),
          variants: found.variants.map((variant) => ({
            id: variant.id,
            name: variant.name,
            value: variant.value,
            additionalPrice: variant.additionalPrice,
            stock: variant.stock,
          })),
          relatedProducts: relatedProducts.map(product),
        },
      });
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
    return success({ results: result.products.map(product), totalCount: result.total, currentPage: page, totalPages: Math.max(Math.ceil(result.total / limit), 1), latestCount: result.products.length });
  }

  if (resource === "banner") {
    const rows = await getDatabase()
      .select()
      .from(homeBanners)
      .where(eq(homeBanners.isActive, true))
      .orderBy(asc(homeBanners.position));

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
      return success({ result: found });
    }
    return success({ results: banners, totalCount: banners.length, currentPage: 1, totalPages: 1, latestCount: banners.length });
  }


  if (resource === "collection") {
    const products = await listBestSellingProducts(8);
    const items = products.map(product);
    return success({ results: items.length ? [{ _id: "featured", name: "Featured gear", value: 0, products: items, status: "Active", position: 0, createdAt: new Date().toISOString() }] : [], currentPage: 1, totalCount: items.length ? 1 : 0, totalPages: 1, latestCount: items.length ? 1 : 0 });
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

  return NextResponse.json({ success: false, message: "Endpoint not available" + resource + "/" + identifier }, { status: 404 });
}


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
      const result = await googleAuth();
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

    if (resource === "wishlist" && identifier) {
      const result = await addToWishlist(identifier);
      return success({ result });
    }

    return NextResponse.json({ success: false, message: "Endpoint not available" + resource + "/" + identifier }, { status: 404 });
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

    return NextResponse.json({ success: false, message: "Endpoint not available" + resource + "/" + identifier }, { status: 404 });
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

    return NextResponse.json({ success: false, message: "Endpoint not available" + resource + "/" + identifier }, { status: 404 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}





