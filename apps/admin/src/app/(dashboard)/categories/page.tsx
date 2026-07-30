import { CategoryManager } from "@/features/catalog/components/category-manager";
import { getCategories } from "@/features/catalog/server/categories";

export const dynamic = "force-dynamic";

export default async function CategoriesPage() {
  return <CategoryManager categories={await getCategories()} />;
}
