import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as Tone from 'tone';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface BlockData {
  height: number;
  hash: string;
  merkleRoot: string;
  timestamp: number;
  nonce: number;
  difficulty: number;
  txCount: number;
  size: number;
  weight: number;
  previousblockhash?: string;
}

export interface BlockchainAudioEngineProps {
  showNavigator?: boolean;
  showColorPads?: boolean;
  showVisualizer?: boolean;
  showControls?: boolean;
  initialBlockHeight?: number;
}

export interface BlockNavigatorProps {
  currentHeight: number;
  onHeightChange: (height: number) => void;
  isLoading: boolean;
  latestBlockHeight?: number;
}

export interface ColorPadsProps {
  colors: string[];
  onColorClick: (index: number, color: string) => void;
  activeIndex: number | null;
}

export interface BlockVisualizerProps {
  colors: string[];
  audioLevel: number;
  isPlaying: boolean;
}

// ============================================================================
// HOOKS
// ============================================================================

/**
 * Hook for fetching blockchain data from Blockstream API
 */
export function useBlockchainData() {
  const [blockData, setBlockData] = useState<BlockData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [latestHeight, setLatestHeight] = useState<number | null>(null);

  const fetchBlock = useCallback(async (height: number) => {
    setIsLoading(true);
    setError(null);

    try {
      // Fetch block hash by height
      const hashResponse = await fetch(
        `https://blockstream.info/api/block-height/${height}`
      );
      
      if (!hashResponse.ok) {
        throw new Error(`Block not found at height ${height}`);
      }
      
      const blockHash = await hashResponse.text();

      // Fetch full block data
      const blockResponse = await fetch(
        `https://blockstream.info/api/block/${blockHash}`
      );
      
      if (!blockResponse.ok) {
        throw new Error('Failed to fetch block data');
      }
      
      const block = await blockResponse.json();

      setBlockData({
        height: block.height,
        hash: block.id,
        merkleRoot: block.merkle_root,
        timestamp: block.timestamp,
        nonce: block.nonce,
        difficulty: block.difficulty,
        txCount: block.tx_count,
        size: block.size,
        weight: block.weight,
        previousblockhash: block.previousblockhash
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setBlockData(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchLatestHeight = useCallback(async () => {
    try {
      const response = await fetch('https://blockstream.info/api/blocks/tip/height');
      if (response.ok) {
        const height = await response.text();
        setLatestHeight(parseInt(height, 10));
      }
    } catch {
      console.error('Failed to fetch latest block height');
    }
  }, []);

  // Get colors from hash (each pair of hex chars = 1 color component)
  const getColorsFromHash = useCallback((hash: string): string[] => {
    const colors: string[] = [];
    // Hash is 64 chars, we can get 32 colors (2 chars each for hue variation)
    for (let i = 0; i < 64; i += 2) {
      const hexPair = hash.substring(i, i + 2);
      const hue = (parseInt(hexPair, 16) / 255) * 360;
      colors.push(`hsl(${hue}, 70%, 50%)`);
    }
    return colors;
  }, []);

  // Get 64 colors from merkle root (one per character)
  const getPadColors = useCallback((merkleRoot: string): string[] => {
    return merkleRoot.split('').map((char) => {
      const value = parseInt(char, 16);
      const hue = (value / 15) * 360;
      return `hsl(${hue}, 80%, 50%)`;
    });
  }, []);

  return {
    blockData,
    isLoading,
    error,
    latestHeight,
    fetchBlock,
    fetchLatestHeight,
    getColorsFromHash,
    getPadColors
  };
}

/**
 * Hook for blockchain-based audio synthesis
 */
export function useBlockchainSynth() {
  const synthRef = useRef<Tone.PolySynth | null>(null);
  const effectsRef = useRef<{
    reverb: Tone.Reverb;
    delay: Tone.FeedbackDelay;
    chorus: Tone.Chorus;
    phaser: Tone.Phaser;
    tremolo: Tone.Tremolo;
    vibrato: Tone.Vibrato;
  } | null>(null);
  const sequenceRef = useRef<Tone.Sequence | null>(null);
  const analyzerRef = useRef<Tone.Analyser | null>(null);

  const [isInitialized, setIsInitialized] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [bpm, setBpm] = useState(120);
  const [audioLevel, setAudioLevel] = useState(0);
  const [currentNoteIndex, setCurrentNoteIndex] = useState<number | null>(null);

  // Hex to note mapping (matches original Bitcoin Audio Engine)
  const hexToNote: Record<string, string> = {
    '0': 'C2', '1': 'D2', '2': 'E2', '3': 'F2',
    '4': 'G2', '5': 'A2', '6': 'B2', '7': 'C3',
    '8': 'D3', '9': 'E3', 'a': 'F3', 'b': 'G3',
    'c': 'A3', 'd': 'B3', 'e': 'C4', 'f': 'D4'
  };

  const initSynth = useCallback(async () => {
    if (isInitialized) return;

    await Tone.start();

    // Create effects
    const reverb = new Tone.Reverb({ decay: 2, wet: 0.3 });
    const delay = new Tone.FeedbackDelay({ delayTime: '8n', feedback: 0.2, wet: 0 });
    const chorus = new Tone.Chorus({ frequency: 1.5, delayTime: 3.5, depth: 0, wet: 0 });
    const phaser = new Tone.Phaser({ frequency: 0.5, octaves: 3, baseFrequency: 350, wet: 0 });
    const tremolo = new Tone.Tremolo({ frequency: 4, depth: 0 }).start();
    const vibrato = new Tone.Vibrato({ frequency: 5, depth: 0 });

    // Create synth
    const synth = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'triangle' },
      envelope: { attack: 0.02, decay: 0.3, sustain: 0.4, release: 0.8 },
      volume: -8
    });

    // Create analyzer for visualization
    const analyzer = new Tone.Analyser('waveform', 128);

    // Chain effects
    synth.chain(vibrato, tremolo, chorus, phaser, delay, reverb, analyzer, Tone.getDestination());

    synthRef.current = synth;
    effectsRef.current = { reverb, delay, chorus, phaser, tremolo, vibrato };
    analyzerRef.current = analyzer;

    // Audio level animation
    const updateLevel = () => {
      if (analyzerRef.current) {
        const values = analyzerRef.current.getValue() as Float32Array;
        const avg = values.reduce((sum, v) => sum + Math.abs(v), 0) / values.length;
        setAudioLevel(avg);
      }
      requestAnimationFrame(updateLevel);
    };
    updateLevel();

    setIsInitialized(true);
  }, [isInitialized]);

  const playNote = useCallback((hexChar: string) => {
    if (!synthRef.current || !isInitialized) return;
    
    const note = hexToNote[hexChar.toLowerCase()];
    if (note) {
      synthRef.current.triggerAttackRelease(note, '8n');
    }
  }, [isInitialized, hexToNote]);

  const playNoteByIndex = useCallback((index: number, hexString: string) => {
    if (index < hexString.length) {
      playNote(hexString[index]);
    }
  }, [playNote]);

  const playSequence = useCallback((hexString: string) => {
    if (!synthRef.current || !isInitialized) return;

    // Stop existing sequence
    if (sequenceRef.current) {
      sequenceRef.current.stop();
      sequenceRef.current.dispose();
    }

    Tone.Transport.bpm.value = bpm;

    const notes = hexString.toLowerCase().split('').map(char => hexToNote[char]).filter(Boolean);
    
    let noteIndex = 0;
    sequenceRef.current = new Tone.Sequence(
      (time, note) => {
        synthRef.current?.triggerAttackRelease(note, '8n', time);
        setCurrentNoteIndex(noteIndex);
        noteIndex = (noteIndex + 1) % notes.length;
      },
      notes,
      '8n'
    );

    sequenceRef.current.start(0);
    Tone.Transport.start();
    setIsPlaying(true);
  }, [bpm, isInitialized, hexToNote]);

  const stopSequence = useCallback(() => {
    if (sequenceRef.current) {
      sequenceRef.current.stop();
      Tone.Transport.stop();
      setIsPlaying(false);
      setCurrentNoteIndex(null);
    }
  }, []);

  const updateBpm = useCallback((newBpm: number) => {
    setBpm(newBpm);
    Tone.Transport.bpm.value = newBpm;
  }, []);

  const updateEffect = useCallback((effect: string, value: number) => {
    if (!effectsRef.current) return;

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
      case 'tremolo':
        effectsRef.current.tremolo.wet.value = value;
        break;
      case 'vibrato':
        effectsRef.current.vibrato.wet.value = value;
        break;
    }
  }, []);

  const cleanup = useCallback(() => {
    stopSequence();
    if (synthRef.current) {
      synthRef.current.dispose();
      synthRef.current = null;
    }
    if (effectsRef.current) {
      Object.values(effectsRef.current).forEach(e => e.dispose());
      effectsRef.current = null;
    }
    if (analyzerRef.current) {
      analyzerRef.current.dispose();
      analyzerRef.current = null;
    }
    setIsInitialized(false);
  }, [stopSequence]);

  return {
    isInitialized,
    isPlaying,
    bpm,
    audioLevel,
    currentNoteIndex,
    hexToNote,
    initSynth,
    playNote,
    playNoteByIndex,
    playSequence,
    stopSequence,
    updateBpm,
    updateEffect,
    cleanup
  };
}

// ============================================================================
// COMPONENTS
// ============================================================================

/**
 * Block Navigator - controls for navigating blockchain
 */
export const BlockNavigator: React.FC<BlockNavigatorProps> = ({
  currentHeight,
  onHeightChange,
  isLoading,
  latestBlockHeight
}) => {
  const [inputValue, setInputValue] = useState(String(currentHeight));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const height = parseInt(inputValue, 10);
    if (!isNaN(height) && height >= 0) {
      onHeightChange(height);
    }
  };

  const navigate = (delta: number) => {
    const newHeight = Math.max(0, currentHeight + delta);
    if (latestBlockHeight && newHeight > latestBlockHeight) return;
    onHeightChange(newHeight);
    setInputValue(String(newHeight));
  };

  return (
    <div className="bg-base-300 rounded-lg p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-lg flex items-center gap-2">
          <span>⛓️</span> Block Navigator
        </h3>
        {latestBlockHeight && (
          <span className="text-xs opacity-60">
            Latest: #{latestBlockHeight.toLocaleString()}
          </span>
        )}
      </div>

      {/* Height input */}
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="number"
          min="0"
          max={latestBlockHeight}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          className="input input-bordered flex-1"
          placeholder="Enter block height..."
          disabled={isLoading}
        />
        <button
          type="submit"
          className={`btn btn-primary ${isLoading ? 'loading' : ''}`}
          disabled={isLoading}
        >
          {isLoading ? '' : 'Go'}
        </button>
      </form>

      {/* Navigation buttons */}
      <div className="grid grid-cols-6 gap-1">
        {[-100000, -10000, -1000, -100, -10, -1].map(delta => (
          <button
            key={delta}
            onClick={() => navigate(delta)}
            className="btn btn-sm btn-ghost"
            disabled={isLoading || currentHeight + delta < 0}
          >
            {delta.toLocaleString()}
          </button>
        ))}
        {[1, 10, 100, 1000, 10000, 100000].map(delta => (
          <button
            key={delta}
            onClick={() => navigate(delta)}
            className="btn btn-sm btn-ghost"
            disabled={isLoading || (latestBlockHeight ? currentHeight + delta > latestBlockHeight : false)}
          >
            +{delta.toLocaleString()}
          </button>
        ))}
      </div>

      {/* Quick jump buttons */}
      <div className="flex flex-wrap gap-2">
        <button onClick={() => { onHeightChange(0); setInputValue('0'); }} 
                className="btn btn-xs btn-outline" disabled={isLoading}>
          Genesis
        </button>
        <button onClick={() => { onHeightChange(210000); setInputValue('210000'); }} 
                className="btn btn-xs btn-outline" disabled={isLoading}>
          1st Halving
        </button>
        <button onClick={() => { onHeightChange(420000); setInputValue('420000'); }} 
                className="btn btn-xs btn-outline" disabled={isLoading}>
          2nd Halving
        </button>
        <button onClick={() => { onHeightChange(630000); setInputValue('630000'); }} 
                className="btn btn-xs btn-outline" disabled={isLoading}>
          3rd Halving
        </button>
        <button onClick={() => { onHeightChange(840000); setInputValue('840000'); }} 
                className="btn btn-xs btn-outline" disabled={isLoading}>
          4th Halving
        </button>
        {latestBlockHeight && (
          <button onClick={() => { onHeightChange(latestBlockHeight); setInputValue(String(latestBlockHeight)); }} 
                  className="btn btn-xs btn-primary" disabled={isLoading}>
            Latest
          </button>
        )}
      </div>
    </div>
  );
};

/**
 * Color Pads - 8x8 grid of colors from block hash
 */
export const ColorPads: React.FC<ColorPadsProps> = ({
  colors,
  onColorClick,
  activeIndex
}) => {
  return (
    <div className="bg-base-300 rounded-lg p-4">
      <h3 className="font-semibold mb-3 flex items-center gap-2">
        <span>🎨</span> Merkle Color Pads
      </h3>
      <div 
        className="grid gap-1"
        style={{ 
          gridTemplateColumns: 'repeat(8, 1fr)',
          aspectRatio: '1'
        }}
      >
        {colors.slice(0, 64).map((color, index) => (
          <button
            key={index}
            onClick={() => onColorClick(index, color)}
            className={`rounded transition-all duration-100 ${
              activeIndex === index 
                ? 'ring-2 ring-white scale-110 z-10' 
                : 'hover:scale-105'
            }`}
            style={{ 
              backgroundColor: color,
              aspectRatio: '1'
            }}
            title={`Pad ${index + 1}`}
          />
        ))}
      </div>
      <p className="text-xs opacity-60 mt-2 text-center">
        Click pads to play notes
      </p>
    </div>
  );
};

/**
 * Block Visualizer - circular audio-reactive display
 */
export const BlockVisualizer: React.FC<BlockVisualizerProps> = ({
  colors,
  audioLevel,
  isPlaying
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const baseRadius = 80;
    const maxRadius = 120;
    const radius = baseRadius + (audioLevel * 200 * (maxRadius - baseRadius));

    // Clear
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw color segments in a circle
    const segments = colors.slice(0, 32);
    const angleStep = (Math.PI * 2) / segments.length;

    segments.forEach((color, i) => {
      const startAngle = i * angleStep - Math.PI / 2;
      const endAngle = startAngle + angleStep;

      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.arc(centerX, centerY, radius, startAngle, endAngle);
      ctx.closePath();
      ctx.fillStyle = color;
      ctx.fill();
    });

    // Inner circle
    ctx.beginPath();
    ctx.arc(centerX, centerY, 30, 0, Math.PI * 2);
    ctx.fillStyle = '#1a1a2e';
    ctx.fill();

    // Bitcoin symbol
    ctx.fillStyle = '#f7931a';
    ctx.font = 'bold 24px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('₿', centerX, centerY);

    // Outer ring
    ctx.strokeStyle = isPlaying ? '#f7931a' : '#ffffff44';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius + 5, 0, Math.PI * 2);
    ctx.stroke();

  }, [colors, audioLevel, isPlaying]);

  return (
    <div className="bg-base-300 rounded-lg p-4 flex flex-col items-center">
      <h3 className="font-semibold mb-3 flex items-center gap-2">
        <span>🌀</span> Block Visualizer
      </h3>
      <canvas
        ref={canvasRef}
        width={280}
        height={280}
        className="rounded-lg"
        style={{ backgroundColor: '#1a1a2e' }}
      />
    </div>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

/**
 * BlockchainAudioEngine - Full blockchain audio visualization and synthesis
 */
const BlockchainAudioEngine: React.FC<BlockchainAudioEngineProps> = ({
  showNavigator = true,
  showColorPads = true,
  showVisualizer = true,
  showControls = true,
  initialBlockHeight = 0
}) => {
  const {
    blockData,
    isLoading,
    error,
    latestHeight,
    fetchBlock,
    fetchLatestHeight,
    getPadColors
  } = useBlockchainData();

  const {
    isInitialized,
    isPlaying,
    bpm,
    audioLevel,
    currentNoteIndex,
    initSynth,
    playNoteByIndex,
    playSequence,
    stopSequence,
    updateBpm,
    updateEffect
  } = useBlockchainSynth();

  const [audioSource, setAudioSource] = useState<'hash' | 'merkle'>('merkle');

  const colors = blockData 
    ? getPadColors(audioSource === 'merkle' ? blockData.merkleRoot : blockData.hash)
    : Array(64).fill('#333');

  const audioString = blockData 
    ? (audioSource === 'merkle' ? blockData.merkleRoot : blockData.hash)
    : '';

  // Initial fetch
  useEffect(() => {
    fetchLatestHeight();
    fetchBlock(initialBlockHeight);
  }, [fetchBlock, fetchLatestHeight, initialBlockHeight]);

  const handleColorClick = async (index: number) => {
    if (!isInitialized) {
      await initSynth();
    }
    if (audioString) {
      playNoteByIndex(index, audioString);
    }
  };

  const handlePlayToggle = async () => {
    if (!isInitialized) {
      await initSynth();
    }
    
    if (isPlaying) {
      stopSequence();
    } else if (audioString) {
      playSequence(audioString);
    }
  };

  return (
    <div className="space-y-6">
      {/* Initialize button */}
      {!isInitialized && (
        <button
          onClick={initSynth}
          className="btn btn-primary w-full"
        >
          🔊 Initialize Audio Engine
        </button>
      )}

      {/* Navigator */}
      {showNavigator && (
        <BlockNavigator
          currentHeight={blockData?.height ?? initialBlockHeight}
          onHeightChange={fetchBlock}
          isLoading={isLoading}
          latestBlockHeight={latestHeight ?? undefined}
        />
      )}

      {/* Block Info */}
      {blockData && (
        <div className="bg-base-300 rounded-lg p-4">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <span>📦</span> Block #{blockData.height.toLocaleString()}
          </h3>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div><span className="opacity-60">Transactions:</span> {blockData.txCount.toLocaleString()}</div>
            <div><span className="opacity-60">Size:</span> {(blockData.size / 1024).toFixed(2)} KB</div>
            <div><span className="opacity-60">Timestamp:</span> {new Date(blockData.timestamp * 1000).toLocaleString()}</div>
            <div><span className="opacity-60">Nonce:</span> {blockData.nonce.toLocaleString()}</div>
          </div>
          <div className="mt-2 space-y-1">
            <div className="text-xs opacity-60">Hash:</div>
            <div className="text-xs font-mono break-all bg-base-200 p-2 rounded">{blockData.hash}</div>
            <div className="text-xs opacity-60 mt-2">Merkle Root:</div>
            <div className="text-xs font-mono break-all bg-base-200 p-2 rounded">{blockData.merkleRoot}</div>
          </div>
        </div>
      )}

      {/* Error display */}
      {error && (
        <div className="alert alert-error">
          <span>⚠️ {error}</span>
        </div>
      )}

      {/* Main content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Color Pads */}
        {showColorPads && (
          <ColorPads
            colors={colors}
            onColorClick={handleColorClick}
            activeIndex={currentNoteIndex}
          />
        )}

        {/* Visualizer */}
        {showVisualizer && (
          <BlockVisualizer
            colors={colors}
            audioLevel={audioLevel}
            isPlaying={isPlaying}
          />
        )}
      </div>

      {/* Controls */}
      {showControls && (
        <div className="bg-base-300 rounded-lg p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold flex items-center gap-2">
              <span>🎛️</span> Audio Controls
            </h3>
            
            {/* Audio source toggle */}
            <div className="flex items-center gap-2">
              <span className="text-sm opacity-60">Source:</span>
              <div className="btn-group">
                <button 
                  className={`btn btn-sm ${audioSource === 'merkle' ? 'btn-primary' : 'btn-ghost'}`}
                  onClick={() => setAudioSource('merkle')}
                >
                  Merkle
                </button>
                <button 
                  className={`btn btn-sm ${audioSource === 'hash' ? 'btn-primary' : 'btn-ghost'}`}
                  onClick={() => setAudioSource('hash')}
                >
                  Hash
                </button>
              </div>
            </div>
          </div>

          {/* Play controls */}
          <div className="flex items-center gap-4">
            <button
              onClick={handlePlayToggle}
              className={`btn ${isPlaying ? 'btn-error' : 'btn-success'}`}
              disabled={!blockData}
            >
              {isPlaying ? '⏹️ Stop' : '▶️ Play Block'}
            </button>

            <div className="flex-1">
              <div className="flex justify-between text-sm mb-1">
                <span>BPM</span>
                <span>{bpm}</span>
              </div>
              <input
                type="range"
                min="60"
                max="180"
                value={bpm}
                onChange={(e) => updateBpm(parseInt(e.target.value))}
                className="range range-sm range-primary"
              />
            </div>
          </div>

          {/* Effects */}
          <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
            {['reverb', 'delay', 'chorus', 'phaser', 'tremolo', 'vibrato'].map(effect => (
              <div key={effect} className="text-center">
                <div className="text-xs opacity-60 capitalize mb-1">{effect}</div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  defaultValue="0"
                  onChange={(e) => updateEffect(effect, parseFloat(e.target.value))}
                  className="range range-xs range-secondary"
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default BlockchainAudioEngine;
