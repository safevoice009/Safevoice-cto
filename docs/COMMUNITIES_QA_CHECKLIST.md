# SafeVoice Communities - QA Test Checklist

## Overview

This document provides comprehensive manual test scenarios for the SafeVoice community system. Use this checklist for feature validation, regression testing, and pre-release verification.

**Testing Environment:** Local development, staging, or production
**Test Data:** Use anonymous Student IDs for all tests

---

## Table of Contents

- [Pre-Test Setup](#pre-test-setup)
- [1. User Identity & Anonymity](#1-user-identity--anonymity)
- [2. Post Creation](#2-post-creation)
- [3. Post Interactions](#3-post-interactions)
- [4. Commenting System](#4-commenting-system)
- [5. Reactions](#5-reactions)
- [6. Helpful Content](#6-helpful-content)
- [7. Bookmarks](#7-bookmarks)
- [8. Reporting System](#8-reporting-system)
- [9. Moderation Panel](#9-moderation-panel)
- [10. Crisis Detection](#10-crisis-detection)
- [11. Notifications](#11-notifications)
- [12. VOICE Token Rewards](#12-voice-token-rewards)
- [13. Post Lifetime & Expiry](#13-post-lifetime--expiry)
- [14. Content Moderation](#14-content-moderation)
- [15. Responsive Design](#15-responsive-design)
- [16. Performance](#16-performance)
- [17. Accessibility](#17-accessibility)
- [18. Data Persistence](#18-data-persistence)

---

## Pre-Test Setup

### Environment Preparation

- [ ] Clear browser cache and localStorage
- [ ] Open browser DevTools console (check for errors)
- [ ] Note your anonymous Student ID (e.g., Student#1234)
- [ ] Have multiple browser profiles ready for multi-user tests
- [ ] Test on required browsers (Chrome, Firefox, Safari, Edge)

### Test Data

Create test content for different scenarios:
- Normal posts (various categories)
- Crisis-related posts (mental health keywords)
- Posts with profanity
- Posts with personal information
- Spam-like content
- Multiple posts from same user

---

## 1. User Identity & Anonymity

### Test Case 1.1: Anonymous ID Generation
- [ ] Open SafeVoice in incognito/private window
- [ ] Navigate to Feed page
- [ ] Verify anonymous Student ID appears in navigation (format: `Student#XXXX`)
- [ ] Verify 4-digit random number (between 1000-9999)

**Expected:** Unique Student ID automatically generated and displayed

### Test Case 1.2: ID Persistence
- [ ] Note your Student ID
- [ ] Refresh page
- [ ] Close and reopen browser (same profile)
- [ ] Verify Student ID remains the same

**Expected:** Student ID persists across sessions via localStorage

### Test Case 1.3: Multiple Browser Profiles
- [ ] Open SafeVoice in Browser Profile A
- [ ] Note Student ID (e.g., Student#1234)
- [ ] Open SafeVoice in Browser Profile B
- [ ] Note Student ID (e.g., Student#5678)
- [ ] Verify IDs are different

**Expected:** Each browser profile has unique Student ID

### Test Case 1.4: No Personal Data Required
- [ ] Verify no login page or form
- [ ] Verify no email/password inputs
- [ ] Verify no account creation process
- [ ] Check localStorage keys (no PII stored)

**Expected:** 100% anonymous, no personal information collected

---

## 2. Post Creation

### Test Case 2.1: Create Basic Post
- [ ] Navigate to Feed page
- [ ] Click "Share your story" button
- [ ] Enter content: "This is a test post"
- [ ] Click "Post" button
- [ ] Verify post appears in feed with your Student ID
- [ ] Verify timestamp shows "just now"

**Expected:** Post created and displayed immediately

### Test Case 2.2: First Post Reward
- [ ] Clear localStorage (reset first post flag)
- [ ] Create your first post
- [ ] Check wallet balance
- [ ] Verify +20 VOICE earned (first post bonus)
- [ ] Verify transaction in history: "Your first post! Welcome to SafeVoice"

**Expected:** First post earns 20 VOICE tokens (one-time bonus)

### Test Case 2.3: Regular Post Reward
- [ ] Create a second post (not first post)
- [ ] Check wallet balance
- [ ] Verify +10 VOICE earned (regular post)
- [ ] Verify transaction: "New post created"

**Expected:** Regular posts earn 10 VOICE tokens

### Test Case 2.4: Post with Image
- [ ] Click "Share your story"
- [ ] Enter content
- [ ] Click image attachment button
- [ ] Select/upload image
- [ ] Click "Post"
- [ ] Verify image displays in post
- [ ] Check wallet balance
- [ ] Verify +25 VOICE earned (10 base + 15 media bonus)

**Expected:** Posts with images earn 25 VOICE total

### Test Case 2.5: Post with Category
- [ ] Click "Share your story"
- [ ] Enter content
- [ ] Select category: "Academic"
- [ ] Click "Post"
- [ ] Verify category badge displays on post

**Expected:** Category selection works and displays

### Test Case 2.6: Post Lifetime Options
- [ ] Click "Share your story"
- [ ] Enter content
- [ ] Click lifetime dropdown
- [ ] Verify options: 1h, 6h, 24h, 7d, 30d, Never, Custom
- [ ] Select "7 Days"
- [ ] Click "Post"
- [ ] Verify post shows "Expires in 7 days"

**Expected:** All lifetime options available and functional

### Test Case 2.7: Custom Lifetime
- [ ] Click "Share your story"
- [ ] Select lifetime: "Custom"
- [ ] Enter custom hours: "48"
- [ ] Click "Post"
- [ ] Verify post shows "Expires in 2 days"

**Expected:** Custom lifetime accepts hours and displays correctly

### Test Case 2.8: Minimum Content Length
- [ ] Click "Share your story"
- [ ] Enter: "test" (4 characters)
- [ ] Try to submit
- [ ] Verify error: "Minimum 5 characters required"

**Expected:** Posts require at least 5 characters

### Test Case 2.9: Maximum Content Length
- [ ] Enter very long text (>10,000 characters)
- [ ] Try to submit
- [ ] Verify character count warning or limit

**Expected:** Content length validation works

---

## 3. Post Interactions

### Test Case 3.1: View Post Details
- [ ] Create a test post
- [ ] Click on the post content area
- [ ] Verify post expands (if applicable)
- [ ] Verify all post metadata visible (timestamp, category, reactions)

**Expected:** Post details display correctly

### Test Case 3.2: Edit Own Post
- [ ] Create a test post
- [ ] Click three dots (⋮) menu
- [ ] Click "Edit"
- [ ] Modify content
- [ ] Save changes
- [ ] Verify post shows "Edited" badge
- [ ] Verify edited content displays

**Expected:** Post editing works for own posts

### Test Case 3.3: Delete Own Post
- [ ] Create a test post
- [ ] Click three dots (⋮) menu
- [ ] Click "Delete"
- [ ] Confirm deletion
- [ ] Verify post removed from feed
- [ ] Verify success toast: "Post deleted"

**Expected:** Post deletion works for own posts

### Test Case 3.4: Cannot Edit Others' Posts
- [ ] Create post in Browser Profile A
- [ ] View same post in Browser Profile B
- [ ] Click three dots menu
- [ ] Verify "Edit" option not available

**Expected:** Users cannot edit others' posts

### Test Case 3.5: Pinned Post Display
- [ ] Enable moderator mode
- [ ] Pin a test post
- [ ] Verify post displays at top of feed
- [ ] Verify "Pinned" badge shows
- [ ] Create new posts
- [ ] Verify pinned post stays at top

**Expected:** Pinned posts always appear first

---

## 4. Commenting System

### Test Case 4.1: Add Comment
- [ ] Find any post
- [ ] Click comment icon
- [ ] Enter comment: "Great post!"
- [ ] Click "Comment"
- [ ] Verify comment appears below post
- [ ] Verify your Student ID on comment
- [ ] Check wallet: +3 VOICE earned

**Expected:** Comments added successfully with reward

### Test Case 4.2: Reply to Comment
- [ ] Find comment on any post
- [ ] Click "Reply" button
- [ ] Enter reply: "I agree!"
- [ ] Submit reply
- [ ] Verify reply appears indented under parent comment
- [ ] Verify "replying to Student#XXXX" indicator
- [ ] Check wallet: +2 VOICE earned (reply)
- [ ] Original commenter gets +2 VOICE (reply received)

**Expected:** Nested replies work with proper rewards

### Test Case 4.3: Comment Thread Depth
- [ ] Create comment
- [ ] Reply to that comment
- [ ] Reply to the reply
- [ ] Continue to 3-4 levels deep
- [ ] Verify all replies properly indented
- [ ] Verify reply chain visually clear

**Expected:** Deep comment threads display correctly

### Test Case 4.4: Edit Comment
- [ ] Create a comment
- [ ] Click three dots on your comment
- [ ] Click "Edit"
- [ ] Modify text
- [ ] Save
- [ ] Verify "Edited" badge appears
- [ ] Verify edited content displays

**Expected:** Comment editing works

### Test Case 4.5: Delete Comment
- [ ] Create a comment
- [ ] Click three dots
- [ ] Click "Delete"
- [ ] Confirm deletion
- [ ] Verify comment removed
- [ ] Verify comment count decrements

**Expected:** Comment deletion works

### Test Case 4.6: Comment Count Accuracy
- [ ] Create post
- [ ] Note comment count: 0
- [ ] Add comment
- [ ] Verify count: 1
- [ ] Add reply to comment
- [ ] Verify count: 2
- [ ] Delete one comment
- [ ] Verify count: 1

**Expected:** Comment count always accurate

---

## 5. Reactions

### Test Case 5.1: Add Reaction
- [ ] Find any post
- [ ] Click heart (❤️) reaction
- [ ] Verify reaction count increments
- [ ] Verify heart icon highlights
- [ ] Check wallet: +1 VOICE (reaction given)
- [ ] Check post author's wallet: +2 VOICE (reaction received)

**Expected:** Reactions work with proper rewards

### Test Case 5.2: All Reaction Types
- [ ] Test each reaction type:
  - [ ] ❤️ Heart
  - [ ] 🔥 Fire
  - [ ] 👏 Clap
  - [ ] 😢 Sad
  - [ ] 😠 Angry
  - [ ] 😂 Laugh
- [ ] Verify each increments correct counter
- [ ] Verify visual feedback for each

**Expected:** All 6 reaction types functional

### Test Case 5.3: Change Reaction
- [ ] Add ❤️ reaction to post
- [ ] Click 🔥 reaction instead
- [ ] Verify heart decrements
- [ ] Verify fire increments
- [ ] Verify only one reaction active at a time

**Expected:** Can change reaction type

### Test Case 5.4: Remove Reaction
- [ ] Add ❤️ reaction
- [ ] Click ❤️ again
- [ ] Verify reaction removed
- [ ] Verify count decrements
- [ ] Verify icon no longer highlighted

**Expected:** Clicking same reaction removes it

### Test Case 5.5: Reaction on Comments
- [ ] Find any comment
- [ ] Add reaction to comment
- [ ] Verify reaction count shows on comment
- [ ] Verify rewards work same as post reactions

**Expected:** Comment reactions work identically to post reactions

### Test Case 5.6: Viral Post Milestone
- [ ] Create test post
- [ ] Use multiple browser profiles to add reactions
- [ ] Reach 100 total reactions
- [ ] Verify "Viral" badge appears on post
- [ ] Check post author wallet: +150 VOICE (viral bonus)
- [ ] Add more reactions
- [ ] Verify viral bonus only awarded once

**Expected:** 100+ reactions triggers viral bonus (one-time)

---

## 6. Helpful Content

### Test Case 6.1: Mark Post as Helpful
- [ ] Find any post (not your own)
- [ ] Click "Mark as Helpful" button
- [ ] Verify button changes to "Marked as Helpful"
- [ ] Check post author wallet: +50 VOICE
- [ ] Verify transaction: "Helpful post recognition"
- [ ] Try marking again
- [ ] Verify cannot mark twice

**Expected:** Helpful post award given once per post

### Test Case 6.2: Helpful Comment Threshold
- [ ] Create comment on any post
- [ ] Use multiple browser profiles to mark as helpful
- [ ] Add 4 helpful votes
- [ ] Verify no reward yet
- [ ] Add 5th helpful vote
- [ ] Check comment author wallet: +25 VOICE
- [ ] Verify transaction: "Helpful comment milestone"
- [ ] Add more votes
- [ ] Verify reward only given once

**Expected:** 5 helpful votes triggers 25 VOICE reward (one-time)

### Test Case 6.3: Helpful Vote Count Display
- [ ] Find comment with helpful votes
- [ ] Verify count shows: "👍 Helpful (5)"
- [ ] Add another vote
- [ ] Verify updates to: "👍 Helpful (6)"

**Expected:** Helpful vote count displays correctly

### Test Case 6.4: Cannot Mark Own Content Helpful
- [ ] Create your own post
- [ ] Verify "Mark as Helpful" button not available
- [ ] Create your own comment
- [ ] Verify "Helpful" button not available or disabled

**Expected:** Cannot mark own content as helpful

---

## 7. Bookmarks

### Test Case 7.1: Bookmark Post
- [ ] Find any post
- [ ] Click bookmark icon (🔖)
- [ ] Verify icon fills/highlights
- [ ] Verify toast: "Post saved! 🔖"
- [ ] Navigate away and back
- [ ] Verify bookmark persists

**Expected:** Posts can be bookmarked

### Test Case 7.2: Remove Bookmark
- [ ] Find bookmarked post
- [ ] Click bookmark icon again
- [ ] Verify icon outline returns
- [ ] Verify toast: "Bookmark removed"

**Expected:** Bookmarks can be removed

### Test Case 7.3: View Bookmarked Posts
- [ ] Bookmark several posts
- [ ] Navigate to Profile/Bookmarks section
- [ ] Verify all bookmarked posts appear
- [ ] Verify bookmarks from current user only

**Expected:** Bookmarked posts accessible via profile

### Test Case 7.4: Bookmark Persistence
- [ ] Bookmark a post
- [ ] Close browser
- [ ] Reopen and navigate to feed
- [ ] Verify post still bookmarked
- [ ] Check localStorage key: `safevoice_bookmarks`

**Expected:** Bookmarks persist across sessions

---

## 8. Reporting System

### Test Case 8.1: Report Post
- [ ] Find any post
- [ ] Click three dots (⋮) menu
- [ ] Click "Report"
- [ ] Select report type: "Harassment"
- [ ] Add description: "Test report"
- [ ] Submit report
- [ ] Verify success toast
- [ ] Verify report not visible to regular users

**Expected:** Post reporting works

### Test Case 8.2: Report Types
- [ ] Test all report types:
  - [ ] Harassment or Bullying
  - [ ] Hate Speech
  - [ ] Spam
  - [ ] Self-Harm or Suicide
  - [ ] Personal Information
  - [ ] Sexual Content
  - [ ] Violence
  - [ ] Misinformation
  - [ ] Other
- [ ] Verify each submits successfully

**Expected:** All report types functional

### Test Case 8.3: Report Threshold - 3 Reports (Blur)
- [ ] Create test post
- [ ] Submit 2 reports from different profiles
- [ ] Verify post still visible
- [ ] Submit 3rd report
- [ ] Verify post content blurred
- [ ] Verify warning message: "⚠️ This content has been reported multiple times"
- [ ] Verify moderationStatus: "under_review"

**Expected:** 3 reports trigger automatic blur

### Test Case 8.4: Report Threshold - 5 Reports (Hide)
- [ ] Create test post
- [ ] Submit 5 reports from different profiles
- [ ] Verify post hidden from feed
- [ ] Verify moderationStatus: "hidden"
- [ ] Verify hiddenReason: "Multiple reports received"

**Expected:** 5 reports trigger automatic hide

### Test Case 8.5: Report Threshold - 10 Reports (Delete)
- [ ] Create test post
- [ ] Submit 10 reports from different profiles
- [ ] Verify post deleted from feed
- [ ] Verify toast: "A reported post was removed"

**Expected:** 10 reports trigger automatic deletion

### Test Case 8.6: Self-Harm Report Special Handling
- [ ] Create post with crisis content
- [ ] Report as "Self-Harm or Suicide"
- [ ] Verify crisis modal displays
- [ ] Verify post flagged for support
- [ ] Verify helplines shown

**Expected:** Self-harm reports trigger crisis support flow

### Test Case 8.7: Report Comment
- [ ] Find any comment
- [ ] Click three dots on comment
- [ ] Click "Report"
- [ ] Select report type
- [ ] Submit
- [ ] Verify report recorded

**Expected:** Comment reporting works

---

## 9. Moderation Panel

### Test Case 9.1: Enable Moderator Mode
- [ ] Click your Student ID in navigation
- [ ] Toggle "Moderator Mode" switch
- [ ] Navigate to Feed
- [ ] Verify Moderator Panel appears at top
- [ ] Verify panel shows pending reports count

**Expected:** Moderator mode enables extra tools

### Test Case 9.2: View Pending Reports
- [ ] Enable moderator mode
- [ ] Create and report test post
- [ ] Open Moderator Panel
- [ ] Click "Pending" tab
- [ ] Verify reported post appears with:
  - [ ] Report type
  - [ ] Reporter Student ID
  - [ ] Timestamp
  - [ ] Description
  - [ ] Content preview

**Expected:** Pending reports visible to moderators

### Test Case 9.3: Mark Report as Valid
- [ ] Find pending report
- [ ] Click "Mark Valid" button
- [ ] Verify report moves to "Reviewed" tab
- [ ] Verify status badge: "Valid"
- [ ] Verify reported content hidden
- [ ] Check reporter wallet: +10 VOICE
- [ ] Check moderator wallet: +30 VOICE
- [ ] Verify 5-minute cooldown active

**Expected:** Valid reports reward reporter and moderator

### Test Case 9.4: Mark Report as Invalid
- [ ] Find pending report
- [ ] Click "Mark Invalid" button
- [ ] Verify report moves to "Reviewed" tab
- [ ] Verify status badge: "Invalid"
- [ ] Verify content restored (un-blurred/un-hidden)
- [ ] Check reporter wallet: -5 VOICE (penalty)
- [ ] Check moderator wallet: +30 VOICE
- [ ] Verify cooldown active

**Expected:** Invalid reports penalize false reporter, reward moderator

### Test Case 9.5: Moderator Action Cooldown
- [ ] Review first report
- [ ] Check wallet: +30 VOICE
- [ ] Immediately review second report
- [ ] Verify wallet does NOT increase (cooldown active)
- [ ] Wait 5+ minutes
- [ ] Review third report
- [ ] Check wallet: +30 VOICE

**Expected:** 5-minute cooldown between moderator reward

### Test Case 9.6: View Reviewed Reports
- [ ] Review several reports (valid and invalid)
- [ ] Click "Reviewed" tab in Moderator Panel
- [ ] Verify all reviewed reports appear
- [ ] Verify status badges (Valid/Invalid)
- [ ] Verify reviewer Student ID shown
- [ ] Verify review timestamp shown

**Expected:** Report history accessible to moderators

---

## 10. Crisis Detection

### Test Case 10.1: Crisis Keyword Detection
- [ ] Click "Share your story"
- [ ] Enter content with crisis keywords:
  - [ ] "I want to kill myself"
  - [ ] "No reason to live"
  - [ ] "Better off dead"
  - [ ] "Planning to end it all"
- [ ] Try to post
- [ ] Verify crisis modal displays BEFORE post is created
- [ ] Verify helplines shown prominently
- [ ] Verify "Get Support" and "Post Anyway" options

**Expected:** Crisis keywords trigger intervention modal

### Test Case 10.2: Crisis Modal - Get Support
- [ ] Trigger crisis modal (use keywords)
- [ ] Click "Get Support" button
- [ ] Verify navigated to helplines page
- [ ] Verify post NOT created
- [ ] Verify draft saved (optional)

**Expected:** "Get Support" navigates to resources, cancels post

### Test Case 10.3: Crisis Modal - Post Anyway
- [ ] Trigger crisis modal
- [ ] Click "Post Anyway" button
- [ ] Verify post is created
- [ ] Verify post has crisis flag (🚨 badge)
- [ ] Verify crisis level: "high" or "critical"
- [ ] Verify helplines displayed with post

**Expected:** User can proceed after acknowledgment

### Test Case 10.4: Crisis-Flagged Post Display
- [ ] Create crisis-flagged post
- [ ] View in feed
- [ ] Verify:
  - [ ] 🚨 Red "Crisis" badge
  - [ ] Warning banner above content
  - [ ] Helplines displayed prominently
  - [ ] "Get Help" call-to-action visible

**Expected:** Crisis posts clearly marked with resources

### Test Case 10.5: First Crisis Responder Reward
- [ ] Create crisis-flagged post in Profile A
- [ ] Add supportive comment in Profile B
- [ ] Check Profile B wallet: +100 VOICE (crisis response)
- [ ] Add another comment in Profile C
- [ ] Check Profile C wallet: +3 VOICE (regular comment, no bonus)

**Expected:** Only first crisis responder gets 100 VOICE bonus

### Test Case 10.6: Crisis Severity Levels
- [ ] Create post with 1 crisis keyword
- [ ] Verify severity: "high"
- [ ] Create post with 3+ crisis keywords
- [ ] Verify severity: "critical"
- [ ] Verify different visual treatment if applicable

**Expected:** Severity levels detect based on keyword count

---

## 11. Notifications

### Test Case 11.1: Reaction Notification
- [ ] Create post in Profile A
- [ ] Add reaction in Profile B
- [ ] Switch to Profile A
- [ ] Click bell icon in navigation
- [ ] Verify notification: "❤️ Student#XXXX reacted to your post"
- [ ] Verify unread badge on bell icon
- [ ] Click notification
- [ ] Verify navigates to post

**Expected:** Reaction notifications work

### Test Case 11.2: Comment Notification
- [ ] Create post in Profile A
- [ ] Add comment in Profile B
- [ ] Check Profile A notifications
- [ ] Verify notification: "💬 Student#XXXX commented on your post"
- [ ] Click notification
- [ ] Verify navigates to post with comment visible

**Expected:** Comment notifications work

### Test Case 11.3: Reply Notification
- [ ] Create comment in Profile A
- [ ] Reply to comment in Profile B
- [ ] Check Profile A notifications
- [ ] Verify notification: "💬 Student#XXXX replied to your comment"

**Expected:** Reply notifications work

### Test Case 11.4: Award Notification
- [ ] Create post in Profile A
- [ ] Send tip from Profile B
- [ ] Check Profile A notifications
- [ ] Verify notification: "🏆 Received 10 VOICE tip on your post! 💰"

**Expected:** Award notifications work

### Test Case 11.5: Unread Count
- [ ] Generate 3 notifications (do not read)
- [ ] Verify bell icon shows badge: "3"
- [ ] Click bell to open dropdown
- [ ] Verify 3 notifications shown
- [ ] Mark one as read
- [ ] Verify badge updates to: "2"

**Expected:** Unread count always accurate

### Test Case 11.6: Mark All as Read
- [ ] Generate multiple notifications
- [ ] Open notifications dropdown
- [ ] Click "Mark All as Read"
- [ ] Verify all notifications marked read
- [ ] Verify unread badge disappears
- [ ] Verify visual indication (grayed out)

**Expected:** Bulk mark as read works

### Test Case 11.7: Notification Persistence
- [ ] Generate notifications
- [ ] Close browser
- [ ] Reopen
- [ ] Verify notifications persist
- [ ] Verify unread status persists

**Expected:** Notifications saved to localStorage

---

## 12. VOICE Token Rewards

### Test Case 12.1: First Post Reward
- [ ] Clear localStorage (reset)
- [ ] Create first post
- [ ] Open wallet section
- [ ] Verify balance: 20 VOICE
- [ ] Verify transaction: "Your first post! Welcome to SafeVoice"
- [ ] Verify category: "posts"

**Expected:** 20 VOICE for first post

### Test Case 12.2: Regular Post Reward
- [ ] Create additional post (not first)
- [ ] Verify +10 VOICE
- [ ] Verify transaction: "New post created"

**Expected:** 10 VOICE for regular posts

### Test Case 12.3: Media Post Bonus
- [ ] Create post with image attachment
- [ ] Verify +25 VOICE total (10 base + 15 bonus)
- [ ] Verify transaction mentions media

**Expected:** Additional 15 VOICE for posts with media

### Test Case 12.4: Viral Post Reward
- [ ] Create post
- [ ] Add 100+ reactions (use multiple profiles)
- [ ] Verify +150 VOICE awarded
- [ ] Verify transaction: "Your post went viral!"
- [ ] Verify "Viral" badge on post

**Expected:** 150 VOICE bonus at 100 reactions

### Test Case 12.5: Comment Rewards
- [ ] Add top-level comment
- [ ] Verify +3 VOICE
- [ ] Add reply to comment
- [ ] Verify +2 VOICE

**Expected:** Comments 3 VOICE, replies 2 VOICE

### Test Case 12.6: Reaction Rewards
- [ ] Give reaction
- [ ] Verify +1 VOICE
- [ ] Receive reaction on your post
- [ ] Verify +2 VOICE

**Expected:** Give 1 VOICE, receive 2 VOICE

### Test Case 12.7: Helpful Content Rewards
- [ ] Post marked helpful
- [ ] Verify +50 VOICE
- [ ] Comment reaches 5 helpful votes
- [ ] Verify +25 VOICE

**Expected:** Helpful post 50, helpful comment 25

### Test Case 12.8: Crisis Support Reward
- [ ] Comment on crisis-flagged post first
- [ ] Verify +100 VOICE
- [ ] Verify transaction: "First crisis support response"

**Expected:** 100 VOICE for first crisis responder

### Test Case 12.9: Verified Advice Reward
- [ ] Enable moderator mode
- [ ] Mark comment as verified advice
- [ ] Check comment author wallet: +200 VOICE
- [ ] Verify transaction: "Verified advice by moderator"

**Expected:** 200 VOICE for verified advice

### Test Case 12.10: Valid Report Reward
- [ ] Submit report
- [ ] Have moderator mark as valid
- [ ] Check reporter wallet: +10 VOICE
- [ ] Verify transaction: "Report confirmed by moderators"

**Expected:** 10 VOICE for valid reports

### Test Case 12.11: False Report Penalty
- [ ] Submit report
- [ ] Have moderator mark as invalid
- [ ] Check reporter wallet: -5 VOICE
- [ ] Verify transaction: "Report marked invalid"

**Expected:** -5 VOICE penalty for false reports

### Test Case 12.12: Moderator Action Rewards
- [ ] Enable moderator mode
- [ ] Review report (valid or invalid)
- [ ] Verify +30 VOICE
- [ ] Verify transaction: "Moderator action"
- [ ] Review another report immediately
- [ ] Verify NO reward (cooldown)

**Expected:** 30 VOICE per action, 5-minute cooldown

### Test Case 12.13: Daily Login Bonus
- [ ] Log in for first time today
- [ ] Verify +5 VOICE
- [ ] Verify transaction: "Daily login bonus"
- [ ] Refresh page
- [ ] Verify no additional bonus same day

**Expected:** 5 VOICE once per day

### Test Case 12.14: Login Streak Rewards
- [ ] Log in 7 consecutive days
- [ ] Verify +50 VOICE on 7th day
- [ ] Log in 30 consecutive days
- [ ] Verify +300 VOICE on 30th day

**Expected:** Streak bonuses at milestones

### Test Case 12.15: Transaction History
- [ ] Perform various reward actions
- [ ] Open wallet section
- [ ] Click "Transaction History"
- [ ] Verify all transactions listed:
  - [ ] Type (earn/spend/claim)
  - [ ] Amount
  - [ ] Reason
  - [ ] Timestamp
  - [ ] Balance after transaction
- [ ] Verify sorted by newest first

**Expected:** Complete transaction history with details

### Test Case 12.16: Earnings Breakdown
- [ ] Earn tokens in different categories
- [ ] Open wallet section
- [ ] View earnings breakdown
- [ ] Verify categories with amounts:
  - [ ] Posts
  - [ ] Reactions
  - [ ] Comments
  - [ ] Helpful
  - [ ] Streaks
  - [ ] Bonuses
  - [ ] Crisis
  - [ ] Reporting

**Expected:** Accurate breakdown by category

---

## 13. Post Lifetime & Expiry

### Test Case 13.1: Post with 1 Hour Lifetime
- [ ] Create post with lifetime: "1 Hour"
- [ ] Verify displays: "Expires in 1 hour"
- [ ] Wait 50 minutes
- [ ] Verify warning appears: "Expires soon"
- [ ] Wait 10+ minutes
- [ ] Refresh page
- [ ] Verify post removed from feed

**Expected:** Post expires and removes after 1 hour

### Test Case 13.2: Never Expire Option
- [ ] Create post with lifetime: "Never"
- [ ] Verify no expiry message
- [ ] Wait extended period
- [ ] Verify post remains in feed

**Expected:** Never-expiring posts stay indefinitely

### Test Case 13.3: Expiry Warning
- [ ] Create post with 1-hour lifetime
- [ ] Wait until 10 minutes before expiry
- [ ] Verify warning banner: "⏰ This post expires in 10 minutes"
- [ ] Verify "Extend Lifetime" button available (premium feature)

**Expected:** Warning shown 10 minutes before expiry

### Test Case 13.4: Extend Post Lifetime (Premium)
- [ ] Create post with 1-hour lifetime
- [ ] Wait for expiry warning
- [ ] Click "Extend Lifetime" (costs VOICE)
- [ ] Confirm purchase
- [ ] Verify expiry time extended
- [ ] Check wallet: VOICE deducted

**Expected:** Lifetime extension works for cost

### Test Case 13.5: Expired Post Cleanup
- [ ] Create several posts with 1-hour lifetime
- [ ] Wait for expiry
- [ ] Refresh page
- [ ] Verify expired posts removed
- [ ] Check localStorage
- [ ] Verify posts deleted or marked expired

**Expected:** Expired posts automatically cleaned up

---

## 14. Content Moderation

### Test Case 14.1: Personal Information Detection
- [ ] Try to create post with phone number: "+91 9876543210"
- [ ] Verify blocked with error: "Personal information detected"
- [ ] Try email: "test@example.com"
- [ ] Verify blocked

**Expected:** Personal info (phone, email, address) blocked

### Test Case 14.2: Spam Detection
- [ ] Create identical posts 3 times
- [ ] Verify 3rd attempt blocked: "This looks like spam"
- [ ] Try post with 5+ URLs
- [ ] Verify blocked

**Expected:** Duplicate content and excessive URLs blocked

### Test Case 14.3: Profanity Warning
- [ ] Create post with profanity
- [ ] Verify warning shown
- [ ] Verify post allowed but blurred
- [ ] Verify blur message: "Profanity detected"

**Expected:** Profanity warnings shown, content blurred

### Test Case 14.4: Harassment Detection
- [ ] Create post with harassment keywords: "hate you, loser"
- [ ] Verify warning shown
- [ ] Verify post flagged for review
- [ ] Verify severity: "high"

**Expected:** Harassment flagged but allowed with warning

### Test Case 14.5: Blur Post (Moderator Action)
- [ ] Enable moderator mode
- [ ] Find any post
- [ ] Click three dots
- [ ] Select "Blur Post"
- [ ] Add reason: "Sensitive content"
- [ ] Confirm
- [ ] Verify post blurred with reason displayed
- [ ] Check moderator wallet: +30 VOICE

**Expected:** Moderators can manually blur posts

### Test Case 14.6: Hide Post (Moderator Action)
- [ ] Enable moderator mode
- [ ] Find any post
- [ ] Click three dots
- [ ] Select "Hide Post"
- [ ] Add reason
- [ ] Confirm
- [ ] Verify post removed from public feed
- [ ] Verify still visible to moderators
- [ ] Check moderator wallet: +30 VOICE

**Expected:** Moderators can hide posts from feed

### Test Case 14.7: Restore Post (Moderator Action)
- [ ] Find hidden or blurred post
- [ ] Enable moderator mode
- [ ] Click "Restore Post"
- [ ] Confirm
- [ ] Verify post returns to normal
- [ ] Verify blur/hide removed
- [ ] Check moderator wallet: +30 VOICE

**Expected:** Moderators can restore content

---

## 15. Responsive Design

### Test Case 15.1: Mobile View (320px)
- [ ] Resize browser to 320px width
- [ ] Navigate to Feed
- [ ] Verify:
  - [ ] Posts display in single column
  - [ ] Bottom navigation visible
  - [ ] Top navbar hidden or collapsed
  - [ ] Create post button accessible
  - [ ] All interactions work (reactions, comments)
  - [ ] Moderation panel adapts

**Expected:** Fully functional on small mobile screens

### Test Case 15.2: Tablet View (768px)
- [ ] Resize to 768px width
- [ ] Verify:
  - [ ] Feed displays appropriately
  - [ ] Top navbar visible
  - [ ] Bottom nav may be hidden
  - [ ] Moderator panel width adapts
  - [ ] Touch interactions work

**Expected:** Optimized for tablet

### Test Case 15.3: Desktop View (1024px+)
- [ ] Resize to 1024px+ width
- [ ] Verify:
  - [ ] Full navbar with all options
  - [ ] Feed centered with max-width
  - [ ] Moderator panel full width
  - [ ] Sidebar visible (if applicable)
  - [ ] Hover states work

**Expected:** Full desktop experience

### Test Case 15.4: Orientation Change
- [ ] Test on mobile device or simulate
- [ ] Rotate device portrait → landscape
- [ ] Verify layout adapts
- [ ] Verify no content cutoff
- [ ] Verify modals still accessible

**Expected:** Handles orientation changes smoothly

### Test Case 15.5: Touch vs Mouse
- [ ] Test touch interactions on mobile
- [ ] Test mouse hover on desktop
- [ ] Verify tooltips appear on desktop
- [ ] Verify tap feedback on mobile

**Expected:** Appropriate interaction for device type

---

## 16. Performance

### Test Case 16.1: Large Feed Performance
- [ ] Create 50+ posts
- [ ] Navigate to feed
- [ ] Measure load time
- [ ] Scroll through feed
- [ ] Verify smooth scrolling
- [ ] Verify no lag when interacting

**Expected:** Feed performs well with many posts

### Test Case 16.2: Comment Thread Performance
- [ ] Create post with 50+ comments
- [ ] Open comment section
- [ ] Measure render time
- [ ] Interact with comments
- [ ] Verify no performance degradation

**Expected:** Large comment threads render efficiently

### Test Case 16.3: localStorage Size
- [ ] Create extensive test data (posts, comments, transactions)
- [ ] Check localStorage size in DevTools
- [ ] Verify under browser limits (~5MB)
- [ ] Test with full storage
- [ ] Verify graceful handling if limit reached

**Expected:** localStorage usage reasonable and monitored

### Test Case 16.4: Memory Leaks
- [ ] Open feed
- [ ] Create/delete many posts
- [ ] Check browser memory in DevTools
- [ ] Verify memory doesn't continuously grow
- [ ] Verify timers cleaned up on unmount

**Expected:** No memory leaks over time

### Test Case 16.5: Network Requests (Future)
- [ ] Monitor network tab in DevTools
- [ ] Perform various actions
- [ ] Verify minimal/no unnecessary requests
- [ ] Verify efficient API calls (when backend added)

**Expected:** Efficient network usage

---

## 17. Accessibility

### Test Case 17.1: Keyboard Navigation
- [ ] Tab through feed page
- [ ] Verify all interactive elements focusable:
  - [ ] Create post button
  - [ ] Post reaction buttons
  - [ ] Comment buttons
  - [ ] Three dots menus
  - [ ] Moderator actions
- [ ] Verify focus indicators visible
- [ ] Verify tab order logical

**Expected:** Full keyboard navigation support

### Test Case 17.2: Screen Reader Support
- [ ] Enable screen reader (VoiceOver, NVDA, JAWS)
- [ ] Navigate feed
- [ ] Verify elements announced:
  - [ ] Post content
  - [ ] Student IDs
  - [ ] Timestamps
  - [ ] Reaction counts
  - [ ] Button labels
- [ ] Verify ARIA labels present
- [ ] Verify landmark regions defined

**Expected:** Screen reader accessible

### Test Case 17.3: Color Contrast
- [ ] Check text on background contrast ratios
- [ ] Verify meets WCAG AA standards (4.5:1 for normal text)
- [ ] Test button colors
- [ ] Test link colors
- [ ] Test on light and dark modes (if applicable)

**Expected:** Sufficient color contrast for readability

### Test Case 17.4: Focus States
- [ ] Tab through interactive elements
- [ ] Verify visible focus indicators
- [ ] Verify focus outline/ring shows
- [ ] Verify custom focus styles applied

**Expected:** Clear focus indicators for all interactive elements

### Test Case 17.5: Alternative Text
- [ ] Create post with image
- [ ] Verify `alt` attribute present
- [ ] Verify descriptive alt text
- [ ] Verify icons have aria-labels

**Expected:** All images have meaningful alt text

---

## 18. Data Persistence

### Test Case 18.1: localStorage Persistence
- [ ] Create posts, comments, bookmarks
- [ ] Note all data
- [ ] Close browser completely
- [ ] Reopen browser
- [ ] Navigate to SafeVoice
- [ ] Verify all data persisted:
  - [ ] Posts
  - [ ] Comments
  - [ ] Bookmarks
  - [ ] Notifications
  - [ ] Wallet balance
  - [ ] Student ID

**Expected:** All data survives browser restart

### Test Case 18.2: Cross-Tab Sync (Limitation)
- [ ] Open SafeVoice in Tab A
- [ ] Create post in Tab A
- [ ] Open Tab B (same browser)
- [ ] Refresh Tab B
- [ ] Verify post appears in Tab B after refresh

**Expected:** Data syncs between tabs on refresh (no real-time sync expected)

### Test Case 18.3: Data Export
- [ ] Create extensive test data
- [ ] Navigate to Settings/Profile
- [ ] Click "Download Data Backup"
- [ ] Verify JSON file downloads
- [ ] Open JSON
- [ ] Verify all data present:
  - [ ] Posts
  - [ ] Comments
  - [ ] Wallet transactions
  - [ ] Bookmarks

**Expected:** Complete data export to JSON

### Test Case 18.4: Data Import (Future)
- [ ] Have JSON backup file
- [ ] Navigate to Settings
- [ ] Click "Import Data"
- [ ] Select backup file
- [ ] Verify data restored

**Expected:** Data can be imported from backup (if implemented)

### Test Case 18.5: Clear All Data
- [ ] Navigate to Settings
- [ ] Click "Clear All Data" (if available)
- [ ] Confirm action
- [ ] Verify localStorage cleared
- [ ] Verify new Student ID generated
- [ ] Verify wallet reset to 0

**Expected:** Data can be completely reset

---

## Test Summary Report Template

After completing tests, document results:

```
# SafeVoice Communities QA Test Report

**Date:** [Date]
**Tester:** [Name]
**Environment:** [Browser, OS, Device]
**Build/Version:** [Version number]

## Test Results

| Section | Total Tests | Passed | Failed | Blocked | Notes |
|---------|-------------|--------|--------|---------|-------|
| 1. User Identity | 4 | 4 | 0 | 0 | All passed |
| 2. Post Creation | 9 | 8 | 1 | 0 | Failed: 2.9 |
| ... | ... | ... | ... | ... | ... |

## Failed Tests

### Test 2.9: Maximum Content Length
- **Status:** FAILED
- **Expected:** Content length validation works
- **Actual:** No validation, allows >10k chars
- **Severity:** Medium
- **Steps to reproduce:**
  1. Click "Share your story"
  2. Paste 15,000 character text
  3. Post successfully submitted
- **Screenshot:** [Link]

## Blockers

[List any tests that couldn't be completed and why]

## Notes

[Additional observations, suggestions, or concerns]
```

---

## Conclusion

This checklist covers the core functionality of the SafeVoice community system. Use it for:
- **Pre-release testing** - Ensure all features work before deployment
- **Regression testing** - Verify existing features after changes
- **Onboarding new testers** - Guide for understanding the system
- **Bug verification** - Reproduce and verify bug fixes

For technical details, see:
- [User Guide](./COMMUNITIES_USER_GUIDE.md)
- [Moderation Guide](./COMMUNITY_MODERATION_GUIDE.md)
- [Technical Overview](./COMMUNITIES_TECH_OVERVIEW.md)

---

*Last updated: November 2024*
*Version: 2.2*
