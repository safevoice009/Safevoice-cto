# Web3 Deployment Playbook

## Table of Contents

1. [Overview](#overview)
2. [Pre-Deployment Checklist](#pre-deployment-checklist)
3. [Environment Setup](#environment-setup)
4. [Security Configuration](#security-configuration)
5. [Deployment Process](#deployment-process)
6. [Contract Interaction](#contract-interaction)
7. [Rollback Strategy](#rollback-strategy)
8. [Monitoring & Incident Response](#monitoring--incident-response)
9. [Known Limitations](#known-limitations)
10. [Stakeholder Sign-Off](#stakeholder-sign-off)

---

## Overview

SafeVoice is a Web3-enabled frontend application that interfaces with blockchain networks for decentralized features. This playbook provides comprehensive guidance for secure deployment, contract management, and operational procedures.

### Architecture

- **Frontend**: React + TypeScript with Vite
- **Web3 Integration**: wagmi v1, viem, ethers.js v5, RainbowKit
- **Deployment Target**: GitHub Pages (static hosting)
- **Blockchain Networks**: Multi-chain support (configurable)

---

## Pre-Deployment Checklist

### ✅ Code Quality

- [ ] All tests passing (`npm test`)
- [ ] Test coverage meets threshold (>80%)
- [ ] TypeScript compilation successful (`npm run build`)
- [ ] ESLint checks pass (`npm run lint`)
- [ ] No critical security vulnerabilities (`npm audit`)

### ✅ Security Review

- [ ] Environment variables properly configured
- [ ] No hardcoded private keys or secrets in code
- [ ] HTTPS enforced on production domain
- [ ] Content Security Policy (CSP) headers configured
- [ ] Dependency security audit completed
- [ ] Code review by senior engineer completed

### ✅ Web3 Configuration

- [ ] WalletConnect Project ID configured
- [ ] RPC endpoints tested and operational
- [ ] Chain IDs verified for target networks
- [ ] Contract addresses verified on block explorers
- [ ] ABI files up-to-date and tested

### ✅ Documentation

- [ ] README updated with latest instructions
- [ ] API documentation current
- [ ] Deployment runbooks reviewed
- [ ] Incident response procedures in place

---

## Environment Setup

### Required Environment Variables

Create a `.env` file in the project root:

```bash
# WalletConnect Configuration
VITE_WALLETCONNECT_PROJECT_ID=your_project_id_here

# RPC Endpoints (Optional - use public if not specified)
VITE_MAINNET_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/YOUR-API-KEY
VITE_POLYGON_RPC_URL=https://polygon-mainnet.g.alchemy.com/v2/YOUR-API-KEY
VITE_ARBITRUM_RPC_URL=https://arb-mainnet.g.alchemy.com/v2/YOUR-API-KEY

# Application Configuration
VITE_APP_ENV=production
VITE_ENABLE_ANALYTICS=true

# Contract Addresses (if applicable)
VITE_REWARD_CONTRACT_ADDRESS=0x...
VITE_GOVERNANCE_CONTRACT_ADDRESS=0x...
```

### Environment-Specific Configurations

#### Development
```bash
VITE_APP_ENV=development
VITE_ENABLE_DEBUG=true
VITE_USE_TESTNET=true
```

#### Staging
```bash
VITE_APP_ENV=staging
VITE_USE_TESTNET=true
VITE_ENABLE_MONITORING=true
```

#### Production
```bash
VITE_APP_ENV=production
VITE_USE_TESTNET=false
VITE_ENABLE_MONITORING=true
VITE_ENABLE_ANALYTICS=true
```

### Key Management

#### Developer Keys
- **Storage**: Never commit to version control
- **Access**: Use `.env.local` for local development
- **Rotation**: Rotate API keys every 90 days

#### Production Keys
- **Storage**: GitHub Secrets or secure vault (e.g., HashiCorp Vault)
- **Access**: Restricted to deployment pipelines only
- **Rotation**: Monthly rotation schedule
- **Backup**: Encrypted backups in secure storage

#### WalletConnect Project ID
1. Create project at https://cloud.walletconnect.com/
2. Configure allowed domains in dashboard
3. Store ID in GitHub Secrets as `WALLETCONNECT_PROJECT_ID`
4. Never expose in client-side code without environment variable

---

## Security Configuration

### 1. Content Security Policy (CSP)

Add to your hosting configuration or meta tags:

```html
<meta http-equiv="Content-Security-Policy" content="
  default-src 'self';
  script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net;
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: https:;
  connect-src 'self' https://*.walletconnect.com wss://*.walletconnect.com https://*.infura.io https://*.alchemy.com https://*.etherscan.io;
  font-src 'self' data:;
  frame-src 'self' https://*.walletconnect.com;
">
```

### 2. Wallet Connection Security

#### Best Practices
- Always verify chain ID before transactions
- Implement transaction confirmation dialogs
- Display clear gas estimates
- Use read-only connections when possible
- Implement connection timeout (5 minutes)

#### Code Example
```typescript
// Verify chain before transaction
const requiredChainId = 1; // Mainnet
if (chain?.id !== requiredChainId) {
  await switchNetwork?.({ chainId: requiredChainId });
}

// Always show confirmation
const confirmed = await confirmTransaction({
  action: 'Reward Claim',
  amount: pendingRewards,
  estimatedGas: gasEstimate,
});

if (!confirmed) return;
```

### 3. Input Validation & Sanitization

- Sanitize all user inputs with DOMPurify
- Validate addresses using `ethers.utils.isAddress()`
- Validate amounts and enforce limits
- Escape markdown content before rendering

### 4. Smart Contract Interaction Security

#### Pre-Transaction Checks
```typescript
// Verify contract address
const isValidContract = await verifyContractCode(contractAddress);
if (!isValidContract) throw new Error('Invalid contract');

// Check allowance before spending
const allowance = await tokenContract.allowance(userAddress, spenderAddress);
if (allowance.lt(requiredAmount)) {
  await tokenContract.approve(spenderAddress, requiredAmount);
}

// Estimate gas with 20% buffer
const gasEstimate = await contract.estimateGas.method(...args);
const gasLimit = gasEstimate.mul(120).div(100);
```

### 5. Rate Limiting

Implement client-side rate limiting:
- Max 10 wallet connection attempts per minute
- Max 5 transaction submissions per minute
- Exponential backoff for failed RPC calls

---

## Deployment Process

### Step 1: Pre-Deployment Testing

```bash
# Install dependencies
npm ci

# Run full test suite
npm test

# Generate coverage report
npm run test:coverage

# Build for production
npm run build

# Test production build locally
npm run preview
```

### Step 2: Security Scan

```bash
# Audit dependencies
npm audit --audit-level=moderate

# Fix issues automatically (if safe)
npm audit fix

# For critical vulnerabilities requiring manual review
npm audit --json > audit-report.json
```

### Step 3: Deploy to Staging

```bash
# Set staging environment
export VITE_APP_ENV=staging

# Build
npm run build

# Deploy to staging (manual review)
# Copy dist/ to staging server or use staging branch
```

### Step 4: Staging Validation

- [ ] Verify all environment variables loaded correctly
- [ ] Test wallet connections (MetaMask, WalletConnect, Coinbase)
- [ ] Test all Web3 interactions on testnet
- [ ] Verify gas estimation accuracy
- [ ] Test error handling (rejected transactions, network errors)
- [ ] Load testing (simulate 100+ concurrent users)
- [ ] Cross-browser testing (Chrome, Firefox, Safari, Brave)
- [ ] Mobile responsive testing

### Step 5: Production Deployment

```bash
# Merge to main branch (triggers CI/CD)
git checkout main
git merge staging
git push origin main

# Or manual deployment
npm run deploy
```

### Step 6: Post-Deployment Verification

```bash
# Verify deployment
curl -I https://safevoice009.github.io/Safevoice-cto

# Test wallet connection
# Test transaction flow
# Monitor error rates
# Check analytics for anomalies
```

---

## Contract Interaction

### Contract Verification

When integrating with new smart contracts:

1. **Verify on Block Explorer**
   ```
   - Ethereum: https://etherscan.io/address/0x...
   - Polygon: https://polygonscan.com/address/0x...
   - Arbitrum: https://arbiscan.io/address/0x...
   ```

2. **Verify Contract Code**
   - Check source code is verified
   - Review contract functions and events
   - Verify contract is not a proxy (or understand proxy pattern)
   - Check for admin functions and access controls

3. **Audit Reports**
   - Request audit reports from contract owners
   - Verify auditor credibility
   - Review critical and high severity findings

4. **Test on Testnet First**
   - Deploy test transactions on testnets
   - Verify behavior matches expectations
   - Test edge cases (zero amounts, max uint256, etc.)

### Multisig Admin Setup

If SafeVoice deploys its own contracts in the future:

1. **Create Gnosis Safe**
   - Minimum 3-of-5 multisig
   - Signers: Technical Lead, CEO, CTO, Senior Dev, Security Advisor

2. **Transfer Ownership**
   ```solidity
   // Transfer contract ownership to multisig
   contract.transferOwnership(GNOSIS_SAFE_ADDRESS);
   ```

3. **Document Signers**
   - Maintain list of signer addresses
   - Document signer roles and responsibilities
   - Establish signing procedures

4. **Emergency Procedures**
   - Define emergency scenarios requiring fast action
   - Establish 24/7 contact for signers
   - Test emergency signing process quarterly

### Transaction Monitoring

- Monitor all transactions via Etherscan API
- Set up alerts for failed transactions
- Track gas costs and optimize
- Monitor contract events for unexpected behavior

---

## Rollback Strategy

### Immediate Rollback (< 5 minutes)

**Scenario**: Critical bug detected post-deployment

```bash
# 1. Revert to previous GitHub Pages deployment
git revert HEAD
git push origin main

# 2. Or manually deploy previous version
git checkout main~1
npm run build
npm run deploy

# 3. Notify users via status page
```

### Partial Rollback

**Scenario**: Feature-specific issue

```bash
# 1. Create hotfix branch
git checkout -b hotfix/disable-feature main

# 2. Disable problematic feature via feature flag
# Edit src/lib/constants.ts or environment config

# 3. Fast-track deployment
npm run build
npm run deploy
```

### Database/State Rollback

**Scenario**: Corrupted localStorage data

```typescript
// Implement migration rollback
function rollbackMigration() {
  const currentVersion = localStorage.getItem('app_version');
  if (currentVersion === '2.0.0') {
    // Restore v1 data structure
    localStorage.removeItem('voice_wallet_snapshot');
    // Restore individual keys
  }
}
```

### Communication Plan

1. **Immediate** (< 5 min)
   - Post incident alert on status page
   - Notify team on Slack #incidents channel

2. **Short-term** (< 30 min)
   - Publish incident report with ETA
   - Notify stakeholders via email
   - Update social media channels

3. **Post-incident** (< 24 hours)
   - Publish post-mortem report
   - Document lessons learned
   - Update runbooks and procedures

---

## Monitoring & Incident Response

### Monitoring Checklist

#### Application Health
- [ ] Uptime monitoring (99.9% SLA)
- [ ] Error rate tracking (< 1% threshold)
- [ ] Page load performance (< 3s on 3G)
- [ ] Web3 connection success rate (> 95%)
- [ ] Transaction success rate (> 98%)

#### Security Monitoring
- [ ] Dependency vulnerability scanning (daily)
- [ ] Suspicious wallet connection patterns
- [ ] Unusual transaction volumes
- [ ] API rate limit breaches
- [ ] CSP violation reports

#### Performance Metrics
- [ ] Core Web Vitals (LCP, FID, CLS)
- [ ] Bundle size (< 500KB gzipped)
- [ ] Time to Interactive (< 5s)
- [ ] RPC response times (< 2s)

### Incident Response Procedures

#### Severity Levels

**P0 - Critical**
- Production completely down
- Security breach or data leak
- Financial loss occurring
- **Response Time**: < 15 minutes
- **Team**: All hands on deck

**P1 - High**
- Major feature broken
- Degraded performance affecting users
- Failed transactions increasing
- **Response Time**: < 1 hour
- **Team**: On-call engineer + team lead

**P2 - Medium**
- Minor feature issues
- Non-critical bugs
- UI/UX problems
- **Response Time**: < 4 hours
- **Team**: On-call engineer

**P3 - Low**
- Cosmetic issues
- Documentation errors
- Enhancement requests
- **Response Time**: Next business day
- **Team**: Assigned during sprint planning

#### Incident Response Workflow

```
1. DETECT
   ↓
2. TRIAGE (Assign severity)
   ↓
3. COMMUNICATE (Notify stakeholders)
   ↓
4. INVESTIGATE (Root cause analysis)
   ↓
5. MITIGATE (Apply fix or rollback)
   ↓
6. VERIFY (Test resolution)
   ↓
7. DOCUMENT (Post-mortem)
   ↓
8. IMPROVE (Update procedures)
```

### Incident Response Team

| Role | Responsibility | Contact |
|------|---------------|---------|
| Incident Commander | Overall coordination | On-call rotation |
| Technical Lead | Root cause analysis | @tech-lead |
| Communications | Stakeholder updates | @comms-lead |
| Security | Security incidents | @security-team |

### Common Incident Scenarios

#### 1. Wallet Connection Failures

**Symptoms**: Users cannot connect wallets

**Investigation**:
```bash
# Check WalletConnect status
curl https://status.walletconnect.com/api/v2/status.json

# Check RPC endpoints
curl -X POST $VITE_MAINNET_RPC_URL \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}'

# Review error logs
# Check browser console errors
```

**Resolution**:
- Switch to backup RPC endpoints
- Update WalletConnect configuration
- Clear cached connections

#### 2. Transaction Failures Spike

**Symptoms**: High rate of failed transactions

**Investigation**:
- Check gas prices on block explorer
- Verify contract is operational
- Review transaction error messages
- Check for chain congestion

**Resolution**:
- Increase gas price estimates
- Implement retry logic
- Add user guidance for high gas periods
- See [Gas Management Runbook](./runbook-gas-management.md)

#### 3. Security Alert

**Symptoms**: Suspicious activity detected

**Immediate Actions**:
1. DO NOT PANIC - assess threat level
2. Isolate affected systems if needed
3. Preserve evidence (logs, screenshots)
4. Notify security team immediately
5. Follow [Security Incident Runbook](./runbook-security-incidents.md)

---

## Known Limitations

### Technical Limitations

1. **LocalStorage Dependencies**
   - **Risk**: Data loss if user clears browser data
   - **Mitigation**: Implement cloud backup option
   - **Impact**: Medium - users can regenerate data

2. **Static Hosting**
   - **Risk**: Limited server-side capabilities
   - **Mitigation**: Use edge functions for critical paths
   - **Impact**: Low - architecture designed for static hosting

3. **RPC Rate Limits**
   - **Risk**: Free RPC endpoints may throttle
   - **Mitigation**: Implement caching and request batching
   - **Impact**: Medium - affects user experience during high load

4. **Browser Compatibility**
   - **Risk**: Limited support for older browsers
   - **Mitigation**: Display compatibility warning
   - **Impact**: Low - target audience uses modern browsers

### Security Limitations

1. **Client-Side Validation**
   - **Risk**: All validation happens client-side
   - **Mitigation**: Smart contracts enforce server-side validation
   - **Impact**: Low - blockchain provides final validation

2. **Private Key Management**
   - **Risk**: Users responsible for their own keys
   - **Mitigation**: Education and best practice guidance
   - **Impact**: High - key loss means funds loss

3. **MEV Exposure**
   - **Risk**: Transactions subject to MEV extraction
   - **Mitigation**: Use MEV-resistant RPCs (e.g., Flashbots)
   - **Impact**: Medium - mostly affects DeFi transactions

### Operational Limitations

1. **GitHub Pages Deployment**
   - **Risk**: 100GB/month bandwidth limit
   - **Mitigation**: CDN caching, asset optimization
   - **Impact**: Low - well within limits for expected traffic

2. **No Server-Side Rendering**
   - **Risk**: SEO impact, slower initial load
   - **Mitigation**: Pre-rendering for critical pages
   - **Impact**: Low - Web3 apps typically client-rendered

---

## Security Best Practices

### Development

1. **Never commit secrets**
   - Use `.env.local` for local secrets
   - Add `.env.local` to `.gitignore`
   - Use GitHub Secrets for CI/CD

2. **Validate all inputs**
   - Check address format before blockchain calls
   - Validate amounts (min/max, decimals)
   - Sanitize user-generated content

3. **Handle errors gracefully**
   - Never expose internal errors to users
   - Log errors securely (no PII)
   - Provide actionable error messages

4. **Keep dependencies updated**
   - Run `npm audit` weekly
   - Update dependencies monthly
   - Test updates in staging first

### Deployment

1. **Environment isolation**
   - Separate keys for dev/staging/prod
   - Different WalletConnect projects per environment
   - Use testnet in non-production environments

2. **Access control**
   - Limit GitHub repository access
   - Use branch protection rules
   - Require code review for main branch

3. **Monitoring**
   - Set up error tracking (Sentry, LogRocket)
   - Monitor blockchain transactions
   - Track security metrics

### User Security

1. **Education**
   - Provide wallet security guides
   - Warn about phishing attempts
   - Display transaction details clearly

2. **Transaction safety**
   - Show clear gas estimates
   - Require confirmation for all transactions
   - Display contract addresses for verification

3. **Privacy**
   - Minimize data collection
   - Clear privacy policy
   - User control over data

---

## Stakeholder Sign-Off

### Pre-Production Checklist

| Area | Checkpoint | Reviewer | Status | Date |
|------|-----------|----------|--------|------|
| **Security** | Security audit completed | Security Team | ⬜ | |
| **Security** | Penetration testing passed | Security Team | ⬜ | |
| **Security** | Dependency scan clean | DevOps | ⬜ | |
| **Engineering** | All tests passing | Tech Lead | ⬜ | |
| **Engineering** | Code review completed | Senior Dev | ⬜ | |
| **Engineering** | Performance benchmarks met | Tech Lead | ⬜ | |
| **QA** | Staging validation complete | QA Lead | ⬜ | |
| **QA** | Cross-browser testing passed | QA Team | ⬜ | |
| **QA** | Mobile testing passed | QA Team | ⬜ | |
| **Operations** | Monitoring configured | DevOps | ⬜ | |
| **Operations** | Incident runbooks ready | DevOps | ⬜ | |
| **Operations** | Rollback tested | DevOps | ⬜ | |
| **Legal** | Privacy policy updated | Legal | ⬜ | |
| **Legal** | Terms of service reviewed | Legal | ⬜ | |
| **Business** | Stakeholder demo approved | Product | ⬜ | |
| **Business** | Documentation complete | Product | ⬜ | |

### Sign-Off Signatures

**Technical Lead**: ___________________ Date: ___________

**Security Lead**: ___________________ Date: ___________

**Product Manager**: ___________________ Date: ___________

**Engineering Manager**: ___________________ Date: ___________

**CTO/VP Engineering**: ___________________ Date: ___________

---

## Appendix

### Useful Resources

- [Ethereum Development Best Practices](https://consensys.github.io/smart-contract-best-practices/)
- [Web3 Security Guide](https://github.com/ethereum/wiki/wiki/Safety)
- [WalletConnect Documentation](https://docs.walletconnect.com/)
- [wagmi Documentation](https://wagmi.sh/)
- [Viem Documentation](https://viem.sh/)

### Support Contacts

- **Technical Issues**: tech-support@safevoice.io
- **Security Incidents**: security@safevoice.io (PGP key available)
- **Emergency Hotline**: [encrypted communication channel]

### Document Version

- **Version**: 1.0.0
- **Last Updated**: 2024-01-15
- **Next Review**: 2024-04-15
- **Owner**: DevOps Team

---

*This playbook is a living document. Please submit updates via pull request and notify the team of significant changes.*
