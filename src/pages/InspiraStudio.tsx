import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import * as Tone from 'tone';
import { useStudioSettings, useAudioExport } from '../hooks/useStudioSettings';

// Helper function to convert dB to percentage (0-100)
const dbToPercent = (db: number): number => {
  // Map -60dB to 0%, 0dB to 100%
  return Math.max(0, Math.min(100, (db + 60) / 0.6));
};

// Helper function to get meter color based on level
const getMeterColor = (percent: number): string => {
  if (percent > 95) return '#ef4444'; // Red - clipping
  if (percent > 80) return '#f59e0b'; // Orange - loud
  if (percent > 50) return '#84cc16'; // Lime - good level
  return '#22c55e'; // Green - quiet
};

// Helper function to get spectrum color based on frequency
const getSpectrumColor = (frequency: number, maxFreq: number = 20000): string => {
  const normalized = frequency / maxFreq;
  if (normalized < 0.1) return '#ef4444'; // Red - sub bass
  if (normalized < 0.25) return '#f59e0b'; // Orange - bass
  if (normalized < 0.5) return '#84cc16'; // Lime - low mid
  if (normalized < 0.75) return '#22c55e'; // Green - mid
  if (normalized < 0.9) return '#06b6d4'; // Cyan - high mid
  return '#a78bfa'; // Purple - treble
};

interface Stem {
  id: string;
  name: string;
  url: string;
  player?: Tone.Player;
  synth?: Tone.Synth;
  volume: number;
  pan: number;
  isMuted: boolean;
  isSolo: boolean;
  adsr: {
    attack: number;
    decay: number;
    sustain: number;
    release: number;
  };
  effects: {
    reverb: {
      enabled: boolean;
      wet: number;
      decay: number;
      node?: Tone.Reverb;
    };
    delay: {
      enabled: boolean;
      wet: number;
      time: number;
      feedback: number;
      node?: Tone.Delay;
    };
    chorus: {
      enabled: boolean;
      wet: number;
      rate: number;
      depth: number;
      node?: Tone.Chorus;
    };
  };
}

interface PackData {
  job_id: string;
  cover_url?: string;
  cover?: string;
  outputs?: {
    image_url?: string;
  };
  audio?: Array<{ filename: string; path: string; stem: string; url: string }>;
  audio_urls?: Array<{ filename: string; path: string; stem: string; url: string }>;
  prompt?: string;
  parameters?: {
    bpm?: number;
    key?: string;
  };
}

const InspiraStudio: React.FC = () => {
  const { packId } = useParams<{ packId: string }>();
  const navigate = useNavigate();
  const { settings, updateStemSettings, updateMasterVolume: saveVolume, clearSettings } = useStudioSettings(packId);
  const { exportRecording } = useAudioExport();
  
  const [pack, setPack] = useState<PackData | null>(null);
  const [stems, setStems] = useState<Stem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isBasePack, setIsBasePack] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [masterVolume, setMasterVolume] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [stemLevels, setStemLevels] = useState<{ [key: string]: number }>({});
  const [masterLevel, setMasterLevel] = useState(0);
  const [masterSpectrum, setMasterSpectrum] = useState<number[]>([]);
  const [showSpectrum, setShowSpectrum] = useState(true);
  const [limiterEnabled, setLimiterEnabled] = useState(true);
  const [limiterThreshold, setLimiterThreshold] = useState(-3); // dB

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const masterGainRef = useRef<Tone.Gain | null>(null);
  const masterCompressorRef = useRef<Tone.Compressor | null>(null);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const stemsRef = useRef<Map<string, Tone.Player>>(new Map());
  const stemNodesRef = useRef<Map<string, {
    player: Tone.Player;
    stemGain: Tone.Gain;
    panNode: Tone.Panner;
    reverbNode: Tone.Reverb;
    delayNode: Tone.Delay;
    chorusNode: Tone.Chorus;
    analyser: Tone.Analyser;
  }>>(new Map());
  const masterAnalyserRef = useRef<Tone.Analyser | null>(null);

  // Load pack data
  useEffect(() => {
    const loadPack = async () => {
      try {
        setIsLoading(true);
        // Fetch all packs and find the one with matching job_id
        const response = await fetch(`/api/packs`);

        if (!response.ok) {
          throw new Error(`Failed to load packs: ${response.statusText}`);
        }

        const data = await response.json();
        const allPacks = data.packs || [];
        const packData = allPacks.find((p: any) => p.job_id === packId);

        if (!packData) {
          const jobResponse = await fetch(`/api/jobs/${packId}`);
          if (!jobResponse.ok) {
            throw new Error(`Pack with ID ${packId} not found`);
          }

          const jobData = await jobResponse.json();
          if (jobData?.type !== 'bitcoin_image') {
            throw new Error(`Pack with ID ${packId} not found`);
          }

          setPack({
            job_id: jobData.job_id || packId,
            prompt: `B.A.S.E Pack #${jobData.parameters?.blockHeight ?? ''}`.trim(),
            outputs: jobData.outputs || {},
          });
          setStems([]);
          setIsBasePack(true);
          setError(null);
          return;
        }

        setPack(packData);
        setIsBasePack(false);

        // Load stems
        const stemsArray: Stem[] = [];
        const audioFiles = packData.audio_urls || packData.audio || [];

        audioFiles.forEach((file: any, index: number) => {
          const url = file.url || `/api/files/${file.path}`;
          stemsArray.push({
            id: `stem-${index}`,
            name: file.stem || `Stem ${index + 1}`,
            url: url.startsWith('/api') ? url : `/api${url}`,
            volume: 0,
            pan: 0,
            isMuted: false,
            isSolo: false,
            adsr: { attack: 0.005, decay: 0.1, sustain: 0.3, release: 0.5 },
            effects: {
              reverb: { enabled: false, wet: 0.3, decay: 1.5 },
              delay: { enabled: false, wet: 0.3, time: 0.5, feedback: 0.5 },
              chorus: { enabled: false, wet: 0.3, rate: 1.5, depth: 0.5 }
            }
          });
        });

        setStems(stemsArray);
        
        // Restore saved settings if available
        if (settings) {
          stemsArray.forEach((stem) => {
            const savedStem = settings.stems.find((s) => s.id === stem.id);
            if (savedStem) {
              stem.volume = savedStem.volume;
              stem.pan = savedStem.pan;
              stem.isMuted = savedStem.isMuted;
              stem.isSolo = savedStem.isSolo;
              stem.adsr = savedStem.adsr;
              stem.effects = savedStem.effects;
            }
          });
          setMasterVolume(settings.masterVolume);
        }

        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load pack');
        console.error('Error loading pack:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadPack();
  }, [packId, settings]);

  // Initialize Tone.js
  const initializeAudio = useCallback(async () => {
    if (audioContextRef.current) return;

    try {
      await Tone.start();
      audioContextRef.current = Tone.getContext().rawContext as AudioContext;

      // Create master gain and analysers
      masterGainRef.current = new Tone.Gain(0);
      
      // Create master compressor/limiter for clipping prevention
      masterCompressorRef.current = new Tone.Compressor({
        threshold: limiterThreshold,
        ratio: 10, // Hard limiting
        attack: 0.003, // 3ms attack
        release: 0.25 // 250ms release
      });
      
      masterAnalyserRef.current = new Tone.Analyser('waveform', 256);
      
      // Create FFT analyser for spectrum visualization
      const fftAnalyser = new Tone.Analyser('fft', 512);
      
      // Signal chain: Master Gain → Compressor → Analysers → Destination
      masterGainRef.current.connect(masterCompressorRef.current);
      masterCompressorRef.current.connect(masterAnalyserRef.current);
      masterCompressorRef.current.connect(fftAnalyser);
      masterAnalyserRef.current.toDestination();
      
      // Store FFT analyser for spectrum updates
      (masterAnalyserRef.current as any).fftAnalyser = fftAnalyser;

      // Create players for each stem with effects chain
      const newStems = await Promise.all(
        stems.map(async (stem) => {
          try {
            const player = new Tone.Player(stem.url);
            
            // Create effect nodes
            const reverbNode = new Tone.Reverb({
              decay: stem.effects.reverb.decay
            }).connect(masterGainRef.current!);

            const delayNode = new Tone.Delay(stem.effects.delay.time, 4).connect(reverbNode);

            const chorusNode = new Tone.Chorus({
              frequency: stem.effects.chorus.rate,
              delayTime: 2.5,
              depth: stem.effects.chorus.depth
            }).connect(delayNode);

            // Create analyser for level metering
            const analyser = new Tone.Analyser('waveform', 256);

            // Create stem gain for volume control
            const stemGain = new Tone.Gain(Tone.dbToGain(stem.volume))
              .connect(analyser);
            
            analyser.connect(chorusNode);

            // Create pan node
            const panNode = new Tone.Panner(stem.pan)
              .connect(stemGain);

            // Connect player to effects chain
            player.connect(panNode);

            // Store nodes for later updates
            stemsRef.current.set(stem.id, player);
            stemNodesRef.current.set(stem.id, {
              player,
              stemGain,
              panNode,
              reverbNode,
              delayNode,
              chorusNode,
              analyser
            });

            return { ...stem };
          } catch (err) {
            console.error(`Failed to load stem ${stem.name}:`, err);
            return stem;
          }
        })
      );

      setStems(newStems);
    } catch (err) {
      console.error('Error initializing audio:', err);
      setError('Failed to initialize audio');
    }
  }, [stems]);

  // Play/Stop functionality
  const togglePlayback = async () => {
    if (!isPlaying) {
      await initializeAudio();
      
      // Start all stems that aren't muted/soloed
      stems.forEach((stem) => {
        const player = stemsRef.current.get(stem.id);
        if (player && !stem.isMuted) {
          player.start();
        }
      });

      // Start Tone transport
      Tone.Transport.start();
      setIsPlaying(true);
    } else {
      // Stop all stems
      stemsRef.current.forEach((player) => {
        player.stop();
      });
      Tone.Transport.stop();
      setIsPlaying(false);
    }
  };

  // Update stem volume
  const updateStemVolume = (stemId: string, newVolume: number) => {
    setStems((prev) =>
      prev.map((stem) => {
        if (stem.id === stemId) {
          const nodes = stemNodesRef.current.get(stemId);
          if (nodes) {
            nodes.stemGain.gain.value = Tone.dbToGain(newVolume);
          }
          updateStemSettings(stemId, { volume: newVolume });
          return { ...stem, volume: newVolume };
        }
        return stem;
      })
    );
  };

  // Update stem pan
  const updateStemPan = (stemId: string, newPan: number) => {
    setStems((prev) =>
      prev.map((stem) => {
        if (stem.id === stemId) {
          const nodes = stemNodesRef.current.get(stemId);
          if (nodes) {
            nodes.panNode.pan.value = newPan;
          }
          updateStemSettings(stemId, { pan: newPan });
          return { ...stem, pan: newPan };
        }
        return stem;
      })
    );
  };

  // Toggle mute
  const toggleMute = (stemId: string) => {
    setStems((prev) =>
      prev.map((stem) => {
        if (stem.id === stemId) {
          const player = stemsRef.current.get(stemId);
          const newMutedState = !stem.isMuted;
          if (player) {
            player.mute = newMutedState;
          }
          // Persist to localStorage
          updateStemSettings(stemId, { isMuted: newMutedState });
          return { ...stem, isMuted: newMutedState };
        }
        return stem;
      })
    );
  };

  // Toggle solo
  const toggleSolo = (stemId: string) => {
    setStems((prev) => {
      const isSoloingThis = !prev.find((s) => s.id === stemId)?.isSolo;
      const updated = prev.map((stem) => {
        if (stem.id === stemId) {
          const player = stemsRef.current.get(stemId);
          if (player) {
            player.mute = !isSoloingThis;
          }
          // Persist to localStorage
          updateStemSettings(stemId, { isSolo: !stem.isSolo });
          return { ...stem, isSolo: !stem.isSolo };
        } else if (isSoloingThis) {
          const player = stemsRef.current.get(stem.id);
          if (player) {
            player.mute = true;
          }
          // Persist other stems' muted state
          updateStemSettings(stem.id, { isMuted: true });
          return { ...stem, isMuted: true };
        }
        return stem;
      });
      return updated;
    });
  };

  // Update master volume
  const updateMasterVolume = (newVolume: number) => {
    if (masterGainRef.current) {
      masterGainRef.current.gain.value = Tone.dbToGain(newVolume);
    }
    setMasterVolume(newVolume);
    saveVolume(newVolume);
  };

  // Update limiter threshold
  const updateLimiterThreshold = (threshold: number) => {
    if (masterCompressorRef.current) {
      masterCompressorRef.current.threshold.value = threshold;
    }
    setLimiterThreshold(threshold);
  };

  // Start recording
  const startRecording = async () => {
    try {
      await initializeAudio();

      if (!audioContextRef.current) {
        throw new Error('Audio context not initialized');
      }

      const dest = audioContextRef.current.createMediaStreamDestination();
      
      if (masterGainRef.current) {
        // Connect master output to media stream
        const analyser = audioContextRef.current.createAnalyser();
        masterGainRef.current.connect(analyser);
        analyser.connect(dest);
      }

      const mediaRecorder = new MediaRecorder(dest.stream);
      const chunks: BlobPart[] = [];

      mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        downloadRecording(blob);
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);

      // Timer for recording duration
      recordingTimerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.error('Error starting recording:', err);
      setError('Failed to start recording');
    }
  };

  // Stop recording
  const stopRecording = async () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
    }

    // Stop playback
    stemsRef.current.forEach((player) => {
      try {
        player.stop();
      } catch {
        // Player already stopped
      }
    });
    Tone.Transport.stop();
    setIsPlaying(false);
  };

  // Download recording
  const downloadRecording = async (blob: Blob) => {
    try {
      const result = await exportRecording(packId || '', blob);
      
      // Trigger local download
      const a = document.createElement('a');
      a.href = result.downloadUrl;
      a.download = `inspira-mix-${Date.now()}.webm`;
      a.click();
    } catch (err) {
      console.error('Error uploading recording:', err);
      // Fallback to local download only
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `inspira-mix-${Date.now()}.webm`;
      a.click();
    }
  };

  // Update stem ADSR
  const updateStemADSR = (
    stemId: string,
    adsrUpdates: Partial<Stem['adsr']>
  ) => {
    setStems((prev) =>
      prev.map((stem) => {
        if (stem.id === stemId) {
          const newADSR = { ...stem.adsr, ...adsrUpdates };
          updateStemSettings(stemId, { adsr: newADSR });
          return { ...stem, adsr: newADSR };
        }
        return stem;
      })
    );
  };

  // Update stem effect parameter
  const updateStemEffect = (
    stemId: string,
    effectType: 'reverb' | 'delay' | 'chorus',
    updates: Partial<Stem['effects'][typeof effectType]>
  ) => {
    setStems((prev) =>
      prev.map((stem) => {
        if (stem.id === stemId) {
          const nodes = stemNodesRef.current.get(stemId);
          const newEffects = {
            ...stem.effects,
            [effectType]: { ...stem.effects[effectType], ...updates }
          };

          if (nodes) {
            const effect = newEffects[effectType];
            
            switch (effectType) {
              case 'reverb':
                if ('decay' in effect && typeof effect.decay === 'number') {
                  nodes.reverbNode.decay = effect.decay;
                }
                nodes.reverbNode.wet.value = effect.enabled ? effect.wet : 0;
                break;
              case 'delay':
                if ('time' in effect && typeof effect.time === 'number') {
                  nodes.delayNode.delayTime.value = effect.time;
                }
                // Delay effect wet handled by effect chain bypass
                break;
              case 'chorus':
                if ('rate' in effect && typeof effect.rate === 'number') {
                  nodes.chorusNode.frequency.value = effect.rate;
                }
                if ('depth' in effect && typeof effect.depth === 'number') {
                  nodes.chorusNode.depth = effect.depth;
                }
                nodes.chorusNode.wet.value = effect.enabled ? effect.wet : 0;
                break;
            }
          }

          updateStemSettings(stemId, { effects: newEffects });
          return { ...stem, effects: newEffects };
        }
        return stem;
      })
    );
  };

  // Format time for recording display
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Get cover image
  const getCoverImage = () => {
    if (pack?.cover_url) {
      return pack.cover_url.startsWith('/api') ? pack.cover_url : `/api${pack.cover_url}`;
    }
    if (pack?.outputs?.image_url) {
      const url = pack.outputs.image_url;
      return url.startsWith('/api') ? url : `/api${url}`;
    }
    return null;
  };

  // Cleanup on unmount - clear settings when leaving studio
  useEffect(() => {
    return () => {
      clearSettings();
    };
  }, [clearSettings]);

  // Update level meters continuously
  useEffect(() => {
    let animationId: number;

    const updateMeters = () => {
      if (isPlaying && audioContextRef.current) {
        const newStemLevels: { [key: string]: number } = {};

        // Update stem levels
        stems.forEach((stem) => {
          const nodes = stemNodesRef.current.get(stem.id);
          if (nodes) {
            try {
              const waveform = nodes.analyser.getValue() as Float32Array;
              // Calculate RMS (root mean square) for amplitude
              let sum = 0;
              for (let i = 0; i < waveform.length; i++) {
                sum += waveform[i] * waveform[i];
              }
              const rms = Math.sqrt(sum / waveform.length);
              // Convert to dB (-60 to 0)
              const db = rms > 0 ? Math.max(-60, 20 * Math.log10(rms)) : -60;
              newStemLevels[stem.id] = db;
            } catch (e) {
              newStemLevels[stem.id] = -60;
            }
          }
        });

        setStemLevels(newStemLevels);

        // Update master level and spectrum
        if (masterAnalyserRef.current) {
          try {
            const waveform = masterAnalyserRef.current.getValue() as Float32Array;
            let sum = 0;
            for (let i = 0; i < waveform.length; i++) {
              sum += waveform[i] * waveform[i];
            }
            const rms = Math.sqrt(sum / waveform.length);
            const db = rms > 0 ? Math.max(-60, 20 * Math.log10(rms)) : -60;
            setMasterLevel(db);

            // Get FFT data for spectrum visualization
            const fftAnalyser = (masterAnalyserRef.current as any).fftAnalyser;
            if (fftAnalyser) {
              const fft = fftAnalyser.getValue() as Float32Array;
              // Convert to dB scale and normalize
              const spectrum: number[] = [];
              const fftSize = fft.length;
              
              // Sample every 4th value for better performance (reduce from ~512 to ~128 bars)
              for (let i = 0; i < fftSize; i += 4) {
                const value = Math.max(-100, fft[i]);
                // Convert to 0-100 percentage (-100dB to 0dB)
                const normalized = Math.max(0, Math.min(100, (value + 100) / 1));
                spectrum.push(normalized);
              }
              
              setMasterSpectrum(spectrum);
            }
          } catch (e) {
            setMasterLevel(-60);
            setMasterSpectrum([]);
          }
        }
      }

      animationId = requestAnimationFrame(updateMeters);
    };

    if (isPlaying) {
      animationId = requestAnimationFrame(updateMeters);
    }

    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
    };
  }, [isPlaying, stems]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-base-100 p-8">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-4xl font-bold text-primary mb-8">Inspira Studio</h1>
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-base-content"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !pack) {
    return (
      <div className="min-h-screen bg-base-100 p-8">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-4xl font-bold text-primary mb-8">Inspira Studio</h1>
          <div className="alert alert-error">
            <span>{error || 'Failed to load pack'}</span>
            <button onClick={() => navigate(-1)} className="btn btn-sm">
              Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-base-100 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-primary flex items-center gap-3">
              🎛️ Inspira Studio
            </h1>
            <p className="text-base-content/70 mt-2">Mix, edit, and record your audio</p>
          </div>
          <button onClick={() => navigate(-1)} className="btn btn-ghost">
            ← Back
          </button>
        </div>

        {isBasePack && (
          <div className="alert alert-info mb-6">
            <div>
              <div className="font-semibold">B.A.S.E pack detected</div>
              <div className="text-sm">
                These packs include cover art and stem note data. Studio mixing is available for audio packs.
              </div>
            </div>
            <Link to="../base-packs" className="btn btn-sm btn-outline">
              Back to B.A.S.E Packs
            </Link>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Cover & Info */}
          <div className="lg:col-span-1 space-y-6">
            {/* Cover Image */}
            <div className="card bg-base-200 overflow-hidden shadow-lg">
              <figure className="aspect-square bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
                {getCoverImage() ? (
                  <img
                    src={getCoverImage()!}
                    alt="Pack cover"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center h-full gap-3 text-base-content/50">
                    <svg className="w-16 h-16" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z" />
                    </svg>
                    <span className="text-sm">No cover art</span>
                  </div>
                )}
              </figure>
            </div>

            {/* Pack Info */}
            <div className="card bg-base-200 p-6">
              <h2 className="text-xl font-bold mb-4">📦 Pack Info</h2>
              <div className="space-y-4 text-sm">
                <div>
                  <span className="opacity-70 text-xs uppercase tracking-wide">Prompt/Title</span>
                  <div className="font-semibold line-clamp-3 mt-1">
                    {pack.prompt || pack.job_id || 'Sample Pack'}
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  {pack.parameters?.bpm && (
                    <div className="bg-base-300 rounded p-2">
                      <span className="opacity-70 text-xs">BPM</span>
                      <div className="font-bold text-lg">{pack.parameters.bpm}</div>
                    </div>
                  )}
                  {pack.parameters?.key && (
                    <div className="bg-base-300 rounded p-2">
                      <span className="opacity-70 text-xs">KEY</span>
                      <div className="font-bold text-lg">{pack.parameters.key}</div>
                    </div>
                  )}
                </div>

                <div className="divider my-2"></div>

                <div className="bg-base-300 rounded p-3">
                  <div className="flex items-center justify-between">
                    <span className="opacity-70">Audio Stems Loaded</span>
                    <span className="badge badge-primary badge-lg">{stems.length}</span>
                  </div>
                </div>

                {pack.outputs?.image_url && (
                  <div className="text-xs opacity-60 pt-2">
                    ✓ Cover art generated
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Middle & Right Column - Mixer */}
          <div className="lg:col-span-2 space-y-6">
            {/* Transport Controls */}
            <div className="card bg-base-200 p-6">
              <div className="flex flex-col gap-4">
                {/* Play/Stop Controls */}
                <div className="flex gap-3 items-center">
                  <button
                    onClick={togglePlayback}
                    className={`btn btn-lg gap-2 ${
                      isPlaying ? 'btn-error' : 'btn-success'
                    }`}
                  >
                    {isPlaying ? (
                      <>
                        <svg
                          className="w-6 h-6"
                          fill="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <rect x="6" y="4" width="4" height="16" />
                          <rect x="14" y="4" width="4" height="16" />
                        </svg>
                        Stop
                      </>
                    ) : (
                      <>
                        <svg
                          className="w-6 h-6"
                          fill="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path d="M8 5v14l11-7z" />
                        </svg>
                        Play
                      </>
                    )}
                  </button>

                  <div className="divider divider-horizontal m-0"></div>

                  {/* Record Controls */}
                  <button
                    onClick={isRecording ? stopRecording : startRecording}
                    disabled={isPlaying && !isRecording}
                    className={`btn btn-lg gap-2 ${
                      isRecording ? 'btn-error animate-pulse' : 'btn-warning'
                    }`}
                  >
                    <svg
                      className="w-6 h-6"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <circle cx="12" cy="12" r="8" />
                    </svg>
                    {isRecording ? 'Stop Recording' : 'Record'}
                  </button>

                  {isRecording && (
                    <div className="badge badge-error badge-lg gap-2">
                      ⏱️ {formatTime(recordingTime)}
                    </div>
                  )}
                </div>

                {/* Master Volume */}
                <div className="divider m-0"></div>
                <div>
                  <label className="label">
                    <span className="label-text font-semibold">Master Volume</span>
                    <span className="label-text-alt">{masterVolume.toFixed(1)} dB</span>
                  </label>
                  <input
                    type="range"
                    min="-60"
                    max="6"
                    step="0.1"
                    value={masterVolume}
                    onChange={(e) =>
                      updateMasterVolume(parseFloat(e.target.value))
                    }
                    className="range range-sm"
                  />
                  <div className="flex justify-between text-xs opacity-50">
                    <span>-60dB</span>
                    <span>0dB</span>
                    <span>+6dB</span>
                  </div>
                </div>

                {/* Master Level Meter */}
                <div className="divider m-0"></div>
                <div>
                  <label className="label">
                    <span className="label-text font-semibold">Master Level</span>
                    <span className="label-text-alt">{masterLevel.toFixed(1)} dB</span>
                  </label>
                  <div className="w-full h-3 bg-base-300 rounded overflow-hidden">
                    <div
                      className="h-full transition-all duration-100"
                      style={{
                        width: `${dbToPercent(masterLevel)}%`,
                        backgroundColor: getMeterColor(dbToPercent(masterLevel)),
                        boxShadow: '0 0 8px ' + getMeterColor(dbToPercent(masterLevel)) + '40'
                      }}
                    />
                  </div>
                </div>

                {/* Frequency Spectrum Analyzer */}
                <div className="divider m-0"></div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="label p-0">
                      <span className="label-text font-semibold">Spectrum</span>
                    </label>
                    <button
                      onClick={() => setShowSpectrum(!showSpectrum)}
                      className="btn btn-xs btn-ghost"
                      title="Toggle spectrum view"
                    >
                      {showSpectrum ? '📊' : '📉'}
                    </button>
                  </div>
                  {showSpectrum && masterSpectrum.length > 0 && (
                    <div className="w-full h-16 bg-base-300 rounded flex items-end gap-0.5 p-1 overflow-hidden">
                      {masterSpectrum.map((level, i) => (
                        <div
                          key={i}
                          className="flex-1 rounded-t transition-all duration-100"
                          style={{
                            height: `${level}%`,
                            backgroundColor: getSpectrumColor(
                              (i / masterSpectrum.length) * 20000
                            ),
                            minHeight: '2px'
                          }}
                        />
                      ))}
                    </div>
                  )}
                  {showSpectrum && masterSpectrum.length === 0 && (
                    <div className="w-full h-16 bg-base-300 rounded flex items-center justify-center text-xs opacity-50">
                      Play audio to see spectrum
                    </div>
                  )}
                </div>

                {/* Master Limiter */}
                <div className="divider m-0"></div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="label p-0">
                      <span className="label-text font-semibold">Master Limiter</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={limiterEnabled}
                        onChange={(e) => {
                          setLimiterEnabled(e.target.checked);
                          if (masterCompressorRef.current) {
                            masterCompressorRef.current.ratio.value = e.target.checked ? 10 : 1;
                          }
                        }}
                        className="checkbox checkbox-xs"
                      />
                      <span className="label-text text-xs">{limiterEnabled ? 'On' : 'Off'}</span>
                    </label>
                  </div>
                  {limiterEnabled && (
                    <div className="space-y-1 pl-2">
                      <label className="label p-0">
                        <span className="label-text text-xs">Threshold</span>
                        <span className="label-text-alt text-xs">{limiterThreshold.toFixed(1)} dB</span>
                      </label>
                      <input
                        type="range"
                        min="-30"
                        max="0"
                        step="0.1"
                        value={limiterThreshold}
                        onChange={(e) =>
                          updateLimiterThreshold(parseFloat(e.target.value))
                        }
                        className="range range-xs"
                      />
                      <div className="text-xs opacity-60 pl-1">
                        🛡️ Hard limiting at {limiterThreshold.toFixed(1)}dB
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Stems List */}
            <div className="card bg-base-200 p-6">
              <h2 className="text-xl font-bold mb-4">🎵 Audio Stems ({stems.length})</h2>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {stems.length === 0 ? (
                  <div className="text-center py-8 opacity-50">
                    <p>{isBasePack ? 'This B.A.S.E pack has no audio stems to mix in Studio.' : 'No stems loaded'}</p>
                  </div>
                ) : (
                  stems.map((stem, index) => (
                    <div key={stem.id} className="border border-base-300 rounded-lg p-4 hover:border-base-content/30 transition-colors">
                      {/* Stem Header */}
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <span className="badge badge-sm">{index + 1}</span>
                          <h3 className="font-semibold">{stem.name}</h3>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => toggleMute(stem.id)}
                            className={`btn btn-xs ${
                              stem.isMuted ? 'btn-error' : 'btn-ghost'
                            }`}
                            title="Mute"
                          >
                            {stem.isMuted ? '🔇' : '🔊'}
                          </button>
                          <button
                            onClick={() => toggleSolo(stem.id)}
                            className={`btn btn-xs ${
                              stem.isSolo ? 'btn-info' : 'btn-ghost'
                            }`}
                            title="Solo"
                          >
                            S
                          </button>
                        </div>
                    </div>

                    {/* Volume Control */}
                    <div className="space-y-2 mb-3">
                      <label className="label p-0">
                        <span className="label-text text-xs">Volume</span>
                        <span className="label-text-alt text-xs">
                          {stem.volume.toFixed(1)} dB
                        </span>
                      </label>
                      <input
                        type="range"
                        min="-60"
                        max="6"
                        step="0.1"
                        value={stem.volume}
                        onChange={(e) =>
                          updateStemVolume(
                            stem.id,
                            parseFloat(e.target.value)
                          )
                        }
                        className="range range-xs"
                      />
                    </div>

                    {/* Pan Control */}
                    <div className="space-y-2 mb-3">
                      <label className="label p-0">
                        <span className="label-text text-xs">Pan</span>
                        <span className="label-text-alt text-xs">
                          {stem.pan > 0
                            ? `R ${(stem.pan * 100).toFixed(0)}%`
                            : stem.pan < 0
                            ? `L ${(Math.abs(stem.pan) * 100).toFixed(0)}%`
                            : 'C'}
                        </span>
                      </label>
                      <input
                        type="range"
                        min="-1"
                        max="1"
                        step="0.01"
                        value={stem.pan}
                        onChange={(e) =>
                          updateStemPan(
                            stem.id,
                            parseFloat(e.target.value)
                          )
                        }
                        className="range range-xs"
                      />
                    </div>

                    {/* Level Meter */}
                    <div className="space-y-2 mb-3">
                      <label className="label p-0">
                        <span className="label-text text-xs">Level</span>
                        <span className="label-text-alt text-xs">
                          {stemLevels[stem.id]?.toFixed(1) || '-60'} dB
                        </span>
                      </label>
                      <div className="w-full h-2 bg-base-300 rounded overflow-hidden">
                        <div
                          className="h-full transition-all duration-100"
                          style={{
                            width: `${dbToPercent(stemLevels[stem.id] || -60)}%`,
                            backgroundColor: getMeterColor(
                              dbToPercent(stemLevels[stem.id] || -60)
                            ),
                            boxShadow: '0 0 8px ' + getMeterColor(
                              dbToPercent(stemLevels[stem.id] || -60)
                            ) + '40'
                          }}
                        />
                      </div>
                    </div>

                    {/* Effects & ADSR Controls */}
                    <details className="collapse border border-base-300">
                      <summary className="collapse-title p-2 text-sm font-semibold cursor-pointer hover:bg-base-300">
                        ⚙️ Effects & ADSR
                      </summary>
                      <div className="collapse-content p-3 text-xs space-y-4">
                        {/* ADSR Section */}
                        <div className="space-y-3 border-b border-base-300 pb-3">
                          <h4 className="font-semibold text-base-content">ADSR Envelope</h4>

                          {/* Attack */}
                          <div className="space-y-1">
                            <label className="label p-0">
                              <span className="label-text text-xs">Attack</span>
                              <span className="label-text-alt text-xs">
                                {stem.adsr.attack.toFixed(3)}s
                              </span>
                            </label>
                            <input
                              type="range"
                              min="0"
                              max="2"
                              step="0.001"
                              value={stem.adsr.attack}
                              onChange={(e) =>
                                updateStemADSR(stem.id, {
                                  attack: parseFloat(e.target.value)
                                })
                              }
                              className="range range-xs"
                            />
                          </div>

                          {/* Decay */}
                          <div className="space-y-1">
                            <label className="label p-0">
                              <span className="label-text text-xs">Decay</span>
                              <span className="label-text-alt text-xs">
                                {stem.adsr.decay.toFixed(3)}s
                              </span>
                            </label>
                            <input
                              type="range"
                              min="0"
                              max="2"
                              step="0.001"
                              value={stem.adsr.decay}
                              onChange={(e) =>
                                updateStemADSR(stem.id, {
                                  decay: parseFloat(e.target.value)
                                })
                              }
                              className="range range-xs"
                            />
                          </div>

                          {/* Sustain */}
                          <div className="space-y-1">
                            <label className="label p-0">
                              <span className="label-text text-xs">Sustain</span>
                              <span className="label-text-alt text-xs">
                                {(stem.adsr.sustain * 100).toFixed(0)}%
                              </span>
                            </label>
                            <input
                              type="range"
                              min="0"
                              max="1"
                              step="0.01"
                              value={stem.adsr.sustain}
                              onChange={(e) =>
                                updateStemADSR(stem.id, {
                                  sustain: parseFloat(e.target.value)
                                })
                              }
                              className="range range-xs"
                            />
                          </div>

                          {/* Release */}
                          <div className="space-y-1">
                            <label className="label p-0">
                              <span className="label-text text-xs">Release</span>
                              <span className="label-text-alt text-xs">
                                {stem.adsr.release.toFixed(3)}s
                              </span>
                            </label>
                            <input
                              type="range"
                              min="0"
                              max="3"
                              step="0.001"
                              value={stem.adsr.release}
                              onChange={(e) =>
                                updateStemADSR(stem.id, {
                                  release: parseFloat(e.target.value)
                                })
                              }
                              className="range range-xs"
                            />
                          </div>
                        </div>

                        {/* Effects Section */}
                        <div className="space-y-3">
                          <h4 className="font-semibold text-base-content">Effects</h4>

                          {/* Reverb */}
                          <div className="border border-base-300 rounded p-2 space-y-2">
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={stem.effects.reverb.enabled}
                                onChange={(e) =>
                                  updateStemEffect(stem.id, 'reverb', {
                                    enabled: e.target.checked
                                  })
                                }
                                className="checkbox checkbox-xs"
                              />
                              <span className="font-medium">Reverb</span>
                            </label>
                            {stem.effects.reverb.enabled && (
                              <>
                                <div className="space-y-1 ml-6">
                                  <label className="label p-0">
                                    <span className="label-text text-xs">Wet</span>
                                    <span className="label-text-alt text-xs">
                                      {(stem.effects.reverb.wet * 100).toFixed(0)}%
                                    </span>
                                  </label>
                                  <input
                                    type="range"
                                    min="0"
                                    max="1"
                                    step="0.01"
                                    value={stem.effects.reverb.wet}
                                    onChange={(e) =>
                                      updateStemEffect(stem.id, 'reverb', {
                                        wet: parseFloat(e.target.value)
                                      })
                                    }
                                    className="range range-xs"
                                  />
                                </div>
                                <div className="space-y-1 ml-6">
                                  <label className="label p-0">
                                    <span className="label-text text-xs">Decay</span>
                                    <span className="label-text-alt text-xs">
                                      {stem.effects.reverb.decay.toFixed(2)}s
                                    </span>
                                  </label>
                                  <input
                                    type="range"
                                    min="0.1"
                                    max="10"
                                    step="0.1"
                                    value={stem.effects.reverb.decay}
                                    onChange={(e) =>
                                      updateStemEffect(stem.id, 'reverb', {
                                        decay: parseFloat(e.target.value)
                                      })
                                    }
                                    className="range range-xs"
                                  />
                                </div>
                              </>
                            )}
                          </div>

                          {/* Delay */}
                          <div className="border border-base-300 rounded p-2 space-y-2">
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={stem.effects.delay.enabled}
                                onChange={(e) =>
                                  updateStemEffect(stem.id, 'delay', {
                                    enabled: e.target.checked
                                  })
                                }
                                className="checkbox checkbox-xs"
                              />
                              <span className="font-medium">Delay</span>
                            </label>
                            {stem.effects.delay.enabled && (
                              <>
                                <div className="space-y-1 ml-6">
                                  <label className="label p-0">
                                    <span className="label-text text-xs">Wet</span>
                                    <span className="label-text-alt text-xs">
                                      {(stem.effects.delay.wet * 100).toFixed(0)}%
                                    </span>
                                  </label>
                                  <input
                                    type="range"
                                    min="0"
                                    max="1"
                                    step="0.01"
                                    value={stem.effects.delay.wet}
                                    onChange={(e) =>
                                      updateStemEffect(stem.id, 'delay', {
                                        wet: parseFloat(e.target.value)
                                      })
                                    }
                                    className="range range-xs"
                                  />
                                </div>
                                <div className="space-y-1 ml-6">
                                  <label className="label p-0">
                                    <span className="label-text text-xs">Time</span>
                                    <span className="label-text-alt text-xs">
                                      {stem.effects.delay.time.toFixed(2)}s
                                    </span>
                                  </label>
                                  <input
                                    type="range"
                                    min="0.1"
                                    max="2"
                                    step="0.05"
                                    value={stem.effects.delay.time}
                                    onChange={(e) =>
                                      updateStemEffect(stem.id, 'delay', {
                                        time: parseFloat(e.target.value)
                                      })
                                    }
                                    className="range range-xs"
                                  />
                                </div>
                                <div className="space-y-1 ml-6">
                                  <label className="label p-0">
                                    <span className="label-text text-xs">Feedback</span>
                                    <span className="label-text-alt text-xs">
                                      {(stem.effects.delay.feedback * 100).toFixed(0)}%
                                    </span>
                                  </label>
                                  <input
                                    type="range"
                                    min="0"
                                    max="0.8"
                                    step="0.01"
                                    value={stem.effects.delay.feedback}
                                    onChange={(e) =>
                                      updateStemEffect(stem.id, 'delay', {
                                        feedback: parseFloat(e.target.value)
                                      })
                                    }
                                    className="range range-xs"
                                  />
                                </div>
                              </>
                            )}
                          </div>

                          {/* Chorus */}
                          <div className="border border-base-300 rounded p-2 space-y-2">
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={stem.effects.chorus.enabled}
                                onChange={(e) =>
                                  updateStemEffect(stem.id, 'chorus', {
                                    enabled: e.target.checked
                                  })
                                }
                                className="checkbox checkbox-xs"
                              />
                              <span className="font-medium">Chorus</span>
                            </label>
                            {stem.effects.chorus.enabled && (
                              <>
                                <div className="space-y-1 ml-6">
                                  <label className="label p-0">
                                    <span className="label-text text-xs">Wet</span>
                                    <span className="label-text-alt text-xs">
                                      {(stem.effects.chorus.wet * 100).toFixed(0)}%
                                    </span>
                                  </label>
                                  <input
                                    type="range"
                                    min="0"
                                    max="1"
                                    step="0.01"
                                    value={stem.effects.chorus.wet}
                                    onChange={(e) =>
                                      updateStemEffect(stem.id, 'chorus', {
                                        wet: parseFloat(e.target.value)
                                      })
                                    }
                                    className="range range-xs"
                                  />
                                </div>
                                <div className="space-y-1 ml-6">
                                  <label className="label p-0">
                                    <span className="label-text text-xs">Rate</span>
                                    <span className="label-text-alt text-xs">
                                      {stem.effects.chorus.rate.toFixed(2)} Hz
                                    </span>
                                  </label>
                                  <input
                                    type="range"
                                    min="0.5"
                                    max="5"
                                    step="0.1"
                                    value={stem.effects.chorus.rate}
                                    onChange={(e) =>
                                      updateStemEffect(stem.id, 'chorus', {
                                        rate: parseFloat(e.target.value)
                                      })
                                    }
                                    className="range range-xs"
                                  />
                                </div>
                                <div className="space-y-1 ml-6">
                                  <label className="label p-0">
                                    <span className="label-text text-xs">Depth</span>
                                    <span className="label-text-alt text-xs">
                                      {(stem.effects.chorus.depth * 100).toFixed(0)}%
                                    </span>
                                  </label>
                                  <input
                                    type="range"
                                    min="0"
                                    max="1"
                                    step="0.01"
                                    value={stem.effects.chorus.depth}
                                    onChange={(e) =>
                                      updateStemEffect(stem.id, 'chorus', {
                                        depth: parseFloat(e.target.value)
                                      })
                                    }
                                    className="range range-xs"
                                  />
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </details>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer Note */}
        <div className="mt-8 text-center text-sm text-base-content/60">
          <p>💾 Your recording will be saved to our servers and available for download</p>
        </div>
      </div>
    </div>
  );
};

export default InspiraStudio;
