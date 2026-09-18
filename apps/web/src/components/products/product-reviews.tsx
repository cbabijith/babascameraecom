"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Star } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

interface ReviewRow {
  _id: string;
  rating: number;
  title: string | null;
  body: string | null;
  createdAt: string | null;
  reviewerName: string;
}

interface ProductReviewsProps {
  productId: string;
  productSlug: string;
  averageRating: number;
  reviewCount: number;
}

function Stars({ value }: { value: number }) {
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${value} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={`h-4 w-4 ${i <= Math.round(value) ? "fill-amber-400 text-amber-400" : "text-gray-300"}`}
        />
      ))}
    </span>
  );
}

export default function ProductReviews({
  productId,
  productSlug,
  averageRating,
  reviewCount,
}: ProductReviewsProps) {
  const [reviews, setReviews] = useState<ReviewRow[] | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/storefront/reviews?productId=${encodeURIComponent(productId)}`,
        { credentials: "same-origin" },
      );
      const data = await res.json().catch(() => null);
      if (res.ok && data?.success && Array.isArray(data.data)) {
        setReviews(data.data as ReviewRow[]);
      } else {
        setReviews([]);
      }
    } catch {
      setReviews([]);
    }
  }, [productId]);

  useEffect(() => {
    void load();
  }, [load]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    if (!body.trim()) {
      toast.error("Please write a few words about the product.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/storefront/reviews", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId,
          productSlug,
          rating,
          title: title.trim(),
          body: body.trim(),
        }),
      });
      const data = await res.json().catch(() => null);
      if (res.status === 401) {
        toast.error("Please sign in to write a review.");
        window.location.href = `/login?next=${encodeURIComponent(`/products/${productSlug}#reviews`)}`;
        return;
      }
      if (!res.ok || !data?.success) {
        toast.error(data?.message || "Your review could not be submitted.");
        return;
      }
      setSubmitted(true);
      setShowForm(false);
      toast.success("Thank you!", {
        description: data.message || "Your review was submitted for moderation.",
      });
    } catch {
      toast.error("Your review could not be submitted. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section id="reviews" className="mt-12 scroll-mt-24">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <h2 className="text-xl font-[650] text-gray-900">
          Reviews
          {reviewCount > 0 ? (
            <span className="ml-2 text-sm font-normal text-gray-500">
              {averageRating.toFixed(1)} avg · {reviewCount} review{reviewCount === 1 ? "" : "s"}
            </span>
          ) : null}
        </h2>
        {submitted ? (
          <span className="text-sm text-emerald-700 font-medium">
            Your review is awaiting moderation.
          </span>
        ) : (
          <Button
            variant="outline"
            className="rounded-full border-red-600 text-red-600 hover:bg-red-50"
            onClick={() => setShowForm((v) => !v)}
          >
            {showForm ? "Close" : "Write a review"}
          </Button>
        )}
      </div>

      {showForm ? (
        <form
          onSubmit={submit}
          className="mb-6 rounded-xl border border-gray-200 bg-white p-4 sm:p-5 space-y-4"
        >
          <div>
            <span className="block text-sm font-semibold mb-2">Your rating</span>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((i) => (
                <button
                  key={i}
                  type="button"
                  aria-label={`${i} star${i === 1 ? "" : "s"}`}
                  onClick={() => setRating(i)}
                  className="p-1"
                >
                  <Star
                    className={`h-6 w-6 ${i <= rating ? "fill-amber-400 text-amber-400" : "text-gray-300 hover:text-amber-300"}`}
                  />
                </button>
              ))}
            </div>
          </div>
          <div>
            <label htmlFor="review-title" className="block text-sm font-semibold mb-1">
              Title <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <input
              id="review-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={100}
              className="h-11 w-full rounded-lg border border-gray-300 px-3"
              placeholder="Sum it up in a line"
            />
          </div>
          <div>
            <label htmlFor="review-body" className="block text-sm font-semibold mb-1">
              Your review
            </label>
            <textarea
              id="review-body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              maxLength={2000}
              rows={4}
              className="w-full rounded-lg border border-gray-300 p-3"
              placeholder="What did you like or dislike? How is the build and performance?"
            />
          </div>
          <Button
            type="submit"
            className="rounded-full bg-red-600 text-white hover:bg-red-700 h-11 px-6"
            disabled={submitting}
          >
            {submitting ? "Submitting…" : "Submit review"}
          </Button>
          <p className="text-xs text-gray-500">
            Reviews are checked by our team before they appear on the site.
          </p>
        </form>
      ) : null}

      {reviews === null ? (
        <div className="text-sm text-gray-400 py-4">Loading reviews…</div>
      ) : reviews.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-200 p-6 text-center text-sm text-gray-500">
          No reviews yet{reviewCount > 0 ? " for this product" : ""}. Be the first to share your experience.
        </div>
      ) : (
        <div className="space-y-4">
          {reviews.map((review) => (
            <article key={review._id} className="rounded-xl border border-gray-200 bg-white p-4">
              <div className="flex items-center justify-between gap-3 mb-2">
                <div className="flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-sm font-semibold text-gray-600">
                    {(review.reviewerName || "C").charAt(0).toUpperCase()}
                  </span>
                  <span className="text-sm font-semibold text-gray-800">{review.reviewerName}</span>
                </div>
                <Stars value={review.rating} />
              </div>
              {review.title ? (
                <h3 className="text-sm font-semibold text-gray-900 mb-1">{review.title}</h3>
              ) : null}
              {review.body ? (
                <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">{review.body}</p>
              ) : null}
              {review.createdAt ? (
                <p className="mt-2 text-xs text-gray-400">
                  {new Date(review.createdAt).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </p>
              ) : null}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
