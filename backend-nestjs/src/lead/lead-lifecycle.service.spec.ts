import { EventEmitter2 } from '@nestjs/event-emitter';
import { ActivityEvents } from '../activity/activity.events.js';
import { LeadStages, LeadSources } from './lead.constants.js';
import {
  LeadLifecycleCandidate,
  LeadLifecycleUpdateInput,
  LeadRepository,
} from './lead.repository.js';
import { LeadLifecycleService } from './lead-lifecycle.service.js';

const activeContactId = '018f8de0-7424-7c71-a0f9-14d364f50d84';
const inactiveContactId = '018f8de0-7424-7c71-a0f9-14d364f50d85';
const availableListingId = '018f8de0-7f2d-7c71-bb64-347037ba9a57';
const soldListingId = '018f8de0-7f2d-7c71-bb64-347037ba9a58';
const userId = '018f8de0-6aba-7c71-b65d-95302af6be84';

const baseLead = (
  overrides: Partial<LeadLifecycleCandidate> = {},
): LeadLifecycleCandidate => ({
  id: '018f8de0-1111-7c71-bb64-347037ba9a57',
  tenantId: 'tenant-1',
  contactId: activeContactId,
  listingId: availableListingId,
  userId,
  stage: LeadStages.NEW_LEAD,
  source: LeadSources.MANUAL_ENTRY,
  isActive: true,
  nextTask: null,
  dueAt: null,
  listingValue: 875000,
  contactStatus: true,
  listingStatus: 1,
  createdAt: '2026-05-01T00:00:00.000Z',
  updatedAt: '2026-06-01T00:00:00.000Z',
  ...overrides,
});

class FakeLeadRepository {
  constructor(private readonly leads: LeadLifecycleCandidate[]) {}

  findStaleActiveLifecycleCandidates(
    cutoffDate: string,
  ): Promise<LeadLifecycleCandidate[]> {
    return Promise.resolve(
      this.leads.filter(
        (lead) =>
          lead.isActive &&
          new Date(lead.updatedAt).toISOString().slice(0, 10) <= cutoffDate,
      ),
    );
  }

  updateLifecycleState(
    tenantId: string,
    id: string,
    data: LeadLifecycleUpdateInput,
  ) {
    const index = this.leads.findIndex(
      (lead) => lead.tenantId === tenantId && lead.id === id,
    );

    if (index === -1) {
      return Promise.resolve(null);
    }

    const before = { ...this.leads[index] };
    this.leads[index] = {
      ...this.leads[index],
      ...(data.stage !== undefined ? { stage: data.stage } : {}),
      ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
      updatedAt: '2026-06-12T00:00:00.000Z',
    };

    return Promise.resolve({
      before,
      after: { ...this.leads[index] },
    });
  }
}

class FakeEventEmitter {
  events: Array<{ event: string; payload: unknown }> = [];

  emitAsync(event: string, payload: unknown): Promise<unknown[]> {
    this.events.push({ event, payload });

    return Promise.resolve([]);
  }
}

describe('LeadLifecycleService', () => {
  it('moves stale leads to dormant and deactivates older dormant or problematic leads', async () => {
    const leads = [
      baseLead({
        id: 'stale-active',
        stage: LeadStages.CONTACTED,
        updatedAt: '2026-06-05T23:59:59.000Z',
      }),
      baseLead({
        id: 'fresh-active',
        stage: LeadStages.QUALIFIED,
        updatedAt: '2026-06-06T00:00:00.000Z',
      }),
      baseLead({
        id: 'older-dormant',
        stage: LeadStages.DORMANT,
        updatedAt: '2026-05-29T12:00:00.000Z',
      }),
      baseLead({
        id: 'fresh-dormant',
        stage: LeadStages.DORMANT,
        updatedAt: '2026-05-30T00:00:00.000Z',
      }),
      baseLead({
        id: 'sold-listing',
        listingId: soldListingId,
        stage: LeadStages.CLOSED_WON,
        listingStatus: 4,
        updatedAt: '2026-06-05T00:00:00.000Z',
      }),
      baseLead({
        id: 'inactive-contact',
        contactId: inactiveContactId,
        stage: LeadStages.NEGOTIATING,
        contactStatus: false,
        updatedAt: '2026-06-05T00:00:00.000Z',
      }),
      baseLead({
        id: 'fresh-problem',
        contactId: inactiveContactId,
        listingId: soldListingId,
        stage: LeadStages.CONTACTED,
        contactStatus: false,
        listingStatus: 4,
        updatedAt: '2026-06-06T00:00:00.000Z',
      }),
    ];
    const repository = new FakeLeadRepository(leads);
    const eventEmitter = new FakeEventEmitter();
    const service = new LeadLifecycleService(
      repository as unknown as LeadRepository,
      eventEmitter as unknown as EventEmitter2,
    );

    await service.process(new Date('2026-06-12T00:00:00.000Z'));

    expect(lead(leads, 'stale-active')).toMatchObject({
      stage: LeadStages.DORMANT,
      isActive: true,
    });
    expect(lead(leads, 'fresh-active')).toMatchObject({
      stage: LeadStages.QUALIFIED,
      isActive: true,
    });
    expect(lead(leads, 'older-dormant')).toMatchObject({
      stage: LeadStages.DORMANT,
      isActive: false,
    });
    expect(lead(leads, 'fresh-dormant')).toMatchObject({
      stage: LeadStages.DORMANT,
      isActive: true,
    });
    expect(lead(leads, 'sold-listing')).toMatchObject({
      stage: LeadStages.CLOSED_WON,
      isActive: false,
    });
    expect(lead(leads, 'inactive-contact')).toMatchObject({
      stage: LeadStages.NEGOTIATING,
      isActive: false,
    });
    expect(lead(leads, 'fresh-problem')).toMatchObject({
      stage: LeadStages.CONTACTED,
      isActive: true,
    });

    expect(eventEmitter.events).toHaveLength(4);
    expect(
      eventEmitter.events.every(
        (event) => event.event === ActivityEvents.LEAD_UPDATED,
      ),
    ).toBe(true);
    expect(changeFor(eventEmitter, 'stale-active')).toMatchObject({
      before: { stage: LeadStages.CONTACTED },
      after: { stage: LeadStages.DORMANT },
    });
    expect(changeFor(eventEmitter, 'older-dormant')).toMatchObject({
      before: { isActive: true },
      after: { isActive: false },
    });
  });
});

function lead(leads: LeadLifecycleCandidate[], id: string) {
  return leads.find((item) => item.id === id);
}

function changeFor(eventEmitter: FakeEventEmitter, id: string) {
  return eventEmitter.events.find((event) => {
    const payload = event.payload as { before?: { id: string } };

    return payload.before?.id === id;
  })?.payload;
}
