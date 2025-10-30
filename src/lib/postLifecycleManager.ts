import toast from 'react-hot-toast';
import type { StoreApi } from 'zustand';
import type { Post, StoreState } from './store';
import { useStore } from './store';

class PostLifecycleManager {
  private store: StoreApi<StoreState>;
  private cleanupIntervalId: number | null = null;
  private warningIntervalId: number | null = null;
  private unsubscribePosts?: () => void;
  private storageListener?: (event: StorageEvent) => void;

  constructor(store: StoreApi<StoreState> = useStore) {
    this.store = store;
  }

  start() {
    if (typeof window === 'undefined') return;

    this.scheduleExistingPosts();
    this.setupSubscriptions();

    // Run immediate checks
    this.checkExpiredPosts();
    this.warnBeforeExpiry();

    // Repeat every 60 seconds
    this.cleanupIntervalId = window.setInterval(() => this.checkExpiredPosts(), 60_000);
    this.warningIntervalId = window.setInterval(() => this.warnBeforeExpiry(), 60_000);

    // Listen for cross-tab updates
    this.storageListener = (event: StorageEvent) => {
      if (!event.key) return;
      if (['safevoice_posts', 'safevoice_encryption_keys'].includes(event.key)) {
        this.store.getState().initializeStore();
        this.scheduleExistingPosts();
      }
    };
    window.addEventListener('storage', this.storageListener);
  }

  stop() {
    if (this.cleanupIntervalId) {
      window.clearInterval(this.cleanupIntervalId);
      this.cleanupIntervalId = null;
    }

    if (this.warningIntervalId) {
      window.clearInterval(this.warningIntervalId);
      this.warningIntervalId = null;
    }

    if (this.unsubscribePosts) {
      this.unsubscribePosts();
      this.unsubscribePosts = undefined;
    }

    if (this.storageListener) {
      window.removeEventListener('storage', this.storageListener);
      this.storageListener = undefined;
    }
  }

  private scheduleExistingPosts() {
    const { posts, scheduleExpiry } = this.store.getState();
    posts.forEach((post: Post) => {
      if (post.expiresAt) {
        scheduleExpiry(post);
      }
    });
  }

  private setupSubscriptions() {
    this.unsubscribePosts = this.store.subscribe((state, prevState) => {
      const posts: Post[] = state.posts;
      const prevPosts: Post[] = prevState?.posts ?? [];

      const prevMap = new Map<string, Post>();
      prevPosts.forEach((post) => prevMap.set(post.id, post));

      posts.forEach((post) => {
        const previous = prevMap.get(post.id);
        const expiryChanged = previous?.expiresAt !== post.expiresAt;

        if (!previous || expiryChanged) {
          if (post.expiresAt) {
            this.store.getState().scheduleExpiry(post);
          } else {
            this.store.getState().clearExpiryTimer(post.id);
          }
        }
      });

      prevPosts.forEach((previousPost) => {
        if (!posts.find((p) => p.id === previousPost.id) && previousPost.expiresAt) {
          this.store.getState().clearExpiryTimer(previousPost.id);
        }
      });
    });
  }

  private checkExpiredPosts() {
    const { posts, deletePost } = this.store.getState();
    const now = Date.now();

    posts.forEach((post: Post) => {
      if (post.expiresAt && post.expiresAt <= now) {
        deletePost(post.id, { silent: true });
        toast.success('Post expired and deleted 🔥', {
          icon: '⏳',
          duration: 3000,
        });
      }
    });
  }

  private warnBeforeExpiry() {
    const state = this.store.getState();
    const { posts, studentId, markWarningShown } = state;
    const now = Date.now();
    const warningThreshold = 30 * 60 * 1000; // 30 minutes

    posts.forEach((post: Post) => {
      if (!post.expiresAt || post.warningShown || post.studentId !== studentId) return;

      const timeLeft = post.expiresAt - now;
      if (timeLeft > 0 && timeLeft <= warningThreshold) {
        toast(`Your post expires in ${Math.max(Math.floor(timeLeft / 60000), 1)} minutes`, {
          icon: '⏰',
          duration: 5000,
        });
        markWarningShown(post.id);
      }
    });
  }
}

export default PostLifecycleManager;
