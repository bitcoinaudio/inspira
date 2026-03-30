# SamplePacker Gateway — Pack Generation Restructuring Specs

This document specifies the gateway-side changes needed to support the new pack generation model. The frontend (Inspira, Beatfeed) is being updated in parallel to consume these changes.

---

## 1. AceStep v1.5 Full Song Generation

### Requirement
All audio-generating pack workflows must use **AceStep v1.5** as the primary audio model. Instead of generating individual stems, each generation produces a **single mixed audio track** (the "full song") plus a cover image.

### Changes
- Replace MusicGen (or any current stem-generation pipeline) with AceStep v1.5 for all pack workflows:
  - `inspira-packs/*`
  - `nakamotone-flow/*`
  - SuperPack audio (when `includeAudio: true`)
- The ComfyUI workflow (or gateway post-processing) should output **one mixed WAV/MP3 file**, not individual stems.
- Remove stem generation from the default pipeline. The `stems` parameter in `PackJobRequest` should be ignored or deprecated.

### Job Response
The completed job response should include the full song URL:
```json
{
  "job_id": "abc123",
  "status": "completed",
  "outputs": {
    "full_song_url": "/files/audio/full_song_120bpm_Cmin_abc123.wav",
    "image_url": "/files/covers/cover_abc123.png"
  }
}
```

### Manifest Output
The generated Beatfeed manifest must include the full song in `assets`:
```json
{
  "assets": {
    "cover": {
      "kind": "image",
      "url": "{{ASSET_BASE}}/covers/cover_abc123.png",
      "mime": "image/png"
    },
    "full_song": {
      "kind": "audio",
      "url": "{{ASSET_BASE}}/audio/full_song_120bpm_Cmin_abc123.wav",
      "mime": "audio/wav",
      "duration_seconds": 30
    },
    "bundle": { "..." : "..." },
    "previews": []
  },
  "contents": {}
}
```

**Note**: `contents.stems` should be **empty or absent** on initial generation. Stems are added later via on-demand separation.

---

## 2. `pack_type` Field on Jobs

### Requirement
Every job must carry a `pack_type` field that identifies which pack category it belongs to. This replaces the current heuristic-based detection on the frontend.

### Mapping (workflow category -> pack_type)
| Workflow Category | pack_type |
|-------------------|-----------|
| `inspira-packs/*` | `"inspira"` |
| `base-packs/*` | `"base"` |
| `superpack*` | `"superpack"` |
| `nakamotone-flow/*` | `"nakapack"` |
| `audio-workflow/*` | `"inspira"` |
| `general/*` (fallback) | `"inspira"` |

### Implementation
1. On job creation (`POST /api/packs`), derive `pack_type` from the `workflow` parameter's category prefix (text before the first `/`).
2. Store `pack_type` on the job record.
3. Include `pack_type` in the job response and in the generated manifest under `artifact.pack_type`.

### API Filtering
Add `pack_type` query parameter support to these endpoints:
- `GET /api/jobs?pack_type=inspira` — returns only inspira pack jobs
- `GET /api/packs?pack_type=inspira` — returns only inspira packs
- Multiple values: `?pack_type=inspira,superpack` (optional, nice-to-have)

### Backfill
Run a one-time migration on existing job records:
- Jobs with `type === 'bitcoin_image'` or `parameters.blockHeight` exists → `pack_type: "base"`
- Jobs with `type === 'superpack'` → `pack_type: "superpack"`
- Jobs from `nakamotone-flow/*` workflows → `pack_type: "nakapack"`
- All others → `pack_type: "inspira"`

---

## 3. Stem Separation Endpoint (AceStep-Demucs)

### Requirement
Stem separation is now a post-generation, on-demand action. When a user clicks "Get Stems" in the UI, the frontend calls a new gateway endpoint that triggers AceStep-Demucs on the pack's full song.

### New Endpoints

#### `POST /api/packs/:packId/stems`
Triggers stem separation on the pack's full song audio.

**Request**: No body needed (the full song is already stored with the pack).

**Response** (immediate):
```json
{
  "stem_job_id": "stem_abc123",
  "status": "processing",
  "pack_id": "abc123"
}
```

**Behavior**:
1. Look up the pack by `packId`.
2. Retrieve the full song audio file path from `outputs.full_song_url`.
3. Submit an AceStep-Demucs separation job (async).
4. Return immediately with processing status.
5. On completion:
   - Store separated stems at `files/audio/stems/{packId}/drums.wav`, `bass.wav`, `chords.wav`, `melody.wav`, `fx.wav` (or however AceStep-Demucs names them).
   - Update the pack's manifest: add stems to `contents.stems` array.
   - Update the job record to reflect stems are available.

#### `GET /api/packs/:packId/stems`
Returns the current stem separation status and stem URLs if available.

**Response (processing)**:
```json
{
  "status": "processing",
  "pack_id": "abc123",
  "stem_job_id": "stem_abc123"
}
```

**Response (completed)**:
```json
{
  "status": "completed",
  "pack_id": "abc123",
  "stems": [
    { "id": "drums", "title": "Drums", "url": "/files/audio/stems/abc123/drums.wav", "duration_seconds": 30 },
    { "id": "bass", "title": "Bass", "url": "/files/audio/stems/abc123/bass.wav", "duration_seconds": 30 },
    { "id": "other", "title": "Other", "url": "/files/audio/stems/abc123/other.wav", "duration_seconds": 30 },
    { "id": "vocals", "title": "Vocals", "url": "/files/audio/stems/abc123/vocals.wav", "duration_seconds": 30 }
  ]
}
```

**Response (idle — no separation requested yet)**:
```json
{
  "status": "idle",
  "pack_id": "abc123"
}
```

**Response (failed)**:
```json
{
  "status": "failed",
  "pack_id": "abc123",
  "error": "Demucs separation failed: out of memory"
}
```

### Stem Names
AceStep-Demucs (htdemucs model) typically outputs 4 stems: `drums`, `bass`, `other`, `vocals`. Map these to the existing stem convention if needed, or use the Demucs output names directly.

---

## 4. SuperPack Workflow Migration

### Requirement
Migrate the SuperPack workflow definition from `.json` to `.cjs` format to match the other workflow definitions.

### Changes
- Convert `workflows/inspira-packs/superpack.json` (or `workflows/superpack-audio.json`) to `.cjs` format.
- Ensure the gateway's workflow loader handles `.cjs` files for SuperPack.
- Set `pack_type: "superpack"` in the workflow config.
- SuperPack audio should use AceStep v1.5 (replacing MusicGen + Demucs chain from the old `BAudioGenerateMusicGen → BAudioSeparateDemucs` pipeline).
- The SuperPack output should now be: **procedural visuals (image + video) + full song audio** (when `includeAudio: true`). No individual stems on generation.

---

## 5. Manifest Schema Updates

The Beatfeed Manifest v1.0.0 schema should be extended to support:

### `assets.full_song` (new field)
```json
{
  "full_song": {
    "kind": "audio",
    "url": "string (required)",
    "mime": "string (e.g., audio/wav)",
    "duration_seconds": "number",
    "sample_rate_hz": "number (optional)",
    "channels": "number (optional)"
  }
}
```

### `artifact.pack_type` (new field)
```json
{
  "artifact": {
    "type": "sample_pack",
    "pack_type": "inspira",
    "...": "..."
  }
}
```

---

## 6. Scope Exclusions

- **BASE Packs**: No change to audio generation. BASE packs use Tone.js hex-to-note mapping, not AceStep. They do NOT get the "Get Stems" feature.
- **MIDI output**: Separate task, not part of this restructuring.
- **Existing packs with stems**: Legacy packs that already have stems in their manifests continue to work as-is. No migration needed for their audio files.
