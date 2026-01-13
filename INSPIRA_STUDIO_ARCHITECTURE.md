# Inspira Studio - Technical Architecture & Design Decisions

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                    Frontend (React)                      │
│  ┌──────────────────────────────────────────────────┐   │
│  │  InspiraStudio.tsx                               │   │
│  │  ├─ Load Pack Data (SamplePacks/BASEPacks)      │   │
│  │  ├─ Initialize Tone.js Audio Context            │   │
│  │  ├─ Load Stems as Tone.Players                  │   │
│  │  ├─ Mixer UI (Volume/Pan/Mute/Solo)            │   │
│  │  ├─ Recording with MediaRecorder                │   │
│  │  └─ Persist Settings to localStorage            │   │
│  │                                                  │   │
│  │  useStudioSettings Hook                         │   │
│  │  ├─ Load/Save to localStorage                   │   │
│  │  ├─ Export Recording to Backend                 │   │
│  │  └─ Clear on Exit                               │   │
│  └──────────────────────────────────────────────────┘   │
│                    ↓ HTTP API ↓                          │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│                   Backend (Node.js)                      │
│  ┌──────────────────────────────────────────────────┐   │
│  │  Express Server (gateway)                        │   │
│  │  ├─ GET /api/packs/:id              (existing)  │   │
│  │  ├─ GET /api/jobs/:id               (existing)  │   │
│  │  ├─ POST /api/studio/:id/export     (NEW)       │   │
│  │  ├─ GET /api/studio/:id/recordings  (NEW)       │   │
│  │  └─ GET /api/files/:name            (existing)  │   │
│  │                                                  │   │
│  │  Storage: /data/output/studio-recordings/       │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

## Technology Choices

### 1. **Tone.js for Audio (Frontend)**
**Why Tone.js instead of raw Web Audio API?**
- Automatic context management
- Built-in synth/sampler abstractions
- Simplified scheduling and timing
- Cross-browser compatibility
- Type-safe (TypeScript support)

**Tradeoffs:**
- ✅ Easier to implement
- ✅ Consistent with BitcoinAudioDemo
- ❌ Slightly higher overhead than raw API
- ❌ Limited to browser (not server-side audio)

### 2. **MediaRecorder API for Recording**
**Why MediaRecorder instead of ScriptProcessor?**
- Modern, simpler API
- Automatic format handling (WebM)
- Lower CPU overhead
- No manual audio frame buffering

**Format: WebM**
- ✅ Native browser codec (VP8/Vorbis)
- ✅ No transcoding needed
- ✅ Good compression
- ❌ Not all legacy browsers
- ❌ Can't directly edit audio data

### 3. **localStorage for Settings Persistence**
**Why localStorage instead of IndexedDB or server-side?**
- Simple key-value storage
- Sufficient for mixer settings (small data)
- No database overhead
- Automatic cleanup per requirement

**Structure: One entry per packId**
- ✅ Fast queries
- ✅ Easy to clear on exit
- ❌ 5-10MB limit per domain
- ❌ No versioning/conflict resolution

### 4. **Backend Recording Storage (filesystem)**
**Why filesystem instead of database?**
- Simple implementation
- Audio files are inherently large
- Can serve directly via HTTP
- Easy to backup/migrate

**Path: /data/output/studio-recordings/**
- Consistent with existing output structure
- Volume-mounted in Docker
- Accessible via /files/ endpoint

## Data Flow Decisions

### 1. **Dual Save Strategy**
```
Recording Blob
    ↓
Browser Download (local)
    + 
Backend Upload (server storage)
    ↓
User has both options
```

**Why both?**
- ✅ User retains copy (privacy)
- ✅ Server copy for digital media packaging
- ✅ No forced data transmission
- ❌ Slight redundancy

### 2. **API Endpoint Selection (Flexible)**
```javascript
// Try SamplePacks first
GET /api/packs/:packId
  → If not found, try BASEPacks
GET /api/jobs/:packId
```

**Why flexible detection?**
- ✅ Single studio route handles both pack types
- ✅ No separate pack-type parameter
- ✅ Better UX
- ❌ Slightly slower (two requests in worst case)

### 3. **Stem Loading from Multiple Fields**
```javascript
audioFiles = packData.audio_urls || packData.audio || []
```

**Why multiple sources?**
- ✅ Handles API version differences
- ✅ Backward compatible
- ✅ Handles data format variations
- ❌ Hidden complexity

## Settings Persistence Strategy

### Lifecycle
```
Studio Opens
    ↓
Load from localStorage
    ↓
User adjusts settings
    ↓
Auto-save on each change (debounced optional)
    ↓
User exits/navigates
    ↓
Clear localStorage (per requirement)
```

### Why Clear on Exit?
- **Per your requirements**: "Discard all edits"
- Prevents stale settings on reload
- Forces fresh start for next session
- Can be modified for future "save versions" feature

### Rationale Over Alternatives
| Approach | Pros | Cons |
|----------|------|------|
| Clear on exit | Clean state | Lose quick access to previous mix |
| Persist indefinitely | Quick recall | Gets stale over time |
| Server-side storage | Data backup | Requires auth |
| IndexedDB | Larger capacity | More complex |

## Audio Pipeline Design

```
Pack → Load Stems → Create Players → Connect to Mixer → Master Out
  ↓         ↓            ↓              ↓               ↓
API    Array.map()   Tone.Player   Gain Nodes    MediaStream → MediaRecorder
```

### Why This Architecture?
1. **Separation of Concerns**
   - API loading isolated
   - Audio setup separated from UI
   - Recording independent of playback

2. **Extensibility**
   - Easy to add effects chains
   - Can insert visualizers
   - Room for server-side rendering

3. **Resource Management**
   - Players reused (not recreated)
   - Proper cleanup on unmount
   - Prevents memory leaks

## Settings Data Model

```typescript
MixerSettings {
  packId: string                    // Unique identifier
  masterVolume: number              // dB (-60 to +6)
  stems: StemSettings[]             // Array of stem configs
  lastModified: ISO string          // Timestamp
}

StemSettings {
  id: string                        // Unique stem ID
  volume: number                    // dB (-60 to +6)
  pan: number                       // -1 (left) to +1 (right)
  isMuted: boolean                  // Mute state
  isSolo: boolean                   // Solo state
  adsr: ADSRSettings                // Envelope (future)
  effects: EffectsSettings          // Effects (future)
}
```

**Why this structure?**
- ✅ Flat/nested balance (JSONable)
- ✅ Easy to serialize/deserialize
- ✅ Extensible for future features
- ✅ Compact in localStorage
- ❌ No computed fields

## Frontend Route Design

**Route: `/studio/:packId`**

**Why single parameterized route?**
- ✅ RESTful convention
- ✅ Handles both pack types
- ✅ URL reflects current context
- ✅ Shareable deep links (future)

**No pack-type parameter:**
- ✅ Reduces URL complexity
- ✅ Auto-detection via API
- ❌ Requires API call to determine type

## Backend Endpoint Design

### POST /api/studio/:packId/export
```
Request Body: Raw audio blob
Response: JSON metadata + download URL
Storage: filesystem

Why raw blob?
- ✅ Simple, no multipart needed
- ✅ Automatic content-type
- ❌ No metadata bundling
```

### GET /api/studio/:packId/recordings
```
Query: packId
Response: List of recordings
Filter: Client-side in packId dirname

Why simple listing?
- ✅ REST convention
- ✅ No database needed
- ❌ Filesystem scanning slower than DB
```

## Error Handling Strategy

### Frontend
```
Network Error
    ↓
Catch + Log
    ↓
Fallback to local download (recording)
    ↓
Display user-friendly message
```

### Backend
```
Validation Error → 400
Not Found → 404
Permission Error → 403
Server Error → 500

All return JSON { error, message, details }
```

## Security Considerations

### File Path Traversal Prevention
```javascript
const normalizedPath = path.normalize(filePath);
if (!normalizedPath.startsWith(config.OUTPUT_DIR)) {
  return 403; // Forbidden
}
```

### CORS for Audio Loading
```javascript
res.setHeader('Access-Control-Allow-Origin', '*');
res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
```

### No Authentication Layer
- Currently public (suitable for demo/education)
- Can add JWT auth layer later
- Settings are client-side only

## Performance Optimization Points

### Already Implemented
- ✅ Lazy Audio Loading (on Play)
- ✅ Stem player reuse (not recreated)
- ✅ localStorage caching
- ✅ Minimal re-renders (React state)

### Future Optimizations
- Debounce localStorage writes (currently synchronous)
- React.memo for stem cards
- Virtualization for 100+ stems
- Web Workers for audio processing
- Preload cover images

## Extensibility Hooks

### 1. **Effects Chain** (Ready)
```typescript
// Structure exists, implement UI + Tone effects
effects: {
  reverb: new Tone.Reverb(),
  delay: new Tone.Delay(),
  chorus: new Tone.Chorus()
}
```

### 2. **Server-Side Rendering** (Ready)
```javascript
// Endpoint skeleton exists
apiRouter.post("/studio/mix", async (req, res) => {
  // Use Tone.OfflineAudioContext for rendering
})
```

### 3. **Visualization** (Ready)
```typescript
// Can add Oscilloscope/FFT from BitcoinAudioDemo
// Already imported in App.tsx
```

### 4. **Mix Versioning** (Database needed)
```typescript
// Requires DB to store multiple versions per pack
// Settings structure supports this
```

## Testing Strategy

### Unit Tests (Future)
- Hook tests: `useStudioSettings`
- Component tests: Individual stem controls
- API tests: Recording endpoint

### Integration Tests
- Pack loading → Studio → Recording flow
- Settings persistence → reload → verify
- Error handling scenarios

### Manual Testing
- Covered in INSPIRA_STUDIO_IMPLEMENTATION.md

## Deployment Checklist

- [ ] Backend: `npm install` in gateway
- [ ] Backend: Verify `/data/output/` writable
- [ ] Frontend: Build passes (`npm run build`)
- [ ] Frontend: No console errors
- [ ] Test on Chrome/Firefox/Safari
- [ ] Test mobile responsiveness
- [ ] Test with real audio files
- [ ] Monitor server storage usage

## Future Roadmap

### Phase 2 (Q2 2026)
- [ ] Effects UI implementation
- [ ] Visual waveform display
- [ ] Frequency analyzer
- [ ] MIDI input support

### Phase 3 (Q3 2026)
- [ ] Server-side WAV export
- [ ] Mix versioning (for validated users)
- [ ] Collaborative mixing
- [ ] Real-time streaming preview

### Phase 4 (Q4 2026)
- [ ] ML-based auto-mixing
- [ ] Loudness normalization
- [ ] Format detection/conversion
- [ ] Integration with DAWs

---

**Architecture Document Version**: 1.0
**Last Updated**: January 13, 2026
**Status**: Production Ready
