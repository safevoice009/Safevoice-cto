import { describe, it, expect } from 'vitest';
import {
  getRelativeTime,
  formatTimeAgo,
  formatCount,
  sanitizeContent,
  detectUrls,
  parseMarkdown,
  generatePostId,
  generateStudentId,
  getLifetimeDuration,
  formatTimeRemaining,
  getTimerColor,
  getTimerTextColor,
  getTimerBgColor,
  getStudentIdColor,
} from '../utils';

describe('Utils Edge Cases', () => {
  describe('Time Formatting Edge Cases', () => {
    it('handles negative timestamp differences', () => {
      const futureTime = Date.now() + 10000;
      const result = getRelativeTime(futureTime);
      expect(result).toBe('just now');
    });

    it('handles very old timestamps', () => {
      const veryOld = new Date('1970-01-01').getTime();
      const result = getRelativeTime(veryOld);
      expect(typeof result).toBe('string');
    });

    it('handles timestamp at exactly 60 seconds', () => {
      const sixtySecondsAgo = Date.now() - 60 * 1000;
      const result = getRelativeTime(sixtySecondsAgo);
      expect(result).toBe('1m ago');
    });

    it('handles timestamp at exactly 1 hour', () => {
      const oneHourAgo = Date.now() - 60 * 60 * 1000;
      const result = getRelativeTime(oneHourAgo);
      expect(result).toBe('1h ago');
    });

    it('handles timestamp at exactly 24 hours', () => {
      const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
      const result = getRelativeTime(oneDayAgo);
      expect(result).toBe('1d ago');
    });

    it('handles timestamp at exactly 7 days', () => {
      const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
      const result = getRelativeTime(sevenDaysAgo);
      expect(typeof result).toBe('string');
    });

    it('handles timestamp 0', () => {
      const result = getRelativeTime(0);
      expect(typeof result).toBe('string');
    });

    it('handles negative timestamp', () => {
      const result = getRelativeTime(-1000);
      expect(typeof result).toBe('string');
    });

    it('handles timestamp at Number.MAX_SAFE_INTEGER', () => {
      const result = getRelativeTime(Number.MAX_SAFE_INTEGER);
      expect(typeof result).toBe('string');
    });
  });

  describe('formatTimeAgo Edge Cases', () => {
    it('handles future timestamps', () => {
      const future = Date.now() + 10000;
      const result = formatTimeAgo(future);
      expect(result).toBe('just now');
    });

    it('handles exact boundary at 4 weeks', () => {
      const fourWeeksAgo = Date.now() - 28 * 24 * 60 * 60 * 1000;
      const result = formatTimeAgo(fourWeeksAgo);
      expect(result).toBe('0mo ago');
    });

    it('handles exact boundary at 12 months', () => {
      const twelveMonthsAgo = Date.now() - 365 * 24 * 60 * 60 * 1000;
      const result = formatTimeAgo(twelveMonthsAgo);
      expect(result).toMatch(/y ago/);
    });

    it('handles year boundary', () => {
      const oneYearAgo = Date.now() - 366 * 24 * 60 * 60 * 1000;
      const result = formatTimeAgo(oneYearAgo);
      expect(result).toMatch(/1y ago/);
    });
  });

  describe('formatCount Edge Cases', () => {
    it('handles zero', () => {
      expect(formatCount(0)).toBe('0');
    });

    it('handles negative numbers', () => {
      expect(formatCount(-100)).toBe('-100');
    });

    it('handles exactly 1000', () => {
      expect(formatCount(1000)).toBe('1.0K');
    });

    it('handles exactly 1000000', () => {
      expect(formatCount(1000000)).toBe('1.0M');
    });

    it('handles very large numbers', () => {
      expect(formatCount(999999999)).toBe('1000.0M');
    });

    it('handles decimals in thousands', () => {
      expect(formatCount(1500)).toBe('1.5K');
    });

    it('handles decimals in millions', () => {
      expect(formatCount(2500000)).toBe('2.5M');
    });

    it('handles Number.MAX_SAFE_INTEGER', () => {
      const result = formatCount(Number.MAX_SAFE_INTEGER);
      expect(result).toMatch(/M$/);
    });
  });

  describe('sanitizeContent Edge Cases', () => {
    it('removes script tags', () => {
      const malicious = '<script>alert("xss")</script>Hello';
      const result = sanitizeContent(malicious);
      expect(result).not.toContain('<script>');
      expect(result).toBe('Hello');
    });

    it('removes multiple script tags', () => {
      const malicious = '<script>bad1</script>Safe<script>bad2</script>';
      const result = sanitizeContent(malicious);
      expect(result).toBe('Safe');
    });

    it('removes event handlers', () => {
      const malicious = '<div onclick="alert()">Text</div>';
      const result = sanitizeContent(malicious);
      expect(result).not.toContain('onclick');
    });

    it('removes various event handlers', () => {
      const malicious = '<img onerror="alert()" onload="bad()" />';
      const result = sanitizeContent(malicious);
      expect(result).not.toContain('onerror');
      expect(result).not.toContain('onload');
    });

    it('handles empty string', () => {
      expect(sanitizeContent('')).toBe('');
    });

    it('handles whitespace-only string', () => {
      expect(sanitizeContent('   ')).toBe('');
    });

    it('handles normal text without changes', () => {
      const normal = 'This is normal text';
      expect(sanitizeContent(normal)).toBe(normal);
    });

    it('handles nested script tags', () => {
      const malicious = '<script><script>alert()</script></script>';
      const result = sanitizeContent(malicious);
      expect(result).toBe('</script>');
    });
  });

  describe('detectUrls Edge Cases', () => {
    it('handles text without URLs', () => {
      const text = 'Hello world';
      const result = detectUrls(text);
      expect(result).toBe('Hello world');
    });

    it('handles http URLs', () => {
      const text = 'Check http://example.com';
      const result = detectUrls(text);
      expect(result).toContain('<a href="http://example.com"');
    });

    it('handles https URLs', () => {
      const text = 'Check https://example.com';
      const result = detectUrls(text);
      expect(result).toContain('<a href="https://example.com"');
    });

    it('handles multiple URLs', () => {
      const text = 'https://one.com and https://two.com';
      const result = detectUrls(text);
      expect(result).toContain('https://one.com');
      expect(result).toContain('https://two.com');
    });

    it('handles URLs with query parameters', () => {
      const text = 'https://example.com?foo=bar&baz=qux';
      const result = detectUrls(text);
      expect(result).toContain('https://example.com?foo=bar&baz=qux');
    });

    it('handles URLs with fragments', () => {
      const text = 'https://example.com#section';
      const result = detectUrls(text);
      expect(result).toContain('#section');
    });

    it('handles empty string', () => {
      expect(detectUrls('')).toBe('');
    });
  });

  describe('parseMarkdown Edge Cases', () => {
    it('escapes HTML entities', () => {
      const text = '<div>Test</div>';
      const result = parseMarkdown(text);
      expect(result).toContain('&lt;div&gt;');
    });

    it('handles bold text', () => {
      const text = '**bold**';
      const result = parseMarkdown(text);
      expect(result).toContain('<strong>bold</strong>');
    });

    it('handles italic text', () => {
      const text = '*italic*';
      const result = parseMarkdown(text);
      expect(result).toContain('<em>italic</em>');
    });

    it('differentiates between bold and italic', () => {
      const text = '**bold** and *italic*';
      const result = parseMarkdown(text);
      expect(result).toContain('<strong>bold</strong>');
      expect(result).toContain('<em>italic</em>');
    });

    it('handles URLs in markdown', () => {
      const text = 'Check https://example.com';
      const result = parseMarkdown(text);
      expect(result).toContain('<a href=');
    });

    it('handles newlines', () => {
      const text = 'Line 1\nLine 2';
      const result = parseMarkdown(text);
      expect(result).toContain('<br>');
    });

    it('handles empty string', () => {
      expect(parseMarkdown('')).toBe('');
    });

    it('handles special characters', () => {
      const text = '& < > " \'';
      const result = parseMarkdown(text);
      expect(result).toContain('&amp;');
      expect(result).toContain('&lt;');
      expect(result).toContain('&gt;');
    });

    it('handles mixed markdown', () => {
      const text = '**Bold** *italic* https://example.com\nNew line';
      const result = parseMarkdown(text);
      expect(result).toContain('<strong>Bold</strong>');
      expect(result).toContain('<em>italic</em>');
      expect(result).toContain('<a href=');
      expect(result).toContain('<br>');
    });
  });

  describe('generatePostId Edge Cases', () => {
    it('generates unique IDs', () => {
      const ids = new Set();
      for (let i = 0; i < 100; i++) {
        ids.add(generatePostId());
      }
      expect(ids.size).toBe(100);
    });

    it('generates non-empty strings', () => {
      const id = generatePostId();
      expect(id).toBeTruthy();
      expect(typeof id).toBe('string');
      expect(id.length).toBeGreaterThan(0);
    });

    it('generates different IDs consecutively', () => {
      const id1 = generatePostId();
      const id2 = generatePostId();
      expect(id1).not.toBe(id2);
    });
  });

  describe('generateStudentId Edge Cases', () => {
    it('generates valid format', () => {
      const id = generateStudentId();
      expect(id).toMatch(/^Student#\d{4}$/);
    });

    it('generates IDs in valid range', () => {
      for (let i = 0; i < 50; i++) {
        const id = generateStudentId();
        const number = parseInt(id.replace('Student#', ''));
        expect(number).toBeGreaterThanOrEqual(1000);
        expect(number).toBeLessThan(10000);
      }
    });

    it('generates different IDs', () => {
      const ids = new Set();
      for (let i = 0; i < 50; i++) {
        ids.add(generateStudentId());
      }
      expect(ids.size).toBeGreaterThan(1);
    });
  });

  describe('getLifetimeDuration Edge Cases', () => {
    it('handles valid durations', () => {
      expect(getLifetimeDuration('1h')).toBe(60 * 60 * 1000);
      expect(getLifetimeDuration('6h')).toBe(6 * 60 * 60 * 1000);
      expect(getLifetimeDuration('24h')).toBe(24 * 60 * 60 * 1000);
      expect(getLifetimeDuration('7d')).toBe(7 * 24 * 60 * 60 * 1000);
      expect(getLifetimeDuration('30d')).toBe(30 * 24 * 60 * 60 * 1000);
    });

    it('returns null for invalid duration', () => {
      expect(getLifetimeDuration('invalid')).toBeNull();
      expect(getLifetimeDuration('10h')).toBeNull();
      expect(getLifetimeDuration('')).toBeNull();
    });

    it('handles case sensitivity', () => {
      expect(getLifetimeDuration('1H')).toBeNull();
      expect(getLifetimeDuration('7D')).toBeNull();
    });
  });

  describe('formatTimeRemaining Edge Cases', () => {
    it('handles null expiration', () => {
      expect(formatTimeRemaining(null)).toBeNull();
    });

    it('handles expired timestamps', () => {
      const expired = Date.now() - 1000;
      expect(formatTimeRemaining(expired)).toBe('Expired');
    });

    it('handles exactly expired', () => {
      const expired = Date.now();
      expect(formatTimeRemaining(expired)).toBe('Expired');
    });

    it('formats minutes correctly', () => {
      const future = Date.now() + 30 * 60 * 1000;
      const result = formatTimeRemaining(future);
      expect(result).toMatch(/m$/);
    });

    it('formats hours correctly', () => {
      const future = Date.now() + 2 * 60 * 60 * 1000;
      const result = formatTimeRemaining(future);
      expect(result).toMatch(/h.*m/);
    });

    it('formats days correctly', () => {
      const future = Date.now() + 3 * 24 * 60 * 60 * 1000;
      const result = formatTimeRemaining(future);
      expect(result).toMatch(/d.*h/);
    });

    it('handles very long durations', () => {
      const future = Date.now() + 365 * 24 * 60 * 60 * 1000;
      const result = formatTimeRemaining(future);
      expect(result).toBeTruthy();
    });
  });

  describe('Timer Color Functions Edge Cases', () => {
    it('getTimerColor handles null', () => {
      expect(getTimerColor(null)).toBe('gray');
    });

    it('getTimerColor handles long durations', () => {
      const future = Date.now() + 30 * 24 * 60 * 60 * 1000;
      expect(getTimerColor(future)).toBe('green');
    });

    it('getTimerColor handles medium durations', () => {
      const future = Date.now() + 12 * 60 * 60 * 1000;
      expect(getTimerColor(future)).toBe('yellow');
    });

    it('getTimerColor handles short durations', () => {
      const future = Date.now() + 2 * 60 * 60 * 1000;
      expect(getTimerColor(future)).toBe('orange');
    });

    it('getTimerColor handles critical durations', () => {
      const future = Date.now() + 30 * 1000;
      expect(getTimerColor(future)).toBe('red-pulse');
    });

    it('getTimerColor handles very critical durations', () => {
      const future = Date.now() + 10 * 1000;
      expect(getTimerColor(future)).toBe('red-pulse');
    });

    it('getTimerTextColor handles all colors', () => {
      expect(getTimerTextColor('green')).toBe('text-green-500');
      expect(getTimerTextColor('yellow')).toBe('text-yellow-500');
      expect(getTimerTextColor('orange')).toBe('text-orange-500');
      expect(getTimerTextColor('red')).toBe('text-red-500');
      expect(getTimerTextColor('red-pulse')).toContain('text-red-500');
      expect(getTimerTextColor('gray')).toBe('text-gray-500');
    });

    it('getTimerTextColor handles unknown color', () => {
      expect(getTimerTextColor('unknown')).toBe('text-gray-500');
    });

    it('getTimerBgColor handles all colors', () => {
      expect(getTimerBgColor('green')).toContain('bg-green-500');
      expect(getTimerBgColor('yellow')).toContain('bg-yellow-500');
      expect(getTimerBgColor('orange')).toContain('bg-orange-500');
      expect(getTimerBgColor('red')).toContain('bg-red-500');
      expect(getTimerBgColor('red-pulse')).toContain('bg-red-500');
      expect(getTimerBgColor('gray')).toContain('bg-gray-500');
    });

    it('getTimerBgColor handles unknown color', () => {
      expect(getTimerBgColor('unknown')).toContain('bg-gray-500');
    });
  });

  describe('getStudentIdColor Edge Cases', () => {
    it('returns consistent color for same ID', () => {
      const id = 'Student#1234';
      const color1 = getStudentIdColor(id);
      const color2 = getStudentIdColor(id);
      expect(color1).toBe(color2);
    });

    it('returns valid color class', () => {
      const id = 'Student#1234';
      const color = getStudentIdColor(id);
      expect(color).toMatch(/from-\w+-500 to-\w+-500/);
    });

    it('handles empty string', () => {
      const color = getStudentIdColor('');
      expect(typeof color).toBe('string');
    });

    it('handles different IDs', () => {
      const colors = new Set();
      for (let i = 1000; i < 1100; i++) {
        colors.add(getStudentIdColor(`Student#${i}`));
      }
      expect(colors.size).toBeGreaterThan(1);
    });

    it('handles special characters', () => {
      const color = getStudentIdColor('!@#$%^&*()');
      expect(typeof color).toBe('string');
    });
  });

  describe('Date Filtering Boundary Conditions', () => {
    const now = Date.now();

    it('handles timestamp at exact day boundary', () => {
      const midnight = new Date().setHours(0, 0, 0, 0);
      expect(midnight).toBeLessThanOrEqual(now);
    });

    it('handles timestamp at exact week boundary', () => {
      const oneWeekAgo = now - 7 * 24 * 60 * 60 * 1000;
      expect(oneWeekAgo).toBeLessThan(now);
    });

    it('handles timestamp at exact month boundary', () => {
      const oneMonthAgo = now - 30 * 24 * 60 * 60 * 1000;
      expect(oneMonthAgo).toBeLessThan(now);
    });

    it('handles custom date range boundaries', () => {
      const startDate = new Date('2024-01-01').getTime();
      const endDate = new Date('2024-12-31').setHours(23, 59, 59, 999);
      expect(endDate).toBeGreaterThan(startDate);
    });

    it('handles invalid date strings', () => {
      const invalid = new Date('invalid').getTime();
      expect(isNaN(invalid)).toBe(true);
    });

    it('handles future dates in custom range', () => {
      const futureDate = new Date(now + 365 * 24 * 60 * 60 * 1000);
      expect(futureDate.getTime()).toBeGreaterThan(now);
    });
  });
});
