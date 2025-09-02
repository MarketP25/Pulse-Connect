import { useReferrals } from "./useReferrals";

export default function ReferralTracker() {
  const { referralLink, referrals } = useReferrals();

  return (
    <div className="referral-tracker">
      <h2>🎁 Invite & Earn</h2>
      <p>
        Share your link: <strong>{referralLink}</strong>
      </p>
      <ul>
        {referrals.map((ref, i) => (
          <li key={i}>
            {ref.name} — {ref.status}
          </li>
        ))}
      </ul>
    </div>
  );
}
