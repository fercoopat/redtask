# Implementation Plan: Internationalización

**Branch**: `003-internationalization` | **Date**: 2026-10-07 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/003-internationalization/spec.md`

## Summary

Traducir los flujos actuales de inicio de sesión e incidencias al español y al inglés. Resolver el idioma inicial desde una preferencia guardada en cookie o, en la primera visita, desde `Accept-Language`, con español como respaldo. Mantener las rutas y APIs actuales y usar `next-intl` para mensajes, Server/Client Components y formatos localizados.

## Technical Context

**Language/Version**: TypeScript 5, Node.js 22.13+

**Primary Dependencies**: Next.js 16.3.8, React 19.2.8, Zod 4.6.5, `next-intl` 4.14.9

**Storage**: Cookie no sensible del navegador para la preferencia de idioma; no requiere almacenamiento de servidor

**Testing**: Aceptación manual de escenarios de idioma y flujos; `pnpm lint` y `pnpm build`

**Target Platform**: Navegadores web modernos y servidor Node.js

**Project Type**: Aplicación web Next.js App Router

**Performance Goals**: Resolver idioma y textos localmente, sin solicitudes externas

**Constraints**: Mantener `/login`, `/issues` y `/api/*`; no traducir el contenido original de Redmine; respetar permisos y sesión existentes

**Scale/Scope**: Dos idiomas y los flujos de interfaz existentes de inicio de sesión e incidencias, incluidos errores, validaciones, estados y accesibilidad

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

- **Secure Redmine Access**: PASS. La cookie contiene solo `es` o `en`; no almacena ni expone credenciales, y no altera la sesión Redmine.
- **Next.js integration**: PASS. `next-intl` cubre traducción en servidor y cliente, formateo localizado y permite conservar la estrategia de rutas y cookie actual.
- **Accessible, Consistent UI**: PASS. El selector de idioma será accesible por teclado y tendrá etiqueta; los nombres accesibles y mensajes de estado se traducen.
- **Validated Data Flows**: PASS. El cuerpo del endpoint de idioma se valida en el límite con un esquema Zod que admite solo `es` o `en`. El selector expone estados pendiente, éxito y error; si guardar falla, conserva la pantalla y los datos actuales y permite reintentar. Los errores de API conservan sus estados y se presentan en el idioma activo.
- **Focused Delivery**: PASS. Se limita a los flujos existentes, sin rediseñar autenticación ni contenido de Redmine.
- **Feature-Oriented Source**: PASS. La resolución y los textos compartidos viven en `src/shared`; las páginas permanecen como composición de rutas y los componentes propios siguen en sus módulos.

No hay violaciones que requieran justificación.

## Project Structure

### Documentation (this feature)

```text
specs/003-internationalization/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
└── contracts/
    └── locale-preference.md
```

### Source Code

```text
src/
├── app/
│   ├── api/
│   │   ├── auth/session/route.ts
│   │   ├── issues/route.ts
│   │   ├── issues/filters/route.ts
│   │   └── locale/route.ts             # guardar la preferencia de idioma
│   ├── layout.tsx                       # locale HTML y carga inicial
│   ├── login/page.tsx
│   ├── issues/page.tsx
│   └── page.tsx
├── modules/
│   ├── auth/components/login-form.tsx
│   └── issues/components/issue-list.tsx
└── shared/
    └── i18n/
        ├── locale.ts                    # tipos, selección y validación
        ├── translations.ts              # textos español e inglés
        └── locale-switcher.tsx          # control accesible compartido
```

**Structure Decision**: Mantener el App Router y los endpoints actuales. Centralizar la resolución de idioma y los textos compartidos; actualizar las pantallas existentes para recibir el idioma y traducir su contenido. El nuevo endpoint solo guarda la preferencia en cookie.

## Complexity Tracking

No hay excepciones a la constitución ni capas adicionales previstas.
