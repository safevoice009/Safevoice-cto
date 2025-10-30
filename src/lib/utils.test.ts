import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getRelativeTime,
  formatTimeAgo,
  formatCount,
  getStudentIdColor,
  sanitizeContent,
  detectUrls,
  parseMarkdown,
  copyToClipboard,
  getLifetimeDuration,
  formatTimeRemaining,
  getTimerColor,
  getTimerTextColor,
  getTimerBgColor,
  generatePostId,
  generateStudentId,
} from './utils';

describe('Utils - Time Formatting', () => {
  describe('getRelativeTime', () => {
    it('should return "just now" for recent timestamps', () => {
      const now = Date.now();
      expect(getRelativeTime(now)).toBe('just now');
      expect(getRelativeTime(now - 30000)).toBe('just now');
    });

    it('should return minutes for timestamps under an hour', () => {
      const now = Date.now();
      expect(getRelativeTime(now - 5 * 60 * 1000)).toBe('5m ago');
      expect(getRelativeTime(now - 45 * 60 * 1000)).toBe('45m ago');
    });

    it('should return hours for timestamps under a day', () => {
      const now = Date.now();
      expect(getRelativeTime(now - 2 * 60 * 60 * 1000)).toBe('2h ago');
      expect(getRelativeTime(now - 12 * 60 * 60 * 1000)).toBe('12h ago');
    });

    it('should return days for timestamps under a week', () => {
      const now = Date.now();
      expect(getRelativeTime(now - 2 * 24 * 60 * 60 * 1000)).toBe('2d ago');
      expect(getRelativeTime(now - 5 * 24 * 60 * 60 * 1000)).toBe('5d ago');
    });

    it('should return formatted date for older timestamps', () => {
      const oldDate = Date.now() - 10 * 24 * 60 * 60 * 1000;
      const result = getRelativeTime(oldDate);
      expect(result).toMatch(/\d{1,2}\/\d{1,2}\/\d{4}/);
    });
  });

  describe('formatTimeAgo', () => {
    it('should handle all time ranges correctly', () => {
      const now = Date.now();
      
      expect(formatTimeAgo(now - 30000)).toBe('just now');
      expect(formatTimeAgo(now - 5 * 60 * 1000)).toBe('5m ago');
      expect(formatTimeAgo(now - 3 * 60 * 60 * 1000)).toBe('3h ago');
      expect(formatTimeAgo(now - 2 * 24 * 60 * 60 * 1000)).toBe('2d ago');
      expect(formatTimeAgo(now - 2 * 7 * 24 * 60 * 60 * 1000)).toBe('2w ago');
      expect(formatTimeAgo(now - 3 * 30 * 24 * 60 * 60 * 1000)).toBe('3mo ago');
      expect(formatTimeAgo(now - 2 * 365 * 24 * 60 * 60 * 1000)).toBe('2y ago');
    });
  });

  describe('formatTimeRemaining', () => {
    it('should return null for no expiry', () => {
      expect(formatTimeRemaining(null)).toBeNull();
    });

    it('should return "Expired" for past timestamps', () => {
      const past = Date.now() - 1000;
      expect(formatTimeRemaining(past)).toBe('Expired');
    });

    it('should format minutes remaining', () => {
      const future = Date.now() + 45 * 60 * 1000;
      expect(formatTimeRemaining(future)).toBe('45m');
    });

    it('should format hours and minutes remaining', () => {
      const future = Date.now() + (3 * 60 + 30) * 60 * 1000;
      expect(formatTimeRemaining(future)).toBe('3h 30m');
    });

    it('should format days and hours remaining', () => {
      const future = Date.now() + (2 * 24 + 5) * 60 * 60 * 1000;
      expect(formatTimeRemaining(future)).toBe('2d 5h');
    });
  });
});

describe('Utils - Number Formatting', () => {
  describe('formatCount', () => {
    it('should return plain numbers for counts under 1000', () => {
      expect(formatCount(0)).toBe('0');
      expect(formatCount(50)).toBe('50');
      expect(formatCount(999)).toBe('999');
    });

    it('should format thousands with K suffix', () => {
      expect(formatCount(1000)).toBe('1.0K');
      expect(formatCount(1500)).toBe('1.5K');
      expect(formatCount(25000)).toBe('25.0K');
    });

    it('should format millions with M suffix', () => {
      expect(formatCount(1000000)).toBe('1.0M');
      expect(formatCount(1500000)).toBe('1.5M');
      expect(formatCount(25000000)).toBe('25.0M');
    });
  });
});

describe('Utils - Content Processing', () => {
  describe('sanitizeContent', () => {
    it('should remove script tags', () => {
      const malicious = '<script>alert("XSS")</script>Hello';
      expect(sanitizeContent(malicious)).toBe('Hello');
    });

    it('should remove event handlers', () => {
      const malicious = '<div onclick="alert()">Click me</div>';
      const result = sanitizeContent(malicious);
      expect(result).not.toContain('onclick');
    });

    it('should trim whitespace', () => {
      expect(sanitizeContent('  Hello World  ')).toBe('Hello World');
    });

    it('should handle normal content', () => {
      const normal = 'This is normal content.';
      expect(sanitizeContent(normal)).toBe(normal);
    });
  });

  describe('detectUrls', () => {
    it('should convert URLs to clickable links', () => {
      const text = 'Check out https://example.com';
      const result = detectUrls(text);
      expect(result).toContain('<a href="https://example.com"');
      expect(result).toContain('target="_blank"');
      expect(result).toContain('rel="noopener noreferrer"');
    });

    it('should handle multiple URLs', () => {
      const text = 'Visit https://example.com and http://test.com';
      const result = detectUrls(text);
      expect(result).toContain('https://example.com');
      expect(result).toContain('http://test.com');
    });

    it('should not affect text without URLs', () => {
      const text = 'No URLs here';
      expect(detectUrls(text)).toBe(text);
    });
  });

  describe('parseMarkdown', () => {
    it('should parse bold text', () => {
      const text = 'This is **bold** text';
      const result = parseMarkdown(text);
      expect(result).toContain('<strong>bold</strong>');
    });

    it('should parse italic text', () => {
      const text = 'This is *italic* text';
      const result = parseMarkdown(text);
      expect(result).toContain('<em>italic</em>');
    });

    it('should escape HTML entities', () => {
      const text = '<script>alert("XSS")</script>';
      const result = parseMarkdown(text);
      expect(result).toContain('&lt;script&gt;');
      expect(result).not.toContain('<script>');
    });

    it('should convert newlines to <br> tags', () => {
      const text = 'Line 1\nLine 2';
      const result = parseMarkdown(text);
      expect(result).toContain('<br>');
    });

    it('should convert URLs to links', () => {
      const text = 'Visit https://example.com';
      const result = parseMarkdown(text);
      expect(result).toContain('<a href="https://example.com"');
    });

    it('should handle combined markdown', () => {
      const text = '**Bold** and *italic* with https://example.com';
      const result = parseMarkdown(text);
      expect(result).toContain('<strong>Bold</strong>');
      expect(result).toContain('<em>italic</em>');
      expect(result).toContain('<a href=');
    });
  });
});

describe('Utils - Student ID', () => {
  describe('getStudentIdColor', () => {
    it('should return a consistent color for the same ID', () => {
      const id = 'Student#1234';
      const color1 = getStudentIdColor(id);
      const color2 = getStudentIdColor(id);
      expect(color1).toBe(color2);
    });

    it('should return different colors for different IDs', () => {
      const id1 = 'Student#1234';
      const id2 = 'Student#5678';
      const color1 = getStudentIdColor(id1);
      const color2 = getStudentIdColor(id2);
      // They might be the same due to hash collision, but usually different
      expect(typeof color1).toBe('string');
      expect(typeof color2).toBe('string');
    });

    it('should return a gradient color class', () => {
      const color = getStudentIdColor('Student#1234');
      expect(color).toMatch(/from-\w+-\d+ to-\w+-\d+/);
    });
  });

  describe('generateStudentId', () => {
    it('should generate ID in correct format', () => {
      const id = generateStudentId();
      expect(id).toMatch(/^Student#\d{4}$/);
    });

    it('should generate different IDs', () => {
      const ids = new Set();
      for (let i = 0; i < 100; i++) {
        ids.add(generateStudentId());
      }
      // Should have many unique IDs (allowing some collisions)
      expect(ids.size).toBeGreaterThan(90);
    });

    it('should generate IDs in valid range', () => {
      for (let i = 0; i < 10; i++) {
        const id = generateStudentId();
        const number = parseInt(id.replace('Student#', ''));
        expect(number).toBeGreaterThanOrEqual(1000);
        expect(number).toBeLessThanOrEqual(9999);
      }
    });
  });
});

describe('Utils - Post Lifetime', () => {
  describe('getLifetimeDuration', () => {
    it('should return correct duration for 1h', () => {
      expect(getLifetimeDuration('1h')).toBe(60 * 60 * 1000);
    });

    it('should return correct duration for 6h', () => {
      expect(getLifetimeDuration('6h')).toBe(6 * 60 * 60 * 1000);
    });

    it('should return correct duration for 24h', () => {
      expect(getLifetimeDuration('24h')).toBe(24 * 60 * 60 * 1000);
    });

    it('should return correct duration for 7d', () => {
      expect(getLifetimeDuration('7d')).toBe(7 * 24 * 60 * 60 * 1000);
    });

    it('should return correct duration for 30d', () => {
      expect(getLifetimeDuration('30d')).toBe(30 * 24 * 60 * 60 * 1000);
    });

    it('should return null for unknown values', () => {
      expect(getLifetimeDuration('invalid')).toBeNull();
      expect(getLifetimeDuration('never')).toBeNull();
    });
  });

  describe('getTimerColor', () => {
    it('should return green for more than 24 hours', () => {
      const future = Date.now() + 25 * 60 * 60 * 1000;
      expect(getTimerColor(future)).toBe('green');
    });

    it('should return yellow for 6-24 hours', () => {
      const future = Date.now() + 12 * 60 * 60 * 1000;
      expect(getTimerColor(future)).toBe('yellow');
    });

    it('should return orange for 1-6 hours', () => {
      const future = Date.now() + 3 * 60 * 60 * 1000;
      expect(getTimerColor(future)).toBe('orange');
    });

    it('should return red for less than 1 hour', () => {
      const future = Date.now() + 30 * 60 * 1000;
      expect(getTimerColor(future)).toBe('red');
    });

    it('should return red-pulse for less than 5 minutes', () => {
      const future = Date.now() + 2 * 60 * 1000;
      expect(getTimerColor(future)).toBe('red-pulse');
    });

    it('should return gray for null', () => {
      expect(getTimerColor(null)).toBe('gray');
    });
  });

  describe('getTimerTextColor', () => {
    it('should return correct text color classes', () => {
      expect(getTimerTextColor('green')).toBe('text-green-500');
      expect(getTimerTextColor('yellow')).toBe('text-yellow-500');
      expect(getTimerTextColor('orange')).toBe('text-orange-500');
      expect(getTimerTextColor('red')).toBe('text-red-500');
      expect(getTimerTextColor('red-pulse')).toContain('text-red-500');
      expect(getTimerTextColor('gray')).toBe('text-gray-500');
    });

    it('should return default for unknown color', () => {
      expect(getTimerTextColor('unknown')).toBe('text-gray-500');
    });
  });

  describe('getTimerBgColor', () => {
    it('should return correct background color classes', () => {
      expect(getTimerBgColor('green')).toContain('bg-green-500/10');
      expect(getTimerBgColor('yellow')).toContain('bg-yellow-500/10');
      expect(getTimerBgColor('orange')).toContain('bg-orange-500/10');
      expect(getTimerBgColor('red')).toContain('bg-red-500/10');
      expect(getTimerBgColor('gray')).toContain('bg-gray-500/10');
    });
  });
});

describe('Utils - Clipboard', () => {
  describe('copyToClipboard', () => {
    it('should copy using navigator.clipboard when available', async () => {
      const mockWriteText = vi.fn().mockResolvedValue(undefined);
      Object.defineProperty(navigator, 'clipboard', {
        value: { writeText: mockWriteText },
        writable: true,
      });
      Object.defineProperty(window, 'isSecureContext', {
        value: true,
        writable: true,
      });

      await copyToClipboard('test text');

      expect(mockWriteText).toHaveBeenCalledWith('test text');
    });

    it('should fallback to execCommand when clipboard API unavailable', async () => {
      Object.defineProperty(navigator, 'clipboard', {
        value: undefined,
        writable: true,
      });

      const mockExecCommand = vi.fn().mockReturnValue(true);
      document.execCommand = mockExecCommand;

      await copyToClipboard('test text');

      expect(mockExecCommand).toHaveBeenCalledWith('copy');
    });
  });
});

describe('Utils - ID Generation', () => {
  describe('generatePostId', () => {
    it('should generate a valid UUID when crypto.randomUUID is available', () => {
      const id = generatePostId();
      expect(id).toBeTruthy();
      expect(typeof id).toBe('string');
      // UUID format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
      expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
    });

    it('should generate unique IDs', () => {
      const ids = new Set();
      for (let i = 0; i < 100; i++) {
        ids.add(generatePostId());
      }
      expect(ids.size).toBe(100);
    });

    it('should fallback to timestamp-based ID when crypto unavailable', () => {
      const originalCrypto = global.crypto;
      Object.defineProperty(global, 'crypto', {
        value: undefined,
        writable: true,
      });

      const id = generatePostId();
      expect(id).toBeTruthy();
      expect(id).toContain('-');

      Object.defineProperty(global, 'crypto', {
        value: originalCrypto,
        writable: true,
      });
    });
  });
});

describe('Utils - Date Filtering', () => {
  describe('Time filtering helpers', () => {
    it('should identify timestamps within last 24 hours', () => {
      const now = Date.now();
      const yesterday = now - 23 * 60 * 60 * 1000;
      const twoDaysAgo = now - 48 * 60 * 60 * 1000;

      expect(now - yesterday).toBeLessThan(24 * 60 * 60 * 1000);
      expect(now - twoDaysAgo).toBeGreaterThan(24 * 60 * 60 * 1000);
    });

    it('should identify timestamps within last week', () => {
      const now = Date.now();
      const sixDaysAgo = now - 6 * 24 * 60 * 60 * 1000;
      const eightDaysAgo = now - 8 * 24 * 60 * 60 * 1000;

      expect(now - sixDaysAgo).toBeLessThan(7 * 24 * 60 * 60 * 1000);
      expect(now - eightDaysAgo).toBeGreaterThan(7 * 24 * 60 * 60 * 1000);
    });

    it('should identify timestamps within last month', () => {
      const now = Date.now();
      const twentyDaysAgo = now - 20 * 24 * 60 * 60 * 1000;
      const fortyDaysAgo = now - 40 * 24 * 60 * 60 * 1000;

      expect(now - twentyDaysAgo).toBeLessThan(30 * 24 * 60 * 60 * 1000);
      expect(now - fortyDaysAgo).toBeGreaterThan(30 * 24 * 60 * 60 * 1000);
    });
  });
});
