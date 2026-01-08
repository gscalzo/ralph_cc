# Ralph Technical Guide

This is the complete technical guide for Ralph, an autonomous AI agent system for Claude Code.

## Architecture

### Core Components

Ralph consists of three main components:

1. **Skills** (`~/.claude/agents/`)
   - `prd.md` - PRD generation
   - `ralph-converter.md` - PRD to JSON conversion
   - `ralph-run.md` - Autonomous execution engine

2. **Hooks** (`.claude/hooks/`)
   - `validate-prd-json.js` - Data integrity validation
   - `check-commit-format.js` - Commit message validation
   - `run-quality-checks.sh` - Quality gate enforcement
   - `session-summary.sh` - Session reporting

3. **Configuration** (`.claude/settings.json`)
   - Hook bindings
   - Permission settings
   - Tool access controls

### Execution Flow

```
User runs /ralph-run
  ↓
Read prd.json + progress.txt
  ↓
Checkout/create git branch
  ↓
┌─────────────────────────────────┐
│  AUTONOMOUS LOOP                │
│  ↓                              │
│  Select next story (passes=false)│
│  ↓                              │
│  Implement story                │
│  ↓                              │
│  Run quality checks             │
│  ↓                              │
│  Update subdirectory CLAUDE.md  │
│  ↓                              │
│  Commit changes                 │
│  ↓                              │
│  Update prd.json                │
│  ↓                              │
│  Append to progress.txt         │
│  ↓                              │
│  All stories complete?          │
│  ├─ NO → Continue loop          │
│  └─ YES → Output COMPLETE       │
└─────────────────────────────────┘
  ↓
<promise>COMPLETE</promise>
```

## Memory System

Ralph maintains state across iterations through three mechanisms:

### 1. Git History
- One commit per story
- Commit format: `feat: [US-XXX] - Title`
- Contains all code changes
- Queryable with `git log`

### 2. progress.txt
**Structure:**
```markdown
# Ralph Progress Log
Started: [timestamp]
---

## Codebase Patterns
[Consolidated learnings that apply to entire codebase]
---

## [timestamp] - [Story ID]
[Story-specific learnings]
---
```

**Purpose:**
- "Codebase Patterns" section read before each story
- Story logs provide historical context
- Prevents repeating mistakes

### 3. prd.json
**Structure:**
```json
{
  "project": "string",
  "branchName": "ralph/feature-name",
  "description": "string",
  "userStories": [
    {
      "id": "US-001",
      "title": "string",
      "description": "As a [user], I want [feature] so that [benefit]",
      "acceptanceCriteria": ["criterion 1", "criterion 2"],
      "priority": 1,
      "passes": false,
      "notes": ""
    }
  ]
}
```

**Purpose:**
- Task list (which stories are done)
- Selection algorithm uses `priority` and `passes`
- Validated by hooks to prevent corruption

## Skills Deep Dive

### /prd Skill

**Model:** opus (better planning)
**Purpose:** Generate structured PRDs from natural language

**Process:**
1. Ask 3-5 clarifying questions with lettered options
2. Wait for user answers (e.g., "1A, 2B, 3C")
3. Generate markdown PRD with sections:
   - Introduction
   - Goals
   - User Stories
   - Functional Requirements
   - Non-Goals
   - Design Considerations
   - Technical Considerations
   - Success Metrics
   - Open Questions
4. Save to `tasks/prd-[feature-name].md`

**Output Format:**
```markdown
# PRD: [Feature Name]

## Introduction
[Brief description]

## Goals
- Goal 1
- Goal 2

## User Stories

### US-001: [Title]
**Description:** As a [user], I want [feature] so that [benefit].

**Acceptance Criteria:**
- [ ] Criterion 1
- [ ] Typecheck passes
- [ ] Verify in browser (UI stories only)

...
```

### /ralph-converter Skill

**Model:** opus (better structured conversion)
**Purpose:** Convert markdown PRDs to prd.json format

**Conversion Rules:**
1. Each user story becomes one JSON entry
2. IDs are sequential (US-001, US-002, etc.)
3. Priority based on dependency order
4. All stories start with `passes: false`
5. branchName derived from feature name (kebab-case, prefixed with `ralph/`)
6. "Typecheck passes" added to every story
7. "Verify in browser" added to UI stories

**Story Sizing:**
- Must be completable in one iteration
- Right-sized: "Add database column", "Create UI component"
- Too big: "Build entire dashboard", "Add authentication"
- Rule of thumb: If you can't describe it in 2-3 sentences, it's too big

**Dependency Ordering:**
1. Database schema
2. Backend logic
3. UI components
4. Aggregation/dashboards

### /ralph-run Skill

**Model:** sonnet (optimized for implementation)
**Purpose:** Autonomous execution engine

**Core Instructions:**

```markdown
## Critical: Autonomous Continuation

After completing each story, **DO NOT WAIT** for user input. Immediately:
1. Check if all stories have passes: true
2. If not complete, say "Starting next story: [Story ID]" and begin
3. If complete, output `<promise>COMPLETE</promise>`
```

**Story Selection Algorithm:**
```bash
jq -r '.userStories |
  map(select(.passes == false)) |
  sort_by(.priority) |
  .[0]' prd.json
```

**Quality Gates:**
- Typecheck (required for all stories)
- Tests (if project has them)
- Lint (if project defines it)
- Browser verification (if acceptance criteria includes it)

**Commit Format:**
```bash
feat: [US-001] - Add priority field to database

- Added priority enum column
- Set default priority to 'medium'
- Updated TypeScript types

🤖 Generated with Claude Code
Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
```

**Update Logic:**
```bash
# Set story as complete
jq '.userStories |= map(
  if .id == "US-001" then
    .passes = true
  else .
  end
)' prd.json > prd.json.tmp && mv prd.json.tmp prd.json
```

**Progress Logging:**
```markdown
## [timestamp] - [Story ID]
Context: [Brief context]

- What was implemented:
  - [Change 1]
  - [Change 2]

- Files changed:
  - `path/to/file.ts`

- **Learnings for future iterations:**
  - [Pattern discovered]
  - [Gotcha encountered]
---
```

## Hooks Deep Dive

### validate-prd-json.js

**Trigger:** PostToolUse on Write
**Blocking:** Yes (prevents invalid writes)

**Validation Checks:**
- Top-level fields exist: `project`, `branchName`, `userStories`
- `userStories` is an array
- Each story has: `id`, `title`, `description`, `acceptanceCriteria`, `passes`, `priority`
- `acceptanceCriteria` is non-empty array
- `passes` is boolean
- `priority` is number

**Environment Variables:**
- `CLAUDE_TOOL_FILE_PATH` - path to file being written

**Exit Codes:**
- 0: Validation passed
- 1: Validation failed (blocks write)

### check-commit-format.js

**Trigger:** PostToolUse on Bash
**Blocking:** No (warning only)

**Expected Format:**
```
feat: [US-XXX] - Title
```

**Validation:**
```javascript
const regex = /^feat: \[US-\d+\] - .+$/;
```

**Behavior:**
- Checks last commit message via `git log -1 --pretty=%B`
- Warns if format doesn't match
- Does not prevent commit

### run-quality-checks.sh

**Trigger:** PreToolUse on Bash (prompt-based)
**Blocking:** No (reminder only)

**Detection Logic:**
```bash
# Node.js projects
if [ -f "package.json" ]; then
  grep -q '"typecheck"' package.json && npm run typecheck
  grep -q '"test"' package.json && npm test
  grep -q '"lint"' package.json && npm run lint
fi

# Python projects
if [ -f "pyproject.toml" ] || [ -f "setup.py" ]; then
  command -v mypy && mypy .
  command -v pytest && pytest
fi
```

**Customization:**
Add project-specific checks by editing the script:
```bash
# Rust
if [ -f "Cargo.toml" ]; then
  cargo check && cargo test
fi
```

### session-summary.sh

**Trigger:** Stop hook
**Blocking:** No

**Output:**
```
═══════════════════════════════════════════════════════
  Ralph Session Summary
═══════════════════════════════════════════════════════

Stories completed: 3 / 5

Pending stories:
  - [US-004] Filter tasks by priority
  - [US-005] Sort tasks by priority

═══════════════════════════════════════════════════════
```

## Hooks Configuration

### settings.json Structure

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Write",
        "hooks": [{
          "type": "command",
          "command": "node .claude/hooks/validate-prd-json.js",
          "blocking": true
        }]
      },
      {
        "matcher": "Bash",
        "hooks": [{
          "type": "command",
          "command": "node .claude/hooks/check-commit-format.js",
          "blocking": false
        }]
      }
    ],
    "PreToolUse": [{
      "matcher": "Bash",
      "hooks": [{
        "type": "prompt",
        "prompt": "If this bash command is 'git commit', ensure you've run quality checks first (typecheck, tests).",
        "blocking": false
      }]
    }],
    "Stop": [{
      "matcher": ".*",
      "hooks": [{
        "type": "command",
        "command": ".claude/hooks/session-summary.sh"
      }]
    }]
  },
  "permissions": {
    "allow": ["Bash", "Write", "Edit", "Read", "Glob", "Grep", "LSP", "TodoWrite"]
  }
}
```

### Hook Types

**command** - Executes a shell command
- Can be blocking (prevents tool use if exit code ≠ 0)
- Can be non-blocking (runs but doesn't prevent)
- Has access to environment variables set by Claude Code

**prompt** - Injects text into Claude's context
- Non-blocking (always runs)
- Reminds Claude of something before tool execution
- Useful for quality gate reminders

## Context Management

### Context Window
- 200k tokens (Sonnet 4.5)
- Large enough for most stories
- Automatic summarization when approaching limits

### Context Usage Strategy

**Before Each Story:**
```bash
# Read Codebase Patterns (top of progress.txt)
head -50 progress.txt

# Read current PRD
cat prd.json

# Check recent commits
git log --oneline -10
```

**During Implementation:**
- Use LSP for code intelligence
- Use Grep for focused searches
- Avoid reading entire large files

**After Story:**
- Append concise learnings
- Consolidate reusable patterns to top of progress.txt

### Preventing Context Exhaustion

1. **Keep stories small** - One iteration each
2. **Read selectively** - Only Codebase Patterns, not full progress.txt
3. **Use git log summaries** - Not full diffs
4. **Consolidate patterns** - Move learnings to top section

## Archiving System

### Automatic Archiving

Triggered when `branchName` in new prd.json differs from previous run:

```bash
# Archive to: archive/YYYY-MM-DD-feature-name/
DATE=$(date +%Y-%m-%d)
BRANCH=$(jq -r '.branchName' prd.json | sed 's|ralph/||')
ARCHIVE="archive/$DATE-$BRANCH"

mkdir -p "$ARCHIVE"
cp prd.json "$ARCHIVE/"
cp progress.txt "$ARCHIVE/"
```

### Archive Structure

```
archive/
├── 2026-01-08-task-priority/
│   ├── prd.json
│   └── progress.txt
├── 2026-01-09-user-notifications/
│   ├── prd.json
│   └── progress.txt
```

## Hierarchical CLAUDE.md System

### Purpose
Ralph creates or updates CLAUDE.md files in relevant subdirectories to document module-specific patterns. Claude Code automatically loads these files when accessing files in those directories, creating a hierarchical memory system.

**How It Works:**
- **Root CLAUDE.md** - Loaded at conversation start, project-wide configuration
- **Subdirectory CLAUDE.md** - Loaded on-demand when accessing files in that directory
- Example: `src/components/CLAUDE.md` loads when editing `src/components/Button.tsx`

### Update Logic

**After editing files:**
1. Identify directories modified
2. Check for existing CLAUDE.md in those directories (e.g., `src/CLAUDE.md`)
3. Add valuable learnings (not story-specific details)

### Good Subdirectory CLAUDE.md Additions

```markdown
## Database Patterns
- Use Prisma for ORM
- Run `npx prisma migrate dev` after schema changes
- Always add IF NOT EXISTS to migrations

## API Patterns
- All endpoints use zod for validation
- Return types must match schema exactly
- Error handling via errorResponse() helper

## Testing Patterns
- Unit tests require test database
- Run `npm run db:test:reset` before test suite
- Integration tests use real HTTP calls
```

### Bad Subdirectory CLAUDE.md Additions
- "Implemented US-001" (story-specific)
- "Changed priority field" (implementation detail)
- "Fixed bug in line 42" (temporary debugging)
- General project patterns (those belong in root CLAUDE.md)

**Hierarchical Structure:**
```
project/
├── CLAUDE.md                    # Root config (loaded at startup)
├── src/
│   ├── CLAUDE.md                # Loaded when accessing src/ files
│   └── components/
│       └── CLAUDE.md            # Loaded when accessing components/ files
```

**Memory Precedence:**
- Files higher in the hierarchy take precedence
- More specific memories build upon general ones
- Root CLAUDE.md provides foundation, subdirectories add specificity

## Browser Verification

### When Required
Any story with "Verify in browser" in acceptance criteria.

### Process
1. Start dev server if needed:
   ```bash
   npm run dev &
   sleep 5  # Wait for server
   ```

2. Navigate to relevant page
3. Verify UI changes work
4. Document in progress log:
   ```markdown
   - Verified in browser: Priority badges display correctly (red/yellow/gray)
   - Dropdown shows all three options
   - Selection saves immediately
   ```

5. Story not complete until verification passes

## Troubleshooting

### Ralph Stops After Each Story

**Diagnosis:**
- Self-continuation logic not working
- Claude waiting for user input

**Fix:**
1. Check `/ralph-run` skill contains:
   ```markdown
   ## Critical: Autonomous Continuation
   After completing each story, **DO NOT WAIT** for user input.
   ```
2. Verify skill uses `model: sonnet` (not opus)
3. Restart Ralph session

### Hooks Not Firing

**Diagnosis:**
```bash
# Check configuration exists
cat .claude/settings.json

# Check hook permissions
ls -la .claude/hooks/

# Test hook manually
CLAUDE_TOOL_FILE_PATH=prd.json node .claude/hooks/validate-prd-json.js
```

**Fix:**
```bash
# Make executable
chmod +x .claude/hooks/*.sh

# Verify paths in settings.json match actual files
```

### Quality Checks Failing

**Diagnosis:**
```bash
# Check scripts exist
cat package.json | grep -E '"typecheck"|"test"|"lint"'

# Run manually
npm run typecheck
npm test
```

**Fix:**
- Add missing scripts to package.json
- Fix actual errors (don't skip checks)
- Update `.claude/hooks/run-quality-checks.sh` for your stack

### Context Exhaustion

**Symptoms:**
- Ralph slows down
- Responses become less focused
- Implementation quality decreases

**Fix:**
- Split large stories into smaller ones
- Read only "Codebase Patterns" section
- Use git log summaries, not full diffs
- Clear context and restart if needed

### prd.json Corruption

**Prevention:**
- validate-prd-json.js hook (should prevent this)

**Recovery:**
```bash
# Restore from git
git checkout HEAD -- prd.json

# Or from archive
cp archive/2026-01-08-feature/prd.json .
```

## Performance Optimization

### Story Sizing
- **Optimal:** 50-200 lines of code per story
- **Too small:** Overhead dominates (many commits for trivial changes)
- **Too large:** Context exhaustion, quality degrades

### Context Usage
```bash
# Good (focused)
head -50 progress.txt  # Just patterns
git log --oneline -10  # Recent commits only
jq '.userStories[0]' prd.json  # Current story only

# Bad (context hungry)
cat progress.txt  # Entire log
git log -p  # Full diffs
jq '.' prd.json  # All stories with details
```

### Quality Check Speed
```bash
# Optimize typecheck
npm run typecheck -- --incremental

# Run only relevant tests
npm test -- --testPathPattern=priority

# Skip slow checks during development
# (but never skip before commit!)
```

## Advanced Patterns

### Multi-Phase Features

For very large features, split into multiple PRDs:

**Phase 1:** `prd-notifications-schema.md`
```markdown
US-001: Add notifications table
US-002: Add notification model
US-003: Add indexes
```

**Phase 2:** `prd-notifications-api.md`
```markdown
US-001: Create notification endpoint
US-002: Add list endpoint
US-003: Add mark-as-read endpoint
```

**Phase 3:** `prd-notifications-ui.md`
```markdown
US-001: Add notification bell icon
US-002: Create dropdown panel
US-003: Add unread count badge
```

### Parallel Workflows

Run multiple Ralph instances in separate branches:
```bash
# Terminal 1
cd project && git checkout -b ralph/feature-a
# Run /ralph-run with prd-feature-a.json

# Terminal 2
cd project && git checkout -b ralph/feature-b
# Run /ralph-run with prd-feature-b.json
```

**Note:** Ensure features don't conflict (different files/areas)

### Custom Acceptance Criteria

Beyond standard checks, add project-specific criteria:

```json
{
  "acceptanceCriteria": [
    "Add priority field",
    "Migration runs successfully",
    "Typecheck passes",
    "Screenshot added to docs/screenshots/",
    "Performance test shows <100ms query time"
  ]
}
```

Ralph will attempt to satisfy all criteria before marking complete.

## Security Considerations

### Hook Execution
- Hooks run arbitrary shell commands
- Validate hook scripts before using
- Don't install untrusted hooks

### Permission Model
```json
{
  "permissions": {
    "allow": ["Bash", "Write", "Edit", "Read", "Glob", "Grep", "LSP"]
  }
}
```

- Grants Ralph access to specific tools
- Does not grant access to other Claude Code features
- Review before installation

### Data Handling
- prd.json and progress.txt may contain sensitive info
- Add to .gitignore if needed
- Archive directory may accumulate sensitive data

## Metrics & Analytics

### Track Session Performance

Add to `.claude/hooks/session-summary.sh`:
```bash
#!/bin/bash
START_TIME=$(head -2 progress.txt | tail -1 | grep -oP '\d{4}-\d{2}-\d{2}')
END_TIME=$(date +%Y-%m-%d)

TOTAL=$(jq '.userStories | length' prd.json)
COMPLETE=$(jq '[.userStories[] | select(.passes == true)] | length' prd.json)

COMMIT_COUNT=$(git log --since="$START_TIME" --oneline | wc -l)

echo "Session Statistics:"
echo "  Duration: $START_TIME to $END_TIME"
echo "  Stories: $COMPLETE / $TOTAL"
echo "  Commits: $COMMIT_COUNT"
echo "  Avg commits per story: $((COMMIT_COUNT / COMPLETE))"
```

### Quality Metrics

Track quality over time:
```bash
# Typecheck success rate
# Test pass rate
# Average lines changed per story
# Context usage per story
```

## References

- [Claude Code Documentation](https://claude.com/claude-code/docs)
- [Geoffrey Huntley's Ralph](https://ghuntley.com/ralph/)
