<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Redmine documentation

Use the [official Redmine documentation](https://www.redmine.org/projects/redmine/wiki) as the project's reference whenever a task depends on Redmine behavior, configuration, permissions, or REST API capabilities. Consult the relevant page for the feature (for example, [REST API](https://www.redmine.org/projects/redmine/wiki/Rest_api), [Issues](https://www.redmine.org/projects/redmine/wiki/Rest_Issues), or [Projects](https://www.redmine.org/projects/redmine/wiki/Rest_Projects)) instead of relying on assumptions. Redmine versions and instance configuration can differ, so confirm version-specific or deployment-specific behavior when it affects the work.

## Frontend hooks and component boundaries

Follow [the frontend hooks guide](docs/frontend-hooks.md) for feature query, mutation, form, and component-boundary conventions.

## Frontend architecture

Follow [the frontend architecture guide](docs/frontend-architecture.md) for schema placement, API errors, and reusable UI components.

## Security follow-up

Review [security.md](docs/security.md) before delivery or dependency changes.

## Verification

Follow [the testing guide](docs/testing.md) for isolated automated checks and the combined deployed-instance acceptance criteria.

For real local Redmine integration checks, follow [the Docker testing guide](docs/redmine-local-testing.md); use only its isolated Compose project and loopback endpoints.

For account-scoped read diagnostics and report interpretation, follow [the diagnostics guide](docs/redmine-diagnostics.md). Do not infer write permissions from read results.

## Ordinary Redmine users

Application workflows must work with the signed-in user's API key without administrator privileges. Follow [the access conventions](docs/frontend-architecture.md#acceso-con-usuarios-normales) for standard filters, project-scoped creation fields, and saved criteria. Do not call `/custom_fields.json` from application workflows; reserve the Docker administrator for local infrastructure maintenance.
