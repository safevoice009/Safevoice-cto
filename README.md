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

## 🪙 Reward Engine

The `RewardEngine` centralizes all $VOICE token state and lives in [`src/lib/tokens/RewardEngine.ts`](src/lib/tokens/RewardEngine.ts).

- Wallet state (balances, pending rewards, streak data, transactions) is persisted under the `voice_wallet_snapshot` key in `localStorage`.
- On first run, the engine migrates historical data from legacy `voice*` storage keys without data loss. A `voice_migration_v1` flag guarantees the migration only runs once.
- Token earnings and spending should always happen through the `RewardEngine` instance exposed via the Zustand store (`earnVoice`, `spendVoice`, `claimRewards`).
- The engine emits callbacks for reward/spend/balance changes to keep UI consumers in sync and fires toast notifications automatically.
- Post rewards, daily bonuses, and streak milestones are calculated by the engine ensuring consistent logic across the app.

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

# Optional: Custom RPC endpoints
VITE_MAINNET_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/YOUR-API-KEY
VITE_POLYGON_RPC_URL=https://polygon-mainnet.g.alchemy.com/v2/YOUR-API-KEY

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

Smart contract tooling is included for static analysis and gas benchmarking:

```bash
# Compile contracts
npm run hardhat:compile

# Run Hardhat tests
npm run hardhat:test

# Run coverage with threshold enforcement
npm run security:coverage

# Run gas benchmarking with thresholds
npm run security:gas
```

> **Note:** Hardhat tasks rely on the placeholder `SafeVoiceVault` contract. Replace with production contracts before mainnet deployment and update thresholds accordingly.

## 📝 License

This project is licensed under the terms specified in the LICENSE file.

## 💙 Built with Love for Students

SafeVoice empowers every student to speak out fearlessly and build safer campuses across India.
