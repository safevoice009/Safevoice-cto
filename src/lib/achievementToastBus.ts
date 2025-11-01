import type { Achievement } from './tokens/RewardEngine';

type Listener = () => void;

let toastQueue: Achievement[] = [];
let listeners: Listener[] = [];

const notify = () => {
  listeners.forEach((listener) => listener());
};

export const addAchievementToast = (achievement: Achievement) => {
  toastQueue = [...toastQueue, achievement];
  notify();
};

export const removeAchievementToast = (achievementId: string) => {
  toastQueue = toastQueue.filter((achievement) => achievement.id !== achievementId);
  notify();
};

export const getAchievementToasts = () => toastQueue;

export const subscribeToAchievementToasts = (listener: Listener) => {
  listeners = [...listeners, listener];
  return () => {
    listeners = listeners.filter((existing) => existing !== listener);
  };
};
