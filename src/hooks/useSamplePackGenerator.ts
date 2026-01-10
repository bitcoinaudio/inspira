import { useState, useCallback, useRef } from 'react';
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

  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

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
          const audioUrls = manifest.audio.map(audio => `/api/files/${audio.path}`);
          
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
      console.error('Failed to poll job status:', pollError);
      setError(`Failed to check generation status: ${pollError}`);
      stopPolling();
      setIsGenerating(false);
    }
  }, [stopPolling]);

  const generateSamplePack = useCallback(async (request: GenerationRequest) => {
    try {
      setIsGenerating(true);
      setError(null);
      setProgress(0);
      setCurrentJob(null);
      setGenerationResult(null);

      const job = await samplePackerAPI.createSamplePack(request);
      setCurrentJob(job);

      pollingRef.current = setInterval(() => {
        pollJobStatus(job.job_id);
      }, 2000);

      return job;
    } catch (genError) {
      setError(`Failed to start generation: ${genError}`);
      setIsGenerating(false);
      throw genError;
    }
  }, [pollJobStatus]);

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

  return {
    isGenerating,
    currentJob,
    generationResult,
    error,
    progress,
    generateSamplePack,
    cancelGeneration,
    downloadAudioFile,
    clearResults,
    cleanup,
  };
};
