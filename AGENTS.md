# AGENTS.md

Act as a senior backend engineer helping build Lifely, a multi-tenant CRM portfolio project.

## Required Skills

Always use the matching project skill before making changes:

- `$laravel-backend-dev` for any Laravel backend, API, database, authentication, tenant, test, analysis, lint, or deployment work.
- `$react-frontend-dev` for any React frontend, UI, routing, service, state, styling, accessibility, build, lint, or browser-verification work.

Load the matching project reference files from each skill when working in `backend-laravel` or `frontend`.

## AGENTS.md Maintenance Rule

When implementing a new module, convention, architectural pattern, workflow, or recurring rule, check whether `AGENTS.md` or the relevant skill reference files should be updated.

If the change introduces guidance that future agents must follow, update the appropriate file in the same PR:

- Update `AGENTS.md` for project-wide rules, agent workflow rules, required skills, repository structure, or cross-stack conventions.
- Update the relevant skill reference file for stack-specific conventions, implementation patterns, coding standards, commands, examples, or best practices.
- Do not duplicate detailed implementation guidance in `AGENTS.md`; keep it in the relevant skill documentation.
- Keep documentation concise, practical, and focused on future development.

### Conflict Resolution

Before adding, modifying, or removing a rule:

- Check for conflicts with existing rules in `AGENTS.md` and skill reference files.
- If a new rule contradicts, replaces, removes, or significantly changes an existing rule, stop and ask for clarification before proceeding.
- Do not silently remove, overwrite, or reinterpret existing conventions.
- Existing documented rules take precedence until explicitly approved to change.

### Documentation Drift Prevention

When completing a task, verify whether any newly introduced convention, architecture decision, folder structure, workflow, or development rule should be documented for future contributors.

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
- Prefer existing project conventions over introducing new patterns.
- Keep changes focused, readable, and maintainable.
- Preserve multi-tenant data boundaries and authentication behavior.
- Put validation, serialization, persistence, and UI concerns in their appropriate layers.
- Backend authorization is the source of truth. Frontend RBAC is only for route and UI visibility.
- Keep tenant-scoped database access explicitly constrained by `tenant_id` or documented system-scope rules.
- Server-side data tables should handle pagination, search, filtering, and sorting on the backend. Frontend tables should send query state instead of processing large datasets locally.
- Update OpenAPI, frontend service types/mappers, and docs when public API request or response shapes change.
- Prefer extending existing modules over creating new abstractions.
- Do not introduce new architectural patterns unless there is a clear and documented benefit.
- Follow existing project structure before creating new directories, services, repositories, hooks, utilities, or abstractions.

## Verification

- Run tests before finishing when possible.
- For backend changes, prefer `composer test`, `composer analyse`, and `composer lint` from `backend-laravel` when relevant.
- For frontend changes, prefer `npm run build` and `npm run lint` from `frontend` when relevant.
- If tests or validation cannot be run, explain why and note the residual risk.
