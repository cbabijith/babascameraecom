"use client";

import Image from "next/image";
import { useState, useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ChevronLeft,
  ChevronRight,
  ShoppingCart,
  Heart,
  Loader2,
  CircleStar,
  ShieldCheck,
  ScrollText,
  Share2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import ProductCard from "../common/product-card";
import { formatPrice } from "@/lib/price-formatter";
import { getProductById, getProducts } from "@/instances/productInstance";
import { getImageUrl } from "@/lib/apiClient";
import type { Product } from "@/types/product";
import { AppDispatch, RootState } from "@/store";
import { addToCartAsync } from "@/store/slice/cartSlice";
import {
  toggleWishlistAsync,
  selectIsInWishlist,
} from "@/store/slice/wishlistSlice";
import { toast } from "sonner";
import AppBreadcrumb from "../common/app-breadcrumb";
import ProductDetailsSkeleton from "../ui/ProductDetailsSkeleton";
import { CartItem } from "@/types/cart";
import {
  addNotificationAsync,
  fetchNotificationsAsync,
  selectIsNotified,
} from "@/store/slice/notificationSlice";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "../ui/accordion";
import { catalogRichTextToPlainText } from "@/lib/catalog-rich-text";

/* ----------------------------- CATALOG TEXT RENDERER ----------------------------- */
function HtmlRenderer({
  html,
  className,
}: {
  html?: string;
  className?: string;
}) {
  if (!html) return null;
  return (
    <div className={`${className ?? ""} whitespace-pre-line`}>
      {catalogRichTextToPlainText(html)}
    </div>
  );
}

interface ProductDetailsProps {
  productId: string;
}

export default function ProductDetails({ productId }: ProductDetailsProps) {
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();

  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const [isToggling, setIsToggling] = useState(false);
  const [isNotifying, setIsNotifying] = useState(false);

  // “You May Also Have”
  const [youMayAlso, setYouMayAlso] = useState<Product[]>([]);
  const [youMayLoading, setYouMayLoading] = useState(false);
  const [youMayTotal, setYouMayTotal] = useState<number>(0);
  const [specTab, setSpecTab] = useState<"specs" | "additional">("specs");

  const user = useSelector((state: RootState) => state.auth.user);
  const isInWishlist = useSelector(
    product ? selectIsInWishlist(product._id) : () => false
  );

  const isInCart = useSelector((state: RootState) => {
    const items: CartItem[] = (state.cart?.items ?? []) as CartItem[];
    if (!product) return false;
    return items.some(
      (it) => it.product?._id === product._id || it._id === product._id
    );
  });

  const isNotified = useSelector(
    (state: RootState) =>
      productId
        ? Boolean(state.notification.byProductId[productId])
        : false
  );

  useEffect(() => {
    if (user) {
      // fire-and-forget; slice guards duplicate init via `initialized` if you want to add
      dispatch(fetchNotificationsAsync());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);
  /* ---------- H-scroll: refs, state, listeners, helpers ---------- */
  const relRowRef = useRef<HTMLDivElement | null>(null);
  const mayRowRef = useRef<HTMLDivElement | null>(null);

  const [relScroll, setRelScroll] = useState({
    can: false,
    atStart: true,
    atEnd: true,
  });
  const [mayScroll, setMayScroll] = useState({
    can: false,
    atStart: true,
    atEnd: true,
  });

  const getScrollState = (el: HTMLDivElement | null) => {
    if (!el) return { can: false, atStart: true, atEnd: true };
    const can = el.scrollWidth > el.clientWidth + 1;
    const atStart = el.scrollLeft <= 1;
    const atEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 1;
    return { can, atStart, atEnd };
  };

  const updateRelScroll = () => setRelScroll(getScrollState(relRowRef.current));
  const updateMayScroll = () => setMayScroll(getScrollState(mayRowRef.current));

  const scrollByDir = (
    ref: React.RefObject<HTMLDivElement | null>,
    dir: "left" | "right"
  ) => {
    const el = ref.current;
    if (!el) return;
    const step = Math.max(260, Math.floor(el.clientWidth * 0.6));
    el.scrollBy({ left: dir === "left" ? -step : step, behavior: "smooth" });
  };

  const relatedCount = product?.relatedProducts?.length ?? 0;
  useEffect(() => {
    updateRelScroll();
    updateMayScroll();

    const elRel = relRowRef.current;
    const elMay = mayRowRef.current;

    const onRel = () => updateRelScroll();
    const onMay = () => updateMayScroll();
    const onResize = () => {
      updateRelScroll();
      updateMayScroll();
    };

    elRel?.addEventListener("scroll", onRel);
    elMay?.addEventListener("scroll", onMay);
    window.addEventListener("resize", onResize);

    return () => {
      elRel?.removeEventListener("scroll", onRel);
      elMay?.removeEventListener("scroll", onMay);
      window.removeEventListener("resize", onResize);
    };
  }, [relatedCount, youMayAlso.length]);

  /* ---------- Data fetch ---------- */
  useEffect(() => {
    const run = async () => {
      try {
        setLoading(true);
        setError(null);

        const productData = await getProductById(productId);
        setProduct(productData);

        if (productData?.category?._id && productData?._id) {
          setYouMayLoading(true);
          try {
            const res = await getProducts({
              category: productData.category._id,
              similar: productData._id,
              limit: 8,
            });
            setYouMayAlso(res?.results || []);
            setYouMayTotal(res?.totalCount || (res?.results?.length ?? 0));
          } catch {
            setYouMayAlso([]);
            setYouMayTotal(0);
          } finally {
            setYouMayLoading(false);
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load product");
      } finally {
        setLoading(false);
      }
    };

    if (productId) run();
  }, [productId]);

  /* ---------- Image nav helpers ---------- */
  const nextImage = () =>
    setCurrentImageIndex(
      (prev) => (prev + 1) % Math.max(1, productImages.length)
    );
  const prevImage = () =>
    setCurrentImageIndex(
      (prev) =>
        (prev - 1 + Math.max(1, productImages.length)) %
        Math.max(1, productImages.length)
    );

  /* ---------- Mobile swipe for image (MOVE THESE ABOVE EARLY RETURNS) ---------- */
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);

  const onTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    const t = e.touches[0];
    touchStartX.current = t.clientX;
    touchStartY.current = t.clientY;
  };
  const onTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    if (touchStartX.current == null || touchStartY.current == null) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - touchStartX.current;
    const dy = t.clientY - touchStartY.current;
    if (Math.abs(dx) < 40 || Math.abs(dx) < Math.abs(dy)) {
      touchStartX.current = null;
      touchStartY.current = null;
      return;
    }
    if (dx < 0) nextImage();
    else prevImage();
    touchStartX.current = null;
    touchStartY.current = null;
  };

  /* ---------- Early returns (after ALL hooks) ---------- */
  if (loading) return <ProductDetailsSkeleton />;
  if (error) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Error</h1>
          <p className="text-red-600 mb-4">{error}</p>
          <Button onClick={() => window.location.reload()}>Try Again</Button>
        </div>
      </div>
    );
  }
  if (!product) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Product Not Found
          </h1>
        </div>
      </div>
    );
  }

  /* ---------- Derived values (safe after early returns) ---------- */
  const productImages = product.images?.length
    ? product.images.map((img) => getImageUrl(img.key))
    : ["/placeholder.svg"];

  const discount =
    product.price.actualPrice !== product.price.salePrice
      ? Math.round(
          (1 - product.price.salePrice / product.price.actualPrice) * 100
        )
      : 0;

  const isInStock = (product.quantity ?? 0) > 0;
  const relatedProducts = product.relatedProducts ?? [];

  const variants = product.variants;
  const variantRows: Array<{ label: string; value: React.ReactNode }> = [];
  if (variants) {
    if (variants.productId)
      variantRows.push({ label: "Product ID", value: variants.productId });
    if (variants.hsnNumber)
      variantRows.push({ label: "HSN Number", value: variants.hsnNumber });
    if (variants.barcode)
      variantRows.push({ label: "Barcode", value: variants.barcode });
    if (variants.color) {
      variantRows.push({
        label: "Color",
        value: (
          <span className="inline-flex items-center gap-2">
            <span
              className="inline-block h-4 w-4 rounded-full border border-gray-300 align-middle"
              style={{ backgroundColor: variants.color }}
              aria-label="Color swatch"
            />
            <span className="text-gray-800">{variants.color}</span>
          </span>
        ),
      });
    }
    if (variants.colorLabel)
      variantRows.push({ label: "Color Label", value: variants.colorLabel });
    if (variants.paymentMode)
      variantRows.push({ label: "Payment Mode", value: variants.paymentMode });
  }

  const handleAddToCart = async () => {
    if (!product || isAddingToCart) return;
    if (!user) {
      toast.error("Please login to add items to cart");
      return;
    }
    try {
      setIsAddingToCart(true);
      await dispatch(addToCartAsync(product._id)).unwrap();
    } finally {
      setIsAddingToCart(false);
    }
  };

  const handleBuyNow = async () => {
    if (!product) return;
    if (!user) {
      toast.error("Please login to continue");
      return;
    }
    router.push(`/checkout?buyNow=${product._id}&qty=1`);
  };

  const handleToggleWishlist = async () => {
    if (!product || isToggling) return;
    if (!user) {
      toast.error("Please login to manage wishlist");
      return;
    }
    try {
      setIsToggling(true);
      const wasInWishlist = isInWishlist;
      await dispatch(toggleWishlistAsync(product._id)).unwrap();
      toast.success(
        wasInWishlist ? "Removed from wishlist" : "Added to wishlist"
      );
    } catch {
      toast.error("Something went wrong while updating wishlist");
    } finally {
      setIsToggling(false);
    }
  };

  const handleNotifyMe = async () => {
    if (!productId) return;
    if (!user) {
      toast.error("Please login to enable notifications");
      return;
    }
    try {
      setIsNotifying(true);
      await dispatch(addNotificationAsync(productId)).unwrap();
      toast.success("We'll notify you when it's back in stock");
    } catch (e) {
      toast.error("Could not add notification");
    } finally {
      setIsNotifying(false);
    }
  };
  const goToCart = () => router.push("/cart");

  const handleShare = async () => {
    const shareUrl = typeof window !== "undefined" ? window.location.href : "";
    const productName = product?.name ?? "Check out this product";
    const shareText = `Check out ${product?.name} on Baba's!`;

    if (!navigator.share) {
      toast.error("Sharing is not supported on this browser");
      return;
    }

    try {
      // Try to include the product image as a file for richer sharing
      let filesToShare: File[] = [];
      try {
        const imageUrl = productImages[0];
        if (imageUrl && imageUrl !== "/placeholder.svg") {
          const response = await fetch(imageUrl);
          const blob = await response.blob();
          const ext = blob.type.split("/")[1] || "jpg";
          const file = new File([blob], `${productName}.${ext}`, { type: blob.type });
          if (navigator.canShare && navigator.canShare({ files: [file] })) {
            filesToShare = [file];
          }
        }
      } catch {
        // Image fetch failed — share without image
      }

      await navigator.share({
        title: productName,
        text: shareText,
        url: shareUrl,
        ...(filesToShare.length > 0 && { files: filesToShare }),
      });
    } catch (err: unknown) {
      if (err instanceof Error && err.name !== "AbortError") {
        toast.error("Unable to share this product");
      }
    }
  };

  return (
    <main className="min-h-screen bg-white">
      <div className="constrained-width pt-3 sm:pt-6">
        <AppBreadcrumb
          items={[
            { label: "HOME", href: "/" },
            { label: "PRODUCTS", href: "/products" },
            {
              label: product?.name
                ? product.name.charAt(0).toUpperCase() + product.name.slice(1)
                : "Product",
            },
          ]}
        />
      </div>

      <div className="constrained-width py-8 pb-4 md:pb-0">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Left: Images */}
          <div className="space-y-4">
            <div className="relative">
              {/* ✅ CHANGED: add border ONLY on mobile, keep clean on md+ */}
              <div
                className="
                  relative w-full h-[360px] sm:h-[420px] lg:h-[500px]
                  bg-white rounded-lg overflow-hidden
                  border border-gray-200 md:border-0
                "
                onTouchStart={onTouchStart}
                onTouchEnd={onTouchEnd}
              >
                {/* OUT OF STOCK overlay on image */}
                {!isInStock && (
                  <div className="absolute left-3 top-3 z-20">
                    <Badge className="bg-red-100 text-red-700 border border-red-300">
                      Out of stock
                    </Badge>
                  </div>
                )}

                <Image
                  src={productImages[currentImageIndex]}
                  alt={product.name}
                  fill
                  className="object-contain p-2 sm:p-4 lg:p-8 select-none"
                  priority
                  draggable={false}
                />

                {/* Wishlist */}
                <button
                  onClick={handleToggleWishlist}
                  disabled={isToggling}
                  className={`absolute top-4 right-4 p-3 bg-white rounded-full shadow-lg hover:shadow-xl transition-all z-10 ${
                    isToggling
                      ? "opacity-50 cursor-not-allowed"
                      : "cursor-pointer"
                  }`}
                >
                  <Heart
                    className={`w-5 h-5 transition-colors ${
                      isInWishlist
                        ? "fill-red-500 text-red-500"
                        : "text-gray-400 hover:text-red-400"
                    }`}
                  />
                </button>

                {/* Share */}
                <button
                  onClick={handleShare}
                  className="absolute top-20 right-4 p-3 bg-white rounded-full shadow-lg hover:shadow-xl transition-all z-10 cursor-pointer"
                  aria-label="Share product"
                >
                  <Share2 className="w-5 h-5 text-gray-400 hover:text-gray-600" />
                </button>

                {/* ✅ CHANGED: hide image nav chevrons on mobile (swipe only) */}
                {productImages.length > 1 && (
                  <>
                    <button
                      onClick={prevImage}
                      className="hidden md:flex items-center justify-center absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white shadow-lg rounded-full hover:bg-gray-50"
                    >
                      <ChevronLeft className="w-5 h-5 text-gray-600" />
                    </button>
                    <button
                      onClick={nextImage}
                      className="hidden md:flex items-center justify-center absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white shadow-lg rounded-full hover:bg-gray-50"
                    >
                      <ChevronRight className="w-5 h-5 text-gray-600" />
                    </button>
                  </>
                )}
              </div>

              {/* Indicators */}
              {productImages.length > 1 && (
                <div className="flex justify-center gap-2 mt-3">
                  {productImages.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => setCurrentImageIndex(idx)}
                      className={`w-3 h-3 rounded-full transition-colors ${
                        idx === currentImageIndex
                          ? "bg-red-600"
                          : "bg-gray-300 hover:bg-gray-400"
                      }`}
                      aria-label={`Go to image ${idx + 1}`}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* ✅ CHANGED: Mobile Title/Price + Stock badge */}
            <div className="lg:hidden">
              <h1 className="text-xl font-bold text-gray-900 mb-2">
                {product.name}
              </h1>
              <div className="flex items-center gap-3 mb-2">
                <span className="text-xl font-bold text-gray-900">
                  {formatPrice(product.price.salePrice)}
                </span>
                {discount > 0 && (
                  <>
                    <span className="text-base text-gray-500 line-through">
                      M.R.P. {formatPrice(product.price.actualPrice)}
                    </span>
                    <span className="text-green-600 font-semibold">
                      {discount}% off
                    </span>
                  </>
                )}
              </div>
              <p className="text-sm text-gray-600">
                Incl. of taxes • {product.price.taxStatus}
              </p>

              {isInStock ? (
                product.quantity < 5 && (
                  <Badge
                    variant="secondary"
                    className="mt-2 border bg-green-100 text-green-800 border-green-300"
                  >
                    {`Only ${product.quantity} left in stock!`}
                  </Badge>
                )
              ) : (
                <Badge className="mt-2 bg-red-100 text-red-700 border border-red-300">
                  Out of stock
                </Badge>
              )}
            </div>

            {/* Trust Badges */}
            <div className="grid grid-cols-3 gap-4 pt-4">
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-2 bg-[#FFF5D9] rounded-full flex items-center justify-center">
                  <CircleStar className="w-8 h-8 text-[#807b6d]" />
                </div>
                <p className="text-sm font-medium">Authorized Dealer</p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-2 bg-[#FFF5D9] rounded-full flex items-center justify-center">
                  <ShieldCheck className="w-8 h-8 text-[#807b6d]" />
                </div>
                <p className="text-sm font-medium">Brand Warranty</p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-2 bg-[#FFF5D9] rounded-full flex items-center justify-center">
                  <ScrollText className="w-8 h-8 text-[#807b6d]" />
                </div>
                <p className="text-sm font-medium">GST Invoice</p>
              </div>
            </div>
          </div>

          {/* Right: Info */}
          <div className="space-y-6">
            {/* Desktop Title */}
            <div className="hidden lg:block">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                {product?.name
                  ? product.name.charAt(0).toUpperCase() + product.name.slice(1)
                  : ""}
              </h1>
              <p className="text-gray-600">
                {product?.category?.name
                  ? product.category.name.charAt(0).toUpperCase() +
                    product.category.name.slice(1)
                  : ""}
                {product?.brand?.name && (
                  <>
                    {" • "}
                    {product.brand.name.charAt(0).toUpperCase() +
                      product.brand.name.slice(1)}
                  </>
                )}
              </p>
            </div>

            {/* Price + Stock (desktop only) */}
            <div className="hidden lg:block">
              <div className="flex items-center gap-4 mb-2">
                <span className="text-3xl font-bold text-gray-900">
                  {formatPrice(product.price?.salePrice)}
                </span>
                {discount > 0 && (
                  <>
                    <span className="text-xl text-gray-500 line-through">
                      M.R.P. {formatPrice(product.price?.actualPrice)}
                    </span>
                    <span className="text-green-600 font-semibold">
                      {discount}% off
                    </span>
                  </>
                )}
              </div>
              <p className="text-sm text-gray-600">
                Incl. of taxes • {product.price?.taxStatus}
              </p>

              {isInStock ? (
                product.quantity! > 0 &&
                product.quantity! < 5 && (
                  <Badge
                    variant="secondary"
                    className="mt-2 border bg-green-100 text-green-800 border-green-300"
                  >
                    {`Only ${product.quantity} left in stock!`}
                  </Badge>
                )
              ) : (
                <Badge className="mt-2 bg-red-100 text-red-700 border border-red-300">
                  Out of stock
                </Badge>
              )}
            </div>

            {/* Actions (desktop/tablet) */}
            <div className="hidden md:flex gap-4">
              {isInCart ? (
                <Button
                  className="flex-1 bg-red-600 text-white border border-red-600 hover:bg-red-700 hover:text-white rounded-full transition-colors"
                  onClick={goToCart}
                >
                  <ShoppingCart className="w-5 h-5 mr-2" />
                  Go to Cart
                </Button>
              ) : (
                <Button
                  className="flex-1 bg-red-600 text-white border border-red-600 hover:bg-red-700 hover:text-white rounded-full transition-colors"
                  disabled={!isInStock || isAddingToCart}
                  onClick={handleAddToCart}
                >
                  <ShoppingCart className="w-5 h-5 mr-2" />
                  {isAddingToCart ? "Adding..." : "Add to Cart"}
                </Button>
              )}

              {isInStock ? (
                <Button
                  className="flex-1 bg-white text-red-600 border border-red-600 hover:bg-red-600 hover:text-white rounded-full transition-colors"
                  onClick={handleBuyNow}
                >
                  {Number(product?.price?.salePrice) === 0 ? "Pre Order Now" : "Buy Now"}
                </Button>
              ) : (
                <Button
                  className="flex-1 bg-white text-red-600 border border-red-600 hover:bg-red-600 hover:text-white rounded-full transition-colors disabled:opacity-60 disabled:hover:bg-white disabled:hover:text-red-600"
                  onClick={handleNotifyMe}
                  disabled={isNotifying || isNotified}
                  aria-disabled={isNotified || isNotifying}
                  title={
                    isNotified
                      ? "You'll be notified when it's back in stock"
                      : undefined
                  }
                >
                  {isNotifying
                    ? "Adding..."
                    : isNotified
                    ? "Notified"
                    : "Notify Me"}
                </Button>
              )}

              {/* Share button */}
              <Button
                variant="outline"
                className="px-4 border-gray-300 text-gray-600 hover:text-red-600 hover:border-red-300 rounded-full transition-colors"
                onClick={handleShare}
                aria-label="Share product"
              >
                <Share2 className="w-5 h-5 mr-2" />
                Share
              </Button>
            </div>

            {/* Key Specs (HTML) */}
            {product.keyFeatures ? (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">
                  Key Specs
                </h3>
                <HtmlRenderer
                  html={product.keyFeatures}
                  className="text-sm text-gray-700 leading-relaxed [&_ul]:list-disc [&_ul]:pl-5 [&_li]:mb-1"
                />
              </div>
            ) : (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">
                  Key Specs
                </h3>
                <ul className="space-y-2 text-sm text-gray-700">
                  <li>Brand: {product.brand?.name}</li>
                  <li>Category: {product.category?.name}</li>
                </ul>
              </div>
            )}

            {/* Description (HTML) */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">
                Product Description
              </h3>
              {product.description ? (
                <HtmlRenderer
                  html={product.description}
                  className="text-sm text-gray-700 leading-relaxed"
                />
              ) : (
                <p className="text-sm text-gray-700 leading-relaxed">
                  {`Experience professional photography with the ${product.name}. This ${product.category?.name} from ${product.brand?.name} offers exceptional quality and performance for both amateur and professional photographers.`}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* SPECIFICATIONS */}
        {(product.specification || variantRows.length > 0) && (
          <section className="mt-6">
            {/* DESKTOP/TABLET: Tab UI */}
            <div className="hidden sm:block">
              {/* Tabs header */}
              <div className="flex items-end gap-8">
                <button
                  type="button"
                  onClick={() => setSpecTab("specs")}
                  className="relative pb-2"
                  aria-pressed={specTab === "specs"}
                >
                  <h2 className="font-bold text-gray-900 uppercase text-left text-[20px] leading-[100%] tracking-normal">
                    SPECIFICATIONS
                  </h2>
                  {specTab === "specs" && (
                    <span
                      className="absolute left-0 -bottom-[3px] h-[3px] w-full"
                      style={{ backgroundColor: "rgba(236, 19, 74, 1)" }}
                    />
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setSpecTab("additional")}
                  className="relative pb-2"
                  aria-pressed={specTab === "additional"}
                >
                  <h2 className="font-bold text-gray-900 uppercase text-left text-[20px] leading-[100%] tracking-normal">
                    ADDITIONAL INFORMATION
                  </h2>
                  {specTab === "additional" && (
                    <span
                      className="absolute left-0 -bottom-[3px] h-[3px] w-full"
                      style={{ backgroundColor: "rgba(236, 19, 74, 1)" }}
                    />
                  )}
                </button>
              </div>

              {/* Tabs content */}
              <div className="mt-6">
                {specTab === "specs" ? (
                  product.specification ? (
                    <HtmlRenderer
                      html={product.specification}
                      className="overflow-x-auto [&_table]:w-full [&_table]:border-collapse [&_td]:border [&_td]:border-gray-200 [&_td]:p-3 [&_tr:nth-child(even)]:bg-gray-50 text-sm text-gray-800"
                    />
                  ) : (
                    <p className="text-sm text-gray-700">
                      No specifications available.
                    </p>
                  )
                ) : (
                  (() => {
                    const filtered = (variantRows || []).filter((row) => {
                      const label = (row?.label || "").toLowerCase();
                      const value = String(row?.value ?? "").toLowerCase();

                      const isPaymentLabel =
                        label.includes("payment mode") ||
                        label === "payment" ||
                        label.includes("payment");
                      return !(isPaymentLabel && value === "prepaid");
                    });

                    return filtered.length > 0 ? (
                      <div className="overflow-x-auto">
                        <table className="w-full border-collapse text-sm text-gray-800">
                          <tbody>
                            {filtered.map((row, idx) => (
                              <tr
                                key={idx}
                                className={
                                  idx % 2 === 1 ? "bg-gray-50" : undefined
                                }
                              >
                                <td className="w-48 border border-gray-200 p-3 font-medium text-gray-700">
                                  {row.label}
                                </td>
                                <td className="border border-gray-200 p-3">
                                  {row.value}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <p className="text-sm text-gray-700">
                        No additional information available.
                      </p>
                    );
                  })()
                )}
              </div>
            </div>

            {/* MOBILE: Accordion UI */}
            <div className="sm:hidden">
              {/* import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion" */}
              <Accordion
                type="single"
                collapsible
                defaultValue="specs"
                className="w-full"
              >
                {/* Specs */}
                <AccordionItem value="specs">
                  <AccordionTrigger className="uppercase justify-between items-center font-bold text-gray-900 text-[14px] leading-[100%] tracking-normal">
                    <span>Specifications</span>
                  </AccordionTrigger>
                  <AccordionContent>
                    {product.specification ? (
                      <HtmlRenderer
                        html={product.specification}
                        className="overflow-x-auto [&_table]:w-full [&_table]:border-collapse [&_td]:border [&_td]:border-gray-200 [&_td]:p-3 [&_tr:nth-child(even)]:bg-gray-50 text-sm text-gray-800"
                      />
                    ) : (
                      <p className="text-sm text-gray-700">
                        No specifications available.
                      </p>
                    )}
                  </AccordionContent>
                </AccordionItem>

                {/* Additional Info */}
                <AccordionItem value="additional">
                  <AccordionTrigger className="uppercase justify-between items-center font-bold text-gray-900 text-[14px] leading-[100%] tracking-normal">
                    <span>Additional Information</span>
                  </AccordionTrigger>
                  <AccordionContent>
                    {(() => {
                      const filtered = (variantRows || []).filter((row) => {
                        const label = (row?.label || "").toLowerCase();
                        const value = String(row?.value ?? "").toLowerCase();

                        const isPaymentLabel =
                          label.includes("payment mode") ||
                          label === "payment" ||
                          label.includes("payment");
                        return !(isPaymentLabel && value === "prepaid");
                      });

                      return filtered.length > 0 ? (
                        <div className="overflow-x-auto">
                          <table className="w-full border-collapse text-sm text-gray-800">
                            <tbody>
                              {filtered.map((row, idx) => (
                                <tr
                                  key={idx}
                                  className={
                                    idx % 2 === 1 ? "bg-gray-50" : undefined
                                  }
                                >
                                  <td className="w-40 border border-gray-200 p-3 font-medium text-gray-700">
                                    {row.label}
                                  </td>
                                  <td className="border border-gray-200 p-3">
                                    {row.value}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <p className="text-sm text-gray-700">
                          No additional information available.
                        </p>
                      );
                    })()}
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>
          </section>
        )}

        {youMayAlso.length > 0 && (
          <section className="mt-6">
            <div
              className="rounded-lg px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2"
              style={{ backgroundColor: "rgba(247, 247, 247, 1)" }}
            >
              <div className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-3">
                <h2 className="text-xl font-semibold text-gray-900">
                  You May Also Have
                </h2>
                <p className="text-sm text-gray-600 leading-snug">
                  Similar picks creators often choose next.
                </p>
              </div>

              {youMayTotal > youMayAlso.length && (
                <Button
                  variant="link"
                  onClick={() => router.push(`/products`)}
                  className="hidden lg:inline-flex text-red-600 hover:text-red-700"
                >
                  View More &gt;&gt;
                </Button>
              )}
            </div>

            {youMayLoading ? (
              <div className="flex items-center gap-2 text-gray-600 mt-6">
                <Loader2 className="w-5 h-5 animate-spin" />
                Loading suggestions...
              </div>
            ) : (
              <div className="relative mt-6">
                {/* Left arrow (md+) */}
                {mayScroll.can && !mayScroll.atStart && (
                  <button
                    onClick={() => scrollByDir(mayRowRef, "left")}
                    className="hidden md:flex items-center justify-center absolute left-0 top-1/2 -translate-y-1/2 z-10 h-10 w-10 rounded-full bg-white/90 border border-gray-300 shadow hover:bg-white"
                    aria-label="Scroll left"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                )}

                <div
                  ref={mayRowRef}
                  className="flex overflow-x-auto scrollbar-hide
                     pb-0 sm:pb-2
                     snap-x snap-mandatory md:snap-none
                     gap-3 sm:gap-6"
                >
                  {youMayAlso.map((p) => (
                    <div key={p._id} className="flex-shrink-0 snap-start">
                      <ProductCard
                        id={p._id}
                        name={p.name}
                        slug={product.slug}
                        category={p.category?.name}
                        price={p.price?.salePrice}
                        originalPrice={
                          p.price?.actualPrice !== p.price?.salePrice
                            ? p.price?.actualPrice
                            : undefined
                        }
                        image={
                          p.images?.[0]
                            ? getImageUrl(p.images[0].key)
                            : "/placeholder.svg"
                        }
                        features={[
                          p.brand?.name ? `Brand: ${p.brand.name}` : "",
                          typeof p.quantity === "number"
                            ? `Stock: ${p.quantity} units`
                            : "",
                          p.code ? `Code: ${p.code}` : "",
                        ].filter(Boolean)}
                        inStock={(p.quantity ?? 0) > 0}
                      />
                    </div>
                  ))}
                </div>

                {/* Right arrow (md+) */}
                {mayScroll.can && !mayScroll.atEnd && (
                  <button
                    onClick={() => scrollByDir(mayRowRef, "right")}
                    className="hidden md:flex items-center justify-center absolute right-0 top-1/2 -translate-y-1/2 z-10 h-10 w-10 rounded-full bg-white/90 border border-gray-300 shadow hover:bg-white"
                    aria-label="Scroll right"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                )}
              </div>
            )}
          </section>
        )}
      </div>

      {/* Sticky mobile bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 shadow-[0_-2px_10px_rgba(0,0,0,0.06)]">
        <div className="constrained-width py-3 px-4">
          <div className="flex items-center justify-between">
            <span className="text-md font-semibold text-gray-600">Total</span>
            <div className="flex items-center gap-2">
              {discount > 0 && (
                <span className="text-sm text-gray-400 line-through">
                  {formatPrice(product.price.actualPrice)}
                </span>
              )}
              <span className="text-lg font-semibold text-gray-900">
                {formatPrice(product.price.salePrice)}
              </span>
            </div>
          </div>

          <div className="mt-2 grid grid-cols-2 gap-2">
            {isInCart ? (
              <Button
                variant="outline"
                className="w-full rounded-full border-red-600 text-red-600 hover:bg-red-50"
                onClick={goToCart}
              >
                Go to Cart
              </Button>
            ) : (
              <Button
                variant="outline"
                className="w-full rounded-full border-red-600 text-red-600 hover:bg-red-50"
                disabled={!isInStock || isAddingToCart}
                onClick={handleAddToCart}
              >
                {isAddingToCart ? "Adding..." : "Add to Cart"}
              </Button>
            )}

            {isInStock ? (
              <Button
                className="w-full rounded-full bg-red-600 text-white hover:bg-red-700"
                onClick={handleBuyNow}
              >
                {Number(product?.price?.salePrice) === 0 ? "Pre Order Now" : "Buy Now"}
              </Button>
            ) : (
              <Button
                className="w-full rounded-full bg-red-600 text-white hover:bg-red-700 disabled:opacity-60 disabled:hover:bg-red-600"
                onClick={handleNotifyMe}
                disabled={isNotifying || isNotified}
                aria-disabled={isNotified || isNotifying}
                title={
                  isNotified
                    ? "You'll be notified when it's back in stock"
                    : undefined
                }
              >
                {isNotifying
                  ? "Adding..."
                  : isNotified
                  ? "Notified"
                  : "Notify Me"}
              </Button>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
