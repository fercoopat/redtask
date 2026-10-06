<!--
Sync Impact Report
Version change: 1.0.0 → 1.1.0
Modified principles: none
Added principles: VI. Feature-Oriented Source
Added sections: Product and Technical Constraints; Delivery and Quality
Removed sections: none
Follow-up TODOs: original ratification date is unknown and must be confirmed.
-->

# Redmine UI Constitution

## Core Principles

### I. Secure Redmine Access

Authentication and Redmine credentials MUST be handled only through approved secure flows. Passwords, two-factor codes, session tokens, and API keys MUST NOT be logged, exposed in client code, or persisted beyond what the authenticated session requires. Authentication failures MUST be reported without revealing secrets.

### II. Native Stack

Features MUST use the dependencies and platform conventions already present in `package.json`: Next.js, React, TypeScript, React Hook Form, Zod, SWR, Tailwind CSS, and DaisyUI. Form validation MUST use Zod with React Hook Form; server mutations MUST use SWR mutation APIs where applicable. New dependencies require a concrete capability gap that existing tools cannot reasonably cover.

### III. Accessible, Consistent UI

The interface MUST provide keyboard-operable controls, visible focus states, semantic structure, and labels or accessible names. DaisyUI components and theme tokens MUST be preferred for consistent styling; custom UI code is justified only when existing components cannot meet a user need.

### IV. Validated Data Flows

Untrusted input MUST be validated at the boundary with schemas before it is used in application or Redmine requests. Mutations MUST expose pending, success, and failure states and MUST avoid claiming success when the upstream operation fails. Redmine integration behavior MUST respect the instance's actual permissions and available API capabilities.

### V. Focused Delivery

Work MUST solve a stated workflow need with the smallest maintainable change. Features MUST NOT assume access to a particular Redmine deployment or add speculative abstractions. Changes to authentication, forms, and integration boundaries MUST include a runnable check appropriate to the behavior.

### VI. Feature-Oriented Source

Feature-specific code MUST live in `src/modules/<feature>`, grouped into populated responsibility folders such as `components`, `helpers`, or `handlers`. Shared application code MUST live in `src/shared`. Next.js route files under `src/app/<route>/page.tsx` MAY contain that route's page composition and UI. Source filenames MUST use kebab-case except for framework-mandated names such as `page.tsx`, `route.ts`, and `layout.tsx`. Modules MUST stay cohesive and avoid empty folders or extra layers that do not clarify ownership or reuse.

## Product and Technical Constraints

The product is an alternative web interface for an existing company-hosted Redmine instance; it does not replace or administer that instance. The application MUST use only access authorized for the signed-in user and MUST preserve Redmine's permission model. The current stack is defined by `package.json`; proposed stack changes require an explicit need and justification.

## Delivery and Quality

Feature specifications MUST state user-visible behavior, authentication assumptions, and relevant Redmine capabilities. Plans and implementation tasks MUST account for validation, failure states, accessibility, and security when applicable. Review MUST check these constraints and verify that the work does not expose credentials or bypass upstream permissions.

## Governance

This constitution governs feature specifications, plans, implementation, and review. Amendments MUST update this document and its version/date metadata. Use semantic versioning: MAJOR for incompatible governance changes, MINOR for new or materially expanded principles or sections, and PATCH for clarifications and non-semantic edits. The original ratification date MUST be filled in when confirmed; each amendment MUST set Last Amended to its effective date. Reviews MUST identify any conflict with these principles and resolve it in the specification or implementation before completion. Exceptions require a documented reason and explicit approval from the project owner.

**Version**: 1.1.0 | **Ratified**: TODO(RATIFICATION_DATE): confirm original adoption date | **Last Amended**: 2026-10-06
