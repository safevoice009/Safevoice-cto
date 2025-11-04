# Voice Achievement NFT Documentation

## Overview

The **VoiceAchievementNFT** contract is an ERC1155 multi-token standard NFT system designed to reward users for milestone achievements and community contributions. The contract supports soulbound (non-transferable) tokens, role-based minting, flexible metadata management, and cross-chain bridging.

## Contract Details

- **Standard**: ERC1155 (Multi-Token Standard)
- **Location**: `contracts/src/VoiceAchievementNFT.sol`
- **Name**: Voice Achievement
- **Symbol**: vACHV

## Why ERC1155?

ERC1155 was chosen over ERC721 for several key advantages:

1. **Gas Efficiency**: Batch minting multiple achievements to one or many users uses significantly less gas
2. **Flexible Supply**: Supports both unique (1-of-1) and edition-based (e.g., 1000 "First Post" badges) achievements
3. **Multi-Token Operations**: Transfer, mint, or query multiple token types in a single transaction
4. **Better Metadata Management**: Each token ID represents an achievement type with shared metadata

## Core Features

### 1. Role-Based Access Control

The contract uses OpenZeppelin's AccessControl for fine-grained permissions:

| Role | Purpose | Key Functions |
|------|---------|---------------|
| `DEFAULT_ADMIN_ROLE` | Master admin - manages roles, pause, soulbound config | `grantRole`, `setSoulbound`, `emergencyPause` |
| `MINTER_ROLE` | Mint achievements (RewardEngine, admins) | `mint`, `mintBatch`, `airdrop` |
| `URI_MANAGER_ROLE` | Update metadata URIs | `setBaseURI`, `setTokenURI`, `setAchievementMetadata` |
| `BRIDGE_ROLE` | Cross-chain NFT operations | `bridgeTransfer`, `bridgeReceive` |

### 2. Soulbound (Non-Transferable) NFTs

Specific achievement types can be configured as "soulbound" - permanently bound to the recipient's wallet and non-transferable:

```solidity
// Make legendary achievements non-transferable
achievementNFT.setSoulbound(TOKEN_ID_LEGEND, true);

// Batch configure soulbound status
uint256[] tokenIds = [100, 101, 102]; // Legendary tier
bool[] statuses = [true, true, true];
achievementNFT.setSoulboundBatch(tokenIds, statuses);
```

**Use Cases for Soulbound:**
- Exclusive legendary achievements
- Founder/early adopter badges
- Reputation-based credentials
- Proof of attendance (POAPs)

**Important Notes:**
- Soulbound tokens can still be burned by their owner
- Minting and burning are always allowed regardless of soulbound status
- Only transfers between addresses are blocked
- Soulbound tokens cannot be bridged to other chains

### 3. Metadata Management

The contract provides flexible, hierarchical URI resolution:

#### Hierarchy (highest priority first):
1. **Token-specific URI** (overrides all)
2. **Chain-specific base URI** (for cross-chain deployments)
3. **Global base URI** (default)
4. **Fallback to constructor URI**

#### Setting URIs:

```solidity
// Set global base URI
achievementNFT.setBaseURI("https://api.safevoice.app/metadata/achievements/");
// Results in: https://api.safevoice.app/metadata/achievements/1.json

// Set chain-specific URI (e.g., Polygon)
achievementNFT.setChainBaseURI(137, "https://polygon-api.safevoice.app/metadata/");

// Override specific token URI (e.g., for IPFS pinning)
achievementNFT.setTokenURI(100, "ipfs://QmLegendaryHash");

// Store on-chain metadata description
achievementNFT.setAchievementMetadata(1, '{"name":"First Post","description":"Created your first post","tier":"bronze"}');
```

### 4. Minting Operations

#### Single Mint
```solidity
// Mint one achievement to a user
achievementNFT.mint(userAddress, TOKEN_ID_FIRST_POST, 1, "0x");
```

#### Batch Mint (Same Recipient)
```solidity
// Mint multiple achievements to one user
uint256[] memory tokenIds = [1, 2, 3];
uint256[] memory amounts = [1, 1, 1];
achievementNFT.mintBatch(userAddress, tokenIds, amounts, "0x");
```

#### Airdrop (Multiple Recipients)
```solidity
// Distribute achievements to multiple users efficiently
address[] memory recipients = [user1, user2, user3];
uint256[] memory tokenIds = [1, 1, 1]; // All get "First Post"
uint256[] memory amounts = [1, 1, 1];
achievementNFT.airdrop(recipients, tokenIds, amounts);
```

### 5. Cross-Chain Bridge Support

For multi-chain deployments, achievements can be bridged between networks:

```solidity
// Bridge achievement from Ethereum to Polygon
achievementNFT.bridgeTransfer(userAddress, TOKEN_ID_FIRST_POST, 1, 137); // 137 = Polygon

// Receive achievement on destination chain
achievementNFT.bridgeReceive(userAddress, TOKEN_ID_FIRST_POST, 1, "https://polygon-api.safevoice.app/metadata/1.json");
```

**Bridge Restrictions:**
- Soulbound tokens cannot be bridged
- Only `BRIDGE_ROLE` can initiate transfers
- Source chain burns tokens, destination chain mints

### 6. Emergency Controls

```solidity
// Pause all operations (minting, transfers, burning)
achievementNFT.emergencyPause("Security incident detected");

// Resume operations
achievementNFT.emergencyUnpause();
```

## Achievement Token IDs (Suggested Schema)

Token IDs should be organized by category and tier:

### Tier System
- **1-99**: Bronze tier (common achievements)
- **100-199**: Silver tier (uncommon achievements)
- **200-299**: Gold tier (rare achievements)
- **300-399**: Platinum tier (epic achievements)
- **400-499**: Diamond tier (legendary achievements)
- **500+**: Special/seasonal achievements

### Example Token IDs

| ID | Name | Tier | Soulbound | Description |
|----|------|------|-----------|-------------|
| 1 | First Post | Bronze | No | Created your first post |
| 2 | Weekly Warrior | Bronze | No | Maintained 7-day login streak |
| 3 | Helpful Hero | Bronze | No | Received 5 helpful reactions |
| 100 | Community Champion | Silver | No | Helped 50 community members |
| 101 | Crisis Responder | Silver | Yes | Provided support during crisis |
| 200 | Support Sage | Gold | Yes | Top 10% most helpful users |
| 300 | Voice Legend | Platinum | Yes | Earned over 10,000 VOICE |
| 400 | Founder | Diamond | Yes | Early platform supporter |

## Integration with RewardEngine

The RewardEngine should trigger achievement mints based on user milestones:

### Example Integration Pattern

```typescript
// In RewardEngine or backend service
class AchievementService {
  async checkAndMintAchievements(userId: string, event: string) {
    const user = await getUserData(userId);
    const wallet = await getUserWallet(userId);
    
    if (!wallet) return;

    // Check for achievement milestones
    if (event === 'POST_CREATED' && user.postCount === 1) {
      // First post achievement
      await achievementNFT.mint(wallet, TOKEN_ID_FIRST_POST, 1, "0x");
      await notifyUser(userId, "Achievement unlocked: First Post! 🎉");
    }
    
    if (event === 'STREAK_MILESTONE' && user.currentStreak === 7) {
      // 7-day streak achievement
      await achievementNFT.mint(wallet, TOKEN_ID_WEEKLY_STREAK, 1, "0x");
      await notifyUser(userId, "Achievement unlocked: Weekly Warrior! 🔥");
    }
    
    if (event === 'HELPFUL_COUNT' && user.helpfulCount >= 5) {
      // Helpful hero achievement
      await achievementNFT.mint(wallet, TOKEN_ID_HELPER, 1, "0x");
      await notifyUser(userId, "Achievement unlocked: Helpful Hero! ⭐");
    }
  }
}
```

### Achievement Triggers

| Trigger Event | Achievement | Token ID | Condition |
|--------------|-------------|----------|-----------|
| First post created | First Post | 1 | postCount === 1 |
| 7-day login streak | Weekly Warrior | 2 | streak === 7 |
| 5 helpful reactions | Helpful Hero | 3 | helpfulCount >= 5 |
| 30-day login streak | Monthly Master | 4 | streak === 30 |
| 100 posts created | Prolific Poster | 10 | postCount === 100 |
| 50 helpful reactions | Community Champion | 100 | helpfulCount >= 50 |
| Crisis support | Crisis Responder | 101 | crisisResponseCount >= 1 |
| Top 10% helpful | Support Sage | 200 | helpfulRank <= 10% |
| 10,000 VOICE earned | Voice Legend | 300 | totalEarned >= 10000 |
| Early adopter | Founder | 400 | joinedBefore('2024-01-01') |

## UI Display and Integration

### Frontend Display Example

```typescript
// src/components/AchievementDisplay.tsx
import { useContractRead } from 'wagmi';
import { getContractAbi } from '@/lib/contracts/abis';

export function AchievementDisplay({ userAddress }: { userAddress: string }) {
  const achievementTokenIds = [1, 2, 3, 100, 101, 200, 300, 400];
  
  // Fetch all achievement balances
  const { data: balances } = useContractRead({
    address: ACHIEVEMENT_NFT_ADDRESS,
    abi: getContractAbi('VoiceAchievementNFT'),
    functionName: 'balanceOfBatch',
    args: [
      achievementTokenIds.map(() => userAddress),
      achievementTokenIds
    ],
  });

  const achievements = achievementTokenIds.map((tokenId, index) => ({
    tokenId,
    balance: balances?.[index] || 0,
    unlocked: balances?.[index] > 0,
  }));

  return (
    <div className="achievement-grid">
      {achievements.map(achievement => (
        <AchievementCard 
          key={achievement.tokenId}
          tokenId={achievement.tokenId}
          unlocked={achievement.unlocked}
          count={achievement.balance}
        />
      ))}
    </div>
  );
}

// src/components/AchievementCard.tsx
export function AchievementCard({ tokenId, unlocked, count }: Props) {
  const { data: metadata } = useContractRead({
    address: ACHIEVEMENT_NFT_ADDRESS,
    abi: getContractAbi('VoiceAchievementNFT'),
    functionName: 'uri',
    args: [tokenId],
  });

  const [nftData, setNftData] = useState(null);

  useEffect(() => {
    if (metadata) {
      fetch(metadata)
        .then(res => res.json())
        .then(setNftData);
    }
  }, [metadata]);

  return (
    <div className={`achievement-card ${unlocked ? 'unlocked' : 'locked'}`}>
      <img src={nftData?.image || '/placeholder-achievement.png'} alt={nftData?.name} />
      <h3>{nftData?.name}</h3>
      <p>{nftData?.description}</p>
      {count > 1 && <span className="count">x{count}</span>}
      {!unlocked && <div className="locked-overlay">🔒</div>}
    </div>
  );
}
```

### Achievement Notification System

```typescript
// Integrate with RewardEngine events
rewardEngine.on('achievement:unlocked', (tokenId: number, metadata: any) => {
  toast.success(
    <div>
      <strong>🎉 Achievement Unlocked!</strong>
      <p>{metadata.name}</p>
      <small>{metadata.description}</small>
    </div>,
    {
      duration: 5000,
      icon: '🏆',
    }
  );
});
```

## Metadata JSON Schema

### Standard ERC1155 Metadata

Each achievement should have a JSON metadata file following the standard:

```json
{
  "name": "First Post",
  "description": "You created your first post on SafeVoice! This is the beginning of your journey in the community.",
  "image": "https://cdn.safevoice.app/achievements/first-post.png",
  "animation_url": "https://cdn.safevoice.app/achievements/first-post.mp4",
  "external_url": "https://safevoice.app/achievements/1",
  "attributes": [
    {
      "trait_type": "Tier",
      "value": "Bronze"
    },
    {
      "trait_type": "Category",
      "value": "Content Creation"
    },
    {
      "trait_type": "Rarity",
      "value": "Common"
    },
    {
      "trait_type": "Soulbound",
      "value": "No"
    },
    {
      "trait_type": "Points",
      "value": 10
    }
  ]
}
```

## Cross-Chain Metadata Hosting

For multi-chain deployments, consider these strategies:

### 1. IPFS Pinning (Recommended)
- Immutable metadata
- Decentralized storage
- Works across all chains
- Use Pinata, NFT.Storage, or Web3.Storage

```typescript
// Pin metadata to IPFS
const metadata = { name: "First Post", ... };
const ipfsHash = await pinataClient.pinJSON(metadata);
const ipfsURI = `ipfs://${ipfsHash}`;

// Set immutable token URI
await achievementNFT.setTokenURI(tokenId, ipfsURI);
```

### 2. Chain-Specific Endpoints
- Different API per chain
- Allows chain-specific customization
- Centralized but flexible

```solidity
// Ethereum
achievementNFT.setChainBaseURI(1, "https://eth-api.safevoice.app/metadata/");

// Polygon
achievementNFT.setChainBaseURI(137, "https://polygon-api.safevoice.app/metadata/");

// Arbitrum
achievementNFT.setChainBaseURI(42161, "https://arb-api.safevoice.app/metadata/");
```

### 3. Unified Gateway
- Single endpoint serving all chains
- Chain ID in request headers
- Simplest to maintain

## Deployment Guide

### 1. Deploy Contract

```bash
# Deploy to testnet
npx hardhat deploy --tags VoiceAchievementNFT --network sepolia

# Deploy to mainnet
npx hardhat deploy --tags VoiceAchievementNFT --network mainnet
```

### 2. Configure Roles

```typescript
// Grant minter role to RewardEngine backend
await achievementNFT.grantRole(MINTER_ROLE, REWARD_ENGINE_ADDRESS);

// Grant URI manager role to admin wallet
await achievementNFT.grantRole(URI_MANAGER_ROLE, ADMIN_ADDRESS);

// Grant bridge role to cross-chain bridge contract
await achievementNFT.grantRole(BRIDGE_ROLE, BRIDGE_CONTRACT_ADDRESS);
```

### 3. Configure Achievement Tiers

```typescript
// Set soulbound status for legendary achievements
const legendaryIds = [300, 301, 302, 400, 401];
const soulboundStatus = [true, true, true, true, true];
await achievementNFT.setSoulboundBatch(legendaryIds, soulboundStatus);

// Set custom metadata for special achievements
await achievementNFT.setAchievementMetadata(
  400,
  JSON.stringify({
    name: "Founder",
    tier: "Diamond",
    description: "Early platform supporter and community pioneer"
  })
);
```

### 4. Export ABI for Frontend

```bash
npm run export:abis
```

This will include VoiceAchievementNFT in the generated `src/lib/contracts/abis.ts` file.

## Security Considerations

1. **Role Management**: Use a multisig for DEFAULT_ADMIN_ROLE in production
2. **Metadata Hosting**: Use IPFS for immutable achievements, especially soulbound ones
3. **Pausability**: Monitor for suspicious activity and be prepared to pause
4. **Bridge Security**: Ensure bridge contracts are audited and properly secured
5. **Soulbound Verification**: UI should clearly indicate which achievements are soulbound

## Testing

Run the comprehensive test suite:

```bash
npm run hardhat:test -- contracts/test/VoiceAchievementNFT.test.cjs
```

**Test Coverage:**
- ✅ Deployment and initialization
- ✅ Role management
- ✅ Single and batch minting
- ✅ Airdrop functionality
- ✅ Soulbound token restrictions
- ✅ URI management and hierarchy
- ✅ Bridge operations
- ✅ Pause/unpause functionality
- ✅ Supply tracking
- ✅ Burning operations
- ✅ Interface support

## Future Enhancements

1. **Dynamic NFTs**: Update achievement visuals based on user progress
2. **Achievement Stacking**: Combine lower-tier achievements into higher ones
3. **Rarity System**: Implement truly unique 1-of-1 achievements
4. **Social Features**: Share achievement unlocks on social media
5. **Achievement Marketplace**: Allow trading of non-soulbound achievements
6. **Leaderboards**: Track top achievers by category
7. **Seasonal Achievements**: Time-limited special achievements

## Support

For questions or issues:
- Review test cases: `contracts/test/VoiceAchievementNFT.test.cjs`
- Check deployment logs: `deployments/<network>/VoiceAchievementNFT.json`
- Contract source: `contracts/src/VoiceAchievementNFT.sol`
