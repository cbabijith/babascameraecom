"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Button, Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, Form, toast } from "@babascamera/ui";
import { Pencil, Plus, Power } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import {
  AdminCheckboxField,
  AdminInputField,
  AdminSelectField,
} from "@/components/admin-form-field";
import { StatusBadge } from "@/components/status-badge";
import { formatMoney } from "@/lib/money";
import { formatDate } from "@/lib/utils";

import { deleteCouponAction, saveCouponAction } from "../server/actions";

interface Coupon {
  id: string;
  code: string;
  type: "percentage" | "flat";
  value: string;
  minOrderAmount: string;
  maxDiscount: string | null;
  usageLimit: number | null;
  usedCount: number;
  expiresAt: string | null;
  isActive: boolean;
}
const money = /^\d+(?:\.\d{1,2})?$/;
const schema = z.object({
  code: z.string().trim().min(2).max(40),
  type: z.enum(["percentage", "flat"]),
  value: z.string().regex(money),
  minOrderAmount: z.string().regex(money),
  maxDiscount: z.string().refine((value) => value === "" || money.test(value)),
  usageLimit: z.string().refine((value) => value === "" || /^\d+$/.test(value)),
  expiresAt: z.string(),
  isActive: z.boolean(),
});
type Values = z.infer<typeof schema>;

export function CouponManager({ coupons }: { coupons: Coupon[] }) {
  const [editing, setEditing] = useState<Coupon | null | undefined>();
  const form = useForm<Values>({ resolver: zodResolver(schema) });
  const open = (item: Coupon | null) => {
    setEditing(item);
    form.reset({
      code: item?.code ?? "",
      type: item?.type ?? "percentage",
      value: item?.value ?? "",
      minOrderAmount: item?.minOrderAmount ?? "0.00",
      maxDiscount: item?.maxDiscount ?? "",
      usageLimit: item?.usageLimit?.toString() ?? "",
      expiresAt: item?.expiresAt?.slice(0, 16) ?? "",
      isActive: item?.isActive ?? true,
    });
  };
  const submit = form.handleSubmit(async (values) => {
    const payload = new FormData();
    if (editing) payload.set("id", editing.id);
    Object.entries(values).forEach(([key, value]) => payload.set(key, String(value)));
    try {
      const result = await saveCouponAction(payload);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success("Coupon saved.");
      setEditing(undefined);
    } catch {
      toast.error("Coupon could not be saved.");
    }
  });
  return (
    <>
      <div className="flex justify-end"><Button onClick={() => open(null)}><Plus className="size-4" /> Create coupon</Button></div>
      <div className="overflow-hidden rounded-2xl border bg-white">
        {coupons.map((item) => (
          <div key={item.id} className="flex flex-wrap items-center gap-4 border-b p-4 last:border-0">
            <div className="min-w-44 flex-1"><b className="text-lg">{item.code}</b><p className="text-xs text-slate-500">{item.type === "percentage" ? `${item.value}%` : formatMoney(item.value)} off · minimum {formatMoney(item.minOrderAmount)}</p></div>
            <div className="text-sm"><b>{item.usedCount}</b> / {item.usageLimit ?? "∞"} uses<p className="text-xs text-slate-500">{item.expiresAt ? `Expires ${formatDate(item.expiresAt)}` : "No expiry"}</p></div>
            <StatusBadge status={item.isActive ? "active" : "inactive"} />
            <Button size="sm" variant="outline" onClick={() => open(item)}><Pencil className="size-4" /> Edit</Button>
            {item.isActive ? (
              <Button
                size="sm"
                variant="ghost"
                type="button"
                onClick={async () => {
                  if (!window.confirm(`Disable coupon ${item.code}?`)) return;
                  const payload = new FormData();
                  payload.set("id", item.id);
                  try {
                    const result = await deleteCouponAction(payload);
                    if (!result.success) {
                      toast.error(result.error);
                      return;
                    }
                    toast.success("Coupon disabled.");
                  } catch {
                    toast.error("Coupon could not be disabled.");
                  }
                }}
              >
                <Power className="size-4" /> Disable
              </Button>
            ) : null}
          </div>
        ))}
        {!coupons.length ? <p className="p-10 text-center text-slate-500">No coupons configured.</p> : null}
      </div>
      <Dialog open={editing !== undefined} onOpenChange={(value) => { if (!value) setEditing(undefined); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? "Edit coupon" : "New coupon"}</DialogTitle><DialogDescription>Coupon rules are validated again on the server.</DialogDescription></DialogHeader>
          <Form {...form}>
            <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
              <AdminInputField name="code" label="Code" />
              <AdminSelectField name="type" label="Type">
                <option value="percentage">Percentage</option>
                <option value="flat">Flat amount</option>
              </AdminSelectField>
              <AdminInputField name="value" label="Value" inputProps={{ inputMode: "decimal" }} />
              <AdminInputField name="minOrderAmount" label="Minimum order" inputProps={{ inputMode: "decimal" }} />
              <AdminInputField name="maxDiscount" label="Maximum discount" inputProps={{ inputMode: "decimal" }} />
              <AdminInputField name="usageLimit" label="Usage limit" inputProps={{ inputMode: "numeric" }} />
              <AdminInputField name="expiresAt" label="Expires at" className="sm:col-span-2" inputProps={{ type: "datetime-local" }} />
              <AdminCheckboxField name="isActive" label="Active" />
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? "Saving…" : "Save coupon"}
              </Button>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  );
}
