export interface LocalDemandProfile {
  city?: string;
  country: string;
  language: string;
  demandScore: number;
  searchTheme: string;
  notableEntity?: string;
}

export interface ProgrammaticSEOInput {
  services: string[];
  cities: LocalDemandProfile[];
  countries: LocalDemandProfile[];
}

export type ProgrammaticTemplate =
  | "city_presence"
  | "country_services"
  | "service_near_me";

export interface ProgrammaticPage {
  path: string;
  template: ProgrammaticTemplate;
  language: string;
  service?: string;
  city?: string;
  country: string;
  localData: {
    demandScore: number;
    searchTheme: string;
    notableEntity?: string;
  };
  valueStatement: string;
  schemaRequirements: string[];
  dedupeKey: string;
}

export interface ProgrammaticGenerationResult {
  pages: ProgrammaticPage[];
  duplicatesPrevented: number;
}
