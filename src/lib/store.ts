import { create } from 'zustand';
import type { Post, ReactionType } from '../types/post';
import { generateSamplePosts } from './constants';

interface StoreState {
  studentId: string;
  posts: Post[];
  initStudentId: () => void;
  loadPosts: () => void;
  addPost: (post: Post) => void;
  updateReaction: (postId: string, reactionType: ReactionType) => void;
  deletePost: (postId: string) => void;
}

export const useStore = create<StoreState>((set) => ({
  studentId:
    typeof window !== 'undefined'
      ? localStorage.getItem('studentId') || `Student#${Math.floor(Math.random() * 9000 + 1000)}`
      : `Student#${Math.floor(Math.random() * 9000 + 1000)}`,
  posts: [],

  initStudentId: () => {
    const id = `Student#${Math.floor(Math.random() * 9000 + 1000)}`;
    if (typeof window !== 'undefined') {
      localStorage.setItem('studentId', id);
    }
    set({ studentId: id });
  },

  loadPosts: () => {
    if (typeof window === 'undefined') return;

    const stored = localStorage.getItem('posts');
    if (stored) {
      try {
        const posts = JSON.parse(stored) as Post[];
        const now = Date.now();
        const maxAge = 30 * 24 * 60 * 60 * 1000;
        const validPosts = posts.filter(
          (p) => (!p.expiresAt || p.expiresAt > now) && now - p.createdAt < maxAge
        );

        const sortedPosts = [...validPosts].sort((a, b) => b.createdAt - a.createdAt);
        localStorage.setItem('posts', JSON.stringify(sortedPosts));
        set({ posts: sortedPosts });
      } catch (error) {
        console.error('Error loading posts:', error);
        const samplePosts = generateSamplePosts();
        localStorage.setItem('posts', JSON.stringify(samplePosts));
        set({ posts: samplePosts });
      }
    } else {
      const samplePosts = generateSamplePosts();
      localStorage.setItem('posts', JSON.stringify(samplePosts));
      set({ posts: samplePosts });
    }
  },

  addPost: (post: Post) =>
    set((state) => {
      const newPosts = [post, ...state.posts];
      if (typeof window !== 'undefined') {
        localStorage.setItem('posts', JSON.stringify(newPosts));
      }
      return { posts: newPosts };
    }),

  updateReaction: (postId: string, reactionType: ReactionType) =>
    set((state) => {
      const posts = state.posts.map((post) => {
        if (post.id === postId) {
          return {
            ...post,
            reactions: {
              ...post.reactions,
              [reactionType]: post.reactions[reactionType] + 1,
            },
          };
        }
        return post;
      });
      if (typeof window !== 'undefined') {
        localStorage.setItem('posts', JSON.stringify(posts));
      }
      return { posts };
    }),

  deletePost: (postId: string) =>
    set((state) => {
      const posts = state.posts.filter((p) => p.id !== postId);
      if (typeof window !== 'undefined') {
        localStorage.setItem('posts', JSON.stringify(posts));
      }
      return { posts };
    }),
}));
