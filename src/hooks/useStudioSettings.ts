import { useState, useCallback, useEffect } from 'react';

export interface StemSettings {
  id: string;
  volume: number;
  pan: number;
  isMuted: boolean;
  isSolo: boolean;
  adsr: {
    attack: number;    // 0-2 seconds
    decay: number;     // 0-2 seconds
    sustain: number;   // 0-1 (percentage of decay level)
    release: number;   // 0-3 seconds
  };
  effects: {
    reverb: {
      enabled: boolean;
      wet: number;      // 0-1 (mix amount)
      decay: number;    // 0.1-10 seconds
    };
    delay: {
      enabled: boolean;
      wet: number;      // 0-1 (mix amount)
      time: number;     // 0.1-2 seconds
      feedback: number; // 0-0.8 (repeats)
    };
    chorus: {
      enabled: boolean;
      wet: number;      // 0-1 (mix amount)
      rate: number;     // 0.5-5 Hz
      depth: number;    // 0-1
    };
  };
}

export interface MixerSettings {
  packId: string;
  masterVolume: number;
  stems: StemSettings[];
  lastModified: string;
}

const STORAGE_KEY_PREFIX = 'inspira-studio-';

/**
 * Hook for managing mixer settings persistence in localStorage
 * Automatically saves settings and allows restoring previous mixes
 */
export const useStudioSettings = (packId: string | undefined) => {
  const [settings, setSettings] = useState<MixerSettings | null>(null);
  const [hasLoadedFromStorage, setHasLoadedFromStorage] = useState(false);

  // Load settings from localStorage
  useEffect(() => {
    if (!packId) return;

    try {
      const storageKey = `${STORAGE_KEY_PREFIX}${packId}`;
      const stored = localStorage.getItem(storageKey);

      if (stored) {
        const parsed = JSON.parse(stored) as MixerSettings;
        setSettings(parsed);
      }
    } catch (error) {
      console.error('Error loading studio settings:', error);
    } finally {
      setHasLoadedFromStorage(true);
    }
  }, [packId]);

  // Save settings to localStorage
  const saveSettings = useCallback(
    (newSettings: MixerSettings) => {
      if (!packId) return;

      try {
        const storageKey = `${STORAGE_KEY_PREFIX}${packId}`;
        const toStore: MixerSettings = {
          ...newSettings,
          packId,
          lastModified: new Date().toISOString()
        };
        localStorage.setItem(storageKey, JSON.stringify(toStore));
        setSettings(toStore);
      } catch (error) {
        console.error('Error saving studio settings:', error);
      }
    },
    [packId]
  );

  // Update a single stem's settings
  const updateStemSettings = useCallback(
    (stemId: string, updates: Partial<StemSettings>) => {
      if (!settings) return;

      const updatedSettings: MixerSettings = {
        ...settings,
        stems: settings.stems.map((stem) =>
          stem.id === stemId ? { ...stem, ...updates } : stem
        ),
        lastModified: new Date().toISOString()
      };

      saveSettings(updatedSettings);
    },
    [settings, saveSettings]
  );

  // Update master volume
  const updateMasterVolume = useCallback(
    (volume: number) => {
      if (!settings) return;

      saveSettings({
        ...settings,
        masterVolume: volume,
        lastModified: new Date().toISOString()
      });
    },
    [settings, saveSettings]
  );

  // Clear all settings for this pack (on exit)
  const clearSettings = useCallback(() => {
    if (!packId) return;

    try {
      const storageKey = `${STORAGE_KEY_PREFIX}${packId}`;
      localStorage.removeItem(storageKey);
      setSettings(null);
    } catch (error) {
      console.error('Error clearing studio settings:', error);
    }
  }, [packId]);

  // Get all saved mixes for this pack
  const getSavedMixes = useCallback((): MixerSettings[] => {
    if (!packId) return [];

    try {
      const storageKey = `${STORAGE_KEY_PREFIX}${packId}`;
      const stored = localStorage.getItem(storageKey);

      if (stored) {
        return [JSON.parse(stored)];
      }
    } catch (error) {
      console.error('Error retrieving saved mixes:', error);
    }

    return [];
  }, [packId]);

  return {
    settings,
    hasLoadedFromStorage,
    saveSettings,
    updateStemSettings,
    updateMasterVolume,
    clearSettings,
    getSavedMixes
  };
};

/**
 * Hook for exporting audio mixes
 */
export const useAudioExport = () => {
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const exportRecording = useCallback(
    async (packId: string, blob: Blob) => {
      setIsExporting(true);
      setExportError(null);

      try {
        const formData = new FormData();
        formData.append('audio', blob);
        formData.append('packId', packId);
        formData.append('timestamp', new Date().toISOString());

        const response = await fetch(`/api/studio/${packId}/export`, {
          method: 'POST',
          body: blob
        });

        if (!response.ok) {
          throw new Error('Failed to export recording');
        }

        const result = await response.json();

        return {
          success: true,
          recordingId: result.recordingId,
          downloadUrl: result.downloadUrl,
          timestamp: result.timestamp
        };
      } catch (error) {
        const errorMsg =
          error instanceof Error ? error.message : 'Unknown error';
        setExportError(errorMsg);
        throw error;
      } finally {
        setIsExporting(false);
      }
    },
    []
  );

  return {
    isExporting,
    exportError,
    exportRecording
  };
};

/**
 * Utility to create default mixer settings for a pack with stems
 */
export const createDefaultSettings = (
  packId: string,
  stemCount: number
): MixerSettings => {
  const stems: StemSettings[] = Array.from({ length: stemCount }, (_, i) => ({
    id: `stem-${i}`,
    volume: 0,
    pan: 0,
    isMuted: false,
    isSolo: false,
    adsr: {
      attack: 0.005,
      decay: 0.1,
      sustain: 0.3,
      release: 0.5
    },
    effects: {
      reverb: {
        enabled: false,
        wet: 0.3,
        decay: 2.0
      },
      delay: {
        enabled: false,
        wet: 0.3,
        time: 0.5,
        feedback: 0.4
      },
      chorus: {
        enabled: false,
        wet: 0.5,
        rate: 1.5,
        depth: 0.5
      }
    }
  }));

  return {
    packId,
    masterVolume: 0,
    stems,
    lastModified: new Date().toISOString()
  };
};
