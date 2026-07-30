import Image from "next/image";
import Link from "next/link";
import { ShoppingBag, Trash2 } from "lucide-react";
import { Button, Card, CardContent } from "@babascamera/ui";
import { updateCartItemAction } from "@/app/actions/cart";
import {
  decimalToPaise,
  paiseToDecimal,
} from "@/lib/commerce/money";
import { getCartOwner } from "@/lib/cart-session";
import { getCartForOwner } from "@/lib/data/storefront";
import { formatMoney } from "@/lib/format";
import { productImageUrl } from "@/lib/storage";
import { CartCouponCard } from "@/components/cart/cart-coupon-card";
import { ActionForm } from "@/components/action-form";
import { previewCartCoupon } from "@/lib/commerce/checkout";

export const metadata = { title: "Your cart" };
export const dynamic = "force-dynamic";

export default async function CartPage() {
  const owner = await getCartOwner();
  const items = await getCartForOwner(owner);
  const lines = items.map((item) => ({
    unitPricePaise:
      decimalToPaise(item.basePrice) +
      decimalToPaise(item.additionalPrice ?? "0.00"),
    quantity: item.quantity,
  }));
  const initialCouponState = items.length
    ? await previewCartCoupon(owner)
    : {
        code: null,
        subtotal: "0.00",
        discount: "0.00",
        shipping: "0.00",
        total: "0.00",
      };

  return (
    <section className="page-shell py-12">
      <h1 className="text-4xl font-bold">Your cart</h1>
      <p className="mt-2 text-slate-600">
        Prices and stock are checked again securely at checkout.
      </p>
      {!items.length ? (
        <div className="mt-10 flex flex-col items-center rounded-3xl border border-dashed border-slate-300 py-20 text-center">
          <ShoppingBag className="h-12 w-12 text-slate-300" />
          <h2 className="mt-4 text-xl font-semibold">Your cart is empty</h2>
          <p className="mt-2 text-slate-500">
            Find the gear for your next story.
          </p>
          <Button
            asChild
            className="mt-6 bg-[#E94560] hover:bg-[#D63852]"
          >
            <Link href="/products">Browse products</Link>
          </Button>
        </div>
      ) : (
        <div className="mt-9 grid gap-8 lg:grid-cols-[1fr_22rem]">
          <div className="space-y-4">
            {items.map((item, index) => {
              const line = lines[index];
              if (!line) return null;
              return (
                <Card key={item.id}>
                  <CardContent className="grid gap-4 p-4 sm:grid-cols-[7rem_1fr_auto] sm:items-center">
                    <Link
                      href={`/products/${item.productSlug}`}
                      className="relative aspect-square overflow-hidden rounded-xl bg-slate-50"
                    >
                      <Image
                        src={productImageUrl(item.image)}
                        alt={item.productName}
                        fill
                        className="object-contain p-2"
                      />
                    </Link>
                    <div>
                      <Link
                        href={`/products/${item.productSlug}`}
                        className="font-semibold hover:text-[#E94560]"
                      >
                        {item.productName}
                      </Link>
                      {item.variantId ? (
                        <p className="mt-1 text-sm text-slate-500">
                          {item.variantName}: {item.variantValue}
                        </p>
                      ) : null}
                      <p className="mt-2 font-mono font-bold">
                        {formatMoney(paiseToDecimal(line.unitPricePaise))}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <ActionForm
                        action={updateCartItemAction}
                        className="flex gap-2"
                      >
                        <input
                          type="hidden"
                          name="cartItemId"
                          value={item.id}
                        />
                        <input
                          name="quantity"
                          type="number"
                          min="1"
                          max={Math.min(
                            item.variantStock ?? item.stock,
                            10,
                          )}
                          defaultValue={item.quantity}
                          className="h-10 w-16 rounded-lg border border-slate-300 px-2"
                          aria-label={`Quantity for ${item.productName}`}
                        />
                        <Button type="submit" variant="outline">
                          Update
                        </Button>
                      </ActionForm>
                      <ActionForm action={updateCartItemAction}>
                        <input
                          type="hidden"
                          name="cartItemId"
                          value={item.id}
                        />
                        <input type="hidden" name="quantity" value="0" />
                        <Button
                          type="submit"
                          variant="ghost"
                          size="icon"
                          aria-label={`Remove ${item.productName}`}
                        >
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </Button>
                      </ActionForm>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
          <Card className="h-fit lg:sticky lg:top-24">
            <CardContent className="p-6">
              <CartCouponCard
                initialState={{
                  ok: false,
                  message: "",
                  ...initialCouponState,
                }}
              />
            </CardContent>
          </Card>
        </div>
      )}
    </section>
  );
}
