import { CategoryManager } from "@/components/category-manager";
import { PageHeader } from "@/components/page-header";
import { getCategories } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function CategoriesPage() {
  return (
    <>
      <PageHeader title="Categories" description="Build and maintain the storefront category tree." />
      <CategoryManager categories={await getCategories()} />
    </>
  );
}
