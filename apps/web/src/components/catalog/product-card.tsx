import Image from "next/image";
import Link from "next/link";
import { Heart, ShoppingBag, Star } from "lucide-react";
import { Button, Card, CardContent } from "@babascamera/ui";
import { addToCartAction, toggleWishlistAction } from "@/app/actions/cart";
import { ActionForm } from "@/components/action-form";
import type { CatalogProduct } from "@/lib/data/storefront";
import { formatMoney } from "@/lib/format";
import { productImageUrl } from "@/lib/storage";

export function ProductCard({ product }: { product: CatalogProduct }) {
  const hasDiscount = Number(product.mrp) > Number(product.salePrice);
  return (
    <Card className="group relative overflow-hidden transition hover:-translate-y-1 hover:shadow-lg">
      {hasDiscount ? (
        <span className="absolute left-3 top-3 z-10 rounded-full bg-[#E94560] px-2.5 py-1 text-xs font-bold text-white">
          Sale
        </span>
      ) : null}
      <ActionForm
        action={toggleWishlistAction}
        className="absolute right-3 top-3 z-10"
      >
        <input type="hidden" name="productId" value={product.id} />
        <Button
          type="submit"
          size="icon"
          variant="outline"
          aria-label={`Save ${product.name} to wishlist`}
          className="rounded-full bg-white/90"
        >
          <Heart className="h-4 w-4" />
        </Button>
      </ActionForm>
      <Link href={`/products/${product.slug}`} className="block">
        <div className="relative aspect-square overflow-hidden bg-slate-50 p-5">
          <Image
            src={productImageUrl(product.image)}
            alt={product.name}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className="object-contain p-5 transition duration-300 group-hover:scale-105"
          />
        </div>
      </Link>
      <CardContent className="p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-[#E94560]">
          {product.brandName ?? product.categoryName ?? "Baba's Camera"}
        </p>
        <Link href={`/products/${product.slug}`}>
          <h3 className="mt-1 line-clamp-2 min-h-12 font-semibold leading-6 hover:text-[#E94560]">
            {product.name}
          </h3>
        </Link>
        {product.reviewCount > 0 ? (
          <p className="mt-2 flex items-center gap-1 text-xs text-slate-500">
            <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
            {product.averageRating.toFixed(1)} ({product.reviewCount})
          </p>
        ) : null}
        <div className="mt-3 flex items-baseline gap-2">
          <span className="font-mono text-lg font-bold">
            {formatMoney(product.salePrice)}
          </span>
          {hasDiscount ? (
            <span className="font-mono text-sm text-slate-400 line-through">
              {formatMoney(product.mrp)}
            </span>
          ) : null}
        </div>
        <ActionForm action={addToCartAction} className="mt-4">
          <input type="hidden" name="productId" value={product.id} />
          <input
            type="hidden"
            name="variantId"
            value={product.defaultVariantId ?? ""}
          />
          <input type="hidden" name="quantity" value="1" />
          <Button
            type="submit"
            disabled={product.stock <= 0}
            className="w-full bg-[#E94560] hover:bg-[#D63852]"
          >
            <ShoppingBag className="h-4 w-4" />
            {product.stock > 0 ? "Add to cart" : "Out of stock"}
          </Button>
        </ActionForm>
      </CardContent>
    </Card>
  );
}
