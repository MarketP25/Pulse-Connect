export default function MilestoneCelebration({ count }: { count: number }) {
  if (count >= 10) {
    return <p>🏆 Milestone unlocked: 10 listings posted!</p>;
  }
  return null;
}
