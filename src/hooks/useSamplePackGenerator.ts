import { useState, useCallback, useRef, useEffect } from 'react';
import { samplePackerAPI, type SamplePackJob, type SamplePackManifest } from '../utils/samplePackerAPI';

export interface GenerationRequest {
  prompt: string;
  bpm?: number;
  key?: string;
  duration?: number;
  stems?: number | string[];
  model_size?: 'small' | 'medium';
  guidance?: number;
  cover_model?: 'pil' | 'grfft';
  workflow?: string;
}

export interface GenerationResult {
  job: SamplePackJob;
  manifest?: SamplePackManifest;
  audioUrls?: string[];
}

export const useSamplePackGenerator = () => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentJob, setCurrentJob] = useState<SamplePackJob | null>(null);
  const [generationResult, setGenerationResult] = useState<GenerationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [isBackendHealthy, setIsBackendHealthy] = useState<boolean | null>(null);

  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollingIntervalRef = useRef<number>(2000);
  const consecutiveErrorsRef = useRef<number>(0);

  // Check backend health on mount
  useEffect(() => {
    const checkHealth = async () => {
      try {
        await samplePackerAPI.checkHealth();
        setIsBackendHealthy(true);
      } catch (error) {
        setIsBackendHealthy(false);
        console.error('Backend health check failed:', error);
      }
    };

    checkHealth();
  }, []);

  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }, []);

  const pollJobStatus = useCallback(async (jobId: string) => {
    try {
      const job = await samplePackerAPI.getJobStatus(jobId);
      setCurrentJob(job);
      consecutiveErrorsRef.current = 0; // Reset error count on success
      
      // Reset polling interval on success
      if (pollingIntervalRef.current > 2000) {
        pollingIntervalRef.current = 2000;
      }

      if (job.progress !== undefined && job.progress !== null) {
        setProgress(job.progress);
      } else if (job.elapsed_time) {
        const estimatedDurationMs = 3 * 60 * 1000;
        const progressPercent = Math.min((job.elapsed_time / estimatedDurationMs) * 100, 95);
        setProgress(progressPercent);
      }

      if (job.status === 'completed') {
        stopPolling();
        
        try {
          const manifest = await samplePackerAPI.getJobManifest(jobId);
          // Safely handle audio array - it should always exist after normalization, but add safety check
          const audioUrls = (manifest.audio || []).map(audio => `/api/files/${audio.path}`);
          
          setGenerationResult({
            job,
            manifest,
            audioUrls
          });
          setProgress(100);
        } catch (manifestError) {
          console.error('Failed to get manifest:', manifestError);
          setError('Generation completed but failed to retrieve results');
        }
        
        setIsGenerating(false);
      } else if (job.status === 'failed' || job.status === 'timeout') {
        stopPolling();
        setError(`Generation failed: ${job.status}`);
        setIsGenerating(false);
      }
    } catch (pollError) {
      consecutiveErrorsRef.current += 1;
      
      console.error('Failed to poll job status:', pollError);
      
      // Implement exponential backoff for polling after errors
      if (consecutiveErrorsRef.current <= 3) {
        // Increase polling interval exponentially
        pollingIntervalRef.current = Math.min(pollingIntervalRef.current * 2, 10000);
        console.warn(`Polling error ${consecutiveErrorsRef.current}/3, increasing interval to ${pollingIntervalRef.current}ms`);
      } else {
        // Stop polling after 3 consecutive errors
        stopPolling();
        const errorMessage = pollError instanceof Error ? pollError.message : 'Failed to check generation status';
        setError(`Connection lost: ${errorMessage}`);
        setIsGenerating(false);
      }
    }
  }, [stopPolling]);

  const generateSamplePack = useCallback(async (request: GenerationRequest) => {
    try {
      // Check backend health before attempting generation
      if (isBackendHealthy === false) {
        throw new Error('Cannot connect to backend server. Please ensure the SamplePacker gateway is running on port 3003.');
      }

      setIsGenerating(true);
      setError(null);
      setProgress(0);
      setCurrentJob(null);
      setGenerationResult(null);
      consecutiveErrorsRef.current = 0;
      pollingIntervalRef.current = 2000; // Reset polling interval

      const job = await samplePackerAPI.createSamplePack(request);
      setCurrentJob(job);

      // Use dynamic polling interval with ref
      pollingRef.current = setInterval(() => {
        pollJobStatus(job.job_id);
      }, pollingIntervalRef.current);

      return job;
    } catch (genError) {
      const errorMessage = genError instanceof Error ? genError.message : 'Failed to start generation';
      setError(errorMessage);
      setIsGenerating(false);
      throw genError;
    }
  }, [pollJobStatus, isBackendHealthy]);

  const cancelGeneration = useCallback(async () => {
    stopPolling();
    setIsGenerating(false);
    
    if (currentJob) {
      try {
        await samplePackerAPI.deleteJob(currentJob.job_id);
      } catch (cancelError) {
        console.error('Failed to cancel job:', cancelError);
      }
    }
    
    setCurrentJob(null);
    setGenerationResult(null);
    setProgress(0);
  }, [currentJob, stopPolling]);

  const downloadAudioFile = useCallback(async (filename: string): Promise<Blob> => {
    return samplePackerAPI.downloadFile(filename);
  }, []);

  const clearResults = useCallback(() => {
    setGenerationResult(null);
    setCurrentJob(null);
    setError(null);
    setProgress(0);
  }, []);

  const cleanup = useCallback(() => {
    stopPolling();
  }, [stopPolling]);

  // Add retry connection method
  const retryConnection = useCallback(async () => {
    setError(null);
    try {
      await samplePackerAPI.checkHealth();
      setIsBackendHealthy(true);
      return true;
    } catch (error) {
      setIsBackendHealthy(false);
      setError('Still cannot connect to backend server');
      return false;
    }
  }, []);

  return {
    isGenerating,
    currentJob,
    generationResult,
    error,
    progress,
    isBackendHealthy,
    generateSamplePack,
    cancelGeneration,
    downloadAudioFile,
    clearResults,
    cleanup,
    retryConnection,
  };
};
