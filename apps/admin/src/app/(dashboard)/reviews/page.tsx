import { PageHeader } from "@/components/page-header";
import { ReviewTable } from "@/features/reviews/components/review-table";
import { getReviews } from "@/features/reviews/server/readers";

export const dynamic = "force-dynamic";

export default async function ReviewsPage() {
  return (
    <>
      <PageHeader title="Reviews" description="Moderate customer product feedback before publication." />
      <ReviewTable data={await getReviews()} />
    </>
  );
}
