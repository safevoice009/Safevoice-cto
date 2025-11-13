# GitHub API Automation Setup - Wave 2 PR Merge

## Overview
This document outlines the setup and usage of GitHub API automation for merging Wave 2 PRs (#118-#129).

## Files Created

### 1. Main Merge Script
- **File**: `scripts/merge-wave2-prs.sh`
- **Purpose**: Automated PR merging using GitHub API
- **Features**:
  - Squash merge method
  - Rate limiting (5 second delays)
  - Comprehensive logging
  - Error handling and reporting
  - Main branch verification

### 2. Test/Setup Script
- **File**: `scripts/test-github-api.sh`
- **Purpose**: Validates GitHub API access and provides setup instructions
- **Features**:
  - Environment validation
  - Setup instructions
  - Simulation mode when token unavailable

## Setup Instructions

### Step 1: Create GitHub Personal Access Token
1. Go to https://github.com/settings/tokens
2. Click "Generate new token (classic)"
3. Configure token:
   - **Note**: "Wave 2 PR Merge Automation"
   - **Expiration**: 7 days (recommended)
   - **Scopes**: 
     - `repo` (Full repository access)
     - `admin:repo_hook` (Repository hooks administration)
4. Click "Generate token"
5. **Important**: Copy the token immediately (you won't see it again)

### Step 2: Set Environment Variable
```bash
# Option A: Export in current session
export GITHUB_TOKEN=your_token_here

# Option B: Add to .env file (create if not exists)
echo "GITHUB_TOKEN=your_token_here" >> .env

# Option C: Add to shell profile (~/.bashrc or ~/.zshrc)
echo 'export GITHUB_TOKEN=your_token_here' >> ~/.bashrc
source ~/.bashrc
```

### Step 3: Test GitHub API Access
```bash
# Test API access
curl -H "Authorization: token $GITHUB_TOKEN" https://api.github.com/user

# Should return 200 OK with your user info
```

### Step 4: Run the Merge Automation
```bash
# Option A: With validation (recommended)
./scripts/test-github-api.sh

# Option B: Direct execution
./scripts/merge-wave2-prs.sh
```

## Expected Output

### Successful Merge
```
🚀 Starting Wave 2 PR merge automation...
Repository: safevoice009/Safevoice-cto
PRs to merge: 118 119 120 121 122 123 124 125 126 127 128 129

Processing PR #118...
  Title: feat-a11y-aaa-tests-vitest-axe-docs
  State: open
  ✅ Merged successfully!

Processing PR #119...
  Title: feat/privacy-onboarding-flow-e01
  State: open
  ✅ Merged successfully!

... (continues for all 12 PRs)

========================================
MERGE COMPLETE
========================================
✅ Successfully merged: 12 PRs
❌ Failed to merge: 0 PRs
========================================

✅ ALL MERGES SUCCESSFUL!
```

### Log File Output
The merge log will be saved to `docs/WAVE2_MERGE_LOG.txt` with detailed results:
```
Wave 2 PR Merge Log
===================
Started: Wed Nov 12 19:19:13 UTC 2025

✅ PR #118 merged: feat-a11y-aaa-tests-vitest-axe-docs
✅ PR #119 merged: feat/privacy-onboarding-flow-e01
... (all successful merges)

Completed: Wed Nov 12 19:25:13 UTC 2025
Results: 12 merged, 0 failed
```

## Verification Steps

### 1. Verify Merges on GitHub
```bash
# Check main branch has new commits
git log --oneline origin/main | head -15

# Should show 12 new commits from Wave 2 PRs
```

### 2. Build Verification
```bash
# Clean install and build
npm ci
npm run build

# Should pass without errors
```

### 3. Test Verification
```bash
# Run all tests
npm test

# Run privacy-specific tests
npm run test:privacy

# All should PASS
```

## Error Handling

### Common Issues and Solutions

#### 1. Bad Credentials (401 Error)
```
"message": "Bad credentials", "status": "401"
```
**Solution**: 
- Verify token is correct and not expired
- Check token has required scopes (repo, admin:repo_hook)

#### 2. PR Not Mergeable
```
"message": "Pull Request is not mergeable"
```
**Solution**:
- Check for merge conflicts
- Ensure CI checks are passing
- Verify PR is in open state

#### 3. API Rate Limiting
```
"message": "API rate limit exceeded"
```
**Solution**:
- Script includes 5-second delays between merges
- If still hitting limits, wait and retry

#### 4. Merge Commit Conflicts
```
"message": "Merge conflict"
```
**Solution**:
- Manual conflict resolution needed
- Rebase PR branch onto main
- Resolve conflicts and retry merge

## Manual Fallback

If automated merging fails, manual steps:
1. Go to https://github.com/safevoice009/Safevoice-cto/pulls
2. Merge PRs sequentially: #118 → #119 → ... → #129
3. Use "Squash and merge" option
4. Wait for CI/CD between merges
5. Verify build and tests after each merge

## Security Considerations

- **Token Security**: Never commit GITHUB_TOKEN to version control
- **Token Expiration**: Use short-lived tokens (7 days recommended)
- **Scope Minimization**: Only request necessary scopes
- **Environment Variables**: Use .env file (in .gitignore) or secure environment

## Success Criteria

✅ Script executes without errors  
✅ All 12 PRs merge successfully  
✅ Main branch updated with 12 new commits  
✅ Build passes after merge  
✅ Tests pass  
✅ Merge log generated and saved  

## Files Created

1. `scripts/merge-wave2-prs.sh` - Main automation script
2. `scripts/test-github-api.sh` - Test and setup validation
3. `docs/WAVE2_MERGE_LOG_SIMULATION.txt` - Simulation results
4. `docs/GITHUB_API_SETUP.md` - This documentation

## Next Steps

Once GITHUB_TOKEN is properly configured:
1. Run `./scripts/test-github-api.sh` to validate setup
2. Execute `./scripts/merge-wave2-prs.sh` for actual merging
3. Monitor the merge process and logs
4. Verify build and test results
5. Update documentation with final results