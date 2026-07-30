"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { Button, toast } from "@babascamera/ui";
import { useMemo, useState, useTransition } from "react";

import { DataTable } from "@/components/data-table";
import { StatusBadge } from "@/components/status-badge";
import { deleteReviewAction, setReviewApprovalAction } from "@/lib/actions/operations";
import { formatDate } from "@/lib/utils";

interface ReviewRow {
  id: string;
  rating: number;
  title: string | null;
  body: string | null;
  isApproved: boolean;
  productName: string;
  customerName: string;
  createdAt: string;
}

function ReviewActions({ review }: { review: ReviewRow }) {
  const [pending, startTransition] = useTransition();
  const run = (action: "approval" | "delete") => {
    const prompt = action === "delete"
      ? "Permanently delete this review?"
      : `${review.isApproved ? "Hide" : "Approve"} this review?`;
    if (!window.confirm(prompt)) return;
    startTransition(async () => {
      const payload = new FormData();
      payload.set("id", review.id);
      try {
        if (action === "delete") {
          const result = await deleteReviewAction(payload);
          if (!result.success) {
            toast.error(result.error);
            return;
          }
          toast.success("Review deleted.");
        } else {
          payload.set("isApproved", review.isApproved ? "false" : "true");
          const result = await setReviewApprovalAction(payload);
          if (!result.success) {
            toast.error(result.error);
            return;
          }
          toast.success(review.isApproved ? "Review hidden." : "Review approved.");
        }
      } catch {
        toast.error("Review could not be updated.");
      }
    });
  };
  return (
    <div className="flex gap-2">
      <Button type="button" onClick={() => run("approval")} disabled={pending} size="sm" variant="outline">
        {review.isApproved ? "Hide" : "Approve"}
      </Button>
      <Button type="button" onClick={() => run("delete")} disabled={pending} size="sm" variant="destructive">
        Delete
      </Button>
    </div>
  );
}

const columns: ColumnDef<ReviewRow>[] = [
  { accessorKey: "productName", header: "Product", cell: ({ row }) => <div><b>{row.original.productName}</b><p className="text-xs text-slate-500">by {row.original.customerName}</p></div> },
  { accessorKey: "rating", header: "Rating", cell: ({ row }) => <span className="text-amber-500">{"★".repeat(row.original.rating)}<span className="text-slate-200">{"★".repeat(5 - row.original.rating)}</span></span> },
  { accessorKey: "title", header: "Review", cell: ({ row }) => <div className="max-w-md"><b>{row.original.title ?? "Untitled"}</b><p className="line-clamp-2 text-xs text-slate-500">{row.original.body ?? "No written feedback."}</p></div> },
  { accessorKey: "isApproved", header: "Status", cell: ({ row }) => <StatusBadge status={row.original.isApproved ? "approved" : "pending"} /> },
  { accessorKey: "createdAt", header: "Submitted", cell: ({ row }) => formatDate(row.original.createdAt, true) },
  {
    id: "actions",
    cell: ({ row }) => <ReviewActions review={row.original} />,
  },
];

export function ReviewTable({ data }: { data: ReviewRow[] }) {
  const [status, setStatus] = useState("all");
  const [rating, setRating] = useState("all");
  const filtered = useMemo(() => data.filter((item) => (
    (status === "all" || item.isApproved === (status === "approved")) &&
    (rating === "all" || item.rating === Number(rating))
  )), [data, rating, status]);
  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap justify-end gap-2">
        <select className="h-10 rounded-md border bg-white px-3 text-sm" value={status} onChange={(event) => setStatus(event.target.value)}><option value="all">All reviews</option><option value="pending">Pending</option><option value="approved">Approved</option></select>
        <select className="h-10 rounded-md border bg-white px-3 text-sm" value={rating} onChange={(event) => setRating(event.target.value)} aria-label="Filter by rating">
          <option value="all">All ratings</option>
          {[5, 4, 3, 2, 1].map((value) => <option key={value} value={value}>{value} stars</option>)}
        </select>
      </div>
      <DataTable columns={columns} data={filtered} searchPlaceholder="Search product, customer, or review…" />
    </div>
  );
}
