import React from "react";
import { Gateway } from "../utils/selectGateway";

interface GigCardProps {
  title: string;
  description: string;
  price: number;
  currency: string;
  gateway: Gateway;
  onPurchase: () => void;
}

export const GigCard: React.FC<GigCardProps> = ({
  title,
  description,
  price,
  currency,
  gateway,
  onPurchase
}) => {
  return (
    <div className="gig-card border rounded-lg p-4 shadow-sm bg-white">
      <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
      <p className="text-sm text-gray-700 mt-1">{description}</p>

      <div className="gig-footer mt-4 flex items-center justify-between">
        <span className="text-md font-medium text-gray-800">
          {currency} {price.toFixed(2)}
        </span>
        <button
          onClick={onPurchase}
          className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
          aria-label={`Purchase ${title} using ${gateway}`}
        >
          Buy with {gateway.toUpperCase()} 🚀
        </button>
      </div>
    </div>
  );
};
