# IPFS Integration Implementation

## Overview

This implementation adds IPFS (InterPlanetary File System) integration to SafeVoice, allowing users to opt-in to storing their post content on a decentralized storage network. This provides an immutable, censorship-resistant backup of user content.

## Features Implemented

### 1. IPFS HTTP Client (`src/lib/ipfs.ts`)

A helper module that provides:

- **`uploadToIPFS(content, userOptedIn)`**: Uploads text content to IPFS with graceful failure handling
  - Returns `{ success: boolean, cid?: string, error?: string }`
  - Connects to local IPFS node at `http://localhost:5001` by default
  - Fails gracefully if IPFS node is unavailable
  - Requires user opt-in flag to upload

- **`getIPFSGatewayUrl(cid, gatewayIndex?)`**: Returns IPFS gateway URL for a given CID
  - Supports multiple public gateways (ipfs.io, dweb.link, pinata, cloudflare)
  - Can specify gateway index to use different gateways

- **`getAllGatewayUrls(cid)`**: Returns all gateway URLs for redundancy

- **`verifyIPFSContent(cid, originalContent)`**: Verifies content integrity
  - Fetches content from IPFS gateways
  - Compares with original content
  - Tries multiple gateways for reliability

### 2. Post Metadata Updates (`src/lib/store.ts`)

- Added `ipfsCid?: string | null` field to `Post` interface
- Added `ipfsCid?: string | null` field to `AddPostPayload` interface  
- Updated `addPost` function signature to accept optional `ipfsCid` parameter
- CID is stored in post metadata when IPFS upload succeeds

### 3. CreatePost Component Updates (`src/components/feed/CreatePost.tsx`)

Added "Store on IPFS" checkbox:

- **UI**: Checkbox with database icon and explanatory text
- **Behavior**: 
  - Unchecked by default
  - When checked, attempts to upload content to IPFS before creating post
  - Shows success toast if upload succeeds with CID
  - Shows error toast if upload fails, but still creates post
  - Post creation continues even if IPFS upload fails (graceful degradation)
- **State**: `storeOnIPFS` state controls checkbox and upload behavior

### 4. PostCard Component Updates (`src/components/feed/PostCard.tsx`)

Display IPFS metadata when available:

- **Badge**: Shows "Decentralized" badge on posts with IPFS CID
- **Metadata Section**: Displays below author badges when `post.ipfsCid` exists
  - Shows full CID with "Decentralized storage" label
  - "Open" link to view content via IPFS gateway (opens in new tab)
  - "Verify" button to check content integrity
  
- **Verification**:
  - Button shows loading state ("Verifying...") during check
  - Shows checkmark and "Verified" state when content matches
  - Success toast when verification succeeds
  - Error toast when verification fails
  - Compares decrypted content for encrypted posts

### 5. Crisis Modal Integration (`src/App.tsx`)

- Updated `handleCrisisAcknowledge` to pass `ipfsCid` when posting pending crisis posts
- Ensures IPFS CID is preserved when crisis posts are confirmed

## Technical Details

### Dependencies

- **`ipfs-http-client@60.0.1`**: Official IPFS HTTP client for JavaScript
- **`@testing-library/user-event@14.5.2`**: Added for test interactions

### Gateway Configuration

Four public IPFS gateways are configured for redundancy:
1. `https://ipfs.io/ipfs/`
2. `https://dweb.link/ipfs/`
3. `https://gateway.pinata.cloud/ipfs/`
4. `https://cloudflare-ipfs.com/ipfs/`

### Error Handling

- IPFS client initialization failures are caught and logged
- Upload timeouts after 15 seconds
- Gateway verification tries all gateways before failing
- Post creation never blocks on IPFS failures (graceful degradation)

### Privacy & Security

- **Opt-in only**: Users must explicitly check the box to use IPFS
- **No tracking**: No user identifiers are uploaded to IPFS
- **Content-only**: Only post text content is uploaded, no metadata
- **Immutable**: Once uploaded to IPFS, content cannot be changed
- **Verifiable**: Content integrity can be verified at any time

## Testing

### Unit Tests

1. **`src/lib/__tests__/ipfs.test.ts`** (13 tests)
   - User opt-in validation
   - Empty content handling
   - Client initialization failures
   - Gateway URL generation
   - Content verification (success/failure cases)

2. **`src/components/feed/__tests__/CreatePost.ipfs.test.tsx`** (8 tests)
   - Checkbox display and toggling
   - IPFS upload when enabled/disabled
   - CID passing to addPost
   - Graceful failure handling

3. **`src/components/feed/__tests__/PostCard.ipfs.test.tsx`** (7 tests)
   - CID and badge display
   - Gateway link rendering
   - Verify button functionality
   - Verification state management

All tests pass successfully with proper mocking.

## Usage

### For Users

1. Create a new post in SafeVoice
2. Expand the post form
3. Check the "Store on IPFS" checkbox
4. Create the post normally
5. If IPFS upload succeeds:
   - Success toast shows "Content stored on IPFS! 📦"
   - Post displays "Decentralized" badge
   - CID and verification tools are available

6. View IPFS posts:
   - Click "Open" to view content via IPFS gateway
   - Click "Verify" to check content integrity

### For Developers

#### Running IPFS Node

To enable uploads, run a local IPFS node:

```bash
# Install IPFS
# See: https://docs.ipfs.tech/install/

# Initialize IPFS
ipfs init

# Start daemon
ipfs daemon
```

The client will connect to `http://localhost:5001` by default.

#### Accessing IPFS Content

Content can be accessed via:
- Local gateway: `http://localhost:8080/ipfs/<CID>`
- Public gateways: See `IPFS_GATEWAYS` array in `src/lib/ipfs.ts`

#### Customization

To add more gateways or change configuration:

```typescript
// src/lib/ipfs.ts
const IPFS_GATEWAYS = [
  'https://ipfs.io/ipfs/',
  'https://your-custom-gateway.com/ipfs/',
  // ... add more
];

// Change local node URL
ipfsClient = create({
  url: 'http://your-ipfs-node:5001',
  timeout: 10000,
});
```

## Limitations & Future Improvements

### Current Limitations

1. **No Pinning Service**: Content may not persist indefinitely without a pinning service
2. **Local Node Required**: Uploads require running local IPFS node
3. **Text Only**: Only post text is uploaded, not images or attachments
4. **No Batch Operations**: Each post uploads individually

### Future Enhancements

- [ ] Integrate with pinning services (Pinata, web3.storage, etc.)
- [ ] Support for image uploads to IPFS
- [ ] Bulk export/import of posts via IPFS
- [ ] IPNS support for mutable references
- [ ] Encryption of IPFS content with post encryption keys
- [ ] Community IPFS node for seamless uploads
- [ ] IPFS CID indexing for faster discovery

## Architecture Decisions

1. **Opt-in by Default**: Privacy-first approach, users control their data
2. **Graceful Degradation**: Post creation never fails due to IPFS issues
3. **Multiple Gateways**: Redundancy ensures content availability
4. **Local-first**: Attempts local node before considering remote services
5. **Content-only**: Only text content uploaded, protecting user privacy

## References

- [IPFS Documentation](https://docs.ipfs.tech/)
- [ipfs-http-client API](https://github.com/ipfs/js-ipfs/tree/master/packages/ipfs-http-client)
- [IPFS Best Practices](https://docs.ipfs.tech/concepts/best-practices/)
