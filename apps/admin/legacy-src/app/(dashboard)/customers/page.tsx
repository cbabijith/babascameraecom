import { Search, ShieldCheck, UserRoundCog, Users } from "lucide-react";

import { FlashMessage } from "@/components/ui/flash-message";
import { Field, inputClassName } from "@/components/ui/form-controls";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState, InlineNotice, Panel, PanelHeader } from "@/components/ui/panel";
import { StatusBadge } from "@/components/ui/status-badge";
import { SubmitButton } from "@/components/ui/submit-button";
import {
  changeAccountStatusAction,
  changeUserRoleAction,
} from "@/lib/actions/workflows";
import { hasAnyRole, requirePermission } from "@/lib/auth/admin";
import { getCustomers } from "@/lib/data/admin-queries";
import { formatDate, formatMoney } from "@/lib/utils";

const staffRoles = [
  "support",
  "catalog_manager",
  "inventory_manager",
  "order_manager",
  "admin",
  "super_admin",
] as const;

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; success?: string; error?: string }>;
}) {
  const [params, admin] = await Promise.all([
    searchParams,
    requirePermission("customers"),
  ]);
  const customers = await getCustomers(params.q);
  const canManageRoles = hasAnyRole(admin, ["super_admin"]);
  const canManageAccounts = hasAnyRole(admin, ["admin", "super_admin"]);

  return (
    <div className="grid gap-6">
      <PageHeader
        eyebrow="Identity & access"
        title="Customers and roles"
        description="Review customer activity and manage staff access through guarded role functions."
      />
      <FlashMessage success={params.success} error={params.error} />
      {!canManageRoles && !canManageAccounts ? (
        <InlineNotice>
          Customer records are read-only for your role. Administrators manage account status,
          while only a super administrator can grant staff access.
        </InlineNotice>
      ) : null}
      <Panel>
        <form method="get" className="flex gap-3 border-b border-slate-100 p-4">
          <label className="relative min-w-0 flex-1">
            <span className="sr-only">Search customers</span>
            <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <input
              className={`${inputClassName} pl-10`}
              type="search"
              name="q"
              defaultValue={params.q}
              placeholder="Name, email or phone…"
            />
          </label>
          <button className="rounded-xl bg-slate-950 px-5 text-sm font-bold text-white">
            Search
          </button>
        </form>
        <PanelHeader
          title="Accounts"
          description={`${customers.length} matching account${customers.length === 1 ? "" : "s"}.`}
        />
        {customers.length ? (
          <div className="divide-y divide-slate-100">
            {customers.map((customer) => (
              <details key={customer.id} className="group">
                <summary className="grid cursor-pointer list-none gap-4 p-5 hover:bg-slate-50 md:grid-cols-[minmax(0,1.4fr)_minmax(10rem,0.8fr)_auto] md:items-center">
                  <span>
                    <span className="block font-extrabold text-slate-950">
                      {customer.full_name || "Unnamed customer"}
                    </span>
                    <span className="mt-1 block text-xs text-slate-500">
                      {customer.email || "No email"} · {customer.phone || "No phone"}
                    </span>
                    <span className="mt-1 block text-[11px] text-slate-400">
                      Joined {formatDate(customer.created_at)}
                    </span>
                  </span>
                  <span>
                    <span className="block text-sm font-extrabold text-slate-900">
                      {formatMoney(customer.spendMinor)}
                    </span>
                    <span className="mt-1 block text-xs text-slate-500">
                      {customer.orderCount} order{customer.orderCount === 1 ? "" : "s"} ·{" "}
                      {customer.customer_type}
                    </span>
                  </span>
                  <span className="flex flex-wrap justify-start gap-1.5 md:justify-end">
                    <StatusBadge status={customer.account_status} />
                    {customer.roles.map((role) => (
                      <StatusBadge key={role} status={role} tone="purple" />
                    ))}
                  </span>
                </summary>
                <div className="grid gap-5 border-t border-slate-100 bg-slate-50/60 p-5 lg:grid-cols-2">
                  <div>
                    <h3 className="flex items-center gap-2 text-sm font-extrabold text-slate-950">
                      <ShieldCheck className="size-4 text-amber-600" />
                      Staff roles
                    </h3>
                    {canManageRoles ? (
                      <form action={changeUserRoleAction} className="mt-3 grid gap-3 sm:grid-cols-[1fr_auto_auto]">
                        <input type="hidden" name="user_id" value={customer.id} />
                        <select className={inputClassName} name="role" defaultValue="support">
                          {staffRoles.map((role) => (
                            <option key={role} value={role}>
                              {role.replaceAll("_", " ")}
                            </option>
                          ))}
                        </select>
                        <SubmitButton
                          name="operation"
                          value="grant"
                          variant="secondary"
                          pendingLabel="Updating…"
                        >
                          Grant
                        </SubmitButton>
                        <SubmitButton
                          name="operation"
                          value="revoke"
                          variant="danger"
                          pendingLabel="Updating…"
                        >
                          Revoke
                        </SubmitButton>
                      </form>
                    ) : (
                      <p className="mt-2 text-sm text-slate-500">No role-management permission.</p>
                    )}
                  </div>
                  <div>
                    <h3 className="flex items-center gap-2 text-sm font-extrabold text-slate-950">
                      <UserRoundCog className="size-4 text-amber-600" />
                      Account security
                    </h3>
                    {canManageAccounts ? (
                      <form action={changeAccountStatusAction} className="mt-3 flex gap-3">
                        <input type="hidden" name="user_id" value={customer.id} />
                        <Field label="Status" className="min-w-0 flex-1">
                          <select
                            className={inputClassName}
                            name="account_status"
                            defaultValue={customer.account_status}
                          >
                            <option value="active">Active</option>
                            <option value="suspended">Suspended</option>
                            <option value="disabled">Disabled</option>
                          </select>
                        </Field>
                        <div className="flex items-end">
                          <SubmitButton pendingLabel="Saving…">Save</SubmitButton>
                        </div>
                      </form>
                    ) : (
                      <p className="mt-2 text-sm text-slate-500">
                        Current status: {customer.account_status}.
                      </p>
                    )}
                  </div>
                </div>
              </details>
            ))}
          </div>
        ) : (
          <EmptyState
            title="No matching accounts"
            description="Try a different name, email address, or phone number."
            icon={<Users className="size-5" />}
          />
        )}
      </Panel>
    </div>
  );
}
