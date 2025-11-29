export type Listing = {
  id: string;
  type: "Hotel" | "Airbnb" | "Club" | "Restaurant" | "Garage" | "other";
  name: string;
  location: string;
  region: string;
  currency: string;
  price: number;
  description?: string;
  image?: string;
  posterName: string;
  postedAt: string;
};
