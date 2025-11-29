import React from "react";
import "./ResultBlock.css";
import ResultChart from "./ResultChart"; // Handles metric visualization

const ResultBlock = ({ title, results, metrics, offlineNotice }) => {
  return (
    <section aria-labelledby="resultblock-title" className="result-block">
      <h2 id="resultblock-title">{title || "Campaign Results"}</h2>

      {metrics && <ResultChart metrics={metrics} />}

      {results?.length ? (
        <ul className="result-list">
          {results.map((item, index) => (
            <li key={index} className="result-item">
              {item}
            </li>
          ))}
        </ul>
      ) : (
        <p className="no-results">No campaign data available.</p>
      )}

      {offlineNotice && (
        <div className="offline-support" role="alert">
          {offlineNotice}
        </div>
      )}
    </section>
  );
};

export default ResultBlock;