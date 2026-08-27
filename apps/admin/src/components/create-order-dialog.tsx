"use client";

import { Button, Input, Label, Textarea, toast } from "@babascamera/ui";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@babascamera/ui";
import { Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";

interface ProductOption {
  id: string;
  name: string;
  sku: string;
  salePrice: string;
  stock: number;
}

interface VariantOption {
  id: string;
  name: string;
  value: string;
  sku: string;
  additionalPrice: string;
  stock: number;
}

interface ItemRow {
  key: string;
  productId: string;
  variantId: string;
  quantity: string;
  variants: VariantOption[];
  unitPrice: number;
}

const EMPTY_ITEM = (): ItemRow => ({
  key: crypto.randomUUID(),
  productId: "",
  variantId: "",
  quantity: "1",
  variants: [],
  unitPrice: 0,
});

const selectClass = "h-10 w-full rounded-md border bg-white px-3 text-sm";

function Field({ label, children, className }: { label?: string | undefined; children: ReactNode; className?: string }) {
  return (
    <div className={className}>
      {label ? <Label className="mb-1 block text-sm">{label}</Label> : null}
      {children}
    </div>
  );
}

export function CreateOrderDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");

  const [items, setItems] = useState<ItemRow[]>([EMPTY_ITEM()]);

  const [fullName, setFullName] = useState("");
  const [addressPhone, setAddressPhone] = useState("");
  const [line1, setLine1] = useState("");
  const [line2, setLine2] = useState("");
  const [city, setCity] = useState("");
  const [stateName, setStateName] = useState("");
  const [pincode, setPincode] = useState("");
  const [country, setCountry] = useState("India");

  const [paymentMethod, setPaymentMethod] = useState("cod");
  const [paymentStatus, setPaymentStatus] = useState("pending");
  const [shippingCharge, setShippingCharge] = useState("0");
  const [discount, setDiscount] = useState("0");
  const [notes, setNotes] = useState("");

  const [products, setProducts] = useState<ProductOption[]>([]);

  useEffect(() => {
    if (!open || products.length > 0) return;
    let cancelled = false;
    fetch("/api/admin/catalog/products?status=active&sort=createdAt&order=desc&pageSize=100")
      .then((response) => response.json())
      .then((body) => {
        if (cancelled || !body?.success) return;
        setProducts(
          (body.data?.rows ?? []).map((row: ProductOption) => ({
            id: row.id,
            name: row.name,
            sku: row.sku,
            salePrice: row.salePrice,
            stock: row.stock,
          })),
        );
      })
      .catch(() => {
        if (!cancelled) toast.error("Could not load products.");
      });
    return () => {
      cancelled = true;
    };
  }, [open, products.length]);

  const loadVariants = useCallback(async (rowKey: string, productId: string) => {
    if (!productId) return;
    try {
      const response = await fetch(`/api/admin/catalog/products/${productId}`);
      const body = await response.json();
      if (!body?.success) return;
      setItems((current) =>
        current.map((row) =>
          row.key === rowKey
            ? {
                ...row,
                variants: body.data?.variants ?? [],
                variantId: "",
                unitPrice: Number(body.data?.salePrice ?? 0),
              }
            : row,
        ),
      );
    } catch {
      /* variant loading is best-effort; the base product still works */
    }
  }, []);

  const subtotal = useMemo(
    () =>
      items.reduce((sum, row) => {
        const variant = row.variants.find((variant) => variant.id === row.variantId);
        const unit = row.unitPrice + (variant ? Number(variant.additionalPrice) : 0);
        return sum + unit * (Number(row.quantity) || 0);
      }, 0),
    [items],
  );
  const total = Math.max(subtotal - (Number(discount) || 0), 0) + (Number(shippingCharge) || 0);

  async function submit() {
    setSubmitting(true);
    try {
      const payload = {
        customerName,
        customerEmail,
        customerPhone,
        items: items
          .filter((row) => row.productId && Number(row.quantity) > 0)
          .map((row) => ({
            productId: row.productId,
            variantId: row.variantId || null,
            quantity: Number(row.quantity),
          })),
        shippingAddress: {
          fullName: fullName || customerName,
          phone: addressPhone || customerPhone || "0",
          line1,
          ...(line2 ? { line2 } : {}),
          city,
          state: stateName,
          pincode,
          country,
        },
        paymentMethod,
        paymentStatus,
        shippingCharge: Number(shippingCharge) || 0,
        discount: Number(discount) || 0,
        ...(notes ? { notes } : {}),
      };
      const response = await fetch("/api/admin/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await response.json();
      if (!response.ok || !body?.success) {
        toast.error(body?.error?.message ?? "Order could not be created.");
        return;
      }
      toast.success(`Order ${body.data.orderNumber} created.`);
      setOpen(false);
      setItems([EMPTY_ITEM()]);
      setCustomerName("");
      setCustomerEmail("");
      setCustomerPhone("");
      setFullName("");
      setAddressPhone("");
      setLine1("");
      setLine2("");
      setCity("");
      setStateName("");
      setPincode("");
      setNotes("");
      router.refresh();
    } catch {
      toast.error("Order could not be created.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" /> Create order
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create order manually</DialogTitle>
          <DialogDescription>
            Record a phone or offline order. Stock is reserved immediately and the order starts in
            the pending state.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <fieldset className="grid gap-3 rounded-md border p-3">
            <legend className="px-1 text-sm font-medium">Customer</legend>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <Field label="Name *">
                <Input value={customerName} onChange={(event) => setCustomerName(event.target.value)} placeholder="Full name" />
              </Field>
              <Field label="Email *">
                <Input type="email" value={customerEmail} onChange={(event) => setCustomerEmail(event.target.value)} placeholder="name@example.com" />
              </Field>
              <Field label="Phone">
                <Input value={customerPhone} onChange={(event) => setCustomerPhone(event.target.value)} placeholder="Phone" />
              </Field>
            </div>
          </fieldset>

          <fieldset className="grid gap-3 rounded-md border p-3">
            <legend className="px-1 text-sm font-medium">Items</legend>
            {items.map((row, index) => (
              <div key={row.key} className="grid grid-cols-12 items-end gap-2">
                <Field label={index === 0 ? "Product" : undefined} className="col-span-5">
                  <select
                    className={selectClass}
                    value={row.productId}
                    onChange={(event) => {
                      const value = event.target.value;
                      const product = products.find((option) => option.id === value);
                      setItems((current) =>
                        current.map((item) =>
                          item.key === row.key
                            ? {
                                ...item,
                                productId: value,
                                variants: [],
                                variantId: "",
                                unitPrice: Number(product?.salePrice ?? 0),
                              }
                            : item,
                        ),
                      );
                      void loadVariants(row.key, value);
                    }}
                  >
                    <option value="">Select product</option>
                    {products.map((product) => (
                      <option key={product.id} value={product.id}>
                        {product.name} (₹{product.salePrice}, stock {product.stock})
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label={index === 0 ? "Variant" : undefined} className="col-span-4">
                  <select
                    className={selectClass}
                    value={row.variantId}
                    onChange={(event) =>
                      setItems((current) =>
                        current.map((item) =>
                          item.key === row.key ? { ...item, variantId: event.target.value } : item,
                        ),
                      )
                    }
                  >
                    <option value="">{row.variants.length ? "Base product" : "No variants"}</option>
                    {row.variants.map((variant) => (
                      <option key={variant.id} value={variant.id}>
                        {variant.name}: {variant.value} (+₹{variant.additionalPrice}, stock {variant.stock})
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label={index === 0 ? "Qty" : undefined} className="col-span-2">
                  <Input
                    type="number"
                    min="1"
                    value={row.quantity}
                    onChange={(event) =>
                      setItems((current) =>
                        current.map((item) =>
                          item.key === row.key ? { ...item, quantity: event.target.value } : item,
                        ),
                      )
                    }
                  />
                </Field>
                <div className="col-span-1 pb-1">
                  {items.length > 1 ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => setItems((current) => current.filter((item) => item.key !== row.key))}
                      aria-label="Remove item"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  ) : null}
                </div>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-fit"
              onClick={() => setItems((current) => [...current, EMPTY_ITEM()])}
            >
              <Plus className="mr-1 h-4 w-4" /> Add item
            </Button>
            <p className="text-sm text-muted-foreground">
              Subtotal ₹{subtotal.toFixed(2)} · Total ₹{total.toFixed(2)}
            </p>
          </fieldset>

          <fieldset className="grid gap-3 rounded-md border p-3">
            <legend className="px-1 text-sm font-medium">Shipping address</legend>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Recipient name">
                <Input value={fullName} onChange={(event) => setFullName(event.target.value)} placeholder="Defaults to customer name" />
              </Field>
              <Field label="Recipient phone">
                <Input value={addressPhone} onChange={(event) => setAddressPhone(event.target.value)} placeholder="Defaults to customer phone" />
              </Field>
              <Field label="Address line 1 *">
                <Input value={line1} onChange={(event) => setLine1(event.target.value)} />
              </Field>
              <Field label="Address line 2">
                <Input value={line2} onChange={(event) => setLine2(event.target.value)} />
              </Field>
              <Field label="City *">
                <Input value={city} onChange={(event) => setCity(event.target.value)} />
              </Field>
              <Field label="State *">
                <Input value={stateName} onChange={(event) => setStateName(event.target.value)} />
              </Field>
              <Field label="Pincode *">
                <Input value={pincode} onChange={(event) => setPincode(event.target.value)} />
              </Field>
              <Field label="Country *">
                <Input value={country} onChange={(event) => setCountry(event.target.value)} />
              </Field>
            </div>
          </fieldset>

          <fieldset className="grid gap-3 rounded-md border p-3">
            <legend className="px-1 text-sm font-medium">Payment</legend>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Field label="Method">
                <select className={selectClass} value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value)}>
                  <option value="cod">Cash on delivery</option>
                  <option value="razorpay">Razorpay (manual)</option>
                </select>
              </Field>
              <Field label="Payment status">
                <select className={selectClass} value={paymentStatus} onChange={(event) => setPaymentStatus(event.target.value)}>
                  <option value="pending">Pending</option>
                  <option value="paid">Paid</option>
                </select>
              </Field>
              <Field label="Shipping charge (₹)">
                <Input type="number" min="0" step="0.01" value={shippingCharge} onChange={(event) => setShippingCharge(event.target.value)} />
              </Field>
              <Field label="Discount (₹)">
                <Input type="number" min="0" step="0.01" value={discount} onChange={(event) => setDiscount(event.target.value)} />
              </Field>
            </div>
            <Field label="Notes">
              <Textarea value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Optional order notes" rows={2} />
            </Field>
          </fieldset>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button type="button" onClick={submit} disabled={submitting}>
              {submitting ? "Creating…" : "Create order"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
