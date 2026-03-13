import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import PublishToBeatfeedModal from '../components/PublishToBeatfeedModal';
import { useWallet } from '../context/WalletContext';
import WalletRequiredNotice from '../components/WalletRequiredNotice';

interface AudioFile {
  filename: string;
  path: string;
  url: string;
  stem: string;
  sample_rate: number;
  duration_estimate: number;
}

interface SamplePack {
  job_id: string;
  prompt: string;
  parameters: {
    bpm: number;
    key: string;
    stems_count: number;
  };
  created_at: string;
  audio: AudioFile[];
  audio_urls: AudioFile[];
  cover_url: string | null;
  models?: {
    audio?: string;
    checkpoint?: string;
  };
}

const SamplePacks: React.FC = () => {
  const { isWalletConnected } = useWallet();
  const apiBase = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '');
  const [packs, setPacks] = useState<SamplePack[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [playingAudio, setPlayingAudio] = useState<{ [key: string]: string | null }>({});
  const [audioElements, setAudioElements] = useState<{ [key: string]: HTMLAudioElement }>({});
  const [publishModal, setPublishModal] = useState({ isOpen: false, packId: '', packTitle: '' });

  useEffect(() => {
    fetchPacks();
  }, []);

  const buildFileUrl = (raw?: string | null): string | null => {
    if (!raw) return null;
    if (/^https?:\/\//i.test(raw)) return raw;
    if (raw.startsWith('/api')) return raw;
    if (raw.startsWith('/files')) return `${apiBase}${raw}`;
    if (raw.startsWith('files/')) return `${apiBase}/${raw}`;
    return `${apiBase}/files/${raw.replace(/^\//, '')}`;
  };

  const fetchPacks = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`${apiBase}/packs`);

      if (!response.ok) {
        throw new Error(`Failed to fetch sample packs: HTTP ${response.status}`);
      }

      const data = await response.json();
      const packsList = Array.isArray(data) ? data : (data.packs || data.results || []);
      setPacks(packsList);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const togglePlay = (packId: string, audioPath: string) => {
    const key = `${packId}-${audioPath}`;

    Object.keys(audioElements).forEach((k) => {
      if (k.startsWith(packId) && audioElements[k]) {
        audioElements[k].pause();
        audioElements[k].currentTime = 0;
      }
    });

    if (playingAudio[packId] === audioPath) {
      setPlayingAudio((prev) => ({ ...prev, [packId]: null }));
    } else {
      if (!audioElements[key]) {
        const fullUrl = buildFileUrl(audioPath) || audioPath;
        const audio = new Audio(fullUrl);
        audio.crossOrigin = 'anonymous';
        audio.addEventListener('ended', () => {
          setPlayingAudio((prev) => ({ ...prev, [packId]: null }));
        });
        audio.addEventListener('error', () => {
          setPlayingAudio((prev) => ({ ...prev, [packId]: null }));
        });
        setAudioElements((prev) => ({ ...prev, [key]: audio }));
        audio.play().catch(() => {
          setPlayingAudio((prev) => ({ ...prev, [packId]: null }));
        });
      } else {
        audioElements[key].play().catch(() => {
          setPlayingAudio((prev) => ({ ...prev, [packId]: null }));
        });
      }
      setPlayingAudio((prev) => ({ ...prev, [packId]: audioPath }));
    }
  };

  const downloadPack = (packId: string) => {
    window.open(`${apiBase}/packs/${packId}/download`, '_blank');
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  if (isLoading) {
    return <div className="inspira-panel rounded-[34px] px-6 py-12 text-center text-base-content/60">Loading packs...</div>;
  }

  if (error) {
    return (
      <div className="inspira-panel rounded-[34px] px-6 py-12 text-center">
        <p className="text-error">{error}</p>
        <button onClick={fetchPacks} className="mt-4 inline-flex rounded-full bg-primary px-5 py-3 font-semibold text-primary-content">
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-6">
      <section className="inspira-panel rounded-[34px] px-6 py-8 md:px-8 md:py-10">
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="inspira-kicker">Sample packs</div>
            <h1 className="mt-5 text-4xl text-base-content md:text-5xl">Browse generated packs and launch into Studio.</h1>
            <p className="mt-4 max-w-3xl text-lg leading-8 text-base-content/72">
              Explore generated sample packs, preview individual stems, download complete bundles, and publish selected packs into Beatfeed when your wallet is connected.
            </p>
          </div>
          <button onClick={fetchPacks} className="inline-flex rounded-full border border-base-300 px-5 py-3 font-semibold text-base-content hover:border-primary hover:text-primary">
            Refresh
          </button>
        </div>
      </section>

      {packs.length === 0 ? (
        <div className="inspira-panel rounded-[34px] p-16 text-center">
          <p className="text-lg text-base-content/60">No sample packs yet. Generate your first pack.</p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {packs.map((pack) => (
            <article key={pack.job_id} className="inspira-panel overflow-hidden rounded-[30px]">
              <div className="relative aspect-square bg-base-300">
                {buildFileUrl(pack.cover_url) ? (
                  <img
                    src={buildFileUrl(pack.cover_url) as string}
                    alt={pack.prompt}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-base-content/40">No cover</div>
                )}
                <div className="absolute right-3 top-3 rounded-full bg-base-100/85 px-3 py-1 text-xs font-semibold text-base-content">
                  {pack.parameters.bpm} BPM • {pack.parameters.key}
                </div>
              </div>

              <div className="space-y-4 p-5">
                <div>
                  <h2 className="line-clamp-2 text-xl text-base-content">{pack.prompt}</h2>
                  <p className="mt-2 text-sm text-base-content/60">
                    {(pack.audio?.length || 0)} stems • {formatDate(pack.created_at)}
                  </p>
                </div>

                {pack.models && (
                  <div className="space-y-1 text-xs text-base-content/60">
                    {pack.models.checkpoint ? <div>{pack.models.checkpoint.replace('.safetensors', '')}</div> : null}
                    {pack.models.audio ? <div>{pack.models.audio}</div> : null}
                  </div>
                )}

                {pack.audio && pack.audio.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {pack.audio.slice(0, 4).map((audio, idx) => {
                      const audioPath =
                        buildFileUrl(audio.url) ||
                        buildFileUrl(audio.path ? `/files/${audio.path}` : null) ||
                        '';
                      if (!audioPath) return null;
                      return (
                        <button
                          key={idx}
                          onClick={() => togglePlay(pack.job_id, audioPath)}
                          className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                            playingAudio[pack.job_id] === audioPath
                              ? 'bg-success text-success-content'
                              : 'border border-base-300 bg-base-100/60 text-base-content/75'
                          }`}
                        >
                          {playingAudio[pack.job_id] === audioPath ? 'Pause' : 'Play'} {audio.stem}
                        </button>
                      );
                    })}
                  </div>
                ) : null}

                <div className="grid gap-2">
                  <div className="grid grid-cols-2 gap-2">
                    <Link to={`../studio/${pack.job_id}`} className="inline-flex items-center justify-center rounded-full bg-primary px-4 py-3 text-sm font-semibold text-primary-content">
                      Studio
                    </Link>
                    <button onClick={() => downloadPack(pack.job_id)} className="rounded-full border border-base-300 px-4 py-3 text-sm font-semibold text-base-content hover:border-primary hover:text-primary">
                      Download
                    </button>
                  </div>
                  <button
                    onClick={() => {
                      if (!isWalletConnected) return;
                      setPublishModal({ isOpen: true, packId: pack.job_id, packTitle: pack.prompt });
                    }}
                    className="rounded-full bg-warning px-4 py-3 text-sm font-semibold text-warning-content disabled:opacity-60"
                    disabled={!isWalletConnected}
                  >
                    Publish to Beatfeed
                  </button>
                  {!isWalletConnected ? (
                    <WalletRequiredNotice action="publish to Beatfeed" className="text-xs" />
                  ) : null}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      <PublishToBeatfeedModal
        packId={publishModal.packId}
        packTitle={publishModal.packTitle}
        isOpen={publishModal.isOpen}
        walletConnected={isWalletConnected}
        onClose={() => setPublishModal({ ...publishModal, isOpen: false })}
        onSuccess={() => {
          fetchPacks();
        }}
      />
    </div>
  );
};

export default SamplePacks;
