# Quickstart: validar internacionalización

## Requisitos

- Node.js 22.13 o posterior.
- Dependencias instaladas (`pnpm install`).
- Configuración local de Redmine y `IRON_SESSION_PASSWORD` según [README.md](../../README.md).
- Una cuenta Redmine válida para comprobar el flujo autenticado.

## Arranque y comprobaciones

1. Ejecutar `pnpm lint` y `pnpm build`; ambos deben finalizar correctamente.
2. Ejecutar `pnpm dev` y abrir `http://localhost:3000` en un perfil de navegador limpio con idioma preferido español. La aplicación debe mostrar español y el documento debe indicar `lang="es"`.
3. Cambiar el idioma a inglés desde la pantalla de inicio de sesión. La pantalla debe conservar su ruta y mostrar en inglés etiquetas, ayudas, validaciones y estados.
4. Cerrar y volver a abrir el navegador diez veces. En las diez visitas, el inglés elegido debe seguir activo aunque la preferencia del navegador sea español.
5. Iniciar sesión y comprobar que la lista de incidencias, controles, filtros, mensajes de carga, vacío y error aparecen en inglés. Cambiar a español y verificar que se conservan la ruta, los filtros activos y la página actual.
6. Cerrar sesión, abrir un perfil limpio con inglés como idioma preferido y verificar que la primera visita aparece en inglés sin una preferencia guardada.
7. Repetir con una preferencia del navegador que no sea español ni inglés y verificar el respaldo español.
8. En cada idioma, provocar una API Key inválida y un fallo recuperable al cargar incidencias; los mensajes deben estar traducidos, conservar el significado y no revelar la API Key.
9. Revisar que asuntos, descripciones, nombres de proyecto y valores originales de Redmine se mantienen sin traducir.

## Resultado esperado

Todos los escenarios anteriores pasan en español e inglés; el idioma elegido se conserva en ese navegador. Los comandos de lint y build no reportan errores.
