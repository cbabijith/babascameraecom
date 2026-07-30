"use client";

import Link from "next/link";
import { useState } from "react";
import { Star } from "lucide-react";
import {
  Button,
  Input,
  Label,
  Textarea,
} from "@babascamera/ui";
import { submitReviewAction } from "@/app/actions/reviews";
import { ActionForm } from "@/components/action-form";
import { formatDate } from "@/lib/format";

interface Review {
  id: string;
  rating: number;
  title: string | null;
  body: string | null;
  createdAt: Date;
  customerName: string | null;
}

type CurrentReview = {
  rating: number;
  title: string | null;
  body: string | null;
  isApproved: boolean;
} | null;

export function ProductTabs({
  product,
  description,
  reviews,
  currentReview,
  signedIn,
}: {
  product: {
    id: string;
    slug: string;
    sku: string;
    brandName: string | null;
    categoryName: string | null;
    weight: string | null;
    variants: { id: string; name: string; value: string }[];
    averageRating: number;
    reviewCount: number;
  };
  description: string;
  reviews: Review[];
  currentReview: CurrentReview;
  signedIn: boolean;
}) {
  const [tab, setTab] = useState<"description" | "specs" | "reviews">(
    "description",
  );
  const tabs = [
    ["description", "Description"],
    ["specs", "Specifications"],
    ["reviews", `Reviews (${product.reviewCount})`],
  ] as const;

  return (
    <section className="mt-14">
      <div role="tablist" className="flex border-b border-slate-200">
        {tabs.map(([value, label]) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={tab === value}
            onClick={() => setTab(value)}
            className={`border-b-2 px-4 py-3 text-sm font-semibold ${
              tab === value
                ? "border-[#E94560] text-[#E94560]"
                : "border-transparent text-slate-500"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "description" ? (
        <div role="tabpanel" className="prose prose-slate max-w-4xl py-7">
          {description ? (
            <div dangerouslySetInnerHTML={{ __html: description }} />
          ) : (
            <p>More product details will be added soon.</p>
          )}
        </div>
      ) : null}

      {tab === "specs" ? (
        <div role="tabpanel" className="max-w-3xl py-7">
          <dl className="divide-y divide-slate-200 rounded-xl border border-slate-200">
            {[
              ["SKU", product.sku],
              ["Brand", product.brandName ?? "—"],
              ["Category", product.categoryName ?? "—"],
              [
                "Weight",
                product.weight ? `${product.weight} kg` : "Not specified",
              ],
            ].map(([label, value]) => (
              <div
                key={label}
                className="grid grid-cols-[9rem_1fr] gap-4 px-4 py-3 text-sm"
              >
                <dt className="font-semibold text-slate-500">{label}</dt>
                <dd className={label === "SKU" ? "font-mono" : ""}>
                  {value}
                </dd>
              </div>
            ))}
            {product.variants.map((variant) => (
              <div
                key={variant.id}
                className="grid grid-cols-[9rem_1fr] gap-4 px-4 py-3 text-sm"
              >
                <dt className="font-semibold text-slate-500">
                  {variant.name}
                </dt>
                <dd>{variant.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      ) : null}

      {tab === "reviews" ? (
        <div role="tabpanel" id="reviews" className="grid gap-8 py-7 lg:grid-cols-[1fr_22rem]">
          <div>
            <div className="flex items-center gap-3">
              <span className="text-3xl font-bold">
                {product.reviewCount
                  ? product.averageRating.toFixed(1)
                  : "—"}
              </span>
              <span>
                <span className="flex">
                  {[1, 2, 3, 4, 5].map((value) => (
                    <Star
                      key={value}
                      className={`h-4 w-4 ${
                        value <= Math.round(product.averageRating)
                          ? "fill-amber-400 text-amber-400"
                          : "text-slate-300"
                      }`}
                    />
                  ))}
                </span>
                <span className="text-sm text-slate-500">
                  {product.reviewCount} approved reviews
                </span>
              </span>
            </div>
            <div className="mt-6 space-y-5">
              {reviews.length ? (
                reviews.map((review) => (
                  <article
                    key={review.id}
                    className="rounded-xl border border-slate-200 p-5"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-semibold">
                          {review.customerName ?? "Customer"}
                        </p>
                        <p className="text-xs text-slate-500">
                          {formatDate(review.createdAt)}
                        </p>
                      </div>
                      <span className="flex items-center gap-1 text-sm font-semibold">
                        <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                        {review.rating}
                      </span>
                    </div>
                    {review.title ? (
                      <h3 className="mt-3 font-semibold">{review.title}</h3>
                    ) : null}
                    {review.body ? (
                      <p className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-600">
                        {review.body}
                      </p>
                    ) : null}
                  </article>
                ))
              ) : (
                <p className="rounded-xl bg-slate-50 p-5 text-sm text-slate-500">
                  No approved reviews yet.
                </p>
              )}
            </div>
          </div>
          <aside className="h-fit rounded-xl border border-slate-200 p-5">
            <h2 className="text-lg font-bold">
              {currentReview ? "Update your review" : "Write a review"}
            </h2>
            {signedIn ? (
              <ActionForm
                action={submitReviewAction}
                className="mt-4 space-y-4"
                showMessage
              >
                <input type="hidden" name="productId" value={product.id} />
                <input type="hidden" name="productSlug" value={product.slug} />
                <div>
                  <Label htmlFor="review-rating">Rating</Label>
                  <select
                    id="review-rating"
                    name="rating"
                    required
                    defaultValue={currentReview?.rating ?? 5}
                    className="mt-2 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm"
                  >
                    {[5, 4, 3, 2, 1].map((rating) => (
                      <option key={rating} value={rating}>
                        {rating} {rating === 1 ? "star" : "stars"}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label htmlFor="review-title">Title</Label>
                  <Input
                    id="review-title"
                    name="title"
                    maxLength={100}
                    defaultValue={currentReview?.title ?? ""}
                    className="mt-2"
                  />
                </div>
                <div>
                  <Label htmlFor="review-body">Review</Label>
                  <Textarea
                    id="review-body"
                    name="body"
                    maxLength={2000}
                    rows={5}
                    defaultValue={currentReview?.body ?? ""}
                    className="mt-2"
                  />
                </div>
                {currentReview && !currentReview.isApproved ? (
                  <p className="text-xs text-amber-700">
                    Your latest review is awaiting approval.
                  </p>
                ) : null}
                <Button
                  type="submit"
                  className="w-full bg-[#E94560] hover:bg-[#D63852]"
                >
                  Submit for approval
                </Button>
              </ActionForm>
            ) : (
              <p className="mt-3 text-sm text-slate-600">
                <Link
                  href={`/auth/login?next=${encodeURIComponent(`/products/${product.slug}#reviews`)}`}
                  className="font-semibold text-[#E94560]"
                >
                  Sign in
                </Link>{" "}
                to share your experience.
              </p>
            )}
          </aside>
        </div>
      ) : null}
    </section>
  );
}
