import Image from "next/image";
import logo from "../assets/Pulse-Connect-logo.png";


import { useTheme } from "@/context/ThemeContext";
import clsx from "clsx";
import styles from "./BrandLogo.module.css";

export default function BrandLogo({
  width = 100,
  height = 100,
  className = "",
  animated = true,
  "aria-label": ariaLabel = "Pulse Connect Logo",
}: {
  width?: number;
  height?: number;
  className?: string;
  animated?: boolean;
  "aria-label"?: string;
}) {
  // Theme-aware border/shadow for personality
  const { theme } = useTheme?.() || { theme: "light" };
  return (
    <span
      className={clsx(
        "inline-block",
        theme === "dark"
          ? "bg-white/10 border-white/30 shadow-lg"
          : "bg-white border-gray-200 shadow",
        animated && styles["animate-logo-bounce"],
        "rounded-full border p-1",
        className
      )}
      aria-label={ariaLabel}
      role="img"
      tabIndex={0}
    >
      <Image
        src={logo}
        alt={ariaLabel}
        width={width}
        height={height}
        priority
        draggable={false}
        style={{
          filter: theme === "dark" ? "drop-shadow(0 0 2px #fff)" : undefined,
          transition: "transform 0.3s cubic-bezier(.4,2,.6,1)",
        }}
      />
    </span>
  );
}