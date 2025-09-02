import { useState } from "react";
import { Listing } from "../types/listing";
import { v4 as uuid } from "uuid";
import { useLanguage } from "../context/LanguageProvider"; // Correct import path for useLanguage

export function ListingForm({ onAdd }: { onAdd?: (listing: Listing) => void }) {
  const [form, setForm] = useState<Record<string, string>>({});
  const locale = useLanguage().lang; // Use dynamic locale

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const newListing: Listing = {
      id: uuid(),
      type: (form["type"] as Listing["type"]) || "other",
      name: { [locale]: form["name"] || "" } as Record<string, string>, // Correct type for localized fields
      location: { [locale]: form["location"] || "" } as Record<string, string>,
      region: form["region"] || "",
      currency: { [locale]: form["currency"] || "" } as Record<string, string>,
      price: Number(form["price"]) || 0,
      description: { [locale]: form["description"] || "" } as Record<string, string>,
      posterName: form["posterName"] || "",
      postedAt: new Date().toISOString()
    };
    onAdd?.(newListing);
    setForm({});
  }

  return (
    <form onSubmit={handleSubmit} aria-label="Create new listing">
      <div>
        <label htmlFor="listing-name" className="sr-only">
          Name
        </label>
        <input
          id="listing-name"
          name="name"
          placeholder="Name"
          onChange={handleChange}
          value={form["name"] || ""}
          required
          aria-required="true"
        />
      </div>
      <div>
        <label htmlFor="listing-location" className="sr-only">
          Location
        </label>
        <input
          id="listing-location"
          name="location"
          placeholder="Location"
          onChange={handleChange}
          value={form["location"] || ""}
          required
          aria-required="true"
        />
      </div>
      <div>
        <label htmlFor="listing-region" className="sr-only">
          Region
        </label>
        <input
          id="listing-region"
          name="region"
          placeholder="Region"
          onChange={handleChange}
          value={form["region"] || ""}
          required
          aria-required="true"
        />
      </div>
      <div>
        <label htmlFor="listing-currency" className="sr-only">
          Currency
        </label>
        <input
          id="listing-currency"
          name="currency"
          placeholder="Currency"
          onChange={handleChange}
          value={form["currency"] || ""}
          required
          aria-required="true"
        />
      </div>
      <div>
        <label htmlFor="listing-price" className="sr-only">
          Price
        </label>
        <input
          id="listing-price"
          name="price"
          placeholder="Price"
          type="number"
          onChange={handleChange}
          value={form["price"] || ""}
          required
          aria-required="true"
        />
      </div>
      <div>
        <label htmlFor="listing-description" className="sr-only">
          Description
        </label>
        <textarea
          id="listing-description"
          name="description"
          placeholder="Description"
          onChange={handleChange}
          value={form["description"] || ""}
          required
          aria-required="true"
        />
      </div>
      <div>
        <label htmlFor="listing-poster-name" className="sr-only">
          Your Name
        </label>
        <input
          id="listing-poster-name"
          name="posterName"
          placeholder="Your Name"
          onChange={handleChange}
          value={form["posterName"] || ""}
          required
          aria-required="true"
        />
      </div>
      <button type="submit">Post Listing</button>
    </form>
  );
}
