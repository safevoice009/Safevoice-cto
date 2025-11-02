# VoiceToken Contract API Documentation

## Overview

**VoiceToken** is an ERC20 token contract that powers the SafeVoice platform's token economy. Built on OpenZeppelin's battle-tested contracts, it implements role-based access control, supply cap enforcement, emergency pause functionality, and cross-chain bridge support.

## Contract Details

- **Name**: Voice Token
- **Symbol**: VOICE
- **Decimals**: 18
- **Supply Cap**: 1,000,000,000 VOICE (1 billion tokens)
- **Standard**: ERC20 with extensions (EIP-2612, Pausable, Burnable, AccessControl)

## Features

### 1. Supply Cap
- Maximum supply of 1 billion tokens
- Prevents infinite inflation
- Minting automatically stops at cap
- Emits `SupplyCapReached` event when limit is hit

### 2. Role-Based Access Control
Four distinct roles manage different aspects of the token:

- **DEFAULT_ADMIN_ROLE**: Contract administration
  - Grant and revoke roles
  - Emergency pause/unpause
  - Initial role assigned to deployer

- **MINTER_ROLE**: Token creation
  - Mint new tokens up to supply cap
  - Typically granted to reward systems

- **BURNER_ROLE**: Token destruction
  - Burn tokens from any address
  - Used for deflationary mechanisms

- **BRIDGE_ROLE**: Cross-chain operations
  - Bridge tokens to other chains
  - Receive tokens from other chains

### 3. EIP-2612 Permit Support
- Gasless approvals using off-chain signatures
- Compatible with meta-transaction patterns
- Enables better UX for end users

### 4. Pausable Emergency Controls
- Admin can pause all token operations
- Protects against security incidents
- Can be unpaused by admin when safe

### 5. Bridge Integration
- Dedicated functions for cross-chain transfers
- Burns tokens on source chain
- Mints tokens on destination chain
- Emits events for bridge monitoring

## Core Functions

### Token Operations

#### `mint(address to, uint256 amount)`
Mints new tokens to a specified address.

**Access**: MINTER_ROLE  
**Conditions**: 
- Contract must not be paused
- Total supply + amount must not exceed cap
- `to` cannot be zero address
- `amount` must be greater than zero

**Events**: 
- `TokensMinted(to, amount, minter)`
- `SupplyCapReached(totalSupply)` (if cap is reached)

**Example**:
```solidity
// Mint 1000 VOICE tokens to user
voiceToken.mint(userAddress, 1000 * 10**18);
```

#### `burnFrom(address from, uint256 amount)`
Burns tokens from a specified address.

**Access**: BURNER_ROLE  
**Conditions**:
- `from` cannot be zero address
- `amount` must be greater than zero
- `from` must have sufficient balance

**Events**: `TokensBurned(from, amount, burner)`

**Example**:
```solidity
// Burn 500 VOICE tokens
voiceToken.burnFrom(userAddress, 500 * 10**18);
```

#### `burn(uint256 amount)`
Allows users to burn their own tokens.

**Access**: Anyone (burns their own tokens)  
**Inherited from**: ERC20Burnable

### Bridge Operations

#### `bridgeTransfer(address from, uint256 amount, uint256 destinationChainId)`
Initiates a cross-chain transfer by burning tokens.

**Access**: BRIDGE_ROLE  
**Conditions**:
- Contract must not be paused
- `from` must have sufficient balance

**Events**: `BridgeTransfer(from, address(0), amount, destinationChainId)`

**Example**:
```solidity
// Bridge 1000 VOICE to Polygon (chainId 137)
voiceToken.bridgeTransfer(userAddress, 1000 * 10**18, 137);
```

#### `bridgeReceive(address to, uint256 amount, uint256 sourceChainId)`
Completes a cross-chain transfer by minting tokens.

**Access**: BRIDGE_ROLE  
**Conditions**:
- Contract must not be paused
- Total supply + amount must not exceed cap

**Events**: `BridgeTransfer(address(0), to, amount, sourceChainId)`

**Example**:
```solidity
// Receive 1000 VOICE from Ethereum (chainId 1)
voiceToken.bridgeReceive(userAddress, 1000 * 10**18, 1);
```

### Emergency Controls

#### `emergencyPause(string reason)`
Pauses all token operations.

**Access**: DEFAULT_ADMIN_ROLE  
**Events**: `EmergencyPause(admin, reason)`

**Example**:
```solidity
voiceToken.emergencyPause("Security incident detected");
```

#### `emergencyUnpause()`
Resumes normal token operations.

**Access**: DEFAULT_ADMIN_ROLE  
**Events**: `EmergencyUnpause(admin)`

**Example**:
```solidity
voiceToken.emergencyUnpause();
```

### Role Management

#### `grantRole(bytes32 role, address account)`
Grants a role to an address.

**Access**: DEFAULT_ADMIN_ROLE  
**Inherited from**: AccessControl

**Example**:
```solidity
// Grant minter role to reward system
bytes32 MINTER_ROLE = keccak256("MINTER_ROLE");
voiceToken.grantRole(MINTER_ROLE, rewardSystemAddress);
```

#### `revokeRole(bytes32 role, address account)`
Revokes a role from an address.

**Access**: DEFAULT_ADMIN_ROLE  
**Inherited from**: AccessControl

#### `renounceRole(bytes32 role, address account)`
Allows an address to give up their own role.

**Access**: Role holder (for their own address)  
**Inherited from**: AccessControl

### View Functions

#### `balanceOf(address account) → uint256`
Returns the token balance of an address.

**Example**:
```solidity
uint256 balance = voiceToken.balanceOf(userAddress);
// Returns balance in wei (1 VOICE = 1e18 wei)
```

#### `totalSupply() → uint256`
Returns the current total supply.

#### `remainingMintableSupply() → uint256`
Returns how many tokens can still be minted before hitting the cap.

**Example**:
```solidity
uint256 remaining = voiceToken.remainingMintableSupply();
// Returns amount in wei
```

#### `isSupplyCapReached() → bool`
Returns true if total supply equals the supply cap.

#### `SUPPLY_CAP() → uint256`
Returns the maximum supply cap (1 billion tokens).

#### `paused() → bool`
Returns true if contract is paused.

#### `hasRole(bytes32 role, address account) → bool`
Checks if an address has a specific role.

**Example**:
```solidity
bool isMinter = voiceToken.hasRole(MINTER_ROLE, address);
```

### Utility Functions

#### `batchTransfer(address[] recipients, uint256[] amounts) → bool`
Transfers tokens to multiple addresses in one transaction.

**Access**: Anyone (from their own balance)  
**Conditions**:
- Contract must not be paused
- Arrays must have equal length
- Arrays must not be empty
- Sender must have sufficient balance

**Example**:
```solidity
address[] memory recipients = [addr1, addr2, addr3];
uint256[] memory amounts = [100e18, 200e18, 300e18];
voiceToken.batchTransfer(recipients, amounts);
```

### EIP-2612 Permit

#### `permit(address owner, address spender, uint256 value, uint256 deadline, uint8 v, bytes32 r, bytes32 s)`
Sets approval using an off-chain signature.

**Access**: Anyone (with valid signature)  
**Inherited from**: ERC20Permit

**Example** (ethers.js):
```javascript
const domain = {
  name: 'Voice Token',
  version: '1',
  chainId: chainId,
  verifyingContract: tokenAddress
};

const types = {
  Permit: [
    { name: 'owner', type: 'address' },
    { name: 'spender', type: 'address' },
    { name: 'value', type: 'uint256' },
    { name: 'nonce', type: 'uint256' },
    { name: 'deadline', type: 'uint256' }
  ]
};

const signature = await signer._signTypedData(domain, types, value);
const { v, r, s } = ethers.utils.splitSignature(signature);

await token.permit(owner, spender, value, deadline, v, r, s);
```

## Events

### `TokensMinted(address indexed to, uint256 amount, address indexed minter)`
Emitted when tokens are minted.

### `TokensBurned(address indexed from, uint256 amount, address indexed burner)`
Emitted when tokens are burned.

### `BridgeTransfer(address indexed from, address indexed to, uint256 amount, uint256 indexed chainId)`
Emitted during bridge operations.
- Outgoing: `from` = user, `to` = address(0)
- Incoming: `from` = address(0), `to` = user

### `SupplyCapReached(uint256 totalSupply)`
Emitted when minting reaches the supply cap.

### `EmergencyPause(address indexed admin, string reason)`
Emitted when contract is paused.

### `EmergencyUnpause(address indexed admin)`
Emitted when contract is unpaused.

## Custom Errors

### `SupplyCapExceeded(uint256 attemptedSupply, uint256 cap)`
Thrown when attempting to mint beyond the supply cap.

### `InsufficientBalance(address account, uint256 balance, uint256 required)`
Thrown when attempting to burn/transfer more than available balance.

### `ZeroAddress()`
Thrown when a zero address is provided where not allowed.

### `ZeroAmount()`
Thrown when attempting to mint/burn/transfer zero tokens.

## Integration with RewardEngine

The VoiceToken contract is designed to integrate seamlessly with SafeVoice's RewardEngine:

### Setup
1. Deploy VoiceToken contract
2. Grant MINTER_ROLE to RewardEngine address
3. Configure RewardEngine with token address

### Usage
```typescript
// In RewardEngine or similar system
interface IVoiceToken {
  mint(to: string, amount: BigNumber): Promise<void>;
  balanceOf(account: string): Promise<BigNumber>;
}

// Award tokens to user
async function awardTokens(user: string, amount: number) {
  const amountWei = ethers.utils.parseEther(amount.toString());
  await voiceToken.mint(user, amountWei);
}

// Check user balance
async function getUserBalance(user: string) {
  const balance = await voiceToken.balanceOf(user);
  return ethers.utils.formatEther(balance);
}
```

## Security Considerations

### 1. Role Management
- Only grant roles to trusted addresses
- Regularly audit role assignments
- Use multi-sig for admin role in production

### 2. Supply Cap
- Cap is immutable after deployment
- Plan token economics carefully
- Consider future needs before deployment

### 3. Emergency Pause
- Use only for genuine emergencies
- Document reason for pause
- Unpause as soon as safe

### 4. Bridge Operations
- Implement proper validation on bridge contract
- Monitor bridge events closely
- Consider rate limiting for large transfers

### 5. Access Control
- Never share private keys
- Use hardware wallets for admin operations
- Implement timelock for sensitive operations

## Gas Optimization

The contract is optimized for gas efficiency:

- **Mint**: ~140,000 gas
- **Transfer**: ~65,000 gas
- **Burn**: ~80,000 gas
- **Batch Transfer (3 recipients)**: ~180,000 gas

Use batch operations when possible to save gas on multiple transfers.

## Testing

Comprehensive test coverage includes:
- Deployment and initialization
- Role management (grant, revoke, renounce)
- Minting (normal and edge cases)
- Supply cap enforcement
- Burning operations
- Bridge transfers (send and receive)
- Pause/unpause functionality
- EIP-2612 permit functionality
- Batch transfers
- Gas usage benchmarks
- RewardEngine compatibility

Run tests:
```bash
npm run test:contracts
```

Check coverage:
```bash
npm run coverage:contracts
```

## Deployment Checklist

- [ ] Review and test on testnet
- [ ] Verify supply cap is correct
- [ ] Prepare admin address (preferably multi-sig)
- [ ] Deploy contract
- [ ] Verify contract on block explorer
- [ ] Grant MINTER_ROLE to reward system
- [ ] Grant BURNER_ROLE if needed
- [ ] Grant BRIDGE_ROLE to bridge contract
- [ ] Export and save ABI
- [ ] Update frontend configuration
- [ ] Document all addresses
- [ ] Test basic operations
- [ ] Monitor for issues

## Support and Resources

- **Contract Source**: `/contracts/src/VoiceToken.sol`
- **Tests**: `/contracts/test/VoiceToken.test.ts`
- **Deployment Script**: `/contracts/deploy/002_deploy_voice_token.ts`
- **OpenZeppelin Docs**: https://docs.openzeppelin.com/contracts
- **Hardhat Docs**: https://hardhat.org/docs

For additional support or questions, consult the team or refer to the main project documentation.
