import { useState, useEffect, useCallback } from 'react';

export interface SoundSettings {
  enabled: boolean;
  volume: number; // 0-100
  approveSound: boolean;
  denySound: boolean;
}

const DEFAULT_SETTINGS: SoundSettings = {
  enabled: true,
  volume: 70,
  approveSound: true,
  denySound: true,
};

const STORAGE_KEY = 'muscledesk-sound-settings';

export function useSoundSettings() {
  const [settings, setSettings] = useState<SoundSettings>(DEFAULT_SETTINGS);

  // Load settings from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setSettings({ ...DEFAULT_SETTINGS, ...parsed });
      }
    } catch (error) {
      console.warn('Failed to load sound settings:', error);
    }
  }, []);

  // Save settings to localStorage
  const saveSettings = useCallback((newSettings: Partial<SoundSettings>) => {
    setSettings(prev => {
      const updated = { ...prev, ...newSettings };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch (error) {
        console.warn('Failed to save sound settings:', error);
      }
      return updated;
    });
  }, []);

  const toggleSound = useCallback(() => {
    saveSettings({ enabled: !settings.enabled });
  }, [settings.enabled, saveSettings]);

  const setVolume = useCallback((volume: number) => {
    saveSettings({ volume: Math.max(0, Math.min(100, volume)) });
  }, [saveSettings]);

  const toggleApproveSound = useCallback(() => {
    saveSettings({ approveSound: !settings.approveSound });
  }, [settings.approveSound, saveSettings]);

  const toggleDenySound = useCallback(() => {
    saveSettings({ denySound: !settings.denySound });
  }, [settings.denySound, saveSettings]);

  return {
    settings,
    saveSettings,
    toggleSound,
    setVolume,
    toggleApproveSound,
    toggleDenySound,
  };
}
