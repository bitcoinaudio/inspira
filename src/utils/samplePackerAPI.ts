// API client for SamplePacker AI integration
export interface SamplePackRequest {
  prompt: string;
  bpm?: number;
  key?: string;
  duration?: number;
  stems?: number | string[];
  seed_base?: number;
  model_size?: 'small' | 'medium';
  guidance?: number;
  cover_model?: 'pil' | 'grfft';
  workflow?: string;
}

export interface SamplePackJob {
  job_id: string;
  status: 'queued' | 'processing' | 'completed' | 'failed' | 'timeout';
  created_at: string;
  updated_at?: string;
  comfy_prompt_id?: string;
  estimated_duration?: string;
  progress?: number;
  processing_time?: number;
  elapsed_time?: number;
  debug_info?: {
    audio_files_found?: number;
    expected_stems?: number;
    comfy_status?: string;
    comfy_prompt_id?: string;
    has_manifest?: boolean;
    elapsed_minutes?: number;
  };
  parameters?: {
    bpm: number;
    key: string;
    duration: number;
    stems: number;
    seed_base: number;
    model_size: string;
    guidance: number;
  };
  outputs?: {
    manifest?: string;
    audio_files?: string[];
    image_url?: string;
  };
}

export interface BitcoinImageRequest {
  imageData: string; // Base64 data URL from canvas
  blockHeight: number;
  dataSource: 'merkleRoot' | 'hash';
  seed?: number;
  stemSegments?: string[]; // 8 segments of hex data for audio generation
}

// Normalized manifest interface (works with both legacy and Beatfeed v1.0.0 formats)
export interface SamplePackManifest {
  job_id: string;
  prompt: string;
  parameters: {
    bpm: number;
    key: string;
    stems_count: number;
  };
  created_at: string;
  format_version: string;
  audio: Array<{
    filename: string;
    path: string;
    stem: string;
    sample_rate: number;
    duration_estimate: number;
  }>;
  cover?: {
    filename: string;
    path: string;
    size: number;
  } | null;
  stats: {
    total_files: number;
    total_duration_estimate: number;
  };
}

// Beatfeed Manifest v1.0.0 interfaces (for raw manifest parsing)
interface BeatfeedStemEntry {
  id: string;
  title?: string;
  audio?: {
    kind: 'audio';
    url: string;
    duration_seconds?: number;
    sample_rate_hz?: number;
  };
}

interface BeatfeedManifestV1 {
  schema?: { name: string; version: string };
  artifact?: {
    type: string;
    source_app: string;
    source_ref: string;
    title: string;
    description?: string;
    created_at: string;
  };
  assets?: {
    cover?: { kind: 'image'; url: string; size_bytes?: number };
  };
  contents?: {
    stems?: BeatfeedStemEntry[];
  };
  provenance?: {
    seeds?: { bpm?: number; key?: string };
  };
  x?: {
    samplepacker?: {
      job_id?: string;
      parameters?: { bpm?: number; key?: string };
      total_duration_seconds?: number;
    };
  };
}

// Type guard to check if manifest is Beatfeed v1.0.0 format
function isBeatfeedManifest(manifest: unknown): manifest is BeatfeedManifestV1 {
  return (
    typeof manifest === 'object' &&
    manifest !== null &&
    'schema' in manifest &&
    typeof (manifest as BeatfeedManifestV1).schema === 'object' &&
    (manifest as BeatfeedManifestV1).schema?.name === 'beatfeed_manifest'
  );
}

// Normalize any manifest format to our standard interface
function normalizeManifest(rawManifest: unknown): SamplePackManifest {
  if (isBeatfeedManifest(rawManifest)) {
    // Beatfeed Manifest v1.0.0 format
    const stems = rawManifest.contents?.stems || [];
    const bpm = rawManifest.provenance?.seeds?.bpm || rawManifest.x?.samplepacker?.parameters?.bpm || 0;
    const key = rawManifest.provenance?.seeds?.key || rawManifest.x?.samplepacker?.parameters?.key || '';
    
    return {
      job_id: rawManifest.artifact?.source_ref || rawManifest.x?.samplepacker?.job_id || 'unknown',
      prompt: rawManifest.artifact?.description || rawManifest.artifact?.title || '',
      parameters: {
        bpm,
        key,
        stems_count: stems.length,
      },
      created_at: rawManifest.artifact?.created_at || new Date().toISOString(),
      format_version: rawManifest.schema?.version || '1.0.0',
      audio: stems.map(stem => ({
        stem: stem.id,
        filename: stem.audio?.url?.split('/').pop() || `${stem.id}.wav`,
        path: stem.audio?.url?.replace('{{ASSET_BASE}}/', '') || '',
        duration_estimate: stem.audio?.duration_seconds || 8,
        sample_rate: stem.audio?.sample_rate_hz || 32000,
      })),
      cover: rawManifest.assets?.cover ? {
        filename: rawManifest.assets.cover.url?.split('/').pop() || 'cover.png',
        path: rawManifest.assets.cover.url?.replace('{{ASSET_BASE}}/', '') || '',
        size: rawManifest.assets.cover.size_bytes || 0,
      } : null,
      stats: {
        total_files: stems.length,
        total_duration_estimate: rawManifest.x?.samplepacker?.total_duration_seconds || 
          stems.reduce((acc, s) => acc + (s.audio?.duration_seconds || 0), 0),
      },
    };
  }
  
  // Legacy format - ensure audio array exists
  const legacyManifest = rawManifest as SamplePackManifest;
  return {
    ...legacyManifest,
    audio: legacyManifest.audio || [],
    stats: legacyManifest.stats || { total_files: 0, total_duration_estimate: 0 },
  };
}

export class SamplePackerAPI {
  private baseURL: string;
  private retryAttempts: number;
  private retryDelay: number;
  private isHealthy: boolean | null;

  constructor(baseURL: string = 'http://localhost:3003/api', retryAttempts: number = 3, retryDelay: number = 1000) {
    this.baseURL = baseURL;
    this.retryAttempts = retryAttempts;
    this.retryDelay = retryDelay;
    this.isHealthy = null;
  }

  private async fetchWithRetry(url: string, options: RequestInit = {}, attempts: number = this.retryAttempts): Promise<Response> {
    const timeoutMs = 10000; // 10 second timeout
    
    for (let attempt = 1; attempt <= attempts; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
        
        const response = await fetch(url, {
          ...options,
          signal: controller.signal,
          headers: {
            'Content-Type': 'application/json',
            ...options.headers,
          },
        });
        
        clearTimeout(timeoutId);
        return response;
      } catch (error) {
        const isLastAttempt = attempt === attempts;
        
        if (error instanceof Error) {
          // Check for network errors
          if (error.name === 'TypeError' && error.message.includes('fetch')) {
            if (isLastAttempt) {
              throw new Error('Cannot connect to backend server. Please ensure the SamplePacker gateway is running on port 3003.');
            }
          } else if (error.name === 'AbortError') {
            if (isLastAttempt) {
              throw new Error('Request timeout - backend server is not responding.');
            }
          } else if (isLastAttempt) {
            throw error;
          }
        } else if (isLastAttempt) {
          throw new Error('Unknown network error occurred');
        }
        
        // Wait before retrying (exponential backoff)
        if (!isLastAttempt) {
          await new Promise(resolve => setTimeout(resolve, this.retryDelay * attempt));
        }
      }
    }
    
    throw new Error('Failed to fetch after multiple attempts');
  }

  async createSamplePack(request: SamplePackRequest): Promise<SamplePackJob> {
    const response = await this.fetchWithRetry(`${this.baseURL}/packs`, {
      method: 'POST',
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
  }

  async getJobStatus(jobId: string): Promise<SamplePackJob> {
    const response = await this.fetchWithRetry(`${this.baseURL}/jobs/${jobId}`, {}, 2); // Less retries for polling

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
  }

  async listJobs(status?: string, limit?: number, offset?: number): Promise<SamplePackJob[]> {
    const params = new URLSearchParams();
    if (status) params.append('status', status);
    if (limit) params.append('limit', limit.toString());
    if (offset) params.append('offset', offset.toString());

    const response = await this.fetchWithRetry(`${this.baseURL}/jobs?${params}`);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    if (Array.isArray(data)) {
      return data;
    }

    if (data && Array.isArray(data.jobs)) {
      return data.jobs;
    }

    return [];
  }

  async deleteJob(jobId: string): Promise<void> {
    const response = await this.fetchWithRetry(`${this.baseURL}/jobs/${jobId}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }
  }

  async downloadFile(filename: string): Promise<Blob> {
    const response = await this.fetchWithRetry(`${this.baseURL}/files/${filename}`);

    if (!response.ok) {
      throw new Error(`Failed to download file: ${response.statusText}`);
    }

    return response.blob();
  }

  async getJobManifest(jobId: string): Promise<SamplePackManifest> {
    const job = await this.getJobStatus(jobId);
    
    if (job.status !== 'completed' || !job.outputs?.manifest) {
      throw new Error('Job is not completed or manifest is not available');
    }

    const manifestFilename = job.outputs.manifest.replace('/files/', '');
    const manifestBlob = await this.downloadFile(manifestFilename);
    const manifestText = await manifestBlob.text();
    
    const rawManifest = JSON.parse(manifestText);
    return normalizeManifest(rawManifest);
  }

  async checkHealth(): Promise<{ status: string; timestamp: string; uptime: number }> {
    try {
      const response = await this.fetchWithRetry(`${this.baseURL}/health`, {}, 1); // Single attempt for health check

      if (!response.ok) {
        this.isHealthy = false;
        throw new Error(`Health check failed: ${response.statusText}`);
      }

      this.isHealthy = true;
      return response.json();
    } catch (error) {
      this.isHealthy = false;
      throw error;
    }
  }

  getHealthStatus(): boolean | null {
    return this.isHealthy;
  }

  async createBitcoinImage(request: BitcoinImageRequest): Promise<SamplePackJob> {
    const response = await this.fetchWithRetry(`${this.baseURL}/bitcoin/image`, {
      method: 'POST',
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
  }

  async listWorkflows(): Promise<Array<{value: string, label: string, name: string, type: string}>> {
    const response = await this.fetchWithRetry(`${this.baseURL}/workflows`);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    return data.workflows || [];
  }
}

// Export singleton instance
export const samplePackerAPI = new SamplePackerAPI();
