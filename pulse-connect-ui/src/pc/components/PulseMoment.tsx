export default function PulseMoment({ type, user }: { type: string; user: string }) {
  const message = {
    booking: `${user} just booked a listing!`,
    referral: `${user} invited a friend 🎁`,
    post: `${user} posted a new listing!`
  }[type];

  return (
    <div className="pulse-moment">
      <h3>✨ Pulse Moment</h3>
      <p>{message}</p>
      <button onClick={() => alert("Shared to WhatsApp!")}>Share Moment</button>
    </div>
  );
}
