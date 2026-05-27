# Lifely

Lifely is a decoupled real estate CRM with a React frontend and Laravel API backend. The local Docker stack runs the frontend, backend, MySQL, Redis, and a queue worker.

## Folder Structure

```text
lifely/
|-- frontend/
|-- backend-laravel/
|-- docker/
|-- docker-compose.yml
|-- .env.example
|-- README.md
`-- docs/
```

## Requirements

- Docker
- Docker Compose

You do not need local PHP, Composer, Node.js, MySQL, or Redis for the Docker workflow.

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

   If Dockerfiles or dependency manifests change, rebuild explicitly:

   ```bash
   docker compose up --build
   ```

3. Open the apps.

   ```text
   Frontend: http://localhost:5173
   Backend health: http://localhost:8000/api/v1/health
   API docs: http://localhost:8000/api/documentation
   phpMyAdmin: http://localhost:8080
   ```

## Local Demo Login

The backend container runs migrations and seeds demo data on startup.

```text
Email: maya@skyline.example
Password: password
```

## Services

- `frontend`: Vite React app
- `backend`: Laravel API served with `php artisan serve`
- `queue`: Laravel Redis queue worker
- `mysql`: MySQL database
- `phpmyadmin`: Browser database admin UI
- `redis`: Redis queue/cache service

## Useful Commands

```bash
docker compose up --build
docker compose up
docker compose down
docker compose down -v
docker compose logs -f backend
docker compose exec backend php artisan test
docker compose exec backend composer test
docker compose exec backend php artisan migrate:fresh --seed
docker compose exec frontend npm run build
```

## Ports

Defaults can be changed in the root `.env`.

```text
Frontend: 5173
Backend: 8000
phpMyAdmin: 8080
MySQL: 3307 on the host, 3306 inside Docker
Redis: 6380 on the host, 6379 inside Docker
```

## phpMyAdmin

Open:

```text
http://localhost:8080
```

Default local credentials:

```text
Server: mysql
Username: root
Password: secret
Database: lifely
```

## Notes

- Laravel environment values for Docker are injected from `docker-compose.yml`.
- The backend code is bind-mounted for local development, while `vendor/` is kept in a Docker named volume.
- Laravel's Docker config cache is kept in a Docker named volume, so local `.env` values do not leak into the container.
- The frontend code is bind-mounted for local development, while `node_modules/` is kept in a Docker named volume.
- MySQL and Redis data are stored in Docker named volumes.
