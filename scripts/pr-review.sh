#!/usr/bin/env bash
# Ambient post-review for pull requests. Produces one advisory verdict.
# Never blocks merges; complements the test suite with judgment signals
# a senior reviewer would look for line by line.
set -uo pipefail

if ! git rev-parse --verify origin/main >/dev/null 2>&1; then
  git fetch origin main --quiet || true
fi

DIFF="$(git diff origin/main...HEAD -- .)"
FILES="$(git diff --name-only origin/main...HEAD -- .)"
ADDED_TESTS=$(echo "$FILES" | grep -E '\.(test|spec)\.(ts|tsx|js)$' | wc -l | tr -d ' ')
REMOVED_TESTS=$(( git diff --name-status origin/main...HEAD -- . | awk '$1=="D"{print $2}' | grep -E '\.(test|spec)\.(ts|tsx|js)$' || true ) | wc -l | tr -d ' ')
ADDED_SRC=$(echo "$FILES" | grep -E '\.(ts|tsx|js)$' | grep -vE '\.(test|spec)\.' | wc -l | tr -d ' ')

if [ -z "${DIFF//[[:space:]]/}" ]; then
  echo "## PR Review: no changes vs main." > /tmp/pr-review.md
  exit 0
fi

BLOCK=()
WARN=()
OK=()

# 1) Hardcoded credential patterns. None should ever appear in a diff.
if echo "$DIFF" | grep -Eio '(ghp_[A-Za-z0-9_]{10,}|sk-[A-Za-z0-9]{16,}|xox[baprs]-[A-Za-z0-9-]{10,}|AKIA[0-9A-Z]{16}|sk_live_[A-Za-z0-9_]{8,}|-----BEGIN (RSA|EC|OPENSSH) PRIVATE KEY-----)' >/dev/null 2>&1; then
  BLOCK+=("Hard-coded credential in diff. Remove, rotate, and commit again.")
else
  OK+=("No hard-coded credentials in diff.")
fi

# 2) TODO/FIXME/HACK introduced without an issue number.
NEW_TODOS=$(echo "$DIFF" | grep -E '^\+' | grep -E '\b(TODO|FIXME|HACK|XXX)\b' | grep -vE '\b(TODO|FIXME|HACK|XXX): *[A-Za-z]{2,}-?[0-9]+' || true)
if [ -n "$NEW_TODOS" ]; then
  WARN+=("Bare TODO/FIXME/HACK added. Track it with an issue number or delete it.")
else
  OK+=("No naked TODO/FIXME/HACK added.")
fi

# 3) Test coverage shape. Source cares about tests.
if [ "$ADDED_SRC" -gt 0 ] && [ "$ADDED_TESTS" -eq 0 ] && [ "$REMOVED_TESTS" -eq 0 ]; then
  WARN+=("Source changed but no tests were added or updated.")
elif [ "$ADDED_TESTS" -gt 0 ]; then
  OK+=("Tests in scope: $ADDED_TESTS file(s).")
else
  OK+=("No source changes requiring tests.")
fi

# 4) Raw console output in non-test source.
if echo "$DIFF" | grep -E '^\+[^/].*\bconsole\.(log|warn|error|debug|info)\(' | grep -vE '\.(test|spec)\.(ts|tsx)' >/dev/null 2>&1; then
  WARN+=("A console.*() term was added to source. Drop it unless it's deliberate.")
else
  OK+=("No console.*() added to source.")
fi

# 5) .env files with suspiciously long values (not placeholders).
ENV_FILES="$(echo "$FILES" | grep -E '^\.env' || true)"
if [ -n "$ENV_FILES" ]; then
  if echo "$DIFF" | grep -E '^\+.*=.{30,}' | grep -viE '(example|sample|placeholder|change_me|fake)' >/dev/null 2>&1; then
    WARN+=("`.env` file with a long value added. Keep `.env` out of the repo; use `.env.example`.")
  fi
fi

# 6) A file grew past 300 lines.
for f in $FILES; do
  if [[ "$f" =~ \.(ts|tsx|js|jsx)$ ]] && [ -f "$f" ]; then
    if [ "$(wc -l < "$f" 2>/dev/null || echo 0)" -gt 300 ]; then
      WARN+=("$f is over 300 lines. A refactor might earn it its keep.")
    fi
  fi
done

{
  echo "## PR Review"
  echo ""
  for o in "${OK[@]}"; do echo "- ✅ $o"; done
  for m in "${WARN[@]}"; do echo "- ⚠️ $m"; done
  for b in "${BLOCK[@]}"; do echo "- 🔴 $b"; done
  if [ "${#BLOCK[@]}" -gt 0 ]; then
    echo ""
    echo "> Hard blockers must be addressed before merging."
  elif [ "${#WARN[@]}" -gt 0 ]; then
    echo ""
    echo "> Worth a look before merge, not blocking."
  else
    echo ""
    echo "> Nothing the reviewer would flag. Ship it 🚀"
  fi
  echo ""
  echo "_Automated review — informational only, not a gate._"
} > /tmp/pr-review.md

cat /tmp/pr-review.md
