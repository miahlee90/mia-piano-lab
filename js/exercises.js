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
      tempo:{default:72,min:40,max:144},
      /* register: transposed start stays near the master register; keys whose
         semitone offset ≥ shiftDownFrom are dropped one octave (keeps RH on the
         treble staff, LH on the bass staff without heavy ledger lines) */
      register:{rh:{shiftDownFrom:12},lh:{shiftDownFrom:6}},
      /* original 4-bar design: steps up, steps down, tonic, blocked chord */
      steps:[
        {d:"q", rh:["C4"], lh:["C3"], fr:[1], fl:[5], roman:null},
        {d:"q", rh:["D4"], lh:["D3"], fr:[2], fl:[4], roman:null},
        {d:"q", rh:["E4"], lh:["E3"], fr:[3], fl:[3], roman:null},
        {d:"q", rh:["F4"], lh:["F3"], fr:[4], fl:[2], roman:null},
        {d:"q", rh:["G4"], lh:["G3"], fr:[5], fl:[1], roman:null},
        {d:"q", rh:["F4"], lh:["F3"], fr:[4], fl:[2], roman:null},
        {d:"q", rh:["E4"], lh:["E3"], fr:[3], fl:[3], roman:null},
        {d:"q", rh:["D4"], lh:["D3"], fr:[2], fl:[4], roman:null},
        {d:"w", rh:["C4"], lh:["C3"], fr:[1], fl:[5], roman:null},
        {d:"w", rh:["C4","E4","G4"], lh:["C3","E3","G3"], fr:[1,3,5], fl:[5,3,1], roman:"I"}
      ]
    },
    "scale-major-1oct":{
      id:"scale-major-1oct", category:"scale", mode:"major", masterTonic:"C",
      titleKey:"ex.scaleMajor1", time:[4,4], octaves:1, difficulty:2, enabled:true,
      tempo:{default:60,min:40,max:132},
      register:{rh:{shiftDownFrom:12},lh:{shiftDownFrom:6}},
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

  /* keys currently enabled per exercise (instructor-controlled; all 13 written
     majors / 13 written minors are supported by the data model).
     NOTE: the scale is enabled only for C and G on purpose — they share the
     master's thumb-crossing fingering. Black-key scales (F#, Gb, Db, …) use
     DIFFERENT standard fingering, so they must get per-key fingering
     overrides (DATA_FINGERING_OVERRIDES or instructor edits) BEFORE being
     enabled here. Fingering is never blindly transposed as playable truth —
     it is data that the instructor confirms per key. */
  const KEYS_ENABLED={ "ff-major":["C","F#","Gb"], "scale-major-1oct":["C","G"] };

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
    const steps=M.steps.map(s=>({
      d:s.d, roman:s.roman,
      rh:s.rh.map(sp=>tr(sp,"rh")),
      lh:s.lh.map(sp=>tr(sp,"lh")),
      fr:s.fr.slice(), fl:s.fl.slice()
    }));
    applyOverride(steps,(DATA_FINGERING_OVERRIDES[exId]||{})[tonic]);
    applyOverride(steps,(localOverrides()[exId]||{})[tonic]);
    return { id:exId, tonic, mode:M.mode, sig:K.sig, time:M.time,
             tempo:M.tempo, titleKey:M.titleKey, steps };
  }

  function list(){ return Object.values(MASTERS).filter(m=>m.enabled); }
  function keysFor(exId){ return KEYS_ENABLED[exId]||[]; }

  return {MASTERS,expand,list,keysFor,applyOverride,setLocalFingering,clearLocalFingering};
})();
if(typeof module!=="undefined") module.exports=PLEx;
