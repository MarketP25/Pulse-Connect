import { useUserData } from "./useUserData";
import MilestoneCelebration from "./MilestoneCelebration";

export default function ProfilePage() {
  const { name, listings, credits, referrals } = useUserData();

  return (
    <div className="profile-page">
      <h2>👤 Welcome, {name}</h2>
      <p>Pulse Credits: {credits}</p>
      <p>Listings: {listings.length}</p>
      <p>Referrals: {referrals.length}</p>
      <MilestoneCelebration count={listings.length} />
    </div>
  );
}
