import { useRouter } from "next/router";
import BookingForm from "@/components/booking/BookingForm";

export default function BookingPage() {
  const { query } = useRouter();
  const listingId = query.listingId as string;

  return (
    <main>
      <h2>📩 Book This Listing</h2>
      <BookingForm listingId={listingId} />
    </main>
  );
}
