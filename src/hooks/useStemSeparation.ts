import { useState, useEffect, useRef, useCallback } from 'react';
import { samplePackerAPI, type StemSeparationStatus, type StemEntry } from '../utils/samplePackerAPI';

const POLL_INTERVAL_MS = 3000;

interface UseStemSeparationResult {
  stemStatus: StemSeparationStatus;
  stems: StemEntry[];
  error: string | null;
  requestStems: (packId: string) => Promise<void>;
  reset: () => void;
}

export function useStemSeparation(packId?: string): UseStemSeparationResult {
  const [stemStatus, setStemStatus] = useState<StemSeparationStatus>('idle');
  const [stems, setStems] = useState<StemEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const activePackIdRef = useRef<string | null>(null);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  const pollStatus = useCallback(async (id: string) => {
    try {
      const result = await samplePackerAPI.getStemStatus(id);
      setStemStatus(result.status);

      if (result.status === 'completed') {
        setStems(result.stems || []);
        stopPolling();
      } else if (result.status === 'failed') {
        setError(result.error || 'Stem separation failed');
        stopPolling();
      }
    } catch (err) {
      // Network hiccup — keep polling, don't surface as failure
      console.warn('Stem status poll error:', err);
    }
  }, [stopPolling]);

  // On mount / packId change: check if stems already exist
  useEffect(() => {
    if (!packId) return;

    samplePackerAPI.getStemStatus(packId).then(result => {
      setStemStatus(result.status);
      if (result.status === 'completed') {
        setStems(result.stems || []);
      } else if (result.status === 'processing') {
        activePackIdRef.current = packId;
        pollRef.current = setInterval(() => pollStatus(packId), POLL_INTERVAL_MS);
      }
    }).catch(() => {
      // If endpoint not available yet, stay idle
    });

    return stopPolling;
  }, [packId, pollStatus, stopPolling]);

  const requestStems = useCallback(async (id: string) => {
    if (stemStatus === 'processing') return;

    setError(null);
    setStemStatus('processing');
    activePackIdRef.current = id;

    try {
      await samplePackerAPI.requestStemSeparation(id);
    } catch (err) {
      setStemStatus('failed');
      setError(err instanceof Error ? err.message : 'Failed to start stem separation');
      return;
    }

    stopPolling();
    pollRef.current = setInterval(() => pollStatus(id), POLL_INTERVAL_MS);
  }, [stemStatus, pollStatus, stopPolling]);

  const reset = useCallback(() => {
    stopPolling();
    setStemStatus('idle');
    setStems([]);
    setError(null);
    activePackIdRef.current = null;
  }, [stopPolling]);

  // Cleanup on unmount
  useEffect(() => () => stopPolling(), [stopPolling]);

  return { stemStatus, stems, error, requestStems, reset };
}
