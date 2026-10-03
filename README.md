# Ralph

![Ralph](ralph.webp)

Ralph is an autonomous AI agent system for Claude Code that implements PRD items continuously until complete. Memory persists via git history, `progress.txt`, and `prd.json`.

Based on [Geoffrey Huntley's Ralph pattern](https://ghuntley.com/ralph/).

[Read the in-depth article on Ralph](https://x.com/ryancarson/status/2008548371712135632)

## What is Ralph?

Ralph solves the context window problem for large features by breaking work into small user stories and running autonomously until all stories are complete. Each story is implemented, tested, committed, and verified before moving to the next one—all without manual intervention.

**Key Features:**
- 🤖 **Autonomous execution** - Runs continuously until all PRD items complete
- ✅ **Quality gates** - Enforces typecheck, tests, and browser verification
- 🔒 **Validation hooks** - Prevents corrupted task lists and ensures commit format
- 📝 **Learning system** - Captures patterns in progress.txt and hierarchical AGENTS.md files
- 🎯 **Small, focused stories** - Each completable in one iteration

## Prerequisites

- [Claude Code CLI](https://claude.com/claude-code) installed and authenticated
- `jq` installed (`brew install jq` on macOS)
- Node.js installed (for hook scripts)
- A git repository for your project

## Installation

### 1. Install Skills Globally

Copy the Ralph skills to your global Claude Code agents directory:

```bash
# From the ralph_cc repository root
cp skills/prd.md ~/.claude/agents/
cp skills/ralph-converter.md ~/.claude/agents/
cp skills/ralph-run.md ~/.claude/agents/
```

**Note:** Skills are global to Claude Code and work across all your projects.

Verify installation:
```bash
ls ~/.claude/agents/
# Should see: prd.md, ralph-converter.md, ralph-run.md
```

### 2. Set Up Your Project

Copy the hooks configuration to your project:

```bash
# From your project root (where you want to use Ralph)
# Replace <ralph-repo-path> with the path to your cloned ralph_cc repository
cp -r <ralph-repo-path>/.claude/ .
```

This copies:
- `.claude/settings.json` - Hooks configuration
- `.claude/hooks/` - Hook scripts (validation, quality checks, summary)

Make scripts executable:
```bash
chmod +x .claude/hooks/*.sh
```

## Workflow

### Step 1: Create a PRD

Start Claude Code and use the `@prd` agent:

```bash
claude
```

Then type:
```
@prd create a task priority system with high/medium/low levels, visual indicators, and filtering
```

The agent will:
1. Ask clarifying questions (answer with "1A, 2B, 3C")
2. Generate a structured PRD
3. Save to `tasks/prd-[feature-name].md`

### Step 2: Convert PRD to prd.json

Use the `@ralph-converter` agent:

```
@ralph-converter convert tasks/prd-task-priority.md to prd.json
```

This creates `prd.json` with:
- User stories broken into small chunks
- Acceptance criteria for each story
- Priority ordering (dependencies first)
- All stories marked `passes: false`

### Step 3: Run Ralph

Use the `@ralph-run` agent to start autonomous execution:

```
@ralph-run
```

Ralph will now run autonomously:

1. ✅ Read prd.json and progress.txt
2. ✅ Pick highest priority story where `passes: false`
3. ✅ Implement that story
4. ✅ Run quality checks (typecheck, tests)
5. ✅ Update subdirectory AGENTS.md files with discoveries
6. ✅ Commit: `feat: [Story ID] - [Story Title]`
7. ✅ Update prd.json (`passes: true`)
8. ✅ Append to progress.txt
9. ✅ **Automatically continue to next story**
10. ✅ Repeat until `<promise>COMPLETE</promise>`

**No manual intervention needed** - Ralph runs until all stories complete or an error occurs.

## Project Structure

```
your-project/
├── .claude/
│   ├── settings.json          # Hooks configuration
│   └── hooks/                 # Hook scripts
│       ├── validate-prd-json.js
│       ├── check-commit-format.js
│       ├── run-quality-checks.sh
│       └── session-summary.sh
├── tasks/
│   └── prd-feature-name.md    # Generated PRDs
├── prd.json                   # Current task list
├── progress.txt               # Learnings log
├── archive/                   # Previous runs
│   └── 2026-01-08-feature-name/
│       ├── prd.json
│       └── progress.txt
├── AGENTS.md                  # Root configuration (auto-read by Claude Code)
└── src/                       # Your code
    ├── AGENTS.md              # Subdirectory patterns (auto-loaded on access)
    └── components/
        └── AGENTS.md          # Component-specific patterns (auto-loaded)
```

## Key Files

| File | Purpose |
|------|---------|
| `prd.json` | User stories with `passes` status (the task list) |
| `prd.json.example` | Example PRD format for reference |
| `progress.txt` | Append-only learnings for future iterations |
| `.claude/settings.json` | Hooks configuration |
| `.claude/hooks/` | Validation and quality check scripts |

## Critical Concepts

### Autonomous Execution

Unlike manual workflows, Ralph uses **self-continuation**:

- After completing a story, Ralph immediately starts the next one
- No user input needed between stories
- Continues until all stories have `passes: true`
- Outputs `<promise>COMPLETE</promise>` when done

This is achieved through explicit instructions in the `@ralph-run` agent.

### Small Tasks

Each PRD item should be small enough to complete in one iteration:

**Right-sized stories:**
- Add a database column and migration
- Add a UI component to an existing page
- Update a server action with new logic
- Add a filter dropdown to a list

**Too big (split these):**
- "Build the entire dashboard"
- "Add authentication"
- "Refactor the API"

### Hooks System

Ralph uses Claude Code hooks for deterministic control:

**Validation Hook (blocking):**
- Runs after any Write to prd.json
- Validates structure and required fields
- Prevents corrupted task lists

**Commit Format Hook (warning):**
- Runs after git commit
- Checks format: `feat: [US-XXX] - Title`
- Warns if incorrect

**Quality Check Reminder (prompt):**
- Reminds to run checks before commits
- Detects project type (Node.js, Python, etc.)
- Runs typecheck, tests, lint

**Session Summary Hook:**
- Runs when Ralph stops
- Shows completed/pending story counts

### Hierarchical AGENTS.md Files

Ralph creates or updates `AGENTS.md` files in relevant subdirectories with module-specific learnings. Claude Code automatically loads these files when accessing files in those directories.

**Hierarchical Memory System:**
- `AGENTS.md` (root) - Project-wide configuration, loaded at startup
- `src/AGENTS.md` - Loaded when accessing files in src/
- `src/components/AGENTS.md` - Loaded when accessing components/

**Examples of what to add to subdirectory AGENTS.md:**
- "This module uses pattern Z for all API calls"
- "When modifying X, also update Y to keep them in sync"
- "Components in this directory use the observer pattern"
- "Tests require environment variable FOO set"

**Do NOT add:**
- General project-wide patterns (those go in root AGENTS.md)
- Story-specific details
- Temporary debugging notes

### Feedback Loops

Ralph only works if there are feedback loops:
- Typecheck catches type errors
- Tests verify behavior
- CI must stay green (broken code compounds across iterations)

### Browser Verification for UI Stories

Frontend stories must include "Verify in browser" in acceptance criteria. Ralph will verify UI changes work correctly before marking the story complete.

### Stop Condition

When all stories have `passes: true`, Ralph outputs `<promise>COMPLETE</promise>` and the loop exits.

## Progress Tracking

### progress.txt Format

```markdown
# Ralph Progress Log
Started: 2026-01-08

---

## Codebase Patterns
- This project uses Prisma for ORM
- Run `npx prisma migrate dev` after schema changes
- Export types from actions.ts for UI components

---

## 2026-01-08 14:32 - US-001
Context: Added priority field to task database schema

- What was implemented:
  - Created migration adding priority column
  - Updated Task model with priority field

- Files changed:
  - `prisma/schema.prisma`
  - `src/types/task.ts`

- **Learnings for future iterations:**
  - Migrations require `npx prisma migrate dev`
  - Always update TypeScript types after schema changes

---
```

### prd.json Format

See [prd.json.example](prd.json.example) for the complete structure.

## Monitoring Progress

Check current state:

```bash
# See which stories are done
jq '.userStories[] | {id, title, passes}' prd.json

# Count progress
jq '[.userStories[] | select(.passes == true)] | length' prd.json

# See learnings from previous iterations
cat progress.txt

# Check git history
git log --oneline -10
```

## Archiving

Ralph automatically archives previous runs when you start a new feature (different `branchName`). Archives are saved to `archive/YYYY-MM-DD-feature-name/`.

## Troubleshooting

### Ralph Stops After Each Story

**Problem:** Claude waits for input instead of continuing

**Solution:**
- Check `@ralph-run` agent has self-continuation instructions
- Agent should say "IMMEDIATELY continue to next story"
- Restart Ralph session

### Hooks Not Firing

**Problem:** Validation hooks don't run

**Solution:**
```bash
# Check settings.json exists
cat .claude/settings.json

# Make scripts executable
chmod +x .claude/hooks/*.sh

# Test hook manually
node .claude/hooks/validate-prd-json.js prd.json
```

### Quality Checks Failing

**Problem:** Typecheck or tests fail repeatedly

**Solution:**
```bash
# Check your project defines the scripts
cat package.json | grep -E '"typecheck"|"test"|"lint"'

# Run manually to see errors
npm run typecheck
npm test

# Update quality checks script for your project
vim .claude/hooks/run-quality-checks.sh
```

### Context Exhaustion

**Problem:** Ralph runs out of context on large codebases

**Solution:**
- Keep user stories small (one iteration each)
- Use "Codebase Patterns" section (read only this, not full progress.txt)
- Split large stories into smaller ones

## Advanced Usage

### Custom Quality Checks

Edit `.claude/hooks/run-quality-checks.sh` for project-specific checks:

```bash
# Add Rust checks
if [ -f "Cargo.toml" ]; then
  cargo check && cargo test
fi

# Add Go checks
if [ -f "go.mod" ]; then
  go test ./...
fi
```

### Project-Specific Skills

Create project-level skill overrides:

```bash
mkdir -p .claude/agents
cp ~/.claude/agents/ralph-run.md .claude/agents/ralph-run-custom.md
# Edit for project-specific instructions
```

## Tips for Success

### 1. Write Small Stories

- ✅ "Add status column to tasks table"
- ✅ "Create status badge component"
- ❌ "Build entire task management system"

### 2. Order Dependencies Correctly

1. Database schema
2. Backend logic
3. UI components
4. Aggregation/dashboards

### 3. Write Verifiable Acceptance Criteria

- ✅ "Dropdown has options: All, High, Medium, Low"
- ✅ "Clicking delete shows confirmation dialog"
- ❌ "Works correctly"
- ❌ "Good UX"

### 4. Use Hierarchical Memory

Review Claude Code's hierarchical memory files:
- **AGENTS.md (root)** - Project-wide configuration and patterns
- **progress.txt** - Historical learnings and codebase patterns
- **Subdirectory AGENTS.md** - Module-specific conventions (e.g., `src/AGENTS.md`)

## Documentation

For complete technical documentation, see [TECHNICAL-GUIDE.md](TECHNICAL-GUIDE.md).

## Resources

- [Claude Code Documentation](https://claude.com/claude-code/docs)
- [Geoffrey Huntley's Ralph Pattern](https://ghuntley.com/ralph/)

## References

- [Geoffrey Huntley's Ralph article](https://ghuntley.com/ralph/)
- [Original Ralph article](https://x.com/ryancarson/status/2008548371712135632)
