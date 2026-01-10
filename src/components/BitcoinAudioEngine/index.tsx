import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as Tone from 'tone';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface SynthConfig {
  oscillator: {
    type: 'sine' | 'square' | 'sawtooth' | 'triangle' | 'fmsine' | 'fmsquare' | 'fmsawtooth' | 'fmtriangle';
  };
  envelope: {
    attack: number;
    decay: number;
    sustain: number;
    release: number;
  };
  volume: number;
}

export interface EffectsConfig {
  reverb: number;
  delay: number;
  chorus: number;
  phaser: number;
  distortion: number;
}

export interface BitcoinAudioEngineProps {
  showOscilloscope?: boolean;
  showFFT?: boolean;
  showSynth?: boolean;
  visualizerWidth?: number;
  visualizerHeight?: number;
  theme?: 'bitcoin' | 'dark' | 'light';
}

export interface OscilloscopeProps {
  width?: number;
  height?: number;
  color?: string;
  backgroundColor?: string;
  lineWidth?: number;
  showGrid?: boolean;
}

export interface FFTVisualizerProps {
  width?: number;
  height?: number;
  barColor?: string;
  backgroundColor?: string;
  barCount?: number;
  gradient?: boolean;
  gradientColors?: string[];
}

export interface SynthControlsProps {
  showKeyboard?: boolean;
  showEffects?: boolean;
  showEnvelope?: boolean;
}

// ============================================================================
// HOOKS
// ============================================================================

/**
 * Hook for managing audio visualizers (oscilloscope and FFT)
 */
export function useAudioVisualizer() {
  const analyzerRef = useRef<Tone.Analyser | null>(null);
  const fftAnalyzerRef = useRef<Tone.FFT | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const [waveformData, setWaveformData] = useState<Float32Array>(new Float32Array(256));
  const [fftData, setFftData] = useState<Float32Array>(new Float32Array(128));
  const [isActive, setIsActive] = useState(false);

  const initAnalyzers = useCallback(() => {
    if (!analyzerRef.current) {
      analyzerRef.current = new Tone.Analyser('waveform', 256);
      fftAnalyzerRef.current = new Tone.FFT(128);
      Tone.getDestination().connect(analyzerRef.current);
      Tone.getDestination().connect(fftAnalyzerRef.current);
    }
    setIsActive(true);
  }, []);

  const updateVisualization = useCallback(() => {
    if (analyzerRef.current && fftAnalyzerRef.current && isActive) {
      setWaveformData(analyzerRef.current.getValue() as Float32Array);
      setFftData(fftAnalyzerRef.current.getValue() as Float32Array);
    }
    animationFrameRef.current = requestAnimationFrame(updateVisualization);
  }, [isActive]);

  useEffect(() => {
    if (isActive) {
      updateVisualization();
    }
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isActive, updateVisualization]);

  const cleanup = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    if (analyzerRef.current) {
      analyzerRef.current.dispose();
      analyzerRef.current = null;
    }
    if (fftAnalyzerRef.current) {
      fftAnalyzerRef.current.dispose();
      fftAnalyzerRef.current = null;
    }
    setIsActive(false);
  }, []);

  return {
    waveformData,
    fftData,
    initAnalyzers,
    cleanup,
    isActive
  };
}

/**
 * Hook for managing synthesizer state and audio
 */
export function useSynthesizer() {
  const synthRef = useRef<Tone.PolySynth | null>(null);
  const effectsRef = useRef<{
    reverb: Tone.Reverb;
    delay: Tone.FeedbackDelay;
    chorus: Tone.Chorus;
    phaser: Tone.Phaser;
    distortion: Tone.Distortion;
  } | null>(null);
  
  const [synthConfig, setSynthConfig] = useState<SynthConfig>({
    oscillator: { type: 'sine' },
    envelope: { attack: 0.1, decay: 0.2, sustain: 0.5, release: 0.5 },
    volume: -6
  });

  const [effectsConfig, setEffectsConfig] = useState<EffectsConfig>({
    reverb: 0,
    delay: 0,
    chorus: 0,
    phaser: 0,
    distortion: 0
  });

  const [isInitialized, setIsInitialized] = useState(false);
  const [activeNotes, setActiveNotes] = useState<Set<string>>(new Set());

  const initSynth = useCallback(async () => {
    if (isInitialized) return;

    await Tone.start();

    // Create effects chain
    const reverb = new Tone.Reverb({ decay: 1.5, wet: 0 });
    const delay = new Tone.FeedbackDelay({ delayTime: '8n', feedback: 0.3, wet: 0 });
    const chorus = new Tone.Chorus({ frequency: 1.5, delayTime: 3.5, depth: 0 });
    const phaser = new Tone.Phaser({ frequency: 0.5, octaves: 3, baseFrequency: 350 });
    const distortion = new Tone.Distortion({ distortion: 0, wet: 0 });

    // Create synth
    const synth = new Tone.PolySynth(Tone.Synth, {
      oscillator: synthConfig.oscillator,
      envelope: synthConfig.envelope,
      volume: synthConfig.volume
    });

    // Connect chain: synth -> distortion -> chorus -> phaser -> delay -> reverb -> destination
    synth.chain(distortion, chorus, phaser, delay, reverb, Tone.getDestination());

    synthRef.current = synth;
    effectsRef.current = { reverb, delay, chorus, phaser, distortion };
    
    setIsInitialized(true);
  }, [isInitialized, synthConfig]);

  const playNote = useCallback((note: string, duration = '8n') => {
    if (synthRef.current && isInitialized) {
      synthRef.current.triggerAttackRelease(note, duration);
      setActiveNotes(prev => new Set(prev).add(note));
      setTimeout(() => {
        setActiveNotes(prev => {
          const next = new Set(prev);
          next.delete(note);
          return next;
        });
      }, Tone.Time(duration).toMilliseconds());
    }
  }, [isInitialized]);

  const noteOn = useCallback((note: string) => {
    if (synthRef.current && isInitialized) {
      synthRef.current.triggerAttack(note);
      setActiveNotes(prev => new Set(prev).add(note));
    }
  }, [isInitialized]);

  const noteOff = useCallback((note: string) => {
    if (synthRef.current && isInitialized) {
      synthRef.current.triggerRelease(note);
      setActiveNotes(prev => {
        const next = new Set(prev);
        next.delete(note);
        return next;
      });
    }
  }, [isInitialized]);

  const updateOscillator = useCallback((type: SynthConfig['oscillator']['type']) => {
    setSynthConfig(prev => ({
      ...prev,
      oscillator: { type }
    }));
    if (synthRef.current) {
      synthRef.current.set({ oscillator: { type } });
    }
  }, []);

  const updateEnvelope = useCallback((envelope: Partial<SynthConfig['envelope']>) => {
    setSynthConfig(prev => ({
      ...prev,
      envelope: { ...prev.envelope, ...envelope }
    }));
    if (synthRef.current) {
      synthRef.current.set({ envelope });
    }
  }, []);

  const updateVolume = useCallback((volume: number) => {
    setSynthConfig(prev => ({ ...prev, volume }));
    if (synthRef.current) {
      synthRef.current.volume.value = volume;
    }
  }, []);

  const updateEffect = useCallback((effect: keyof EffectsConfig, value: number) => {
    setEffectsConfig(prev => ({ ...prev, [effect]: value }));
    if (effectsRef.current) {
      switch (effect) {
        case 'reverb':
          effectsRef.current.reverb.wet.value = value;
          break;
        case 'delay':
          effectsRef.current.delay.wet.value = value;
          break;
        case 'chorus':
          effectsRef.current.chorus.wet.value = value;
          break;
        case 'phaser':
          effectsRef.current.phaser.wet.value = value;
          break;
        case 'distortion':
          effectsRef.current.distortion.wet.value = value;
          break;
      }
    }
  }, []);

  const cleanup = useCallback(() => {
    if (synthRef.current) {
      synthRef.current.dispose();
      synthRef.current = null;
    }
    if (effectsRef.current) {
      Object.values(effectsRef.current).forEach(effect => effect.dispose());
      effectsRef.current = null;
    }
    setIsInitialized(false);
    setActiveNotes(new Set());
  }, []);

  return {
    synthConfig,
    effectsConfig,
    isInitialized,
    activeNotes,
    initSynth,
    playNote,
    noteOn,
    noteOff,
    updateOscillator,
    updateEnvelope,
    updateVolume,
    updateEffect,
    cleanup
  };
}

// ============================================================================
// COMPONENTS
// ============================================================================

/**
 * Oscilloscope component - displays waveform visualization
 */
export const Oscilloscope: React.FC<OscilloscopeProps> = ({
  width = 300,
  height = 100,
  color = '#f7931a',
  backgroundColor = '#1a1a2e',
  lineWidth = 2,
  showGrid = true
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { waveformData, initAnalyzers, isActive } = useAudioVisualizer();

  useEffect(() => {
    initAnalyzers();
  }, [initAnalyzers]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, width, height);

    // Draw grid
    if (showGrid) {
      ctx.strokeStyle = `${color}22`;
      ctx.lineWidth = 0.5;
      
      // Vertical lines
      for (let i = 0; i < width; i += 20) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, height);
        ctx.stroke();
      }
      
      // Horizontal lines
      for (let i = 0; i < height; i += 20) {
        ctx.beginPath();
        ctx.moveTo(0, i);
        ctx.lineTo(width, i);
        ctx.stroke();
      }
      
      // Center line
      ctx.strokeStyle = `${color}44`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, height / 2);
      ctx.lineTo(width, height / 2);
      ctx.stroke();
    }

    // Draw waveform
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.beginPath();

    const sliceWidth = width / waveformData.length;
    let x = 0;

    for (let i = 0; i < waveformData.length; i++) {
      const v = (waveformData[i] + 1) / 2;
      const y = v * height;

      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }

      x += sliceWidth;
    }

    ctx.stroke();
  }, [waveformData, width, height, color, backgroundColor, lineWidth, showGrid]);

  return (
    <div className="inline-block rounded-lg overflow-hidden shadow-lg">
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className="block"
        style={{ backgroundColor }}
      />
      {!isActive && (
        <div 
          className="absolute inset-0 flex items-center justify-center text-sm opacity-50"
          style={{ color }}
        >
          Click to start audio
        </div>
      )}
    </div>
  );
};

/**
 * FFT Visualizer component - displays frequency spectrum
 */
export const FFTVisualizer: React.FC<FFTVisualizerProps> = ({
  width = 300,
  height = 100,
  barColor = '#f7931a',
  backgroundColor = '#1a1a2e',
  barCount = 32,
  gradient = true,
  gradientColors = ['#f7931a', '#ff6b00', '#ff3d00']
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { fftData, initAnalyzers } = useAudioVisualizer();

  useEffect(() => {
    initAnalyzers();
  }, [initAnalyzers]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, width, height);

    // Calculate bar dimensions
    const barWidth = width / barCount - 2;
    const step = Math.floor(fftData.length / barCount);

    for (let i = 0; i < barCount; i++) {
      // Get average of frequency range
      let sum = 0;
      for (let j = 0; j < step; j++) {
        const idx = i * step + j;
        if (idx < fftData.length) {
          // FFT data is in dB, normalize to 0-1
          sum += (fftData[idx] + 100) / 100;
        }
      }
      const avg = sum / step;
      const barHeight = Math.max(2, avg * height);

      const x = i * (barWidth + 2) + 1;
      const y = height - barHeight;

      if (gradient) {
        const grd = ctx.createLinearGradient(x, height, x, y);
        gradientColors.forEach((color, idx) => {
          grd.addColorStop(idx / (gradientColors.length - 1), color);
        });
        ctx.fillStyle = grd;
      } else {
        ctx.fillStyle = barColor;
      }

      ctx.fillRect(x, y, barWidth, barHeight);
    }
  }, [fftData, width, height, barColor, backgroundColor, barCount, gradient, gradientColors]);

  return (
    <div className="inline-block rounded-lg overflow-hidden shadow-lg">
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className="block"
        style={{ backgroundColor }}
      />
    </div>
  );
};

/**
 * Synthesizer controls with keyboard, ADSR, and effects
 */
export const SynthControls: React.FC<SynthControlsProps> = ({
  showKeyboard = true,
  showEffects = true,
  showEnvelope = true
}) => {
  const {
    synthConfig,
    effectsConfig,
    isInitialized,
    activeNotes,
    initSynth,
    noteOn,
    noteOff,
    updateOscillator,
    updateEnvelope,
    updateVolume,
    updateEffect
  } = useSynthesizer();

  const oscillatorTypes: SynthConfig['oscillator']['type'][] = [
    'sine', 'square', 'sawtooth', 'triangle', 'fmsine', 'fmsquare'
  ];

  const keyboardNotes = [
    { note: 'C4', isBlack: false },
    { note: 'C#4', isBlack: true },
    { note: 'D4', isBlack: false },
    { note: 'D#4', isBlack: true },
    { note: 'E4', isBlack: false },
    { note: 'F4', isBlack: false },
    { note: 'F#4', isBlack: true },
    { note: 'G4', isBlack: false },
    { note: 'G#4', isBlack: true },
    { note: 'A4', isBlack: false },
    { note: 'A#4', isBlack: true },
    { note: 'B4', isBlack: false },
    { note: 'C5', isBlack: false },
  ];

  const handleKeyDown = (note: string) => {
    if (!isInitialized) {
      initSynth().then(() => noteOn(note));
    } else {
      noteOn(note);
    }
  };

  const handleKeyUp = (note: string) => {
    noteOff(note);
  };

  return (
    <div className="bg-base-200 rounded-lg p-4 space-y-4">
      {/* Initialize button */}
      {!isInitialized && (
        <button
          onClick={initSynth}
          className="btn btn-primary w-full"
        >
          🔊 Initialize Audio Engine
        </button>
      )}

      {/* Oscillator Selection */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Oscillator Type</label>
        <div className="flex flex-wrap gap-2">
          {oscillatorTypes.map(type => (
            <button
              key={type}
              onClick={() => updateOscillator(type)}
              className={`btn btn-sm ${
                synthConfig.oscillator.type === type ? 'btn-primary' : 'btn-ghost'
              }`}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      {/* Volume */}
      <div className="space-y-2">
        <label className="text-sm font-medium">
          Volume: {synthConfig.volume} dB
        </label>
        <input
          type="range"
          min="-40"
          max="0"
          value={synthConfig.volume}
          onChange={(e) => updateVolume(parseFloat(e.target.value))}
          className="range range-primary range-sm"
        />
      </div>

      {/* ADSR Envelope */}
      {showEnvelope && (
        <div className="space-y-2">
          <label className="text-sm font-medium">ADSR Envelope</label>
          <div className="grid grid-cols-4 gap-2">
            {(['attack', 'decay', 'sustain', 'release'] as const).map(param => (
              <div key={param} className="text-center">
                <div className="text-xs opacity-70 capitalize">{param}</div>
                <input
                  type="range"
                  min="0"
                  max="2"
                  step="0.01"
                  value={synthConfig.envelope[param]}
                  onChange={(e) => updateEnvelope({ [param]: parseFloat(e.target.value) })}
                  className="range range-xs range-primary w-full"
                  style={{ writingMode: 'vertical-lr', height: '80px' }}
                />
                <div className="text-xs">{synthConfig.envelope[param].toFixed(2)}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Effects */}
      {showEffects && (
        <div className="space-y-2">
          <label className="text-sm font-medium">Effects</label>
          <div className="grid grid-cols-3 md:grid-cols-5 gap-2">
            {(Object.keys(effectsConfig) as (keyof EffectsConfig)[]).map(effect => (
              <div key={effect} className="text-center">
                <div className="text-xs opacity-70 capitalize">{effect}</div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={effectsConfig[effect]}
                  onChange={(e) => updateEffect(effect, parseFloat(e.target.value))}
                  className="range range-xs range-secondary w-full"
                />
                <div className="text-xs">{(effectsConfig[effect] * 100).toFixed(0)}%</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Keyboard */}
      {showKeyboard && (
        <div className="space-y-2">
          <label className="text-sm font-medium">Virtual Keyboard</label>
          <div className="flex relative h-32 bg-base-300 rounded-lg overflow-hidden">
            {keyboardNotes.filter(k => !k.isBlack).map((key) => (
              <button
                key={key.note}
                onMouseDown={() => handleKeyDown(key.note)}
                onMouseUp={() => handleKeyUp(key.note)}
                onMouseLeave={() => handleKeyUp(key.note)}
                className={`flex-1 border-r border-base-content/20 transition-colors ${
                  activeNotes.has(key.note) 
                    ? 'bg-primary' 
                    : 'bg-white hover:bg-gray-100'
                }`}
                style={{ minWidth: '40px' }}
              >
                <span className="text-xs text-gray-600 absolute bottom-2">{key.note}</span>
              </button>
            ))}
            {/* Black keys overlay */}
            <div className="absolute top-0 left-0 right-0 flex pointer-events-none">
              {keyboardNotes.filter(k => !k.isBlack).map((key, idx) => {
                const blackKey = keyboardNotes.find(k => k.isBlack && k.note === key.note.replace(/\d/, '#$&'));
                if (!blackKey && !keyboardNotes.some(k => k.isBlack && 
                    k.note.charAt(0) === key.note.charAt(0))) return <div key={idx} className="flex-1" />;
                
                const hasBlack = keyboardNotes.some(k => k.isBlack && 
                  k.note.charAt(0) === key.note.charAt(0));
                  
                if (!hasBlack) return <div key={idx} className="flex-1" />;
                
                const bk = keyboardNotes.find(k => k.isBlack && 
                  k.note.charAt(0) === key.note.charAt(0));
                  
                return (
                  <div key={idx} className="flex-1 relative">
                    {bk && (
                      <button
                        onMouseDown={() => handleKeyDown(bk.note)}
                        onMouseUp={() => handleKeyUp(bk.note)}
                        onMouseLeave={() => handleKeyUp(bk.note)}
                        className={`absolute right-0 translate-x-1/2 w-6 h-20 rounded-b-md pointer-events-auto z-10 ${
                          activeNotes.has(bk.note)
                            ? 'bg-primary'
                            : 'bg-gray-800 hover:bg-gray-700'
                        }`}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

/**
 * BitcoinAudioEngine - Full audio engine with visualizers and synth
 */
const BitcoinAudioEngine: React.FC<BitcoinAudioEngineProps> = ({
  showOscilloscope = true,
  showFFT = true,
  showSynth = true,
  visualizerWidth = 350,
  visualizerHeight = 100,
  theme = 'bitcoin'
}) => {
  const themeColors = {
    bitcoin: { primary: '#f7931a', background: '#1a1a2e' },
    dark: { primary: '#6366f1', background: '#0f0f23' },
    light: { primary: '#3b82f6', background: '#f8fafc' }
  };

  const colors = themeColors[theme];

  return (
    <div className="space-y-6">
      {/* Visualizers */}
      {(showOscilloscope || showFFT) && (
        <div className="flex flex-wrap gap-4 justify-center">
          {showOscilloscope && (
            <div>
              <div className="text-sm font-medium mb-2 opacity-70">Oscilloscope</div>
              <Oscilloscope
                width={visualizerWidth}
                height={visualizerHeight}
                color={colors.primary}
                backgroundColor={colors.background}
                showGrid
              />
            </div>
          )}
          {showFFT && (
            <div>
              <div className="text-sm font-medium mb-2 opacity-70">Frequency Spectrum</div>
              <FFTVisualizer
                width={visualizerWidth}
                height={visualizerHeight}
                barColor={colors.primary}
                backgroundColor={colors.background}
                gradient
                gradientColors={[colors.primary, '#ff6b00', '#ff3d00']}
              />
            </div>
          )}
        </div>
      )}

      {/* Synth Controls */}
      {showSynth && (
        <SynthControls
          showKeyboard
          showEffects
          showEnvelope
        />
      )}
    </div>
  );
};

export default BitcoinAudioEngine;
