"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import useSWR from "swr";
import useSWRMutation from "swr/mutation";
import { z } from "zod";

import type { RedmineUser } from "@/modules/auth/helpers/session";
import type {
  IssueFilterCriterion,
  IssueFilterOption,
} from "@/modules/issues/helpers/issue-filter-options";
import {
  type IssueListPreferences,
  readIssuePreferences,
  writeIssuePreferences,
} from "@/modules/issues/helpers/issue-list-preferences";
import { buildIssueListUrl } from "@/modules/issues/helpers/issue-list-query";
import { issuePageSizes } from "@/modules/issues/helpers/issue-list-query";
import type { RedmineIssuePage } from "@/modules/redmine/helpers/redmine-api";

type ResponseError = Error & { status: number };
type ApiError = { error?: string };
type FilterResponse = { fields: IssueFilterOption[]; instance: string };
type FilterDraft = { field: string; operator: string; value: string };
const draftSchema = z.object({
  field: z.string().min(1),
  operator: z.string().min(1),
  value: z.string().max(200),
});

async function readError(response: Response) {
  return (await response.json().catch(() => ({}))) as ApiError;
}
async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    const payload = await readError(response);
    const error = new Error(payload.error ?? "No se pudo completar la solicitud.") as ResponseError;
    error.status = response.status;
    throw error;
  }
  return (await response.json()) as T;
}
async function fetchIssues(url: string) {
  return fetchJson<RedmineIssuePage>(url);
}
async function fetchFilters(url: string) {
  return fetchJson<FilterResponse>(url);
}
async function endSession(url: string) {
  const response = await fetch(url, { method: "DELETE" });
  if (!response.ok) {
    const payload = await readError(response);
    throw new Error(payload.error ?? "No se pudo cerrar la sesión.");
  }
}
function formatDate(value: string) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.valueOf())
    ? "—"
    : new Intl.DateTimeFormat("es", { dateStyle: "medium" }).format(date);
}
function isSupported(filters: IssueFilterCriterion[], fields: IssueFilterOption[]) {
  return filters.every((filter) =>
    fields.some(
      (field) =>
        field.field === filter.field &&
        field.operators.some((operator) => operator.value === filter.operator),
    ),
  );
}

export function IssueList({ user }: { user: RedmineUser }) {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [preferences, setPreferences] = useState<IssueListPreferences>({
    version: 1,
    pageSize: 10,
    visibleFields: ["status_id", "assigned_to_id", "project_id"],
    savedFilters: [],
  });
  const [preferencesReady, setPreferencesReady] = useState(false);
  const [filters, setFilters] = useState<IssueFilterCriterion[]>([]);
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [selectedSavedId, setSelectedSavedId] = useState("");
  const [filterName, setFilterName] = useState("");
  const [nameError, setNameError] = useState("");
  const [logoutError, setLogoutError] = useState<string | null>(null);
  const [logoutSuccess, setLogoutSuccess] = useState(false);
  const {
    data: filterData,
    error: filterError,
    mutate: mutateFilters,
  } = useSWR<FilterResponse, ResponseError>("/api/issues/filters", fetchFilters);
  const redmineInstance = filterData?.instance ?? "";
  const fields = filterData?.fields ?? [];
  const queryUrl = useMemo(
    () => buildIssueListUrl(page, preferences.pageSize, filters),
    [page, preferences.pageSize, filters],
  );
  const { data, error, isLoading, mutate } = useSWR<RedmineIssuePage, ResponseError>(
    preferencesReady ? queryUrl : null,
    fetchIssues,
  );
  const { trigger, isMutating } = useSWRMutation("/api/auth/session", endSession);
  const draftForm = useForm<FilterDraft>({
    resolver: zodResolver(draftSchema),
    defaultValues: { field: "status_id", operator: "=", value: "" },
  });
  const draftField = useWatch({ control: draftForm.control, name: "field" });
  const draftOperator = useWatch({ control: draftForm.control, name: "operator" });
  const chosenField = fields.find((field) => field.field === draftField);
  const chosenOperator = chosenField?.operators.find(
    (operator) => operator.value === draftOperator,
  );

  useEffect(() => {
    if (!redmineInstance && !filterError) return;
    const timer = window.setTimeout(() => {
      setSelectedSavedId("");
      setPreferences(readIssuePreferences(user.id, redmineInstance || window.location.origin));
      setPreferencesReady(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [user.id, redmineInstance, filterError]);
  useEffect(() => {
    if (preferencesReady)
      writeIssuePreferences(user.id, redmineInstance || window.location.origin, preferences);
  }, [preferences, preferencesReady, user.id, redmineInstance]);
  useEffect(() => {
    if (error?.status === 401) router.replace("/login");
  }, [error, router]);
  const currentPage = data ? Math.floor(data.offset / data.limit) + 1 : page;

  const logout = async () => {
    setLogoutError(null);
    setLogoutSuccess(false);
    try {
      await trigger();
      setLogoutSuccess(true);
      window.setTimeout(() => router.replace("/login"), 500);
    } catch (err) {
      setLogoutError(
        err instanceof Error ? err.message : "No se pudo cerrar la sesión. Inténtalo de nuevo.",
      );
    }
  };
  const changeFilters = (next: IssueFilterCriterion[]) => {
    setFilters(next);
    setPage(1);
    setEditIndex(null);
  };
  const submitDraft = draftForm.handleSubmit((draft) => {
    if (!chosenField) return;
    if (filters.some((filter, index) => filter.field === draft.field && index !== editIndex)) {
      draftForm.setError("field", { message: "Ya existe un filtro para este campo." });
      return;
    }
    if (chosenOperator?.requiresValue && !draft.value.trim()) {
      draftForm.setError("value", { message: "Escribe un valor para este filtro." });
      return;
    }
    const criterion = {
      field: draft.field,
      operator: draft.operator,
      ...(chosenOperator?.requiresValue ? { value: draft.value.trim() } : {}),
    };
    const next = [...filters];
    if (editIndex === null) next.push(criterion);
    else next[editIndex] = criterion;
    changeFilters(next);
    setEditIndex(null);
    draftForm.reset({
      field: chosenField.field,
      operator: chosenField.operators[0]?.value ?? "=",
      value: "",
    });
  });
  const editFilter = (index: number) => {
    const filter = filters[index];
    setEditIndex(index);
    draftForm.reset({ field: filter.field, operator: filter.operator, value: filter.value ?? "" });
  };
  const saveCurrentFilter = () => {
    const name = filterName.trim();
    if (!name) {
      setNameError("Escribe un nombre para guardar el filtro.");
      return;
    }
    const saved = { id: crypto.randomUUID(), name, filters: [...filters] };
    setPreferences((current) => ({ ...current, savedFilters: [...current.savedFilters, saved] }));
    setSelectedSavedId(saved.id);
    setFilterName("");
    setNameError("");
  };
  const selectedSaved = preferences.savedFilters.find((saved) => saved.id === selectedSavedId);
  const applySelectedSaved = () => {
    if (selectedSaved) changeFilters(selectedSaved.filters);
  };
  const renameSaved = () => {
    const name = filterName.trim();
    if (!selectedSaved || !name) {
      setNameError("Escribe un nombre para el filtro guardado.");
      return;
    }
    setPreferences((current) => ({
      ...current,
      savedFilters: current.savedFilters.map((saved) =>
        saved.id === selectedSaved.id ? { ...saved, name } : saved,
      ),
    }));
    setFilterName("");
    setNameError("");
  };
  const updateSaved = () => {
    if (!selectedSaved) return;
    setPreferences((current) => ({
      ...current,
      savedFilters: current.savedFilters.map((saved) =>
        saved.id === selectedSaved.id ? { ...saved, filters: [...filters] } : saved,
      ),
    }));
  };
  const removeSaved = () => {
    if (!selectedSaved) return;
    setPreferences((current) => ({
      ...current,
      savedFilters: current.savedFilters.filter((saved) => saved.id !== selectedSaved.id),
    }));
    setSelectedSavedId("");
  };

  if (error?.status === 401)
    return (
      <main className="grid min-h-screen place-items-center bg-base-200 p-6">
        <p role="status">La sesión terminó. Volviendo al inicio de sesión…</p>
      </main>
    );
  return (
    <main className="min-h-screen bg-base-200">
      <div className="navbar border-b border-base-300 bg-base-100 px-5 sm:px-8">
        <div className="flex-1 gap-3">
          <div className="grid size-9 place-items-center rounded-lg bg-primary text-primary-content">
            <span className="font-bold" aria-hidden="true">
              R
            </span>
          </div>
          <span className="text-lg font-semibold tracking-tight">Redmine Workspace</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden text-right sm:block">
            <p className="text-xs text-base-content/55">Conectado como</p>
            <p className="text-sm font-medium">{user.login}</p>
          </div>
          <button
            type="button"
            onClick={logout}
            disabled={isMutating || logoutSuccess}
            aria-label="Cerrar sesión de Redmine"
            className="btn btn-outline btn-sm focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            {isMutating ? "Cerrando…" : "Cerrar sesión"}
          </button>
        </div>
      </div>
      <section className="mx-auto w-full max-w-7xl space-y-6 px-5 py-10 sm:px-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="space-y-2">
            <p className="text-sm font-medium uppercase tracking-[0.16em] text-primary">
              Tu trabajo
            </p>
            <h1 className="text-3xl font-semibold tracking-tight">Incidencias</h1>
            <p className="text-base-content/60">
              Las incidencias disponibles para tu cuenta de Redmine.
            </p>
          </div>
          {data && (
            <span className="badge badge-ghost px-3 py-4">
              {data.issues.length} de {data.totalCount}
            </span>
          )}
        </div>
        {logoutSuccess && (
          <p role="status" className="alert alert-success py-3">
            Sesión cerrada correctamente. Volviendo al inicio de sesión…
          </p>
        )}
        {logoutError && (
          <p role="alert" className="alert alert-error py-3">
            {logoutError}
            <button type="button" onClick={logout} className="btn btn-sm" disabled={isMutating}>
              Reintentar
            </button>
          </p>
        )}
        <div className="card border border-base-300 bg-base-100 shadow-sm">
          <div className="card-body space-y-5">
            <form
              onSubmit={submitDraft}
              className="grid gap-3 md:grid-cols-[1fr_1fr_2fr_auto]"
              aria-label="Añadir filtro de incidencias"
            >
              <label className="form-control">
                <span className="label-text mb-1">Campo</span>
                <select
                  className="select select-bordered"
                  {...draftForm.register("field")}
                  onChange={(event) => {
                    const field = fields.find((item) => item.field === event.target.value);
                    draftForm.setValue("field", event.target.value);
                    draftForm.setValue("operator", field?.operators[0]?.value ?? "=");
                    draftForm.setValue("value", "");
                  }}
                >
                  <optgroup label="Campos visibles">
                    {fields
                      .filter((field) => preferences.visibleFields.includes(field.field))
                      .map((field) => (
                        <option key={field.field} value={field.field}>
                          {field.label}
                        </option>
                      ))}
                  </optgroup>
                  <optgroup label="Todos los campos">
                    {fields
                      .filter((field) => !preferences.visibleFields.includes(field.field))
                      .map((field) => (
                        <option key={field.field} value={field.field}>
                          {field.label}
                        </option>
                      ))}
                  </optgroup>
                </select>
                {draftForm.formState.errors.field && (
                  <span className="text-sm text-error">
                    {draftForm.formState.errors.field.message}
                  </span>
                )}
              </label>
              <label className="form-control">
                <span className="label-text mb-1">Condición</span>
                <select
                  className="select select-bordered"
                  {...draftForm.register("operator")}
                  onChange={(event) => {
                    draftForm.setValue("operator", event.target.value);
                    draftForm.clearErrors("value");
                  }}
                >
                  {chosenField?.operators.map((operator) => (
                    <option key={operator.value} value={operator.value}>
                      {operator.label}
                    </option>
                  ))}
                </select>
              </label>
              {chosenOperator?.requiresValue ? (
                <label className="form-control">
                  <span className="label-text mb-1">Valor</span>
                  {chosenField?.values ? (
                    <select className="select select-bordered" {...draftForm.register("value")}>
                      <option value="">Selecciona un valor</option>
                      {chosenField.values.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      className="input input-bordered"
                      type={
                        chosenField?.type === "date"
                          ? "date"
                          : chosenField?.type === "number"
                            ? "number"
                            : "text"
                      }
                      aria-label="Valor del filtro"
                      {...draftForm.register("value")}
                    />
                  )}
                  {draftForm.formState.errors.value && (
                    <span className="text-sm text-error">
                      {draftForm.formState.errors.value.message}
                    </span>
                  )}
                </label>
              ) : (
                <div className="self-end pb-3 text-sm text-base-content/60">No requiere valor</div>
              )}
              <button
                className="btn btn-primary self-end"
                type="submit"
                disabled={editIndex === null && filters.length >= 20}
              >
                {editIndex === null ? "Añadir" : "Guardar cambio"}
              </button>
            </form>
            <div className="flex flex-wrap gap-2" aria-label="Filtros activos">
              {filters.map((filter, index) => {
                const field = fields.find((option) => option.field === filter.field);
                const operator = field?.operators.find(
                  (option) => option.value === filter.operator,
                );
                return (
                  <div
                    key={`${filter.field}-${index}`}
                    className="badge badge-outline h-auto gap-2 py-2"
                  >
                    {field?.label ?? filter.field} {operator?.label ?? filter.operator}
                    {filter.value ? ` ${filter.value}` : ""}
                    <button
                      type="button"
                      aria-label={`Editar filtro ${field?.label ?? filter.field}`}
                      onClick={() => editFilter(index)}
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      aria-label={`Quitar filtro ${field?.label ?? filter.field}`}
                      onClick={() => changeFilters(filters.filter((_, i) => i !== index))}
                    >
                      ×
                    </button>
                  </div>
                );
              })}
              {filters.length > 0 && (
                <button
                  type="button"
                  className="btn btn-ghost btn-xs"
                  onClick={() => {
                    changeFilters([]);
                    setEditIndex(null);
                  }}
                >
                  Borrar todos
                </button>
              )}
            </div>
            <div className="flex flex-wrap items-end gap-2 border-t border-base-300 pt-4">
              <label className="form-control min-w-52">
                <span className="label-text mb-1">Filtros guardados</span>
                <select
                  className="select select-bordered select-sm"
                  value={selectedSavedId}
                  onChange={(event) => setSelectedSavedId(event.target.value)}
                >
                  <option value="">Selecciona un filtro</option>
                  {preferences.savedFilters.map((saved) => (
                    <option key={saved.id} value={saved.id}>
                      {saved.name}
                      {isSupported(saved.filters, fields) ? "" : " (requiere revisión)"}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                className="btn btn-sm"
                disabled={!selectedSaved || !isSupported(selectedSaved.filters, fields)}
                onClick={applySelectedSaved}
              >
                Aplicar
              </button>
              <button
                type="button"
                className="btn btn-sm"
                disabled={!selectedSaved}
                onClick={applySelectedSaved}
              >
                Editar criterios
              </button>
              <button
                type="button"
                className="btn btn-sm"
                disabled={!selectedSaved}
                onClick={updateSaved}
              >
                Actualizar
              </button>
              <button
                type="button"
                className="btn btn-sm btn-error btn-outline"
                disabled={!selectedSaved}
                onClick={removeSaved}
              >
                Eliminar
              </button>
              <label className="form-control min-w-48 flex-1">
                <span className="label-text mb-1">Nombre del filtro</span>
                <input
                  className="input input-bordered input-sm"
                  maxLength={100}
                  value={filterName}
                  onChange={(event) => setFilterName(event.target.value)}
                />
              </label>
              <button
                type="button"
                className="btn btn-sm"
                onClick={selectedSaved ? renameSaved : saveCurrentFilter}
              >
                {selectedSaved ? "Renombrar" : "Guardar filtro"}
              </button>
              {nameError && (
                <span role="alert" className="text-sm text-error">
                  {nameError}
                </span>
              )}
            </div>
            <details className="border-t border-base-300 pt-3">
              <summary className="cursor-pointer font-medium">Personalizar campos visibles</summary>
              <fieldset className="mt-3 flex flex-wrap gap-x-5 gap-y-2">
                <legend className="sr-only">Campos de filtro visibles</legend>
                {fields.map((field) => (
                  <label key={field.field} className="label cursor-pointer gap-2">
                    <input
                      type="checkbox"
                      className="checkbox checkbox-sm"
                      checked={preferences.visibleFields.includes(field.field)}
                      onChange={(event) =>
                        setPreferences((current) => ({
                          ...current,
                          visibleFields: event.target.checked
                            ? [...new Set([...current.visibleFields, field.field])]
                            : current.visibleFields.filter((item) => item !== field.field),
                        }))
                      }
                    />
                    <span>{field.label}</span>
                  </label>
                ))}
              </fieldset>
            </details>
          </div>
        </div>
        {filterError && (
          <div role="alert" className="alert alert-warning">
            <span className="flex-1">{filterError.message}</span>
            <button type="button" className="btn btn-sm" onClick={() => mutateFilters()}>
              Reintentar filtros
            </button>
          </div>
        )}
        {isLoading || !data ? (
          <div role="status" className="card border border-base-300 bg-base-100 shadow-sm">
            <div className="card-body flex-row items-center gap-3 text-base-content/65">
              <span className="loading loading-spinner loading-sm" aria-hidden="true" />
              Cargando incidencias…
            </div>
          </div>
        ) : error ? (
          <div role="alert" className="alert alert-warning">
            <span className="flex-1">{error.message}</span>
            <button type="button" onClick={() => mutate()} className="btn btn-sm btn-outline">
              Reintentar
            </button>
          </div>
        ) : data?.issues.length === 0 ? (
          <div className="card border border-base-300 bg-base-100 shadow-sm">
            <div className="card-body items-center py-14 text-center">
              <h2 className="text-lg font-semibold">No hay incidencias para mostrar</h2>
              <p className="text-sm text-base-content/60">
                {filters.length
                  ? "Prueba a cambiar o quitar algún filtro."
                  : "Cuando tengas incidencias disponibles, aparecerán aquí."}
              </p>
            </div>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-base-300 bg-base-100 shadow-sm">
            <div className="overflow-x-auto">
              <table className="table table-zebra">
                <thead>
                  <tr>
                    <th scope="col">ID</th>
                    <th scope="col">Asunto</th>
                    <th scope="col">Proyecto</th>
                    <th scope="col">Estado</th>
                    <th scope="col">Prioridad</th>
                    <th scope="col">Asignado a</th>
                    <th scope="col">Actualizada</th>
                  </tr>
                </thead>
                <tbody>
                  {data?.issues.map((issue) => (
                    <tr key={issue.id}>
                      <th scope="row" className="font-mono text-xs text-base-content/60">
                        #{issue.id}
                      </th>
                      <td className="min-w-64 max-w-xl whitespace-normal font-medium">
                        {issue.subject}
                      </td>
                      <td>{issue.project || "—"}</td>
                      <td>{issue.status || "—"}</td>
                      <td>{issue.priority || "—"}</td>
                      <td>{issue.assignedTo || "—"}</td>
                      <td className="whitespace-nowrap">{formatDate(issue.updatedAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-base-300 px-5 py-3 text-sm">
              <label className="flex items-center gap-2">
                Por página
                <select
                  aria-label="Issues por página"
                  className="select select-bordered select-sm"
                  value={preferences.pageSize}
                  onChange={(event) => {
                    setPreferences((current) => ({
                      ...current,
                      pageSize: Number(event.target.value),
                    }));
                    setPage(1);
                  }}
                >
                  {issuePageSizes.map((size) => (
                    <option key={size} value={size}>
                      {size}
                    </option>
                  ))}
                </select>
              </label>
              <div className="flex items-center gap-2">
                <span>
                  Página {currentPage} · {data.totalCount} issues
                </span>
                <button
                  type="button"
                  className="btn btn-sm"
                  aria-label="Primera página"
                  disabled={currentPage <= 1}
                  onClick={() => setPage(1)}
                >
                  «
                </button>
                <button
                  type="button"
                  className="btn btn-sm"
                  aria-label="Página anterior"
                  disabled={currentPage <= 1}
                  onClick={() => setPage(currentPage - 1)}
                >
                  ‹
                </button>
                <button
                  type="button"
                  className="btn btn-sm"
                  aria-label="Página siguiente"
                  disabled={currentPage * preferences.pageSize >= data.totalCount}
                  onClick={() => setPage(currentPage + 1)}
                >
                  ›
                </button>
                <button
                  type="button"
                  className="btn btn-sm"
                  aria-label="Última página"
                  disabled={currentPage * preferences.pageSize >= data.totalCount}
                  onClick={() =>
                    setPage(Math.max(1, Math.ceil(data.totalCount / preferences.pageSize)))
                  }
                >
                  »
                </button>
              </div>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
