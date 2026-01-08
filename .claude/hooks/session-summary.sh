#!/bin/bash
# Creates a summary when Ralph session completes

PROJECT_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
PRD_FILE="$PROJECT_ROOT/prd.json"

if [ ! -f "$PRD_FILE" ]; then
  exit 0
fi

echo ""
echo "═══════════════════════════════════════════════════════"
echo "  Ralph Session Summary"
echo "═══════════════════════════════════════════════════════"
echo ""

# Count completed stories
TOTAL=$(jq '.userStories | length' "$PRD_FILE" 2>/dev/null || echo "0")
COMPLETE=$(jq '[.userStories[] | select(.passes == true)] | length' "$PRD_FILE" 2>/dev/null || echo "0")

echo "Stories completed: $COMPLETE / $TOTAL"
echo ""

# Show pending stories
PENDING=$(jq -r '.userStories[] | select(.passes == false) | "  - [\(.id)] \(.title)"' "$PRD_FILE" 2>/dev/null)

if [ -n "$PENDING" ]; then
  echo "Pending stories:"
  echo "$PENDING"
else
  echo "🎉 All stories complete!"
fi

echo ""
echo "═══════════════════════════════════════════════════════"
