---
description: Creates a token-optimized TODO.md exemplifying DDD, TDD, BDD, and deep modules principles
---

# Create TODO.md Workflow

Creates a comprehensive TODO.md at repository root that exemplifies Domain-Driven Design, Test-Driven Development, Behavior-Driven Development, and deep modules patterns.

## Steps

1. **Analyze Repository Structure**
   - Examine existing codebase structure
   - Identify key domains, bounded contexts, and modules
   - Review existing documentation (AGENTS.md, README.md)
   - Map out architectural patterns currently in use

2. **Design Task Structure**
   - Identify high-level domains requiring tasks
   - Break domains into small, focused parent tasks
   - Ensure each parent task is atomic and completable
   - Design subtasks that decompose parent tasks into actionable steps

3. **Apply DDD Principles**
   - Use ubiquitous language from domain in task descriptions
   - Group tasks by bounded context/domain
   - Focus on domain logic and business value
   - Ensure tasks reflect domain boundaries

4. **Apply TDD Principles**
   - Include test-related subtasks for each feature
   - Prioritize test coverage in definition of done
   - Include refactoring tasks as needed
   - Ensure testability is considered in design

5. **Apply BDD Principles**
   - Frame tasks from user perspective
   - Use given-when-then structure in descriptions
   - Focus on behavior and outcomes
   - Include acceptance criteria in definition of done

6. **Apply Deep Modules Principles**
   - Group related functionality into cohesive modules
   - Design tasks that create simple interfaces
   - Hide implementation details within modules
   - Ensure tasks promote module cohesion

7. **Draft TODO.md Content**
   - Create parent tasks with structure:
     - [ ] TASK-XXX: Title
     - Status: Pending/In Progress/Blocked
     - Related: file paths
     - DoD: acceptance criteria
     - Out of scope: exclusions
     - Rules: conventions to follow
     - Pattern: advanced patterns to apply
     - Anti-patterns: what to avoid
     - Imports/exports: module boundaries
     - Depends on/blocks: task relationships
   - Create subtasks with:
     - TASK-XXX-001: Description with file path
     - Clear, unambiguous action items
     - Targeted file locations

8. **Optimize for Tokens**
   - Remove all emojis
   - Use concise language without losing clarity
   - Compress descriptions while maintaining quality
   - Use abbreviations consistently where clear

9. **Validate Task Quality**
   - Verify each parent task is small and focused
   - Ensure subtasks are actionable and unambiguous
   - Check that all sections are complete
   - Validate task dependencies are accurate

10. **Write TODO.md**
    - Create TODO.md at repository root
    - Write all parent tasks with full sections
    - Write all subtasks with complete descriptions
    - Ensure consistent formatting throughout

11. **Review Against Principles**
    - Verify DDD: domain language and boundaries
    - Verify TDD: test coverage and quality
    - Verify BDD: user-focused behavior
    - Verify deep modules: cohesive design

## Notes

- Focus on quality over quantity - better to have fewer well-designed tasks
- Each parent task should be completable in a focused session
- Subtasks should be granular enough to be actionable without ambiguity
- Token optimization means concise but complete descriptions
- The TODO.md should serve as both planning and documentation
