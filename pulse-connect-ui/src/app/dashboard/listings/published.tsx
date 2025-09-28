"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

type Listing = {
  listingId: string;
  title: string;
  description: string;
  language: "en" | "sw";
  createdAt: string;
};

export default function PublishedListings() {
  const [listings, setListings] = useState<Listing[]>([]);
  const t = useTranslations();

  useEffect(() => {
    fetch("/api/listings/published")
      .then(res => res.json())
      .then((data: { listings: Listing[] }) => setListings(data.listings));
  }, []);

  return (
    <div>
      <h1>{t("dashboard.publishedTitle")}</h1>
      <ul>
        {listings.map(listing => (
          <li key={listing.listingId}>
            <strong>{listing.title}</strong>
            <p>{listing.description}</p>
            <small>{new Date(listing.createdAt).toLocaleString()}</small>
          </li>
        ))}
      </ul>
    </div>
  );
}