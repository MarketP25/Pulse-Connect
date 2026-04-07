import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, DataSource, In, Between } from "typeorm";
import { EventEmitter2 } from "@nestjs/event-emitter";
import {
  PAPCampaign,
  CreateCampaignRequest,
  UpdateCampaignRequest,
  CampaignStatus,
  CampaignType,
  MarketingChannel,
  ActionRecipient,
  ActionContent,
  ActionPriority,
  PAPAnalytics,
  CampaignError,
  ValidationError,
  BudgetError
} from "../types/pap";
import { CampaignEntity } from "../entities/campaign.entity";
import { ActionEntity } from "../entities/action.entity";
import { ConsentService } from "./consent.service";
import { EntitlementService } from "./entitlement.service";
import { TemplateService } from "./template.service";
import { ChannelConnectorService } from "./channel-connector.service";

@Injectable()
export class CampaignService {
  private readonly logger = new Logger(CampaignService.name);

  constructor(
    @InjectRepository(CampaignEntity)
    private readonly campaignRepository: Repository<CampaignEntity>,
    @InjectRepository(ActionEntity)
    private readonly actionRepository: Repository<ActionEntity>,
    private readonly consentService: ConsentService,
    private readonly entitlementService: EntitlementService,
    private readonly templateService: TemplateService,
    private readonly channelConnectorService: ChannelConnectorService,
    private readonly eventEmitter: EventEmitter2,
    private readonly dataSource: DataSource
  ) {}

  /**
   * Create a new marketing campaign
   */
  async createCampaign(request: CreateCampaignRequest, createdBy: string): Promise<PAPCampaign> {
    // Validate request
    this.validateCreateCampaignRequest(request);

    // Check entitlements
    const hasEntitlement = await this.entitlementService.checkEntitlement(
      createdBy,
      "campaigns_per_month",
      1
    );
    if (!hasEntitlement) {
      throw new EntitlementError("Campaign creation limit exceeded");
    }

    // Check budget limits
    if (request.budget.amount > 10000) {
      // Example limit
      throw new BudgetError("Campaign budget exceeds maximum allowed");
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Create campaign entity
      const campaignEntity = this.campaignRepository.create({
        name: request.name,
        description: request.description,
        type: request.type,
        status: CampaignStatus.DRAFT,
        channels: request.channels,
        audience: request.audience,
        content: request.content,
        schedule: request.schedule,
        goals: request.goals,
        budget: request.budget,
        targeting: request.targeting,
        createdBy,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      const savedCampaign = await queryRunner.manager.save(CampaignEntity, campaignEntity);
      await queryRunner.commitTransaction();

      this.eventEmitter.emit("campaign.created", { campaign: savedCampaign });
      return this.mapEntityToCampaign(savedCampaign);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`Failed to create campaign: ${error.message}`, error.stack);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Update an existing campaign
   */
  async updateCampaign(request: UpdateCampaignRequest): Promise<PAPCampaign> {
    const campaign = await this.campaignRepository.findOne({
      where: { id: request.id }
    });

    if (!campaign) {
      throw new ValidationError("Campaign not found");
    }

    // Check if campaign can be updated
    if (
      campaign.status === CampaignStatus.COMPLETED ||
      campaign.status === CampaignStatus.CANCELLED
    ) {
      throw new ValidationError("Cannot update completed or cancelled campaign");
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Update fields
      Object.assign(campaign, request);
      campaign.updatedAt = new Date();

      const updatedCampaign = await queryRunner.manager.save(CampaignEntity, campaign);
      await queryRunner.commitTransaction();

      this.eventEmitter.emit("campaign.updated", { campaign: updatedCampaign });
      return this.mapEntityToCampaign(updatedCampaign);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`Failed to update campaign: ${error.message}`, error.stack);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Start a campaign
   */
  async startCampaign(campaignId: string): Promise<PAPCampaign> {
    const campaign = await this.campaignRepository.findOne({
      where: { id: campaignId }
    });

    if (!campaign) {
      throw new ValidationError("Campaign not found");
    }

    if (campaign.status !== CampaignStatus.DRAFT && campaign.status !== CampaignStatus.SCHEDULED) {
      throw new ValidationError("Campaign cannot be started from current status");
    }

    // Validate campaign before starting
    await this.validateCampaignForExecution(campaign);

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      campaign.status = CampaignStatus.RUNNING;
      campaign.startedAt = new Date();
      campaign.updatedAt = new Date();

      const updatedCampaign = await queryRunner.manager.save(CampaignEntity, campaign);
      await queryRunner.commitTransaction();

      // Start campaign execution
      this.executeCampaign(updatedCampaign);

      this.eventEmitter.emit("campaign.started", { campaign: updatedCampaign });
      return this.mapEntityToCampaign(updatedCampaign);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`Failed to start campaign: ${error.message}`, error.stack);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Execute campaign actions
   */
  private async executeCampaign(campaign: CampaignEntity): Promise<void> {
    try {
      // Build audience
      const recipients = await this.buildAudience(campaign);

      // Create actions for each recipient/channel combination
      const actions = [];
      for (const recipient of recipients) {
        for (const channel of campaign.channels) {
          // Check consent
          const hasConsent = await this.consentService.checkConsent(
            recipient.userId,
            channel,
            "promotional"
          );

          if (hasConsent) {
            const action = this.actionRepository.create({
              campaignId: campaign.id,
              type: this.getActionTypeForChannel(channel),
              channel,
              recipient: recipient,
              content: await this.prepareContent(campaign, recipient, channel),
              status: "queued",
              priority: ActionPriority.NORMAL,
              scheduledFor: this.calculateSendTime(campaign, recipient),
              createdAt: new Date(),
              updatedAt: new Date()
            });
            actions.push(action);
          }
        }
      }

      // Batch insert actions
      if (actions.length > 0) {
        await this.actionRepository.save(actions);
        this.logger.log(`Created ${actions.length} actions for campaign ${campaign.id}`);
      }

      // Start processing actions
      this.processCampaignActions(campaign.id);
    } catch (error) {
      this.logger.error(`Failed to execute campaign ${campaign.id}: ${error.message}`, error.stack);
      await this.failCampaign(campaign.id, error.message);
    }
  }

  /**
   * Process campaign actions asynchronously
   */
  private async processCampaignActions(campaignId: string): Promise<void> {
    const actions = await this.actionRepository.find({
      where: {
        campaignId,
        status: "queued"
      },
      take: 100 // Process in batches
    });

    for (const action of actions) {
      try {
        await this.sendAction(action);
      } catch (error) {
        this.logger.error(`Failed to send action ${action.id}: ${error.message}`);
        await this.failAction(action.id, error.message);
      }
    }
  }

  /**
   * Send individual action
   */
  private async sendAction(action: ActionEntity): Promise<void> {
    // Update status to sending
    await this.actionRepository.update(action.id, {
      status: "sending",
      sentAt: new Date()
    });

    try {
      // Send through channel connector
      const result = await this.channelConnectorService.sendAction(action);

      // Update action with results
      await this.actionRepository.update(action.id, {
        status: result.delivered ? "delivered" : "sent",
        deliveredAt: result.delivered ? new Date() : undefined,
        metadata: result.metadata,
        updatedAt: new Date()
      });

      this.eventEmitter.emit("action.sent", { action, result });
    } catch (error) {
      await this.failAction(action.id, error.message);
    }
  }

  /**
   * Build campaign audience
   */
  private async buildAudience(campaign: CampaignEntity): Promise<ActionRecipient[]> {
    // This would implement complex audience building logic
    // For now, return mock recipients
    const recipients: ActionRecipient[] = [];

    // Mock audience building - in real implementation, this would query user database
    // based on campaign.audience criteria
    for (let i = 0; i < campaign.audience.estimatedReach || 1000; i++) {
      recipients.push({
        userId: `user_${i}`,
        contactInfo: {
          email: `user${i}@example.com`
        },
        preferences: {
          language: "en",
          timezone: "UTC",
          quietHours: { enabled: false, start: "22:00", end: "08:00", timezone: "UTC" },
          channelPreferences: {
            email: true,
            sms: false,
            push: false,
            social_facebook: false,
            social_twitter: false,
            social_instagram: false,
            social_linkedin: false
          }
        }
      });
    }

    return recipients;
  }

  /**
   * Prepare content for recipient and channel
   */
  private async prepareContent(
    campaign: CampaignEntity,
    recipient: ActionRecipient,
    channel: MarketingChannel
  ): Promise<ActionContent> {
    // Get template
    const template = await this.templateService.getTemplate(
      campaign.content.templateId || "default"
    );

    // Personalize content
    const personalizedContent = await this.templateService.renderTemplate(template, {
      recipient,
      campaign: campaign.content
    });

    return {
      subject: personalizedContent.subject,
      body: personalizedContent.body,
      templateId: campaign.content.templateId,
      variables: campaign.content.variables,
      tracking: {
        enabled: true,
        pixels: [],
        links: [],
        events: ["open", "click"]
      }
    };
  }

  /**
   * Calculate optimal send time for recipient
   */
  private calculateSendTime(campaign: CampaignEntity, recipient: ActionRecipient): Date {
    // Simple implementation - in real system, this would use ML to predict optimal times
    const baseTime = campaign.schedule.startDate || new Date();

    // Add some randomization to avoid spikes
    const randomDelay = Math.floor(Math.random() * 3600000); // Up to 1 hour
    return new Date(baseTime.getTime() + randomDelay);
  }

  /**
   * Get analytics for campaign
   */
  async getCampaignAnalytics(campaignId: string, period?: any): Promise<PAPAnalytics> {
    const campaign = await this.campaignRepository.findOne({
      where: { id: campaignId }
    });

    if (!campaign) {
      throw new ValidationError("Campaign not found");
    }

    // Get action metrics
    const actions = await this.actionRepository.find({
      where: { campaignId }
    });

    const metrics = this.calculateMetrics(actions);

    return {
      campaignId,
      period: period || {
        start: campaign.startedAt || campaign.createdAt,
        end: new Date(),
        granularity: "day"
      },
      metrics,
      performance: this.calculatePerformance(metrics),
      audience: this.calculateAudienceAnalytics(actions),
      channelBreakdown: this.calculateChannelBreakdown(actions),
      geographic: [], // Would implement geographic analytics
      trends: [], // Would implement trend analysis
      insights: [] // Would implement AI-powered insights
    };
  }

  /**
   * Calculate metrics from actions
   */
  private calculateMetrics(actions: ActionEntity[]) {
    return {
      totalActions: actions.length,
      sent: actions.filter((a) =>
        ["sent", "delivered", "opened", "clicked", "converted"].includes(a.status)
      ).length,
      delivered: actions.filter((a) =>
        ["delivered", "opened", "clicked", "converted"].includes(a.status)
      ).length,
      opened: actions.filter((a) => ["opened", "clicked", "converted"].includes(a.status)).length,
      clicked: actions.filter((a) => ["clicked", "converted"].includes(a.status)).length,
      converted: actions.filter((a) => a.status === "converted").length,
      failed: actions.filter((a) => a.status === "failed").length,
      bounced: actions.filter((a) => a.failureReason?.includes("bounce")).length,
      unsubscribed: actions.filter((a) => a.status === "unsubscribed").length,
      complained: actions.filter((a) => a.status === "complained").length,
      revenue: actions.reduce((sum, a) => sum + (a.metadata?.revenue || 0), 0),
      cost: actions.reduce((sum, a) => sum + (a.metadata?.cost || 0), 0),
      roi: 0 // Calculate based on revenue/cost
    };
  }

  /**
   * Calculate performance metrics
   */
  private calculatePerformance(metrics: any) {
    return {
      openRate: metrics.sent > 0 ? metrics.opened / metrics.sent : 0,
      clickRate: metrics.sent > 0 ? metrics.clicked / metrics.sent : 0,
      conversionRate: metrics.sent > 0 ? metrics.converted / metrics.sent : 0,
      bounceRate: metrics.sent > 0 ? metrics.bounced / metrics.sent : 0,
      unsubscribeRate: metrics.sent > 0 ? metrics.unsubscribed / metrics.sent : 0,
      complaintRate: metrics.sent > 0 ? metrics.complained / metrics.sent : 0,
      deliveryRate: metrics.sent > 0 ? metrics.delivered / metrics.sent : 0,
      costPerAction: metrics.totalActions > 0 ? metrics.cost / metrics.totalActions : 0,
      costPerAcquisition: metrics.converted > 0 ? metrics.cost / metrics.converted : 0
    };
  }

  /**
   * Calculate audience analytics
   */
  private calculateAudienceAnalytics(actions: ActionEntity[]) {
    const uniqueRecipients = new Set(actions.map((a) => a.recipient.userId)).size;

    return {
      totalRecipients: actions.length,
      uniqueRecipients,
      newRecipients: Math.floor(uniqueRecipients * 0.3), // Estimate
      repeatRecipients: uniqueRecipients - Math.floor(uniqueRecipients * 0.3),
      segmentBreakdown: [] // Would implement segment analysis
    };
  }

  /**
   * Calculate channel breakdown
   */
  private calculateChannelBreakdown(actions: ActionEntity[]) {
    const channelMap = new Map<MarketingChannel, ActionEntity[]>();

    actions.forEach((action) => {
      if (!channelMap.has(action.channel)) {
        channelMap.set(action.channel, []);
      }
      channelMap.get(action.channel)!.push(action);
    });

    return Array.from(channelMap.entries()).map(([channel, channelActions]) => ({
      channel,
      actions: channelActions.length,
      performance: this.calculatePerformance(this.calculateMetrics(channelActions)),
      cost: channelActions.reduce((sum, a) => sum + (a.metadata?.cost || 0), 0)
    }));
  }

  // Helper methods
  private getActionTypeForChannel(channel: MarketingChannel): string {
    switch (channel) {
      case "email":
        return "email_send";
      case "sms":
        return "sms_send";
      case "push":
        return "push_send";
      default:
        return "social_post";
    }
  }

  private async failCampaign(campaignId: string, reason: string): Promise<void> {
    await this.campaignRepository.update(campaignId, {
      status: CampaignStatus.FAILED,
      updatedAt: new Date()
    });
  }

  private async failAction(actionId: string, reason: string): Promise<void> {
    await this.actionRepository.update(actionId, {
      status: "failed",
      failureReason: reason,
      updatedAt: new Date()
    });
  }

  private validateCreateCampaignRequest(request: CreateCampaignRequest): void {
    if (!request.name || request.name.length < 3) {
      throw new ValidationError("Campaign name must be at least 3 characters");
    }

    if (!request.channels || request.channels.length === 0) {
      throw new ValidationError("At least one channel must be specified");
    }

    if (!request.audience) {
      throw new ValidationError("Audience definition is required");
    }

    if (!request.content) {
      throw new ValidationError("Content definition is required");
    }

    if (!request.budget) {
      throw new ValidationError("Budget definition is required");
    }
  }

  private async validateCampaignForExecution(campaign: CampaignEntity): Promise<void> {
    // Check if audience is defined
    if (!campaign.audience.criteria) {
      throw new ValidationError("Campaign audience criteria must be defined");
    }

    // Check if content is complete
    if (!campaign.content.body) {
      throw new ValidationError("Campaign content body is required");
    }

    // Check budget
    if (campaign.budget.spent >= campaign.budget.amount) {
      throw new BudgetError("Campaign budget exhausted");
    }
  }

  private mapEntityToCampaign(entity: CampaignEntity): PAPCampaign {
    return {
      id: entity.id,
      name: entity.name,
      description: entity.description,
      type: entity.type,
      status: entity.status,
      channels: entity.channels,
      audience: entity.audience,
      content: entity.content,
      schedule: entity.schedule,
      goals: entity.goals,
      budget: entity.budget,
      targeting: entity.targeting,
      createdBy: entity.createdBy,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
      startedAt: entity.startedAt,
      completedAt: entity.completedAt
    };
  }
}
