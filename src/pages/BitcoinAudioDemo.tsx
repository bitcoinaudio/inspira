import React, { useEffect, useState, useCallback, useRef } from 'react';
import * as Tone from 'tone';
import BitcoinAudioEngine, { Oscilloscope, FFTVisualizer, SynthControls } from '../components/BitcoinAudioEngine';
import { useBlockchainStore } from '../stores/blockchainStore';

/**
 * BitcoinAudioDemo - Demo page showcasing the Bitcoin Audio Engine components
 * 
 * This page demonstrates:
 * - Full BitcoinAudioEngine component
 * - Individual Oscilloscope visualization
 * - Individual FFT visualization
 * - Standalone SynthControls with blockchain data integration
 */
const BitcoinAudioDemo: React.FC = () => {
  const { currentBlock, fetchAndSetBlock, isLoading } = useBlockchainStore();
  const [blockHeight, setBlockHeight] = useState<number>(0);
  const [audioSegments, setAudioSegments] = useState<string[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentNoteIndex, setCurrentNoteIndex] = useState<number | null>(null);
  const synthRef = useRef<Tone.PolySynth | null>(null);
  const sequenceRef = useRef<Tone.Sequence | null>(null);

  // Hex to note mapping (matches BlockchainAudioEngine)
  const hexToNote: Record<string, string> = {
    '0': 'C2', '1': 'D2', '2': 'E2', '3': 'F2',
    '4': 'G2', '5': 'A2', '6': 'B2', '7': 'C3',
    '8': 'D3', '9': 'E3', 'a': 'F3', 'b': 'G3',
    'c': 'A3', 'd': 'B3', 'e': 'C4', 'f': 'D4'
  };

  // Initialize synth for blockchain playback
  const initBlockchainSynth = useCallback(async () => {
    if (!synthRef.current) {
      await Tone.start();
      synthRef.current = new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: 'triangle' },
        envelope: { attack: 0.02, decay: 0.3, sustain: 0.4, release: 0.8 },
        volume: -8
      }).toDestination();
    }
  }, []);

  // Extract audio segments from merkle root
  useEffect(() => {
    if (currentBlock?.merkleRoot) {
      const segments = currentBlock.merkleRoot.toLowerCase().split('');
      setAudioSegments(segments);
    }
  }, [currentBlock]);

  // Fetch initial block
  useEffect(() => {
    fetchAndSetBlock(0); // Genesis block
  }, [fetchAndSetBlock]);

  const handleFetchBlock = useCallback(() => {
    if (blockHeight >= 0) {
      fetchAndSetBlock(blockHeight);
    }
  }, [blockHeight, fetchAndSetBlock]);

  const playNote = useCallback(async (hexChar: string) => {
    await initBlockchainSynth();
    const note = hexToNote[hexChar];
    if (note && synthRef.current) {
      synthRef.current.triggerAttackRelease(note, '8n');
    }
  }, [hexToNote, initBlockchainSynth]);

  const playSequence = useCallback(async () => {
    if (!currentBlock?.merkleRoot) return;

    await initBlockchainSynth();
    if (!synthRef.current) return;

    // Stop existing sequence
    if (sequenceRef.current) {
      sequenceRef.current.stop();
      sequenceRef.current.dispose();
    }

    const notes = currentBlock.merkleRoot
      .toLowerCase()
      .split('')
      .map(char => hexToNote[char])
      .filter(Boolean);

    if (notes.length === 0) return;

    let noteIndex = 0;
    sequenceRef.current = new Tone.Sequence(
      (time, note) => {
        synthRef.current?.triggerAttackRelease(note, '8n', time);
        Tone.Draw.schedule(() => {
          setCurrentNoteIndex(noteIndex);
          noteIndex = (noteIndex + 1) % notes.length;
        }, time);
      },
      notes,
      '8n'
    );

    sequenceRef.current.start(0);
    Tone.Transport.start();
    setIsPlaying(true);
  }, [currentBlock, hexToNote, initBlockchainSynth]);

  const stopSequence = useCallback(() => {
    if (sequenceRef.current) {
      sequenceRef.current.stop();
      Tone.Transport.stop();
      setIsPlaying(false);
      setCurrentNoteIndex(null);
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (sequenceRef.current) {
        sequenceRef.current.dispose();
      }
      if (synthRef.current) {
        synthRef.current.dispose();
      }
    };
  }, []);
  return (
    <div className="min-h-screen bg-base-100 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-primary flex items-center gap-3">
            <span className="text-4xl">₿</span>
            Bitcoin Audio Engine Demo
          </h1>
          <p className="text-base-content/70 mt-2">
            Web-based audio synthesis and visualization components built with React and Tone.js
          </p>
        </div>

        {/* Blockchain Data Section */}
        <section className="mb-12">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <span>⛓️</span>
            Blockchain Audio Data
          </h2>
          <div className="card bg-base-200 p-6">
            {/* Block Selector */}
            <div className="flex gap-2 mb-4">
              <input
                type="number"
                value={blockHeight}
                onChange={(e) => setBlockHeight(parseInt(e.target.value) || 0)}
                placeholder="Block height..."
                className="input input-bordered flex-1"
                min="0"
              />
              <button
                onClick={handleFetchBlock}
                disabled={isLoading}
                className="btn btn-primary"
              >
                {isLoading ? (
                  <span className="loading loading-spinner loading-sm"></span>
                ) : (
                  'Load Block'
                )}
              </button>
            </div>

            {/* Block Info */}
            {currentBlock && (
              <div className="space-y-3">
                <div>
                  <div className="text-sm opacity-70">Block Height</div>
                  <div className="font-mono text-lg">{currentBlock.height}</div>
                </div>
                <div>
                  <div className="text-sm opacity-70">Merkle Root</div>
                  <div className="font-mono text-xs break-all">{currentBlock.merkleRoot}</div>
                </div>
                <div>
                  <div className="text-sm opacity-70">Audio Segments (64 hex chars)</div>
                  <div className="font-mono text-xs">
                    {audioSegments.length} notes from merkle root
                  </div>
                </div>
              </div>
            )}

            {/* Blockchain Keyboard */}
            {currentBlock && audioSegments.length > 0 && (
              <div className="mt-6">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="font-medium">Blockchain Virtual Keyboard</h3>
                  <button
                    onClick={isPlaying ? stopSequence : playSequence}
                    className={`btn btn-sm ${isPlaying ? 'btn-error' : 'btn-success'}`}
                  >
                    {isPlaying ? '⏸️ Stop' : '▶️ Play Sequence'}
                  </button>
                </div>

                {/* Grid of color pads (like BlockchainAudioEngine) */}
                <div className="space-y-2 mb-4">
                  {/* First Row - 32 keys */}
                  <div className="flex gap-1">
                    {audioSegments.slice(0, 32).map((hexChar, index) => {
                      const note = hexToNote[hexChar];
                      const hue = (parseInt(hexChar, 16) / 15) * 360;
                      const color = `hsl(${hue}, 80%, 50%)`;
                      const isActive = currentNoteIndex === index;

                      return (
                        <button
                          key={index}
                          onClick={() => playNote(hexChar)}
                          className={`flex-1 h-16 rounded-md transition-all transform hover:scale-105 flex items-center justify-center ${
                            isActive ? 'ring-4 ring-white scale-105' : ''
                          }`}
                          style={{
                            backgroundColor: color,
                            boxShadow: isActive ? `0 0 20px ${color}` : 'none',
                            minWidth: '24px'
                          }}
                          title={`${hexChar} → ${note}`}
                        >
                          <span className="text-xs font-mono text-white drop-shadow-md font-bold">
                            {hexChar}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  
                  {/* Second Row - 32 keys */}
                  <div className="flex gap-1">
                    {audioSegments.slice(32, 64).map((hexChar, index) => {
                      const actualIndex = index + 32;
                      const note = hexToNote[hexChar];
                      const hue = (parseInt(hexChar, 16) / 15) * 360;
                      const color = `hsl(${hue}, 80%, 50%)`;
                      const isActive = currentNoteIndex === actualIndex;

                      return (
                        <button
                          key={actualIndex}
                          onClick={() => playNote(hexChar)}
                          className={`flex-1 h-16 rounded-md transition-all transform hover:scale-105 flex items-center justify-center ${
                            isActive ? 'ring-4 ring-white scale-105' : ''
                          }`}
                          style={{
                            backgroundColor: color,
                            boxShadow: isActive ? `0 0 20px ${color}` : 'none',
                            minWidth: '24px'
                          }}
                          title={`${hexChar} → ${note}`}
                        >
                          <span className="text-xs font-mono text-white drop-shadow-md font-bold">
                            {hexChar}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Note mapping legend */}
                <div className="text-xs opacity-70 bg-base-300 p-3 rounded-lg">
                  <div className="font-medium mb-1">Hex to Note Mapping:</div>
                  <div className="grid grid-cols-8 gap-1 font-mono">
                    {Object.entries(hexToNote).map(([hex, note]) => (
                      <span key={hex}>{hex}→{note}</span>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Full Component Demo */}
        <section className="mb-12">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <span>🎛️</span>
            Full Bitcoin Audio Engine
          </h2>
          <p className="text-sm text-base-content/60 mb-4">
            Complete audio workstation with oscilloscope, FFT spectrum analyzer, and synthesizer controls.
          </p>
          <div className="card bg-base-200 p-6">
            <BitcoinAudioEngine
              showOscilloscope
              showFFT
              showSynth
              visualizerWidth={350}
              visualizerHeight={100}
              theme="bitcoin"
            />
          </div>
        </section>

        {/* Individual Components */}
        <section className="mb-12">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <span>🧩</span>
            Individual Components
          </h2>
          <p className="text-sm text-base-content/60 mb-4">
            Use components individually for custom layouts.
          </p>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Oscilloscope Only */}
            <div className="card bg-base-200 p-6">
              <h3 className="text-lg font-medium mb-4">Oscilloscope</h3>
              <p className="text-sm text-base-content/60 mb-4">
                Real-time waveform visualization. Displays the audio signal in time domain.
              </p>
              <Oscilloscope
                width={300}
                height={120}
                color="#f7931a"
                backgroundColor="#1a1a2e"
                showGrid
              />
            </div>

            {/* FFT Only */}
            <div className="card bg-base-200 p-6">
              <h3 className="text-lg font-medium mb-4">FFT Spectrum</h3>
              <p className="text-sm text-base-content/60 mb-4">
                Frequency spectrum analyzer. Shows audio frequencies from low to high.
              </p>
              <FFTVisualizer
                width={300}
                height={120}
                barColor="#f7931a"
                backgroundColor="#1a1a2e"
                gradient
                gradientColors={['#f7931a', '#ff6b00', '#ff3d00']}
                barCount={24}
              />
            </div>
          </div>
        </section>

        {/* Synth Only */}
        <section className="mb-12">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <span>🎹</span>
            Standalone Synthesizer
          </h2>
          <p className="text-sm text-base-content/60 mb-4">
            Full synthesizer with oscillator types, ADSR envelope, effects, and virtual keyboard.
          </p>
          <SynthControls
            showKeyboard
            showEffects
            showEnvelope
          />
        </section>

        {/* Usage Examples */}
        <section className="mb-12">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <span>📝</span>
            Usage Examples
          </h2>

          <div className="mockup-code bg-base-300">
            <pre data-prefix="1"><code>{`// Import the full component`}</code></pre>
            <pre data-prefix="2"><code>{`import BitcoinAudioEngine from './components/BitcoinAudioEngine';`}</code></pre>
            <pre data-prefix="3"><code>{``}</code></pre>
            <pre data-prefix="4"><code>{`// Use in your app`}</code></pre>
            <pre data-prefix="5"><code>{`<BitcoinAudioEngine`}</code></pre>
            <pre data-prefix="6"><code>{`  showOscilloscope`}</code></pre>
            <pre data-prefix="7"><code>{`  showFFT`}</code></pre>
            <pre data-prefix="8"><code>{`  showSynth`}</code></pre>
            <pre data-prefix="9"><code>{`  theme="bitcoin"`}</code></pre>
            <pre data-prefix="10"><code>{`/>`}</code></pre>
          </div>

          <div className="mt-4 mockup-code bg-base-300">
            <pre data-prefix="1"><code>{`// Import individual components`}</code></pre>
            <pre data-prefix="2"><code>{`import { Oscilloscope, FFTVisualizer, SynthControls } from './components/BitcoinAudioEngine';`}</code></pre>
            <pre data-prefix="3"><code>{``}</code></pre>
            <pre data-prefix="4"><code>{`// Use hooks for custom implementations`}</code></pre>
            <pre data-prefix="5"><code>{`import { useAudioVisualizer, useSynthesizer } from './components/BitcoinAudioEngine';`}</code></pre>
          </div>
        </section>

        {/* Features List */}
        <section className="mb-12">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <span>✨</span>
            Features
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { icon: '〰️', title: 'Oscilloscope', desc: 'Real-time waveform display with grid' },
              { icon: '📊', title: 'FFT Analyzer', desc: 'Frequency spectrum with gradient bars' },
              { icon: '🎹', title: 'Virtual Keyboard', desc: 'Play notes with mouse or keyboard' },
              { icon: '🎛️', title: 'Oscillator Types', desc: 'Sine, Square, Saw, Triangle, FM' },
              { icon: '📈', title: 'ADSR Envelope', desc: 'Attack, Decay, Sustain, Release' },
              { icon: '🎚️', title: 'Effects Chain', desc: 'Reverb, Delay, Chorus, Phaser & more' },
              { icon: '🔊', title: 'Volume Control', desc: 'Master volume with dB display' },
              { icon: '🎨', title: 'Theming', desc: 'Bitcoin, Dark, and Light themes' },
              { icon: '⚡', title: 'Web Audio API', desc: 'Built on Tone.js for performance' },
            ].map(({ icon, title, desc }) => (
              <div key={title} className="card bg-base-200 p-4">
                <div className="flex items-start gap-3">
                  <span className="text-2xl">{icon}</span>
                  <div>
                    <h3 className="font-medium">{title}</h3>
                    <p className="text-sm text-base-content/60">{desc}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Footer */}
        <footer className="text-center text-sm text-base-content/50 py-8 border-t border-base-300">
          <p>
            Built with ❤️ using React, Tone.js, and TailwindCSS
          </p>
          <p className="mt-1">
            Based on Bitcoin Audio Engine patterns
          </p>
        </footer>
      </div>
    </div>
  );
};

export default BitcoinAudioDemo;
