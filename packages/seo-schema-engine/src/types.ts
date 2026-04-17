export interface OrganizationSchemaInput {
  name: string;
  url: string;
  logo?: string;
  sameAs: string[];
  description?: string;
}

export interface ProductSchemaInput {
  name: string;
  description: string;
  brand: string;
  sku?: string;
  category?: string;
  offers?: {
    priceCurrency: string;
    price: number;
    availability: string;
    url: string;
  };
}

export interface FAQItem {
  question: string;
  answer: string;
}

export interface LocalBusinessSchemaInput {
  name: string;
  url: string;
  telephone?: string;
  address: {
    streetAddress?: string;
    addressLocality: string;
    addressRegion?: string;
    postalCode?: string;
    addressCountry: string;
  };
  geo?: {
    latitude: number;
    longitude: number;
  };
}

export interface ReviewSchemaInput {
  itemName: string;
  reviewBody: string;
  reviewer: string;
  ratingValue: number;
  bestRating?: number;
  worstRating?: number;
}

export interface PageSchemaBundle {
  organization: Record<string, unknown>;
  product?: Record<string, unknown>;
  faq?: Record<string, unknown>;
  localBusiness?: Record<string, unknown>;
  review?: Record<string, unknown>;
}

export interface SchemaValidationResult {
  valid: boolean;
  missing: string[];
}
