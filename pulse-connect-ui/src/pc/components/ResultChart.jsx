// [CLEANED] Removed redundant React import
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(BarElement, CategoryScale, LinearScale, Tooltip, Legend);

const ResultChart = ({ metrics }) => {
  const data = {
    labels: Object.keys(metrics),
    datasets: [
      {
        label: "Campaign Metrics",
        data: Object.values(metrics),
        backgroundColor: "rgba(54, 162, 235, 0.6)",
      },
    ],
  };

  return <Bar data={data} />;
};

export default ResultChart;
