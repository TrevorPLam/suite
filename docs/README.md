# Suite Documentation

This directory provides stable documentation paths referenced in AGENTS.md and README.md. The actual documentation files are maintained in `.planning/` with a different naming convention.

## Path Mapping

The following mappings show how `docs/` paths map to `.planning/` files:

| docs/ path | .planning/ file |
|------------|-----------------|
| `docs/00-vision/00-vision-and-principles.md` | `.planning/00-vision-00-vision-and-principles.md` |
| `docs/03-data/24-database-schema-reference.md` | `.planning/03-data-24-database-schema-reference.md` |
| `docs/04-backend/26-error-handling-taxonomy.md` | `.planning/04-backend-26-error-handling-taxonomy.md` |
| `docs/02-monorepo/25-testing-strategy.md` | `.planning/02-monorepo-25-testing-strategy.md` |
| `docs/07-business/18-compliance-gdpr-cra.md` | `.planning/07-business-18-compliance-gdpr-cra.md` |
| `docs/07-business/33-incident-response.md` | `.planning/07-business-33-incident-response.md` |
| `docs/08-execution/36-developer-onboarding.md` | `.planning/08-execution-36-developer-onboarding.md` |
| `docs/10-apps/` | `.planning/10-apps-*.md` |

## Why This Structure?

The `.planning/` directory uses a flat naming convention (e.g., `00-vision-00-vision-and-principles.md`) for organizational purposes, while the `docs/` paths use a hierarchical structure (e.g., `docs/00-vision/00-vision-and-principles.md`) that better reflects the content organization.

When you see a reference to a `docs/` path in AGENTS.md or other files, use the mapping above to find the actual file in `.planning/`.

## Direct Links

For convenience, here are direct links to the most commonly referenced documentation:

- [Full plan](../.planning/00-vision-00-vision-and-principles.md)
- [Schema reference](../.planning/03-data-24-database-schema-reference.md) (mandatory read for all domain work)
- [Error codes](../.planning/04-backend-26-error-handling-taxonomy.md)
- [Testing guide](../.planning/02-monorepo-25-testing-strategy.md)
- [Compliance records](../.planning/07-business-18-compliance-gdpr-cra.md)
- [Incident response](../.planning/07-business-33-incident-response.md)
- [Developer setup](../.planning/08-execution-36-developer-onboarding.md)
- [App guides](../.planning/10-apps-40-app-calendar.md) (and other 10-apps-*.md files)
