import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PolicyVersion } from './policy-version.entity';
import { HashChain } from '@pulsco/shared-lib';

@Injectable()
export class PoliciesService {
  private readonly logger = new Logger(PoliciesService.name);

  constructor(
    @InjectRepository(PolicyVersion)
    private policyVersionRepository: Repository<PolicyVersion>,
  ) {}

  /**
   * Get the currently active policy version
   */
  async getActivePolicy(): Promise<PolicyVersion> {
    // Get the most recently activated policy that hasn't been retired
    const activePolicy = await this.policyVersionRepository
      .createQueryBuilder('policy')
      .where('policy.retired_at IS NULL')
      .orderBy('policy.activated_at', 'DESC')
      .getOne();

    if (!activePolicy) {
      throw new Error('No active policy found');
    }

    return activePolicy;
  }

  /**
   * Publish a new policy version (founder-only operation)
   */
  async publishPolicy(policyData: {
    version: string;
    council_refs?: any;
    notes: string;
    signature: string;
  }): Promise<PolicyVersion> {
    // First, retire the current active policy
    await this.policyVersionRepository
      .createQueryBuilder()
      .update(PolicyVersion)
      .set({ retired_at: new Date() })
      .where('retired_at IS NULL')
      .execute();

    // Create new policy version
    const newPolicy = this.policyVersionRepository.create({
      version: policyData.version,
      council_refs: policyData.council_refs,
      notes: policyData.notes,
      signature: policyData.signature,
      activated_at: new Date(),
    });

    const savedPolicy = await this.policyVersionRepository.save(newPolicy);

    this.logger.log(`New policy version ${policyData.version} published and activated`);

    return savedPolicy;
  }

  /**
   * Get policy version by version string
   */
  async getPolicyByVersion(version: string): Promise<PolicyVersion> {
    const policy = await this.policyVersionRepository.findOne({
      where: { version },
    });

    if (!policy) {
      throw new Error(`Policy version ${version} not found`);
    }

    return policy;
  }

  /**
   * Get all policy versions (for audit purposes)
   */
  async getAllPolicyVersions(): Promise<PolicyVersion[]> {
    return this.policyVersionRepository.find({
      order: { activated_at: 'DESC' },
    });
  }
}
