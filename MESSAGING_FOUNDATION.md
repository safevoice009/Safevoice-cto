# Messaging Layer Foundation - Phase 5 Implementation

## Overview
This document describes the lightweight real-time messaging layer implemented in Phase 5. The system supports:
- Local message persistence across page reloads
- Real-time synchronization via WebSocket (when available)
- Fallback to BroadcastChannel for same-tab communication
- Automatic offline message queueing
- @mention parsing and highlighting

## Architecture

### Core Components

#### 1. **MessagingService** (`src/lib/messaging/MessagingService.ts`)
The backbone of the messaging system, providing:
- **WebSocket Support**: Attempts connection to `VITE_MESSAGE_WS_URL` environment variable
- **BroadcastChannel Fallback**: Uses browser's BroadcastChannel API when WebSocket unavailable
- **Offline Queue**: Automatically queues messages when offline, flushes on reconnection
- **Local Storage Persistence**: Uses `safevoice_messages_pending` key for offline queue

**Key Methods**:
- `send(message, threadId)` - Send message or queue if offline
- `onMessage(listener)` - Register message listener callback
- `onConnectionChange(listener)` - Monitor connection status
- `flushOfflineQueue()` - Retry pending messages when coming back online
- `destroy()` - Cleanup service on unmount

#### 2. **Mention Utilities** (`src/lib/messaging/mentions.ts`)
Utilities for parsing and handling @mentions:
- `parseMentions(content)` - Extract @Name#0001 mentions from text
- `getMentionSuggestionsFromInput(input, users)` - Get mention suggestions as user types
- `highlightMentions(content)` - Generate HTML with highlighted mentions
- `completeMention(input, user)` - Replace incomplete @mention with full format
- `extractMentionedUserIds(content)` - Get list of mentioned user IDs

Pattern: `@StudentName#0001` where #0001 is the user ID/hash

#### 3. **Message Types** (`src/lib/messaging/types.ts`)
TypeScript interfaces:
- `Message` - Individual message with mentions, timestamps, edit state
- `Thread` - Conversation container with messages, participants, unread count
- `Mention` - Metadata about a single @mention
- `OfflineEnvelope` - Wrapper for offline queue persistence
- `MentionSuggestion` - Suggestion item for mention autocomplete

#### 4. **Store Integration** (`src/lib/store.ts`)
Extended Zustand store with messaging state:

**State**:
- `threads: Map<string, Thread>` - All message threads
- `pendingMessages: OfflineEnvelope[]` - Queued offline messages
- `mentionSuggestions: MentionSuggestion[]` - Current mention suggestions
- `messagingConnected: boolean` - Connection status

**Actions**:
- `initializeMessaging()` - Initialize service and load persisted state
- `sendMessage(threadId, content, attachedMediaIds?)` - Send message to thread
- `receiveMessage(message)` - Handle incoming message
- `retryOfflineMessages()` - Manually retry pending messages
- `markThreadRead(threadId)` - Clear unread count for thread
- `setMentionSuggestions(suggestions)` - Update mention suggestions
- `destroyMessaging()` - Cleanup messaging service

Persistence:
- Threads saved to `safevoice_messaging_threads` localStorage key
- Pending messages saved to `safevoice_messaging_pending` localStorage key

### UI Components

#### 1. **MessageComposer** (`src/components/messaging/MessageComposer.tsx`)
Message input form with:
- Connection status indicator (online/offline)
- Pending message count display
- @mention suggestions dropdown
- Character counter (0-500)
- Send button (disabled when offline or empty)
- Enter key to send, Shift+Enter for newline
- Mention completion on suggestion click

#### 2. **MessageThreadList** (`src/components/messaging/MessageThreadList.tsx`)
Displays:
- List of all threads sorted by last activity
- Unread message count badges
- Last message preview
- Thread selection callback
- Empty state messaging

#### 3. **MessagingPanel** (`src/components/messaging/MessagingPanel.tsx`)
Container component that:
- Initializes messaging service on mount
- Shows thread list and selected thread messages
- Renders message composer
- Handles thread selection and read marking
- Supports open/close toggle

### Integration with Feed
The MessagingPanel is embedded in the Feed sidebar (desktop only):
- Desktop: Visible in right sidebar, responsive
- Mobile: Hidden to avoid UI clutter (can be added to mobile nav in future)
- Auto-initializes on component mount
- Persists state across navigations

## Configuration

### Environment Variables
```bash
# Optional WebSocket URL for real-time messaging
VITE_MESSAGE_WS_URL=wss://messages.example.com/ws

# If not provided, falls back to BroadcastChannel-only mode
```

See `.env.example` for details.

## Usage Examples

### Initialize Messaging in App
```typescript
import { useStore } from '../lib/store';

export function App() {
  const { initializeMessaging } = useStore();
  
  useEffect(() => {
    initializeMessaging();
  }, [initializeMessaging]);
  
  return <>...</>;
}
```

### Send a Message
```typescript
const { sendMessage } = useStore();

await sendMessage(
  threadId,
  'Hello @Student#0001, how are you?',
  ['media-id-1'] // Optional attached media IDs
);
```

### Listen to Messages
```typescript
const { threads } = useStore();

// Messages are automatically added to threads
const thread = threads.get(threadId);
const messages = thread?.messages || [];
```

### Handle Offline
Messages are automatically queued when:
- `navigator.onLine === false`
- WebSocket connection unavailable
- No BroadcastChannel support

When reconnected, `flushOfflineQueue()` is called automatically.

## Testing

### Run All Messaging Tests
```bash
npm test -- src/lib/messaging src/components/messaging --run
```

### Test Suites
1. **MessagingService.test.ts** (19 tests)
   - Initialization without WebSocket URL
   - Offline queue persistence
   - Loading pending messages
   - Clearing pending messages
   - Connection status tracking
   - Message and thread listener registration

2. **Mention Parsing Tests** (in MessagingService.test.ts)
   - Parse @mentions with format @Name#0001
   - Parse multiple mentions
   - Handle spaces in names
   - Return empty for content without mentions
   - Extract mentioned user IDs

3. **Mention Suggestions Tests** (in MessagingService.test.ts)
   - Return empty suggestions without @
   - Suggest users matching partial mention
   - Don't suggest if mention is complete (has #)
   - Limit suggestions to 5 results
   - Match by display name too

4. **MessageComposer.test.tsx** (8 tests)
   - Render message composer
   - Show connection status when online
   - Show offline status when disconnected
   - Disable send button when offline
   - Show character count
   - Send message on Enter key
   - Don't send message on Shift+Enter
   - Clear message after sending

## Acceptance Criteria ✓

- ✅ Users can compose and view messages in-page
- ✅ Messages persist across reloads via store + localStorage
- ✅ Taking app offline queues messages
- ✅ Coming back online flushes queue automatically
- ✅ Typing `@Student#0001` surfaces mention highlights
- ✅ Mention metadata stored alongside messages
- ✅ All lint rules pass (0 errors)
- ✅ All tests pass (27/27 tests)

## Future Enhancements

### Short Term
- Add mobile messaging UI (bottom sheet or drawer)
- Message reactions (emoji)
- Message edit/delete
- User presence indicators
- Message notifications

### Medium Term
- Message search functionality
- Group messaging improvements
- Media attachment support (full implementation)
- Message encryption (end-to-end)

### Long Term
- Voice/video call integration
- Message history export
- Community-wide announcements
- Message moderation tools

## Performance Considerations

- **Thread List Rendering**: Uses Framer Motion for smooth animations
- **Message Persistence**: Only saves threads with messages
- **Offline Queue**: Cleared from localStorage after successful flush
- **Suggestion Generation**: Filters and limits to 5 results for performance
- **Memory**: Thread Map cleared on destroy to prevent leaks

## Debugging

Enable debug logging:
```javascript
// In browser console
localStorage.setItem('DEBUG', 'safevoice:*');
location.reload();
```

Look for `[Messaging]` console logs for service activity.

## Implementation Notes

### Design Decisions
1. **BroadcastChannel Fallback**: No external dependencies required for same-tab messaging
2. **Map-based Storage**: Efficient thread lookup and updates
3. **Optional Media IDs**: Future-proofed for media attachment feature
4. **Automatic Connection Management**: Listens to online/offline events
5. **Local-first Approach**: All state persists locally first

### Known Limitations
- In-memory IPFS-like service for testing (not real IPFS)
- No message end-to-end encryption yet
- Mentions are text-based, not linked to actual user profiles
- No rate limiting on message sending

## File Structure
```
src/
├── lib/messaging/
│   ├── types.ts                    # TypeScript interfaces
│   ├── MessagingService.ts         # Core service
│   ├── mentions.ts                 # Mention utilities
│   └── __tests__/
│       └── MessagingService.test.ts # Service & mention tests
├── components/messaging/
│   ├── MessageComposer.tsx         # Composer UI
│   ├── MessageThreadList.tsx       # Thread list
│   ├── MessagingPanel.tsx          # Main container
│   └── __tests__/
│       └── MessageComposer.test.tsx # Component tests
└── pages/
    └── Feed.tsx                     # Integration point
```

## License
MIT - Part of SafeVoice project
