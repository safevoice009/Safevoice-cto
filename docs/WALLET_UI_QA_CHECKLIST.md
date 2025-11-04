# Wallet UI Multi-Network Upgrade - QA Checklist

## Overview
This document provides a comprehensive manual QA checklist for the wallet UI upgrade featuring multi-network support, gas estimates, transaction states, and bridging controls.

## Pre-QA Setup

### Environment Configuration
- [ ] Set `VITE_WEB3_ENABLED=true` in `.env`
- [ ] Configure `VITE_CHAIN_ID` (e.g., `31337` for localhost, `1` for mainnet)
- [ ] Set up RPC URLs for target chains
- [ ] Configure contract addresses for each chain

### Test Wallets
- [ ] MetaMask installed and configured
- [ ] Test wallet funded with native tokens (ETH, MATIC, etc.)
- [ ] Test wallet has VOICE tokens on at least one chain
- [ ] Multiple chains added to MetaMask for network switching tests

---

## Connection States Tests

### Disconnected State
- [ ] **T1.1:** "Connect Wallet" button displays when no wallet connected
- [ ] **T1.2:** Clicking "Connect Wallet" opens wallet connection modal
- [ ] **T1.3:** Wallet selection modal shows supported wallets (MetaMask, WalletConnect, etc.)
- [ ] **T1.4:** Profile page shows "No wallet connected" state for wallet features
- [ ] **T1.5:** Staking, governance, and NFT panels hidden when disconnected

### Connecting State
- [ ] **T2.1:** Loading indicator shows during connection process
- [ ] **T2.2:** Connection timeout handled gracefully (>30s)
- [ ] **T2.3:** User rejection handled with appropriate error message
- [ ] **T2.4:** Connection state persists across page refreshes

### Connected State
- [ ] **T3.1:** Account address/ENS name displays in navbar
- [ ] **T3.2:** VOICE balance displays correctly
- [ ] **T3.3:** Network indicator shows current chain
- [ ] **T3.4:** Gas estimate displays on desktop view
- [ ] **T3.5:** Wallet panel shows all connected wallet details
- [ ] **T3.6:** Staking, governance, and NFT panels visible when connected

### Wrong Network State
- [ ] **T4.1:** "⚠️ Wrong Network" button shows for unsupported chains
- [ ] **T4.2:** Clicking wrong network button prompts chain switch
- [ ] **T4.3:** Error message guides user to supported networks
- [ ] **T4.4:** Features disabled until correct network selected

---

## Multi-Network Support Tests

### Network Selection
- [ ] **T5.1:** Network selector displays current chain name and icon
- [ ] **T5.2:** Clicking network selector opens chain dropdown
- [ ] **T5.3:** All supported chains listed (Ethereum, Polygon, BSC, Arbitrum, Optimism, Base)
- [ ] **T5.4:** Active chain highlighted with checkmark
- [ ] **T5.5:** Clicking chain initiates network switch

### Network Switching
- [ ] **T6.1:** MetaMask prompts for network switch approval
- [ ] **T6.2:** Success toast shows "Switched to [Chain Name]"
- [ ] **T6.3:** UI updates immediately after switch
- [ ] **T6.4:** Balance updates for new network
- [ ] **T6.5:** Gas estimate updates for new network
- [ ] **T6.6:** Chain-specific contract addresses loaded correctly

### Network-Specific Features
- [ ] **T7.1:** Staking positions load for current chain
- [ ] **T7.2:** Governance proposals load for current chain
- [ ] **T7.3:** NFT achievements load for current chain
- [ ] **T7.4:** Transaction history filtered by chain
- [ ] **T7.5:** Block explorer links use correct chain explorer

---

## Gas Estimates & Warnings Tests

### Gas Display
- [ ] **T8.1:** Gas estimate shows in Gwei (e.g., "25.5 Gwei")
- [ ] **T8.2:** Gas updates every 15 seconds
- [ ] **T8.3:** Gas color indicates level (green=low, yellow=medium, red=high)
- [ ] **T8.4:** Icon indicates gas trend (up/down arrow)
- [ ] **T8.5:** Gas display hidden on mobile, accessible via tooltip

### High Gas Warnings
- [ ] **T9.1:** Warning badge appears when gas >50 Gwei
- [ ] **T9.2:** Yellow alert icon shows on mobile when gas high
- [ ] **T9.3:** Transaction confirmation shows gas warning
- [ ] **T9.4:** User can proceed despite high gas warning
- [ ] **T9.5:** Gas cost estimate shown in transaction modal

### Gas Fetch Errors
- [ ] **T10.1:** "Gas unavailable" shows if RPC fails
- [ ] **T10.2:** App remains functional without gas data
- [ ] **T10.3:** Gas fetch retries automatically
- [ ] **T10.4:** No console errors for failed gas fetches

---

## Transaction Status Tests

### Transaction Lifecycle
- [ ] **T11.1:** Pending transaction shows in status panel
- [ ] **T11.2:** Loading spinner displays for pending transactions
- [ ] **T11.3:** "Submitted" state shows after MetaMask confirmation
- [ ] **T11.4:** Transaction hash displays with explorer link
- [ ] **T11.5:** "Confirmed" state shows with green checkmark
- [ ] **T11.6:** Failed transactions show with red X and error message

### Transaction Panel
- [ ] **T12.1:** Panel appears when transactions exist
- [ ] **T12.2:** Panel auto-hides after all transactions confirmed (>5s)
- [ ] **T12.3:** "Hide" button manually dismisses panel
- [ ] **T12.4:** Transaction types labeled correctly (Claim, Stake, etc.)
- [ ] **T12.5:** Recent transactions (last 3) shown even after confirmation

### Optimistic Updates
- [ ] **T13.1:** Balance updates optimistically before confirmation
- [ ] **T13.2:** Rollback occurs if transaction fails
- [ ] **T13.3:** Pending state reflected in UI during transaction
- [ ] **T13.4:** Toast notifications for transaction events

---

## Staking Panel Tests

### Staking Interface
- [ ] **T14.1:** "Stake Tokens" button opens staking form
- [ ] **T14.2:** Amount input accepts decimal values
- [ ] **T14.3:** "MAX" button sets available balance
- [ ] **T14.4:** Lock period buttons (7d, 30d, 90d, 180d) selectable
- [ ] **T14.5:** APY displayed for each lock period
- [ ] **T14.6:** Form validation prevents overstaking
- [ ] **T14.7:** Form validation requires amount >0

### Staking Actions
- [ ] **T15.1:** Stake transaction triggers MetaMask
- [ ] **T15.2:** Transaction appears in status panel
- [ ] **T15.3:** Success toast on confirmation
- [ ] **T15.4:** New staking position appears in list
- [ ] **T15.5:** Balance decreases by staked amount

### Staking Positions
- [ ] **T16.1:** All positions listed with details
- [ ] **T16.2:** Lock timer shows time remaining
- [ ] **T16.3:** Locked positions show lock icon
- [ ] **T16.4:** Unlocked positions show unlock icon
- [ ] **T16.5:** Pending rewards displayed per position
- [ ] **T16.6:** "Claim Rewards" button visible when rewards > 0
- [ ] **T16.7:** "Unstake" button enabled after lock period

### Staking Stats
- [ ] **T17.1:** Total staked amount accurate
- [ ] **T17.2:** Total pending rewards accurate
- [ ] **T17.3:** Active positions count correct
- [ ] **T17.4:** Empty state shows when no positions

---

## Governance Panel Tests

### Proposal Display
- [ ] **T18.1:** All active proposals listed
- [ ] **T18.2:** Proposal title and description visible
- [ ] **T18.3:** Voting options displayed with support percentages
- [ ] **T18.4:** Deadline countdown accurate
- [ ] **T18.5:** Quorum threshold shown
- [ ] **T18.6:** Total votes count displayed

### Voting Interface
- [ ] **T19.1:** Voting power shown in header
- [ ] **T19.2:** Clicking option highlights it
- [ ] **T19.3:** Multiple proposals selectable independently
- [ ] **T19.4:** Reason field optional
- [ ] **T19.5:** Confirm vote modal shows selected option
- [ ] **T19.6:** Cancel button resets selection

### Voting Actions
- [ ] **T20.1:** Vote transaction triggers MetaMask
- [ ] **T20.2:** Transaction appears in status panel
- [ ] **T20.3:** Success toast on confirmation
- [ ] **T20.4:** Proposal updates with new vote
- [ ] **T20.5:** Cannot vote twice on same proposal

### Governance States
- [ ] **T21.1:** "No voting power" error when balance = 0
- [ ] **T21.2:** Ended proposals marked appropriately
- [ ] **T21.3:** Passed proposals show green indicator
- [ ] **T21.4:** Defeated proposals show red indicator

---

## NFT Panel Tests

### NFT Display
- [ ] **T22.1:** All achievements listed in grid
- [ ] **T22.2:** NFT name, description, and icon visible
- [ ] **T22.3:** Rarity badge shown (Common, Rare, Epic, Legendary)
- [ ] **T22.4:** Rarity colors distinct
- [ ] **T22.5:** Owned NFTs show green checkmark
- [ ] **T22.6:** Claimable NFTs show sparkle icon

### NFT Filters
- [ ] **T23.1:** "All" tab shows all NFTs
- [ ] **T23.2:** "Owned" tab filters to collected NFTs
- [ ] **T23.3:** "Claimable" tab filters to mintable NFTs
- [ ] **T23.4:** Tab badges show correct counts
- [ ] **T23.5:** Empty states display for filtered results

### NFT Minting
- [ ] **T24.1:** "Mint NFT" button visible for claimable NFTs
- [ ] **T24.2:** Mint transaction triggers MetaMask
- [ ] **T24.3:** Loading state shows during minting
- [ ] **T24.4:** Success toast on mint confirmation
- [ ] **T24.5:** NFT moves to "Owned" after mint
- [ ] **T24.6:** Cannot mint same NFT twice

### NFT Stats
- [ ] **T25.1:** Collection progress shown (X/Y Collected)
- [ ] **T25.2:** Edition numbers shown for multi-edition NFTs
- [ ] **T25.3:** Grid layout responsive on mobile

---

## Error Handling Tests

### Network Errors
- [ ] **T26.1:** RPC connection failure handled gracefully
- [ ] **T26.2:** Error toast shows with retry option
- [ ] **T26.3:** App remains functional in offline mode
- [ ] **T26.4:** Reconnection auto-retries

### Transaction Errors
- [ ] **T27.1:** User rejection shows "Transaction cancelled"
- [ ] **T27.2:** Insufficient funds shows specific error
- [ ] **T27.3:** Gas estimation failure handled
- [ ] **T27.4:** Smart contract revert reasons displayed
- [ ] **T27.5:** Nonce conflicts resolved automatically

### Wallet Errors
- [ ] **T28.1:** Wallet lock detected and user prompted
- [ ] **T28.2:** Account change handled gracefully
- [ ] **T28.3:** Network mismatch detected and prompted
- [ ] **T28.4:** Extension not installed shows helpful message

---

## Accessibility Tests

### Keyboard Navigation
- [ ] **T29.1:** All buttons accessible via Tab key
- [ ] **T29.2:** Modals can be closed with Escape key
- [ ] **T29.3:** Network selector navigable with arrow keys
- [ ] **T29.4:** Form inputs support Tab navigation

### Screen Reader
- [ ] **T30.1:** Button labels descriptive
- [ ] **T30.2:** Loading states announced
- [ ] **T30.3:** Error messages announced
- [ ] **T30.4:** Transaction status changes announced

### Visual Accessibility
- [ ] **T31.1:** Color contrast meets WCAG AA standards
- [ ] **T31.2:** Focus indicators visible
- [ ] **T31.3:** Text readable at 200% zoom
- [ ] **T31.4:** Icons have text alternatives

---

## Responsive Layout Tests

### Mobile (320px - 767px)
- [ ] **T32.1:** Connect button visible and accessible
- [ ] **T32.2:** Gas warning badge shown on mobile
- [ ] **T32.3:** Network name truncated appropriately
- [ ] **T32.4:** Panels stack vertically
- [ ] **T32.5:** Forms single-column layout
- [ ] **T32.6:** NFT grid shows 1 column

### Tablet (768px - 1023px)
- [ ] **T33.1:** Two-column grid for stats
- [ ] **T33.2:** Gas estimate visible
- [ ] **T33.3:** Network selector with icon
- [ ] **T33.4:** NFT grid shows 2 columns

### Desktop (1024px+)
- [ ] **T34.1:** Full gas display with details
- [ ] **T34.2:** Three-column grid for stats
- [ ] **T34.3:** Side-by-side forms
- [ ] **T34.4:** NFT grid shows 3 columns
- [ ] **T34.5:** Transaction panel fixed position

---

## Performance Tests

### Load Time
- [ ] **T35.1:** Initial render <2s
- [ ] **T35.2:** Network switch <1s
- [ ] **T35.3:** Gas update <500ms
- [ ] **T35.4:** No layout shift during load

### Data Fetching
- [ ] **T36.1:** Balance queries cached
- [ ] **T36.2:** Staking data updated on demand
- [ ] **T36.3:** Gas polling doesn't block UI
- [ ] **T36.4:** Transaction history paginated

---

## Integration Tests

### End-to-End Flows
- [ ] **T37.1:** Connect → Switch Network → Stake → View Position
- [ ] **T37.2:** Connect → Claim Rewards → Check Balance
- [ ] **T37.3:** Connect → Vote → View Vote Status
- [ ] **T37.4:** Connect → Mint NFT → View Collection
- [ ] **T37.5:** Multiple transactions in quick succession

### Cross-Feature Tests
- [ ] **T38.1:** Staking updates balance correctly
- [ ] **T38.2:** Voting consumes voting power
- [ ] **T38.3:** NFT minting requires connected wallet
- [ ] **T38.4:** Network switch updates all panels

---

## Edge Cases

### Unusual Balances
- [ ] **T39.1:** Zero balance displays correctly
- [ ] **T39.2:** Very large balance (>1M) formatted properly
- [ ] **T39.3:** Dust amounts (<0.01) handled
- [ ] **T39.4:** Negative values impossible (validation)

### Timing Issues
- [ ] **T40.1:** Rapid network switches handled
- [ ] **T40.2:** Concurrent transactions queued
- [ ] **T40.3:** Expired proposals marked correctly
- [ ] **T40.4:** Clock skew handled (client vs blockchain time)

### Wallet Quirks
- [ ] **T41.1:** Multiple accounts supported
- [ ] **T41.2:** Hardware wallets work (Ledger, Trezor)
- [ ] **T41.3:** Mobile wallets functional (MetaMask Mobile, Trust)
- [ ] **T41.4:** WalletConnect V2 supported

---

## Regression Tests

### Existing Features
- [ ] **T42.1:** Post creation still works
- [ ] **T42.2:** Commenting unaffected
- [ ] **T42.3:** Reactions functional
- [ ] **T42.4:** Offline mode still available
- [ ] **T42.5:** Premium features accessible

---

## Sign-Off

- [ ] All critical tests passed (T1-T25)
- [ ] All high-priority tests passed (T26-T35)
- [ ] Known issues documented
- [ ] Performance metrics recorded
- [ ] Accessibility audit complete
- [ ] Cross-browser testing complete (Chrome, Firefox, Safari, Edge)

**QA Engineer:** _________________  
**Date:** _________________  
**Build Version:** _________________  
**Notes:**

---

## Known Issues

| Issue ID | Description | Severity | Workaround | Status |
|----------|-------------|----------|------------|--------|
|          |             |          |            |        |

---

## Test Environment Details

- **OS:** _________________
- **Browser:** _________________
- **Wallet Version:** _________________
- **Chain ID:** _________________
- **Contract Addresses:** _________________
