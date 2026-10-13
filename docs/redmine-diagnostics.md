# Diagnóstico de lectura de Redmine

## Uso

1. Inicia la aplicación con `pnpm dev`. Utiliza el servidor definido en `REDMINE_BASE_URL`; no hay un campo para introducir otra URL.
2. Inicia sesión con tu API Key y abre **Diagnóstico** desde la lista de incidencias.
3. Selecciona un proyecto visible y pulsa **Ejecutar diagnóstico**.
4. Revisa los resultados y descarga el informe JSON si necesitas comunicarlo al encargado del servidor.

Para practicar con Docker, ejecuta `pnpm redmine:test:up` y `pnpm redmine:test:app`, y utiliza una ventana privada para no sustituir otra cookie de sesión de localhost. Consulta las cuentas y contraseñas en [redmine-local-testing.md](redmine-local-testing.md).

## Qué se comprueba

La página utiliza la API Key de la sesión en el servidor; no la devuelve al navegador. La selección carga hasta 100 proyectos mediante la consulta existente. El diagnóstico solo comienza al pulsar el botón y realiza cinco GET, secuenciales, con un timeout de 10 segundos por consulta y sin seguir redirecciones:

| Comprobación             | Ruta de Redmine                                                           |
| ------------------------ | ------------------------------------------------------------------------- |
| Usuario actual           | `/users/current.json`                                                     |
| Proyectos visibles       | `/projects.json?limit=100`                                                |
| Incidencias del proyecto | `/issues.json?project_id=ID&limit=1`                                      |
| Metadatos del proyecto   | `/projects/ID.json?include=trackers,issue_categories,issue_custom_fields` |
| Prioridades              | `/enumerations/issue_priorities.json`                                     |

El informe incluye fecha UTC de finalización, ID de cuenta, ID de proyecto, resultados, HTTP, duración y compatibilidad con los schemas de la aplicación. Los nombres y textos de incidencias, claves, cookies, URL del servidor y respuestas originales no se exportan. No se almacena el informe en el servidor ni en localStorage. El archivo descargado permanece donde lo guarde el usuario.

Cambiar de proyecto elimina los resultados anteriores. Durante una ejecución se bloquean los controles para evitar solapamientos; no hay reintentos automáticos del diagnóstico. Los errores individuales conservan los otros resultados. Un 401 cancela las consultas restantes, elimina el informe y termina la sesión.

## Interpretación

- **Correcto:** HTTP satisfactorio y formato compatible. Una lista vacía también puede ser correcta; no demuestra acceso a todas las incidencias.
- **Acceso restringido:** HTTP 403. La cuenta no puede realizar esa lectura; no implica que toda la API esté deshabilitada. Los permisos pueden variar por proyecto.
- **Endpoint no disponible:** HTTP 404 o 501. La ruta puede no existir, no estar implementada o estar oculta por permisos; no se infiere una versión concreta.
- **Respuesta incompatible:** estado HTTP inesperado, JSON inválido, schema incompatible o identidad de usuario/proyecto distinta de la esperada.
- **Fallo de conexión o servidor:** no se pudo completar la consulta o hubo un error 5xx. Sin respuesta HTTP, la columna muestra `—`.
- **No comprobado:** el permiso de creación permanece con este estado. Ninguna consulta de lectura confirma **Add issues**.

Los [roles y permisos](https://www.redmine.org/projects/redmine/wiki/RedmineRoles) varían por usuario y proyecto. El resultado refleja una cuenta, un proyecto y una ejecución; no describe todas las cuentas ni todas las capacidades del servidor. El administrador debe confirmar la versión exacta, plugins y reglas propias.

## Contrato interno y organización

`GET /api/diagnostics?projectId=ID` requiere sesión y un único ID entero positivo seguro; rechaza parámetros adicionales. Devuelve un informe saneado con cinco resultados. Una comprobación rechazada se representa dentro de un informe HTTP 200; no constituye por sí misma un fallo de la ruta interna. Sin sesión o con una API Key revocada devuelve 401; consultas inválidas, 400; fallos internos, 500, con el sobre uniforme de errores.

El módulo `diagnostics` posee componentes, hook de dominio, schemas, ejecutor y handler. Reutiliza el transporte Redmine y los schemas de respuestas existentes. Los códigos de estado del informe son estables y las explicaciones se traducen en la interfaz. Las rutas upstream están fijadas en código: no existe un proxy de URLs arbitrarias.

## Verificación y límites

Las pruebas unitarias cubren clasificación, GET exclusivamente, rutas fijas, JSON inválido, saneamiento, fallos parciales y 401. Las pruebas de navegador cubren acceso autenticado, ejecución manual, bloqueo concurrente, cambio de proyecto, descarga y aislamiento entre cuentas. La suite Docker comprueba las cuentas normales `qa-creator` y `qa-reader`: ambas completan las cinco lecturas. Las pruebas verifican que no se consulte `/custom_fields.json`.

El diagnóstico no crea ni modifica datos en Redmine y no confirma permisos de creación. T015 combina pruebas aisladas de errores con la aceptación de escritura empresarial ya registrada en [el quickstart](../specs/004-add-issues/quickstart.md#combined-acceptance-evidence). Las suites de diagnóstico no consultan el servidor empresarial.

## Resultados históricos

2026-10-09: pasan 28 pruebas unitarias, 25 de navegador simulado y 10 contra Redmine 6.1.5 Docker. El diagnóstico se comprueba con las tres cuentas locales. Lint, tipos, formato y build pasan; el build requirió ejecutarse fuera del sandbox por el acceso al módulo nativo SWC. Auditoría de producción sin avisos; la completa conserva únicamente la excepción de desarrollo de `braces`. No se ha consultado el servidor empresarial.

## Alcance para usuarios normales

Los flujos utilizan la API Key de la cuenta actual y no requieren privilegios administrativos. No se consulta el [endpoint global de campos personalizados](https://www.redmine.org/projects/redmine/wiki/Rest_CustomFields), que exige administrador. Los campos del proyecto se mantienen para crear incidencias; sus descriptores no demuestran que puedan usarse como filtros. Por ahora el listado ofrece únicamente filtros estándar.

Los informes nuevos contienen cinco comprobaciones. Los JSON históricos de seis comprobaciones siguen siendo documentos de su fecha: no hay importador ni almacenamiento de informes que migrar.

2026-10-13: pasan 27 pruebas unitarias, 27 de navegador simulado y 9 contra Redmine 6.1.5 Docker con creador y lector. No se ha consultado el servidor empresarial; T015 sigue pendiente.

Las comprobaciones del 2026-10-13 de lint, TypeScript y build pasan. Auditoría de producción sin avisos; la completa conserva la excepción de desarrollo de `braces` descrita en [security.md](security.md).

2026-10-13, cierre con criterio combinado aprobado por el usuario: T015 completada con la evidencia empresarial de la incidencia 80569 y las pruebas aisladas. Pasan 27 unitarias, 28 de navegador simulado y 9 de Redmine real local, además de lint, tipos y formato. La nueva prueba verifica caducidad con una cookie válida cuya fecha de sesión ya venció, sin enviar la creación a Redmine. No se han realizado nuevas consultas ni escrituras empresariales durante este cierre. Las limitaciones de otras configuraciones permanecen en [la matriz de aceptación](../specs/004-add-issues/quickstart.md#combined-acceptance-evidence); los estados pendientes anteriores son históricos.
