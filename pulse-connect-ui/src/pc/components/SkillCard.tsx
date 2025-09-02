import React from "react";
import { Gateway, selectGateway } from "../utilis/selectGateway";
import { processPayment } from "../utils/processPayment";
import { celebratePayment } from "../utilis/celebratePayment";
import { PaymentMetadata } from "../types/payment";

interface Skill {
  id: string;
  title: string;
  description: string;
  tags: string[];
  image?: string;
  price: number;
  currency: string;
}

interface Props {
  skill: Skill;
  region: string;
}

export const SkillCard: React.FC<Props> = ({ skill, region }) => {
  const gateway: Gateway = selectGateway(region);

  const handlePurchase = async () => {
    const metadata: PaymentMetadata = {
      userId: "current-user-id",
      region,
      gateway,
      amount: skill.price,
      currency: skill.currency,
      timestamp: new Date().toISOString(),
      milestone: `Purchased ${skill.title}`
    };

    const result = await processPayment(metadata);
    if (result.success) {
      celebratePayment(metadata);
      alert("🎉 Payment successful! Skill unlocked.");
    } else {
      alert("⚠️ Payment failed. Please try again.");
    }
  };

  return (
    <div className="skill-card">
      {skill.image && <img src={skill.image} alt={skill.title} />}
      <h3>{skill.title}</h3>
      <p>{skill.description}</p>
      <div className="tags">
        {skill.tags.map((tag) => (
          <span key={tag} className="tag">
            {tag}
          </span>
        ))}
      </div>
      <div className="price-row">
        <span>
          {skill.price} {skill.currency}
        </span>
        <button onClick={handlePurchase}>Hire via {gateway.toUpperCase()} 💼</button>
      </div>
    </div>
  );
};
