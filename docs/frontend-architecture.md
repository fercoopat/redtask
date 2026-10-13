# Arquitectura de interfaz

## Schemas

Coloca los schemas Zod junto al módulo que posee los datos, dentro de `src/modules/<modulo>/schemas`. Mantén los tipos inferidos junto a su schema y exporta desde el archivo específico. Usa `src/shared/schemas` solo cuando el contrato sea realmente compartido entre módulos (por ejemplo, el sobre de error de la API). No conviertas validaciones internas de un módulo en dependencias globales.

## Errores

Las rutas internas devuelven errores con el contrato `{ error: { code, details? } }` y conservan el estado HTTP apropiado. `code` es un código estable de la aplicación, no texto localizado; el cliente elige el mensaje en el locale actual. `details` solo puede incluir mensajes de validación saneados que sean útiles para corregir campos. No devuelvas mensajes crudos, trazas, credenciales ni respuestas internas de Redmine.

Los errores de Zod asociados a un campo se muestran debajo de su control y se enlazan con `aria-describedby` y `aria-invalid`. Los errores generales de validación, los errores 422 de Redmine que llegan como textos sin campo asociado y los fallos de sesión, permisos o conexión se muestran en una alerta del formulario. Las excepciones de renderizado se manejan con los límites `error.tsx` y `global-error.tsx` de Next.js; sus mensajes son genéricos y no exponen el objeto de error. Usa `AppErrorAlert` o `Alert` para presentar mensajes de error de forma uniforme.

## Componentes de interfaz

Usa los componentes semánticos reutilizables de `src/shared/ui` para controles y patrones repetidos: botón, alerta, campo de formulario, entrada, selector, área de texto y tarjeta. Estos componentes aplican las clases DaisyUI comunes y admiten atributos nativos y clases de layout cuando hagan falta.

No envuelvas cada etiqueta HTML ni extraigas componentes por reducir líneas. Mantén en el módulo las tablas, navegación y controles cuyo comportamiento o estructura sea específico de una funcionalidad. Conserva etiquetas asociadas, estados de foco, errores y nombres accesibles al migrar controles.

## Hooks y límites de componentes

Consulta [frontend-hooks.md](frontend-hooks.md) para las consultas y mutaciones remotas desde hooks de feature, los formularios y los criterios de extracción de componentes.

## Contratos y compatibilidad

Los schemas de respuestas externas pertenecen a Redmine; las reglas de formularios y filtros, a su módulo. Cliente y servidor comparten las reglas, con mensajes localizados en la presentación. Los schemas no dependen del locale.

Redmine 6 devuelve campos personalizados de proyecto con `id` y `name`. Acepta formato, obligatoriedad y valores posibles solo cuando existan; presenta texto si faltan valores posibles y conserva las validaciones de Redmine. Solo `404` y `501` del endpoint opcional de prioridades permiten una lista vacía: red, permisos y respuestas inválidas son errores recuperables.

Los filtros numéricos utilizan `>=` y `<=`. Conserva filtros guardados con operadores antiguos y exige revisión; no cambies su significado automáticamente ni envíes criterios inválidos.

Usa nombres completos de clases en mapas de variantes para que Tailwind genere sus estilos. Los formularios controlados por React Hook Form usan `noValidate` y schemas que incluyen sus restricciones necesarias.

## Acceso con usuarios normales

Los flujos de la aplicación deben funcionar con la API Key del usuario y sin depender de privilegios administrativos. No consultes `/custom_fields.json`: el [API global de campos personalizados](https://www.redmine.org/projects/redmine/wiki/Rest_CustomFields) exige administrador. Los permisos efectivos los decide Redmine por cuenta y proyecto; una lectura correcta no confirma el permiso **Add issues**.

La creación obtiene los campos personalizados del proyecto y conserva la validación de Redmine. El catálogo de filtros es estándar y se comparte entre cliente y servidor; los descriptores `id`/`name` de proyecto no permiten inferir formato ni capacidad de filtrado. El descubrimiento de filtros personalizados para usuarios normales queda pendiente.

Conserva los criterios guardados `cf_*` para que el usuario pueda revisarlos y corregirlos. Impide aplicarlos y devuelve 400 `custom_fields_unavailable` sin consultar incidencias; no elimines criterios silenciosamente ni amplíes resultados. Cargar el catálogo estándar verifica la API Key mediante el usuario actual y conserva el cierre de sesión por revocación. No se añade una restricción de login por rol administrativo.
