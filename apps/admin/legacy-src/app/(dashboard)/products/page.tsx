import { ArrowRight, Plus, Search, ShoppingBag } from "lucide-react";
import Link from "next/link";

import { FlashMessage } from "@/components/ui/flash-message";
import { inputClassName } from "@/components/ui/form-controls";
import { HeaderLink, PageHeader } from "@/components/ui/page-header";
import { EmptyState, Panel } from "@/components/ui/panel";
import { StatusBadge } from "@/components/ui/status-badge";
import { getProducts } from "@/lib/data/admin-queries";
import { formatMoney } from "@/lib/utils";

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; success?: string; error?: string }>;
}) {
  const params = await searchParams;
  const products = await getProducts({ q: params.q, status: params.status });

  return (
    <div className="grid gap-6">
      <PageHeader
        eyebrow="Catalogue"
        title="Products"
        description="Manage customer-facing product information, variants, pricing, and availability."
        action={
          <HeaderLink href="/products/new">
            <Plus className="size-4" />
            New product
          </HeaderLink>
        }
      />
      <FlashMessage success={params.success} error={params.error} />
      <Panel>
        <form
          method="get"
          className="grid gap-3 border-b border-slate-100 p-4 sm:grid-cols-[minmax(15rem,1fr)_12rem_auto]"
        >
          <label className="relative">
            <span className="sr-only">Search products</span>
            <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <input
              className={`${inputClassName} pl-10`}
              type="search"
              name="q"
              defaultValue={params.q}
              placeholder="Name, SKU or code…"
            />
          </label>
          <select className={inputClassName} name="status" defaultValue={params.status ?? ""}>
            <option value="">All statuses</option>
            <option value="draft">Draft</option>
            <option value="active">Active</option>
            <option value="archived">Archived</option>
          </select>
          <button className="min-h-11 rounded-xl bg-slate-950 px-5 text-sm font-bold text-white">
            Filter
          </button>
        </form>
        {products.length ? (
          <div className="overflow-x-auto">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Brand / category</th>
                  <th>Variants</th>
                  <th>Stock</th>
                  <th>Status</th>
                  <th className="text-right">From</th>
                  <th aria-label="Edit product" />
                </tr>
              </thead>
              <tbody>
                {products.map((product) => (
                  <tr key={product.id}>
                    <td>
                      <Link
                        href={`/products/${product.id}`}
                        className="font-extrabold text-slate-950 hover:text-amber-700"
                      >
                        {product.name}
                      </Link>
                      <span className="mt-1 block text-xs font-medium text-slate-500">
                        {product.code}
                      </span>
                    </td>
                    <td>
                      <span className="block font-bold text-slate-800">{product.brandName}</span>
                      <span className="mt-1 block text-xs text-slate-500">{product.categoryName}</span>
                    </td>
                    <td className="font-bold text-slate-700">{product.variantCount}</td>
                    <td>
                      <span
                        className={
                          product.availableQuantity <= 0
                            ? "font-extrabold text-rose-600"
                            : "font-extrabold text-slate-800"
                        }
                      >
                        {product.availableQuantity}
                      </span>
                    </td>
                    <td>
                      <div className="flex flex-wrap gap-1.5">
                        <StatusBadge status={product.status} />
                        <StatusBadge status={product.visibility} />
                      </div>
                    </td>
                    <td className="text-right font-extrabold text-slate-950">
                      {product.defaultVariant
                        ? formatMoney(product.defaultVariant.price_minor)
                        : "—"}
                    </td>
                    <td>
                      <Link
                        href={`/products/${product.id}`}
                        className="grid size-9 place-items-center rounded-xl border border-slate-200 text-slate-500 hover:border-amber-300 hover:bg-amber-50 hover:text-amber-800"
                      >
                        <ArrowRight className="size-4" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            title="No matching products"
            description="Create the first catalogue product or change the current filters."
            icon={<ShoppingBag className="size-5" />}
          />
        )}
      </Panel>
    </div>
  );
}
