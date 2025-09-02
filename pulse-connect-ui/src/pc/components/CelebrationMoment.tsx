// components/CelebrationMoment.tsx
// [CLEANED] Removed redundant React import
import confetti from "canvas-confetti";

type Props = {
  message: string;
  onShare?: () => void;
};

export const CelebrationMoment: React.FC<Props> = ({ message, onShare }) => {
  const triggerConfetti = () => {
    confetti({ particleCount: 100, spread: 70 });
  };

  return (
    <div className="celebration-card" onClick={triggerConfetti}>
      <h2>{message}</h2>
      <button onClick={onShare}>🎊 Share Your Moment</button>
    </div>
  );
};
