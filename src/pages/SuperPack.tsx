import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { normalizeApiUrl } from '../utils/samplePackerAPI';

type JobStatus = 'processing' | 'completed' | 'failed';

interface SuperPackJob {
  job_id: string;
  status: JobStatus;
  blockHeight: number;
  dataSource?: 'hash' | 'merkle_root';
  includeAudio?: boolean;
  created_at?: string;
  updated_at?: string;
  outputs?: {
    image_url?: string;
    video_url?: string;
    audio_stems?: Record<string, string>;
  };
  error?: string;
}

const stemOrder = ['drums', 'bass', 'chords', 'melody', 'fx'];

export default function SuperPack() {
  const [blockHeight, setBlockHeight] = useState('');
  const [dataSource, setDataSource] = useState<'hash' | 'merkle_root'>('hash');
  const [includeAudio, setIncludeAudio] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [processingJob, setProcessingJob] = useState<SuperPackJob | null>(null);
  const [completedJob, setCompletedJob] = useState<SuperPackJob | null>(null);
  const [recentJobs, setRecentJobs] = useState<SuperPackJob[]>([]);

  const blockHeightNum = Number.parseInt(blockHeight, 10);
  const isBlockHeightValid = !Number.isNaN(blockHeightNum) && blockHeightNum >= 0;

  const orderedStems = useMemo(() => {
    if (!completedJob?.outputs?.audio_stems) return [] as Array<[string, string]>;

    const entries = Object.entries(completedJob.outputs.audio_stems)
      .map(([stem, url]) => {
        const normalized = normalizeApiUrl(url);
        return normalized ? [stem, normalized] as [string, string] : null;
      })
      .filter((entry): entry is [string, string] => entry !== null);

    const sorted = [...entries].sort((a, b) => {
      const ai = stemOrder.indexOf(a[0]);
      const bi = stemOrder.indexOf(b[0]);
      return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
    });

    return sorted;
  }, [completedJob]);

  const fetchRecent = async () => {
    try {
      const response = await fetch('/api/jobs?limit=200&offset=0');
      if (!response.ok) return;

      const data = await response.json();
      const jobs = (Array.isArray(data?.results) ? data.results : Array.isArray(data?.jobs) ? data.jobs : []) as SuperPackJob[];

      const superpacks = jobs
        .filter((job) => (job as { type?: string }).type?.toLowerCase?.() === 'superpack')
        .filter((job) => job.status === 'completed')
        .map((job) => ({
          ...job,
          outputs: {
            image_url: normalizeApiUrl(job.outputs?.image_url),
            video_url: normalizeApiUrl(job.outputs?.video_url),
            audio_stems: job.outputs?.audio_stems
              ? Object.fromEntries(
                  Object.entries(job.outputs.audio_stems)
                    .map(([stem, url]) => {
                      const normalized = normalizeApiUrl(url);
                      return normalized ? [stem, normalized] : null;
                    })
                    .filter((entry): entry is [string, string] => entry !== null)
                )
              : undefined,
          },
        }))
        .filter((job) => !!job.outputs?.image_url)
        .sort((a, b) => {
          const aTime = new Date(a.updated_at || a.created_at || 0).getTime();
          const bTime = new Date(b.updated_at || b.created_at || 0).getTime();
          return bTime - aTime;
        })
        .slice(0, 6);

      setRecentJobs(superpacks);
    } catch {
      // Keep page usable if preview fetch fails.
    }
  };

  useEffect(() => {
    fetchRecent();
  }, []);

  useEffect(() => {
    if (!processingJob || processingJob.status !== 'processing') return;

    const poller = setInterval(async () => {
      try {
        const response = await fetch(`/api/jobs/${processingJob.job_id}`);
        if (!response.ok) return;

        const payload = await response.json();
        if (payload.status === 'completed') {
          const normalizedStems = payload.outputs?.audio_stems
            ? Object.fromEntries(
                Object.entries(payload.outputs.audio_stems)
                  .map(([stem, url]) => {
                    const normalized = normalizeApiUrl(url as string);
                    return normalized ? [stem, normalized] : null;
                  })
                  .filter((entry): entry is [string, string] => entry !== null)
              )
            : undefined;

          setProcessingJob(null);
          setCompletedJob({
            ...processingJob,
            status: 'completed',
            dataSource: payload.parameters?.dataSource,
            includeAudio: payload.parameters?.includeAudio,
            outputs: {
              image_url: normalizeApiUrl(payload.outputs?.image_url) || `/api/files/superpack_${processingJob.blockHeight}_${processingJob.job_id}.png`,
              video_url: normalizeApiUrl(payload.outputs?.video_url) || `/api/files/superpack_${processingJob.blockHeight}_${processingJob.job_id}.mp4`,
              audio_stems: normalizedStems,
            },
          });
          fetchRecent();
          return;
        }

        if (payload.status === 'failed') {
          setProcessingJob(null);
          setCompletedJob({
            ...processingJob,
            status: 'failed',
            error: payload.error?.message || payload.error || 'Render failed',
          });
          fetchRecent();
        }
      } catch {
        // Keep polling until terminal state.
      }
    }, 2000);

    return () => clearInterval(poller);
  }, [processingJob]);

  const createSuperPack = async () => {
    if (!isBlockHeightValid) {
      setError('Invalid block height');
      return;
    }

    setIsCreating(true);
    setError(null);

    try {
      const response = await fetch('/api/superpack', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          blockHeight: blockHeightNum,
          dataSource,
          includeAudio,
        }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.message || 'Failed to create SuperPack');
      }

      const payload = await response.json();
      setProcessingJob({
        job_id: payload.job_id,
        status: 'processing',
        blockHeight: blockHeightNum,
        dataSource,
        includeAudio,
      });
      setCompletedJob(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsCreating(false);
    }
  };

  const reset = () => {
    setProcessingJob(null);
    setCompletedJob(null);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-base-100">
      <section className="rounded-3xl border border-base-300 bg-gradient-to-br from-base-200 to-base-100 p-6 md:p-10 shadow-xl">
        <div className="max-w-5xl mx-auto">
          <div className="inline-flex items-center gap-2 rounded-full border border-base-300 bg-base-200/50 px-4 py-1.5 text-xs font-medium text-base-content/70 shadow-sm">
            SuperPack • Bitcoin Blocks
          </div>

          <div className="mt-6 flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-4xl md:text-5xl font-bold">SuperPack Creator</h1>
              <p className="mt-2 text-base-content/70 text-lg">Generate artwork and animation from Bitcoin block data.</p>
            </div>

            <div className="flex items-center gap-3">
              <Link to="/inspira/superpack-gallery" className="btn btn-outline btn-sm">
                View Gallery
              </Link>
              <div className="badge badge-outline">Inspira</div>
            </div>
          </div>

          <div className="mt-8 grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,420px)] gap-6">
            <div className="card bg-base-200 border border-base-300">
              <div className="card-body">
                <div className="text-sm font-semibold">Create a SuperPack</div>
                <p className="text-sm text-base-content/70">Enter a block height and render a new pack.</p>

                <div className="mt-4 space-y-4">
                  <div>
                    <label className="label">
                      <span className="label-text">Bitcoin Block Height</span>
                    </label>
                    <input
                      type="number"
                      value={blockHeight}
                      onChange={(event) => setBlockHeight(event.target.value)}
                      disabled={isCreating}
                      min="0"
                      placeholder="Enter block height (e.g., 840000)"
                      className="input input-bordered w-full"
                    />
                  </div>

                  <div>
                    <div className="label">
                      <span className="label-text">Data Source</span>
                    </div>
                    <div className="join w-full">
                      <button
                        type="button"
                        onClick={() => setDataSource('hash')}
                        className={`btn join-item flex-1 ${dataSource === 'hash' ? 'btn-active' : ''}`}
                      >
                        Block Hash
                      </button>
                      <button
                        type="button"
                        onClick={() => setDataSource('merkle_root')}
                        className={`btn join-item flex-1 ${dataSource === 'merkle_root' ? 'btn-active' : ''}`}
                      >
                        Merkle Root
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="label cursor-pointer justify-start gap-3">
                      <input
                        type="checkbox"
                        checked={includeAudio}
                        onChange={(event) => setIncludeAudio(event.target.checked)}
                        className="checkbox checkbox-primary"
                      />
                      <span className="label-text">Include AI-Generated Audio Stems</span>
                    </label>
                    <p className="text-sm opacity-75 mt-2 ml-8">
                      {includeAudio ? '✓ Audio generation enabled (5-10 min)' : 'ℹ Audio disabled (2-5 min)'}
                    </p>
                  </div>
                </div>

                {error && (
                  <div className="alert alert-error mt-4">
                    <span>{error}</span>
                  </div>
                )}

                <div className="mt-4 flex flex-wrap gap-3">
                  <button onClick={createSuperPack} disabled={!isBlockHeightValid || isCreating} className="btn btn-primary">
                    {isCreating ? 'Creating SuperPack...' : 'Create SuperPack'}
                  </button>
                  <button onClick={reset} className="btn btn-ghost" disabled={isCreating && !processingJob}>
                    Reset
                  </button>
                </div>
              </div>
            </div>

            <div className="card bg-base-200 border border-base-300">
              <div className="card-body">
                <div className="text-sm font-semibold">Status</div>
                {!processingJob && !completedJob && <p className="text-sm text-base-content/70">Ready when you are.</p>}

                {processingJob?.status === 'processing' && (
                  <div className="mt-4 flex flex-col gap-4">
                    <div className="flex items-center gap-3">
                      <span className="loading loading-spinner loading-md" />
                      <div>
                        <div className="text-sm font-semibold">
                          {processingJob.includeAudio ? 'Rendering SuperPack with Audio' : 'Rendering SuperPack'}
                        </div>
                        <div className="text-xs text-base-content/60">Block {processingJob.blockHeight}</div>
                      </div>
                    </div>
                    <progress className="progress progress-primary w-full" value={60} max={100} />
                    <div className="text-xs text-base-content/60">
                      {processingJob.includeAudio
                        ? 'Typically 5-10 minutes (rendering + audio generation).'
                        : 'Typically 2-5 minutes.'}
                    </div>
                  </div>
                )}

                {completedJob?.status === 'completed' && (
                  <div className="mt-4 space-y-3">
                    <div className="badge badge-success">Completed</div>
                    <div className="text-xs text-base-content/70">
                      Block {completedJob.blockHeight} • Source {completedJob.dataSource === 'merkle_root' ? 'Merkle Root' : 'Hash'}
                    </div>

                    {completedJob.outputs?.image_url && (
                      <a href={completedJob.outputs.image_url} download className="btn btn-sm btn-outline w-full">
                        Download Image
                      </a>
                    )}

                    {completedJob.outputs?.video_url && (
                      <a href={completedJob.outputs.video_url} download className="btn btn-sm btn-outline w-full">
                        Download Video
                      </a>
                    )}
                  </div>
                )}

                {completedJob?.status === 'failed' && (
                  <div className="alert alert-error mt-4">
                    <span>{completedJob.error || 'Render failed'}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {orderedStems.length > 0 && (
            <div className="mt-6 card bg-base-200 border border-base-300">
              <div className="card-body">
                <div className="text-sm font-semibold">Audio Stems</div>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  {orderedStems.map(([stem, url]) => (
                    <div key={stem} className="flex flex-col items-center gap-2">
                      <span className="text-xs font-semibold capitalize">{stem}</span>
                      <audio controls className="w-full h-8" src={url} />
                      <a href={url} download={`${stem}_${completedJob?.blockHeight || 'superpack'}.wav`} className="btn btn-xs btn-outline">
                        Download
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="mt-8">
            <div className="text-sm font-semibold mb-3">Recent SuperPacks</div>
            {recentJobs.length === 0 ? (
              <p className="text-sm text-base-content/60">No completed SuperPacks yet.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {recentJobs.map((job) => (
                  <div key={job.job_id} className="card bg-base-200 border border-base-300 overflow-hidden">
                    <div className="aspect-video bg-base-300">
                      {job.outputs?.image_url ? (
                        <img src={job.outputs.image_url} alt={`SuperPack ${job.job_id}`} className="w-full h-full object-cover" loading="lazy" />
                      ) : null}
                    </div>
                    <div className="card-body p-4">
                      <div className="text-xs text-base-content/70">Block {job.blockHeight}</div>
                      <div className="flex items-center gap-2 mt-2">
                        <Link to="/inspira/superpack-gallery" className="btn btn-xs btn-outline">
                          Open Gallery
                        </Link>
                        {job.outputs?.audio_stems && Object.keys(job.outputs.audio_stems).length > 0 && (
                          <span className="badge badge-success badge-sm">Audio</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
