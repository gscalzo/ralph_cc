# Ralph Configuration for Claude Code

> **Note:** This CLAUDE.md file is automatically read by Claude Code at the start of every conversation. It provides essential context about the Ralph autonomous agent system.

## Overview

Ralph is an autonomous AI agent system for Claude Code that implements PRD items continuously until complete. Memory persists via git history, `progress.txt`, and `prd.json`.

## Quick Start

```bash
# 1. Install skills globally
cp ~/.claude/agents/prd.md ~/.claude/agents/
cp ~/.claude/agents/ralph-converter.md ~/.claude/agents/
cp ~/.claude/agents/ralph-run.md ~/.claude/agents/

# 2. In your project, copy hooks
cp -r .claude/ /path/to/your/project/

# 3. Use the skills
claude
/prd create your feature
/ralph-converter convert tasks/prd-feature.md
/ralph-run
```

## Commands

```bash
# Run the flowchart dev server
cd flowchart && npm run dev

# Build the flowchart
cd flowchart && npm run build

# Check Ralph progress
jq '.userStories[] | {id, title, passes}' prd.json

# View learnings
cat progress.txt
```

## Key Files

- `~/.claude/agents/prd.md` - PRD generation skill
- `~/.claude/agents/ralph-converter.md` - PRD to JSON converter
- `~/.claude/agents/ralph-run.md` - Autonomous execution engine
- `.claude/settings.json` - Hooks configuration
- `.claude/hooks/` - Validation and quality check scripts
- `prd.json` - Current task list (user stories with passes status)
- `progress.txt` - Learnings log with Codebase Patterns section
- `flowchart/` - Interactive React Flow diagram

## Flowchart

The `flowchart/` directory contains an interactive visualization built with React Flow. It's designed for presentations - click through to reveal each step with animations.

**[View Live Demo](https://snarktank.github.io/ralph/)**

To run locally:
```bash
cd flowchart
npm install
npm run dev
```

## Core Patterns

### Autonomous Execution
- Ralph runs continuously without manual intervention
- After completing each story, immediately starts the next one
- Stops when all stories have `passes: true` or error occurs
- Outputs `<promise>COMPLETE</promise>` when done

### Memory System
1. **Git History** - One commit per story with format: `feat: [US-XXX] - Title`
2. **progress.txt** - Append-only log with "Codebase Patterns" section at top
3. **prd.json** - Task list tracking which stories are complete

### Story Sizing
- Each story must be completable in one iteration
- Right-sized: "Add database column", "Create UI component"
- Too big: "Build entire dashboard", "Add authentication"
- Rule: If you can't describe it in 2-3 sentences, it's too big

### Quality Gates
- Typecheck required for all stories
- Tests run if project defines them
- Browser verification for UI stories
- Subdirectory CLAUDE.md files updated with discovered patterns
- Hooks enforce validation and commit format

## Hooks System

Ralph uses Claude Code hooks for deterministic control:

### Validation Hook (blocking)
- Runs after Write to prd.json
- Validates structure and required fields
- Prevents corrupted task lists

### Commit Format Hook (warning)
- Runs after git commit
- Checks format: `feat: [US-XXX] - Title`
- Warns if incorrect

### Quality Check Reminder (prompt)
- Reminds to run checks before commits
- Detects project type (Node.js, Python, Rust, Go)
- Runs typecheck, tests, lint

### Session Summary Hook
- Runs when Ralph stops
- Shows completed/pending story counts

## Workflow

1. **Create PRD**: `/prd create your feature`
   - Asks clarifying questions
   - Generates structured markdown PRD
   - Saves to `tasks/prd-[feature-name].md`

2. **Convert to JSON**: `/ralph-converter convert tasks/prd-feature.md`
   - Breaks into small user stories
   - Orders by dependency (schema → backend → UI)
   - Creates `prd.json` with all stories marked `passes: false`

3. **Run Ralph**: `/ralph-run`
   - Reads prd.json and progress.txt
   - Picks highest priority story where `passes: false`
   - Implements story
   - Runs quality checks
   - Commits changes
   - Updates prd.json and progress.txt
   - Automatically continues to next story
   - Repeats until `<promise>COMPLETE</promise>`

## progress.txt Structure

```markdown
# Ralph Progress Log
Started: [timestamp]
---

## Codebase Patterns
[Consolidated learnings - read before each story]
---

## [timestamp] - [Story ID]
Context: [Brief context]

- What was implemented:
  - [Changes made]

- Files changed:
  - `path/to/file.ts`

- **Learnings for future iterations:**
  - [Patterns discovered]
  - [Gotchas encountered]
---
```

## Hierarchical CLAUDE.md System

After editing files, Ralph creates or updates CLAUDE.md files in relevant subdirectories with valuable learnings.

**How It Works:**
- Claude Code automatically loads subdirectory CLAUDE.md files when accessing files in those directories
- Creates a hierarchical memory system: root config + directory-specific patterns
- Example: `src/CLAUDE.md` loads when editing `src/components/Button.tsx`

**When to update subdirectory CLAUDE.md:**

**Good subdirectory CLAUDE.md additions:**
- "When modifying X, also update Y to keep them in sync"
- "This module uses pattern Z for all API calls"
- "Components in this directory use the observer pattern"
- "Tests require environment variable FOO set"

**Don't add to subdirectory CLAUDE.md:**
- General project-wide patterns (those go in root CLAUDE.md)
- Story-specific implementation details
- Temporary debugging notes
- Information already in progress.txt

**File Hierarchy Example:**
```
project/
├── CLAUDE.md              # Root config (this file)
└── src/
    ├── CLAUDE.md          # Source-specific patterns
    └── components/
        └── CLAUDE.md      # Component-specific patterns
```

## Troubleshooting

### Ralph stops after each story
- Check `/ralph-run` skill has self-continuation instructions
- Verify skill uses `model: sonnet` (not opus)
- Restart Ralph session

### Hooks not firing
```bash
cat .claude/settings.json  # Check config exists
chmod +x .claude/hooks/*.sh  # Make executable
node .claude/hooks/validate-prd-json.js prd.json  # Test manually
```

### Quality checks failing
```bash
cat package.json | grep -E '"typecheck"|"test"|"lint"'  # Check scripts exist
npm run typecheck  # Run manually to see errors
npm test
```

## Documentation

- **README.md** - Quick start guide and core concepts
- **TECHNICAL-GUIDE.md** - Complete technical reference with architecture details
- **prd.json.example** - Example PRD format

## References

- [Claude Code Documentation](https://claude.com/claude-code/docs)
- [Geoffrey Huntley's Ralph Pattern](https://ghuntley.com/ralph/)
- [Interactive Flowchart](https://snarktank.github.io/ralph/)
