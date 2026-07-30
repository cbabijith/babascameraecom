"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Button, Form, toast } from "@babascamera/ui";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { updateOrderStatusAction } from "@/lib/actions/orders";
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
          {allowed.map((status) => <option key={status}>{status}</option>)}
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
