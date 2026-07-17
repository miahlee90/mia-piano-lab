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

/* ---- teacher key enable/disable ---- */
PLEx.setKeyEnabled("ff-major","B",false);
ok("teacher can disable a key",!PLEx.keysFor("ff-major").includes("B"));
PLEx.setKeyEnabled("ff-major","B",true);
ok("teacher can re-enable a key",PLEx.keysFor("ff-major").includes("B"));

/* ---- major scale, one octave (C and G share master fingering) ---- */
const SC=PLEx.expand("scale-major-1oct","C");
const SG=PLEx.expand("scale-major-1oct","G");
eq("C scale RH notes",SC.steps.map(s=>s.rh[0]),
   ["C4","D4","E4","F4","G4","A4","B4","C5","B4","A4","G4","F4","E4","D4","C4"]);
eq("C scale RH fingering (thumb crossings)",SC.steps.map(s=>s.fr[0]),
   [1,2,3,1,2,3,4,5,4,3,2,1,3,2,1]);
eq("C scale LH fingering",SC.steps.map(s=>s.fl[0]),
   [5,4,3,2,1,3,2,1,2,3,1,2,3,4,5]);
eq("G scale has F#5",SG.steps[6].rh[0],"F#5");
eq("G scale LH drops an octave",SG.steps[0].lh[0],"G2");
eq("scale beats = 4 measures of 4/4",
   SC.steps.reduce((a,s)=>a+({w:4,h:2,q:1})[s.d],0),16);
ok("scale enabled keys limited until per-key fingering exists",
   JSON.stringify(PLEx.keysFor("scale-major-1oct"))===JSON.stringify(["C","G"]));

console.log(fails? "FAILURES: "+fails+"/"+tests : "ALL PASS ("+tests+" checks)");
process.exit(fails?1:0);
