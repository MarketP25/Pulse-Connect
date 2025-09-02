// components/BoostListing.tsx
// [CLEANED] Removed redundant React import
import { usePulseCredits } from "../hooks/usePulseCredits";
import FeatureGate from "@/components/FeatureGate";

type Props = {
  listingId: string;
  userId: string;
};

export const BoostListing: React.FC<Props> = ({ listingId, userId }) => {
  const { balance, spendCredits } = usePulseCredits(userId);

  const handleBoost = async () => {
    try {
      if (balance >= 2) {
        await spendCredits(2, `Boost listing ${listingId}`);
        alert("Listing boosted with celebration!");
      } else {
        alert("Not enough credits. Please purchase more.");
      }
    } catch (error) {
      console.error("Boost failed:", error);
      alert("An error occurred while boosting the listing.");
    }
  };

  return (
    <FeatureGate permission="listings:boost">
      <button onClick={handleBoost}>🚀 Boost Listing (2 Credits)</button>
    </FeatureGate>
  );
};
