import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ActivityEvents } from '../activity/activity.events.js';
import { LeadStages } from './lead.constants.js';
import { LeadRepository, LeadLifecycleCandidate } from './lead.repository.js';

type LifecycleUpdate = {
  stage?: number;
  isActive?: boolean;
};

@Injectable()
export class LeadLifecycleService {
  constructor(
    private readonly leadRepository: LeadRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async process(referenceDate = new Date()): Promise<void> {
    await this.moveStaleActiveLeadsToDormant(this.cutoffDate(referenceDate, 7));
    await this.deactivateDormantLeads(this.cutoffDate(referenceDate, 14));
    await this.deactivateProblematicLeads(this.cutoffDate(referenceDate, 7));
  }

  private async moveStaleActiveLeadsToDormant(
    cutoffDate: string,
  ): Promise<void> {
    const leads =
      await this.leadRepository.findStaleActiveLifecycleCandidates(cutoffDate);

    await this.updateMatchingLeads(
      leads.filter(
        (lead) =>
          lead.stage !== LeadStages.DORMANT && !this.hasBlockingProblem(lead),
      ),
      { stage: LeadStages.DORMANT },
    );
  }

  private async deactivateDormantLeads(cutoffDate: string): Promise<void> {
    const leads =
      await this.leadRepository.findStaleActiveLifecycleCandidates(cutoffDate);

    await this.updateMatchingLeads(
      leads.filter(
        (lead) =>
          lead.stage === LeadStages.DORMANT && !this.hasBlockingProblem(lead),
      ),
      { isActive: false },
    );
  }

  private async deactivateProblematicLeads(cutoffDate: string): Promise<void> {
    const leads =
      await this.leadRepository.findStaleActiveLifecycleCandidates(cutoffDate);

    await this.updateMatchingLeads(
      leads.filter((lead) => this.hasBlockingProblem(lead)),
      { isActive: false },
    );
  }

  private async updateMatchingLeads(
    leads: LeadLifecycleCandidate[],
    attributes: LifecycleUpdate,
  ): Promise<void> {
    for (const lead of leads) {
      const result = await this.leadRepository.updateLifecycleState(
        lead.tenantId,
        lead.id,
        attributes,
      );

      if (!result) {
        continue;
      }

      await this.eventEmitter.emitAsync(ActivityEvents.LEAD_UPDATED, {
        before: result.before,
        after: result.after,
      });
    }
  }

  private hasBlockingProblem(lead: LeadLifecycleCandidate): boolean {
    return lead.listingStatus === 4 || lead.contactStatus === false;
  }

  private cutoffDate(referenceDate: Date, daysAgo: number): string {
    const date = new Date(referenceDate);
    date.setUTCHours(0, 0, 0, 0);
    date.setUTCDate(date.getUTCDate() - daysAgo);

    return date.toISOString().slice(0, 10);
  }
}
