---
trigger: model_decision
description: Guidelines for spec-first development workflow and specification templates
---

# Spec-First Development

Every feature must begin with a specification before any implementation code is written. This follows the Specification-Driven Development (SDD) methodology where the spec becomes the source of truth.

## When to Apply

Apply this rule when:
- Starting a new feature or API endpoint
- Modifying existing API contracts
- Adding cross-domain functionality
- Implementing user-facing features

## Spec Requirements

Before writing implementation code, create `apps/<app>/specs/<feature>.spec.md` with:

### Required Sections

1. **User Story**
   - Who is the user?
   - What problem are they trying to solve?
   - What is the desired outcome?

2. **API Contract**
   - OpenAPI specification for REST endpoints
   - Request/response schemas
   - Authentication requirements
   - Error response formats

3. **Validation Rules**
   - Input validation requirements
   - Business rule constraints
   - Edge cases to handle

4. **Error Cases**
   - All possible error scenarios
   - Error codes and messages
   - Recovery strategies

5. **Out of Scope**
   - What is explicitly NOT included
   - Future considerations deferred

## Spec-First Workflow

1. **Write the spec first** - No code until spec is approved
2. **Design review** - Team reviews API design before implementation
3. **Generate mocks** - Use spec to create mock servers for parallel development
4. **Implement against spec** - Code must match the contract
5. **Contract testing** - Automated tests verify implementation matches spec

## Benefits

Based on 2026 spec-driven development best practices:

- **Design review becomes possible** - Catch issues at the cheapest moment
- **Parallel development** - Frontend can build against mocks while backend implements
- **Contract tests catch regressions** - Implementation cannot drift from specification
- **SDK and documentation generation** - Single source of truth for all artifacts
- **Systematic pivots** - Requirement changes become regenerations, not rewrites

## Tools

- OpenAPI (Swagger) for REST API specifications
- Drizzle ORM schema definitions for database contracts
- Zod schemas for runtime validation
- Orval for generating TypeScript clients from OpenAPI specs

## Enforcement

- CI checks for missing specs when new API routes are added
- PR review requires spec approval before implementation review
- Contract tests fail if implementation drifts from spec
