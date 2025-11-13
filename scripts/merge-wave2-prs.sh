#!/bin/bash
set -e

REPO="safevoice009/Safevoice-cto"
GITHUB_TOKEN="${GITHUB_TOKEN}"
PR_NUMBERS=(118 119 120 121 122 123 124 125 126 127 128 129)

if [ -z "$GITHUB_TOKEN" ]; then
  echo "❌ GITHUB_TOKEN not set. Cannot proceed."
  exit 1
fi

echo "🚀 Starting Wave 2 PR merge automation..."
echo "Repository: $REPO"
echo "PRs to merge: ${PR_NUMBERS[@]}"

MERGED=0
FAILED=0
MERGE_LOG="docs/WAVE2_MERGE_LOG.txt"

# Create log file
{
  echo "Wave 2 PR Merge Log"
  echo "==================="
  echo "Started: $(date)"
  echo ""
} > "$MERGE_LOG"

# Merge each PR
for PR_NUM in "${PR_NUMBERS[@]}"; do
  echo ""
  echo "Processing PR #$PR_NUM..."
  
  # Get PR info
  PR_INFO=$(curl -s -H "Authorization: token $GITHUB_TOKEN" \
    "https://api.github.com/repos/$REPO/pulls/$PR_NUM")
  
  PR_TITLE=$(echo "$PR_INFO" | grep '"title"' | head -1 | cut -d'"' -f4)
  PR_STATE=$(echo "$PR_INFO" | grep '"state"' | head -1 | cut -d'"' -f4)
  
  echo "  Title: $PR_TITLE"
  echo "  State: $PR_STATE"
  
  if [ "$PR_STATE" != "open" ]; then
    echo "  ⚠️  PR is not open (already merged?), skipping..."
    echo "  ⚠️  PR #$PR_NUM skipped (state: $PR_STATE)" >> "$MERGE_LOG"
    continue
  fi
  
  # Attempt merge
  MERGE_RESPONSE=$(curl -s -X PUT \
    -H "Authorization: token $GITHUB_TOKEN" \
    -H "Accept: application/vnd.github.v3+json" \
    "https://api.github.com/repos/$REPO/pulls/$PR_NUM/merge" \
    -d '{"merge_method":"squash","commit_title":"'"$PR_TITLE"'"}')
  
  # Check if merge succeeded
  if echo "$MERGE_RESPONSE" | grep -q '"merged":true'; then
    echo "  ✅ Merged successfully!"
    echo "  ✅ PR #$PR_NUM merged: $PR_TITLE" >> "$MERGE_LOG"
    ((MERGED++))
  elif echo "$MERGE_RESPONSE" | grep -q '"message"'; then
    ERROR=$(echo "$MERGE_RESPONSE" | grep '"message"' | head -1 | cut -d'"' -f4)
    echo "  ❌ Merge failed: $ERROR"
    echo "  ❌ PR #$PR_NUM failed: $ERROR" >> "$MERGE_LOG"
    ((FAILED++))
  else
    echo "  ❌ Unknown error during merge"
    echo "  ❌ PR #$PR_NUM unknown error" >> "$MERGE_LOG"
    ((FAILED++))
  fi
  
  # Wait between merges to avoid API throttling
  sleep 5
done

# Summary
echo ""
echo "========================================"
echo "MERGE COMPLETE"
echo "========================================"
echo "✅ Successfully merged: $MERGED PRs"
echo "❌ Failed to merge: $FAILED PRs"
echo "========================================"

# Append summary to log
{
  echo ""
  echo "Completed: $(date)"
  echo "Results: $MERGED merged, $FAILED failed"
} >> "$MERGE_LOG"

# Verify main branch
echo ""
echo "🔍 Verifying main branch..."
git fetch origin
git checkout main
git pull origin main

echo ""
echo "📝 Merge log saved to: $MERGE_LOG"
cat "$MERGE_LOG"

if [ $FAILED -eq 0 ]; then
  echo ""
  echo "✅ ALL MERGES SUCCESSFUL!"
  exit 0
else
  echo ""
  echo "⚠️  Some merges failed. Check log above."
  exit 1
fi