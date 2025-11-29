import { useState } from "react";
import { Listing } from "../types/listing";
import { ListingForm } from "../components/ListingForm";
import { ListingGrid } from "../components/ListingGrid";

export default function Home() {
  const [listings, setListings] = useState<Listing[]>([]);

  function handleAdd(listing: Listing) {
    setListings([listing, ...listings]);
  }

  return (
    <main>
      <h1>Welcome to Pulse Connect</h1>
      <p>Post and discover places from any region, in any language 🌍</p>

      <section>
        <h2>📌 Post a Listing</h2>
        <ListingForm onAdd={handleAdd} />
      </section>

      <section>
        <h2>🌐 Explore Listings</h2>
        <ListingGrid listings={listings} />
      </section>
    </main>
  );
}
