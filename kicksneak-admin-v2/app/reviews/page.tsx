import { getReviews } from "./actions";
import ReviewsClient from "@/components/ReviewsClient";

export const revalidate = 0; // Disable cache for real-time reviews dashboard data

export default async function ReviewsPage() {
  const initialReviews = await getReviews({ page: 1, pageSize: 8 });

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Moderare Recenzii Cumpărători</h1>
        <p className="page-subtitle">Inspectează feedback-ul oferit magazinelor. Șterge (soft delete) recenziile neconforme sau vulgare.</p>
      </div>
      <ReviewsClient initialReviews={initialReviews} />
    </div>
  );
}
