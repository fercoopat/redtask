import { createIssueFiltersSchema } from "@/modules/issues/schemas/issue-filters";

export type IssueFilterType = "list" | "text" | "date" | "number" | "boolean";
export type IssueFilterOperator = { value: string; label: string; requiresValue: boolean };
export type IssueFilterOption = {
  field: string;
  label: string;
  type: IssueFilterType;
  numericKind?: "integer" | "float";
  operators: IssueFilterOperator[];
  values?: { value: string; label: string }[];
};
export type IssueFilterCriterion = { field: string; operator: string; value?: string };

const eq: IssueFilterOperator = { value: "=", label: "es", requiresValue: true };
const neq: IssueFilterOperator = { value: "!", label: "no es", requiresValue: true };
const listOps = [eq, neq];
const textOps = [
  { value: "~", label: "contiene", requiresValue: true },
  { value: "!~", label: "no contiene", requiresValue: true },
];
const dateOps = [
  eq,
  { value: ">=", label: "desde", requiresValue: true },
  { value: "<=", label: "hasta", requiresValue: true },
];
const numberOps = [
  eq,
  { value: ">=", label: "mayor o igual", requiresValue: true },
  { value: "<=", label: "menor o igual", requiresValue: true },
];
const emptyOps = [
  { value: "!*", label: "vacío", requiresValue: false },
  { value: "*", label: "no está vacío", requiresValue: false },
];

export const standardIssueFilters: IssueFilterOption[] = [
  {
    field: "status_id",
    label: "Estado",
    type: "list",
    operators: [
      ...listOps,
      { value: "o", label: "abierto", requiresValue: false },
      { value: "c", label: "cerrado", requiresValue: false },
      { value: "*", label: "cualquiera", requiresValue: false },
    ],
  },
  { field: "tracker_id", label: "Tipo", type: "list", operators: listOps },
  { field: "priority_id", label: "Prioridad", type: "list", operators: listOps },
  { field: "project_id", label: "Proyecto", type: "list", operators: listOps },
  { field: "author_id", label: "Autor", type: "list", operators: listOps },
  { field: "assigned_to_id", label: "Asignado a", type: "list", operators: listOps },
  { field: "category_id", label: "Categoría", type: "list", operators: listOps },
  { field: "fixed_version_id", label: "Versión", type: "list", operators: listOps },
  { field: "parent_id", label: "Incidencia padre (ID)", type: "list", operators: listOps },
  { field: "watcher_id", label: "Seguidor (ID)", type: "list", operators: listOps },
  { field: "subject", label: "Asunto", type: "text", operators: [...textOps, ...emptyOps] },
  { field: "description", label: "Descripción", type: "text", operators: textOps },
  { field: "created_on", label: "Creada", type: "date", operators: dateOps },
  { field: "updated_on", label: "Actualizada", type: "date", operators: dateOps },
  { field: "closed_on", label: "Cerrada", type: "date", operators: dateOps },
  { field: "start_date", label: "Fecha de inicio", type: "date", operators: dateOps },
  { field: "due_date", label: "Fecha límite", type: "date", operators: dateOps },
  {
    field: "done_ratio",
    label: "Progreso (%)",
    type: "number",
    numericKind: "integer",
    operators: numberOps,
  },
  {
    field: "estimated_hours",
    label: "Horas estimadas",
    type: "number",
    numericKind: "float",
    operators: numberOps,
  },
  {
    field: "is_private",
    label: "Privada",
    type: "boolean",
    operators: listOps,
    values: [
      { value: "1", label: "Sí" },
      { value: "0", label: "No" },
    ],
  },
];

export function validateIssueFilters(
  filters: IssueFilterCriterion[],
  options: IssueFilterOption[],
) {
  return createIssueFiltersSchema(options).safeParse(filters).success;
}
