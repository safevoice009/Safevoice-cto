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
