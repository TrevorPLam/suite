# Documentation & API Design

## 1. Living Documentation

- **Architecture Decision Records (ADRs):** Stored in `docs/adr/`.
- **API Documentation:** Auto-generated from code annotations (OpenAPI for REST, Protobuf comments for gRPC) and published via CI.
- **Runbooks:** Stored alongside code for operational procedures.

## 2. Code Comments

- Code should be self-documenting.
- Use comments to explain **why**, not **what**.
- Mark technical debt with `TODO(<issue-id>)` or `FIXME`.

## 3. API Design (REST & GraphQL)

### REST API
- **OpenAPI specification** written before implementation (design‑first).
- **Versioning:** URL path versioning (`/api/v1/resource`).
- **Non‑breaking changes only** within a version.
- **Breaking changes** create a new version (`/api/v2/…`).
- **Deprecation policy:** Announce in headers, provide sunset date, support old version for at least 6 months.
- **HTTP status codes** must be meaningful.
- **Error responses** have a consistent structure (`{ "error": { "code": "...", "message": "...", "details": {} } }`).

### GraphQL API
- **Schema‑first design.**
- **Use input types.**
- **Handle nullability** explicitly.
- **No breaking changes** – additive only; use `@deprecated` directive.
- **Query complexity limits** and depth limiting.

## 4. Design Systems as Code (for UI‑heavy projects)

- **Design tokens** (colours, spacing, typography) stored as JSON/YAML, versioned.
- **Component library** with Storybook or similar, with accessibility tests and visual regression tests.
- **Governance:** A dedicated design system team reviews changes.

## 5. Changelog

Generated automatically from conventional commits using `semantic-release` or `standard-version`. Do not edit `CHANGELOG.md` by hand.
