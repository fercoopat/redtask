"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import useSWR from "swr";
import useSWRMutation from "swr/mutation";

import type { RedmineUser } from "@/modules/auth/helpers/session";
import type { RedmineIssuePage } from "@/modules/redmine/helpers/redmine-api";

type ResponseError = Error & { status: number };
type ApiError = { error?: string };

async function readError(response: Response) {
  return (await response.json().catch(() => ({}))) as ApiError;
}

async function fetchIssues(url: string): Promise<RedmineIssuePage> {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    const payload = await readError(response);
    const error = new Error(
      payload.error ?? "No se pudieron cargar las incidencias.",
    ) as ResponseError;
    error.status = response.status;
    throw error;
  }
  return (await response.json()) as RedmineIssuePage;
}

async function endSession(url: string) {
  const response = await fetch(url, { method: "DELETE" });
  if (!response.ok) {
    const payload = await readError(response);
    throw new Error(payload.error ?? "No se pudo cerrar la sesión. Inténtalo de nuevo.");
  }
}

function formatDate(value: string) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.valueOf())
    ? "—"
    : new Intl.DateTimeFormat("es", { dateStyle: "medium" }).format(date);
}

export function IssueList({ user }: { user: RedmineUser }) {
  const router = useRouter();
  const [logoutError, setLogoutError] = useState<string | null>(null);
  const [logoutSuccess, setLogoutSuccess] = useState(false);
  const { data, error, isLoading, mutate } = useSWR<RedmineIssuePage, ResponseError>(
    "/api/issues",
    fetchIssues,
  );
  const { trigger, isMutating } = useSWRMutation("/api/auth/session", endSession);

  useEffect(() => {
    if (error?.status === 401) {
      router.replace("/login");
    }
  }, [error, router]);

  const logout = async () => {
    setLogoutError(null);
    setLogoutSuccess(false);
    try {
      await trigger();
      setLogoutSuccess(true);
      window.setTimeout(() => router.replace("/login"), 500);
    } catch (mutationError) {
      setLogoutError(
        mutationError instanceof Error
          ? mutationError.message
          : "No se pudo cerrar la sesión. Inténtalo de nuevo.",
      );
    }
  };

  if (error?.status === 401) {
    return (
      <main className="grid min-h-screen place-items-center bg-base-200 p-6">
        <p role="status" className="text-base-content/70">
          La sesión terminó. Volviendo al inicio de sesión…
        </p>
      </main>
    );
  }

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
            {isMutating && (
              <span className="loading loading-spinner loading-xs" aria-hidden="true" />
            )}
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
            <span>{logoutError}</span>
            <button type="button" onClick={logout} className="btn btn-sm" disabled={isMutating}>
              Reintentar
            </button>
          </p>
        )}

        {isLoading ? (
          <div role="status" className="card border border-base-300 bg-base-100 shadow-sm">
            <div className="card-body flex-row items-center gap-3 text-base-content/65">
              <span className="loading loading-spinner loading-sm" aria-hidden="true" />
              Cargando incidencias…
            </div>
          </div>
        ) : error ? (
          <div role="alert" className="alert alert-warning">
            <div className="flex-1">
              <span>{error.message}</span>
            </div>
            <button type="button" onClick={() => mutate()} className="btn btn-sm btn-outline">
              Reintentar
            </button>
          </div>
        ) : data?.issues.length === 0 ? (
          <div className="card border border-base-300 bg-base-100 shadow-sm">
            <div className="card-body items-center py-14 text-center">
              <h2 className="text-lg font-semibold">No hay incidencias para mostrar</h2>
              <p className="text-sm text-base-content/60">
                Cuando tengas incidencias disponibles, aparecerán aquí.
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
            <div className="border-t border-base-300 px-5 py-3 text-xs text-base-content/55">
              Se muestran hasta 25 incidencias según tus permisos en Redmine.
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
