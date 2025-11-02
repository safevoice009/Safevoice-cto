# Runbook: Security Incidents

## Overview

This runbook provides step-by-step procedures for responding to security incidents, including detection, containment, eradication, recovery, and post-incident analysis.

---

## Incident Severity Classification

| Level | Description | Response Time | Examples |
|-------|-------------|---------------|----------|
| **P0 - Critical** | Active exploit, funds at risk | < 15 minutes | Smart contract exploit, private key leak, active attack |
| **P1 - High** | Potential exploit, security vulnerability | < 1 hour | Unpatched vulnerability, suspicious activity, data breach |
| **P2 - Medium** | Security concern, no immediate threat | < 4 hours | Phishing attempt, suspicious login, dependency vulnerability |
| **P3 - Low** | Minor security issue | Next business day | Security policy violation, non-critical warning |

---

## Incident Response Team

| Role | Responsibility | Contact Method |
|------|----------------|----------------|
| **Incident Commander** | Overall coordination | Immediate page |
| **Security Lead** | Technical investigation | Immediate page |
| **Engineering Lead** | System remediation | Immediate page |
| **Legal Counsel** | Legal implications | Within 1 hour |
| **PR/Communications** | External communications | Within 1 hour |
| **Executive Sponsor** | Business decisions | Within 2 hours |

---

## Incident Response Phases

```
1. DETECT & ALERT
   ↓
2. TRIAGE & ASSESS
   ↓
3. CONTAIN
   ↓
4. INVESTIGATE
   ↓
5. ERADICATE
   ↓
6. RECOVER
   ↓
7. POST-INCIDENT REVIEW
```

---

## Phase 1: Detection & Alert

### Automated Detection

```typescript
// Security monitoring system
class SecurityMonitor {
  private alerts: SecurityAlert[] = [];
  
  // Monitor suspicious patterns
  async detectAnomalies() {
    // Check for unusual transaction patterns
    const recentTxs = await getRecentTransactions(100);
    
    // Large withdrawals
    const largeWithdrawals = recentTxs.filter(
      tx => tx.value.gt(LARGE_WITHDRAWAL_THRESHOLD)
    );
    if (largeWithdrawals.length > 5) {
      this.createAlert('UNUSUAL_WITHDRAWAL_PATTERN', 'P1');
    }
    
    // Repeated failed transactions
    const failedTxs = recentTxs.filter(tx => !tx.success);
    if (failedTxs.length > 20) {
      this.createAlert('HIGH_FAILURE_RATE', 'P2');
    }
    
    // Multiple wallets accessing same resource
    const addressCount = new Set(recentTxs.map(tx => tx.from)).size;
    if (addressCount < recentTxs.length * 0.3) {
      this.createAlert('POTENTIAL_BOT_ATTACK', 'P1');
    }
  }
  
  // Monitor contract events
  async monitorContractEvents() {
    const contract = await getContract();
    
    // Alert on ownership changes
    contract.on('OwnershipTransferred', (prev, next) => {
      this.createAlert('OWNERSHIP_CHANGE', 'P0', {
        previousOwner: prev,
        newOwner: next,
      });
    });
    
    // Alert on paused state changes
    contract.on('Paused', () => {
      this.createAlert('CONTRACT_PAUSED', 'P1');
    });
    
    // Alert on emergency withdrawals
    contract.on('EmergencyWithdrawal', (amount, recipient) => {
      this.createAlert('EMERGENCY_WITHDRAWAL', 'P0', {
        amount: ethers.utils.formatEther(amount),
        recipient,
      });
    });
  }
  
  createAlert(type: string, severity: string, data?: any) {
    const alert = {
      type,
      severity,
      timestamp: Date.now(),
      data,
    };
    
    this.alerts.push(alert);
    this.notifyTeam(alert);
  }
  
  notifyTeam(alert: SecurityAlert) {
    if (alert.severity === 'P0' || alert.severity === 'P1') {
      // Page on-call team
      sendPagerDutyAlert(alert);
    }
    
    // Log to security system
    logSecurityEvent(alert);
    
    // Send to Slack
    sendSlackAlert('#security-alerts', alert);
  }
}
```

### Manual Reporting

**Report security issues to**: security@safevoice.io

**Emergency hotline**: [Encrypted communication channel]

**Bug bounty program**: [If applicable]

---

## Phase 2: Triage & Assess

### Initial Assessment

```typescript
async function triageIncident(report: IncidentReport) {
  // Gather initial information
  const assessment = {
    reportedAt: Date.now(),
    reporter: report.reporter,
    description: report.description,
    affectedSystems: [],
    severity: 'P3', // Default to low
    impact: 'none',
    fundsAtRisk: false,
  };
  
  // Check if funds are at risk
  if (report.type === 'EXPLOIT' || report.type === 'VULNERABILITY') {
    assessment.severity = 'P0';
    assessment.fundsAtRisk = true;
    assessment.impact = 'critical';
  }
  
  // Check affected systems
  assessment.affectedSystems = await identifyAffectedSystems(report);
  
  // Assign incident commander
  assignIncidentCommander(assessment);
  
  // Create incident channel
  createIncidentChannel(assessment);
  
  return assessment;
}
```

### Severity Assessment Matrix

| Impact | Likelihood | Severity |
|--------|-----------|----------|
| Critical + Certain | P0 |
| Critical + Likely | P0 |
| High + Certain | P1 |
| High + Likely | P1 |
| Medium + Certain | P2 |
| Medium + Likely | P2 |
| Low + Any | P3 |

---

## Phase 3: Containment

### Immediate Containment Actions

```typescript
// Emergency response functions
async function containThreat(incident: Incident) {
  switch (incident.type) {
    case 'CONTRACT_EXPLOIT':
      await pauseContract();
      await freezeAffectedAccounts();
      break;
      
    case 'PRIVATE_KEY_COMPROMISE':
      await revokeCompromisedKeys();
      await transferAssets();
      break;
      
    case 'FRONTEND_ATTACK':
      await takeDownFrontend();
      await switchToBackupDomain();
      break;
      
    case 'DATA_BREACH':
      await isolateAffectedSystems();
      await revokeAccessTokens();
      break;
  }
}
```

### Smart Contract Emergency Actions

```typescript
// Pause contract immediately
async function pauseContract() {
  const contract = await getContract();
  
  // Check if contract has pause functionality
  if (!contract.pause) {
    console.error('Contract does not support pausing');
    // Alternative: Use circuit breaker or guardian
    return false;
  }
  
  try {
    const tx = await contract.pause();
    await tx.wait();
    
    console.log('Contract paused successfully');
    
    // Notify monitoring systems
    sendAlert({
      type: 'CONTRACT_PAUSED',
      reason: 'Security incident',
      txHash: tx.hash,
    });
    
    return true;
  } catch (error) {
    console.error('Failed to pause contract:', error);
    return false;
  }
}

// Emergency withdrawal (if available)
async function emergencyWithdraw() {
  const contract = await getContract();
  const safeAddress = process.env.EMERGENCY_SAFE_ADDRESS!;
  
  const tx = await contract.emergencyWithdraw(safeAddress);
  await tx.wait();
  
  console.log('Emergency withdrawal completed:', tx.hash);
}
```

### Frontend Containment

```typescript
// Display security warning banner
function displaySecurityWarning() {
  const banner = document.createElement('div');
  banner.className = 'security-banner critical';
  banner.innerHTML = `
    <div class="banner-content">
      <h2>🚨 Security Alert</h2>
      <p>We have detected a security issue and have temporarily disabled certain features.
         Your funds are safe. Please do not interact with any unofficial links or sites.</p>
      <p>Follow @SafeVoice on Twitter for updates.</p>
    </div>
  `;
  document.body.prepend(banner);
  
  // Disable transaction buttons
  disableTransactionUI();
}

function disableTransactionUI() {
  const buttons = document.querySelectorAll('[data-action="transaction"]');
  buttons.forEach(btn => {
    btn.disabled = true;
    btn.classList.add('disabled');
  });
}
```

---

## Phase 4: Investigation

### Evidence Collection

```typescript
async function collectEvidence(incident: Incident) {
  const evidence = {
    timestamp: Date.now(),
    incidentId: incident.id,
    data: {},
  };
  
  // Collect blockchain evidence
  evidence.data.transactions = await getRelatedTransactions(incident);
  evidence.data.contractState = await captureContractState();
  evidence.data.events = await getContractEvents(incident.timeRange);
  
  // Collect system logs
  evidence.data.serverLogs = await collectServerLogs(incident.timeRange);
  evidence.data.errorLogs = await collectErrorLogs(incident.timeRange);
  
  // Collect user reports
  evidence.data.userReports = await collectUserReports(incident.timeRange);
  
  // Store evidence securely
  await storeEvidence(evidence);
  
  return evidence;
}

// Analyze suspicious transactions
async function analyzeSuspiciousTransaction(txHash: string) {
  const tx = await provider.getTransaction(txHash);
  const receipt = await provider.getTransactionReceipt(txHash);
  
  const analysis = {
    from: tx.from,
    to: tx.to,
    value: ethers.utils.formatEther(tx.value),
    gasUsed: receipt.gasUsed.toString(),
    status: receipt.status === 1 ? 'success' : 'failed',
    blockNumber: receipt.blockNumber,
    events: receipt.logs,
  };
  
  // Check if addresses are known
  const isKnownAttacker = await checkKnownAttackerList(tx.from);
  const isContractInteraction = await provider.getCode(tx.to!) !== '0x';
  
  return {
    ...analysis,
    isKnownAttacker,
    isContractInteraction,
    riskScore: calculateRiskScore(analysis),
  };
}
```

### Root Cause Analysis

```typescript
interface RootCause {
  category: 'code' | 'configuration' | 'access' | 'process' | 'external';
  description: string;
  howDetected: string;
  timeline: Timeline[];
  contributingFactors: string[];
}

async function performRootCauseAnalysis(incident: Incident): Promise<RootCause> {
  // Analyze the incident timeline
  const timeline = await constructTimeline(incident);
  
  // Identify the root cause
  const rootCause = await identifyRootCause(timeline);
  
  // Identify contributing factors
  const factors = await identifyContributingFactors(timeline);
  
  return {
    category: rootCause.category,
    description: rootCause.description,
    howDetected: incident.detectionMethod,
    timeline,
    contributingFactors: factors,
  };
}
```

---

## Phase 5: Eradication

### Vulnerability Remediation

```typescript
// Fix identified vulnerability
async function remediateVulnerability(vulnerability: Vulnerability) {
  switch (vulnerability.type) {
    case 'SMART_CONTRACT':
      // Deploy patched contract
      await deployPatchedContract();
      // Upgrade proxy if applicable
      await upgradeProxy();
      break;
      
    case 'FRONTEND':
      // Deploy fixed frontend
      await deployFrontendFix();
      // Clear CDN cache
      await clearCDNCache();
      break;
      
    case 'ACCESS_CONTROL':
      // Revoke compromised keys
      await revokeCompromisedKeys();
      // Rotate all keys
      await rotateAllKeys();
      break;
      
    case 'DEPENDENCY':
      // Update vulnerable dependency
      await updateDependency(vulnerability.package);
      // Redeploy application
      await redeploy();
      break;
  }
}
```

### Attacker Mitigation

```typescript
// Block malicious addresses
async function blockMaliciousAddresses(addresses: string[]) {
  // Add to blacklist in contract (if supported)
  const contract = await getContract();
  
  for (const address of addresses) {
    await contract.addToBlacklist(address);
  }
  
  // Update frontend blacklist
  await updateFrontendBlacklist(addresses);
  
  // Report to blockchain security services
  await reportToSecurityServices(addresses);
}
```

---

## Phase 6: Recovery

### System Restoration

```typescript
async function restoreNormalOperations() {
  // Verify fix is deployed
  const fixDeployed = await verifyFixDeployment();
  if (!fixDeployed) {
    throw new Error('Fix not properly deployed');
  }
  
  // Run security tests
  const securityTestsPassed = await runSecurityTests();
  if (!securityTestsPassed) {
    throw new Error('Security tests failed');
  }
  
  // Gradual restoration
  await restoreReadOnlyAccess();
  await delay(5 * 60 * 1000); // Wait 5 minutes
  
  await restoreWriteAccess();
  await delay(10 * 60 * 1000); // Wait 10 minutes
  
  await removeMaintenanceBanner();
  
  // Notify users
  notifyUsersOfRestoration();
  
  // Enhanced monitoring for 24 hours
  enableEnhancedMonitoring(24 * 60 * 60 * 1000);
}
```

### User Communication

```typescript
// Recovery notification
const recoveryMessage = `
✅ Security Incident Resolved

The security issue has been resolved and all systems are operational.

What happened: [Brief description]
What we did: [Actions taken]
Your action required: [If any]

Your funds remain safe. Thank you for your patience and understanding.

Full incident report: [Link]
`;

async function notifyUsersOfRestoration() {
  // Update status page
  await updateStatusPage('operational', recoveryMessage);
  
  // Send email to affected users
  await sendEmailNotification(affectedUsers, recoveryMessage);
  
  // Post on social media
  await postToSocialMedia(recoveryMessage);
  
  // In-app notification
  await sendInAppNotification(recoveryMessage);
}
```

---

## Phase 7: Post-Incident Review

### Post-Mortem Report

```markdown
# Incident Post-Mortem: [Incident ID]

## Executive Summary
[Brief overview of what happened]

## Timeline
- **[Time]**: [Event]
- **[Time]**: [Event]
- **[Time]**: [Event]

## Root Cause
[Detailed explanation of the root cause]

## Impact
- **Users Affected**: [Number]
- **Funds at Risk**: [Amount]
- **Downtime**: [Duration]
- **Reputation Impact**: [Assessment]

## Response
### What Went Well
- [Item 1]
- [Item 2]

### What Could Be Improved
- [Item 1]
- [Item 2]

## Action Items
| Action | Owner | Deadline | Status |
|--------|-------|----------|--------|
| [Action] | [Name] | [Date] | [ ] |

## Prevention
[How we'll prevent this in the future]

## Lessons Learned
[Key takeaways]

---
**Prepared by**: [Name]
**Date**: [Date]
**Reviewed by**: [Names]
```

### Follow-Up Actions

```typescript
interface ActionItem {
  id: string;
  description: string;
  owner: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  deadline: Date;
  status: 'pending' | 'in-progress' | 'completed';
}

const postIncidentActions: ActionItem[] = [
  {
    id: 'ACTION-001',
    description: 'Implement additional monitoring for [specific metric]',
    owner: 'DevOps Team',
    priority: 'critical',
    deadline: new Date('2024-01-20'),
    status: 'pending',
  },
  {
    id: 'ACTION-002',
    description: 'Update incident response runbook with learnings',
    owner: 'Security Team',
    priority: 'high',
    deadline: new Date('2024-01-25'),
    status: 'pending',
  },
  // ... more actions
];
```

---

## Common Incident Types

### 1. Smart Contract Exploit

**Indicators**:
- Unusual contract function calls
- Large fund movements
- High gas usage
- Multiple failed transactions

**Response**:
1. Pause contract immediately
2. Identify exploit vector
3. Calculate funds at risk
4. Deploy patched contract
5. Notify users and authorities

---

### 2. Private Key Compromise

**Indicators**:
- Unauthorized transactions
- Unexpected access patterns
- Third-party security alerts

**Response**:
1. Revoke compromised keys immediately
2. Transfer assets to secure wallet
3. Generate new keys with enhanced security
4. Audit all actions taken with compromised keys
5. Notify affected parties

---

### 3. Frontend Attack (Phishing/XSS)

**Indicators**:
- User reports of suspicious behavior
- Unexpected redirects
- Modified UI elements
- Unauthorized transactions

**Response**:
1. Take down compromised frontend
2. Switch to backup domain
3. Identify injection point
4. Deploy sanitized version
5. Warn users about phishing attempts

---

### 4. Reentrancy Attack

**Indicators**:
- Repeated function calls in single transaction
- Balances becoming negative
- State inconsistencies

**Response**:
1. Pause contract
2. Identify vulnerable function
3. Deploy patch with reentrancy guard
4. Audit all contract functions
5. Reimburse affected users (if necessary)

---

## Security Tools & Resources

### Static Analysis

```bash
# Run Slither (if contracts exist)
slither . --exclude-dependencies

# Run Mythril
myth analyze contracts/SafeVoiceVault.sol

# Run Echidna (fuzzing)
echidna-test contracts/SafeVoiceVault.sol
```

### Runtime Monitoring

```typescript
// Monitor contract for attacks
import { Forta } from '@forta-network/sdk';

const alertAgent = async () => {
  // Monitor for reentrancy patterns
  // Monitor for unusual access patterns
  // Monitor for large withdrawals
};
```

### Incident Response Tools

- **Pager Duty**: On-call alerting
- **Slack**: Team communication
- **Notion/Confluence**: Incident documentation
- **Tenderly**: Transaction analysis
- **Etherscan**: Blockchain explorer
- **Gnosis Safe**: Emergency multisig actions

---

## Emergency Contacts

| Service | Contact | Notes |
|---------|---------|-------|
| Incident Commander | @on-call | PagerDuty rotation |
| Security Team | security@safevoice.io | 24/7 monitoring |
| Alchemy Support | support@alchemy.com | RPC provider |
| Infura Support | support@infura.io | Backup RPC |
| Legal Counsel | legal@safevoice.io | For legal matters |
| PR Team | pr@safevoice.io | External comms |

---

## Testing & Drills

### Security Drill Schedule

- **Monthly**: Incident response tabletop exercise
- **Quarterly**: Full security incident simulation
- **Annually**: Red team penetration testing

### Drill Procedure

1. Announce drill to team (not users)
2. Inject simulated incident
3. Execute response procedures
4. Time all response actions
5. Debrief and identify improvements
6. Update runbooks

---

## Compliance & Reporting

### Regulatory Requirements

- Report incidents to relevant authorities within required timeframe
- Notify affected users per GDPR/privacy laws
- Document incident for audit purposes
- Maintain evidence chain of custody

### Disclosure Policy

**Public Disclosure**: 
- After incident fully resolved
- After all users notified
- After fix deployed and verified
- Within 90 days of discovery (responsible disclosure)

---

**Document Version**: 1.0.0  
**Last Updated**: 2024-01-15  
**Owner**: Security Team  
**Review Schedule**: Quarterly
