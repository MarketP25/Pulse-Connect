import React, { useEffect } from "react";

export const Celebrate: React.FC<{ trigger: string; region: string }> = ({
  trigger,
  region,
}) => {
  useEffect(() => {
    if (trigger === "profile_view") {
      console.log(`🎉 Profile viewed from ${region}`);
      // Optional: trigger confetti or animation
    }
  }, [trigger, region]);

  return null;
};
