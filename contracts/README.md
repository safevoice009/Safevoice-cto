# SafeVoice Smart Contracts

This directory contains the Hardhat-based smart contract workspace for SafeVoice.

## 📁 Directory Structure

```
contracts/
├── src/           # Solidity smart contracts
├── test/          # Hardhat tests (using Chai & Waffle)
├── deploy/        # Deployment scripts (hardhat-deploy)
├── tasks/         # Custom Hardhat tasks
├── artifacts/     # Compiled contract artifacts (gitignored)
├── cache/         # Hardhat cache (gitignored)
└── deployments/   # Deployment records (gitignored)
```

## 🚀 Quick Start

### Installation

From the project root, install dependencies:

```bash
npm install
```

### Compile Contracts

```bash
npx hardhat compile
# or
npm run hardhat:compile
```

### Run Tests

```bash
npx hardhat test
# or
npm run test:contracts
```

### Run Tests with Gas Reporter

```bash
REPORT_GAS=true npx hardhat test
# or
npm run security:gas
```

### Coverage

```bash
npx hardhat coverage
# or
npm run coverage:contracts
```

### Lint Contracts

```bash
npm run lint:contracts
```

## 🌐 Network Configuration

The following networks are configured in `hardhat.config.ts`:

### Mainnets
- **Ethereum Mainnet** (`mainnet`)
- **Optimism** (`optimism`)
- **Arbitrum One** (`arbitrum`)
- **Base** (`base`)
- **Polygon PoS** (`polygon`)
- **Polygon zkEVM** (`polygonZkEvm`)
- **BNB Smart Chain** (`bsc`)
- **Avalanche C-Chain** (`avalanche`)

### Testnets
- **Sepolia** (`sepolia`)
- **Goerli** (`goerli`)
- **Mumbai** (`mumbai`)
- **BSC Testnet** (`bscTestnet`)

## 📝 Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

### Required Variables

- `DEPLOYER_PRIVATE_KEY` - Private key for contract deployment (use test wallet only!)

### Optional Variables

- **RPC URLs**: Custom RPC endpoints for each network
- **API Keys**: Block explorer API keys for contract verification
  - `ETHERSCAN_API_KEY`
  - `POLYGONSCAN_API_KEY`
  - `BSCSCAN_API_KEY`
  - `OPTIMISM_API_KEY`
  - `ARBISCAN_API_KEY`
  - `SNOWTRACE_API_KEY`
  - `BASESCAN_API_KEY`
- **Gas Reporter**: 
  - `REPORT_GAS=true`
  - `COINMARKETCAP_API_KEY`
  - `GAS_REPORTER_CURRENCY=USD`

## 🚀 Deployment

### Local Network

```bash
# Terminal 1: Start local node
npx hardhat node

# Terminal 2: Deploy
npx hardhat run scripts/deploy.ts --network localhost
```

### Testnet Deployment

```bash
npx hardhat run scripts/deploy.ts --network sepolia
```

### Mainnet Deployment

```bash
npm run deploy:voice
# or
npx hardhat run scripts/deploy.ts --network mainnet
```

⚠️ **WARNING**: Always test on testnets first!

## 🔍 Contract Verification

After deployment, verify your contract on block explorers:

```bash
npx hardhat verify --network mainnet DEPLOYED_CONTRACT_ADDRESS
```

## 🧪 Testing

Tests are written using:
- **Hardhat**: Ethereum development environment
- **Chai**: Assertion library
- **Waffle**: Smart contract testing utilities

### Example Test

```typescript
import { expect } from 'chai';
import { ethers } from 'hardhat';

describe('SafeVoiceVault', function () {
  it('Should deploy successfully', async function () {
    const SafeVoiceVault = await ethers.getContractFactory('SafeVoiceVault');
    const vault = await SafeVoiceVault.deploy();
    await vault.deployed();
    
    expect(await vault.owner()).to.not.equal(ethers.constants.AddressZero);
  });
});
```

Run tests:

```bash
npx hardhat test
```

## 📊 Coverage Thresholds

Coverage thresholds are enforced in CI:
- **Statements**: 90%
- **Branches**: 80%
- **Functions**: 90%
- **Lines**: 90%

Run coverage check:

```bash
npm run security:coverage
```

## ⛽ Gas Optimization

Gas usage is tracked for all contract methods. Review gas reports in `gas-report.txt`.

Enable gas reporting:

```bash
REPORT_GAS=true npm run test:contracts
```

## 🔒 Security

### Best Practices

1. **Never commit private keys** - Use `.env` files (gitignored)
2. **Test thoroughly** - Write comprehensive tests
3. **Audit contracts** - Get professional audits before mainnet
4. **Use OpenZeppelin** - Leverage battle-tested libraries
5. **Follow checks-effects-interactions** - Prevent reentrancy

### Security Auditing Tools

```bash
# Static analysis with Slither
pip3 install slither-analyzer
slither .

# Mythril analysis
docker run -v $(pwd):/tmp mythril/myth analyze /tmp/contracts/src/SafeVoiceVault.sol
```

## 📚 Documentation

- [Hardhat Documentation](https://hardhat.org/docs)
- [OpenZeppelin Contracts](https://docs.openzeppelin.com/contracts)
- [Ethers.js Documentation](https://docs.ethers.org/)
- [Solidity Documentation](https://docs.soliditylang.org/)

## 🛠️ Custom Tasks

You can create custom Hardhat tasks in the `tasks/` directory.

Example task:

```typescript
// tasks/balance.ts
import { task } from 'hardhat/config';

task('balance', 'Prints an account balance')
  .addParam('account', "The account's address")
  .setAction(async (taskArgs, hre) => {
    const balance = await hre.ethers.provider.getBalance(taskArgs.account);
    console.log(hre.ethers.utils.formatEther(balance), 'ETH');
  });
```

## 🤝 Contributing

When adding new contracts:

1. Write contracts in `contracts/src/`
2. Add tests in `contracts/test/`
3. Document functionality
4. Ensure tests pass and coverage thresholds are met
5. Run linter: `npm run lint:contracts`
6. Update this README if adding new features

## 📄 License

See the LICENSE file in the project root.
