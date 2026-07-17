# Piano Lab (working title)

Interactive piano technique practice system for college-level class piano —
keyboard patterns, fingering, scales, chords, inversions, arpeggios, and basic
progressions in every written key. Original educational product: **no
textbook content is included or reproduced.** Reference materials live in
`reference/`, which is **gitignored and must never be committed**.

Static site — no build step, no external dependencies. Open `index.html` over
http(s). Web MIDI needs Chrome/Edge on https or localhost.

## Architecture
- `js/pitch.js` — spelled-pitch math. Pitches are always written spellings
  (`E#4`, `Cb5`); transposition is by written interval, which preserves
  enharmonics (F♯ ≠ G♭ notation, same MIDI keys). MIDI numbers derived only
  for sound + validation.
- `js/exercises.js` — data-driven exercise layer: one original master per
  exercise type + per-key expansion + fingering resolution
  (default → per-key data override → instructor local override).
  MusicXML import (phase 2) will feed this same shape.
- `js/lessons.js` — lesson metadata (level/number, goal, formula chip,
  exercise reference). The lesson screen renders whatever is here; this is the
  template every technique lesson follows.
- `js/notation.js` — original SVG renderer (single/grand staff, key/time
  signatures, ledger lines, chords, fingering, Roman numerals, per-step
  highlight states).
- `js/piano.js` — on-screen keyboard (RH/LH target colors, correct/wrong,
  clickable fallback). Range always shows complete black-key groups.
- `js/audio.js` — Web Audio piano tone + metronome; single-sound-per-note
  guard; global app-sound switch.
- `js/midi.js` — Web MIDI **input only** (outputs never opened → no feedback
  loops). MIDI cannot detect fingering and is never claimed to.
- `js/player.js` — Learn/demonstration playback (beat scheduler, loop,
  metronome).
- `js/practice.js` — Practice/Test session engine; chords validated as
  simultaneous groups; test mode = count-in + rhythm tolerance scoring.
- `js/progress.js` — localStorage progress (attempts + bests); shaped for a
  future server (Supabase-style RPC) sync.
- `js/i18n.js` + `locales/` — all UI strings; add `ko.js` / `es.js` later.
- `js/app.js` — UI glue only.

## Verify
    ELECTRON_RUN_AS_NODE=1 <electron.exe> tests/verify.js
Checks enharmonic spelling, F♯/G♭ separation, MIDI equivalence, key tables,
fingering overrides, and measure math. Run after any data/engine change.
