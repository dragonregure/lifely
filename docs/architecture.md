# Architecture

Lifely is a decoupled, multi-tenant real estate CRM. The repository has a Laravel API backend in `backend-laravel/`, a React SPA frontend in `frontend/`, Docker support in `docker/`, and shared project docs in `docs/`.

## Runtime Shape

- Frontend: React 18, TypeScript, Vite, Tailwind CSS, shadcn-style Radix primitives, Lucide icons, Recharts.
- Backend: PHP 8.4, Laravel 13, Sanctum bearer tokens, MySQL, Redis queues, Spatie Laravel Permission, L5-Swagger.
- Local stack: `docker compose up` runs frontend, backend through Nginx/PHP-FPM, queue worker, scheduler, MySQL, Redis, phpMyAdmin, and Mailpit.
- Demo login after seeding: `maya@skyline.example` / `password`.

## Backend Layers

- Routes live in `backend-laravel/routes/api.php` under `/api/v1`.
- API controllers live in `app/Http/Controllers/Api/V1`.
- Tenant-aware controllers extend `BaseApiController` and call `tenantId($request)`.
- Form Requests live in `app/Http/Requests` and own validation.
- API Resources live in `app/Http/Resources` and own response shape.
- Repository contracts live in `app/Contracts`; implementations live in `app/Repositories`.
- Contract bindings live in `app/Providers/AppServiceProvider.php`.
- Shared support code lives under `app/Support`.
- Cross-cutting side effects such as activity logs should use observers/listeners, not repeated repository calls.

## Frontend Layers

- Routes are declared in `frontend/src/App.tsx`.
- Public marketing lives at `/`, login and registration live at `/login`, and protected routes redirect unauthenticated users to `/login`.
- Auth state lives in `src/context/AuthContext.tsx`.
- Pages live in `src/pages`.
- Settings submodules live in `src/pages/settings`.
- Shared components live in `src/components`.
- shadcn-style primitives live in `src/components/ui`.
- API services live in `src/services`.
- Backend response types live in `src/services/backendTypes.ts`.
- Backend-to-domain mapping lives in `src/services/mappers.ts`.
- Domain/UI types live in `src/types.ts`.
- Permission metadata lives in `src/rbac`.

## Tenant Model

Most CRM records are tenant-owned with `tenant_id`. Backend queries must explicitly scope tenant-owned resources to the current tenant.

References and roles can be tenant-scoped or system-scoped. System-scoped rows use `tenant_id = null`; only users with the relevant system permission can manipulate system-scoped data. Tenant-facing role queries should return system roles plus current-tenant roles while hiding roles that carry system-only permissions unless the caller has system role management access.

## Activity Logging

Activity logs are stored in `activity_logs`. Current activity-producing CRM models are observed by model observers in `app/Observers`. Update logs include structured changed fields in `activity_logs.properties.changes`.

Background jobs and scheduled workflows that change observed CRM models should update model instances in chunks so observers still record activity logs. Use query-level bulk updates only for changes that intentionally do not need CRM activity history.

## CRM Modules

- Contacts store people with a boolean Active/Inactive status and a fixed source enum.
- Listings store property inventory and can expose heavier document, contact, and user relations through explicit includes.
- Leads are the sales workflow records previously modeled as pipelines. The backend route surface is `/api/v1/leads`, the database table is `leads`, reference stages use the `lead_stage` group, and permissions use the `leads.*` namespace.
- The Leads page has a pipeline board for active workflow and an all-leads table for searchable, server-side list management. Both views use the same lead API and request relation includes only when rendering relation-aware state.
- Closed Won and Closed Lost are final lead stages. Moving a lead to Closed Won marks the related listing as Sold. Lead cards tied to a sold listing or inactive contact can only change active status until the blocking issue is resolved.

## Data Tables

Lifely tables are server-side by default for scalable modules. Frontend `DataTable` sends query state through service functions. Backend modules parse query state with `DataTableQuery` and paginate through `EloquentDataTable`.

Supported query concepts:

- `page`
- `per_page`
- `search`
- `sort`
- `direction`
- `filter[key]`

## Local Operations

Root Makefile shortcuts proxy commands into Docker containers:

```bash
make artisan test
make artisan migrate:fresh -- --seed
make composer analyse
make composer lint
make npm run build
make npm run lint
```
