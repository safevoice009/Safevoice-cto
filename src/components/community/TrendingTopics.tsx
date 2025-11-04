import { Tag, Hash } from 'lucide-react';
import type { TrendingTopic } from '../../lib/store';

interface TrendingTopicsProps {
  topics: TrendingTopic[];
  onSelectTopic?: (topic: TrendingTopic) => void;
  emptyMessage?: string;
}

export default function TrendingTopics({ topics, onSelectTopic, emptyMessage }: TrendingTopicsProps) {
  if (topics.length === 0) {
    return (
      <div className="rounded-2xl border border-white/5 bg-white/5 p-4 text-sm text-gray-400">
        {emptyMessage ?? 'Community trends will appear here as activity picks up.'}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {topics.map((topic) => {
        const Icon = topic.type === 'hashtag' ? Hash : Tag;
        const handleClick = () => onSelectTopic?.(topic);
        const isInteractive = Boolean(onSelectTopic);

        return (
          <button
            key={`${topic.type}-${topic.label}`}
            type="button"
            onClick={handleClick}
            disabled={!isInteractive}
            className={`w-full rounded-xl border border-white/5 bg-white/5 px-4 py-3 text-left text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-default disabled:opacity-60 hover:bg-white/10`}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Icon className="h-4 w-4" aria-hidden />
                </span>
                <div>
                  <p className="font-medium text-white">{topic.label}</p>
                  <p className="text-xs text-gray-400">
                    {topic.type === 'hashtag' ? 'Hashtag' : 'Topic'} · {topic.count} mention{topic.count === 1 ? '' : 's'}
                  </p>
                </div>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
