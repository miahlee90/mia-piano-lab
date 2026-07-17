/* Piano Lab — spelled-pitch math. A pitch is ALWAYS carried as a written
   spelling (letter + accidental + octave, e.g. "Cb5", "E#4", "F#4"), never as
   a bare MIDI number, so enharmonic written keys (F# Major vs Gb Major,
   D# Minor vs Eb Minor) stay distinct through the whole system. MIDI numbers
   are derived only for sounding and input validation.

   Transposition is by WRITTEN INTERVAL (letter steps + semitones). This is
   what preserves theoretical spelling exactly: transposing the C-major master
   up to F# yields A# (not Bb) for the 3rd and E# (not F) for the 7th; up to
   Gb it yields Cb (not B) for the 4th. */
const PLPitch=(()=>{
  const LETTERS=["C","D","E","F","G","A","B"];
  const PC={C:0,D:2,E:4,F:5,G:7,A:9,B:11};
  const ACC_STR={"-2":"bb","-1":"b","0":"","1":"#","2":"##"};
  const ACC_GLYPH={"-2":"𝄫","-1":"♭","0":"♮","1":"♯","2":"𝄪"};

  function parse(sp){
    if(typeof sp==="object") return sp;
    const m=/^([A-G])(##|bb|#|b)?(-?\d)$/.exec(sp);
    if(!m) throw new Error("bad pitch spelling: "+sp);
    const acc=m[2]==="##"?2:m[2]==="#"?1:m[2]==="b"?-1:m[2]==="bb"?-2:0;
    return {letter:m[1],acc,oct:+m[3]};
  }
  function str(p){ return p.letter+ACC_STR[p.acc]+p.oct; }
  function display(sp){ const p=parse(sp); return p.letter+(p.acc?ACC_GLYPH[p.acc]:""); }
  function midi(sp){ const p=parse(sp); return (p.oct+1)*12+PC[p.letter]+p.acc; }
  function dia(sp){ const p=parse(sp); return p.oct*7+LETTERS.indexOf(p.letter); }

  /* transpose a spelling UP by letterShift letter-steps and semShift semitones */
  function transpose(sp,letterShift,semShift){
    const p=parse(sp);
    const li=LETTERS.indexOf(p.letter)+letterShift;
    const letter=LETTERS[((li%7)+7)%7];
    const oct=p.oct+Math.floor(li/7);
    const acc=(midi(p)+semShift)-((oct+1)*12+PC[letter]);
    if(acc<-2||acc>2) throw new Error("unspellable transposition: "+str(p)+" +"+letterShift+"L/"+semShift+"st");
    return {letter,acc,oct};
  }
  function addOctave(p,n){ return {letter:p.letter,acc:p.acc,oct:p.oct+n}; }

  /* Written keys required by the curriculum. sig: +n sharps / −n flats.
     F# (6♯) and Gb (6♭) are SEPARATE keys; so are D# minor and Eb minor. */
  const MAJOR_KEYS={
    C:{sig:0}, G:{sig:1}, D:{sig:2}, A:{sig:3}, E:{sig:4}, B:{sig:5},
    "F#":{sig:6}, "Gb":{sig:-6}, "Db":{sig:-5}, "Ab":{sig:-4},
    "Eb":{sig:-3}, "Bb":{sig:-2}, F:{sig:-1}
  };
  const MINOR_KEYS={
    A:{sig:0}, E:{sig:1}, B:{sig:2}, "F#":{sig:3}, "C#":{sig:4}, "G#":{sig:5},
    "D#":{sig:6}, "Eb":{sig:-6}, "Bb":{sig:-5}, F:{sig:-4},
    C:{sig:-3}, G:{sig:-2}, D:{sig:-1}
  };

  /* written interval from masterTonic up to tonic, within one octave */
  function keyInterval(tonic,masterTonic){
    const tp=parse(tonic+"0"), mp=parse(masterTonic+"0");
    let ls=LETTERS.indexOf(tp.letter)-LETTERS.indexOf(mp.letter);
    if(ls<0) ls+=7;
    let ss=(PC[tp.letter]+tp.acc)-(PC[mp.letter]+mp.acc);
    ss=((ss%12)+12)%12;
    return {ls,ss};
  }

  /* key-signature accidentals in drawing order */
  const SHARP_ORDER=["F","C","G","D","A","E","B"], FLAT_ORDER=["B","E","A","D","G","C","F"];
  function sigAccidentals(sig){
    return sig>0? SHARP_ORDER.slice(0,sig).map(l=>({letter:l,acc:1}))
         : sig<0? FLAT_ORDER.slice(0,-sig).map(l=>({letter:l,acc:-1}))
         : [];
  }
  /* what the key signature says for a letter: +1, -1 or 0 */
  function sigAccFor(sig,letter){
    const a=sigAccidentals(sig).find(x=>x.letter===letter);
    return a?a.acc:0;
  }

  return {LETTERS,parse,str,display,midi,dia,transpose,addOctave,
          MAJOR_KEYS,MINOR_KEYS,keyInterval,sigAccidentals,sigAccFor,ACC_GLYPH};
})();
if(typeof module!=="undefined") module.exports=PLPitch;
