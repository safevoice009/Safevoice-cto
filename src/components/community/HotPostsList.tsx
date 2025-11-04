import { Link } from 'react-router-dom';
import { MessageCircle, Heart, TrendingUp } from 'lucide-react';
import type { Post } from '../../lib/store';
import { formatTimeAgo } from '../../lib/utils';

interface HotPostsListProps {
  posts: Post[];
  emptyMessage?: string;
}

export default function HotPostsList({ posts, emptyMessage }: HotPostsListProps) {
  if (posts.length === 0) {
    return (
      <div className="rounded-2xl border border-white/5 bg-white/5 p-4 text-sm text-gray-400">
        {emptyMessage ?? 'Hot posts will appear here as the community engages.'}
      </div>
    );
  }

  const getTotalReactions = (post: Post): number =>
    Object.values(post.reactions).reduce((sum, count) => sum + count, 0);

  const truncateContent = (content: string, maxLength = 80): string => {
    const cleanContent = content.replace(/<[^>]*>/g, '').trim();
    if (cleanContent.length <= maxLength) return cleanContent;
    return `${cleanContent.slice(0, maxLength)}...`;
  };

  return (
    <div className="space-y-3">
      {posts.map((post) => {
        const reactions = getTotalReactions(post);
        const comments = post.commentCount ?? 0;
        const contentPreview = post.isEncrypted
          ? '[Encrypted post]'
          : truncateContent(post.content);

        return (
          <Link
            key={post.id}
            to={`/post/${post.id}`}
            className="block rounded-xl border border-white/5 bg-white/5 px-4 py-3 transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-orange-500 to-pink-500">
                <TrendingUp className="h-4 w-4 text-white" aria-hidden />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-white">{post.studentId}</p>
                <p className="mt-1 line-clamp-2 text-xs text-gray-300">
                  {contentPreview}
                </p>
                <div className="mt-2 flex items-center gap-3 text-xs text-gray-400">
                  <span className="flex items-center gap-1">
                    <Heart className="h-3 w-3" aria-hidden />
                    {reactions}
                  </span>
                  <span className="flex items-center gap-1">
                    <MessageCircle className="h-3 w-3" aria-hidden />
                    {comments}
                  </span>
                  <span>{formatTimeAgo(post.createdAt)}</span>
                </div>
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
