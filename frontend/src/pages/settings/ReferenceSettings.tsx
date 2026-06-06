import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { Eye, Plus, RefreshCw, Trash2 } from "lucide-react";
import { DataTable, type DataTableColumn, type DataTableFilter, type DataTableQueryContext, type DataTableQueryState } from "@/components/data-table";
import { ConfirmationDialog } from "@/components/dialogs/ConfirmationDialog";
import { CreateDialog, type CreateDialogTab } from "@/components/dialogs/CreateDialog";
import { DetailDialog, type DetailDialogTab } from "@/components/dialogs/DetailDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/context/AuthContext";
import { PERMISSIONS } from "@/rbac/permissions";
import { useAuthorization } from "@/rbac/useAuthorization";
import {
  createReference,
  deleteReference,
  getReferenceGroupOptions,
  getReferencesPage,
  getReferenceTypeOptions,
  updateReference,
} from "@/services/api";
import { isAbortError } from "@/services/httpClient";
import type { ReferenceOption } from "@/services/referenceService";
import type { Reference, ReferenceStatus, ReferenceValueType } from "@/types";

const fallbackReferenceTypes: ReferenceValueType[] = ["string", "int", "float", "double", "bool", "array", "object", "null"];
const referenceStatuses: ReferenceStatus[] = ["ACTIVE", "INACTIVE"];

type ReferenceDraft = {
  scope: "tenant" | "system";
  group: string;
  key: string;
  value: string;
  type: ReferenceValueType;
  status: ReferenceStatus;
  meta: string;
};

function emptyDraft(): ReferenceDraft {
  return {
    scope: "tenant",
    group: "",
    key: "",
    value: "",
    type: "string",
    status: "ACTIVE",
    meta: "",
  };
}

function draftFromReference(reference: Reference): ReferenceDraft {
  return {
    scope: reference.isSystem ? "system" : "tenant",
    group: reference.group,
    key: reference.key,
    value: referenceValueToInput(reference.value),
    type: reference.type,
    status: reference.status,
    meta: reference.meta ? JSON.stringify(reference.meta, null, 2) : "",
  };
}

function parseMeta(value: string): { ok: true; data: Record<string, unknown> | null } | { ok: false; message: string } {
  if (value.trim() === "") {
    return { ok: true, data: null };
  }

  try {
    const parsed = JSON.parse(value) as unknown;

    if (!parsed || Array.isArray(parsed) || typeof parsed !== "object") {
      return { ok: false, message: "Metadata must be a JSON object." };
    }

    return { ok: true, data: parsed as Record<string, unknown> };
  } catch {
    return { ok: false, message: "Metadata must be valid JSON." };
  }
}

function referenceValueToInput(value: Reference["value"]): string {
  if (value === null || value === undefined) {
    return "";
  }

  if (typeof value === "object") {
    return JSON.stringify(value, null, 2);
  }

  return String(value);
}

function formatReferenceValue(value: Reference["value"]): string {
  if (value === null || value === undefined || value === "") {
    return "No value";
  }

  if (typeof value === "object") {
    return JSON.stringify(value);
  }

  return String(value);
}

function DetailField({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border bg-slate-50 p-3">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 break-words text-sm font-medium text-slate-900">{value}</p>
    </div>
  );
}

function ScopeBadge({ reference }: { reference: Reference }) {
  return <Badge variant={reference.isSystem ? "info" : "secondary"}>{reference.isSystem ? "System" : "Tenant"}</Badge>;
}

function ReferenceStatusBadge({ status }: { status: ReferenceStatus }) {
  return <Badge variant={status === "ACTIVE" ? "success" : "muted"}>{status}</Badge>;
}

function ReferenceFormFields({
  draft,
  fieldPrefix,
  canManageSystem,
  typeOptions,
  onChange,
}: {
  draft: ReferenceDraft;
  fieldPrefix: string;
  canManageSystem: boolean;
  typeOptions: ReferenceOption[];
  onChange: (patch: Partial<ReferenceDraft>) => void;
}) {
  const valueTypeOptions =
    typeOptions.length > 0
      ? typeOptions
      : fallbackReferenceTypes.map((type) => ({ label: type, value: type }));

  return {
    definition: (
      <div className="grid gap-4 md:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor={`${fieldPrefix}-group`}>Group</Label>
          <Input
            id={`${fieldPrefix}-group`}
            required
            value={draft.group}
            onChange={(event) => onChange({ group: event.target.value })}
            placeholder="street_type"
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor={`${fieldPrefix}-key`}>Key</Label>
          <Input
            id={`${fieldPrefix}-key`}
            required
            value={draft.key}
            onChange={(event) => onChange({ key: event.target.value })}
            placeholder="ave"
          />
        </div>
        <div className="grid gap-2 md:col-span-2">
          <Label htmlFor={`${fieldPrefix}-value`}>Value</Label>
          <Input
            id={`${fieldPrefix}-value`}
            value={draft.value}
            onChange={(event) => onChange({ value: event.target.value })}
            placeholder="Avenue"
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor={`${fieldPrefix}-type`}>Value type</Label>
          <Select
            id={`${fieldPrefix}-type`}
            value={draft.type}
            onChange={(event) => onChange({ type: event.target.value as ReferenceValueType })}
          >
            {valueTypeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </div>
        <div className="grid gap-2">
          <Label htmlFor={`${fieldPrefix}-status`}>Status</Label>
          <Select
            id={`${fieldPrefix}-status`}
            value={draft.status}
            onChange={(event) => onChange({ status: event.target.value as ReferenceStatus })}
          >
            {referenceStatuses.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </Select>
        </div>
      </div>
    ),
    scope: (
      <div className="grid gap-4">
        <div className="grid gap-2">
          <Label htmlFor={`${fieldPrefix}-scope`}>Scope</Label>
          <Select
            id={`${fieldPrefix}-scope`}
            value={draft.scope}
            disabled={!canManageSystem}
            onChange={(event) => onChange({ scope: event.target.value as ReferenceDraft["scope"] })}
          >
            <option value="tenant">Tenant reference</option>
            <option value="system">System reference</option>
          </Select>
        </div>
        <div className="grid gap-2">
          <Label htmlFor={`${fieldPrefix}-meta`}>Metadata JSON</Label>
          <Textarea
            id={`${fieldPrefix}-meta`}
            value={draft.meta}
            onChange={(event) => onChange({ meta: event.target.value })}
            placeholder={'{"display_order": 10}'}
          />
        </div>
      </div>
    ),
  };
}

export function ReferenceSettings() {
  const { tenant } = useAuth();
  const { can } = useAuthorization();
  const canCreate = can(PERMISSIONS.references.create);
  const canUpdate = can(PERMISSIONS.references.update);
  const canDelete = can(PERMISSIONS.references.delete);
  const canManageSystem = can(PERMISSIONS.references.manageSystem);
  const [references, setReferences] = useState<Reference[]>([]);
  const [selectedReferenceId, setSelectedReferenceId] = useState<string | null>(null);
  const [createDraft, setCreateDraft] = useState<ReferenceDraft>(() => emptyDraft());
  const [editDraft, setEditDraft] = useState<ReferenceDraft>(() => emptyDraft());
  const [createOpen, setCreateOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<Reference | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [tableQuery, setTableQuery] = useState<DataTableQueryState>({
    page: 1,
    pageSize: 10,
    search: "",
    filters: {},
    sort: null,
  });
  const [totalRows, setTotalRows] = useState(0);
  const [pageCount, setPageCount] = useState(1);
  const [referenceTypeOptions, setReferenceTypeOptions] = useState<ReferenceOption[]>([]);
  const [referenceGroupOptions, setReferenceGroupOptions] = useState<ReferenceOption[]>([]);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const selectedReference = useMemo(
    () => references.find((reference) => reference.id === selectedReferenceId) ?? null,
    [references, selectedReferenceId],
  );

  const loadReferences = useCallback(async (query: DataTableQueryState, signal?: AbortSignal) => {
    setIsLoading(true);
    setError("");

    try {
      const result = await getReferencesPage(query, { signal });
      if (signal?.aborted) return;

      setReferences(result.data);
      setTotalRows(result.total);
      setPageCount(result.pageCount);
    } catch (caught) {
      if (isAbortError(caught)) {
        return;
      }

      setError(caught instanceof Error ? caught.message : "Unable to load references.");
    } finally {
      if (!signal?.aborted) {
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    Promise.all([getReferenceTypeOptions(), getReferenceGroupOptions()])
      .then(([typeOptions, groupOptions]) => {
        setReferenceTypeOptions(typeOptions);
        setReferenceGroupOptions(groupOptions);
      })
      .catch((caught) => setError(caught instanceof Error ? caught.message : "Unable to load reference filters."));
  }, []);

  const handleQueryChange = useCallback((nextQuery: DataTableQueryState, context: DataTableQueryContext) => {
    setTableQuery(nextQuery);
    void loadReferences(nextQuery, context.signal);
  }, [loadReferences]);

  useEffect(() => {
    if (selectedReference) {
      setEditDraft(draftFromReference(selectedReference));
    }
  }, [selectedReference]);

  const runAction = async (action: () => Promise<void>, successMessage: string) => {
    setIsSaving(true);
    setError("");
    setNotice("");

    try {
      await action();
      setNotice(successMessage);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The reference change could not be saved.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateReference = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    void runAction(async () => {
      const parsedMeta = parseMeta(createDraft.meta);
      if (!parsedMeta.ok) {
        throw new Error(parsedMeta.message);
      }

      const reference = await createReference({
        tenantId: createDraft.scope === "system" ? null : undefined,
        group: createDraft.group,
        key: createDraft.key,
        value: createDraft.value || null,
        type: createDraft.type,
        meta: parsedMeta.data,
        status: createDraft.status,
      });

      setReferences((current) => [reference, ...current]);
      setTotalRows((current) => current + 1);
      setReferenceGroupOptions((current) => {
        if (current.some((option) => option.value === reference.group)) {
          return current;
        }

        return [...current, { label: reference.group, value: reference.group }].sort((a, b) => a.label.localeCompare(b.label));
      });
      setCreateDraft(emptyDraft());
      setCreateOpen(false);
    }, "Reference created.");
  };

  const saveDefinition = () => {
    if (!selectedReference) return;

    void runAction(async () => {
      const updated = await updateReference(selectedReference.id, {
        group: editDraft.group,
        key: editDraft.key,
        value: editDraft.value || null,
        type: editDraft.type,
        status: editDraft.status,
      });

      setReferences((current) => current.map((reference) => (reference.id === updated.id ? updated : reference)));
    }, "Reference details updated.");
  };

  const saveScopeAndMeta = () => {
    if (!selectedReference) return;

    void runAction(async () => {
      const parsedMeta = parseMeta(editDraft.meta);
      if (!parsedMeta.ok) {
        throw new Error(parsedMeta.message);
      }

      const updated = await updateReference(selectedReference.id, {
        ...(canManageSystem ? { tenantId: editDraft.scope === "system" ? null : tenant?.id } : {}),
        meta: parsedMeta.data,
      });

      setReferences((current) => current.map((reference) => (reference.id === updated.id ? updated : reference)));
    }, "Reference scope updated.");
  };

  const handleDeleteReference = () => {
    if (!pendingDelete) return;

    void runAction(async () => {
      await deleteReference(pendingDelete.id);
      setReferences((current) => current.filter((reference) => reference.id !== pendingDelete.id));
      setTotalRows((current) => Math.max(0, current - 1));
      if (selectedReferenceId === pendingDelete.id) {
        setSelectedReferenceId(null);
        setDetailOpen(false);
      }
      setPendingDelete(null);
    }, "Reference deleted.");
  };

  const openReference = (reference: Reference) => {
    setSelectedReferenceId(reference.id);
    setDetailOpen(true);
  };

  const filters = useMemo<DataTableFilter<Reference>[]>(
    () => [
      {
        id: "group",
        label: "Group",
        defaultValue: "all",
        options: [{ label: "All groups", value: "all" }, ...referenceGroupOptions],
        predicate: (reference, selectedValue) => selectedValue === "all" || reference.group === selectedValue,
      },
      {
        id: "type",
        label: "Value type",
        defaultValue: "all",
        options: [{ label: "All types", value: "all" }, ...referenceTypeOptions],
        predicate: (reference, selectedValue) => selectedValue === "all" || reference.type === selectedValue,
      },
      {
        id: "scope",
        label: "Scope",
        defaultValue: "all",
        options: [
          { label: "All scopes", value: "all" },
          { label: "System", value: "system" },
          { label: "Tenant", value: "tenant" },
        ],
        predicate: (reference, selectedValue) =>
          selectedValue === "all" || (selectedValue === "system" ? reference.isSystem : !reference.isSystem),
      },
      {
        id: "status",
        label: "Status",
        defaultValue: "all",
        options: [
          { label: "All statuses", value: "all" },
          { label: "Active", value: "ACTIVE" },
          { label: "Inactive", value: "INACTIVE" },
        ],
        predicate: (reference, selectedValue) => selectedValue === "all" || reference.status === selectedValue,
      },
    ],
    [referenceGroupOptions, referenceTypeOptions],
  );

  const columns = useMemo<DataTableColumn<Reference>[]>(
    () => [
      {
        id: "reference",
        header: "Reference",
        cell: (reference) => (
          <>
            <p className="font-medium">{reference.key}</p>
            <p className="text-xs text-muted-foreground">{reference.group}</p>
          </>
        ),
        searchValue: (reference) => `${reference.group} ${reference.key}`,
      },
      {
        id: "value",
        header: "Value",
        cell: (reference) => <span className="line-clamp-2 break-words">{formatReferenceValue(reference.value)}</span>,
        searchValue: (reference) => formatReferenceValue(reference.value),
      },
      {
        id: "scope",
        header: "Scope",
        cell: (reference) => <ScopeBadge reference={reference} />,
        searchValue: (reference) => (reference.isSystem ? "System" : "Tenant"),
        sortable: false,
      },
      {
        id: "type",
        header: "Type",
        accessor: "type",
      },
      {
        id: "status",
        header: "Status",
        cell: (reference) => <ReferenceStatusBadge status={reference.status} />,
        searchValue: (reference) => reference.status,
      },
      {
        id: "updated",
        header: "Updated",
        cell: (reference) => (reference.updatedAt ? new Date(reference.updatedAt).toLocaleDateString() : "Not recorded"),
        searchValue: (reference) => reference.updatedAt ?? "",
      },
    ],
    [],
  );

  const createFields = ReferenceFormFields({
    draft: createDraft,
    fieldPrefix: "create-reference",
    canManageSystem,
    typeOptions: referenceTypeOptions,
    onChange: (patch) => setCreateDraft((draft) => ({ ...draft, ...patch })),
  });
  const editFields = ReferenceFormFields({
    draft: editDraft,
    fieldPrefix: "edit-reference",
    canManageSystem,
    typeOptions: referenceTypeOptions,
    onChange: (patch) => setEditDraft((draft) => ({ ...draft, ...patch })),
  });

  const createTabs: CreateDialogTab[] = [
    { value: "definition", label: "Definition", content: createFields.definition },
    { value: "scope", label: "Scope", content: createFields.scope },
  ];

  const detailTabs: DetailDialogTab[] | undefined = selectedReference
    ? [
        {
          value: "definition",
          label: "Definition",
          viewContent: (
            <div className="grid gap-3 md:grid-cols-2">
              <DetailField label="Group" value={selectedReference.group} />
              <DetailField label="Key" value={selectedReference.key} />
              <DetailField label="Value" value={formatReferenceValue(selectedReference.value)} />
              <DetailField label="Type" value={selectedReference.type} />
              <DetailField label="Status" value={selectedReference.status} />
              <DetailField label="Updated" value={selectedReference.updatedAt ? new Date(selectedReference.updatedAt).toLocaleString() : "Not recorded"} />
            </div>
          ),
          editContent: editFields.definition,
          onSave: saveDefinition,
        },
        {
          value: "scope",
          label: "Scope & metadata",
          viewContent: (
            <div className="grid gap-3">
              <div className="grid gap-3 md:grid-cols-2">
                <DetailField label="Scope" value={selectedReference.isSystem ? "System reference" : "Tenant reference"} />
                <DetailField label="Tenant" value={selectedReference.tenantId ?? "All tenants"} />
              </div>
              <div className="rounded-md border bg-slate-50 p-3">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Metadata</p>
                <pre className="mt-2 max-h-56 overflow-auto whitespace-pre-wrap break-words text-xs text-slate-800">
                  {selectedReference.meta ? JSON.stringify(selectedReference.meta, null, 2) : "No metadata"}
                </pre>
              </div>
            </div>
          ),
          editContent: editFields.scope,
          onSave: saveScopeAndMeta,
        },
      ]
    : undefined;

  return (
    <div className="grid gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Reference Setting</CardTitle>
          <CardDescription>Manage tenant and system reference values used across CRM forms and workflows.</CardDescription>
        </CardHeader>
      </Card>

      {(notice || error) && (
        <div className={`rounded-md border p-3 text-sm ${error ? "border-red-200 bg-red-50 text-red-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}>
          {error || notice}
        </div>
      )}

      <DataTable
        actions={(reference) => {
          const canRemoveReference = canDelete && (!reference.isSystem || canManageSystem);

          return (
            <>
              <Button variant="outline" size="icon" title="View reference" aria-label="View reference" onClick={() => openReference(reference)}>
                <Eye className="h-4 w-4" />
              </Button>
              {canRemoveReference && (
                <Button
                  variant="outline"
                  size="icon"
                  title="Delete reference"
                  aria-label="Delete reference"
                  onClick={() => setPendingDelete(reference)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </>
          );
        }}
        columns={columns}
        data={references}
        emptyMessage={isLoading ? "Loading references..." : "No references found."}
        filters={filters}
        initialPageSize={10}
        isLoading={isLoading}
        onQueryChange={handleQueryChange}
        rowKey="id"
        search={{ enabled: true, placeholder: "Search references, keys, or values" }}
        serverPageCount={pageCount}
        serverSide
        serverTotalRows={totalRows}
        toolbarEnd={
          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => void loadReferences(tableQuery)} disabled={isSaving} isLoading={isLoading} loadingLabel="Refreshing references">
              {!isLoading && <RefreshCw className="h-4 w-4" />}
              Refresh
            </Button>
            {canCreate && (
              <CreateDialog
                title="Create reference"
                description="Add a tenant reference or, with system permission, a globally available system reference."
                isSubmitting={isSaving}
                submitLabel="Create reference"
                open={createOpen}
                onOpenChange={setCreateOpen}
                onSubmit={handleCreateReference}
                tabs={createTabs}
                trigger={
                  <Button size="sm">
                    <Plus className="h-4 w-4" />
                    Add reference
                  </Button>
                }
              />
            )}
          </div>
        }
      />

      {selectedReference && (
        <DetailDialog
          title={selectedReference.key}
          description={`${selectedReference.group} reference`}
          open={detailOpen}
          editable={canUpdate && (!selectedReference.isSystem || canManageSystem)}
          isSubmitting={isSaving}
          onOpenChange={(open) => {
            setDetailOpen(open);
            if (!open) setSelectedReferenceId(null);
          }}
          tabs={detailTabs}
          submitLabel="Save changes"
        />
      )}

      {pendingDelete && (
        <ConfirmationDialog
          title="Delete reference"
          description={`${pendingDelete.key} will be removed from ${pendingDelete.isSystem ? "system" : "tenant"} references.`}
          confirmLabel="Delete"
          isSubmitting={isSaving}
          variant="destructive"
          open={Boolean(pendingDelete)}
          onOpenChange={(open) => {
            if (!open) setPendingDelete(null);
          }}
          onConfirm={handleDeleteReference}
        />
      )}
    </div>
  );
}
