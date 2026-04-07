// Template Types
export interface PAPTemplate {
  id: string;
  name: string;
  description?: string;
  type: TemplateType;
  channel: string; // MarketingChannel
  subject?: string;
  body: string;
  variables: TemplateVariable[];
  localization: TemplateLocalization;
  tags: string[];
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export type TemplateType =
  | "promotional"
  | "transactional"
  | "educational"
  | "survey"
  | "event"
  | "newsletter";

export interface TemplateVariable {
  name: string;
  type: VariableType;
  required: boolean;
  defaultValue?: any;
  description?: string;
  validation?: VariableValidation;
}

export type VariableType = "string" | "number" | "boolean" | "date" | "array" | "object";

export interface VariableValidation {
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  enum?: string[];
}

export interface TemplateLocalization {
  enabled: boolean;
  languages: string[];
  fallbackLanguage: string;
  autoTranslate: boolean;
}

export interface CreateTemplateRequest {
  name: string;
  description?: string;
  type: TemplateType;
  channel: string; // MarketingChannel
  subject?: string;
  body: string;
  variables?: TemplateVariable[];
  localization?: TemplateLocalization;
  tags?: string[];
  createdBy: string;
}

export interface UpdateTemplateRequest extends Partial<CreateTemplateRequest> {
  id: string;
}

// Template Entity
export interface TemplateEntity {
  id: string;
  name: string;
  description?: string;
  type: string;
  channel: string;
  subject?: string;
  body: string;
  variables: any[];
  localization: any;
  tags: string[];
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}
