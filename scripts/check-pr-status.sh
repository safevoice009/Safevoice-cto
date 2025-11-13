#!/bin/bash
set -e

REPO="safevoice009/Safevoice-cto"
GITHUB_TOKEN="${GITHUB_TOKEN}"
PR_NUMBERS=(118 119 120 121 122 123 124 125 126 127 128 129)

echo "🔍 CHECKING WAVE 2 PR STATUS"
echo "============================"

if [ -z "$GITHUB_TOKEN" ]; then
  echo "❌ GITHUB_TOKEN not set. Running in offline mode..."
  echo ""
  echo "📋 Expected PRs to merge:"
  for PR_NUM in "${PR_NUMBERS[@]}"; do
    echo "  • PR #$PR_NUM"
  done
  echo ""
  echo "🚀 To check actual status, set GITHUB_TOKEN and run again:"
  echo "   export GITHUB_TOKEN=your_token_here"
  echo "   ./scripts/check-pr-status.sh"
  exit 0
fi

echo "✅ GITHUB_TOKEN found - checking actual PR status..."
echo ""

OPEN=0
CLOSED=0
MERGED=0

for PR_NUM in "${PR_NUMBERS[@]}"; do
  echo "Checking PR #$PR_NUM..."
  
  # Get PR info
  PR_INFO=$(curl -s -H "Authorization: token $GITHUB_TOKEN" \
    "https://api.github.com/repos/$REPO/pulls/$PR_NUM")
  
  # Check if PR exists
  if echo "$PR_INFO" | grep -q '"Not Found"'; then
    echo "  ❌ PR not found"
    continue
  fi
  
  PR_TITLE=$(echo "$PR_INFO" | grep '"title"' | head -1 | cut -d'"' -f4)
  PR_STATE=$(echo "$PR_INFO" | grep '"state"' | head -1 | cut -d'"' -f4)
  MERGE_STATUS=$(echo "$PR_INFO" | grep '"merged"' | head -1 | cut -d':' -f2 | tr -d ' ,')
  
  echo "  Title: $PR_TITLE"
  echo "  State: $PR_STATE"
  echo "  Merged: $MERGE_STATUS"
  
  if [ "$MERGE_STATUS" = "true" ]; then
    echo "  ✅ Already merged"
    ((MERGED++))
  elif [ "$PR_STATE" = "open" ]; then
    echo "  🔄 Open and ready to merge"
    ((OPEN++))
  else
    echo "  ❌ Closed (not merged)"
    ((CLOSED++))
  fi
  echo ""
done

echo "========================================"
echo "STATUS SUMMARY"
echo "========================================"
echo "🔄 Open and ready: $OPEN PRs"
echo "✅ Already merged: $MERGED PRs"
echo "❌ Closed (not merged): $CLOSED PRs"
echo "========================================"

if [ $OPEN -gt 0 ]; then
  echo ""
  echo "🚀 Ready to merge $OPEN PRs with:"
  echo "   ./scripts/merge-wave2-prs.sh"
fi

if [ $MERGED -eq ${#PR_NUMBERS[@]} ]; then
  echo ""
  echo "🎉 ALL PRs ALREADY MERGED!"
fi