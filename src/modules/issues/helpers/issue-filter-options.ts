export type IssueFilterType = "list" | "text" | "date" | "number" | "boolean";
export type IssueFilterOperator = { value: string; label: string; requiresValue: boolean };
export type IssueFilterOption = {
  field: string;
  label: string;
  type: IssueFilterType;
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
  { value: ">", label: "mayor que", requiresValue: true },
  { value: "<", label: "menor que", requiresValue: true },
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
  { field: "done_ratio", label: "Progreso (%)", type: "number", operators: numberOps },
  { field: "estimated_hours", label: "Horas estimadas", type: "number", operators: numberOps },
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
  if (filters.length > 20) return false;
  return filters.every((filter) => {
    const field = options.find((option) => option.field === filter.field);
    const operator = field?.operators.find((item) => item.value === filter.operator);
    if (!field || !operator || operator.requiresValue !== Boolean(filter.value)) return false;
    const value = filter.value ?? "";
    if (
      value.length > 200 ||
      (field.values && operator.requiresValue && !field.values.some((item) => item.value === value))
    )
      return false;
    if (
      field.type === "list" &&
      !field.values &&
      operator.requiresValue &&
      !/^[1-9]\d*$/.test(value)
    )
      return false;
    if (field.type === "number" && operator.requiresValue) {
      const number = Number(value);
      if (!Number.isFinite(number)) return false;
      if (field.field === "done_ratio" && (number < 0 || number > 100)) return false;
      if (field.field === "estimated_hours" && number < 0) return false;
    }
    if (field.type === "date" && operator.requiresValue) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
      const date = new Date(`${value}T00:00:00.000Z`);
      if (Number.isNaN(date.valueOf()) || date.toISOString().slice(0, 10) !== value) return false;
    }
    return true;
  });
}
