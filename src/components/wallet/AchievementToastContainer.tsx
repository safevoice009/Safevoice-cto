import { useEffect, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import BadgeToast from './BadgeToast';
import type { Achievement } from '../../lib/tokens/RewardEngine';
import {
  getAchievementToasts,
  removeAchievementToast,
  subscribeToAchievementToasts,
} from '../../lib/achievementToastBus';

export default function AchievementToastContainer() {
  const [toasts, setToasts] = useState<Achievement[]>([]);

  useEffect(() => {
    const update = () => {
      setToasts([...getAchievementToasts()]);
    };

    const unsubscribe = subscribeToAchievementToasts(update);
    update();

    return unsubscribe;
  }, []);

  return (
    <div className="fixed top-20 right-4 z-50 space-y-4 pointer-events-none">
      <AnimatePresence mode="popLayout">
        {toasts.map((achievement) => (
          <div key={achievement.id} className="pointer-events-auto">
            <BadgeToast
              achievement={achievement}
              onClose={() => removeAchievementToast(achievement.id)}
            />
          </div>
        ))}
      </AnimatePresence>
    </div>
  );
}
