# Lifely

Lifely is a decoupled, multi-tenant real estate CRM portfolio project. It combines a React single-page app with a Laravel API backend for tenant-scoped contacts, listings, leads, bulk email campaigns, activity logs, reports, settings, and RBAC. It also includes a NestJS backend option for showcasing an alternative Node.js API environment.

The Docker stack is the main local workflow. It runs the frontend, Laravel backend, NestJS backend, queue worker, scheduler, MySQL, PostgreSQL, Redis, phpMyAdmin, and Mailpit without requiring local PHP, Composer, Node.js, MySQL, PostgreSQL, Redis, or an SMTP service.

## Stack

- Frontend: React 18, TypeScript, Vite 6, Tailwind CSS, Radix/shadcn-style primitives, Lucide icons, Recharts
- Backend: PHP 8.4, Laravel 13, Laravel Sanctum bearer-token auth, Spatie Laravel Permission, L5-Swagger
- Alternative backend: NestJS 11 on Node.js 20
- Data, jobs, and mail: MySQL 8.4, PostgreSQL 16, Redis 7, Laravel queue worker and scheduler, Mailpit
- Local runtime: Docker Compose, Nginx, PHP-FPM, Vite, NestJS watch mode

## Repository Structure

```text
lifely/
|-- backend-laravel/   Laravel API, migrations, tests, OpenAPI spec
|-- backend-nestjs/    NestJS API option backed by PostgreSQL
|-- frontend/          React CRM app and API service layer
|-- docker/            Docker image config
|-- docs/              Architecture, API, RBAC, and component docs
|-- docker-compose.yml Local multi-service stack
|-- Makefile           Docker command shortcuts
|-- AGENTS.md          Project instructions for coding agents
`-- README.md
```

## Requirements

- Docker
- Docker Compose
- Optional: Make, for shorter container command aliases

For non-Docker setup, use the stack-specific guides:

- [Backend setup](backend-laravel/README.md)
- [NestJS backend setup](backend-nestjs/README.md)
- [Frontend setup](frontend/README.md)

## Quick Start

1. Create the root environment file.

   ```bash
   cp .env.example .env
   ```

   On Windows PowerShell:

   ```powershell
   Copy-Item .env.example .env
   ```

2. Start the full stack.

   ```bash
   docker compose up
   ```

   Rebuild when Dockerfiles or dependency manifests change:

   ```bash
   docker compose up --build
   ```

3. Open the local services.

   ```text
   Frontend:               http://localhost:5173
   Laravel backend health: http://localhost:8000/api/v1/health
   NestJS backend:         http://localhost:3000
   NestJS debugger:        localhost:9229
   Swagger UI:             http://localhost:8000/api/documentation
   OpenAPI YAML:           http://localhost:8000/api/docs
   phpMyAdmin:             http://localhost:8080
   Mailpit inbox:          http://localhost:8025
   ```

The Laravel backend container runs migrations and seeders on startup when the Docker flags in `docker-compose.yml` are enabled, so a fresh Docker database is login-ready after the stack finishes booting.

## Demo Login

```text
Email: maya@skyline.example
Password: password
```

## Services

- `frontend`: Vite React app served on port `5173`
- `backend`: Laravel API served by Nginx/PHP-FPM on port `8000`
- `backend-nestjs`: NestJS API option served on port `3000`
- `queue`: Laravel Redis queue worker for `emails`, `leads`, and `default`
- `scheduler`: Laravel scheduler process for due scheduled tasks
- `mysql`: MySQL database
- `postgresql`: PostgreSQL database for the NestJS backend option
- `redis`: Redis queue/cache service
- `phpmyadmin`: browser database admin UI on port `8080`
- `mailpit`: local SMTP capture service with a browser inbox on port `8025`

## Ports And Environment

Defaults are configured in the root `.env.example` and can be overridden in `.env`.

```text
BACKEND_PORT=8000
NESTJS_BACKEND_PORT=3000
NESTJS_DEBUG_PORT=9229
FRONTEND_PORT=5173
MYSQL_PORT=3307
MYSQL_DATABASE=lifely
MYSQL_ROOT_PASSWORD=secret
PHPMYADMIN_PORT=8080
POSTGRES_PORT=5433
POSTGRES_DATABASE=lifely_nestjs
POSTGRES_USER=lifely
POSTGRES_PASSWORD=secret
REDIS_PORT=6380
MAILPIT_SMTP_PORT=1025
MAILPIT_HTTP_PORT=8025
```

The frontend receives `VITE_API_BASE_URL=http://localhost:8000/api/v1` from Docker Compose. The Laravel backend receives its Docker database, Redis, Mailpit SMTP, CORS, token lifetime, and migration/seeder settings from `docker-compose.yml`. The NestJS backend receives `DATABASE_URL` plus individual PostgreSQL connection values for future database client configuration.

## Useful Commands

The Makefile forwards common commands into the Docker containers:

```bash
make artisan test
make artisan db:seed -- --force
make artisan migrate:fresh -- --seed
make composer test
make composer analyse
make composer lint
make npm run build
make npm run lint
```

Raw Docker equivalents:

```bash
docker compose up --build
docker compose up
docker compose down
docker compose down -v
docker compose logs -f backend
docker compose exec backend php artisan test
docker compose exec backend composer test
docker compose exec backend composer analyse
docker compose exec backend composer lint
docker compose exec backend php artisan db:seed --force
docker compose exec backend php artisan migrate:fresh --seed
docker compose logs -f backend-nestjs
docker compose exec backend-nestjs npm run test
docker compose exec frontend npm run build
docker compose exec frontend npm run lint
```

## Debugging

Start the Docker stack, open the repository in VS Code, set breakpoints, and run the matching debugger from the Run and Debug panel.

```bash
docker compose up --build
```

- `Listen for Laravel Xdebug`: listens on port `9003` and maps container paths from `/var/www/html` to `backend-laravel`.
- `Attach to NestJS (Docker)`: attaches to the NestJS inspector on port `9229`; the Docker service runs `npm run start:debug:docker` so TypeScript breakpoints in `backend-nestjs/src` can be hit.
- `Launch Frontend in Chrome`: opens `http://localhost:5173` with source maps enabled for React/Vite breakpoints in `frontend/src`.
- `Debug Full Docker Stack`: starts all three debugger configurations together.

Laravel Xdebug requires the VS Code PHP Debug extension. NestJS and frontend debugging use VS Code's JavaScript debugger.

## Validation

Run relevant validation before handing off code changes:

```bash
docker compose exec backend composer test
docker compose exec backend composer analyse
docker compose exec backend composer lint
docker compose exec frontend npm run build
docker compose exec frontend npm run lint
```

For focused local iteration, see the commands in the backend and frontend README files.

## Documentation

Project handoff docs live in [docs/](docs/README.md):

- [Architecture](docs/architecture.md): runtime shape, backend/frontend layers, tenancy, CRM modules, data tables, and local operations
- [API conventions](docs/api-conventions.md): auth, tenant headers, request/resource patterns, server-side query params, OpenAPI, and activity log payloads
- [Permission system](docs/permission-system.md): RBAC source of truth, roles, permission constants, and frontend visibility
- [Custom components](docs/custom-components.md): shared table, selector, dialog, RBAC, loading, page, and service patterns

## Local Mail

Docker Compose routes Laravel mail from the backend, queue worker, and scheduler through Mailpit. Open `http://localhost:8025` to inspect captured emails. The SMTP endpoint is available to containers as `mailpit:1025` and to the host at `localhost:1025` by default.

To send through Resend, keep `LIFELY_EMAIL_SENDER=mail` and set these values in the root `.env` before recreating the backend, queue, and scheduler containers:

```env
MAIL_MAILER=resend
RESEND_API_KEY=re_your_api_key
MAIL_FROM_ADDRESS=hello@your-verified-domain.example
```

All Lifely email workflows continue to use Laravel Mail, so changing `MAIL_MAILER` switches the provider for queued bulk email, quick-test mail, and future mail workflows without code changes.

## phpMyAdmin

Open `http://localhost:8080` and use:

```text
Server: mysql
Username: root
Password: secret
Database: lifely
```

If you changed `MYSQL_ROOT_PASSWORD` or `MYSQL_DATABASE` in `.env`, use those values instead.

## Notes

- Docker bind-mounts backend and frontend source directories for local development.
- Backend `vendor/`, frontend/NestJS `node_modules/`, Laravel config cache, MySQL data, PostgreSQL data, and Redis data are stored in Docker named volumes.
- Xdebug is installed in the backend image and configured through `docker/backend/xdebug.ini`.
- Laravel API routes are versioned under `/api/v1`.
- Protected API routes use Sanctum bearer tokens and tenant context. Backend authorization is the source of truth; frontend RBAC controls only route and UI visibility.
