---
description: Executes the first open task from TODO.md with research, best practices, QA, and commit
---

# Execute Next Task Workflow

This workflow systematically executes the first incomplete task from TODO.md with full research, best practices application, quality assurance, and version control.

## Steps

1. **Read TODO.md**
   - Read the `TODO.md` files at the repository root
   - Identify the first task with status `[ ]` (incomplete)
   - Extract the task ID, description, related file paths, and subtasks

2. **Assess the Repository**
   - Review the repository structure to understand the codebase
   - Examine the related file paths mentioned in the task
   - Check dependencies and existing patterns in the codebase

3. **Conduct Online Research**
   - Research the task's topics (e.g., type assertions, environment variables, testing)
   - Find up-to-date best practices for the specific domain
   - Look for enterprise solutions and industry standards
   - Research DDD (Domain-Driven Design), TDD (Test-Driven Development), BDD (Behavior-Driven Development), and deep modules patterns relevant to the task
   - Document findings to guide implementation

4. **Validate Task Relevance**
   - Assess whether the task is still relevant given current codebase state
   - Check if the task description accurately reflects what needs to be done
   - Determine if different actions should be taken instead (e.g., task already completed, approach needs adjustment)
   - If task needs modification, update TODO.md before proceeding

5. **Execute the Task**
   - Follow best practices from research
   - Apply DDD principles: focus on domain logic, bounded contexts, ubiquitous language
   - Apply TDD principles: write tests first, refactor as needed, ensure test coverage
   - Apply BDD principles: focus on behavior from user perspective, use given-when-then structure
   - Apply deep modules principles: create cohesive modules with simple interfaces, hide implementation details
   - Implement all subtasks listed in the task
   - Follow the rules and patterns specified in the task
   - Adhere to AGENTS.md conventions
   - Make minimal, focused changes

6. **Quality Assurance Assessment**
   - Run type checking: `pnpm -r run typecheck`
   - Run linting: `pnpm run lint`
   - Run tests: `pnpm -r run test`
   - Run test coverage if applicable: `pnpm -r run test:coverage`
   - Verify the definition of done criteria from the task are met
   - Check that no anti-patterns from the task were introduced
   - Ensure code follows the advanced coding patterns specified
   - Make corrections if any issues are found

7. **Mark Task Complete**
   - Update the task status from `[ ]` to `[x]` in TODO.md
   - Add implementation notes under the task if needed
   - Mark all subtasks as complete with ✅
   - Add any lessons learned or observations

8. **Verify Issues in TODO.md**
   - Review any issues discovered during the workflow (e.g., pre-existing test failures, typecheck errors, infrastructure problems)
   - Check if these issues exist as open tasks in TODO.md
   - If issues do not exist in TODO.md, add them following the current task format
   - Include appropriate status (Pending, Blocked, etc.), priority, and related file paths
   - Document the issue clearly with context for future resolution

9. **Commit and Push**
   - Stage all changes: `git add .`
   - Create a conventional commit message following the task context (e.g., `feat:`, `fix:`, `refactor:`)
   - Include task ID in commit message (e.g., `fix: TASK-021 fix frontend type assertions`)
   - Commit the changes
   - Push to GitHub: `git push`
   - If push fails due to conflicts, pull first then push

## Notes

- This workflow focuses on the FIRST incomplete task only
- Always verify the task is still relevant before executing
- Research should inform implementation, not delay it unnecessarily
- Quality assurance is critical - don't skip it
- Commit messages should be clear and follow conventional commit format
- If the task is blocked or cannot be completed, mark it as `[!]` and document why
