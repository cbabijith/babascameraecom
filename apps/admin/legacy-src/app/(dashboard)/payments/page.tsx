import { CreditCard, ExternalLink, Landmark, ReceiptIndianRupee } from "lucide-react";
import Link from "next/link";

import { FlashMessage } from "@/components/ui/flash-message";
import { Field, textareaClassName } from "@/components/ui/form-controls";
import { MetricCard } from "@/components/ui/metric-card";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState, InlineNotice, Panel, PanelHeader } from "@/components/ui/panel";
import { StatusBadge } from "@/components/ui/status-badge";
import { SubmitButton } from "@/components/ui/submit-button";
import { reviewBankTransferAction } from "@/lib/actions/workflows";
import { requirePermission } from "@/lib/auth/admin";
import { getBankTransfers, getPayments } from "@/lib/data/admin-queries";
import { formatDate, formatMoney } from "@/lib/utils";

export default async function PaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; error?: string }>;
}) {
  const [params, attempts, transfers] = await Promise.all([
    searchParams,
    getPayments(),
    getBankTransfers(),
    requirePermission("payments"),
  ]);
  const capturedMinor = attempts
    .filter((attempt) => ["captured", "partially_refunded", "refunded"].includes(attempt.status))
    .reduce((sum, attempt) => sum + Number(attempt.amount_minor), 0);
  const pendingTransfers = transfers.filter((transfer) => transfer.status === "pending");
  const failedAttempts = attempts.filter((attempt) => attempt.status === "failed").length;

  return (
    <div className="grid gap-6">
      <PageHeader
        eyebrow="Money operations"
        title="Payments"
        description="Monitor the immutable payment ledger and review customer-submitted bank transfers."
      />
      <FlashMessage success={params.success} error={params.error} />
      <section className="grid gap-4 sm:grid-cols-3">
        <MetricCard label="Captured volume" value={formatMoney(capturedMinor)} icon={CreditCard} />
        <MetricCard
          label="Bank proofs awaiting review"
          value={pendingTransfers.length.toLocaleString("en-IN")}
          icon={Landmark}
          tone={pendingTransfers.length ? "rose" : "emerald"}
        />
        <MetricCard
          label="Failed attempts"
          value={failedAttempts.toLocaleString("en-IN")}
          icon={ReceiptIndianRupee}
          tone={failedAttempts ? "rose" : "emerald"}
        />
      </section>
      <InlineNotice tone="warning">
        Razorpay results are provider-controlled and must only be applied by a verified webhook.
        This dashboard never marks online payments captured manually.
      </InlineNotice>

      <Panel>
        <PanelHeader
          title="Bank-transfer review"
          description="Signed proof links expire after five minutes. Decisions execute atomically."
        />
        {transfers.length ? (
          <div className="divide-y divide-slate-100">
            {transfers.map((transfer) => (
              <details key={transfer.id}>
                <summary className="grid cursor-pointer list-none gap-3 p-5 hover:bg-slate-50 md:grid-cols-[1fr_1fr_auto] md:items-center">
                  <span>
                    <Link
                      href={`/orders/${transfer.order_id}`}
                      className="font-extrabold text-slate-950 hover:text-amber-700"
                    >
                      {transfer.orderNumber}
                    </Link>
                    <span className="mt-1 block text-xs text-slate-500">
                      Ref {transfer.reference_number} · {transfer.account_name}
                    </span>
                  </span>
                  <span>
                    <span className="block font-extrabold text-slate-950">
                      {formatMoney(transfer.amount_minor)}
                    </span>
                    <span className="mt-1 block text-xs text-slate-500">
                      Submitted {formatDate(transfer.submitted_at, true)}
                    </span>
                  </span>
                  <StatusBadge status={transfer.status} />
                </summary>
                <div className="border-t border-slate-100 bg-slate-50/60 p-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="break-all text-xs text-slate-500">{transfer.proof_path}</p>
                    {transfer.proofUrl ? (
                      <a
                        href={transfer.proofUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-800"
                      >
                        Open proof <ExternalLink className="size-4" />
                      </a>
                    ) : (
                      <span className="text-xs font-bold text-rose-600">Proof link unavailable</span>
                    )}
                  </div>
                  {transfer.status === "pending" ? (
                    <form action={reviewBankTransferAction} className="mt-4 grid gap-3">
                      <input type="hidden" name="submission_id" value={transfer.id} />
                      <Field
                        label="Review note"
                        hint="Required when rejecting; approvals may include a reconciliation note."
                      >
                        <textarea
                          className={textareaClassName}
                          name="review_note"
                          maxLength={1000}
                        />
                      </Field>
                      <div className="flex flex-wrap justify-end gap-3">
                        <SubmitButton
                          name="decision"
                          value="reject"
                          variant="danger"
                          pendingLabel="Submitting…"
                        >
                          Reject proof
                        </SubmitButton>
                        <SubmitButton
                          name="decision"
                          value="approve"
                          pendingLabel="Submitting…"
                        >
                          Verify transfer
                        </SubmitButton>
                      </div>
                    </form>
                  ) : transfer.review_note ? (
                    <p className="mt-4 text-sm text-slate-600">{transfer.review_note}</p>
                  ) : null}
                </div>
              </details>
            ))}
          </div>
        ) : (
          <EmptyState
            title="No bank-transfer submissions"
            description="Customer proofs will appear here for controlled review."
            icon={<Landmark className="size-5" />}
          />
        )}
      </Panel>

      <Panel>
        <PanelHeader title="Payment attempts" description="Provider and COD attempt ledger." />
        {attempts.length ? (
          <div className="overflow-x-auto">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Provider</th>
                  <th>Status</th>
                  <th className="text-right">Amount</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                {attempts.map((attempt) => (
                  <tr key={attempt.id}>
                    <td>
                      <Link
                        href={`/orders/${attempt.order_id}`}
                        className="font-extrabold text-slate-950 hover:text-amber-700"
                      >
                        {attempt.orderNumber}
                      </Link>
                    </td>
                    <td>
                      <StatusBadge status={attempt.provider} />
                    </td>
                    <td>
                      <StatusBadge status={attempt.status} />
                    </td>
                    <td className="text-right font-extrabold text-slate-950">
                      {formatMoney(attempt.amount_minor)}
                    </td>
                    <td className="text-xs text-slate-500">
                      {formatDate(attempt.created_at, true)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            title="No payment attempts"
            description="Payment attempts are created from authoritative checkout sessions."
            icon={<CreditCard className="size-5" />}
          />
        )}
      </Panel>
    </div>
  );
}
