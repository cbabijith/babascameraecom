import { BookOpenCheck } from "lucide-react";

import { PageHeader } from "@/components/ui/page-header";
import { EmptyState, InlineNotice, Panel, PanelHeader } from "@/components/ui/panel";
import { requirePermission } from "@/lib/auth/admin";
import { getAuditLog } from "@/lib/data/admin-queries";
import { compactId, formatDate } from "@/lib/utils";

function snapshot(value: unknown) {
  if (!value) return "—";
  const serialized = JSON.stringify(value) ?? "—";
  return serialized.length > 120 ? `${serialized.slice(0, 117)}…` : serialized;
}

export default async function AuditPage() {
  await requirePermission("settings");
  const entries = await getAuditLog();

  return (
    <div className="grid gap-6">
      <PageHeader
        eyebrow="Governance"
        title="Audit log"
        description="Immutable database-triggered history for protected commerce and access changes."
      />
      <InlineNotice>
        Audit entries cannot be edited or deleted. The view shows the latest 100 changes.
      </InlineNotice>
      <Panel>
        <PanelHeader title="Recent activity" description={`${entries.length} entries shown.`} />
        {entries.length ? (
          <div className="overflow-x-auto">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Actor</th>
                  <th>Action</th>
                  <th>Entity</th>
                  <th>After snapshot</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <tr key={entry.id}>
                    <td className="whitespace-nowrap text-xs text-slate-500">
                      {formatDate(entry.created_at, true)}
                    </td>
                    <td>
                      <span className="block font-bold text-slate-800">{entry.actorName}</span>
                      <span className="mt-1 block text-[11px] text-slate-400">
                        {entry.actor_id ? compactId(entry.actor_id) : "system"}
                      </span>
                    </td>
                    <td className="font-extrabold text-slate-950">{entry.action}</td>
                    <td>
                      <span className="block font-bold text-slate-800">{entry.entity_table}</span>
                      <span className="mt-1 block text-[11px] text-slate-400">
                        {entry.entity_id ? compactId(entry.entity_id) : "—"}
                      </span>
                    </td>
                    <td className="max-w-md font-mono text-[11px] leading-5 text-slate-500">
                      {snapshot(entry.after_data)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            title="No audit activity"
            description="Protected row changes will be recorded here automatically."
            icon={<BookOpenCheck className="size-5" />}
          />
        )}
      </Panel>
    </div>
  );
}
