# Contrato de preferencia de idioma

## Rutas de aplicación

- `GET /login` y `GET /issues` conservan sus rutas actuales y muestran la interfaz en el idioma activo.
- `GET /` conserva su redirección existente de inicio de sesión o incidencias.
- La selección de idioma mantiene la ruta actual y, si está presente, su query string.
- El idioma de la página se comunica en el atributo `lang` del documento.

## Guardar preferencia

### `POST /api/locale`

Solicitud JSON:

```json
{ "locale": "es" }
```

`locale` admite únicamente `es` o `en`. Una solicitud de mismo origen válida guarda el idioma en la cookie `locale` durante un año, con `Path=/`, `HttpOnly`, `SameSite=Lax` y `Secure` cuando se usa HTTPS; responde con éxito sin datos personales. El cliente refresca la ruta actual para mostrar las traducciones nuevas y conserva el estado de cliente no afectado y la posición de scroll.

- Idioma admitido: respuesta satisfactoria y cookie actualizada.
- Valor ausente o no admitido: `400`, sin cambiar la preferencia.
- Origen no permitido: `403`, sin cambiar la preferencia.

El selector muestra que la actualización está pendiente, confirma el éxito y solo entonces refresca la ruta. Si la solicitud falla, mantiene el idioma y el estado de trabajo actuales, anuncia un error recuperable y permite reintentar; no presenta el cambio como exitoso.

El endpoint no requiere sesión Redmine y no lee, escribe ni devuelve la API Key.

## Errores de aplicación

Los errores que consumen las pantallas de inicio de sesión e incidencias se presentan en el idioma activo. Se conservan los códigos HTTP, el significado del error y las respuestas exitosas existentes. El contenido recibido de Redmine permanece sin traducir.
