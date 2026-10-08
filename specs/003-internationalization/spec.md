# Feature Specification: Internationalización

**Feature Branch**: `003-internationalization`

**Created**: 2026-10-07

**Status**: Draft

**Input**: User description: "Necesito implementar internacionalización"

## Clarifications

### Session 2026-10-07

- Q: ¿Dónde debe conservarse el idioma elegido para visitas futuras? → A: En este navegador.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Usar la interfaz en el idioma preferido (Priority: P1)

Como usuario de Redmine, quiero ver la interfaz en español o inglés para comprender y completar mis tareas con comodidad.

**Why this priority**: La traducción consistente de los flujos existentes es el valor central de la internacionalización.

**Independent Test**: Abrir la aplicación en cada idioma y recorrer el inicio de sesión y la lista de incidencias; todos los textos de la aplicación deben aparecer en el idioma elegido.

**Acceptance Scenarios**:

1. **Given** que el usuario abre la aplicación por primera vez con el navegador configurado en español o inglés, **When** se muestra la aplicación, **Then** la interfaz aparece en el idioma preferido del navegador.
2. **Given** que el usuario elige un idioma disponible, **When** cambia entre inicio de sesión e incidencias, **Then** todas las pantallas de la aplicación conservan ese idioma.
3. **Given** que el idioma preferido del navegador no está disponible, **When** el usuario abre la aplicación sin una preferencia guardada, **Then** la interfaz aparece en español.
4. **Given** que la interfaz está en un idioma, **When** se muestran errores, estados de carga, confirmaciones, controles accesibles o contenido vacío, **Then** esos textos también aparecen en el idioma seleccionado.

---

### User Story 2 - Conservar la preferencia de idioma (Priority: P2)

Como usuario de Redmine, quiero que la aplicación recuerde el idioma que elegí para no tener que seleccionarlo en cada visita.

**Why this priority**: Recordar la elección evita repetir una configuración frecuente y hace predecible la experiencia entre visitas.

**Independent Test**: Cambiar el idioma, navegar a otra pantalla, cerrar y volver a abrir la aplicación, y confirmar que se conserva la elección.

**Acceptance Scenarios**:

1. **Given** que el usuario selecciona un idioma, **When** navega a otra pantalla o vuelve a visitar la aplicación, **Then** la preferencia permanece activa.
2. **Given** que el usuario tiene una preferencia guardada, **When** esta difiere del idioma del navegador, **Then** prevalece la preferencia guardada.
3. **Given** que una preferencia guardada corresponde a un idioma que ya no está disponible, **When** se abre la aplicación, **Then** se usa el idioma de respaldo y la aplicación sigue siendo utilizable.

### Edge Cases

- Si el navegador informa varios idiomas, se selecciona el primer idioma compatible según su preferencia.
- Si el navegador no informa un idioma compatible y no existe preferencia guardada, se utiliza español.
- Si una traducción para un texto de la aplicación no está disponible, se muestra el texto equivalente en español para evitar contenido vacío o claves internas.
- Los nombres, asuntos, descripciones y demás contenido de incidencias entregados por Redmine conservan el idioma y contenido originales; solo se traducen etiquetas y textos propios de la aplicación.
- Los cambios de idioma no alteran filtros, página, sesión ni otros datos que el usuario esté consultando.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: La aplicación MUST ofrecer español e inglés en todas las pantallas y flujos actualmente disponibles, incluidos inicio de sesión, incidencias y sus estados de carga, vacío, error y confirmación.
- **FR-002**: La aplicación MUST permitir que el usuario cambie el idioma desde una opción visible y accesible tanto antes como después de iniciar sesión.
- **FR-003**: La aplicación MUST detectar el idioma preferido del navegador para elegir el idioma inicial cuando el usuario aún no haya guardado una preferencia.
- **FR-004**: La aplicación MUST usar español como idioma predeterminado si el navegador no indica un idioma compatible.
- **FR-005**: La aplicación MUST guardar la preferencia de idioma para que prevalezca sobre el idioma del navegador en visitas posteriores.
- **FR-006**: Al cambiar el idioma, la aplicación MUST conservar la ruta actual, los filtros activos, la página actual y la sesión Redmine. Si no puede guardar la preferencia, MUST mantener la pantalla y el estado actuales, mostrar un error recuperable y permitir reintentar sin afirmar que el cambio tuvo éxito.
- **FR-007**: La aplicación MUST localizar formatos de fecha y número que genera para presentar información según el idioma seleccionado.
- **FR-008**: La aplicación MUST traducir textos visibles, mensajes de validación y error, etiquetas de controles, nombres accesibles y mensajes de estado propios de la aplicación.
- **FR-009**: La aplicación MUST mostrar en español cualquier texto de interfaz cuya traducción seleccionada no esté disponible y MUST evitar mostrar claves de traducción al usuario.
- **FR-010**: La aplicación MUST conservar sin modificación los valores y textos de incidencias que proporciona Redmine, salvo los formatos de presentación generados por la aplicación.
- **FR-011**: La preferencia de idioma MUST guardarse en el navegador donde se seleccionó, MUST NOT sincronizarse con la cuenta Redmine y MUST NOT revelar ni modificar credenciales o permisos de Redmine.

### Key Entities _(include if feature involves data)_

- **Idioma disponible**: Idioma en el que se presenta la interfaz; inicialmente español o inglés.
- **Preferencia de idioma**: Selección del usuario que determina el idioma de la interfaz entre visitas.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: El 100 % de los textos de interfaz incluidos en los flujos de inicio de sesión e incidencias está disponible en español e inglés.
- **SC-002**: Los usuarios pueden cambiar de idioma en un máximo de dos acciones desde cualquier pantalla principal.
- **SC-003**: En 10 de 10 reaperturas de la aplicación, se conserva el idioma que el usuario seleccionó previamente.
- **SC-004**: En pruebas de aceptación, el 100 % de los mensajes visibles de error, carga, vacío y confirmación aparece en el idioma activo y no expone claves internas.

## Assumptions

- La primera entrega cubre español e inglés; se podrán añadir idiomas en el futuro.
- Español será el idioma de respaldo y el idioma inicial del navegador cuando no exista una preferencia compatible.
- La preferencia se conserva en el navegador donde fue seleccionada; no se sincroniza mediante la cuenta Redmine ni entre navegadores o dispositivos.
- El alcance comprende textos y formatos de presentación propios de la aplicación, no traducción automática del contenido de Redmine.
- Se conserva el flujo actual de autenticación con API Key y los permisos definidos por la instancia Redmine.
