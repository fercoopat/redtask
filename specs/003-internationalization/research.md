# Research: Internationalización

## Decisiones

### Mantener las rutas actuales y resolver el idioma desde una cookie

- **Decisión**: Conservar `/login`, `/issues` y `/api/*`. En la primera visita, elegir español o inglés según `Accept-Language`, con español como respaldo. Una preferencia guardada en cookie prevalece en visitas posteriores. El selector guarda la cookie y actualiza la interfaz en la ruta actual.
- **Rationale**: La especificación requiere que el cambio de idioma conserve pantalla y estado. La lista de incidencias mantiene filtros y página en estado de cliente; una migración a prefijos `/es` y `/en` obligaría a mover páginas y actualizar redirecciones, y podría desmontar esa lista.
- **Alternatives considered**: Prefijos de idioma en la URL con un segmento dinámico y redirección previa. La guía oficial de Next.js lo describe como patrón recomendado cuando se necesitan rutas localizadas, pero ese requisito no existe aquí y el cambio tocaría todas las rutas de página.
- **Source**: `node_modules/next/dist/docs/01-app/02-guides/internationalization.md`, secciones “Routing Overview” y “Localization”. `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/cookies.md`, resumen de API y comportamiento de cookies.

### Usar una cookie no sensible con lectura del servidor

- **Decisión**: Guardar únicamente `es` o `en`. El layout lee la cookie para establecer `html lang`; sin cookie, negocia el idioma anunciado por el navegador. Un Route Handler valida y escribe la preferencia. La UI conserva la ruta actual al actualizarse.
- **Rationale**: El valor está disponible durante el renderizado inicial, también antes de iniciar sesión, y no requiere almacenamiento de cuenta. Next.js permite leer cookies en componentes de servidor y modificarlas en Route Handlers; sus APIs son asíncronas en la versión instalada. Leerlas hace que el render dependa de la solicitud, aceptable para esta aplicación pequeña.
- **Alternatives considered**: `localStorage` requeriría determinar el idioma en cliente después del HTML inicial, creando discrepancia visual y en `html lang`; sincronización con la cuenta no está solicitada.
- **Source**: `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/cookies.md`, “Good to know” y “Understanding Cookie Behavior in Server Components”.
- **Estado de cliente**: Después de guardar la cookie, refrescar la ruta actual con `router.refresh()`; Next.js conserva el estado de cliente no afectado (`useState`) y la posición de scroll al combinar el nuevo contenido del servidor.
- **Source**: `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/use-router.md`, descripción de `router.refresh()`.

### No agregar biblioteca de traducción

- **Decisión**: Usar `next-intl` para mensajes y formato de fechas/números en componentes de servidor y cliente. Mantener la preferencia de idioma en cookie y conservar las rutas actuales.
- **Rationale**: La interfaz combina Server Components, Client Components y respuestas localizadas de API. `next-intl` soporta App Router y tiene un patrón oficial para manejar idioma por cookie sin rutas localizadas, además de ofrecer formatos y mensajes ICU.
- **Alternatives considered**: Catálogo manual más `Intl` reduciría dependencias, pero duplicaría resolución, mensajes y contexto de locale en las pantallas y handlers.

### Localizar mensajes de API y validación

- **Decisión**: Traducir mensajes propios de la aplicación que presentan las pantallas, incluidos los errores que devuelven los endpoints de sesión e incidencias. Mantener intactos el contenido y valores originados en Redmine.
- **Rationale**: Los clientes actuales muestran directamente el campo `error` del JSON y los formularios muestran mensajes de validación. FR-001 y FR-008 exigen que esos mensajes sigan el idioma activo.
- **Alternatives considered**: Dejar errores del servidor solo en español produciría una interfaz mezclada. Traducir automáticamente texto de Redmine excede el alcance de FR-010.

## Hallazgos del código actual

- `src/app/layout.tsx` fija `html lang="es"`.
- Las páginas `/login` y `/issues` y las redirecciones asociadas usan las rutas actuales sin prefijo de idioma.
- `LoginForm` y `IssueList` son componentes de cliente; la lista conserva filtros y página en estado local.
- Los Route Handlers devuelven mensajes de error en español que sus consumidores muestran directamente.
- El proyecto ya dispone de `zod` para validar el valor de idioma; `next-intl` se agrega como dependencia de i18n.
