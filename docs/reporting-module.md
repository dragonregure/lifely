# Reporting Module

Lifely reporting is currently backed by the modules that exist today: contacts, leads, listings, team members, activity logs, and email campaign data. The module intentionally avoids fabricating clinical, visit, compliance, satisfaction, invoice, or payment metrics until those source modules exist.

## Implemented Now

- Executive CRM KPIs: active clients, new clients, closed-won revenue, open pipeline, win rate, pending tasks, lead value, lead health, and lead-by-stage value.
- Client reports: client summary, client activity, and high-risk clients.
- Workforce report: team performance based on assigned leads, won leads, activity count, and pipeline value.
- Operations report: service volume proxy using lead source and stage volume.
- Financial report: revenue and pipeline based on leads and listing values.
- Global filters where supported by current data: date range, team member, source, stage, client status, and high-risk threshold.
- Server-side pagination, search, and sorting on report row endpoints.
- CSV export with an activity-log audit event.
- Mobile-responsive report UI using shared KPI cards, filters, tabs, and data-table primitives.

## Product Debt

The following requirements need future domain modules before reporting can calculate them truthfully:

- Visits: total visits, completed visits, missed visits, cancelled visits, late check-in, early check-out, GPS mismatch, attendance, working hours, billable hours, and utilization.
- Clinical/client risk: assessments, visit thresholds based on care delivery, critical incidents, and satisfaction scores.
- Compliance: missing documentation, expired certifications, missing assessments, and unreviewed incidents.
- Finance: invoices, paid invoices, outstanding invoices, overdue invoices, payments, gross margin, and profitability.
- Organization structure: branch filters, region filters, caregiver-only report scoping, and branch/team manager scoping.
- Reporting platform features: Excel export, PDF export, saved report views, and drill-down destinations into future visit, incident, invoice, and compliance records.

## Future Implementation Notes

- Add tenant-scoped source tables for visits, incidents, certifications, assessments, invoices, payments, branches, and regions before expanding the report calculations.
- Keep report endpoints lean by default and continue to paginate, search, and sort on the backend.
- Audit every export format through `activity_logs` with report key, format, filters, and row count.
- Preserve backend authorization as the source of truth. Frontend role visibility should remain a convenience layer only.
