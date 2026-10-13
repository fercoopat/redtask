# Redmine real local con Docker

Este entorno utiliza la [imagen oficial Redmine](https://github.com/docker-library/docs/blob/master/redmine/README.md), fijada en `redmine:6.1.5`, con SQLite. Sirve para comprobar REST, permisos y formularios contra Redmine real. Es un entorno local de pruebas, sin plugins ni configuración del servidor desplegado; SQLite no se propone para producción.

## Iniciar y usar

Necesitas Docker con Compose y acceso a su daemon. Los puertos 3030 y 3031 deben estar disponibles.

```sh
pnpm redmine:test:up
pnpm redmine:test:app
```

- Redmine: <http://localhost:3030>.
- Aplicación: <http://localhost:3031>.
- Los puertos se vinculan únicamente a loopback.
- La aplicación de prueba sobrescribe URL y secreto de sesión en su proceso, usa `.next-redmine-test` y no modifica `.env`, `.env.local` ni la configuración de producción.
- Para usarla manualmente, abre una ventana privada: las cookies de `localhost` se comparten entre puertos y una sesión local podría sustituir la cookie de otra aplicación del proyecto en `localhost`. Playwright ya usa contextos de navegador aislados.

La inicialización habilita REST API y crea estos usuarios ficticios:

| Usuario      | Contraseña local     | Permisos                 |
| ------------ | -------------------- | ------------------------ |
| `qa-creator` | `LocalRedmineQA123!` | Ver y añadir incidencias |
| `qa-reader`  | `LocalRedmineQA123!` | Solo ver incidencias     |

La cuenta `admin` con contraseña local `LocalRedmineAdmin123!` se conserva exclusivamente para configurar y mantener esta instalación Docker. No participa en las pruebas de la aplicación y su API Key no se incluye en el fixture.

Inicia sesión en Redmine con `qa-creator` o `qa-reader` y consulta su API Key en **Mi cuenta**; úsala en la aplicación local. No reutilices estas contraseñas ni sus secretos fuera de este entorno.

Hay dos proyectos privados, `Local QA 1` y `Local QA 2`, visibles para ambos usuarios. Cada uno tiene un tipo, una categoría y un campo personalizado obligatorio propios. En Redmine 6 los descriptores de campos del API de proyecto solo contienen ID y nombre; la obligatoriedad se verifica al enviar y un campo vacío produce un 422 real.

La inicialización se puede repetir con `pnpm redmine:test:seed`. Mantiene proyectos y usuarios, normaliza sus permisos y campos, conserva las incidencias y las API Keys de usuarios existentes. El fixture de las pruebas se guarda con permisos 0600 dentro del volumen SQLite; las claves no se imprimen ni se guardan en el repositorio.

## Pruebas automáticas contra Redmine real

```sh
pnpm exec playwright install chromium
pnpm test:e2e:redmine
```

O, con Chromium del sistema:

```sh
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium pnpm test:e2e:redmine
```

El comando inicia e inicializa Redmine, luego Playwright inicia la aplicación local y la detiene al finalizar. Si ya has iniciado `redmine:test:app`, detén ese proceso antes: la suite no reutiliza servidores de aplicación existentes. Redmine permanece disponible después de las pruebas.

La suite es independiente de los tests simulados (`pnpm test:all`) y comprueba:

- Metadatos del proyecto con usuario normal, sin consultar campos personalizados globales.
- Cinco lecturas de diagnóstico satisfactorias con las cuentas creadora y de lectura.
- Creación de una sola incidencia y verificación de su persistencia mediante REST de Redmine.
- Validación local, 422 real, conservación del borrador y corrección posterior.
- Proyecto visible que rechaza una creación de la cuenta de lectura con 422 y sin crear ninguna incidencia. Redmine 6.1.5 descarta el proyecto no autorizado en los atributos seguros y devuelve errores de validación; no se deduce un 403 a partir del texto. La respuesta explícita 403 se comprueba en la suite simulada.
- Cambio de proyecto sin enviar valores del proyecto anterior.
- Creación usando únicamente teclado y medición hasta confirmar persistencia. Se exige menos de dos minutos incluyendo espera de Redmine, un límite más estricto que excluirla. El resultado queda en `test-results-redmine/.../creation-timing.json` y en los adjuntos de Playwright.
- Revocación real de la API Key del creador y fin de sesión; la clave local se restaura en `finally`.

Las incidencias de prueba llevan un asunto único `Local acceptance ...` y se conservan para inspeccionarlas. Las credenciales solo se leen del contenedor de este proyecto Compose; las URLs están fijadas a loopback. No ejecutes simultáneamente varias suites reales ni reinicialices usuarios mientras estén ejecutándose.

## Detener y reiniciar

```sh
pnpm redmine:test:down
pnpm redmine:test:up
```

Detener no borra los volúmenes ni las incidencias. Para borrar explícitamente **todos los datos de este entorno local** y comenzar de nuevo:

```sh
docker compose -f compose.redmine-test.yml down --volumes
pnpm redmine:test:up
```

El proyecto Compose se llama `redmine-ui-test` y tiene volúmenes propios; no utiliza bases de datos existentes.

## Aceptación del despliegue

Estas comprobaciones acreditan la integración con Redmine 6.1.5 local y aportan la evidencia de errores y permisos de T015. Su [matriz de aceptación](../specs/004-add-issues/quickstart.md#combined-acceptance-evidence) combina estas pruebas con la creación empresarial ya registrada. Versiones exactas, plugins, campos y workflows de otros casos siguen fuera de esa evidencia. Los fallos de conexión y resultados ambiguos se cubren en la suite simulada, sin introducir interrupciones en servidores compartidos.

## Resultado local registrado

2026-10-09, Redmine 6.1.5, SQLite, Node 24.15.0 y Chromium del sistema: 7 pruebas reales, 22 unitarias y 20 de navegador simulado pasan. El flujo automatizado por teclado tardó 729 ms desde abrir el formulario hasta confirmar persistencia, incluyendo espera de Redmine; no es una medición de una persona usando el formulario. Lint, TypeScript, build y formato pasan. La auditoría de producción no presenta avisos; la completa conserva únicamente la excepción de `braces` documentada en `security.md`.

2026-10-13: pasan 9 pruebas reales (7 de incidencias y 2 de diagnóstico), 27 unitarias y 27 de navegador simulado. El diagnóstico se valida con `qa-creator` y `qa-reader`; consulta [redmine-diagnostics.md](redmine-diagnostics.md). El fixture incluye únicamente sus API Keys dentro del volumen y nunca las imprime. T015 sigue pendiente.

2026-10-13, cierre con criterio combinado aprobado por el usuario: T015 completada con la evidencia empresarial de la incidencia 80569 y las pruebas aisladas. Pasan 27 unitarias, 28 de navegador simulado y 9 de Redmine real local, además de lint, tipos y formato. La nueva prueba verifica caducidad con una cookie válida cuya fecha de sesión ya venció, sin enviar la creación a Redmine. No se han realizado nuevas consultas ni escrituras empresariales durante este cierre. Las limitaciones de otras configuraciones permanecen en [la matriz de aceptación](../specs/004-add-issues/quickstart.md#combined-acceptance-evidence); los estados pendientes anteriores son históricos.
