"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Button, Form, toast } from "@babascamera/ui";
import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import {
  deleteOrderAction,
  updateOrderStatusAction,
  updatePaymentStatusAction,
} from "@/lib/actions/orders";
import { refundOrderAction } from "@/lib/actions/refunds";
import {
  AdminInputField,
  AdminSelectField,
  AdminTextareaField,
} from "@/components/admin-form-field";

const transitionSchema = z.object({
  toStatus: z.string().min(1),
  note: z.string().max(500),
  carrier: z.string().max(100),
  trackingNumber: z.string().max(150),
  trackingUrl: z.string(),
});
type TransitionValues = z.infer<typeof transitionSchema>;

export function OrderTransitionForm({
  orderId,
  currentStatus,
  allowed,
}: {
  orderId: string;
  currentStatus: string;
  allowed: readonly string[];
}) {
  const form = useForm<TransitionValues>({
    resolver: zodResolver(transitionSchema),
    defaultValues: { toStatus: allowed[0] ?? "", note: "", carrier: "", trackingNumber: "", trackingUrl: "" },
  });

  useEffect(() => {
    form.reset({
      toStatus: allowed[0] ?? "",
      note: "",
      carrier: "",
      trackingNumber: "",
      trackingUrl: "",
    });
  }, [currentStatus, allowed, form]);

  const next = form.watch("toStatus");
  const submit = form.handleSubmit(async (values) => {
    if (!window.confirm(`Move this order from ${currentStatus} to ${values.toStatus}?`)) return;
    const payload = new FormData();
    payload.set("orderId", orderId);
    Object.entries(values).forEach(([key, value]) => payload.set(key, value));
    try {
      const result = await updateOrderStatusAction(payload);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success(`Order moved to ${values.toStatus}.`);
    } catch (error) {
      console.error("Order status request failed.", error);
      toast.error("Order status could not be updated.");
    }
  });
  if (!allowed.length) return <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">This order is in a final state.</p>;
  return (
    <Form {...form}>
      <form onSubmit={submit} className="grid gap-4">
        <AdminSelectField name="toStatus" label="Next status">
          {allowed.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </AdminSelectField>
        {next === "shipped" ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <AdminInputField name="carrier" label="Carrier" inputProps={{ required: true }} />
            <AdminInputField name="trackingNumber" label="Tracking number" inputProps={{ required: true }} />
            <AdminInputField name="trackingUrl" label="Tracking URL" className="sm:col-span-2" inputProps={{ type: "url" }} />
          </div>
        ) : null}
        <AdminTextareaField name="note" label="Internal note" />
        <Button type="submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? "Updating…" : "Update order status"}
        </Button>
      </form>
    </Form>
  );
}

export function RefundForm({ orderId }: { orderId: string }) {
  const form = useForm<{ reason: string }>({ defaultValues: { reason: "" } });
  const submit = form.handleSubmit(async (values) => {
    if (!window.confirm("Issue a full Razorpay refund? This provider action cannot be undone.")) return;
    const payload = new FormData();
    payload.set("orderId", orderId);
    payload.set("reason", values.reason);
    try {
      const result = await refundOrderAction(payload);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success("Refund request reconciled with Razorpay.");
    } catch (error) {
      console.error("Refund request failed.", error);
      toast.error("Refund request failed.");
    }
  });
  return (
    <Form {...form}>
      <form onSubmit={submit} className="grid gap-3">
        <AdminTextareaField name="reason" label="Refund reason" textareaProps={{ placeholder: "Reason shown in the audit timeline" }} />
        <Button variant="destructive" type="submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? "Refunding…" : "Issue full refund"}
        </Button>
      </form>
    </Form>
  );
}

const paymentStatusFormSchema = z.object({
  paymentStatus: z.enum(["pending", "paid", "failed", "refunded"]),
  note: z.string().max(500),
});
type PaymentStatusValues = z.infer<typeof paymentStatusFormSchema>;

export function PaymentStatusForm({
  orderId,
  currentPaymentStatus,
  isCancelled,
}: {
  orderId: string;
  currentPaymentStatus: string;
  isCancelled?: boolean;
}) {
  const form = useForm<PaymentStatusValues>({
    resolver: zodResolver(paymentStatusFormSchema),
    defaultValues: {
      paymentStatus: (currentPaymentStatus as PaymentStatusValues["paymentStatus"]) ?? "pending",
      note: "",
    },
  });

  useEffect(() => {
    form.reset({
      paymentStatus: (currentPaymentStatus as PaymentStatusValues["paymentStatus"]) ?? "pending",
      note: "",
    });
  }, [currentPaymentStatus, form]);

  const submit = form.handleSubmit(async (values) => {
    if (
      !window.confirm(
        `Change payment status from ${currentPaymentStatus} to ${values.paymentStatus}?`,
      )
    )
      return;
    const payload = new FormData();
    payload.set("orderId", orderId);
    payload.set("paymentStatus", values.paymentStatus);
    if (values.note) payload.set("note", values.note);

    try {
      const result = await updatePaymentStatusAction(payload);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success(`Payment status updated to ${values.paymentStatus}.`);
    } catch (error) {
      console.error("Payment status update failed.", error);
      toast.error("Payment status could not be updated.");
    }
  });

  const availablePaymentStatuses: { value: string; label: string }[] = [
    { value: "pending", label: "Pending" },
    { value: "paid", label: "Paid" },
    { value: "failed", label: "Failed" },
    { value: "refunded", label: "Refunded" },
  ];

  return (
    <Form {...form}>
      <form onSubmit={submit} className="grid gap-4">
        {isCancelled && currentPaymentStatus !== "refunded" ? (
          <div className="rounded-lg bg-amber-50 p-3 text-xs text-amber-900 border border-amber-200">
            <b>Note:</b> This order is cancelled. You can update payment status to <b>refunded</b> after manual or offline payment processing.
          </div>
        ) : null}
        <AdminSelectField name="paymentStatus" label="Payment status">
          {availablePaymentStatuses.map((st) => (
            <option key={st.value} value={st.value}>
              {st.label}
            </option>
          ))}
        </AdminSelectField>
        <AdminTextareaField name="note" label="Internal note" textareaProps={{ placeholder: "Optional note for timeline audit" }} />
        <div className="flex flex-wrap items-center gap-2">
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? "Updating…" : "Update payment status"}
          </Button>
          {isCancelled && currentPaymentStatus !== "refunded" ? (
            <Button
              type="button"
              variant="outline"
              className="border-rose-300 text-rose-700 hover:bg-rose-50 hover:text-rose-800"
              disabled={form.formState.isSubmitting}
              onClick={() => {
                form.setValue("paymentStatus", "refunded");
              }}
            >
              Mark as Refunded
            </Button>
          ) : null}
        </div>
      </form>
    </Form>
  );
}

export function DeleteOrderButton({
  orderId,
  orderNumber,
  redirectToOrders = false,
}: {
  orderId: string;
  orderNumber: string;
  redirectToOrders?: boolean;
}) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (
      !window.confirm(
        `Are you sure you want to permanently delete order ${orderNumber}? This will remove the order, items, status history, and cannot be undone.`
      )
    ) {
      return;
    }

    setIsDeleting(true);
    const payload = new FormData();
    payload.set("orderId", orderId);

    try {
      const result = await deleteOrderAction(payload);
      if (!result.success) {
        toast.error(result.error);
        setIsDeleting(false);
        return;
      }
      toast.success(`Order ${orderNumber} deleted successfully.`);
      if (redirectToOrders) {
        router.push("/orders");
      } else {
        router.refresh();
      }
    } catch (error) {
      console.error("Order deletion request failed:", error);
      toast.error("Order could not be deleted.");
      setIsDeleting(false);
    }
  };

  return (
    <Button
      type="button"
      variant="destructive"
      size="sm"
      className="gap-2 bg-rose-600 text-white hover:bg-rose-700"
      disabled={isDeleting}
      onClick={handleDelete}
    >
      <Trash2 className="size-4" />
      {isDeleting ? "Deleting…" : "Delete Order"}
    </Button>
  );
}
