/* Piano Lab — logic verification harness (runs under node / Electron-as-node).
   Usage:  ELECTRON_RUN_AS_NODE=1 <electron> tests/verify.js
   Proves the acceptance-critical invariants of the data layer:
   enharmonic written keys stay distinct, spelling is theoretically correct,
   MIDI validation maps enharmonics to the same physical keys, and fingering
   overrides apply cleanly. */
const PLPitch=require("../js/pitch.js");   global.PLPitch=PLPitch;
global.localStorage={_d:{},getItem(k){return k in this._d?this._d[k]:null;},
  setItem(k,v){this._d[k]=String(v);},removeItem(k){delete this._d[k];}};
const PLEx=require("../js/exercises.js");

let fails=0, tests=0;
function eq(name,got,want){
  tests++;
  const g=JSON.stringify(got), w=JSON.stringify(want);
  if(g!==w){ fails++; console.log("  FAIL "+name+"\n    got  "+g+"\n    want "+w); }
}
function ok(name,cond){ tests++; if(!cond){ fails++; console.log("  FAIL "+name); } }

/* ---- pitch basics ---- */
eq("midi C4",PLPitch.midi("C4"),60);
eq("midi Cb4 = B3",PLPitch.midi("Cb4"),59);
eq("midi E#4 = F4",PLPitch.midi("E#4"),65);
eq("midi F#4 == Gb4",PLPitch.midi("F#4"),PLPitch.midi("Gb4"));

/* ---- written-interval transposition preserves spelling ---- */
const fs=PLPitch.keyInterval("F#","C"), gb=PLPitch.keyInterval("Gb","C");
eq("C->F# interval",fs,{ls:3,ss:6});
eq("C->Gb interval",gb,{ls:4,ss:6});
eq("3rd of F# is A# (never Bb)",PLPitch.str(PLPitch.transpose("E4",fs.ls,fs.ss)),"A#4");
eq("7th of F# is E# (never F)",PLPitch.str(PLPitch.transpose("B3",fs.ls,fs.ss)),"E#4");
eq("4th of Gb is Cb (never B)",PLPitch.str(PLPitch.transpose("F4",gb.ls,gb.ss)),"Cb5");

/* ---- all 13 written major + 13 written minor keys expandable ---- */
for(const k in PLPitch.MAJOR_KEYS){
  const s=PLPitch.transpose("C4",PLPitch.keyInterval(k,"C").ls,PLPitch.keyInterval(k,"C").ss);
  ok("major tonic spelling "+k, (s.letter+({"-1":"b","1":"#","0":"","2":"##","-2":"bb"})[s.acc])===k);
}
for(const k in PLPitch.MINOR_KEYS){
  const iv=PLPitch.keyInterval(k,"A");
  const s=PLPitch.transpose("A3",iv.ls,iv.ss);
  ok("minor tonic spelling "+k, (s.letter+({"-1":"b","1":"#","0":"","2":"##","-2":"bb"})[s.acc])===k);
}

/* ---- key signatures ---- */
eq("F# major: 6 sharps",PLPitch.MAJOR_KEYS["F#"].sig,6);
eq("Gb major: 6 flats",PLPitch.MAJOR_KEYS["Gb"].sig,-6);
eq("D# minor: 6 sharps",PLPitch.MINOR_KEYS["D#"].sig,6);
eq("Eb minor: 6 flats",PLPitch.MINOR_KEYS["Eb"].sig,-6);
eq("sig 6 accidentals",PLPitch.sigAccidentals(6).map(a=>a.letter),["F","C","G","D","A","E"]);
eq("sig -6 accidentals",PLPitch.sigAccidentals(-6).map(a=>a.letter),["B","E","A","D","G","C"]);

/* ---- vertical prototype: C / F# / Gb five-finger ---- */
const C=PLEx.expand("ff-major","C");
const FS=PLEx.expand("ff-major","F#");
const GB=PLEx.expand("ff-major","Gb");
eq("C RH ascent",C.steps.slice(0,5).map(s=>s.rh[0]),["C4","D4","E4","F4","G4"]);
eq("F# RH ascent",FS.steps.slice(0,5).map(s=>s.rh[0]),["F#4","G#4","A#4","B4","C#5"]);
eq("Gb RH ascent",GB.steps.slice(0,5).map(s=>s.rh[0]),["Gb4","Ab4","Bb4","Cb5","Db5"]);
ok("Gb never respelled to B",!GB.steps.some(s=>s.rh.concat(s.lh).some(sp=>sp.startsWith("B")&&!sp.startsWith("Bb"))));
eq("F#/Gb same physical keys (RH)",
   FS.steps.map(s=>s.rh.map(PLPitch.midi)), GB.steps.map(s=>s.rh.map(PLPitch.midi)));
eq("F#/Gb same physical keys (LH)",
   FS.steps.map(s=>s.lh.map(PLPitch.midi)), GB.steps.map(s=>s.lh.map(PLPitch.midi)));
ok("F#/Gb different notation",JSON.stringify(FS.steps)!==JSON.stringify(GB.steps));
eq("Gb LH one octave below RH",GB.steps[0].lh,["Gb3"]);
eq("C LH stays at C3",C.steps[0].lh,["C3"]);

/* ---- register rule: RH starting tonics run A3..Ab4, LH one octave lower ---- */
eq("C RH starts C4",C.steps[0].rh,["C4"]);
eq("Ab RH starts Ab4",PLEx.expand("ff-major","Ab").steps[0].rh,["Ab4"]);
eq("A RH starts A3",PLEx.expand("ff-major","A").steps[0].rh,["A3"]);
eq("Bb RH starts Bb3",PLEx.expand("ff-major","Bb").steps[0].rh,["Bb3"]);
eq("B RH starts B3",PLEx.expand("ff-major","B").steps[0].rh,["B3"]);
eq("A LH starts A2",PLEx.expand("ff-major","A").steps[0].lh,["A2"]);
eq("lesson pattern: 9 steps (1234|5432|1)",C.steps.length,9);
eq("final step is a whole note on the tonic",[C.steps[8].d,C.steps[8].rh[0]],["w","C4"]);

/* ---- fingering: defaults + override precedence ---- */
eq("RH default fingering",C.steps.slice(0,5).map(s=>s.fr[0]),[1,2,3,4,5]);
eq("RH descending fingering",C.steps.slice(4,9).map(s=>s.fr[0]),[5,4,3,2,1]);
eq("LH default fingering",C.steps.slice(0,5).map(s=>s.fl[0]),[5,4,3,2,1]);
eq("LH descending fingering",C.steps.slice(4,9).map(s=>s.fl[0]),[1,2,3,4,5]);
const ovSteps=PLEx.expand("ff-major","F#").steps;
PLEx.applyOverride(ovSteps,{rh:{0:{0:2}},lh:{8:{0:4}}});
eq("override RH step0",ovSteps[0].fr[0],2);
eq("override LH final",ovSteps[8].fl[0],4);
eq("override leaves others",ovSteps[1].fr[0],2); /* step1 default = 2 */

/* ---- durations fill 4/4 measures ---- */
const beats=C.steps.reduce((a,s)=>a+({w:4,h:2,q:1})[s.d],0);
eq("total beats = 3 measures of 4/4",beats,12);

/* ---- REQUIRED KEYS: exact note names for all 13 written majors ---- */
const EXPECT={C:"C D E F G",G:"G A B C D",D:"D E F# G A",A:"A B C# D E",
  E:"E F# G# A B",B:"B C# D# E F#","F#":"F# G# A# B C#","Gb":"Gb Ab Bb Cb Db",
  "Db":"Db Eb F Gb Ab","Ab":"Ab Bb C Db Eb","Eb":"Eb F G Ab Bb",
  "Bb":"Bb C D Eb F",F:"F G A Bb C"};
for(const k in EXPECT){
  const ex=PLEx.expand("ff-major",k);
  eq("ff "+k+" spelling",ex.steps.slice(0,5).map(s=>s.rh[0].replace(/\d/,"")).join(" "),EXPECT[k]);
  const m=ex.steps.slice(0,5).map(s=>PLPitch.midi(s.rh[0]));
  eq("ff "+k+" is W-W-H-W",[m[1]-m[0],m[2]-m[1],m[3]-m[2],m[4]-m[3]],[2,2,1,2]);
  eq("ff "+k+" LH mirrors RH an octave lower",
     ex.steps.map(s=>PLPitch.midi(s.rh[0])-PLPitch.midi(s.lh[0])).every(d=>d===12),true);
}
eq("13 keys in suggested-progression order",PLEx.allKeys("ff-major"),
   ["C","G","F","D","Bb","A","Eb","E","Ab","B","Db","F#","Gb"]);

/* ---- pattern + broken triad (instructor spec: CDEF|GFED|CEGE|C) ---- */
const FB=PLEx.expand("ff-major-broken","C");
eq("broken-triad ex: 13 steps",FB.steps.length,13);
eq("broken-triad measure",FB.steps.slice(8,12).map(s=>s.rh[0]),["C4","E4","G4","E4"]);
eq("broken-triad fingering",FB.steps.slice(8,12).map(s=>s.fr[0]),[1,3,5,3]);
eq("broken-triad beats = 4 bars of 4/4",
   FB.steps.reduce((a,s)=>a+({w:4,h:2,q:1})[s.d],0),16);
eq("broken-triad in F#",PLEx.expand("ff-major-broken","F#").steps.slice(8,12).map(s=>s.rh[0]),
   ["F#4","A#4","C#5","A#4"]);
const FBm=PLEx.expand("ff-minor-broken","A");
eq("minor broken-triad measure",FBm.steps.slice(8,12).map(s=>s.rh[0]),["A3","C4","E4","C4"]);
eq("minor broken-triad in D# keeps E#",
   PLEx.expand("ff-minor-broken","D#").steps[1].rh,["E#4"]);
["ff-major-broken","ff-minor-broken"].forEach(ex=>{
  ok(ex+" enabled for 13 keys",PLEx.allKeys(ex).length===13);
  for(const k of PLEx.allKeys(ex)) PLEx.expand(ex,k);
});
eq("lesson 1.1 exercises",PLLessonsPeek("l1-1"),["ff-major","ff-major-broken"]);
eq("lesson 1.2 exercises",PLLessonsPeek("l1-2"),["ff-minor","ff-minor-broken"]);
function PLLessonsPeek(id){ return require("../js/lessons.js").get(id).exercises; }

/* ---- Lesson 2: minor five-finger — all 13 written minor keys ---- */
const AM=PLEx.expand("ff-minor","A");
eq("A minor RH (A3 start)",AM.steps.slice(0,5).map(s=>s.rh[0]),["A3","B3","C4","D4","E4"]);
eq("A minor LH one octave below",AM.steps[0].lh,["A2"]);
eq("minor pattern: 9 steps",AM.steps.length,9);
const MEXPECT={A:"A B C D E",E:"E F# G A B",B:"B C# D E F#","F#":"F# G# A B C#",
  "C#":"C# D# E F# G#","G#":"G# A# B C# D#","D#":"D# E# F# G# A#","Eb":"Eb F Gb Ab Bb",
  "Bb":"Bb C Db Eb F",F:"F G Ab Bb C",C:"C D Eb F G",G:"G A Bb C D",D:"D E F G A"};
for(const k in MEXPECT){
  const ex=PLEx.expand("ff-minor",k);
  eq("ffm "+k+" spelling",ex.steps.slice(0,5).map(s=>s.rh[0].replace(/\d/,"")).join(" "),MEXPECT[k]);
  const m=ex.steps.slice(0,5).map(s=>PLPitch.midi(s.rh[0]));
  eq("ffm "+k+" is W-H-W-W",[m[1]-m[0],m[2]-m[1],m[3]-m[2],m[4]-m[3]],[2,1,2,2]);
  eq("ffm "+k+" LH mirrors RH an octave lower",
     ex.steps.map(s=>PLPitch.midi(s.rh[0])-PLPitch.midi(s.lh[0])).every(d=>d===12),true);
}
const DSM=PLEx.expand("ff-minor","D#"), EBM=PLEx.expand("ff-minor","Eb");
eq("D#m/Ebm same physical keys",
   DSM.steps.map(s=>s.rh.map(PLPitch.midi)),EBM.steps.map(s=>s.rh.map(PLPitch.midi)));
ok("D#m/Ebm different notation",JSON.stringify(DSM.steps)!==JSON.stringify(EBM.steps));
ok("D# minor uses E# (never F)",DSM.steps.some(s=>s.rh[0]==="E#4"));
eq("13 minor keys in progression order",PLEx.allKeys("ff-minor"),
   ["A","E","D","B","G","F#","C","C#","F","G#","Bb","D#","Eb"]);

/* ---- Unit 2 minor progressions + extended progression ---- */
const PM=PLEx.expand("prog-m-1-5-1","A");
eq("minor i-V7-i chords",PM.steps.map(s=>s.rh),
   [["A3","C4","E4"],["G#3","D4","E4"],["A3","C4","E4"]]);
eq("minor romans lowercase",PM.steps.map(s=>s.roman),["i","V7","i"]);
eq("D minor V7 raises to C#",PLEx.expand("prog-m-1-5-1","D").steps[1].rh,
   ["C#4","G4","A4"]);
eq("Eb minor V7 raises to D natural",PLEx.expand("prog-m-1-5-1","Eb").steps[1].rh,
   ["D4","Ab4","Bb4"]);
eq("minor iv chord",PLEx.expand("prog-m-1-4-1","A").steps[1].rh,["A3","D4","F4"]);
const EXT=PLEx.expand("prog-ext-major","C");
eq("extended progression romans",EXT.steps.map(s=>s.roman),
   ["I","vi","IV","ii6","I6/4","V7","I"]);
eq("extended bass walk",EXT.steps.map(s=>s.lh[0]),
   ["C3","A2","F2","F2","G2","G2","C3"]);
eq("extended bass fingering",EXT.steps.map(s=>s.fl[0]),[1,3,5,5,4,4,1]);
const EXTm=PLEx.expand("prog-ext-minor","A");
eq("extended minor romans",EXTm.steps.map(s=>s.roman),
   ["i","VI","iv","ii°6","i6/4","V7","i"]);
eq("extended minor V7 has G#",EXTm.steps[5].rh,["E4","G#4","D5"]);
["prog-m-1-5-1","prog-m-broken-1-5","prog-m-1-4-1","prog-m-1-4-5-1",
 "prog-ext-major","prog-ext-minor"].forEach(ex=>{
  ok(ex+" enabled for 13 keys",PLEx.allKeys(ex).length===13);
  for(const k of PLEx.allKeys(ex)) PLEx.expand(ex,k);
});
eq("lesson 2.1 has major+minor pairs",PLLessonsPeek("l2-1").length,4);
eq("lesson 2.4 has both modes",PLLessonsPeek("l2-4"),
   ["prog-ext-major","prog-ext-minor"]);

/* ---- Unit 3: triad qualities (M - aug - M - m - dim on one root) ---- */
const TQ=PLEx.expand("triad-qualities","C");
eq("qualities in C",TQ.steps.map(s=>s.rh),
   [["C4","E4","G4"],["C4","E4","G#4"],["C4","E4","G4"],["C4","Eb4","G4"],["C4","Eb4","Gb4"]]);
eq("quality labels",TQ.steps.map(s=>s.roman),["M","+","M","m","°"]);
eq("F# augmented uses C-double-sharp",PLEx.expand("triad-qualities","F#").steps[1].rh,
   ["F#4","A#4","C##5"]);
eq("Gb diminished uses double-flats",PLEx.expand("triad-qualities","Gb").steps[4].rh,
   ["Gb4","Bbb4","Dbb5"]);
eq("F# diminished spelled F#-A-C",PLEx.expand("triad-qualities","F#").steps[4].rh,
   ["F#4","A4","C5"]);
ok("triad qualities enabled for 13 keys",PLEx.allKeys("triad-qualities").length===13);
for(const k of PLEx.allKeys("triad-qualities")) PLEx.expand("triad-qualities",k);

/* ---- Lesson 3.2: seventh-chord qualities ---- */
const SQ=PLEx.expand("seventh-qualities","C");
eq("7th qualities in C (connected chain)",SQ.steps.map(s=>s.rh),
   [["C4","E4","G4","C5"],["C4","E4","G4","B4"],["C4","E4","G4","Bb4"],
    ["C4","Eb4","G4","Bb4"],["C4","Eb4","Gb4","Bb4"],["C4","Eb4","Gb4","Bbb4"]]);
eq("7th quality labels",SQ.steps.map(s=>s.roman),["M","maj7","7","m7","m7♭5","°7"]);
eq("7th chord fingering RH/LH",[SQ.steps[1].fr,SQ.steps[1].fl],[[1,2,3,5],[5,3,2,1]]);
/* the chain property itself: exactly ONE note changes at every step */
ok("exactly one note moves per change",SQ.steps.slice(1).every((s,i)=>{
  const prev=SQ.steps[i].rh;
  return s.rh.filter((sp,j)=>sp!==prev[j]).length===1;
}));
eq("F# dim7 spells Eb (dim 7th above F#)",
   PLEx.expand("seventh-qualities","F#").steps[5].rh,["F#4","A4","C5","Eb5"]);
eq("Gb dim7 spells Fbb",
   PLEx.expand("seventh-qualities","Gb").steps[5].rh,["Gb4","Bbb4","Dbb5","Fbb5"]);
for(const k of PLEx.allKeys("seventh-qualities")) PLEx.expand("seventh-qualities",k);

/* ---- rhythm-element data layer (engine-demo) ---- */
const PLNot=require("../js/notation.js"); global.PLNotation=PLNot;
const D=PLEx.expand("engine-demo","C");
eq("demo total beats (pickup 1 + 4 + 4)",
   D.steps.reduce((a,s)=>a+PLNot.beatsOf(s.d),0),9);
eq("demo pickup carried",D.pickup,1);
eq("tie flag set on the dotted quarter",D.steps[9].rhT,[true]);
eq("tie suffix stripped from the spelling",D.steps[9].rh,["G4"]);
ok("rest step has empty RH",D.steps[3].rh.length===0&&D.steps[3].lh.length===1);
eq("dotted quarter counts 1.5 beats",PLNot.beatsOf("q."),1.5);
eq("16th counts .25 beats",PLNot.beatsOf("16"),.25);
eq("demo transposes with ties intact",PLEx.expand("engine-demo","D").steps[9].rh,["A4"]);

/* ---- curriculum structure (Unit.Lesson labels, Fundamentals style) ---- */
const PLLessons=require("../js/lessons.js");
eq("lesson labels",PLLessons.list().map(l=>l.label),
   ["1.1","1.2","2.1","2.2","2.3","2.4","3.1","3.2","4.1","4.2","5.1","5.2",
    "6.1","6.2","7.1","7.2","8.1","8.2","8.3","8.4","8.5"]);
eq("lesson units",PLLessons.list().map(l=>l.unit),
   [1,1,2,2,2,2,3,3,4,4,5,5,6,6,7,7,8,8,8,8,8]);
eq("units defined",PLLessons.units().map(u=>u.unit),[1,2,3,4,5,6,7,8]);
ok("every lesson's exercises exist",
   PLLessons.list().every(l=>l.exercises.every(id=>PLEx.MASTERS[id])));

/* ---- Unit 2: chord progressions (keyboard-style voicings) ---- */
const P51=PLEx.expand("prog-1-5-1","C");
eq("I chord spelling",P51.steps[0].rh,["C4","E4","G4"]);
eq("V7 chord spelling (3-note keyboard style)",P51.steps[1].rh,["B3","F4","G4"]);
eq("progression romans",P51.steps.map(s=>s.roman),["I","V7","I"]);
eq("RH fingering I / V7",[P51.steps[0].fr,P51.steps[1].fr],[[1,3,5],[1,4,5]]);
eq("LH fingering I / V7",[P51.steps[0].fl,P51.steps[1].fl],[[5,3,1],[5,2,1]]);
ok("prog LH exactly one octave below RH",
   P51.steps.every(s=>s.rh.every((sp,i)=>PLPitch.midi(sp)-PLPitch.midi(s.lh[i])===12)));
eq("V7 in F# keeps E# (never F)",PLEx.expand("prog-1-5-1","F#").steps[1].rh,["E#4","B4","C#5"]);
eq("V7 in Gb keeps Cb (never B)",PLEx.expand("prog-1-5-1","Gb").steps[1].rh,["F4","Cb5","Db5"]);
eq("IV chord spelling",PLEx.expand("prog-1-4-1","C").steps[1].rh,["C4","F4","A4"]);
eq("IV chord RH fingering 1-3-5 (instructor)",PLEx.expand("prog-1-4-1","C").steps[1].fr,[1,3,5]);
eq("IV in full cadence also 1-3-5",PLEx.expand("prog-1-4-5-1","C").steps[1].fr,[1,3,5]);
eq("full cadence romans",PLEx.expand("prog-1-4-5-1","C").steps.map(s=>s.roman),
   ["I","IV","I","V7","I"]);
eq("A major progression drops an octave",PLEx.expand("prog-1-5-1","A").steps[0].rh,
   ["A3","C#4","E4"]);
["prog-1-5-1","prog-broken-1-5","prog-1-4-1","prog-1-4-5-1"].forEach(ex=>{
  ok(ex+" enabled for all 13 majors",PLEx.allKeys(ex).length===13);
  for(const k of PLEx.allKeys(ex)) PLEx.expand(ex,k);   /* throws on bad data */
});

/* ---- broken & blocked study (instructor spec: 3/4, 7 measures) ---- */
const BB=PLEx.expand("prog-broken-1-5","C");
eq("broken study: 3/4",BB.time,[3,4]);
eq("broken study: 11 steps",BB.steps.length,11);
eq("broken study: 21 beats (7 bars of 3/4)",
   BB.steps.reduce((a,s)=>a+PLNot.beatsOf(s.d),0),21);
eq("m1 broken I",BB.steps.slice(0,3).map(s=>s.rh[0]),["C4","E4","G4"]);
eq("m1 broken fingering",BB.steps.slice(0,3).map(s=>s.fr[0]),[1,3,5]);
eq("m3 broken V7",BB.steps.slice(4,7).map(s=>s.rh[0]),["B3","F4","G4"]);
eq("m2 blocked I is a dotted half",[BB.steps[3].d,BB.steps[3].rh],["h.",["C4","E4","G4"]]);
eq("roman sequence",BB.steps.map(s=>s.roman).filter(Boolean),["I","I","V7","V7","I","V7","I"]);
eq("broken V7 in F# keeps E#",PLEx.expand("prog-broken-1-5","F#").steps[4].rh,["E#4"]);
eq("lesson 2.1 pairs major and minor",PLLessons.get("l2-1").exercises,
   ["prog-1-5-1","prog-m-1-5-1","prog-broken-1-5","prog-m-broken-1-5"]);

/* ---- teacher key enable/disable ---- */
PLEx.setKeyEnabled("ff-major","B",false);
ok("teacher can disable a key",!PLEx.keysFor("ff-major").includes("B"));
PLEx.setKeyEnabled("ff-major","B",true);
ok("teacher can re-enable a key",PLEx.keysFor("ff-major").includes("B"));

/* ---- major scale, one octave (C and G share master fingering) ---- */
const SC=PLEx.expand("scale-major-1oct","C");
const SG=PLEx.expand("scale-major-1oct","G");
eq("C scale notes (top tonic repeated)",SC.steps.map(s=>s.rh[0]),
   ["C4","D4","E4","F4","G4","A4","B4","C5","C5","B4","A4","G4","F4","E4","D4","C4"]);
eq("C scale RH fingering (thumb crossings)",SC.steps.map(s=>s.fr[0]),
   [1,2,3,1,2,3,4,5,5,4,3,2,1,3,2,1]);
eq("C scale LH fingering",SC.steps.map(s=>s.fl[0]),
   [5,4,3,2,1,3,2,1,1,2,3,1,2,3,4,5]);
eq("G scale has F#5",SG.steps[6].rh[0],"F#5");
eq("G scale LH one octave below RH",SG.steps[0].lh[0],"G3");
eq("scale beats = 4 measures of 4/4",
   SC.steps.reduce((a,s)=>a+({w:4,h:2,q:1})[s.d],0),16);

/* ---- Unit 4: per-key STANDARD scale fingering (never transposed) ---- */
const SEQ=(a)=>a.concat(a.slice().reverse());   /* top tonic repeats (1-oct) */
const FEXP={
  F :{rh:[1,2,3,4,1,2,3,4], lh:[5,4,3,2,1,3,2,1]},
  Bb:{rh:[4,1,2,3,1,2,3,4], lh:[3,2,1,4,3,2,1,3]},
  Eb:{rh:[3,1,2,3,4,1,2,3], lh:[3,2,1,4,3,2,1,3]},
  Ab:{rh:[3,4,1,2,3,1,2,3], lh:[3,2,1,4,3,2,1,3]},
  Db:{rh:[2,3,1,2,3,4,1,2], lh:[3,2,1,4,3,2,1,3]},
  "F#":{rh:[2,3,4,1,2,3,1,2], lh:[4,3,2,1,3,2,1,4]},
  "Gb":{rh:[2,3,4,1,2,3,1,2], lh:[4,3,2,1,3,2,1,4]},
  B :{rh:[1,2,3,1,2,3,4,5], lh:[4,3,2,1,4,3,2,1]}
};
for(const k in FEXP){
  const ex=PLEx.expand("scale-major-1oct",k);
  eq("scale "+k+" RH fingering",ex.steps.map(s=>s.fr[0]),SEQ(FEXP[k].rh));
  eq("scale "+k+" LH fingering",ex.steps.map(s=>s.fl[0]),SEQ(FEXP[k].lh));
}
ok("1-oct scale enabled for 13 keys",PLEx.allKeys("scale-major-1oct").length===13);
eq("F# scale spelling incl E#",
   PLEx.expand("scale-major-1oct","F#").steps.slice(0,8).map(s=>s.rh[0].replace(/\d/,"")).join(" "),
   "F# G# A# B C# D# E# F#");
eq("Gb scale spelling incl Cb",
   PLEx.expand("scale-major-1oct","Gb").steps.slice(0,8).map(s=>s.rh[0].replace(/\d/,"")).join(" "),
   "Gb Ab Bb Cb Db Eb F Gb");

/* two octaves: quarters, 8 bars, top tonic repeated and held (CDEF|GABC|
   DEFG|AB C-half|CBAG|FEDC|BAGF|ED C-half) */
const S2=PLEx.expand("scale-major-2oct","C");
eq("2-oct: 30 steps",S2.steps.length,30);
eq("2-oct beats = 8 bars of 4/4",S2.steps.reduce((a,s)=>a+(s.d==="h"?2:1),0),32);
eq("2-oct peak held",[S2.steps[14].rh[0],S2.steps[14].d],["C6","h"]);
eq("2-oct peak repeated to start the descent",
   [S2.steps[15].rh[0],S2.steps[15].d,S2.steps[15].fr[0]],["C6","q",5]);
eq("2-oct RH fingering (pattern restarts each octave)",
   S2.steps.map(s=>s.fr[0]).slice(0,15),[1,2,3,1,2,3,4,1,2,3,1,2,3,4,5]);
eq("2-oct LH fingering (4 crosses at the octave)",
   S2.steps.map(s=>s.fl[0]).slice(0,15),[5,4,3,2,1,3,2,1,4,3,2,1,3,2,1]);
eq("2-oct ends on the tonic, held, with the start finger",
   [S2.steps[29].rh[0],S2.steps[29].d,S2.steps[29].fr[0],S2.steps[29].fl[0]],["C4","h",1,5]);
for(const k of PLEx.allKeys("scale-major-2oct")) PLEx.expand("scale-major-2oct",k);

/* ---- Unit 5: harmonic minor scales ---- */
const HM=PLEx.expand("scale-minor-1oct","A");
eq("A harmonic minor notes (top repeated)",HM.steps.map(s=>s.rh[0]),
   ["A3","B3","C4","D4","E4","F4","G#4","A4","A4","G#4","F4","E4","D4","C4","B3","A3"]);
eq("A harm RH fingering",HM.steps.map(s=>s.fr[0]),
   [1,2,3,1,2,3,4,5,5,4,3,2,1,3,2,1]);
eq("A harm LH fingering",HM.steps.map(s=>s.fl[0]),
   [5,4,3,2,1,3,2,1,1,2,3,1,2,3,4,5]);
eq("D minor raises C to C#",PLEx.expand("scale-minor-1oct","D").steps[6].rh[0],"C#5");
eq("D# minor raises to C-double-sharp",
   PLEx.expand("scale-minor-1oct","D#").steps[6].rh[0],"C##5");
eq("Eb minor raises to D natural",
   PLEx.expand("scale-minor-1oct","Eb").steps[6].rh[0],"D5");
eq("F# harm RH fingering (341 pattern)",
   PLEx.expand("scale-minor-1oct","F#").steps.slice(0,8).map(s=>s.fr[0]),
   [3,4,1,2,3,1,2,3]);
eq("Bb harm LH fingering",
   PLEx.expand("scale-minor-1oct","Bb").steps.slice(0,8).map(s=>s.fl[0]),
   [2,1,3,2,1,4,3,2]);
const HM2=PLEx.expand("scale-minor-2oct","A");
eq("2-oct harm: 30 steps, peak held",[HM2.steps.length,HM2.steps[14].d,HM2.steps[14].rh[0]],
   [30,"h","A5"]);
eq("2-oct harm RH fingering restarts",HM2.steps.map(s=>s.fr[0]).slice(0,15),
   [1,2,3,1,2,3,4,1,2,3,1,2,3,4,5]);
["scale-minor-1oct","scale-minor-2oct"].forEach(ex=>{
  ok(ex+" enabled for 13 minors",PLEx.allKeys(ex).length===13);
  for(const k of PLEx.allKeys(ex)) PLEx.expand(ex,k);
});

/* ---- natural and melodic forms ---- */
const NM=PLEx.expand("scale-minor-nat-1oct","A");
eq("natural minor: no raised notes",NM.steps.map(s=>s.rh[0]).slice(0,8),
   ["A3","B3","C4","D4","E4","F4","G4","A4"]);
const MM=PLEx.expand("scale-minor-mel-1oct","A");
eq("melodic ascending raises 6 and 7",MM.steps.map(s=>s.rh[0]).slice(0,8),
   ["A3","B3","C4","D4","E4","F#4","G#4","A4"]);
eq("melodic descending restores the natural form",MM.steps.map(s=>s.rh[0]).slice(8),
   ["A4","G4","F4","E4","D4","C4","B3","A3"]);
eq("C melodic asc has A-B naturals, desc Bb-Ab",
   [PLEx.expand("scale-minor-mel-1oct","C").steps[5].rh[0],
    PLEx.expand("scale-minor-mel-1oct","C").steps[6].rh[0],
    PLEx.expand("scale-minor-mel-1oct","C").steps[9].rh[0],
    PLEx.expand("scale-minor-mel-1oct","C").steps[10].rh[0]],
   ["A4","B4","Bb4","Ab4"]);
eq("D# melodic asc 6th is B# (never C)",
   PLEx.expand("scale-minor-mel-1oct","D#").steps[5].rh[0],"B#4");
const MM2=PLEx.expand("scale-minor-mel-2oct","A");
eq("2-oct melodic: raised in both octaves, natural down",
   [MM2.steps[12].rh[0],MM2.steps[13].rh[0],MM2.steps[16].rh[0],MM2.steps[17].rh[0]],
   ["F#5","G#5","G5","F5"]);
["scale-minor-nat-1oct","scale-minor-mel-1oct",
 "scale-minor-nat-2oct","scale-minor-mel-2oct"].forEach(ex=>{
  ok(ex+" enabled for 13 minors",PLEx.allKeys(ex).length===13);
  for(const k of PLEx.allKeys(ex)) PLEx.expand(ex,k);
});
eq("lesson 5.1 offers all three forms",PLLessonsPeek("l5-1"),
   ["scale-minor-nat-1oct","scale-minor-1oct","scale-minor-mel-1oct"]);

/* ---- Unit 6: arpeggios ---- */
const AR=PLEx.expand("arp-major-1oct","C");
eq("C major arpeggio 1-oct (top repeated)",AR.steps.map(s=>s.rh[0]),
   ["C4","E4","G4","C5","C5","G4","E4","C4"]);
eq("arp 1-oct RH fingering",AR.steps.map(s=>s.fr[0]),[1,2,3,5,5,3,2,1]);
eq("arp 1-oct LH fingering",AR.steps.map(s=>s.fl[0]),[5,4,2,1,1,2,4,5]);
eq("Db arpeggio uses the 412 pattern",
   PLEx.expand("arp-major-1oct","Db").steps.map(s=>s.fr[0]).slice(0,4),[4,1,2,4]);
const AR2=PLEx.expand("arp-major-2oct","C");
eq("arp 2-oct: 14 steps, 6 bars of 3/4",
   [AR2.steps.length,AR2.steps.reduce((a,s)=>a+(s.d==="h."?3:1),0)],[14,18]);
eq("arp 2-oct peak held (dotted half)",[AR2.steps[6].rh[0],AR2.steps[6].d],["C6","h."]);
eq("arp 2-oct RH fingering",AR2.steps.map(s=>s.fr[0]),
   [1,2,3,1,2,3,5,5,3,2,1,3,2,1]);
const ARM=PLEx.expand("arp-minor-1oct","A");
eq("A minor arpeggio notes",ARM.steps.map(s=>s.rh[0]).slice(0,4),["A3","C4","E4","A4"]);
eq("Bb minor arpeggio uses 231",
   PLEx.expand("arp-minor-2oct","Bb").steps.map(s=>s.fr[0]).slice(0,7),[2,3,1,2,3,1,2]);
["arp-major-1oct","arp-major-2oct","arp-minor-1oct","arp-minor-2oct"].forEach(ex=>{
  ok(ex+" enabled for 13 keys",PLEx.allKeys(ex).length===13);
  for(const k of PLEx.allKeys(ex)) PLEx.expand(ex,k);
});

/* ---- Unit 7: inversions ---- */
const IV1=PLEx.expand("inv-major","C");
eq("inversion chords up and down",IV1.steps.map(s=>s.rh),
   [["C4","E4","G4"],["E4","G4","C5"],["G4","C5","E5"],["C5","E5","G5"],
    ["G4","C5","E5"],["E4","G4","C5"],["C4","E4","G4"]]);
eq("inversion labels",IV1.steps.map(s=>s.roman),
   ["Root","1st","2nd","Root","2nd","1st","Root"]);
eq("RH inversion fingering 135/125/135",IV1.steps.slice(0,3).map(s=>s.fr),
   [[1,3,5],[1,2,5],[1,3,5]]);
eq("LH inversion fingering 531/531/521",IV1.steps.slice(0,3).map(s=>s.fl),
   [[5,3,1],[5,3,1],[5,2,1]]);
const P6=PLEx.expand("prog-inv-6","C");
eq("prog-inv-6: LH roots only",P6.steps.map(s=>s.lh),
   [["C3"],["F3"],["C3"],["G3"],["C3"]]);
eq("prog-inv-6: LH one-position fingering",P6.steps.map(s=>s.fl[0]),[5,2,5,1,5]);
eq("prog-inv-6: RH from the I6 shape",P6.steps.map(s=>s.rh),
   [["E4","G4","C5"],["F4","A4","C5"],["E4","G4","C5"],["F4","G4","B4"],["E4","G4","C5"]]);
const P64=PLEx.expand("prog-inv-64","C");
eq("prog-inv-64: RH from the I6/4 shape",P64.steps.map(s=>s.rh),
   [["G4","C5","E5"],["A4","C5","F5"],["G4","C5","E5"],["G4","B4","F5"],["G4","C5","E5"]]);
eq("prog-inv-6 in F# keeps E# in the V7",
   PLEx.expand("prog-inv-6","F#").steps[3].rh,["B4","C#5","E#5"]);
["inv-major","inv-minor","prog-inv-6","prog-inv-64"].forEach(ex=>{
  ok(ex+" enabled for 13 keys",PLEx.allKeys(ex).length===13);
  for(const k of PLEx.allKeys(ex)) PLEx.expand(ex,k);
});
eq("lesson 7.2 offers both shapes",PLLessonsPeek("l7-2"),["prog-inv-6","prog-inv-64"]);

/* ---- Unit 8: more scales ---- */
const CH=PLEx.expand("chromatic-1oct","C");
eq("chromatic: 26 steps, 7 bars",[CH.steps.length,
   CH.steps.reduce((a,s)=>a+(s.d==="h"?2:1),0)],[26,28]);
eq("chromatic RH fingering (rule: black=3, white pairs 1-2)",
   CH.steps.map(s=>s.fr[0]).slice(0,13),[1,3,1,3,1,2,3,1,3,1,3,1,2]);
eq("chromatic LH fingering (mirror rule)",
   CH.steps.map(s=>s.fl[0]).slice(0,13),[1,3,1,3,2,1,3,1,3,1,3,2,1]);
eq("chromatic from Gb starts on finger 3 (black key)",
   PLEx.expand("chromatic-1oct","Gb").steps[0].fr[0],3);
const WT=PLEx.expand("wholetone-1oct","C");
eq("whole-tone notes",WT.steps.map(s=>s.rh[0]).slice(0,7),
   ["C4","D4","E4","F#4","G#4","A#4","C5"]);
ok("whole-tone: every step a whole step",
   WT.steps.slice(0,7).map(s=>PLPitch.midi(s.rh[0]))
     .every((m,i,a)=>i===0||m-a[i-1]===2));
const BL=PLEx.expand("blues-1oct","C");
eq("blues notes (1 b3 4 #4 5 b7)",BL.steps.map(s=>s.rh[0]).slice(0,7),
   ["C4","Eb4","F4","F#4","G4","Bb4","C5"]);
const DM=PLEx.expand("dim-1oct","C");
eq("diminished: octatonic W-H",DM.steps.map(s=>s.rh[0]).slice(0,9),
   ["C4","D4","Eb4","F4","Gb4","Ab4","A4","B4","C5"]);
eq("dorian on C",PLEx.expand("mode-dorian","C").steps.map(s=>s.rh[0]).slice(0,8),
   ["C4","D4","Eb4","F4","G4","A4","Bb4","C5"]);
eq("locrian on C",PLEx.expand("mode-locrian","C").steps.map(s=>s.rh[0]).slice(0,8),
   ["C4","Db4","Eb4","F4","Gb4","Ab4","Bb4","C5"]);
eq("lydian on G has C#",PLEx.expand("mode-lydian","G").steps[3].rh[0],"C#5");
["chromatic-1oct","wholetone-1oct","blues-1oct","dim-1oct",
 "mode-ionian","mode-dorian","mode-phrygian","mode-lydian",
 "mode-mixolydian","mode-aeolian","mode-locrian"].forEach(ex=>{
  ok(ex+" enabled for 13 tonics",PLEx.allKeys(ex).length===13);
  for(const k of PLEx.allKeys(ex)) PLEx.expand(ex,k);
});
eq("lesson 8.5 offers all seven modes",PLLessonsPeek("l8-5").length,7);

/* ---- reference tables from the instructor's chart (future units) ---- */
ok("harmonic-minor fingering: 13 minor keys",
   Object.keys(PLEx.REF.MINOR_SCALE_FINGERINGS).length===13);
ok("major arpeggio fingering: 13 keys",
   Object.keys(PLEx.REF.ARP_FINGERINGS_MAJOR).length===13);
ok("minor arpeggio fingering: 13 keys",
   Object.keys(PLEx.REF.ARP_FINGERINGS_MINOR).length===13);
ok("ref tables: 8 values per scale hand, 7 per arpeggio hand",
   Object.values(PLEx.REF.MINOR_SCALE_FINGERINGS).every(t=>t.rh.length===8&&t.lh.length===8)&&
   Object.values(PLEx.REF.ARP_FINGERINGS_MAJOR).every(t=>t.rh.length===7&&t.lh.length===7)&&
   Object.values(PLEx.REF.ARP_FINGERINGS_MINOR).every(t=>t.rh.length===7&&t.lh.length===7));
eq("D#m and Ebm share harmonic-minor fingering",
   PLEx.REF.MINOR_SCALE_FINGERINGS["D#"],PLEx.REF.MINOR_SCALE_FINGERINGS["Eb"]);

console.log(fails? "FAILURES: "+fails+"/"+tests : "ALL PASS ("+tests+" checks)");
process.exit(fails?1:0);
