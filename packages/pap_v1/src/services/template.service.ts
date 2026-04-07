import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import {
  PAPTemplate,
  TemplateVariable,
  TemplateLocalization,
  CreateTemplateRequest,
  UpdateTemplateRequest,
  TemplateError,
  ValidationError
} from "../types/pap";
import { TemplateEntity } from "../entities/template.entity";

@Injectable()
export class TemplateService {
  private readonly logger = new Logger(TemplateService.name);

  constructor(
    @InjectRepository(TemplateEntity)
    private readonly templateRepository: Repository<TemplateEntity>
  ) {}

  /**
   * Create a new template
   */
  async createTemplate(request: CreateTemplateRequest): Promise<PAPTemplate> {
    this.validateCreateTemplateRequest(request);

    const templateEntity = this.templateRepository.create({
      name: request.name,
      description: request.description,
      type: request.type,
      channel: request.channel,
      subject: request.subject,
      body: request.body,
      variables: request.variables || [],
      localization: request.localization || {
        enabled: false,
        languages: [],
        fallbackLanguage: "en"
      },
      tags: request.tags || [],
      createdBy: request.createdBy,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    const savedTemplate = await this.templateRepository.save(templateEntity);
    return this.mapEntityToTemplate(savedTemplate);
  }

  /**
   * Update an existing template
   */
  async updateTemplate(request: UpdateTemplateRequest): Promise<PAPTemplate> {
    const template = await this.templateRepository.findOne({
      where: { id: request.id }
    });

    if (!template) {
      throw new ValidationError("Template not found");
    }

    Object.assign(template, request);
    template.updatedAt = new Date();

    const updatedTemplate = await this.templateRepository.save(template);
    return this.mapEntityToTemplate(updatedTemplate);
  }

  /**
   * Get template by ID
   */
  async getTemplate(templateId: string): Promise<PAPTemplate> {
    const template = await this.templateRepository.findOne({
      where: { id: templateId }
    });

    if (!template) {
      throw new ValidationError("Template not found");
    }

    return this.mapEntityToTemplate(template);
  }

  /**
   * Get templates by channel
   */
  async getTemplatesByChannel(channel: string): Promise<PAPTemplate[]> {
    const templates = await this.templateRepository.find({
      where: { channel },
      order: { updatedAt: "DESC" }
    });

    return templates.map((t) => this.mapEntityToTemplate(t));
  }

  /**
   * Search templates
   */
  async searchTemplates(query: {
    channel?: string;
    type?: string;
    tags?: string[];
    search?: string;
  }): Promise<PAPTemplate[]> {
    let qb = this.templateRepository.createQueryBuilder("template");

    if (query.channel) {
      qb = qb.andWhere("template.channel = :channel", { channel: query.channel });
    }

    if (query.type) {
      qb = qb.andWhere("template.type = :type", { type: query.type });
    }

    if (query.tags && query.tags.length > 0) {
      qb = qb.andWhere("template.tags && :tags", { tags: query.tags });
    }

    if (query.search) {
      qb = qb.andWhere(
        "(template.name ILIKE :search OR template.description ILIKE :search OR template.body ILIKE :search)",
        { search: `%${query.search}%` }
      );
    }

    const templates = await qb.orderBy("template.updatedAt", "DESC").getMany();
    return templates.map((t) => this.mapEntityToTemplate(t));
  }

  /**
   * Render template with variables
   */
  async renderTemplate(
    templateId: string,
    variables: Record<string, any>
  ): Promise<{
    subject?: string;
    body: string;
  }> {
    const template = await this.getTemplate(templateId);

    return {
      subject: template.subject
        ? this.interpolateVariables(template.subject, variables)
        : undefined,
      body: this.interpolateVariables(template.body, variables)
    };
  }

  /**
   * Render template object directly
   */
  renderTemplate(
    template: PAPTemplate,
    variables: Record<string, any>
  ): {
    subject?: string;
    body: string;
  } {
    return {
      subject: template.subject
        ? this.interpolateVariables(template.subject, variables)
        : undefined,
      body: this.interpolateVariables(template.body, variables)
    };
  }

  /**
   * Get localized template
   */
  async getLocalizedTemplate(templateId: string, language: string): Promise<PAPTemplate> {
    const template = await this.getTemplate(templateId);

    if (!template.localization.enabled) {
      return template;
    }

    // Check if requested language is supported
    if (!template.localization.languages.includes(language)) {
      // Fall back to default language
      language = template.localization.fallbackLanguage;
    }

    // In a real implementation, this would fetch localized content from database
    // For now, return the base template
    return template;
  }

  /**
   * Delete template
   */
  async deleteTemplate(templateId: string): Promise<void> {
    const result = await this.templateRepository.delete(templateId);

    if (result.affected === 0) {
      throw new ValidationError("Template not found");
    }
  }

  /**
   * Clone template
   */
  async cloneTemplate(
    templateId: string,
    newName: string,
    createdBy: string
  ): Promise<PAPTemplate> {
    const originalTemplate = await this.getTemplate(templateId);

    const clonedTemplate = await this.createTemplate({
      name: newName,
      description: `Cloned from ${originalTemplate.name}`,
      type: originalTemplate.type,
      channel: originalTemplate.channel,
      subject: originalTemplate.subject,
      body: originalTemplate.body,
      variables: originalTemplate.variables,
      localization: originalTemplate.localization,
      tags: [...originalTemplate.tags, "cloned"],
      createdBy
    });

    return clonedTemplate;
  }

  /**
   * Get template usage statistics
   */
  async getTemplateStats(templateId: string): Promise<{
    usageCount: number;
    lastUsed?: Date;
    successRate: number;
  }> {
    // In a real implementation, this would query usage logs
    // For now, return mock data
    return {
      usageCount: Math.floor(Math.random() * 1000),
      lastUsed: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
      successRate: 0.85 + Math.random() * 0.1 // 85-95%
    };
  }

  /**
   * Validate template variables
   */
  validateTemplateVariables(template: PAPTemplate, variables: Record<string, any>): void {
    const requiredVars = template.variables.filter((v) => v.required);
    const missingVars = requiredVars.filter((v) => !(v.name in variables));

    if (missingVars.length > 0) {
      throw new ValidationError(
        `Missing required variables: ${missingVars.map((v) => v.name).join(", ")}`
      );
    }

    // Validate variable types
    for (const variable of template.variables) {
      if (variable.name in variables) {
        const value = variables[variable.name];
        this.validateVariableType(value, variable.type);
      }
    }
  }

  /**
   * Interpolate variables in template content
   */
  private interpolateVariables(content: string, variables: Record<string, any>): string {
    let result = content;

    // Replace {{variable}} syntax
    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`{{${key}}}`, "g");
      result = result.replace(regex, String(value));
    }

    // Replace ${variable} syntax
    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`\\$\\{${key}\\}`, "g");
      result = result.replace(regex, String(value));
    }

    return result;
  }

  /**
   * Validate variable type
   */
  private validateVariableType(value: any, expectedType: string): void {
    switch (expectedType) {
      case "string":
        if (typeof value !== "string") {
          throw new ValidationError(`Variable must be a string, got ${typeof value}`);
        }
        break;
      case "number":
        if (typeof value !== "number") {
          throw new ValidationError(`Variable must be a number, got ${typeof value}`);
        }
        break;
      case "boolean":
        if (typeof value !== "boolean") {
          throw new ValidationError(`Variable must be a boolean, got ${typeof value}`);
        }
        break;
      case "date":
        if (!(value instanceof Date) && isNaN(Date.parse(value))) {
          throw new ValidationError(`Variable must be a valid date`);
        }
        break;
      default:
        // Allow any type for unknown types
        break;
    }
  }

  private validateCreateTemplateRequest(request: CreateTemplateRequest): void {
    if (!request.name || request.name.length < 3) {
      throw new ValidationError("Template name must be at least 3 characters");
    }

    if (!request.body || request.body.length < 10) {
      throw new ValidationError("Template body must be at least 10 characters");
    }

    if (!request.channel) {
      throw new ValidationError("Channel is required");
    }

    if (!request.type) {
      throw new ValidationError("Template type is required");
    }

    if (!request.createdBy) {
      throw new ValidationError("Created by is required");
    }
  }

  private mapEntityToTemplate(entity: TemplateEntity): PAPTemplate {
    return {
      id: entity.id,
      name: entity.name,
      description: entity.description,
      type: entity.type,
      channel: entity.channel,
      subject: entity.subject,
      body: entity.body,
      variables: entity.variables,
      localization: entity.localization,
      tags: entity.tags,
      createdBy: entity.createdBy,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt
    };
  }
}
