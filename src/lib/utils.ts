import toast from 'react-hot-toast';

export const getRelativeTime = (timestamp: number): string => {
  const now = Date.now();
  const diff = now - timestamp;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return new Date(timestamp).toLocaleDateString();
};

export function formatTimeAgo(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const weeks = Math.floor(days / 7);
  const months = Math.floor(days / 30);
  const years = Math.floor(days / 365);

  if (seconds < 60) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  if (weeks < 4) return `${weeks}w ago`;
  if (months < 12) return `${months}mo ago`;
  return `${years}y ago`;
}

export function formatCount(count: number): string {
  if (count >= 1000000) {
    return `${(count / 1000000).toFixed(1)}M`;
  }
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}K`;
  }
  return count.toString();
}

export function getStudentIdColor(studentId: string): string {
  const colors = [
    'from-purple-500 to-blue-500',
    'from-pink-500 to-rose-500',
    'from-orange-500 to-red-500',
    'from-green-500 to-emerald-500',
    'from-cyan-500 to-blue-500',
    'from-indigo-500 to-purple-500',
    'from-yellow-500 to-orange-500',
    'from-teal-500 to-green-500',
  ];

  const hash = studentId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return colors[hash % colors.length];
}

export function sanitizeContent(content: string): string {
  return content
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '')
    .trim();
}

export function detectUrls(text: string): string {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  return text.replace(urlRegex, '<a href="$1" target="_blank" rel="noopener noreferrer" class="text-primary underline">$1</a>');
}

export function parseMarkdown(text: string): string {
  let parsed = text;
  
  parsed = parsed
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
  
  parsed = parsed.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  parsed = parsed.replace(/(?<!\*)\*([^*]+?)\*(?!\*)/g, '<em>$1</em>');
  
  const urlRegex = /https?:\/\/[^\s]+/g;
  parsed = parsed.replace(urlRegex, (url) => {
    const unescapedUrl = url.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
    return `<a href="${unescapedUrl}" target="_blank" rel="noopener noreferrer" class="text-primary underline hover:text-purple-400 transition-colors">${url}</a>`;
  });
  
  parsed = parsed.replace(/\n/g, '<br>');
  
  return parsed;
}

export function copyToClipboard(text: string): Promise<void> {
  if (navigator.clipboard && window.isSecureContext) {
    return navigator.clipboard.writeText(text);
  } else {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    return new Promise<void>((resolve, reject) => {
      if (document.execCommand('copy')) {
        resolve();
      } else {
        reject();
      }
      textArea.remove();
    });
  }
}

export async function share(title: string, text: string, url: string): Promise<void> {
  if (navigator.share) {
    await navigator.share({ title, text, url });
    return;
  }

  await copyToClipboard(url);
  throw new Error('Share API not supported');
}

export const copyPostLink = (postId: string) => {
  const url = `${window.location.origin}/post/${postId}`;
  navigator.clipboard.writeText(url);
  toast.success('Link copied to clipboard! 🔗');
};

export const generatePostId = (): string => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
};

export const generateStudentId = (): string => {
  return `Student#${Math.floor(Math.random() * 9000 + 1000)}`;
};

export const getLifetimeDuration = (value: string): number | null => {
  const durations: Record<string, number> = {
    '1h': 60 * 60 * 1000,
    '6h': 6 * 60 * 60 * 1000,
    '24h': 24 * 60 * 60 * 1000,
    '7d': 7 * 24 * 60 * 60 * 1000,
    '30d': 30 * 24 * 60 * 60 * 1000,
  };
  return durations[value] || null;
};
