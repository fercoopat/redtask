# Pruebas y comprobaciones

## Temas predefinidos DaisyUI — 2026-10-22

Se eliminan las paletas propias y la opción `system`. El selector ofrece los 35 nombres oficiales y usa `light` cuando la cookie está ausente, es antigua o inválida. El botón de paleta `Palette` de `lucide-react` abre las preferencias del navbar. La elección se conserva en el navegador, también entre el acceso y las páginas autenticadas.

Pasan 44 pruebas unitarias y los 52 casos de navegador: 47 en la ejecución general, el caso del catálogo en una repetición y los cuatro recorridos visuales en otra. El catálogo se compara con el instalado de DaisyUI y Chromium comprueba los tokens nativos de los 35 temas, incluidos colores, radios y esquema, tolerando solo redondeo de color y serialización de CSS. También se verifica persistencia al navegar, recargar y cerrar sesión, teclado y pantallas táctiles.

El recorrido visual pasa a 320, 390, 768 y 1440 px en `light` y `dark`, sin desbordamiento horizontal. Las capturas finales están en `/tmp/redmine-built-in-theme-visual/`; se revisan lista móvil clara y lista de escritorio oscura. Los botones primarios y la vista seleccionada se comparan con el contraste del par primario/contenido oficial, sin exigir un valor superior al que proporciona el preset. El resto de los elementos seleccionados mantiene la comprobación de 4.5:1. En `dark` el par primario oficial mide aproximadamente 4.13:1; estas pruebas no acreditan conformidad WCAG de todos los presets. No se modifican los colores oficiales para corregir esa limitación.

Pasan lint, formato de los archivos modificados, TypeScript mediante el build, build y `git diff --check`. Las auditorías terminan con salida 1: producción presenta tres avisos nuevos de Next.js y la completa añade el aviso de desarrollo de `braces`; véase [security.md](security.md). No se modifican dependencias ni se repiten pruebas Docker o consultas a Redmine empresarial.

## Navbar principal DaisyUI — 2026-10-20

La navegación global usa una barra superior con desplegable, marca centrada y acciones de cuenta. Las páginas actuales no muestran barra lateral; la navegación contextual pertenecerá a las rutas que la necesiten. Las pruebas verifican navegación con teclado y pantalla táctil, cierre con Escape, ruta activa, centrado a 320, 768 y 1440 px y persistencia del tema desde las preferencias de cuenta.

Pasan las 42 pruebas unitarias y los 51 casos de navegador: 49 en la ejecución general y los dos casos adaptados durante esa ejecución en una repetición aislada (cuentas de diagnóstico e idioma). El recorrido visual genera capturas de las pantallas en claro y oscuro a 320, 390, 768 y 1440 px, comprueba contraste y desbordamiento y se revisan las capturas de lista móvil y escritorio. Pasan lint, formato de los archivos modificados, TypeScript mediante el build, build de producción y `git diff --check`. Producción no tiene avisos de auditoría; la auditoría completa conserva únicamente la excepción de desarrollo documentada para `braces`.

Este cambio de navegación no repite la aceptación con Redmine Docker ni accede a la instancia empresarial.

## Ejecución

```sh
pnpm test:unit
pnpm exec playwright install chromium
pnpm test:e2e
pnpm lint
pnpm exec tsc --noEmit
pnpm format:check
pnpm build
pnpm audit --prod
pnpm audit
```

`pnpm test:all` ejecuta las pruebas unitarias y de navegador. Si Chromium ya está instalado en el sistema, puedes ejecutar `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium pnpm test:e2e`.

## Alcance

- Las pruebas unitarias usan `node:test` y `tsx` en un único proceso y de forma secuencial; los stubs y las variables de entorno se restauran tras cada caso. Se utiliza el nombre compatible con Node 22 del [flag de aislamiento](https://nodejs.org/download/release/v22.13.0/docs/api/cli.html#--experimental-test-isolationmode). Cubren los contratos del adaptador Redmine, los schemas compartidos, filtros numéricos y fechas, campos personalizados por ID, preferencias y configuración segura.
- Playwright ejecuta Chromium contra Next.js y un servidor REST sintético en loopback. Usa cuentas, claves y respuestas ficticias; sobrescribe la configuración de Redmine y de sesión y no accede a la instancia configurada en `.env.local`.
- La suite utiliza los puertos 3219 y 3220, un único worker y `.next-e2e` para aislarse del servidor habitual. Si esos puertos están ocupados, la ejecución falla; no reutiliza servidores desconocidos.
- El fixture permite controlar fallos, revocaciones y respuestas pendientes. Sus rutas de control existen únicamente en el servidor simulado; no forman parte de la aplicación.
- Los filtros usan únicamente el catálogo estándar. Las pruebas comprueban la revocación al cargar el catálogo, la ausencia de consultas administrativas y la conservación de criterios guardados `cf_*`, que requieren revisión y reciben 400 sin consultar incidencias ni ampliar la búsqueda.
- La caducidad se comprueba con una cookie correctamente sellada y una fecha `expiresAt` pasada. El secreto ficticio se comparte con la configuración Playwright; primero se verifica una sesión vigente para distinguir caducidad de cookie inválida. El envío recibe 401, devuelve la eliminación de la cookie mediante `Set-Cookie`, la elimina del navegador, elimina el borrador privado y no llega a Redmine.
- Las pruebas de navegador cubren cambios de cuenta con respuestas tardías, errores iniciales, creación pendiente y ambigua, cambio de proyecto, validación accesible, permisos, filtros antiguos y protección del API.
- Se prueba Next.js en desarrollo para conectar el fixture HTTP local; la configuración de producción sigue exigiendo HTTPS. El build de producción se comprueba por separado.

## Redmine real local

Consulta [redmine-local-testing.md](redmine-local-testing.md) para iniciar Redmine 6.1.5 con SQLite y ejecutar `pnpm test:e2e:redmine`. Esta suite usa Redmine real en Docker y es independiente de los tests simulados; utiliza las cuentas normales creadora y de lectura y no requiere credenciales del servidor desplegado. La cuenta administrativa local queda reservada para mantener Docker.

## Diagnóstico de lectura por cuenta

Consulta [redmine-diagnostics.md](redmine-diagnostics.md) para comprobar la cuenta actual y un proyecto mediante cinco consultas de lectura. Las suites simulada y Docker cubren el informe, fallos parciales, revocación y cuentas con distintos permisos; no consultan el servidor empresarial.

## Validación contra Redmine desplegado

T015 queda completada el 2026-10-13 con una aceptación combinada: los errores estándar, permisos, caducidad y resultados inciertos se verifican en entornos aislados; metadatos, creación autorizada, persistencia, teclado y tiempos se acreditan con la ejecución empresarial del 2026-10-13 en `turiguanq` (3298), incidencia 80569. La matriz y las limitaciones están en [el quickstart](../specs/004-add-issues/quickstart.md#combined-acceptance-evidence). La incidencia se conserva para revisión. El cierre no acredita otros tipos, campos, workflows, cuentas o proyectos; no requiere provocar fallos, revocar claves ni crear más incidencias en el servidor empresarial.

Consulta [security.md](security.md) para interpretar la auditoría completa de dependencias y su excepción temporal documentada.

SC-003 sigue pendiente de evaluación con usuarios nuevos: no hay un estudio registrado que acredite el 90% de creación sin ayuda. Las pruebas automatizadas no sustituyen esa evaluación; este pendiente no reabre T015 bajo su criterio combinado aprobado.

Resultado del cierre: 27 pruebas unitarias, 28 de navegador simulado y 9 de Redmine Docker pasan, junto con lint, TypeScript y formato. Esta ejecución reutiliza la evidencia empresarial y no realiza nuevas consultas ni escrituras allí.

## Renovación visual y Kanban — 2026-10-15

Pasan 42 pruebas unitarias, 42 de navegador simulado y 10 de Redmine 6.1.5 local. También pasan lint, TypeScript, formato, `git diff --check` y el build de producción. La auditoría de producción no presenta avisos; la completa conserva únicamente la excepción de desarrollo documentada en `security.md`.

Las pruebas nuevas cubren columnas por proyecto y estado, paginación, persistencia de vista, arrastre real de ratón, alternativa con teclado, validación de origen y atributos, respuestas 403/409/422, verificación tras una respuesta perdida, movimientos pendientes y aislamiento entre cuentas. El panel de creación conserva peticiones al ocultarse y devuelve el foco al cerrarse cuando el control está disponible.

La revisión visual genera 36 capturas de login, lista, creación, tablero, tiempo y diagnóstico en ambos temas a 390, 768 y 1440 px. Comprueba ausencia de desbordamiento horizontal de página, foco dentro del diálogo y preferencia de tema persistente. Las capturas del último recorrido quedan en `test-results/workspace-visual-*/`. Las tablas y columnas pueden desplazarse dentro de sus contenedores. Los pares de texto principal, texto secundario y botones principales superan 4.5:1; los bordes de campos superan 3:1 en ambos temas. Esto no sustituye una evaluación completa con usuarios y tecnologías de asistencia.

La aceptación real crea una incidencia en el Docker aislado, mueve su estado con `qa-creator`, confirma persistencia por REST y verifica que `qa-reader` recibe 403 sin modificarlo. Se conservan los datos locales de aceptación. No se realizaron consultas ni escrituras en la instancia desplegada; sus versiones, plugins, reglas de campos y workflows requieren su propia aceptación. La lectura de estado antes de guardar detecta conflictos observables, pero no aporta bloqueo atómico entre clientes.

### Paleta de DESIGN.md — 2026-10-15

La revisión cromática mantiene los temas Claro, Oscuro y Sistema y usa la paleta Notion del documento. El recorrido visual genera 36 capturas y comprueba contraste mínimo de 4.5:1 para etiquetas, texto secundario, navegación activa, vista seleccionada, botones principales, mensajes de estado y enlaces presentes en esas pantallas. La captura completa se renderiza antes de medir los estilos, incluidos los elementos fuera del viewport al cambiar de tema. Esta comprobación cubre los elementos seleccionados; no acredita por sí sola conformidad WCAG de toda la aplicación.

Pasan las 42 pruebas de navegador simulado, el build de producción, lint, TypeScript, formato y `git diff --check`. La comprobación de Sistema incluye seguir la preferencia del navegador. Este ajuste de colores no repite la aceptación con Redmine real ni realiza consultas a la instancia desplegada.

### DESIGN.md Todoist y presentación mobile first — 2026-10-16

Pasan 42 pruebas unitarias, 48 de navegador simulado y 10 de Redmine 6.1.5 Docker. Las regresiones nuevas comprueban que plegar filtros conserva el borrador, que editar un criterio abre el editor y mueve el foco, que los registros conservan sus campos y página al pasar de tarjetas a tabla, y que una cuenta táctil puede mover una incidencia sin arrastrar y navegar con el menú móvil. Los casos de creación pendiente, resultados inciertos, permisos y aislamiento entre cuentas siguen pasando.

El recorrido visual se divide en cuatro pruebas, una por ancho (320, 390, 768 y 1440 px), para aislar sus tiempos y fallos. Genera 56 capturas de acceso, lista, filtros abiertos, creación, tablero, tiempo y diagnóstico en claro y oscuro. Se revisan las capturas y se comprueban ausencia de desbordamiento de página, presentación de filas como tarjetas/tabla, contraste de texto mínimo de 4.5:1 en los elementos seleccionados y foco dentro del diálogo. Sistema sigue la preferencia del navegador y conserva la elección al recargar. Los artefactos están en `test-results/workspace-visual-*/`.

La comprobación adicional de los tokens obtiene 5.14:1 para Pencil sobre Paper, 5.23:1 para el borde de control oscuro sobre su superficie, 5.58:1 para enlaces sobre Cream y 4.89:1 para la vista seleccionada. Esta medición y el recorrido en Chromium no sustituyen una evaluación completa con tecnologías de asistencia ni dispositivos físicos.

La aceptación Docker se ejecuta con las cuentas normales del proyecto aislado y conserva las incidencias de prueba. No se realizan consultas ni escrituras contra Redmine empresarial. Lint, TypeScript, formato, `git diff --check` y build pasan. La auditoría de producción no tiene avisos y la completa conserva únicamente la excepción de desarrollo de `security.md`.

### Referencia public/design.html — 2026-10-16

Pasan las 49 pruebas de navegador simulado con la paleta azul y gris de `public/design.html`. La nueva prueba comprueba la barra compacta de 72 px, su expansión a 260 px con puntero y teclado y la apertura del menú completo con el tema seleccionado. Los casos de cambio de cuenta, error de cierre de sesión y respuestas tardías también pasan con el control de salida compacto. El indicador de desarrollo de Next.js está desactivado para que no tape ese control.

Se regeneran las 56 capturas en claro y oscuro a 320, 390, 768 y 1440 px y se revisan lista móvil y tablero de escritorio. El recorrido verifica contraste de texto y ausencia de desbordamiento de página. Lint, TypeScript, formato y build pasan. Producción no tiene avisos de auditoría; la auditoría completa conserva la excepción documentada de desarrollo.

Este ajuste de presentación no repite las suites unitarias ni la aceptación Docker, que pasaron en la renovación anterior de esta sesión. No modifica contratos de la API ni consulta o escribe en Redmine empresarial.
