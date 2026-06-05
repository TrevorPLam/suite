---
trigger: always_on
---

# Markdown Fence Avoidance Rule

Prevent code fence collisions between file content and response formatting.

<!-- SECTION: Problem -->

## Problem

Triple-backtick fences in Markdown files collide with AI response formatting, corrupting edits.

<!-- ENDSECTION: Problem -->

<!-- SECTION: Solutions -->

## Solutions

### 1. Use Alternative Fences in Responses

When file uses backticks (```), use tildes (~~~) in your response fences:

````markdown
<!-- File content uses backticks -->

```typescript
const x = 1;
```
````

<!-- Your response uses tildes -->

```typescript
const y = 2;
```

````

### 2. Output Raw Content When Instructed

If user says: *"Output raw, corrected content directly"*

- Do NOT wrap in Markdown code blocks
- Output the corrected text directly
- This prevents fence nesting entirely

### 3. Use Boundary Markers

For complex edits, precede with explicit markers:

```markdown
<!-- REPLACE_START: section-name -->

[corrected content here]

<!-- REPLACE_END: section-name -->
````

### 4. Indentation for Code Blocks

When appropriate, use indented code blocks (4 spaces) instead of fenced:

    This is an indented code block
    It avoids fence collisions entirely

<!-- ENDSECTION: Solutions -->

<!-- SECTION: Response Format Decision Tree -->

## Response Format Decision Tree

1. Does the file contain backtick fences?
   → Use tildes (~~~) in your response

2. Did user request "raw output"?
   → No fences, direct text output

3. Is this a complex multi-part edit?
   → Use HTML comment markers as boundaries

<!-- ENDSECTION: Response Format Decision Tree -->

<!-- SECTION: Anti-Patterns -->

## Anti-Patterns

❌ Nesting backticks inside backticks
❌ Using ```suggestion blocks that collide with file content
❌ Forgetting to escape or alternate fence characters

<!-- ENDSECTION: Anti-Patterns -->
