import { Listing } from "../types/listing";
import { getLocalizedValue } from "../lib/i18n";
import { useLanguage } from "../context/LanguageProvider";

export function ListingGrid({ listings }: { listings: Listing[] }) {
  const locale = useLanguage().lang; // Replace hardcoded locale with dynamic locale

  return (
    <div className="grid">
      {listings.map((item) => (
        <div key={item.id} className="card">
          <h3>{getLocalizedValue(item.name, locale)}</h3>
          <p>
            {item.type} in {getLocalizedValue(item.location, locale)},{" "}
            {item.region}
          </p>
          <p>
            {getLocalizedValue(item.currency, locale)} {item.price}
          </p>
          <p>Posted by {item.posterName}</p>
          {item.description && (
            <p>
              <em>{getLocalizedValue(item.description, locale)}</em>
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
