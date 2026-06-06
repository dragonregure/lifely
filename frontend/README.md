# Lifely Frontend

Lifely frontend is a React CRM single-page app for real estate offices. It talks to the Laravel API through a configurable base URL and uses the backend for authentication, contacts, listings, Lead, email campaign, activity, and reporting data.

## Tech Stack

- React 18
- TypeScript
- Vite
- Tailwind CSS
- Shadcn/ui-style components built on Radix UI primitives
- React Router
- Lucide React icons
- Recharts
- ESLint
- Inter font

## Requirements

- Node.js 20 or newer
- npm
- Lifely Laravel backend running locally, usually at `http://localhost:8000`

## Local Setup

1. Go to the frontend directory.

   ```bash
   cd frontend
   ```

2. Install dependencies.

   ```bash
   npm install
   ```

3. Create the local environment file.

   ```bash
   cp .env.example .env
   ```

   On Windows PowerShell:

   ```powershell
   Copy-Item .env.example .env
   ```

4. Confirm the API URL in `.env`.

   ```env
   VITE_API_BASE_URL=http://localhost:8000/api/v1
   ```

5. Start the development server.

   ```bash
   npm run dev
   ```

6. Open the app.

   ```text
   http://localhost:5173
   ```

## Login For Local Demo

After the backend is migrated and seeded, use:

```text
Email: maya@skyline.example
Password: password
```

## Useful Scripts

```bash
npm run dev
npm run build
npm run preview
npm run lint
```

## Notes

- The frontend stores Sanctum bearer tokens in local storage for the local SPA flow.
- The API base URL is environment-driven through `VITE_API_BASE_URL`.
- Keep backend CORS `FRONTEND_URL` aligned with the frontend dev server URL.

## Docker Setup

From the repository root, the frontend is included in the full local stack:

```bash
docker compose up --build
```

Then open:

```text
http://localhost:5173
```
