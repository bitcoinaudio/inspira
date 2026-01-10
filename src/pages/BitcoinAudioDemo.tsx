import React from 'react';
import BitcoinAudioEngine, { Oscilloscope, FFTVisualizer, SynthControls } from '../components/BitcoinAudioEngine';

/**
 * BitcoinAudioDemo - Demo page showcasing the Bitcoin Audio Engine components
 * 
 * This page demonstrates:
 * - Full BitcoinAudioEngine component
 * - Individual Oscilloscope visualization
 * - Individual FFT visualization
 * - Standalone SynthControls
 */
const BitcoinAudioDemo: React.FC = () => {
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
