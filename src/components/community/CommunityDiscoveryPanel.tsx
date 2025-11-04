import { useMemo } from 'react';
import { Sparkles, Trophy, Users, Compass } from 'lucide-react';
import {
  useStore,
  type TrendingTopic,
  type TopContributor,
  type PostSearchFilters,
} from '../../lib/store';
import TrendingTopics from './TrendingTopics';
import HotPostsList from './HotPostsList';

interface CommunityDiscoveryPanelProps {
  onRequestSearch: (filters?: Partial<PostSearchFilters>) => void;
}

export default function CommunityDiscoveryPanel({ onRequestSearch }: CommunityDiscoveryPanelProps) {
  const getHotPosts = useStore((state) => state.getHotPosts);
  const getMostCommentedPosts = useStore((state) => state.getMostCommentedPosts);
  const getTrendingTopics = useStore((state) => state.getTrendingTopics);
  const getTopContributors = useStore((state) => state.getTopContributors);

  const hotPosts = useMemo(() => getHotPosts(3), [getHotPosts]);
  const mostCommentedPosts = useMemo(() => getMostCommentedPosts(3), [getMostCommentedPosts]);
  const trendingTopics = useMemo(() => getTrendingTopics(6), [getTrendingTopics]);
  const topContributors = useMemo(() => getTopContributors(4), [getTopContributors]);

  const handleTopicSelect = (topic: TrendingTopic) => {
    if (topic.type === 'hashtag') {
      onRequestSearch({ query: topic.label });
    } else {
      onRequestSearch({ channel: topic.label });
    }
  };

  const handleTopContributorSearch = (contributor: TopContributor) => {
    onRequestSearch({ authorType: 'peer', query: contributor.studentId });
  };

  return (
    <section className="space-y-6">
      <header className="rounded-2xl border border-white/5 bg-gradient-to-br from-primary/10 via-slate-900/70 to-slate-900/40 p-6 shadow-lg">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-widest text-primary/70">Discover</p>
            <h2 className="mt-1 text-xl font-semibold text-white">Whats happening in the community</h2>
            <p className="mt-2 text-sm text-gray-300">
              Explore trending topics, active threads, and uplifting contributors.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onRequestSearch({})}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-black shadow transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <Compass className="h-4 w-4" aria-hidden />
            Advanced search
          </button>
        </div>
      </header>

      <div className="rounded-2xl border border-white/5 bg-white/5 p-6">
        <div className="mb-4 flex items-center gap-3">
          <Sparkles className="h-5 w-5 text-primary" aria-hidden />
          <h3 className="text-lg font-semibold text-white">Trending topics</h3>
        </div>
        <TrendingTopics topics={trendingTopics} onSelectTopic={handleTopicSelect} />
      </div>

      <div className="space-y-6 rounded-2xl border border-white/5 bg-white/5 p-6">
        <div>
          <div className="mb-4 flex items-center gap-3">
            <Trophy className="h-5 w-5 text-amber-400" aria-hidden />
            <h3 className="text-lg font-semibold text-white">Top contributors</h3>
          </div>
          {topContributors.length === 0 ? (
            <p className="rounded-xl border border-dashed border-white/10 bg-black/30 p-4 text-sm text-gray-400">
              Contributions will start appearing once posts build momentum.
            </p>
          ) : (
            <div className="space-y-3">
              {topContributors.map((contributor, index) => (
                <button
                  key={contributor.studentId}
                  type="button"
                  onClick={() => handleTopContributorSearch(contributor)}
                  className="flex w-full items-center justify-between rounded-xl border border-white/5 bg-white/5 px-4 py-3 text-left text-sm text-gray-200 transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                      #{index + 1}
                    </span>
                    <div>
                      <p className="font-medium text-white">{contributor.studentId}</p>
                      <p className="text-xs text-gray-400">
                        {contributor.postCount} post{contributor.postCount === 1 ? '' : 's'} · {contributor.totalHelpfulReceived}{' '}
                        helpful · {contributor.totalReactions} reactions received
                      </p>
                    </div>
                  </div>
                  <span className="text-xs text-primary">View activity</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="grid gap-6">
          <div>
            <div className="mb-4 flex items-center gap-3">
              <Users className="h-5 w-5 text-orange-400" aria-hidden />
              <h3 className="text-lg font-semibold text-white">Hot posts</h3>
            </div>
            <HotPostsList posts={hotPosts} emptyMessage="No hot posts yet. React and cheer on community stories!" />
          </div>

          <div>
            <div className="mb-4 flex items-center gap-3">
              <Users className="h-5 w-5 text-blue-400" aria-hidden />
              <h3 className="text-lg font-semibold text-white">Most discussed</h3>
            </div>
            <HotPostsList posts={mostCommentedPosts} emptyMessage="Comment activity will appear here." />
          </div>
        </div>
      </div>
    </section>
  );
}
