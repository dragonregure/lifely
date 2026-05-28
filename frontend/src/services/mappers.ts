import type {
  BackendActivity,
  BackendCampaign,
  BackendContact,
  BackendDeal,
  BackendListing,
  BackendPermission,
  BackendRole,
  BackendTenant,
  BackendUser,
  BackendUserAccess,
} from "@/services/backendTypes";
import type { AccessRole, ActivityLog, Contact, EmailCampaign, Listing, Permission, PipelineDeal, Tenant, User, UserAccess } from "@/types";

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function mapTenant(tenant: BackendTenant): Tenant {
  return {
    id: tenant.id,
    name: tenant.name,
    createdAt: tenant.created_at,
    plan: "Growth",
  };
}

export function mapUser(user: BackendUser): User {
  return {
    id: user.id,
    tenantId: user.tenant_id,
    role: user.role,
    roles: user.roles ?? [user.role],
    directPermissions: user.direct_permissions ?? [],
    permissions: user.permissions ?? [],
    name: user.name,
    email: user.email,
    avatarInitials: initials(user.name),
  };
}

export function mapPermission(permission: BackendPermission): Permission {
  return {
    id: permission.id,
    name: permission.name,
    guardName: permission.guard_name,
  };
}

export function mapRole(role: BackendRole): AccessRole {
  return {
    id: role.id,
    name: role.name,
    guardName: role.guard_name,
    permissions: role.permissions?.map(mapPermission) ?? [],
  };
}

export function mapUserAccess(access: BackendUserAccess): UserAccess {
  return {
    userId: access.user_id,
    roles: access.roles,
    directPermissions: access.direct_permissions,
    permissions: access.permissions,
  };
}

export function mapContact(contact: BackendContact): Contact {
  return {
    id: contact.id,
    tenantId: contact.tenant_id,
    ownerId: contact.owner_id ?? "",
    firstName: contact.first_name,
    lastName: contact.last_name,
    email: contact.email,
    phone: contact.phone ?? "",
    status: contact.status,
    budget: Number(contact.budget ?? 0),
    source: contact.source ?? "",
    lastContactedAt: contact.last_contacted_at ?? contact.created_at ?? new Date().toISOString(),
  };
}

export function mapListing(listing: BackendListing): Listing {
  return {
    id: listing.id,
    tenantId: listing.tenant_id,
    title: listing.title,
    address: listing.address,
    price: Number(listing.price),
    status: listing.status,
    bedrooms: listing.bedrooms,
    bathrooms: listing.bathrooms,
    type: listing.property_type,
  };
}

export function mapDeal(deal: BackendDeal): PipelineDeal {
  return {
    id: deal.id,
    tenantId: deal.tenant_id,
    contactId: deal.contact_id,
    listingId: deal.listing_id,
    userId: deal.user_id,
    stage: deal.stage,
    value: Number(deal.value),
    nextTask: deal.next_task,
    dueAt: deal.due_at,
    contact: deal.contact ? mapContact(deal.contact) : null,
    listing: deal.listing ? mapListing(deal.listing) : null,
  };
}

export function mapActivity(log: BackendActivity): ActivityLog {
  return {
    id: log.id,
    tenantId: log.tenant_id,
    userId: log.user_id ?? "",
    actionType: log.action_type,
    description: log.description,
    createdAt: log.created_at ?? new Date().toISOString(),
  };
}

export function mapCampaign(campaign: BackendCampaign): EmailCampaign {
  return {
    id: campaign.id,
    tenantId: campaign.tenant_id,
    subject: campaign.subject,
    recipientCount: campaign.recipient_count,
    status: campaign.status,
    createdAt: campaign.created_at ?? new Date().toISOString(),
  };
}
