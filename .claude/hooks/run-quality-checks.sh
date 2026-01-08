#!/bin/bash
# Runs quality checks to ensure code is ready to commit

set -e

PROJECT_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$PROJECT_ROOT"

echo "Running quality checks..."

# Check if package.json exists (Node/JS project)
if [ -f "package.json" ]; then
  # Typecheck
  if grep -q '"typecheck"' package.json 2>/dev/null; then
    echo "→ Running typecheck..."
    npm run typecheck || (echo "❌ Typecheck failed" && exit 1)
  fi

  # Tests
  if grep -q '"test"' package.json 2>/dev/null; then
    echo "→ Running tests..."
    npm test || (echo "❌ Tests failed" && exit 1)
  fi

  # Lint
  if grep -q '"lint"' package.json 2>/dev/null; then
    echo "→ Running lint..."
    npm run lint || (echo "❌ Lint failed" && exit 1)
  fi
fi

# Check for Python projects
if [ -f "pyproject.toml" ] || [ -f "setup.py" ]; then
  # Mypy type checking
  if command -v mypy &> /dev/null; then
    echo "→ Running mypy..."
    mypy . || (echo "❌ Type checking failed" && exit 1)
  fi

  # Pytest
  if command -v pytest &> /dev/null; then
    echo "→ Running pytest..."
    pytest || (echo "❌ Tests failed" && exit 1)
  fi
fi

echo "✓ All quality checks passed"
