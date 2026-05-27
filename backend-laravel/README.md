# Lifely Backend

Lifely backend is a Laravel API for the real estate CRM frontend. It provides tenant-scoped CRM endpoints, Sanctum token authentication, Swagger/OpenAPI documentation, MySQL persistence, and automated tests.

## Tech Stack

- PHP 8.4+
- Laravel 13
- Laravel Sanctum
- MySQL
- PHPUnit
- Swagger/OpenAPI documentation
- Composer

## Requirements

- PHP 8.4 or newer
- Composer
- MySQL 8 or compatible
- PHP extensions required by Laravel, including `pdo_mysql`, `mbstring`, `openssl`, `tokenizer`, `xml`, `ctype`, `json`, and `fileinfo`
- Optional: Node.js/npm only if you want to build Laravel's default frontend assets. The CRM frontend lives in `../frontend`.

## Local Setup

1. Go to the backend directory.

   ```bash
   cd backend-laravel
   ```

2. Install PHP dependencies.

   ```bash
   composer install
   ```

3. Create the local environment file.

   ```bash
   cp .env.example .env
   ```

   On Windows PowerShell:

   ```powershell
   Copy-Item .env.example .env
   ```

4. Generate the Laravel app key.

   ```bash
   php artisan key:generate
   ```

5. Create a MySQL database.

   ```sql
   CREATE DATABASE lifely CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   ```

6. Configure `.env` for MySQL and the frontend URL.

   ```env
   APP_URL=http://localhost:8000
   FRONTEND_URL=http://localhost:5173
   SANCTUM_STATEFUL_DOMAINS=localhost:5173,127.0.0.1:5173

   DB_CONNECTION=mysql
   DB_HOST=127.0.0.1
   DB_PORT=3306
   DB_DATABASE=lifely
   DB_USERNAME=root
   DB_PASSWORD=
   ```

7. Run migrations.

   ```bash
   php artisan migrate
   ```

8. Seed local demo data.

   ```bash
   php artisan db:seed
   ```

9. Start the API server.

   ```bash
   php artisan serve
   ```

10. Confirm the API is running.

   ```text
   http://localhost:8000/api/v1/health
   ```

## Local Demo User

The database seeder creates:

```text
Email: maya@skyline.example
Password: password
```

## API Documentation

Swagger UI is served from `public/docs/index.html` and reads the OpenAPI spec from `public/docs/openapi.yaml`.

After starting `php artisan serve`, open:

```text
http://localhost:8000/api/documentation
```

You can also open the static docs page directly:

```text
http://localhost:8000/docs/index.html
```

## Useful Commands

```bash
php artisan serve
php artisan migrate
php artisan db:seed
php artisan migrate:fresh --seed
php artisan test
composer test
```

## Auth Notes

- Authentication uses Laravel Sanctum bearer tokens.
- Login returns an access token and refresh token.
- Protected CRM routes require a valid Sanctum access token.
- Frontend CORS is controlled by `FRONTEND_URL`.

## Main API Prefix

All CRM API routes are versioned under:

```text
/api/v1
```

## Docker Setup

From the repository root, the backend is included in the full local stack:

```bash
docker compose up --build
```

The backend container runs migrations and seeders before serving the API with:

```bash
php artisan serve --host=0.0.0.0 --port=8000
```

Then open:

```text
http://localhost:8000/api/v1/health
```
