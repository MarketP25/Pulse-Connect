// allow importing .png files as StaticImageData
declare module "*.png" {
  import type { StaticImageData } from "next/image";
  const value: StaticImageData;
  export default value;
}

// allow CSS modules
declare module "*.module.css";
