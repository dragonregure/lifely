# API Conventions

The Laravel backend exposes JSON APIs under `/api/v1`. Swagger UI is available at `/api/documentation`, and the raw OpenAPI YAML is served from `/api/docs`.

## Authentication

Lifely uses Laravel Sanctum bearer tokens with access and refresh tokens.

Public routes:

- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/refresh`
- `GET /health`

Protected routes use:

- `auth:sanctum`
- `access.token`

Protected requests should send:

```http
Authorization: Bearer <access-token>
Accept: application/json
```

Tenant context resolves from `X-Tenant-Id`, `tenant_id`, then the authenticated user's tenant. Normal clients can rely on the authenticated user tenant; explicit tenant context is a compatibility override, and tenant mismatch is rejected.

## Controller Pattern

- Use thin controllers.
- Resolve tenant context with `BaseApiController::tenantId($request)`.
- Authorize with permission constants, policies, or gates.
- Validate with Form Requests.
- Serialize with API Resources.
- Return `201 Created` for creates, `202 Accepted` for queued workflows, `204 No Content` for deletes, and `404` for tenant-scoped misses.

## Validation

Use Form Requests for validation. Use `ResolvesTenantForValidation` when validation needs tenant-aware `exists` rules.

Example:

```php
'owner_id' => ['nullable', 'uuid', Rule::exists('users', 'id')->where('tenant_id', $tenantId)]
```

## Repositories

Repository methods for tenant-owned resources accept `string $tenantId` as the first argument. They must scope queries by tenant before reads, updates, deletes, aggregates, and pagination.

Repositories should not own cross-cutting side effects. Activity logging is handled by observers/listeners after Eloquent CUD events.

## API Resources

Use API Resources for response shape. Keep backend response fields snake_case. Cast dates to ISO strings and numerics to stable numeric values when needed.

The frontend maps snake_case API responses to camelCase domain objects in `frontend/src/services/mappers.ts`.

## Optional Relation Includes

Keep list responses lean by default. Endpoints that expose heavier or optional relations should use an allowlisted `include[]` query parameter, such as `GET /listings?include[]=documents&include[]=contacts&include[]=users`.

Resources should wrap optional relation fields with `whenLoaded()` so omitted includes remove those keys from the response.

## Server-Side Tables

Data-heavy list endpoints should support server-side table parameters:

- `page`
- `per_page`, capped at 100
- `search`
- `sort`
- `direction`, `asc` or `desc`
- `filter[key]`

Backend helpers:

- `App\Support\DataTables\DataTableQuery`
- `App\Support\DataTables\EloquentDataTable`

Frontend helpers:

- `DataTable`
- `toQueryString` in `frontend/src/services/dataTableParams.ts`

## Exports

Use `App\Contracts\ExportServiceInterface` for file download generation. Controllers should authorize, validate filters, gather rows, and record any domain-specific audit event, then delegate CSV streaming to the export service.

## Contact API

Contact status is fixed to Active/Inactive. Store it as `contacts.status` boolean, expose API `status` as boolean, and keep display labels at serialization/UI boundaries.

Contact source is a fixed integer enum. Keep allowed backend values centralized in `App\Models\Contact::SOURCE_LABELS` and mirror them in frontend static contact source options.

## Lead API

Leads use `/api/v1/leads`, the `leads` table, the `lead_stage` reference group, and `leads.*` permissions. Avoid reintroducing `pipeline.*` API names for new work; historical migrations may still contain pipeline names for schema compatibility.

Lead list requests support server-side pagination, search, sorting, filters, and optional `include[]=contact|listing|user`. Stage and source inputs may be readable labels or numeric enum values. Comma-separated filters are accepted for assignees and sources.

Lead creation requires `contact_id`, `listing_id`, and `user_id`. Setting an assignee requires `leads.change_assignee`, or `leads.assign_to_self` when assigning the authenticated user.

Lead progress fields (`stage`, `is_active`, `next_task`) require `leads.update` and the authenticated user must be the assignee unless system bypass applies. Contact/listing changes are limited to manual-entry leads. Closed Won and Closed Lost are final stages, Closed Won marks the related listing Sold, and leads tied to a sold listing or inactive contact can only change `is_active`.

## OpenAPI

Update `backend-laravel/public/docs/openapi.yaml` for:

- New or changed routes
- Request body changes
- Query parameter changes
- Response schema changes
- Auth changes
- Permission requirements

Use `APP_URL`-driven server generation for environment-specific API URLs. In non-production environments, the docs may include `XDEBUG_SESSION_START` query parameters.

## Activity Logs

Activity logs include:

- `action_type`
- `description`
- `user_id`
- `user_name`
- `properties`

Update workflows should include changed fields in `properties.changes`, keyed by field name with `old` and `new` values.
