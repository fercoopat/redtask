# Correcciones de la revisión del proyecto

## Trabajo aplicado

| Hallazgo                                     | Corrección                                                                                                  | Comprobación                                                      |
| -------------------------------------------- | ----------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| Caché compartida entre cuentas               | Proveedor SWR por sesión y `unload` al salir o recibir 401; un logout fallido conserva la sesión            | Cambio de cuenta con respuesta tardía; logout fallido; revocación |
| Contrato incorrecto de campos personalizados | Aceptar `id`/`name` de Redmine 6 y metadatos adicionales opcionales                                         | Respuestas estándar y enriquecidas                                |
| Envío perdido al cerrar el formulario        | Controlador estable, bloqueo concurrente y confirmación conservada ante resultado incierto                  | Envío pendiente, submit repetido, ocultar y reabrir               |
| Error inicial oculto por la carga            | Presentar el error antes del estado sin datos y ofrecer retry                                               | Fallo 503 inicial y recuperación                                  |
| Campos de otro proyecto                      | Reiniciar tracker, categoría y valores personalizados; conservar texto y validar prioridad                  | Cambio de proyecto, payload por ID y opciones tardías             |
| Operadores numéricos incompatibles           | Usar `>=`/`<=`; mantener criterios antiguos para revisión sin enviarlos                                     | Schemas, parámetros REST y edición de filtros antiguos            |
| Variantes DaisyUI sin CSS                    | Mapas con nombres completos de clases                                                                       | Selectores de todas las variantes en el CSS generado              |
| Fallos de prioridades silenciados            | Fallback únicamente para 404/501; propagar red, autenticación y respuesta inválida                          | Unitarias de estados y recuperación de UI                         |
| Validaciones divergentes                     | Schemas compartidos de login/filtros, validación de opciones del proyecto y errores locales                 | Claves vacías, límites, fechas, IDs, trackers y campos requeridos |
| Errores de filtros sin asociación accesible  | `FormField`, etiquetas explícitas y enlaces ARIA                                                            | Validación de input y selector de filtros guardados               |
| Ausencia de pruebas automáticas              | `node:test`/`tsx` y Playwright con servidor REST sintético                                                  | Guía en `testing.md` y scripts del proyecto                       |
| Archivos y responsabilidades mezcladas       | Panel de creación, panel de filtros, filtros guardados, visibilidad, tabla, hooks y schemas por propietario | Lint, tipos, build y regresiones de comportamiento                |
| Aviso de dependencia de desarrollo           | Mitigación temporal documentada, revisión completa de auditoría                                             | `security.md`; aviso abierto hasta corrección compatible          |

Las convenciones se mantienen en `frontend-hooks.md`, `frontend-architecture.md` y las referencias de `AGENTS.md`. La documentación contractual de creación se actualizó con los metadatos realmente disponibles.

## Alcance de la aceptación

T015 combina pruebas aisladas de errores estándar con la creación empresarial registrada en `turiguanq`, incidencia 80569. La [matriz de aceptación](../specs/004-add-issues/quickstart.md#combined-acceptance-evidence) distingue las fuentes de evidencia y las limitaciones. No acredita otras configuraciones de campos, workflows, cuentas o proyectos. El selector mantiene el límite documentado de 100 proyectos. Los estados pendientes citados en los resultados históricos corresponden a sus respectivas ejecuciones.

SC-003 queda pendiente de evaluación con usuarios nuevos: el objetivo del 90% se conserva y no está acreditado por las pruebas automatizadas. La especificación y su checklist distinguen este pendiente del cierre de T015.

## Resultado de las comprobaciones

2026-10-08: 22 pruebas unitarias y 20 pruebas de navegador pasan con Node 24.15.0 y Chromium del sistema. Los escenarios usan exclusivamente Redmine simulado. La auditoría de producción no presenta avisos y la completa conserva únicamente la excepción de `braces` descrita en `security.md`.

2026-10-09: se añade el entorno Docker de [Redmine real local](redmine-local-testing.md). Pasan 7 comprobaciones reales, además de las 22 unitarias y 20 simuladas. Se verifica persistencia tras reiniciar y reinicializar, y creación por teclado dentro del límite de dos minutos. T015 permanece abierto para el despliegue.

2026-10-09: se añade [diagnóstico de lectura por cuenta](redmine-diagnostics.md), informe saneado y comparación local entre creador, lector y administrador. Resultado conjunto: 28 unitarias, 25 de navegador simulado y 10 de Redmine real local; T015 sigue pendiente para el servidor empresarial.

2026-10-13: se adapta el alcance a usuarios normales. Se elimina la consulta global de campos personalizados del diagnóstico y del catálogo de filtros; el catálogo estándar verifica la API Key y los criterios `cf_*` guardados se conservan para revisión, con rechazo 400 sin ampliar la búsqueda. La creación mantiene los campos del proyecto. El fixture solo contiene creador y lector; el administrador Docker se reserva para mantenimiento. Pasan 27 unitarias, 27 de navegador simulado y 9 de Redmine real local. T015 permanece abierto.

Las comprobaciones del 2026-10-13 de lint, TypeScript y build pasan. Auditoría de producción sin avisos; la completa conserva la excepción de desarrollo de `braces` descrita en [security.md](security.md).

2026-10-13, cierre con criterio combinado aprobado por el usuario: T015 completada con la evidencia empresarial de la incidencia 80569 y las pruebas aisladas. Pasan 27 unitarias, 28 de navegador simulado y 9 de Redmine real local, además de lint, tipos y formato. La nueva prueba verifica caducidad con una cookie válida cuya fecha de sesión ya venció, sin enviar la creación a Redmine. No se han realizado nuevas consultas ni escrituras empresariales durante este cierre. Las limitaciones de otras configuraciones permanecen en [la matriz de aceptación](../specs/004-add-issues/quickstart.md#combined-acceptance-evidence); los estados pendientes anteriores son históricos.

2026-10-13, seguimiento T019–T020: el POST de creación limpia la cookie de una sesión ausente o caducada antes de devolver 401 y mantiene el rechazo si falla la limpieza. La regresión comprueba `Set-Cookie`, ausencia de la cookie en el navegador y ausencia de creación en Redmine. Pasan 27 unitarias y 28 de navegador simulado, lint, TypeScript, formato y build. La auditoría de producción no presenta avisos y la completa conserva únicamente la excepción de desarrollo de `braces`. Se actualizan estado de la especificación, checklist y estructura técnica; SC-003 permanece pendiente. No se repite Docker ni se accede al servidor empresarial; la evidencia anterior de T015 se conserva.

2026-10-13, seguimiento de seguridad: se conserva la mitigación temporal aprobada de `braces`. Las versiones consultadas del plugin de Next.js y `fast-glob` mantienen la dependencia vulnerable, y el registro y el aviso no ofrecen una versión corregida de `braces`. Se registra la cadena, las versiones consultadas y el criterio de cierre en [security.md](security.md#actualizaciones-consultadas-y-decisión). Las auditorías repetidas confirman producción sin avisos y un único aviso alto en desarrollo; la auditoría completa conserva su salida 1. Este seguimiento actualiza únicamente documentación y mantiene la revisión antes de cada entrega o actualización de ESLint; la vulnerabilidad permanece abierta.
