import { PageHeader } from "@/components/page-header";
import { UserTable } from "@/features/users/components/user-table";
import { getUsers } from "@/features/users/server/readers";

export const dynamic = "force-dynamic";

export default async function UsersPage() {
  return (
    <>
      <PageHeader
        title="Users and access"
        description="Review registered accounts and explicitly promote trusted users to administrator."
      />
      <UserTable data={await getUsers()} />
    </>
  );
}
