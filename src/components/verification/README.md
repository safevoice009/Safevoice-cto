# VerificationStatus Component

A reusable component that displays student verification status with wallet information, status badges, and contextual messages.

## Features

- **Status Display**: Shows verification state (Verified, Expired, Pending, Re-verification Required)
- **Wallet Display**: Shows abbreviated wallet address with optional toggle
- **i18n Support**: Fully translated in 6 languages (en, hi, bn, ta, te, mr)
- **Customizable**: Flexible styling with className props
- **Responsive**: Supports 3 sizes (sm, md, lg)
- **Self-contained**: No network calls, pure UI component

## Usage

```tsx
import VerificationStatus from './components/verification/VerificationStatus';

// Basic usage
<VerificationStatus />

// With custom styling
<VerificationStatus 
  className="my-4"
  badgeClassName="shadow-lg"
  size="lg"
/>

// Without wallet display
<VerificationStatus showWallet={false} />
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `className` | `string` | `''` | Custom class for container |
| `badgeClassName` | `string` | `''` | Custom class for badge |
| `walletClassName` | `string` | `''` | Custom class for wallet display |
| `messageClassName` | `string` | `''` | Custom class for message text |
| `showWallet` | `boolean` | `true` | Show/hide wallet address |
| `size` | `'sm' \| 'md' \| 'lg'` | `'md'` | Size variant |

## Status Logic

The component determines status based on `studentVerification` state:

1. **Expired**: `expiresAt < now`
2. **Re-verification Required**: `isVerified && needsReverification`
3. **Verified**: `isVerified && !needsReverification`
4. **Pending**: Default when verification data is missing or incomplete

## i18n Keys

All text is internationalized under the `verification` namespace:

- `verification.wallet` - Wallet label
- `verification.status.verified` - Verified badge
- `verification.status.expired` - Expired badge
- `verification.status.pending` - Pending badge
- `verification.status.reverify` - Re-verification badge
- `verification.message.*` - Status messages

## Testing

Comprehensive test coverage with 9 test cases:

```bash
npm test -- src/components/verification/__tests__/VerificationStatus.test.tsx --run
```

**Coverage:**
- ✓ Renders wallet + pending state
- ✓ Shows verified badge when isVerified
- ✓ Shows expired badge when expiresAt < now
- ✓ Displays re-verify date when needsReverification
- ✓ Hides wallet when showWallet=false
- ✓ Handles null currentRecord
- ✓ Applies custom className props
- ✓ Respects size prop
- ✓ Shows reverify message without date

## Acceptance Criteria

✅ Component is self-contained  
✅ No network calls  
✅ Renders correct badge and helper text for each status  
✅ All tests pass (9/9)  
✅ Lint passes (0 errors)  
✅ TypeScript passes (0 errors)  
✅ Build passes  
✅ i18n strings in all 6 locales
