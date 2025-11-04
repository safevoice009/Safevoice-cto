# SafeVoice v2.0

> India's first decentralized student platform for anonymous stories, crisis support, and safe communities.

## 🚀 Features

- **100% Anonymous** - No login, no tracking. Your identity stays completely private.
- **24/7 Crisis Support** - Instant access to verified helplines and mental health resources.
- **Community Spaces** - Connect with fellow students anonymously. Share experiences safely.
- **Safe Whistleblowing** - Expose institutional corruption. Your voice, their accountability.

## 🛠️ Tech Stack

- **Frontend**: React 18 + TypeScript
- **Styling**: TailwindCSS v3
- **Animations**: Framer Motion
- **Routing**: React Router v6
- **State Management**: Zustand
- **Icons**: Lucide React
- **Notifications**: React Hot Toast
- **Deployment**: GitHub Pages

## 📦 Installation

```bash
npm install
```

## 🏃 Development

```bash
npm run dev
```

This will start the development server at `http://localhost:5173`

## 🏗️ Build

```bash
npm run build
```

This will create an optimized production build in the `dist` folder.

## 🚢 Deployment

SafeVoice is deployed automatically to GitHub Pages from the `main` branch.

- **Production URL**: https://safevoice009.github.io/Safevoice-cto/
- **Base path**: `/Safevoice-cto/`
- **Workflow**: [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml)

### Triggering a Deploy

1. Merge or push changes to the `main` branch.
2. The GitHub Actions workflow installs dependencies with `npm ci`, runs `npm run build`, and publishes the generated `dist/` output to the GitHub Pages environment.
3. The published site automatically serves the latest build from the `gh-pages` branch managed by GitHub Pages.

### Local Verification

1. Run `npm run build` to generate the production bundle.
2. Run `npm run preview` to review the build locally at `http://localhost:4173/Safevoice-cto/`.
3. Verify that deep links (for example `/feed`, `/marketplace`) work locally. The production deployment includes a `public/404.html` fallback so client-side routes resolve correctly on GitHub Pages.

## 📁 Project Structure

```
/src
  /components
    /layout       - Navbar, Footer, BottomNav
    /landing      - Hero, Features, Helplines, Memorial, CTASection
    /wallet       - WalletSection component
  /pages          - Landing, Feed (placeholder), Profile (placeholder)
  /lib
    /tokens       - RewardEngine.ts (Token management)
    - store.ts    - Zustand store
    - tokenEconomics.ts - $VOICE reward/spend rules
    - constants.ts
  /styles         - tailwind.css, globals.css
```

## 🎨 Custom TailwindCSS Classes

- `.glass` - Glassmorphism effect with backdrop blur
- `.btn-primary` - Primary button styles (purple)
- `.btn-secondary` - Secondary button styles (red)
- `.nav-link` - Navigation link styles

## 🔑 Key Features

### Anonymous Student ID
Every visitor gets a unique `Student#XXXX` ID stored in localStorage, ensuring anonymity.

### Responsive Design
- Mobile: Single column layout with bottom navigation
- Tablet: 2-column grid
- Desktop: Full navbar with 2x2 feature grid

### Smooth Animations
All animations powered by Framer Motion with proper TypeScript typing.

## 🪙 Reward Engine & Token Economy

### $VOICE Token (ERC20)

The `VoiceToken` smart contract powers SafeVoice's on-chain token economy:

- **Supply Cap**: 1 billion tokens maximum
- **Access Control**: Role-based minting, burning, and bridge operations
- **EIP-2612 Permit**: Gasless approvals for better UX
- **Emergency Pause**: Admin-controlled pause for security incidents
- **Cross-Chain Bridge**: Support for multi-chain deployments

See [VOICE_TOKEN_API.md](./docs/VOICE_TOKEN_API.md) for complete contract documentation.

### VoiceVesting Module

The on-chain vesting coordinator allocates the fixed 1B VOICE supply across four governance-approved tranches with cliff and linear vesting support. A 48-hour timelock guards beneficiary changes and the contract can be paused during incidents.

| Tranche | Allocation | Percent | Vesting Profile |
| ------- | ---------- | ------- | --------------- |
| Community Rewards | 400,000,000 VOICE | 40% | Linear release over 24 months (no cliff) |
| Treasury | 250,000,000 VOICE | 25% | Linear release over 60 months |
| Team | 200,000,000 VOICE | 20% | 12-month cliff, 48-month linear vesting |
| Ecosystem | 150,000,000 VOICE | 15% | 6-month cliff, 36-month linear vesting |

Key analytics touchpoints:
- `VestingScheduleCreated` for newly provisioned allocations and beneficiary onboarding metrics
- `TokensReleased` to track realized supply circulation and cohort unlocks
- `VestingRevoked` to monitor clawbacks and compliance-driven actions
- `BeneficiaryUpdated` for governance-approved handoffs or wallet rotations

Integration teams can pull the ABI via `npm run export:abis` and access full usage guidelines in [VESTING_MODULE.md](./docs/VESTING_MODULE.md).

### Staking & Governance

The on-chain staking and governance system enables VOICE token holders to:

- **Stake VOICE tokens** with configurable lock periods to earn rewards
- **Participate in on-chain governance** via snapshot-based voting
- **Delegate voting power** to trusted representatives
- **Earn staking rewards** with transparent APY calculation

#### Key Contracts

- **VoiceStaking**: Manages stake positions, reward accrual, and emergency withdrawals
- **VoiceVotingToken** (vVOICE): Non-transferable governance token minted 1:1 on stake
- **VoiceGovernor**: OpenZeppelin Governor for proposal creation, voting, and execution

#### Staking Features

- **Lock Periods**: 7 days minimum, 365 days maximum (configurable per chain)
- **Early Unstake Penalty**: 10% default (configurable up to 50%)
- **Emergency Withdrawal**: 2-day delay mechanism for security
- **Multi-Chain Support**: Chain-specific parameters and emission schedules
- **RewardEngine Integration**: Transparent APY calculation surfaced in UI

See [STAKING_GOVERNANCE_DOCS.md](./STAKING_GOVERNANCE_DOCS.md) for complete documentation.

### RewardEngine & Web3 Bridge

The `RewardEngine` centralizes all $VOICE token state and lives in [`src/lib/tokens/RewardEngine.ts`](src/lib/tokens/RewardEngine.ts). Beginning with v2.1 the engine can transparently bridge rewards and spending actions to on-chain smart contracts via the `Web3Bridge` service.

#### Core Responsibilities (Offline-First)
- Persist wallet state (balances, pending rewards, streak data, transactions) under the `voice_wallet_snapshot` key in `localStorage`.
- Migrate legacy `voice*` keys on first run and guard subsequent migrations with the `voice_migration_v1` flag.
- Emit callbacks for reward/spend/balance changes and fire toast notifications to keep UI consumers synchronized.
- Calculate post rewards, daily bonuses, streak milestones, premium subscriptions, and achievement unlocks consistently across the app.

#### Web3 Bridge Integration
- When `VITE_WEB3_ENABLED=true`, the engine delegates claims, burns, staking deposits, withdrawals, vote submissions, and NFT unlocks to the on-chain contracts exposed via the `Web3Bridge`.
- Transactions are queued optimistically, immediately updating the UI while a background poller waits for confirmations.
- Failed on-chain transactions automatically trigger rollbacks that restore pending balances, remove optimistic history entries, and display reconciliation toasts.
- The bridge tracks pending receipts per chain, supports multi-chain RPC configuration, and persists queued transactions so browser refreshes do not lose state.
- See [`docs/WEB3_BRIDGE_DOCS.md`](./docs/WEB3_BRIDGE_DOCS.md) for the full API and integration guide.

### Achievement NFTs (ERC1155)

Milestone achievements and community recognitions are minted through the on-chain [`VoiceAchievementNFT`](./contracts/src/VoiceAchievementNFT.sol) contract. The collection is designed for large-scale reward drops while supporting unique badges and soulbound tiers.

Key capabilities:
- **Role-Gated Minting** – RewardEngine and bridge adapters operate behind dedicated MINTER and BRIDGE roles
- **Soulbound Achievements** – Legendary tiers can be locked to wallets while everyday badges remain transferable
- **Metadata Flexibility** – Hierarchical base URIs with per-chain overrides and token-specific IPFS links
- **Bridge Hooks** – `bridgeTransfer`/`bridgeReceive` enable cross-chain portability for non-soulbound tiers
- **Batch Operations** – `mintBatch` and `airdrop` keep gas costs low for large cohorts

Frontend teams can hydrate achievement tiles by calling `uri(tokenId)` and `balanceOfBatch`, then fetching the returned JSON metadata. A full integration cookbook, including tier taxonomy, sample UI components, and notification flows, lives in [docs/NFT_REWARDS_DOCS.md](./docs/NFT_REWARDS_DOCS.md).

## 🔒 Web3 Security & Deployment

### Security Documentation

SafeVoice implements comprehensive security practices and operational procedures:

- **[Web3 Deployment Playbook](./docs/web3-deployment.md)** - Complete deployment guide with security best practices, contract verification, key management, and rollback strategies
- **[Gas Management Runbook](./docs/runbook-gas-management.md)** - Procedures for handling high gas fees, optimizing costs, and managing user expectations
- **[Chain Outages Runbook](./docs/runbook-chain-outages.md)** - Response procedures for RPC failures, network halts, and chain reorganizations
- **[Contract Upgrades Runbook](./docs/runbook-contract-upgrades.md)** - Safe upgrade procedures for proxy patterns and new contract deployments
- **[Security Incidents Runbook](./docs/runbook-security-incidents.md)** - Incident response procedures, detection, containment, and recovery

### Automated Security Checks

The project includes automated security tooling in CI/CD:

- **NPM Audit** - Daily dependency vulnerability scanning
- **ESLint Security** - Code quality and security pattern enforcement
- **Test Coverage** - 80% coverage threshold enforced via Vitest
- **TypeScript Safety** - Strict type checking across the codebase
- **Web3 Security Patterns** - Validation of address handling, sanitization, and error handling
- **Slither Analysis** - Static analysis for smart contracts (when present)
- **Environment Validation** - Secrets detection and configuration checks

Run security checks locally:
```bash
npm run lint                # ESLint checks
npm run test:coverage       # Tests with coverage thresholds
npm audit                   # Dependency vulnerability scan
```

### Environment Setup

Create a `.env` file for local development:
```bash
# Required: WalletConnect Project ID
VITE_WALLETCONNECT_PROJECT_ID=your_project_id

# Web3 bridge configuration (optional)
VITE_WEB3_ENABLED=false
VITE_CHAIN_ID=31337
VITE_BRIDGE_SOURCE_CHAIN_ID=0
VITE_POLLING_INTERVAL=5000

# Optional: Custom RPC endpoints (falls back to public RPCs)
VITE_RPC_MAINNET=https://eth-mainnet.g.alchemy.com/v2/YOUR-API-KEY
VITE_RPC_POLYGON=https://polygon-mainnet.g.alchemy.com/v2/YOUR-API-KEY
VITE_RPC_LOCALHOST=http://127.0.0.1:8545

# Optional: Contract addresses per chain (only needed when enabling web3)
VITE_LOCALHOST_VOICE_TOKEN=0x5FbDB2315678afecb367f032d93F642f64180aa3
VITE_LOCALHOST_VOICE_STAKING=0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512
VITE_LOCALHOST_VOICE_ACHIEVEMENT_NFT=0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0
VITE_LOCALHOST_VOICE_GOVERNOR=0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9

# Application configuration
VITE_APP_ENV=development
```

**Security Note**: Never commit `.env` files. Use `.env.local` for sensitive local configuration.

### Testing

```bash
# Run all tests
npm test

# Run tests with UI
npm run test:ui

# Generate coverage report
npm run test:coverage

# Run tests in watch mode
npm test -- --watch
```

**Coverage Thresholds**:
- Statements: 80%
- Branches: 70%
- Functions: 80%
- Lines: 80%

### Hardhat & Smart Contract Tooling

Smart contract tooling now lives in the `contracts/` workspace and can be driven from the project root:

```bash
# Compile contracts
npm run hardhat:compile

# Run Hardhat unit tests
npm run test:contracts

# Lint Solidity sources with Solhint
npm run lint:contracts

# Run coverage with threshold enforcement
npm run coverage:contracts

# Deploy tagged deployments (uses hardhat-deploy)
npm run deploy:voice

# Run gas benchmarking with thresholds
npm run security:gas
```

> **Note:** Hardhat tasks rely on the placeholder `SafeVoiceVault` contract. Replace with production contracts before mainnet deployment and update thresholds accordingly. See [`contracts/README.md`](./contracts/README.md) for a detailed walkthrough of the new setup, environment variables, and deployment instructions.

## 📚 Documentation

### Token Economics & Rewards
- [Reward Engine](./REWARD_ENGINE_DOCS.md) - Complete reward system documentation
- [Staking & Governance](./STAKING_GOVERNANCE_DOCS.md) - Staking and on-chain governance guide
- [NFT Rewards](./docs/NFT_REWARDS_DOCS.md) - Achievement NFT system documentation

### Web3 Integration
- [Web3 Bridge](./docs/WEB3_BRIDGE_DOCS.md) - **NEW!** Reward Engine ↔ blockchain integration
- [Web3 Deployment Guide](./docs/web3-deployment.md) - Security best practices and deployment procedures

### Smart Contract Reference
- [VoiceToken API](./docs/VOICE_TOKEN_API.md) - Complete VoiceToken contract reference
- [Vesting Module](./docs/VESTING_MODULE.md) - Full VoiceVesting documentation with examples
- [Vesting Quick Start](./docs/VESTING_QUICK_START.md) - Quick reference for common operations

## 📝 License

This project is licensed under the terms specified in the LICENSE file.

## 💙 Built with Love for Students

SafeVoice empowers every student to speak out fearlessly and build safer campuses across India.
