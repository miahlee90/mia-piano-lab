/* Piano Lab — exercise data layer. DATA-DRIVEN: the UI never hardcodes an
   exercise; it renders whatever expand() returns.

   PL_MASTERS holds ONE original master score per exercise type (written by /
   approved by the instructor — no textbook material), in C major or A minor,
   with per-hand spellings and default fingering. expand(exId, tonic) produces
   the concrete written-key version: spelled notes (enharmonics preserved via
   PLPitch.transpose), per-hand register placement, and fingering resolved as
     master default → per-key data override → instructor local override.
   A MusicXML importer (phase 2) will populate this same master shape, and a
   per-key MusicXML override slot is reserved (masterFor) for keys where
   automatic transposition is not wanted.

   Step shape: {d:"q|h|w", rh:[spellings], lh:[spellings], fr:[fingers RH],
                fl:[fingers LH], roman:null|"I"|"V7"|…}
   Notes inside a chord are listed LOW → HIGH; fr/fl align by index. */
const PLEx=(()=>{
  const MASTERS={
    "ff-major":{
      id:"ff-major", category:"five-finger", mode:"major", masterTonic:"C",
      titleKey:"ex.ffMajor", time:[4,4], octaves:1, difficulty:1, enabled:true,
      tempo:{default:72,min:40,max:120},
      /* register (instructor 2026-07-17): RH starting tonics run A3 up to
         Ab4 — keys whose tonic is A/Bb/B (≥9 semitones above C) drop one
         octave. LH is always exactly one octave below RH. */
      register:{rh:{shiftDownFrom:9},lh:{shiftDownFrom:9}},
      /* Lesson 1 pattern — scale degrees 1-2-3-4 | 5-4-3-2 | 1
         (two measures of quarters, whole-note tonic to finish) */
      steps:[
        {d:"q", rh:["C4"], lh:["C3"], fr:[1], fl:[5], roman:null},
        {d:"q", rh:["D4"], lh:["D3"], fr:[2], fl:[4], roman:null},
        {d:"q", rh:["E4"], lh:["E3"], fr:[3], fl:[3], roman:null},
        {d:"q", rh:["F4"], lh:["F3"], fr:[4], fl:[2], roman:null},
        {d:"q", rh:["G4"], lh:["G3"], fr:[5], fl:[1], roman:null},
        {d:"q", rh:["F4"], lh:["F3"], fr:[4], fl:[2], roman:null},
        {d:"q", rh:["E4"], lh:["E3"], fr:[3], fl:[3], roman:null},
        {d:"q", rh:["D4"], lh:["D3"], fr:[2], fl:[4], roman:null},
        {d:"w", rh:["C4"], lh:["C3"], fr:[1], fl:[5], roman:null}
      ]
    },
    "ff-major-broken":{
      /* instructor-specified (2026-07-17): pattern + broken triad.
         CDEF | GFED | CEGE | C(whole) */
      id:"ff-major-broken", category:"five-finger", mode:"major", masterTonic:"C",
      titleKey:"ex.ffBroken", time:[4,4], octaves:1, difficulty:2, enabled:true,
      tempo:{default:72,min:40,max:120},
      register:{rh:{shiftDownFrom:9},lh:{shiftDownFrom:9}},
      steps:[
        {d:"q", rh:["C4"], lh:["C3"], fr:[1], fl:[5], roman:null},
        {d:"q", rh:["D4"], lh:["D3"], fr:[2], fl:[4], roman:null},
        {d:"q", rh:["E4"], lh:["E3"], fr:[3], fl:[3], roman:null},
        {d:"q", rh:["F4"], lh:["F3"], fr:[4], fl:[2], roman:null},
        {d:"q", rh:["G4"], lh:["G3"], fr:[5], fl:[1], roman:null},
        {d:"q", rh:["F4"], lh:["F3"], fr:[4], fl:[2], roman:null},
        {d:"q", rh:["E4"], lh:["E3"], fr:[3], fl:[3], roman:null},
        {d:"q", rh:["D4"], lh:["D3"], fr:[2], fl:[4], roman:null},
        {d:"q", rh:["C4"], lh:["C3"], fr:[1], fl:[5], roman:null},
        {d:"q", rh:["E4"], lh:["E3"], fr:[3], fl:[3], roman:null},
        {d:"q", rh:["G4"], lh:["G3"], fr:[5], fl:[1], roman:null},
        {d:"q", rh:["E4"], lh:["E3"], fr:[3], fl:[3], roman:null},
        {d:"w", rh:["C4"], lh:["C3"], fr:[1], fl:[5], roman:null}
      ]
    },
    "ff-minor":{
      id:"ff-minor", category:"five-finger", mode:"minor", masterTonic:"A",
      titleKey:"ex.ffMinor", time:[4,4], octaves:1, difficulty:1, enabled:true,
      tempo:{default:72,min:40,max:120},
      /* minor tonics spelled A..G# all land inside the A3..Ab4 starting
         window from this A3 master — no octave drop needed */
      register:{rh:{shiftDownFrom:12},lh:{shiftDownFrom:12}},
      /* Lesson 2 pattern — scale degrees 1-2-3-4 | 5-4-3-2 | 1 (minor:
         W-H-W-W, half step between the 2nd and 3rd notes) */
      steps:[
        {d:"q", rh:["A3"], lh:["A2"], fr:[1], fl:[5], roman:null},
        {d:"q", rh:["B3"], lh:["B2"], fr:[2], fl:[4], roman:null},
        {d:"q", rh:["C4"], lh:["C3"], fr:[3], fl:[3], roman:null},
        {d:"q", rh:["D4"], lh:["D3"], fr:[4], fl:[2], roman:null},
        {d:"q", rh:["E4"], lh:["E3"], fr:[5], fl:[1], roman:null},
        {d:"q", rh:["D4"], lh:["D3"], fr:[4], fl:[2], roman:null},
        {d:"q", rh:["C4"], lh:["C3"], fr:[3], fl:[3], roman:null},
        {d:"q", rh:["B3"], lh:["B2"], fr:[2], fl:[4], roman:null},
        {d:"w", rh:["A3"], lh:["A2"], fr:[1], fl:[5], roman:null}
      ]
    },
    "ff-minor-broken":{
      /* minor form of the pattern + broken triad: ABCD | EDCB | ACEC | A */
      id:"ff-minor-broken", category:"five-finger", mode:"minor", masterTonic:"A",
      titleKey:"ex.ffBroken", time:[4,4], octaves:1, difficulty:2, enabled:true,
      tempo:{default:72,min:40,max:120},
      register:{rh:{shiftDownFrom:12},lh:{shiftDownFrom:12}},
      steps:[
        {d:"q", rh:["A3"], lh:["A2"], fr:[1], fl:[5], roman:null},
        {d:"q", rh:["B3"], lh:["B2"], fr:[2], fl:[4], roman:null},
        {d:"q", rh:["C4"], lh:["C3"], fr:[3], fl:[3], roman:null},
        {d:"q", rh:["D4"], lh:["D3"], fr:[4], fl:[2], roman:null},
        {d:"q", rh:["E4"], lh:["E3"], fr:[5], fl:[1], roman:null},
        {d:"q", rh:["D4"], lh:["D3"], fr:[4], fl:[2], roman:null},
        {d:"q", rh:["C4"], lh:["C3"], fr:[3], fl:[3], roman:null},
        {d:"q", rh:["B3"], lh:["B2"], fr:[2], fl:[4], roman:null},
        {d:"q", rh:["A3"], lh:["A2"], fr:[1], fl:[5], roman:null},
        {d:"q", rh:["C4"], lh:["C3"], fr:[3], fl:[3], roman:null},
        {d:"q", rh:["E4"], lh:["E3"], fr:[5], fl:[1], roman:null},
        {d:"q", rh:["C4"], lh:["C3"], fr:[3], fl:[3], roman:null},
        {d:"w", rh:["A3"], lh:["A2"], fr:[1], fl:[5], roman:null}
      ]
    },
    /* ---- Unit 2: chord progressions — keyboard-style five-finger-position
       voicings (class-piano standard). Blocked whole-note chords, Roman
       labels. V7 = three notes (3rd, 7th, root of the dominant), e.g. in C:
       B-F-G. Fingering RH 1-3-5 / 1-4-5, LH 5-3-1 / 5-2-1 in every key;
       instructor overrides remain available per key. */
    "prog-1-5-1":{
      id:"prog-1-5-1", category:"progression", mode:"major", masterTonic:"C",
      titleKey:"ex.prog151", time:[4,4], octaves:1, difficulty:2, enabled:true,
      tempo:{default:80,min:40,max:112},
      register:{rh:{shiftDownFrom:9},lh:{shiftDownFrom:9}},
      steps:[
        {d:"w", rh:["C4","E4","G4"], lh:["C3","E3","G3"], fr:[1,3,5], fl:[5,3,1], roman:"I"},
        {d:"w", rh:["B3","F4","G4"], lh:["B2","F3","G3"], fr:[1,4,5], fl:[5,2,1], roman:"V7"},
        {d:"w", rh:["C4","E4","G4"], lh:["C3","E3","G3"], fr:[1,3,5], fl:[5,3,1], roman:"I"}
      ]
    },
    "prog-broken-1-5":{
      /* instructor-specified (2026-07-17): 3/4 broken-then-blocked study.
         m1 broken I (quarters) | m2 blocked I (dotted half) | m3 broken V7 |
         m4 blocked V7 | m5 I | m6 V7 | m7 I */
      id:"prog-broken-1-5", category:"progression", mode:"major", masterTonic:"C",
      titleKey:"ex.progBroken151", time:[3,4], octaves:1, difficulty:2, enabled:true,
      tempo:{default:80,min:40,max:112},
      register:{rh:{shiftDownFrom:9},lh:{shiftDownFrom:9}},
      steps:[
        {d:"q",  rh:["C4"], lh:["C3"], fr:[1], fl:[5], roman:"I"},
        {d:"q",  rh:["E4"], lh:["E3"], fr:[3], fl:[3], roman:null},
        {d:"q",  rh:["G4"], lh:["G3"], fr:[5], fl:[1], roman:null},
        {d:"h.", rh:["C4","E4","G4"], lh:["C3","E3","G3"], fr:[1,3,5], fl:[5,3,1], roman:"I"},
        {d:"q",  rh:["B3"], lh:["B2"], fr:[1], fl:[5], roman:"V7"},
        {d:"q",  rh:["F4"], lh:["F3"], fr:[4], fl:[2], roman:null},
        {d:"q",  rh:["G4"], lh:["G3"], fr:[5], fl:[1], roman:null},
        {d:"h.", rh:["B3","F4","G4"], lh:["B2","F3","G3"], fr:[1,4,5], fl:[5,2,1], roman:"V7"},
        {d:"h.", rh:["C4","E4","G4"], lh:["C3","E3","G3"], fr:[1,3,5], fl:[5,3,1], roman:"I"},
        {d:"h.", rh:["B3","F4","G4"], lh:["B2","F3","G3"], fr:[1,4,5], fl:[5,2,1], roman:"V7"},
        {d:"h.", rh:["C4","E4","G4"], lh:["C3","E3","G3"], fr:[1,3,5], fl:[5,3,1], roman:"I"}
      ]
    },
    "prog-1-4-1":{
      id:"prog-1-4-1", category:"progression", mode:"major", masterTonic:"C",
      titleKey:"ex.prog141", time:[4,4], octaves:1, difficulty:2, enabled:true,
      tempo:{default:80,min:40,max:112},
      register:{rh:{shiftDownFrom:9},lh:{shiftDownFrom:9}},
      steps:[
        {d:"w", rh:["C4","E4","G4"], lh:["C3","E3","G3"], fr:[1,3,5], fl:[5,3,1], roman:"I"},
        {d:"w", rh:["C4","F4","A4"], lh:["C3","F3","A3"], fr:[1,3,5], fl:[5,2,1], roman:"IV"},
        {d:"w", rh:["C4","E4","G4"], lh:["C3","E3","G3"], fr:[1,3,5], fl:[5,3,1], roman:"I"}
      ]
    },
    "prog-1-4-5-1":{
      id:"prog-1-4-5-1", category:"progression", mode:"major", masterTonic:"C",
      titleKey:"ex.prog1451", time:[4,4], octaves:1, difficulty:3, enabled:true,
      tempo:{default:80,min:40,max:112},
      register:{rh:{shiftDownFrom:9},lh:{shiftDownFrom:9}},
      steps:[
        {d:"w", rh:["C4","E4","G4"], lh:["C3","E3","G3"], fr:[1,3,5], fl:[5,3,1], roman:"I"},
        {d:"w", rh:["C4","F4","A4"], lh:["C3","F3","A3"], fr:[1,3,5], fl:[5,2,1], roman:"IV"},
        {d:"w", rh:["C4","E4","G4"], lh:["C3","E3","G3"], fr:[1,3,5], fl:[5,3,1], roman:"I"},
        {d:"w", rh:["B3","F4","G4"], lh:["B2","F3","G3"], fr:[1,4,5], fl:[5,2,1], roman:"V7"},
        {d:"w", rh:["C4","E4","G4"], lh:["C3","E3","G3"], fr:[1,3,5], fl:[5,3,1], roman:"I"}
      ]
    },
    "triad-qualities":{
      /* Unit 3 (instructor 2026-07-17): C - Caug - C - Cm - Cdim.
         One note moves a half step at each quality change; fingering stays
         1-3-5 / 5-3-1. Transposed spellings keep theory exact (F# aug uses
         C-double-sharp, Gb dim uses B-double-flat). */
      id:"triad-qualities", category:"chord-quality", mode:"major", masterTonic:"C",
      titleKey:"ex.triadQual", time:[4,4], octaves:1, difficulty:2, enabled:true,
      tempo:{default:80,min:40,max:112},
      register:{rh:{shiftDownFrom:9},lh:{shiftDownFrom:9}},
      steps:[
        {d:"w", rh:["C4","E4","G4"],   lh:["C3","E3","G3"],   fr:[1,3,5], fl:[5,3,1], roman:"M"},
        {d:"w", rh:["C4","E4","G#4"],  lh:["C3","E3","G#3"],  fr:[1,3,5], fl:[5,3,1], roman:"+"},
        {d:"w", rh:["C4","E4","G4"],   lh:["C3","E3","G3"],   fr:[1,3,5], fl:[5,3,1], roman:"M"},
        {d:"w", rh:["C4","Eb4","G4"],  lh:["C3","Eb3","G3"],  fr:[1,3,5], fl:[5,3,1], roman:"m"},
        {d:"w", rh:["C4","Eb4","Gb4"], lh:["C3","Eb3","Gb3"], fr:[1,3,5], fl:[5,3,1], roman:"°"}
      ]
    },
    "engine-demo":{
      /* NOT a lesson — hidden reference exercise that exercises every rhythm
         element the renderer/player supports (8th/16th + beams, dotted
         quarter, per-hand rests, tie, pickup). Kept enabled:false; the test
         harness renders it, and future lessons copy these step shapes.
         A note spelling ending in "~" is tied to the same pitch in the NEXT
         step. An empty rh/lh array is a rest for that hand. */
      id:"engine-demo", category:"demo", mode:"major", masterTonic:"C",
      titleKey:"ex.engineDemo", time:[4,4], pickup:1, octaves:1, difficulty:0,
      enabled:false, tempo:{default:60,min:40,max:120},
      register:{rh:{shiftDownFrom:9},lh:{shiftDownFrom:9}},
      steps:[
        {d:"q",  rh:["G4"],  lh:[],          fr:[2], fl:[],  roman:null},
        {d:"8",  rh:["C4"],  lh:["C3"],      fr:[1], fl:[5], roman:null},
        {d:"8",  rh:["D4"],  lh:[],          fr:[2], fl:[],  roman:null},
        {d:"q",  rh:[],      lh:["E3"],      fr:[],  fl:[3], roman:null},
        {d:"16", rh:["E4"],  lh:[],          fr:[3], fl:[],  roman:null},
        {d:"16", rh:["F4"],  lh:[],          fr:[4], fl:[],  roman:null},
        {d:"16", rh:["G4"],  lh:[],          fr:[5], fl:[],  roman:null},
        {d:"16", rh:["E4"],  lh:[],          fr:[3], fl:[],  roman:null},
        {d:"q",  rh:["F4"],  lh:["F3"],      fr:[4], fl:[2], roman:null},
        {d:"q.", rh:["G4~"], lh:["G3"],      fr:[5], fl:[1], roman:null},
        {d:"8",  rh:["G4"],  lh:[],          fr:[5], fl:[],  roman:null},
        {d:"h",  rh:["C4"],  lh:["C3","G3"], fr:[1], fl:[5,1], roman:"I"}
      ]
    },
    "scale-major-1oct":{
      /* Unit 4.1 — per-key fingering comes from SCALE_FINGERINGS (standard
         table), NEVER transposed from the C master */
      id:"scale-major-1oct", category:"scale", mode:"major", masterTonic:"C",
      titleKey:"ex.scaleMajor1", time:[4,4], octaves:1, difficulty:2, enabled:true,
      scaleFingering:"1oct",
      tempo:{default:72,min:40,max:120},
      register:{rh:{shiftDownFrom:9},lh:{shiftDownFrom:9}},
      /* original 4-bar design: up, down, hold the tonic.
         Master fingering (thumb crossings) is the standard C/G pattern —
         RH 123 12345, LH 54321 321. */
      steps:[
        {d:"q", rh:["C4"], lh:["C3"], fr:[1], fl:[5], roman:null},
        {d:"q", rh:["D4"], lh:["D3"], fr:[2], fl:[4], roman:null},
        {d:"q", rh:["E4"], lh:["E3"], fr:[3], fl:[3], roman:null},
        {d:"q", rh:["F4"], lh:["F3"], fr:[1], fl:[2], roman:null},
        {d:"q", rh:["G4"], lh:["G3"], fr:[2], fl:[1], roman:null},
        {d:"q", rh:["A4"], lh:["A3"], fr:[3], fl:[3], roman:null},
        {d:"q", rh:["B4"], lh:["B3"], fr:[4], fl:[2], roman:null},
        {d:"q", rh:["C5"], lh:["C4"], fr:[5], fl:[1], roman:null},
        {d:"q", rh:["B4"], lh:["B3"], fr:[4], fl:[2], roman:null},
        {d:"q", rh:["A4"], lh:["A3"], fr:[3], fl:[3], roman:null},
        {d:"q", rh:["G4"], lh:["G3"], fr:[2], fl:[1], roman:null},
        {d:"q", rh:["F4"], lh:["F3"], fr:[1], fl:[2], roman:null},
        {d:"q", rh:["E4"], lh:["E3"], fr:[3], fl:[3], roman:null},
        {d:"q", rh:["D4"], lh:["D3"], fr:[2], fl:[4], roman:null},
        {d:"h", rh:["C4"], lh:["C3"], fr:[1], fl:[5], roman:null}
      ]
    }
  };

  /* Unit 4.2 master — two octaves in eighths (auto-beamed), final half note.
     Built programmatically: 15 up, 13 down, tonic. LH one octave below. */
  (function(){
    const up=["C4","D4","E4","F4","G4","A4","B4","C5","D5","E5","F5","G5","A5","B5","C6"];
    const seq=up.concat(up.slice(0,-1).reverse());
    MASTERS["scale-major-2oct"]={
      id:"scale-major-2oct", category:"scale", mode:"major", masterTonic:"C",
      titleKey:"ex.scaleMajor2", time:[4,4], octaves:2, difficulty:3, enabled:true,
      scaleFingering:"2oct",
      tempo:{default:60,min:40,max:104},
      register:{rh:{shiftDownFrom:9},lh:{shiftDownFrom:9}},
      steps:seq.map((sp,i)=>({
        d:i===seq.length-1?"h":"8",
        rh:[sp], lh:[sp.replace(/\d/,n=>n-1)],
        fr:[1], fl:[1], roman:null
      }))
    };
  })();

  /* STANDARD per-key major-scale fingering (Hanon/ABRSM table) — ascending
     one octave, 8 values per hand. Scales NEVER copy fingering from the
     transposed master; expand() applies this table (then instructor local
     overrides on top). Descending mirrors ascending; two octaves restart the
     pattern each octave (RH) / cross with 4 at the octave (LH). */
  const SCALE_FINGERINGS={
    C :{rh:[1,2,3,1,2,3,4,5], lh:[5,4,3,2,1,3,2,1]},
    G :{rh:[1,2,3,1,2,3,4,5], lh:[5,4,3,2,1,3,2,1]},
    D :{rh:[1,2,3,1,2,3,4,5], lh:[5,4,3,2,1,3,2,1]},
    A :{rh:[1,2,3,1,2,3,4,5], lh:[5,4,3,2,1,3,2,1]},
    E :{rh:[1,2,3,1,2,3,4,5], lh:[5,4,3,2,1,3,2,1]},
    B :{rh:[1,2,3,1,2,3,4,5], lh:[4,3,2,1,4,3,2,1]},
    F :{rh:[1,2,3,4,1,2,3,4], lh:[5,4,3,2,1,3,2,1]},
    Bb:{rh:[4,1,2,3,1,2,3,4], lh:[3,2,1,4,3,2,1,3]},
    Eb:{rh:[3,1,2,3,4,1,2,3], lh:[3,2,1,4,3,2,1,3]},
    Ab:{rh:[3,4,1,2,3,1,2,3], lh:[3,2,1,4,3,2,1,3]},
    Db:{rh:[2,3,1,2,3,4,1,2], lh:[3,2,1,4,3,2,1,3]},
    "F#":{rh:[2,3,4,1,2,3,1,2], lh:[4,3,2,1,3,2,1,4]},
    "Gb":{rh:[2,3,4,1,2,3,1,2], lh:[4,3,2,1,3,2,1,4]}
  };
  /* HARMONIC MINOR scale fingering — instructor's reference chart
     (2026-07-17), ascending one octave per hand. Used by the upcoming
     minor-scales unit; D# and Eb minor share fingering (same keys). */
  const MINOR_SCALE_FINGERINGS={
    A :{rh:[1,2,3,1,2,3,4,5], lh:[5,4,3,2,1,3,2,1]},
    E :{rh:[1,2,3,1,2,3,4,5], lh:[5,4,3,2,1,3,2,1]},
    B :{rh:[1,2,3,1,2,3,4,5], lh:[4,3,2,1,4,3,2,1]},
    "F#":{rh:[3,4,1,2,3,1,2,3], lh:[4,3,2,1,3,2,1,4]},
    "C#":{rh:[3,4,1,2,3,1,2,3], lh:[3,2,1,4,3,2,1,3]},
    "G#":{rh:[3,4,1,2,3,1,2,3], lh:[3,2,1,4,3,2,1,3]},
    "D#":{rh:[3,1,2,3,4,1,2,3], lh:[2,1,4,3,2,1,3,2]},
    "Eb":{rh:[3,1,2,3,4,1,2,3], lh:[2,1,4,3,2,1,3,2]},
    "Bb":{rh:[4,1,2,3,1,2,3,4], lh:[2,1,3,2,1,4,3,2]},
    F :{rh:[1,2,3,4,1,2,3,4], lh:[5,4,3,2,1,3,2,1]},
    C :{rh:[1,2,3,1,2,3,4,5], lh:[5,4,3,2,1,3,2,1]},
    G :{rh:[1,2,3,1,2,3,4,5], lh:[5,4,3,2,1,3,2,1]},
    D :{rh:[1,2,3,1,2,3,4,5], lh:[5,4,3,2,1,3,2,1]}
  };
  /* ARPEGGIO fingering (root position, two octaves ascending: 1-3-5 ×2 +
     top root = 7 values) — instructor's reference chart. For the upcoming
     arpeggio unit. */
  const ARP_FINGERINGS_MAJOR={
    C :{rh:[1,2,3,1,2,3,5], lh:[5,4,2,1,4,2,1]},
    G :{rh:[1,2,3,1,2,3,5], lh:[5,4,2,1,4,2,1]},
    F :{rh:[1,2,3,1,2,3,5], lh:[5,4,2,1,4,2,1]},
    D :{rh:[1,2,3,1,2,3,5], lh:[5,3,2,1,3,2,1]},
    A :{rh:[1,2,3,1,2,3,5], lh:[5,3,2,1,3,2,1]},
    E :{rh:[1,2,3,1,2,3,5], lh:[5,3,2,1,3,2,1]},
    B :{rh:[1,2,3,1,2,3,5], lh:[5,3,2,1,3,2,1]},
    "F#":{rh:[1,2,3,1,2,3,5], lh:[5,3,2,1,3,2,1]},
    "Gb":{rh:[1,2,3,1,2,3,5], lh:[5,3,2,1,3,2,1]},
    "Db":{rh:[4,1,2,4,1,2,4], lh:[2,1,4,2,1,4,2]},
    "Ab":{rh:[4,1,2,4,1,2,4], lh:[2,1,4,2,1,4,2]},
    "Eb":{rh:[4,1,2,4,1,2,4], lh:[2,1,4,2,1,4,2]},
    "Bb":{rh:[4,1,2,4,1,2,4], lh:[3,2,1,3,2,1,3]}
  };
  const ARP_FINGERINGS_MINOR={
    A :{rh:[1,2,3,1,2,3,5], lh:[5,4,2,1,4,2,1]},
    E :{rh:[1,2,3,1,2,3,5], lh:[5,4,2,1,4,2,1]},
    B :{rh:[1,2,3,1,2,3,5], lh:[5,4,2,1,4,2,1]},
    F :{rh:[1,2,3,1,2,3,5], lh:[5,4,2,1,4,2,1]},
    C :{rh:[1,2,3,1,2,3,5], lh:[5,4,2,1,4,2,1]},
    G :{rh:[1,2,3,1,2,3,5], lh:[5,4,2,1,4,2,1]},
    D :{rh:[1,2,3,1,2,3,5], lh:[5,4,2,1,4,2,1]},
    "F#":{rh:[4,1,2,4,1,2,4], lh:[2,1,4,2,1,4,2]},
    "C#":{rh:[4,1,2,4,1,2,4], lh:[2,1,4,2,1,4,2]},
    "G#":{rh:[4,1,2,4,1,2,4], lh:[2,1,4,2,1,4,2]},
    "D#":{rh:[1,2,3,1,2,3,5], lh:[5,3,2,1,3,2,1]},
    "Eb":{rh:[1,2,3,1,2,3,5], lh:[5,3,2,1,3,2,1]},
    "Bb":{rh:[2,3,1,2,3,1,2], lh:[3,2,1,3,2,1,3]}
  };

  function scaleFingerSeq(form,a8,hand){
    const mir=a=>a.concat(a.slice(0,-1).reverse());
    if(form==="1oct") return mir(a8);
    if(hand==="rh"){ const a7=a8.slice(0,7); return mir(a7.concat(a7,[a8[7]])); }
    return mir(a8.concat(a8.slice(1)));
  }

  /* keys available per exercise, in SUGGESTED PROGRESSION order (this order
     drives the Key selector). Five-finger patterns keep the same 1-5 fingering
     in every key, so all 13 written majors are enabled.
     NOTE: the scale is enabled only for C and G on purpose — they share the
     master's thumb-crossing fingering. Black-key scales (F#, Gb, Db, …) use
     DIFFERENT standard fingering, so they must get per-key fingering
     overrides (DATA_FINGERING_OVERRIDES or instructor edits) BEFORE being
     enabled here. Fingering is never blindly transposed as playable truth —
     it is data that the instructor confirms per key. */
  const KEYS_ENABLED={
    "ff-major":["C","G","F","D","Bb","A","Eb","E","Ab","B","Db","F#","Gb"],
    "ff-major-broken":["C","G","F","D","Bb","A","Eb","E","Ab","B","Db","F#","Gb"],
    "ff-minor-broken":["A","E","D","B","G","F#","C","C#","F","G#","Bb","D#","Eb"],
    /* minor progression mirrors the major one via relative minors;
       D# minor and Eb minor are SEPARATE written keys */
    "ff-minor":["A","E","D","B","G","F#","C","C#","F","G#","Bb","D#","Eb"],
    "prog-1-5-1":["C","G","F","D","Bb","A","Eb","E","Ab","B","Db","F#","Gb"],
    "prog-broken-1-5":["C","G","F","D","Bb","A","Eb","E","Ab","B","Db","F#","Gb"],
    "prog-1-4-1":["C","G","F","D","Bb","A","Eb","E","Ab","B","Db","F#","Gb"],
    "prog-1-4-5-1":["C","G","F","D","Bb","A","Eb","E","Ab","B","Db","F#","Gb"],
    "triad-qualities":["C","G","F","D","Bb","A","Eb","E","Ab","B","Db","F#","Gb"],
    "scale-major-1oct":["C","G","F","D","Bb","A","Eb","E","Ab","B","Db","F#","Gb"],
    "scale-major-2oct":["C","G","F","D","Bb","A","Eb","E","Ab","B","Db","F#","Gb"]
  };

  /* teacher key enable/disable (per exercise), stored on this device.
     keysFor() returns the progression order minus teacher-disabled keys. */
  const LS_KEYS="pl-keys-disabled-v1";
  function disabledKeys(){
    try{ return JSON.parse(localStorage.getItem(LS_KEYS))||{}; }catch(e){ return {}; }
  }
  function setKeyEnabled(exId,key,on){
    const d=disabledKeys();
    d[exId]=d[exId]||{};
    if(on) delete d[exId][key]; else d[exId][key]=1;
    localStorage.setItem(LS_KEYS,JSON.stringify(d));
  }
  function keyEnabled(exId,key){ return !(disabledKeys()[exId]||{})[key]; }

  /* per-key data overrides shipped with the site (instructor-authored),
     e.g. PL_FINGERING_OVERRIDES["ff-major"]["Gb"]={rh:{0:[1],…},lh:{…}} */
  const DATA_FINGERING_OVERRIDES={};

  /* instructor local overrides, stored on this device (teacher UI writes here;
     future: sync to server) — shape { exId:{ tonic:{ rh:{step:{note:f}}, lh:{…} } } } */
  const LS_KEY="pl-fingering-v1";
  function localOverrides(){
    try{ return JSON.parse(localStorage.getItem(LS_KEY))||{}; }catch(e){ return {}; }
  }
  function setLocalFingering(exId,tonic,hand,step,note,finger){
    const o=localOverrides();
    ((((o[exId]=o[exId]||{})[tonic]=o[exId][tonic]||{})[hand]=o[exId][tonic][hand]||{})[step]=o[exId][tonic][hand][step]||{})[note]=finger;
    localStorage.setItem(LS_KEY,JSON.stringify(o));
  }
  function clearLocalFingering(){ localStorage.removeItem(LS_KEY); }

  function applyOverride(steps,ov){ /* pure — also unit-tested */
    if(!ov) return steps;
    for(const hand of ["rh","lh"]){
      const fkey=hand==="rh"?"fr":"fl", h=ov[hand];
      if(!h) continue;
      for(const si in h) for(const ni in h[si]){
        if(steps[+si]&&steps[+si][fkey][+ni]!==undefined) steps[+si][fkey][+ni]=h[si][ni];
      }
    }
    return steps;
  }

  function expand(exId,tonic){
    const M=MASTERS[exId];
    if(!M) throw new Error("unknown exercise "+exId);
    const keys=M.mode==="major"?PLPitch.MAJOR_KEYS:PLPitch.MINOR_KEYS;
    const K=keys[tonic];
    if(!K) throw new Error("unknown "+M.mode+" key "+tonic);
    const {ls,ss}=PLPitch.keyInterval(tonic,M.masterTonic);
    const oShift={ rh:(ss>=M.register.rh.shiftDownFrom)?-1:0,
                   lh:(ss>=M.register.lh.shiftDownFrom)?-1:0 };
    const tr=(sp,hand)=>PLPitch.str(PLPitch.addOctave(PLPitch.transpose(sp,ls,ss),oShift[hand]));
    /* "~" suffix on a spelling = tied to the same pitch in the next step;
       stripped here into the rhT/lhT boolean arrays */
    const strip=a=>a.map(x=>x.replace(/~$/,""));
    const ties=a=>a.map(x=>/~$/.test(x));
    const steps=M.steps.map(s=>({
      d:s.d, roman:s.roman||null,
      rh:strip(s.rh).map(sp=>tr(sp,"rh")),
      lh:strip(s.lh).map(sp=>tr(sp,"lh")),
      rhT:ties(s.rh), lhT:ties(s.lh),
      fr:(s.fr||[]).slice(), fl:(s.fl||[]).slice()
    }));
    /* scales: per-key STANDARD fingering from the table (never transposed) */
    if(M.scaleFingering&&SCALE_FINGERINGS[tonic]){
      const T=SCALE_FINGERINGS[tonic];
      const fr=scaleFingerSeq(M.scaleFingering,T.rh,"rh");
      const fl=scaleFingerSeq(M.scaleFingering,T.lh,"lh");
      steps.forEach((s,i)=>{ if(s.rh.length) s.fr=[fr[i]]; if(s.lh.length) s.fl=[fl[i]]; });
    }
    applyOverride(steps,(DATA_FINGERING_OVERRIDES[exId]||{})[tonic]);
    applyOverride(steps,(localOverrides()[exId]||{})[tonic]);
    return { id:exId, tonic, mode:M.mode, sig:K.sig, time:M.time,
             pickup:M.pickup||0, tempo:M.tempo, titleKey:M.titleKey, steps };
  }

  function list(){ return Object.values(MASTERS).filter(m=>m.enabled); }
  function allKeys(exId){ return KEYS_ENABLED[exId]||[]; }
  function keysFor(exId){
    const ks=allKeys(exId).filter(k=>keyEnabled(exId,k));
    return ks.length?ks:allKeys(exId).slice(0,1);   /* never leave zero keys */
  }

  return {MASTERS,expand,list,keysFor,allKeys,keyEnabled,setKeyEnabled,
          applyOverride,setLocalFingering,clearLocalFingering,
          REF:{SCALE_FINGERINGS,MINOR_SCALE_FINGERINGS,
               ARP_FINGERINGS_MAJOR,ARP_FINGERINGS_MINOR}};
})();
if(typeof module!=="undefined") module.exports=PLEx;
