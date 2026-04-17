import {
  FAQItem,
  LocalBusinessSchemaInput,
  OrganizationSchemaInput,
  PageSchemaBundle,
  ProductSchemaInput,
  ReviewSchemaInput,
  SchemaValidationResult
} from "./types";

function normalizeQuestion(question: string): string {
  const trimmed = question.trim();
  if (trimmed.endsWith("?")) {
    return trimmed;
  }

  return `${trimmed}?`;
}

export function buildOrganizationSchema(input: OrganizationSchemaInput): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: input.name,
    url: input.url,
    logo: input.logo,
    sameAs: input.sameAs,
    description: input.description
  };
}

export function buildProductSchema(input: ProductSchemaInput): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: input.name,
    description: input.description,
    brand: {
      "@type": "Brand",
      name: input.brand
    },
    sku: input.sku,
    category: input.category,
    offers: input.offers
      ? {
          "@type": "Offer",
          priceCurrency: input.offers.priceCurrency,
          price: input.offers.price,
          availability: input.offers.availability,
          url: input.offers.url
        }
      : undefined
  };
}

export function buildFAQSchema(items: FAQItem[]): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: normalizeQuestion(item.question),
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer.trim()
      }
    }))
  };
}

export function buildLocalBusinessSchema(input: LocalBusinessSchemaInput): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: input.name,
    url: input.url,
    telephone: input.telephone,
    address: {
      "@type": "PostalAddress",
      ...input.address
    },
    geo: input.geo
      ? {
          "@type": "GeoCoordinates",
          latitude: input.geo.latitude,
          longitude: input.geo.longitude
        }
      : undefined
  };
}

export function buildReviewSchema(input: ReviewSchemaInput): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "Review",
    itemReviewed: {
      "@type": "Thing",
      name: input.itemName
    },
    reviewBody: input.reviewBody,
    author: {
      "@type": "Person",
      name: input.reviewer
    },
    reviewRating: {
      "@type": "Rating",
      ratingValue: input.ratingValue,
      bestRating: input.bestRating ?? 5,
      worstRating: input.worstRating ?? 1
    }
  };
}

export interface BuildPageSchemaInput {
  organization: OrganizationSchemaInput;
  product?: ProductSchemaInput;
  faqItems?: FAQItem[];
  localBusiness?: LocalBusinessSchemaInput;
  review?: ReviewSchemaInput;
}

export function buildPageSchemaBundle(input: BuildPageSchemaInput): PageSchemaBundle {
  return {
    organization: buildOrganizationSchema(input.organization),
    product: input.product ? buildProductSchema(input.product) : undefined,
    faq: input.faqItems && input.faqItems.length > 0 ? buildFAQSchema(input.faqItems) : undefined,
    localBusiness: input.localBusiness
      ? buildLocalBusinessSchema(input.localBusiness)
      : undefined,
    review: input.review ? buildReviewSchema(input.review) : undefined
  };
}

export function validateSchemaBundle(
  bundle: PageSchemaBundle,
  requiredTypes: Array<keyof PageSchemaBundle>
): SchemaValidationResult {
  const missing: string[] = [];

  for (const type of requiredTypes) {
    if (!bundle[type]) {
      missing.push(type);
    }
  }

  return {
    valid: missing.length === 0,
    missing
  };
}
