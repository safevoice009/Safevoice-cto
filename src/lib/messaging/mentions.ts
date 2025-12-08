/**
 * Mention parsing and highlighting utilities
 */
import type { Mention, MentionSuggestion } from './types';

// Regex pattern for @mentions: @StudentName#0001 or @username#1234
const MENTION_PATTERN = /@([\w\s]+)#(\d+)/g;

/**
 * Parse @mentions from message content
 * Pattern: @StudentName#0001 or @username#1234
 */
export function parseMentions(content: string): Mention[] {
  const mentions: Mention[] = [];
  let match;

  const regex = new RegExp(MENTION_PATTERN);
  while ((match = regex.exec(content)) !== null) {
    const fullMatch = match[0]; // e.g., "@StudentName#0001"
    const username = match[1]; // e.g., "StudentName"
    const number = match[2]; // e.g., "0001"

    mentions.push({
      userId: `${username}#${number}`,
      username: username.trim(),
      displayName: `${username.trim()}#${number}`,
      position: {
        start: match.index,
        end: match.index + fullMatch.length,
      },
    });
  }

  return mentions;
}

/**
 * Extract mention suggestions from text input
 * Returns suggestions for incomplete @mentions (e.g., "@stud" -> suggestions for students matching "stud")
 */
export function getMentionSuggestionsFromInput(
  input: string,
  availableUsers: Array<{ id: string; username: string; displayName: string }>
): MentionSuggestion[] {
  // Find the last @ symbol and get text after it
  const lastAtIndex = input.lastIndexOf('@');
  if (lastAtIndex === -1) return [];

  const textAfterAt = input.substring(lastAtIndex + 1);

  // Don't suggest if they've already completed the mention (includes #)
  if (textAfterAt.includes('#')) return [];

  // Filter users by username/display name match
  const suggestions = availableUsers
    .filter((user) => {
      const lowerSearch = textAfterAt.toLowerCase();
      return (
        user.username.toLowerCase().includes(lowerSearch) ||
        user.displayName.toLowerCase().includes(lowerSearch)
      );
    })
    .map((user, index) => ({
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      rank: index, // Simple rank based on order
    }))
    .slice(0, 5); // Limit to 5 suggestions

  return suggestions;
}

/**
 * Highlight mentions in content by wrapping them in HTML spans
 * Used for rendering mentions in UI
 */
export function highlightMentions(
  content: string
): { html: string; mentions: Mention[] } {
  const mentions = parseMentions(content);

  let html = content;
  // Process mentions in reverse order to maintain correct positions
  for (let i = mentions.length - 1; i >= 0; i--) {
    const mention = mentions[i];
    const { start, end } = mention.position;
    const mentionText = content.substring(start, end);

    // Create a replaceable marker for mention
    const replacement = `<mention data-user-id="${mention.userId}">${mentionText}</mention>`;
    html = html.substring(0, start) + replacement + html.substring(end);
  }

  return { html, mentions };
}

/**
 * Replace incomplete @mention with complete format
 * E.g., user selects "Student" from suggestions for "@stu" -> "@Student#0001"
 */
export function completeMention(
  input: string,
  selectedUser: { username: string; id: string }
): string {
  const lastAtIndex = input.lastIndexOf('@');
  if (lastAtIndex === -1) return input;

  const textAfterAt = input.substring(lastAtIndex + 1);
  if (textAfterAt.includes('#')) return input; // Already complete

  // Replace from @ to cursor position with complete mention
  const beforeAt = input.substring(0, lastAtIndex);
  const userId = selectedUser.id;
  return `${beforeAt}@${selectedUser.username}#${userId} `;
}

/**
 * Extract user IDs from mentions in content
 */
export function extractMentionedUserIds(content: string): string[] {
  const mentions = parseMentions(content);
  return mentions.map((m) => m.userId);
}
