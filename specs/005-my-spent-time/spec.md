# Feature Specification: My Spent Time

**Feature Branch**: `005-my-spent-time`

**Created**: 2026-10-15

**Status**: Draft

**Input**: User description: "Necesito ser capaz de visualizar mi tiempo (\"Spent time\") en una página individual con listados y gráficos tendiendo en cuenta las mejores recomendaciones."

## Clarifications

### Session 2026-10-15

- Q: ¿Qué resúmenes deberían mostrar los gráficos de la página? → A: Una evolución temporal y un gráfico de distribución alternable entre proyecto y actividad.
- Q: ¿Cómo debería agruparse el tiempo en el gráfico de evolución cuando el periodo seleccionado es largo? → A: Ajustar automáticamente la agrupación a diaria, semanal o mensual según la duración del periodo.
- Q: ¿Dónde deben calcularse los resúmenes y cómo debe paginarse el detalle para rangos con muchos registros? → A: El servidor calcula los resúmenes del conjunto completo y devuelve las filas de detalle paginadas.
- Q: ¿Qué zona horaria debe regir el mes predeterminado? → A: La zona horaria de la aplicación debe coincidir con la configurada en Redmine y se verifica en aceptación.
- Q: ¿Qué límites determinan la agrupación de la evolución temporal? → A: Diaria hasta 31 días, semanal de 32 a 366 días, y mensual para periodos mayores a 366 días; la semana empieza en lunes.
- Q: ¿Cuál es el tamaño máximo de una página de detalle? → A: 25 filas por defecto y un máximo de 100.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Review personal time overview (Priority: P1)

As an authenticated user, I can open a dedicated page showing my recorded spent time for a selected period so that I can understand how my work time is distributed.

**Why this priority**: A clear personal overview is the central purpose of the feature and delivers value before any deeper exploration.

**Independent Test**: Sign in as a user with recorded time entries, open the page, and confirm the period total and visual summaries match the entries visible for that period.

**Acceptance Scenarios**:

1. **Given** the user has time entries in the default period, **When** they open the spent time page, **Then** the page shows the total hours and charts that summarize those entries.
2. **Given** the selected period contains no entries, **When** the user opens or filters the page, **Then** the page shows a clear empty state and zero total without misleading chart values.
3. **Given** the page is loading or a request fails, **When** the user views the page, **Then** they see a loading or actionable error state and are not shown stale values as current results.
4. **Given** the user selects a period of different lengths, **When** the time trend is displayed, **Then** its daily, weekly, or monthly grouping adjusts to the period while preserving the total represented by the matching entries.

### User Story 2 - Filter and compare time entries (Priority: P2)

As an authenticated user, I can filter my time by date range, project, and activity so that the summaries and entries answer a specific question about my work.

**Why this priority**: Filtering makes a personal overview useful across projects and reporting periods while keeping it focused on the user's own data.

**Independent Test**: Select a date range, project, and activity and confirm the total, charts, and entry list all reflect the same filtered set.

**Acceptance Scenarios**:

1. **Given** the user has entries across multiple dates and projects, **When** they select a valid date range and project, **Then** the total, charts, and list include only matching entries.
2. **Given** the user selects an activity filter, **When** results load, **Then** only entries for that activity contribute to all displayed summaries.
3. **Given** the user changes or clears filters, **When** results refresh, **Then** the page communicates the active period and returns to the corresponding unfiltered results.
4. **Given** the user has selected a project or activity, **When** they change either date bound, **Then** both project and activity filters are cleared and the new date range loads without an invalid-filter error.

### User Story 3 - Inspect individual time entries (Priority: P3)

As an authenticated user, I can inspect a list of my time entries with their date, hours, project, issue when present, activity, and comments so that I can understand what contributes to each total.

**Why this priority**: Detail rows let users verify aggregate values and find the work behind a chart or total.

**Independent Test**: Open the list for a period with known entries and verify each displayed row corresponds to a matching Redmine entry, including project-level entries without an issue.

**Acceptance Scenarios**:

1. **Given** matching time entries exist, **When** the user views the list, **Then** each row shows the available entry details and the list total agrees with the overview total.
2. **Given** more matching entries exist than fit on one page, **When** the user navigates the list, **Then** they can reach the remaining entries without duplicates or omissions.
3. **Given** an entry has no associated issue or has no comment, **When** the entry is displayed, **Then** the absent value is presented clearly without breaking the row.
4. **Given** the user is on a later detail page, **When** they change the date range, project, or activity, **Then** the detail list returns to page one.

### Edge Cases

- The user's Redmine account has no matching entries for the selected period or filters.
- The selected project has time tracking disabled, or the user cannot see its time entries; unavailable data must not be presented as a confirmed zero.
- The date range is invalid, has a start date after its end date, or crosses a calendar boundary.
- Redmine returns entries in multiple pages; totals and charts must cover the complete matching result set, not only the current list page.
- A request fails, the session expires, or the response is incomplete; the page must communicate the state and avoid presenting partial results as complete.
- Entries may be logged at project level without an issue, and comments or other optional details may be absent.
- Large hour values, fractional hours, and days with no recorded time must remain understandable in both charts and lists.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: The system MUST provide a dedicated page for an authenticated user to review their spent time.
- **FR-002**: The system MUST show a total of the user's recorded hours for the active period and filters.
- **FR-003**: The system MUST show a chart of time over the selected period with daily, weekly, or monthly grouping suited to the period length, and a distribution chart that the user can switch between project and activity; each chart MUST have a clear title, readable labels, and an equivalent text summary.
- **FR-004**: The system MUST allow the user to choose a date range and filter entries by project and activity.
- **FR-005**: The system MUST keep the total, charts, and entry list consistent with the same active date range and filters.
- **FR-006**: The system MUST list matching entries with date, hours, project, activity, and available issue and comment details; missing optional details MUST be represented clearly.
- **FR-007**: The system MUST support navigating all matching entries when the result set exceeds one page, and summaries MUST account for the complete result set.
- **FR-008**: The system MUST obtain only entries authorized for the signed-in user and MUST respect Redmine's permissions and project time-tracking availability; it MUST NOT require administrator access or expose another user's entries.
- **FR-009**: The system MUST distinguish loading, empty, partial/unavailable, session-expired, and failed states so users do not confuse unavailable data with zero recorded time.
- **FR-010**: The page MUST be operable with a keyboard and provide accessible names and non-color-only chart interpretation.
- **FR-011**: The page MUST use a documented default period and clearly show the active period so users can interpret totals without ambiguity.

### Key Entities _(include if data involved)_

- **Time entry**: A user's recorded work time, including date, hours, project, activity, and optional issue and comment.
- **Time report filters**: The date range, project, and activity that define the set of entries displayed and summarized.
- **Time summary**: The total hours and grouped values derived from the complete set of entries matching the active filters.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: In acceptance evaluation, users can find the total hours for a chosen period within 30 seconds without assistance.
- **SC-002**: For a representative set of periods and filters, 100% of displayed totals and chart values agree with the complete set of matching entries.
- **SC-003**: At least 90% of first-time users can filter to a project and date range and identify the matching time entries without help.
- **SC-004**: In acceptance evaluation, no user can mistake an empty, unavailable, partial, or failed result for a confirmed zero-hour result.
- **SC-005**: Users can reach and inspect every matching entry, including entries beyond the first list page.

## Assumptions

- Users are already authenticated through the existing application session and each user's Redmine identity remains authoritative for which time entries they may view.
- The default period is the current calendar month in the Redmine instance's configured time zone; the page always states the selected date boundaries.
- The page is read-only in this feature. Creating, editing, deleting, exporting, or billing time entries is outside this scope.
- Redmine's time-entry listing is the source of truth; project-level time entries without an issue are valid and must be included.
- The Redmine instance has time tracking enabled and its REST API available for the user's authorized access. Project/module or permission restrictions may limit available results.

## References

- [Redmine REST API: Time Entries](https://www.redmine.org/projects/redmine/wiki/Rest_TimeEntries) describes listing time entries, user/project/date filters, and offset/limit pagination.
- [Redmine Time Tracking](https://www.redmine.org/projects/redmine/wiki/RedmineTimeTracking) describes time entries, activities, project-level logging, and configurable time display.
- [Redmine REST API](https://www.redmine.org/projects/redmine/wiki/Rest_api) lists Time Entries as a stable REST resource.
