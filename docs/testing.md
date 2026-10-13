# Pruebas y comprobaciones

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
