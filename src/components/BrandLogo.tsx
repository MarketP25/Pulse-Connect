import Image from "next/image";
import logo from "../assets/Pulse-Connect-logo.png";

export default function BrandLogo({
  width = 100,
  height = 100,
  className = "",
}: {
  width?: number;
  height?: number;
  className?: string;
}) {
  return (
    <Image
      src={logo}
      alt="Pulse-Connect logo"
      width={width}
      height={height}
      className={className}
      priority
    />
  );
}