const patterns: Array<{ regex: RegExp; replacement: string }> = [
  {
    regex: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
    replacement: '[redacted email]',
  },
  {
    regex: /(\+?\d{1,3}[\s-]?)?(\(?\d{3}\)?[\s-]?)?\d{3}[\s-]?\d{4}/g,
    replacement: '[redacted phone]',
  },
  {
    regex: /\b\d+\s+[\w\s]+(?:street|road|st|rd|avenue|ave|lane|ln)\b/gi,
    replacement: '[redacted address]',
  },
]

export function redactContactInfo(text: string): string {
  return patterns.reduce((acc, { regex, replacement }) => acc.replace(regex, replacement), text)
}
