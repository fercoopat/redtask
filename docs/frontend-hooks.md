# Hooks y componentes de interfaz

## Consultas y mutaciones remotas

Los hooks de `src/modules/<feature>/hooks` usan SWR directamente para las operaciones remotas de su feature. Los componentes de presentación consumen esos hooks de dominio y no importan SWR. Los proveedores de contexto de sesión pueden configurar `SWRConfig` y su caché; esa responsabilidad de infraestructura se mantiene fuera de los componentes de presentación.

Cada hook de feature define la clave, el fetcher y los tipos de la operación, y expone los datos, errores, estados pendientes y acciones de actualización que necesita la interfaz. Mantén el manejo de errores coherente con `src/shared/errors`.

Mientras `isValidating` esté activo, deshabilita los controles que cambian los datos o la clave de la consulta en curso: filtros, filtros guardados, paginación y selectores de opciones. Deshabilita también los campos dependientes mientras se actualizan sus opciones. Mantén disponibles las acciones independientes, como cerrar sesión, y permite reintentar cuando la consulta haya terminado con error.

No añadas una fachada genérica para ocultar SWR. Evita hooks que solo reenvíen una llamada sin aportar contexto de la feature; un hook debe nombrar una operación o flujo propio del dominio.

Los hooks de `src/modules/<feature>/hooks` componen las operaciones remotas y el estado de formularios con las rutas, tipos y reglas de esa feature. Un hook de formulario de feature puede usar React Hook Form y Zod directamente, y exponer los enlaces y errores necesarios para que sus componentes presenten los campos y estados. Mantén la lógica del flujo (validación, envío y errores) en ese hook; el componente mantiene la presentación y coordinación visual.

No crees una fachada global por cada hook de una dependencia ni un modelo de campos propio sin una necesidad concreta. Cambiar una librería de consultas, mutaciones o formularios implica adaptar los hooks de feature que la usan. Los errores de validación de un campo se muestran junto a ese campo; los errores generales del formulario y los mensajes recibidos de Redmine se muestran en una alerta del formulario.

## Tamaño y atomicidad

Extrae un componente cuando represente una sección de interfaz con una responsabilidad clara o permita entender mejor los datos y eventos que recibe. Extrae un hook cuando encapsule una operación o flujo de estado con nombre propio. No uses un límite fijo de líneas ni crees un componente por campo solo para reducir el tamaño del archivo.

## Validación

Al modificar estos hooks o sus usos, ejecuta `pnpm lint` y `pnpm build`. Comprueba también los estados de carga, error, envío y actualización del flujo afectado. No añadas una dependencia de pruebas solo para probar una integración fina que delega en SWR.

## Sesiones y mutaciones

La interfaz autenticada usa una caché SWR propia por sesión, identificada por usuario y caducidad; nunca por la API Key. Al terminar la sesión, descarta la caché y sus respuestas pendientes antes de navegar al login. Usa el `unload` del proveedor actual, no la caché global.

El controlador de creación vive en un panel estable. Ocultar un formulario no puede eliminar una petición pendiente ni la verificación exigida tras un resultado ambiguo. Bloquea los envíos simultáneos también dentro del controlador.

Los cambios de proyecto reinician sus campos dependientes y mantienen asunto y descripción. No permitas enviar mientras falten las opciones del proyecto actual.

## Pruebas de regresión

Las reglas y adaptadores se comprueban con `node:test`; los flujos de autenticación y formularios, con Playwright y Redmine simulado. Estas herramientas cubren comportamiento propio de la aplicación. Ejecuta pruebas unitarias, navegador, lint, formato y build después de modificar esos flujos.

## React Compiler y registros de formularios

Los subcomponentes que llaman a `register` reciben un objeto de formulario mutable. Tras `reset`, React Hook Form puede cambiar sus registros sin cambiar la identidad del objeto. Usa `useFormState({ control })` para suscribirte a los errores que presenta cada subcomponente y evita memoizar sus llamadas a `register`. En los componentes de campos de creación y del borrador de filtros se aplica `"use no memo"` para mantener esos registros actualizados con React Compiler. Mantén esta excepción localizada y cubierta por pruebas de cambio de proyecto, reset y validación; el compilador continúa activo en el resto de la aplicación.
