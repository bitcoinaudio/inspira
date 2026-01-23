# Inspira Engine

A React-based audio synthesis and AI music generation platform built on Bitcoin blockchain data.

## Features

### 🤖 AI Music Generator
Generate custom music and sample packs using AI with:
- **Text-to-music generation** from natural language prompts
- **Bitcoin blockchain-derived prompts** using BNS (Bitmap Naming Service) algorithm
- **Customizable parameters**: BPM (40-200), key signatures, duration (4-32s), stems (1-10)
- **AI-generated cover art** with graffiti style using Stable Diffusion
- **Multiple workflows** with priority-based selection
- **Real-time job tracking** with progress updates and status polling
- **Download complete sample packs** as ZIP files

### ₿ Bitcoin Audio Sample Engine (B.A.S.E)
Transform Bitcoin blocks into unique generative audio stems and AI artwork:
- **Block data input** - Enter any Bitcoin block height to fetch blockchain data
- **8x8 color grid** - Visualize blockchain data as interactive color matrix
- **8 audio stems** - Generate melodic patterns from Bitcoin hex data (merkle root or block hash)
- **AI artwork generation** - ComfyUI transforms color grid into unique graffiti-style art
- **Hex-to-note mapping** - Each hex character (0-f) maps to a musical note
- **Downloadable packs** - Complete B.A.S.E packs with image and stem data
- **B.A.S.E Packs gallery** - Browse all generated Bitcoin artwork and audio data

### 📦 Sample Pack Browser
Browse and manage your generated sample packs:
- **Grid view** with responsive layout (1-4 columns)
- **Cover art preview** with fallback placeholders
- **Individual stem playback** - play/pause each audio stem
- **Metadata display** - BPM, key, prompt, creation date
- **Model information** - checkpoint, LoRA, and audio model used
- **Quick download** - download complete packs with one click
- **Open in Studio** - mix and edit stems with Inspira Studio ✨ NEW
- **Auto-sorted** by creation date (newest first)
- **Refresh on demand** to update the list

### 🖼️ B.A.S.E Packs Gallery
View all generated Bitcoin Audio Sample Engine artworks:
- **Bitcoin-themed gallery** - Orange/yellow gradient design
- **Block metadata** - Block height, data source, seed, generation time
- **Image preview** - View generated AI artwork
- **Audio stems** - Expandable section to preview stems
- **Download support** - Download individual images and stem data
- **Open in Studio** - mix and edit stems with Inspira Studio ✨ NEW
- **Status tracking** - See completion status and processing time

### 🎹 Bitcoin Audio Engine
Web-based synthesizer with real-time visualization:
- **Oscilloscope** (waveform display)
- **FFT spectrum analyzer**
- **Virtual keyboard** with polyphonic synth
- **Multiple oscillator types** (sine, square, saw, triangle, FM)
- **ADSR envelope control**
- **Effects chain** (reverb, delay, chorus, phaser, distortion)

### ⛓️ Blockchain Audio Engine
Transform Bitcoin blockchain data into music and visual art:
- **Real-time data** from Blockstream API
- **64-color visualization** from merkle roots
- **Hex-to-note musical mapping**
- **Block sequence playback**
- **Audio-reactive circular visualizer**
- **Block navigation** with quick-jump buttons

### 🎛️ Inspira Studio ✨ NEW
Professional browser-based audio mixing and recording workstation:
- **Multi-stem mixer** - Mix multiple audio stems together
- **Individual controls** per stem:
  - Volume faders (-60dB to +6dB)
  - Pan controls (L/C/R)
  - Mute and Solo buttons
- **Master mixer** with volume control and level metering
- **ADSR Envelope Editor** - Per-stem attack, decay, sustain, release controls
- **Effects Chain** - Per-stem effects with real-time parameter control:
  - Reverb (wet, decay)
  - Delay (wet, time)
  - Chorus (wet, rate, depth)
- **Visual Level Meters** - Real-time amplitude metering for all stems + master
- **Frequency Spectrum Analyzer** - Real-time FFT visualization with color-coded frequency bands
- **Master Limiter** - Hard limiting at adjustable threshold to prevent clipping
- **Real-time recording** of mixed audio
- **Browser download** - Get your mix as WebM audio
- **Server storage** - Automatically saved to backend
- **Settings persistence** - Mixer settings saved per pack
- **Cover art display** - See the pack artwork while mixing

**Access**: Click "Studio" button on any Sample Pack or B.A.S.E Pack card

## Tech Stack

- **React 19** - UI framework with hooks
- **TypeScript 5** - Full type safety
- **Vite 7** - Fast build tool and dev server
- **Tailwind CSS 4** - Utility-first styling
- **DaisyUI 5** - Component library with themes
- **Tone.js 15** - Web Audio synthesis
- **Zustand 5** - State management
- **TanStack Query 5** - Server state management
- **React Router 7** - Client-side routing

## Getting Started

### Prerequisites
- Node.js 18+ or Bun
- npm, yarn, pnpm, or bun package manager

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Start with network access (for mobile testing)
npm run dev:network

# Build for production
npm run build

# Preview production build
npm run preview
```

### Environment Variables

Create a `.env` (or `.env.local`) file in the `src/apps/inspira` directory:

```env
# Where the Vite dev server proxies /api/* requests (standalone + embedded)
VITE_GATEWAY_SERVER_URL=http://localhost:3003

# Optional override for the API client base URL.
# Default is `/api` (recommended) which works with the Vite proxy.
# VITE_API_URL=/api
# VITE_API_URL=http://localhost:3003

# Optional override for Beatfeed publishing proxy target
# VITE_BEATFEED_URL=https://api.beatfeed.xyz

# Backend must be running for AI Generator and Sample Pack Browser
# See: https://github.com/yourusername/samplepacker.ai
```

## Project Structure

```
inspira/
├── src/
│   ├── components/
│   │   ├── BitcoinAudioEngine/   # Synth & visualizers
│   │   └── BlockchainAudioEngine/ # Blockchain audio components
│   ├── hooks/
│   │   ├── useSamplePackGenerator.ts
│   │   └── useStudioSettings.ts   # 🆕 Mixer settings persistence
│   ├── pages/
│   │   ├── AIGenerator.tsx        # AI music generation UI
│   │   ├── SamplePacks.tsx        # Sample pack browser
│   │   ├── InspiraStudio.tsx      # 🆕 Audio mixing workstation
│   │   ├── BitcoinAudioDemo.tsx   # Synthesizer demo
│   │   ├── BitcoinAudioSampleEngine.tsx # B.A.S.E generator
│   │   ├── BASEPacks.tsx          # B.A.S.E gallery
│   │   └── BlockchainAudioDemo.tsx
│   ├── stores/
│   │   ├── blockchainStore.ts     # BNS algorithm & state
│   │   └── uiStore.ts             # Theme state
│   ├── utils/
│   │   └── samplePackerAPI.ts     # AI generation API client
│   ├── App.tsx
│   ├── App.css
│   ├── index.css
│   └── main.tsx
├── package.json
├── vite.config.ts
├── tailwind.config.js
├── tsconfig.json
├── INSPIRA_STUDIO_IMPLEMENTATION.md  # 🆕 Full feature documentation
├── INSPIRA_STUDIO_ARCHITECTURE.md    # 🆕 Technical architecture
└── INSPIRA_STUDIO_QUICK_REFERENCE.md # 🆕 Developer guide
```

## Available Themes

The app supports multiple DaisyUI themes:
- `dark` (default)
- `light`
- `synthwave`
- `cyberpunk`
- `retro`

Change theme via the theme selector in the navigation bar.

## Troubleshooting

### Studio Not Loading Pack Data
**Issue**: Studio page shows loading spinner indefinitely
- **Solution**: Ensure gateway is running (`docker-compose ps` in samplepacker.ai folder)
- **Check**: Gateway must serve `/api/packs` endpoint with complete manifest data
- **Verify**: `curl http://localhost:3003/packs` returns pack list with `audio_urls` array

### Stems Not Playing
**Issue**: Play button doesn't produce audio
- **Solution**: Check browser console (F12) for audio context errors
- **Note**: Audio context requires user interaction (click page to enable)
- **Check**: Verify stem URLs are accessible: `curl http://localhost:3003/files/[filename]`

## Recent Fixes & Updates

### ✅ Pack Loading Fix (January 2026)
**Issue**: Inspira Studio was not displaying pack contents when navigating to `/studio/:packId`

**Root Cause**: 
- Component was attempting to fetch from non-existent `/api/packs/:id` endpoint
- Gateway only provides `/api/packs` (list all) and `/api/jobs/:id` (job status)
- Studio needs complete manifest data with `audio_urls` and `cover_url`

**Solution**:
- Updated Studio to fetch `/api/packs` and filter by `packId`
- Gateway's `/packs` endpoint already includes full manifest with proper URLs
- Studio now displays all pack metadata, cover art, and stems correctly

**Files Modified**:
- `src/pages/InspiraStudio.tsx` (lines 125-169) - Updated `loadPack()` effect

## API Endpoints

The AI Generator, B.A.S.E, Sample Pack Browser, and Inspira Studio connect to the SamplePacker AI backend:

### Generation
- `GET /api/workflows` - List available workflows
- `POST /api/packs` - Start a new generation job
- `POST /api/bitcoin/image` - Generate B.A.S.E pack (image + stems)
- `GET /api/jobs/:id` - Get job status and details
- `GET /api/jobs` - List all jobs (supports filtering: `?status=completed`)

### Sample Packs & Studio (\ud83c\udd95 NEW)
- `GET /api/packs` - List all generated sample packs with complete manifest data (includes `audio_urls` and `cover_url`)
  - Used by: Sample Pack Browser, Inspira Studio for pack loading
  - Returns: Array of packs with full metadata, audio URLs, and cover art URLs
- `GET /api/packs/:id/download` - Download complete pack as ZIP
- `GET /api/packs/:id/package` - Get pack metadata for download

### Studio Recording
- `POST /api/studio/:packId/export` - Save recorded mix to server
- `GET /api/studio/:packId/recordings` - List all recordings for a pack

### Files
- `GET /api/files/:filename` - Fetch generated files (audio/images/stem data)
- `GET /api/files/studio-recordings/:filename` - Fetch saved recordings

### Publishing
- `GET /api/packs/:id/manifest` - Get Beatfeed-compliant manifest for publishing

### Vite Proxy (Development)
All `/api/*` requests are proxied to `http://localhost:3003` in development mode.
All `/beatfeed-api/*` requests are proxied to `http://api.beatfeed.local` to avoid CORS issues.

## Publishing to Beatfeed 🚀 ✅ FULLY OPERATIONAL

Inspira successfully integrates with [Beatfeed](https://beatfeed.xyz) to publish your AI-generated sample packs as digital products on the Bitcoin Lightning Network.

**Status:** All integration issues resolved! Publishing works end-to-end.

### Quick Start

1. **Generate a Sample Pack**
   - Navigate to AI Generator page
   - Create a sample pack with your desired settings
   - Wait for generation to complete (shows up in Sample Packs page)

2. **Publish to Beatfeed**
   - On the Sample Packs page, find your pack
   - Click the **"Publish to Beatfeed"** button (orange warning button)
   - A modal dialog will appear with publishing options

3. **Configure Publishing Settings**
   - **Creator Handle**: Your Beatfeed creator username (default: `bitcoinaudio`)
   - **Price (sats)**: Set price in satoshis (0 for free)
   - **Visibility**: Public or Unlisted
   - **Auto-publish**: Immediately publish (recommended)
   - **Beatfeed API URL**: Default `/beatfeed-api` (proxied through Vite, no CORS issues)

4. **Admin Key Setup**
   - Click "Admin Key Setup" dropdown
   - Enter your Beatfeed admin key
   - Key is saved in browser localStorage for future use
   - Default dev key: `beatfeed_dev_key_change_in_production`

5. **Publish**
   - Click **"🚀 Publish"** button
   - Wait for confirmation (should take 2-5 seconds)
   - Success message shows product slug and status
   - Modal auto-closes after 3 seconds

### How It Works

1. **Manifest Generation**: When you publish, Inspira fetches a Beatfeed-compliant manifest from the gateway API (`/api/packs/:id/manifest`)
2. **Manifest Upload**: The manifest URL is sent to Beatfeed's `/admin/publish-from-manifest` endpoint
3. **Asset Processing**: Beatfeed fetches all assets (audio stems, cover art) from the manifest URLs
4. **Product Creation**: A new product is created on Beatfeed with proper metadata and pricing
5. **Lightning Integration**: Product is ready for sale with Lightning Network payments

### Manifest Format

Inspira generates [Beatfeed Manifest v2.0.0](../../contracts/beatfeed/manifest/v2-draft/) compliant metadata including:

- **Artifact Information**: Title, description, tags, source app reference
- **Creator Details**: Handle, display name, website
- **Product Settings**: Price, visibility, edition size, license
- **Assets**: Cover image, audio previews, bundle ZIP
- **Contents**: Individual track/stem listings with metadata
- **Provenance**: Generator info, parameters, seeds

### Production Setup

For production deployment, update these environment variables in your gateway:

```bash
# In samplepacker docker-compose.yml
BEATFEED_API_URL=https://api.beatfeed.xyz/api
BEATFEED_ADMIN_KEY=your_production_admin_key_here
ASSET_BASE_URL=https://your-cdn.com/assets
```

Then in Inspira's PublishToBeatfeedModal, update the default `beatfeed_url` to your production endpoint.

### Testing the Flow

Run the included test script to verify end-to-end publishing:

```bash
cd apps/inspira
.\test-publish-flow.ps1
```

This will:
1. Test the gateway manifest endpoint
2. Test the Beatfeed publish endpoint
3. Verify successful product creation
4. Display the product slug and URL

### Troubleshooting

**Error: "Route not found"**
- Ensure gateway is running and updated: `docker-compose up -d --build gateway`
- Manifest endpoint was added in latest version

**Error: "Admin key invalid"**
- Check your Beatfeed admin key in the modal
- For local dev: `beatfeed_dev_key_change_in_production`
- Keys are stored in browser localStorage

**Error: "Manifest validation failed"**
- Ensure pack generation completed successfully
- Check gateway logs: `docker logs gateway`
- Verify manifest exists: `curl http://localhost:3003/api/packs/:id/manifest`

**Error: "Manifest fetch error: fetch failed" (500 Internal Server Error)**
- Beatfeed API container cannot reach the gateway
- Manifest URL must use `host.docker.internal:3003` not `localhost:3003`
- This is handled automatically in the PublishToBeatfeedModal component
- Verify gateway is accessible: `curl http://host.docker.internal:3003/api/packs`

**Error: "Manifest missing required field: artifact.type"**
- Gateway now automatically transforms internal manifests to Beatfeed v1.0.0 format
- Ensure gateway is up to date: `docker-compose up -d --build gateway`
- Verify manifest structure: `curl http://localhost:3003/api/packs/:id/manifest`
- Should contain `schema`, `artifact`, `assets`, and `contents` top-level fields

**Error: "Cannot reach Beatfeed API"**
- Verify Beatfeed is running: `docker ps | grep beatfeed`
- Check Beatfeed API health: `curl http://api.beatfeed.local/api/health`
- For local dev, requests are proxied through `/beatfeed-api` to avoid CORS issues
- If accessing Beatfeed directly, ensure CORS headers are configured

**Publishing works locally but fails in production**
- Ensure `ASSET_BASE_URL` is configured in gateway environment
- Verify asset URLs are publicly accessible
- Check CORS headers allow Beatfeed to fetch assets

### Features

- ✅ One-click publishing from Inspira UI
- ✅ Beatfeed Manifest v1.0.0 compliant
- ✅ Automatic manifest transformation (gateway handles conversion)
- ✅ Docker networking support (host.docker.internal)
- ✅ Automatic asset URL resolution
- ✅ Admin key persistence in localStorage
- ✅ Configurable pricing and visibility
- ✅ Auto-publish or draft mode
- ✅ Success/error feedback with details
- ✅ Product slug and view link on success

### Integration Fixes Applied (January 2026)

1. **Vite Proxy**: Fixed to use `localhost:3001` instead of unresolvable `api.beatfeed.local`
2. **Manifest URL**: Uses `host.docker.internal:3003` for Docker container access
3. **Beatfeed API Validation**: Updated to check nested fields (`artifact.type`, `assets.bundle.url`)
4. **Gateway Transformation**: Automatically converts internal manifests to Beatfeed v1.0.0 format
5. **Database Constraints**: Fixed artifact upsert logic to use `source_app` + `source_ref`

## Component Usage

### BitcoinAudioSampleEngine

```tsx
import BitcoinAudioSampleEngine from './pages/BitcoinAudioSampleEngine';

<BitcoinAudioSampleEngine />
```

Complete B.A.S.E generator with:
- Block height input and data fetching
- 8x8 interactive color grid from blockchain data
- 8 audio stems with Tone.js synthesis
- AI artwork generation via ComfyUI
- Data source selection (merkle root or block hash)

### BASEPacks

```tsx
import BASEPacks from './pages/BASEPacks';

<BASEPacks />
```

Gallery view with:
- All completed B.A.S.E packs
- Block metadata (height, source, seed, time)
- Generated artwork preview
- Download buttons for images and stem data

### SamplePacks

```tsx
import SamplePacks from './pages/SamplePacks';

<SamplePacks />
```

Features:
- Responsive grid (1-4 columns based on screen size)
- Individual stem playback with play/pause controls
- Cover art display with automatic fallback
- Download button for complete packs
- Metadata display (BPM, key, stems, date, models)

### BitcoinAudioEngine

```tsx
import BitcoinAudioEngine, { 
  Oscilloscope, 
  FFTVisualizer, 
  SynthControls 
} from './components/BitcoinAudioEngine';

// Full component
<BitcoinAudioEngine
  showOscilloscope
  showFFT
  showSynth
  theme="bitcoin"
/>

// Individual components
<Oscilloscope width={300} height={100} color="#f7931a" />
<FFTVisualizer width={300} height={100} gradient />
<SynthControls showKeyboard showEffects showEnvelope />
```

### BlockchainAudioEngine

```tsx
import BlockchainAudioEngine from './components/BlockchainAudioEngine';

<BlockchainAudioEngine
  showNavigator
  showColorPads
  showVisualizer
  showControls
  initialBlockHeight={0}
/>
```

### InspiraStudio (🆕 NEW)

```tsx
import InspiraStudio from './pages/InspiraStudio';

<InspiraStudio />
```

Complete audio mixing workstation:
- Access via `/studio/:packId` route
- Mix multiple audio stems
- Adjust volume, pan, mute, solo
- Record mixes in real-time
- Save to server and download locally
- Settings persist per pack

**Example: Open from a Sample Pack**
```tsx
// User clicks "Studio" button on any pack card
// Automatically navigates to /studio/{packId}
// InspiraStudio loads pack data and initializes mixer
```

## BNS Algorithm

The Bitmap Naming Service (BNS) algorithm derives meaningful words from Bitcoin block merkle roots:

1. Extract sliding windows of 3-6 characters from the merkle root
2. Check each window against a TLD/word dictionary
3. Apply character shifts (0-9, a-f → alphabet mapping)
4. Score matches by total shift distance
5. Generate music prompts from the best matches

## Roadmap & TODOs

### Phase 1: Core Features (✅ Completed)
- [x] Inspira Studio base implementation
- [x] Multi-stem audio mixing
- [x] Volume, pan, mute, solo controls
- [x] Browser-based recording
- [x] Server-side storage integration
- [x] Settings persistence per pack
- [x] Studio buttons on pack cards
- [x] Fixed pack loading from gateway `/packs` endpoint

### Phase 2: Advanced Mixing (✅ Completed)
- [x] ADSR envelope editor per stem
- [x] Effects chain (reverb, delay, chorus)
- [x] Level meters and loudness monitoring (real-time per-stem + master)
- [x] Frequency spectrum analyzer (FFT visualization with color-coded bands)
- [x] Master limiting/compression (adjustable threshold, 10:1 ratio)
- [ ] Visual waveform oscilloscope display

### Phase 3: Export & Quality (⏳ Planned)
- [ ] Server-side high-quality WAV/MP3 export
- [ ] Loudness normalization
- [ ] Audio format detection
- [ ] Batch download previous mixes
- [ ] Share mix links

### Phase 4: Collaboration (⏳ Future)
- [ ] Mix versioning for validated users
- [ ] Collaborative real-time mixing
- [ ] Mix history and undo/redo
- [ ] Preset saving and recall
- [ ] ML-assisted auto-mixing

### Phase 5: Integration (⏳ Future)
- [ ] DAW plugin support (VST/AU)
- [ ] MIDI input/output
- [ ] Streaming to social media
- [ ] Mobile app version

## Known Limitations & TODOs

### Backend
- [ ] Add WAV encoder for high-quality exports (tone package ready)
- [ ] Implement server-side audio rendering for WAV/MP3
- [ ] Add recording cleanup job (old recordings)
- [ ] Add `/packs/:id` endpoint for direct pack retrieval (workaround: list & filter)
- [ ] Authentication layer for mix versioning

### Frontend
- [ ] Add debouncing to localStorage writes (performance)
- [ ] Virtual scrolling for 100+ stems
- [ ] Keyboard shortcuts for play/record/stop
- [ ] Undo/redo stack for settings
- [ ] Effect preset saving and recall
- [ ] Visual waveform oscilloscope display

### Data Model
- [ ] B.A.S.E packs should output audio files, not JSON
- [ ] Mix versioning schema (requires DB)
- [ ] User authentication (optional)

## Getting Help

For detailed documentation:
- **Feature Overview**: [INSPIRA_STUDIO_IMPLEMENTATION.md](./INSPIRA_STUDIO_IMPLEMENTATION.md)
- **Architecture Guide**: [INSPIRA_STUDIO_ARCHITECTURE.md](./INSPIRA_STUDIO_ARCHITECTURE.md)
- **Developer Reference**: [INSPIRA_STUDIO_QUICK_REFERENCE.md](./INSPIRA_STUDIO_QUICK_REFERENCE.md)

## License

MIT

## Credits

Based on the original Bitcoin Audio Engine project.
Built with ❤️ using React, Tone.js, and the Bitcoin blockchain.
