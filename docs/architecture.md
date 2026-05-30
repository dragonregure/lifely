# Architecture

Lifely is a decoupled, multi-tenant real estate CRM. The repository has a Laravel API backend in `backend-laravel/`, a React SPA frontend in `frontend/`, Docker support in `docker/`, and shared project docs in `docs/`.

## Runtime Shape

- Frontend: React 18, TypeScript, Vite, Tailwind CSS, shadcn-style Radix primitives, Lucide icons, Recharts.
- Backend: PHP 8.4, Laravel 13, Sanctum bearer tokens, MySQL, Redis queues, Spatie Laravel Permission, L5-Swagger.
- Local stack: `docker compose up` runs frontend, backend through Nginx/PHP-FPM, queue worker, MySQL, Redis, and phpMyAdmin.
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

Most CRM records are tenant-owned with `tenant_id`. Backend queries must explicitly scope tenant-owned resources to the current tenant. The Reference module supports both tenant references and system references. System references have `tenant_id = null`; only users with the relevant system permission can manipulate system-scoped data.

## Activity Logging

Activity logs are stored in `activity_logs`. Current activity-producing CRM models are observed by model observers in `app/Observers`. Update logs include structured changed fields in `activity_logs.properties.changes`.

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
