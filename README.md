# Redmine Workspace

Interfaz web para iniciar sesión con una API Key de Redmine y consultar las incidencias permitidas para esa cuenta.

## Requisitos

- Node.js 22.13 o posterior.
- Acceso REST API habilitado en la instancia Redmine por su administrador.
- HTTPS en producción.

## Configuración local

```sh
cp .env.example .env.local
```

Configura `REDMINE_BASE_URL` con la URL de la única instancia Redmine y define `IRON_SESSION_PASSWORD` con un secreto aleatorio de al menos 32 caracteres. Puedes generarlo con `openssl rand -base64 32`. No compartas ni subas el secreto al repositorio.

```sh
pnpm install
pnpm dev
```

Abre <http://localhost:3000>.

## Validación

Consulta la [guía de inicio y escenarios de aceptación](specs/001-redmine-api-key-auth/quickstart.md) para validar la conexión, la persistencia y el cierre de sesión.

## Formato de código

Prettier define el formato compartido del proyecto y `eslint-config-prettier` desactiva reglas de ESLint que podrían contradecirlo. `eslint-plugin-simple-import-sort` ordena los imports mediante ESLint. En ambas IDE, selecciona Prettier instalado desde este proyecto para usar `.prettierrc.json` y activa ESLint autofix al guardar si quieres que los imports se ordenen automáticamente (en VS Code, `source.fixAll.eslint`; en WebStorm, `Run eslint --fix on save`).

```sh
pnpm format
pnpm format:check
pnpm lint
pnpm lint --fix
```

## Organización del código

- `src/app` contiene las entradas de ruta que requiere Next.js (`page.tsx`, `route.ts`, `layout.tsx`); cada `page.tsx` puede incluir la composición y UI propias de esa página.
- `src/modules/<feature>` agrupa el código reutilizable o propio de cada funcionalidad (`auth`, `issues`, `redmine`), organizado en carpetas pobladas por responsabilidad como `components`, `helpers` o `handlers`.
- `src/shared` contiene código de aplicación reutilizado por más de un módulo.
- Los nombres de archivo usan kebab-case, excepto los nombres que Next.js exige para sus rutas y layouts.
- Mantén cada módulo cohesivo; crea solo las subcarpetas que agrupen archivos existentes y aclaren su responsabilidad.
