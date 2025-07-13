import { useEffect, useState } from "react";
import styles from "./DashboardRecommendations.module.css";

type Recommendation = {
  id: number;
  title: string;
  description: string;
  priority: string;
};

export default function DashboardRecommendations() {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/campaign-recommedations/dashboard-panel")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch recommendations");
        return res.json();
      })
      .then((data) => {
        setRecommendations(data.recommendations);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  if (loading) return <div>Loading...</div>;
  if (error) return <div className={styles.error}>Error: {error}</div>;

  return (
    <div>
      <h2>Campaign Recommendations</h2>
      <ul>
        {recommendations.map((rec) => (
          <li key={rec.id}>
            <strong>{rec.title}</strong>{" "}
            <span
              className={
                rec.priority === "high"
                  ? styles.high
                  : rec.priority === "medium"
                  ? styles.medium
                  : styles.low
              }
            >
              ({rec.priority})
            </span>
            <br />
            {rec.description}
          </li>
        ))}
      </ul>
    </div>
  );
}