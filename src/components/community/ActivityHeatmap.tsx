import { useMemo } from 'react';
import { Activity } from 'lucide-react';
import type { CommunityActivity } from '../../lib/communities/types';

interface ActivityHeatmapProps {
  activity: CommunityActivity[];
  channelId?: string;
}

interface HeatmapCell {
  hour: number;
  day: number;
  count: number;
}

export default function ActivityHeatmap({ activity, channelId }: ActivityHeatmapProps) {
  const heatmapData = useMemo(() => {
    // Filter activity for the specific channel if provided
    const filteredActivity = channelId
      ? activity.filter((a) => a.channelId === channelId)
      : activity;

    // Create a 7x24 grid (days x hours)
    const grid: HeatmapCell[] = [];
    for (let day = 0; day < 7; day++) {
      for (let hour = 0; hour < 24; hour++) {
        grid.push({ hour, day, count: 0 });
      }
    }

    // Aggregate activity data
    filteredActivity.forEach((act) => {
      const date = new Date(act.timestamp);
      const day = date.getDay();
      const hour = date.getHours();
      const index = day * 24 + hour;
      if (grid[index]) {
        grid[index].count += act.count;
      }
    });

    return grid;
  }, [activity, channelId]);

  const maxCount = useMemo(() => {
    return Math.max(...heatmapData.map((cell) => cell.count), 1);
  }, [heatmapData]);

  const getIntensityColor = (count: number) => {
    if (count === 0) return 'bg-gray-800/40';
    const intensity = count / maxCount;
    if (intensity > 0.7) return 'bg-primary/80';
    if (intensity > 0.5) return 'bg-primary/60';
    if (intensity > 0.3) return 'bg-primary/40';
    if (intensity > 0.1) return 'bg-primary/20';
    return 'bg-primary/10';
  };

  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const peakHours = useMemo(() => {
    const hourCounts = new Array(24).fill(0);
    heatmapData.forEach((cell) => {
      hourCounts[cell.hour] += cell.count;
    });
    const maxHourCount = Math.max(...hourCounts);
    return hourCounts
      .map((count, hour) => ({ hour, count }))
      .filter((h) => h.count === maxHourCount && maxHourCount > 0)
      .map((h) => h.hour);
  }, [heatmapData]);

  const formatHour = (hour: number) => {
    if (hour === 0) return '12am';
    if (hour === 12) return '12pm';
    if (hour < 12) return `${hour}am`;
    return `${hour - 12}pm`;
  };

  return (
    <div className="rounded-2xl border border-white/5 bg-white/5 p-5">
      <div className="mb-4 flex items-center gap-2">
        <Activity className="h-5 w-5 text-primary" />
        <div>
          <h2 className="text-lg font-semibold text-white">Activity Heatmap</h2>
          <p className="text-xs text-gray-400">
            {peakHours.length > 0 && (
              <span>
                🔥 Busiest times: {peakHours.map(formatHour).join(', ')}
              </span>
            )}
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {/* Heatmap Grid */}
        <div className="overflow-x-auto">
          <div className="min-w-[600px] space-y-1">
            {days.map((dayName, dayIndex) => (
              <div key={dayName} className="flex items-center gap-1">
                <div className="w-10 flex-shrink-0 text-xs text-gray-400">{dayName}</div>
                <div className="flex flex-1 gap-0.5">
                  {Array.from({ length: 24 }, (_, hour) => {
                    const cell = heatmapData.find((c) => c.day === dayIndex && c.hour === hour);
                    const count = cell?.count || 0;
                    return (
                      <div
                        key={`${dayIndex}-${hour}`}
                        className={`h-4 flex-1 rounded-sm transition-all ${getIntensityColor(count)}`}
                        title={`${dayName} ${formatHour(hour)}: ${count} activities`}
                      />
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Hour Labels */}
        <div className="flex items-center gap-1">
          <div className="w-10 flex-shrink-0" />
          <div className="flex flex-1 justify-between text-xs text-gray-400">
            <span>12am</span>
            <span>6am</span>
            <span>12pm</span>
            <span>6pm</span>
            <span>11pm</span>
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center justify-between rounded-lg border border-white/5 bg-black/20 p-3">
          <span className="text-xs text-gray-400">Less active</span>
          <div className="flex gap-1">
            <div className="h-3 w-3 rounded-sm bg-gray-800/40" />
            <div className="h-3 w-3 rounded-sm bg-primary/10" />
            <div className="h-3 w-3 rounded-sm bg-primary/20" />
            <div className="h-3 w-3 rounded-sm bg-primary/40" />
            <div className="h-3 w-3 rounded-sm bg-primary/60" />
            <div className="h-3 w-3 rounded-sm bg-primary/80" />
          </div>
          <span className="text-xs text-gray-400">More active</span>
        </div>
      </div>
    </div>
  );
}
