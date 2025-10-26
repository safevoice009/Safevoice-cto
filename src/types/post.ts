export type ReactionType = 'heart' | 'fire' | 'clap' | 'sad' | 'angry' | 'laugh';

export interface PostReactions {
  heart: number;
  fire: number;
  clap: number;
  sad: number;
  angry: number;
  laugh: number;
}

export type TopicKey =
  | 'Mental Health'
  | 'Academic Pressure'
  | 'Social Issues'
  | 'Ragging'
  | 'Corruption/Whistleblowing'
  | 'Other';

export interface Comment {
  id: string;
  content: string;
  createdAt: number;
}

export interface Post {
  id: string;
  studentId: string;
  content: string;
  college: string;
  topic: TopicKey;
  reactions: PostReactions;
  comments: Comment[];
  commentCount: number;
  createdAt: number;
  expiresAt: number | null;
  imageUrl: string | null;
}

export type PostLifetimeValue =
  | '1h'
  | '6h'
  | '24h'
  | '7d'
  | '30d'
  | 'never'
  | 'custom';

export interface PostLifetimeOption {
  label: string;
  value: PostLifetimeValue;
  durationMs?: number;
}
