# Alert Event Wiring - Implementation Summary

## Overview
This document describes the implementation of alert preference wiring into notification events for the SafeVoice platform. The system enables browser notifications for mentions in messages and crisis queue alerts based on user preferences stored in localStorage.

## Architecture

### NotificationBridge (`src/lib/notifications/NotificationBridge.ts`)
A shared utility that reads alert preferences from localStorage (`safevoice_alert_prefs`) and triggers browser notifications. Designed to be usable from non-React modules (no Zustand store dependency).

**Key Functions:**
- `notify(options: NotificationOptions)` - Triggers browser notification with user preference checks
- `isPushNotificationsEnabled()` - Checks if push notifications are globally enabled
- `isMentionNotificationsEnabled()` - Checks if mention notifications are enabled
- `isCrisisAlertsEnabled()` - Checks if crisis alert notifications are enabled

**Features:**
- Auto-requests notification permission if not granted
- Auto-closes notifications after 5 seconds
- Graceful handling of missing Notification API or denied permissions
- Respects user preferences before triggering notifications

## Integration Points

### 1. Messaging Service (`src/lib/messaging/MessagingService.ts`)
**Mention Notification Flow:**
1. After parsing inbound message in `notifyMessageListeners()`
2. Detects if `message.mentions.length > 0`
3. Checks if `alertPreferences.mentions` is true via `NotificationBridge.isMentionNotificationsEnabled()`
4. If enabled, triggers notification with:
   - Title: "You were mentioned by {senderName}"
   - Body: Message snippet (first 60 characters)
   - Tag: `mention_{messageId}` for deduplication
   - Data: messageId, threadId, mentionedBy array

### 2. Crisis Queue (`src/lib/crisisQueue.ts`)
**Crisis Alert Notification Flow:**
1. After `createRequest()` resolves (after persistence)
2. Checks if `alertPreferences.crisisAlerts` is true via `NotificationBridge.isCrisisAlertsEnabled()`
3. If enabled, triggers notification with:
   - Title: "🚨 CRITICAL Crisis Alert" or "⚠️ HIGH Crisis Alert"
   - Body: "New {level} crisis request created (Post: {postId snippet})"
   - Tag: `crisis_{requestId}` for deduplication
   - Data: requestId, crisisLevel, studentId, postId

## Test Coverage

### Messaging Service Tests
**File:** `src/lib/messaging/__tests__/MessagingService.test.ts`

Two new tests in "Mention Notifications" suite:
1. **"should trigger notification when message has mentions and preference enabled"**
   - Mocks NotificationBridge functions
   - Sets localStorage with mentions enabled
   - Verifies notification triggered with correct payload

2. **"should not trigger notification when mentions preference disabled"**
   - Mocks isMentionNotificationsEnabled to return false
   - Verifies notification NOT triggered

**Result:** 21/21 tests passing

### Crisis Queue Tests
**File:** `src/lib/__tests__/crisisQueue.integration.test.ts`

Two new tests in "Crisis Alert Notifications" suite:
1. **"should trigger notification when crisis request created and preference enabled"**
   - Mocks NotificationBridge functions
   - Sets localStorage with crisisAlerts enabled
   - Creates crisis request
   - Verifies notification triggered with correct payload

2. **"should not trigger notification when crisis alerts preference disabled"**
   - Mocks isCrisisAlertsEnabled to return false
   - Verifies notification NOT triggered

**Result:** 30/30 tests passing

## localStorage Format

Alert preferences are stored in localStorage under the key `safevoice_alert_prefs`:

```json
{
  "alertPreferences": {
    "mentions": true,
    "crisisAlerts": true,
    "pushNotificationsEnabled": true,
    "emailOnAlertsEnabled": true,
    "smsAlertsEnabled": false,
    "digestFrequency": "daily",
    "highlightCritical": true,
    "messages": true,
    "dailyDigest": false
  },
  "trustedContacts": [
    {
      "name": "Emergency Contact",
      "email": "emergency@example.com",
      "phone": "+1234567890"
    }
  ]
}
```

## Build Status
✅ All builds pass:
- `npm run build` - Successful dist generation
- `npm run lint` - 0 errors
- `npm test` - All tests passing (21 messaging + 30 crisis queue)
- `npx tsc --noEmit` - 0 TypeScript errors

## Error Handling
All notification triggers include comprehensive error handling:
- Missing Notification API → logs error, returns early
- Denied permissions → logs error, returns early
- Missing service worker → logs error, continues execution
- Disabled preferences → returns early without attempting notification

No errors are thrown to the calling code, ensuring the main application flow continues uninterrupted.

## Future Enhancements
1. Service Worker integration for background notifications
2. Custom notification sounds per alert type
3. Notification action buttons (e.g., "View Thread", "Respond to Crisis")
4. Notification batching to avoid spam
5. Rich notification content with images/avatars
6. Push notification support via Firebase Cloud Messaging or similar
7. Email/SMS fallback when browser notifications unavailable

## Related Files
- `src/lib/notifications/NotificationBridge.ts` - Core notification helper
- `src/lib/messaging/MessagingService.ts` - Mention notification integration
- `src/lib/crisisQueue.ts` - Crisis alert notification integration
- `src/lib/messaging/__tests__/MessagingService.test.ts` - Mention notification tests
- `src/lib/__tests__/crisisQueue.integration.test.ts` - Crisis alert notification tests
- `src/lib/store.ts` - AlertPreferences interface and store state
