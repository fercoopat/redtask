# Modelo de datos: Internacionalización

## Idioma disponible

Representa un idioma que la aplicación puede mostrar.

| Campo  | Tipo                             | Regla                                                                                        |
| ------ | -------------------------------- | -------------------------------------------------------------------------------------------- |
| código | `"es"` o `"en"`                  | Únicamente los valores soportados se aceptan como preferencia                                |
| textos | conjunto de mensajes de interfaz | Los dos idiomas contienen las mismas claves funcionales; un texto ausente recurre al español |

## Preferencia de idioma

Representa el idioma elegido por la persona en el navegador actual.

| Campo  | Tipo                 | Regla                                                        |
| ------ | -------------------- | ------------------------------------------------------------ |
| idioma | `"es"` o `"en"`      | Validado contra los idiomas disponibles antes de persistirse |
| origen | cookie del navegador | No contiene identidad, API Key ni datos de sesión            |

No existe entidad de servidor ni relación con la cuenta Redmine. El idioma inicial sigue esta precedencia: preferencia guardada; primer idioma compatible anunciado por el navegador; español como respaldo. Si el valor persistido deja de ser válido, se ignora y se usa la selección inicial.

## Estado de presentación

- `es`: interfaz en español.
- `en`: interfaz en inglés.
- Selección del usuario: guarda el idioma admitido y actualiza la interfaz actual.
- Preferencia inválida o ausente: se vuelve a negociar con el navegador; si no coincide, se usa `es`.

La preferencia no cambia sesión, permisos, filtros, página ni contenido entregado por Redmine.
