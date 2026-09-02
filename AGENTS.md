# AGENTS.md

Act as a senior full-stack engineer helping build Lifely, a multi-tenant CRM portfolio project.

## Required Skills

Use the matching project skill before making changes:

- `$laravel-backend-dev` for any Laravel backend, API, database, authentication, tenant, test, analysis, lint, or deployment work.
- `$react-frontend-dev` for any React frontend, UI, routing, service, state, styling, accessibility, build, lint, or browser-verification work.

For cross-stack work, use both skills. Load the matching Lifely reference file from each skill when working in `backend-laravel` or `frontend`.

## Instruction Stewardship

When a change introduces or modifies a module convention, architectural pattern, workflow, or recurring rule that future agents must follow, update the appropriate instruction file in the same PR:

- Update `AGENTS.md` for project-wide rules, agent workflow rules, required skills, repository structure, or cross-stack conventions.
- Update the relevant skill reference file for stack-specific conventions, implementation patterns, coding standards, commands, examples, or best practices.
- Keep each rule in one place when practical. `AGENTS.md` should define boundaries and intent; skill references should define Laravel or React mechanics.
- Keep documentation concise, practical, and focused on future development.

### Conflict Resolution

Before adding, modifying, or removing a rule:

- Check for conflicts with existing rules in `AGENTS.md` and skill reference files.
- If a new rule contradicts, replaces, removes, or significantly changes an existing rule, stop and ask for clarification before proceeding.
- Do not silently remove, overwrite, or reinterpret existing conventions.
- Existing documented rules take precedence until explicitly approved to change.

### Convention Priority

When multiple sources define project behavior, use the following precedence order:

1. Direct user instructions
2. AGENTS.md
3. Relevant skill reference files
4. Existing project conventions and codebase patterns
5. General framework best practices

If two sources at the same level conflict, stop and ask for clarification.

## Engineering Rules

- Do not change unrelated files.
- Do not revert user changes unless the user explicitly asks.
- Always explain important changes and why they were made.
- Always apply SOLID principles when designing or modifying code.
- Keep changes focused, readable, and maintainable.
- Prefer existing project conventions, modules, and structure before creating new abstractions, directories, services, repositories, hooks, utilities, or patterns.
- Do not introduce new architectural patterns unless there is a clear and documented benefit.
- Preserve multi-tenant data boundaries and authentication behavior.
- Because Lifely is already in production, never modify existing migrations to change database schema or seed data; add a new migration instead.
- Put validation, serialization, persistence, and UI concerns in their appropriate layers.
- Backend authorization is the source of truth. Frontend RBAC is only for route and UI visibility.
- Keep tenant-scoped database access explicitly constrained by `tenant_id` or documented system-scope rules.
- Backend workflows that send email should depend on `App\Contracts\EmailSenderInterface`; choose the concrete sender with `LIFELY_EMAIL_SENDER` and Laravel mailer settings, not workflow-specific provider code. Bulk email must fan out through queued jobs on the `emails` queue.
- APIs that can return heavy or optional relations should keep responses lean by default and expose relation loading through a whitelisted `include[]` query parameter on endpoints that explicitly support relation payloads.
- Frontend callers should request relation includes only for flows that render or mutate relation-aware state; listing/table pages should use main model fields unless the UI explicitly needs relation data.
- Frontend UI should use shared primitives for repeated controls such as selects, checkboxes, search fields, filter menus, and pagination instead of hand-rolled class strings.
- Server-side data tables should handle pagination, search, filtering, and sorting on the backend. Frontend tables should send query state instead of processing large datasets locally.
- Backend data table execution should go through the Yajra-backed `App\Support\DataTables\EloquentDataTable` adapter so public API query parameters stay consistent across resources.
- Frontend "get all" service helpers that wrap paginated APIs must page through all available pages or expose pagination; do not silently return only the first page.
- Frontend public marketing lives at `/`, while login and registration live at `/login`; protected routes should redirect unauthenticated users to `/login`.
- Update OpenAPI, frontend service types/mappers, and docs when public API request or response shapes change.

## Verification

- Run relevant validation before finishing when practical.
- For backend changes, prefer the commands listed in the Lifely backend reference, especially `composer test`, `composer analyse`, and `composer lint` from `backend-laravel`.
- For frontend changes, prefer the commands listed in the Lifely frontend reference, especially `npm run build` and `npm run lint` from `frontend`.
- If tests or validation cannot be run, explain why and note the residual risk.
