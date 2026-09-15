import { ListPager } from "@/components/list-pager";
import { PageHeader } from "@/components/page-header";
import { UserTable } from "@/features/users/components/user-table";
import { getUsers } from "@/features/users/server/readers";

export const dynamic = "force-dynamic";

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page } = await searchParams;
  const users = await getUsers({ page: Number(page) || 1 });
  return (
    <>
      <PageHeader
        title="Users and access"
        description="Review registered accounts and explicitly promote trusted users to administrator."
      />
      <UserTable data={users.rows} />
      <ListPager
        basePath="/users"
        page={users.page}
        pageCount={users.pageCount}
        total={users.total}
        pageSize={users.pageSize}
        singular="user"
      />
    </>
  );
}
