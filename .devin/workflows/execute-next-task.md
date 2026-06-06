---
description: Executes the first open TASKS from TASKS.md with research, best practices, QA, and commit
---

# Execute Next TASKS Workflow

This workflow systematically executes the first incomplete TASKS from TASKS.md with full research, best practices application, quality assurance, and version control.

## Steps

1. **Read TASKS.md**
   - Read the `TASKS.md` files at the repository root
   - Identify the first TASKS with status `[ ]` (incomplete)
   - Extract the TASKS ID, description, related file paths, and subTASKSs

2. **Assess the Repository**
   - Review the repository structure to understand the codebase
   - Examine the related file paths mentioned in the TASKS
   - Check dependencies and existing patterns in the codebase

3. **Conduct Online Research**
   - Research the TASKS's topics (e.g., type assertions, environment variables, testing)
   - Find up-to-date best practices for the specific domain
   - Look for enterprise solutions and industry standards
   - Research DDD (Domain-Driven Design), TDD (Test-Driven Development), BDD (Behavior-Driven Development), and deep modules patterns relevant to the TASKS
   - Document findings to guide implementation

4. **Validate TASKS Relevance**
   - Assess whether the TASKS is still relevant given current codebase state
   - Check if the TASKS description accurately reflects what needs to be done
   - Determine if different actions should be taken instead (e.g., TASKS already completed, approach needs adjustment)
   - If TASKS needs modification, update TASKS.md before proceeding

5. **Execute the TASKS**
   - Follow best practices from research
   - Apply DDD principles: focus on domain logic, bounded contexts, ubiquitous language
   - Apply TDD principles: write tests first, refactor as needed, ensure test coverage
   - Apply BDD principles: focus on behavior from user perspective, use given-when-then structure
   - Apply deep modules principles: create cohesive modules with simple interfaces, hide implementation details
   - Implement all subTASKSs listed in the TASKS
   - Follow the rules and patterns specified in the TASKS
   - Adhere to AGENTS.md conventions
   - Make minimal, focused changes

6. **Quality Assurance Assessment**
   - Run type checking: `pnpm -r run typecheck`
   - Run linting: `pnpm run lint`
   - Run tests: `pnpm -r run test`
   - Run test coverage if applicable: `pnpm -r run test:coverage`
   - Verify the definition of done criteria from the TASKS are met
   - Check that no anti-patterns from the TASKS were introduced
   - Ensure code follows the advanced coding patterns specified
   - Make corrections if any issues are found

7. **Mark TASKS Complete**
   - Update the TASKS status from `[ ]` to `[x]` in TASKS.md
   - Add implementation notes under the TASKS if needed
   - Mark all subTASKSs as complete with ✅
   - Add any lessons learned or observations

8. **Verify Issues in TASKS.md**
   - Review any issues discovered during the workflow (e.g., pre-existing test failures, typecheck errors, infrastructure problems)
   - Check if these issues exist as open TASKSs in TASKS.md
   - If issues do not exist in TASKS.md, add them following the current TASKS format
   - Include appropriate status (Pending, Blocked, etc.), priority, and related file paths
   - Document the issue clearly with context for future resolution

9. **Commit and Push**
   - Stage all changes: `git add .`
   - Create a conventional commit message following the TASKS context (e.g., `feat:`, `fix:`, `refactor:`)
   - Include TASKS ID in commit message (e.g., `fix: TASKS-021 fix frontend type assertions`)
   - Commit the changes
   - Push to GitHub: `git push`
   - If push fails due to conflicts, pull first then push

## Notes

- This workflow focuses on the FIRST incomplete TASKS only
- Always verify the TASKS is still relevant before executing
- Research should inform implementation, not delay it unnecessarily
- Quality assurance is critical - don't skip it
- Commit messages should be clear and follow conventional commit format
- If the TASKS is blocked or cannot be completed, mark it as `[!]` and document why
