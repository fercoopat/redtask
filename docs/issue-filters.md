# Filtros de incidencias

Los valores de filtro se muestran como selectores cuando el catálogo correspondiente está disponible para la API Key de la persona conectada. `/api/issues/filters` obtiene estados, tipos, prioridades y proyectos visibles desde Redmine; cada opción conserva el ID que Redmine espera y presenta el nombre del catálogo. Si un filtro de tipo lista no tiene catálogo disponible, la entrada numérica acepta únicamente un ID positivo de Redmine y lo indica junto al control: escribir un nombre no añade un filtro válido.

El filtro de estado mantiene también las condiciones Redmine `abierto`, `cerrado` y `cualquiera`, que no requieren un valor de lista. Los filtros de asunto, descripción, fechas y números conservan sus controles específicos.

Los filtros activos y los criterios incluidos en el selector de filtros guardados muestran las etiquetas del catálogo actual cuando se conoce el ID. Los criterios siguen guardando y enviando los IDs de Redmine; si la etiqueta no está disponible, se muestra el ID con el prefijo `#`.

La lista muestra un spinner accesible durante la carga inicial. Al aplicar filtros, cambiar de página o actualizar los resultados, muestra “Actualizando incidencias…” hasta que llegue la respuesta nueva.

Autor y asignado muestran personas de las membresías de los hasta 100 proyectos visibles que obtiene el catálogo, combinadas y deduplicadas mediante `GET /projects/:id/memberships.json`. La lista sigue el alcance de proyectos de Redmine; no enumera a todas las cuentas de la instalación. Si la instancia no permite consultar las membresías, se informa que las opciones no están disponibles y no se permite añadir el criterio. No se llama al endpoint administrativo global `/users.json`. Categorías y versiones también quedan temporalmente indisponibles hasta contar con un contexto de proyecto que permita ofrecer opciones con nombre. Solo los filtros cuyo nombre identifica explícitamente un ID, como incidencia padre y seguidor, admiten escribir un ID numérico.

No se consulta `/custom_fields.json`. Los criterios `cf_*` guardados siguen sujetos al comportamiento documentado en [arquitectura de interfaz](frontend-architecture.md#acceso-con-usuarios-normales).
