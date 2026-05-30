# Custom Components

The frontend uses shadcn-style primitives plus Lifely-specific shared components for CRM workflows.

## Design Principles

- Keep screens dense, scannable, and work-focused.
- Prefer tables, filters, dialogs, tabs, sheets, and concise cards over marketing layouts.
- Use Lucide icons for icon buttons and navigation.
- Keep text inside controls readable on mobile and desktop.
- Use existing Tailwind tokens and utility helpers before introducing new styles.

## DataTable

Location: `frontend/src/components/data-table`

`DataTable` supports:

- Optional search
- Optional filters
- Optional actions column
- Server-side pagination, search, filtering, and sorting
- Page size choices up to 100
- Loading states
- Manual refresh through `refreshKey`

For scalable modules, use `serverSide` and pass `onQueryChange`. Do not load a large dataset and filter it on the client.

Typical service pairing:

```ts
getContactsPage(query, { signal })
```

The service should call `toQueryString(query)` and return `PaginatedResult<T>`.

## Dialogs

Location: `frontend/src/components/dialogs`

Shared dialog types:

- `CreateDialog`: create flows; supports tabs.
- `DetailDialog`: read/update flows; supports tabs and active-tab saves.
- `ConfirmationDialog`: destructive or state-changing confirmation flows.

Rules:

- Dialogs do not show the default `x` close affordance; use Cancel or Close buttons.
- Detail edit is activated by the pencil icon.
- Async handlers should keep the dialog open on failure and let the owning page show the error.
- Create/update/delete buttons should use loading states while mutations are in flight.

## RBAC Components

Location: `frontend/src/components/rbac`

- `PermissionRoute` protects route access.
- `PermissionGate` hides UI affordances when the user lacks permission.
- `AccessDenied` gives a consistent denied state.

Frontend RBAC is for visibility only. Backend authorization must still enforce every sensitive action.

## Loading Components

Location: `frontend/src/components/Loading.tsx`

Use the shared loading components for API-bound placeholders in tables, cards, buttons, dropdowns, and page sections. Prefer simple spinner states over custom one-off loaders.

## Page-Level Components

Common components:

- `AppLayout`
- `PageHeader`
- `MetricCard`
- `StatusBadge`

Pages should compose these components and keep business-specific API calls in service modules.

## Service Boundary

Use this structure for backend integration:

- `backendTypes.ts`: API response shapes, snake_case.
- `mappers.ts`: backend-to-UI mapping, snake_case to camelCase.
- `crmService.ts`, `rbacService.ts`, `referenceService.ts`, `reportingService.ts`: endpoint functions.
- `api.ts`: public service export surface.

Components should import service functions instead of calling `fetch` directly.
