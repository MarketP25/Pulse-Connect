import Confetti from "react-confetti";
import { useEffect, useState } from "react";
import PulseMoment from "./PulseMoment";

export default function BookingSuccess({ name }: { name: string }) {
  const [showConfetti, setShowConfetti] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setShowConfetti(false), 3000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="booking-success">
      {showConfetti && <Confetti />}
      <h2>🎉 Booking Sent!</h2>
      <p>Thanks, {name}! Your inquiry has been sent.</p>
      <PulseMoment type="booking" user={name} />
      <button onClick={() => setShowConfetti(true)}>Celebrate Again 🎊</button>
    </div>
  );
}
