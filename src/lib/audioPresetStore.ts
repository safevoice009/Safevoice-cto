import { create } from 'zustand';

export type AudioPreset = 'standard' | 'highFidelity' | 'lowData';

interface AudioPresetStore {
  selectedPreset: AudioPreset;
  setSelectedPreset: (preset: AudioPreset) => void;
}

const STORAGE_KEY = 'safevoice_audio_preset';

const loadAudioPreset = (): AudioPreset => {
  if (typeof window === 'undefined') return 'standard';
  
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw && ['standard', 'highFidelity', 'lowData'].includes(raw)) {
      return raw as AudioPreset;
    }
    return 'standard';
  } catch (error) {
    console.error('Failed to load audio preset:', error);
    return 'standard';
  }
};

const saveAudioPreset = (preset: AudioPreset): void => {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem(STORAGE_KEY, preset);
  } catch (error) {
    console.error('Failed to save audio preset:', error);
  }
};

export const useAudioPresetStore = create<AudioPresetStore>((set) => ({
  selectedPreset: loadAudioPreset(),
  
  setSelectedPreset: (preset: AudioPreset) => {
    set({ selectedPreset: preset });
    saveAudioPreset(preset);
  },
}));
