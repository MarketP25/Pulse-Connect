export async function submitBooking(booking: {
  listingId: string;
  name: string;
  message: string;
}) {
  // [CLEANED] Removed debug log
  return new Promise((resolve) => setTimeout(resolve, 1000));
}
