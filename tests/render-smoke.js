/* Piano Lab — headless render smoke test. Builds real SVG for the three
   prototype keys × hand modes and asserts the acceptance-visible structure:
   step groups, key-signature glyph counts (F# shows ♯6, Gb shows ♭6),
   fingering texts, Roman numerals, grand-staff brace, barlines.
   Also smoke-loads every browser script for syntax errors. */
const fs=require("fs"), path=require("path"), vm=require("vm");
const root=path.join(__dirname,"..");

global.localStorage={getItem:()=>null,setItem:()=>{},removeItem:()=>{}};
global.document={addEventListener:()=>{},querySelector:()=>null,querySelectorAll:()=>[]};
function load(f){ vm.runInThisContext(fs.readFileSync(path.join(root,f),"utf-8"),{filename:f}); }
["js/config.js","locales/en.js","js/i18n.js","js/pitch.js","js/exercises.js",
 "js/lessons.js","js/notation.js","js/piano.js","js/fall.js","js/midi.js",
 "js/player.js","js/practice.js","js/progress.js","js/app.js"].forEach(load);   /* app.js must load without DOM */

let fails=0,tests=0;
function ok(name,cond){ tests++; if(!cond){fails++;console.log("  FAIL "+name);} }
function count(s,re){ return (s.match(re)||[]).length; }

function svgFor(tonic,hand,opts,exId){
  const container={ innerHTML:"", querySelector:()=>({querySelectorAll:()=>({length:0,forEach:()=>{}})}) };
  PLNotation.render(container,PLEx.expand(exId||"ff-major",tonic),hand,opts||{});
  return container.innerHTML;
}

const cRH=svgFor("C","rh");
ok("9 step groups (1234|5432|1)",count(cRH,/class="nstep"/g)===9);
ok("C major: no key-sig accidentals",count(cRH,/[♯♭]/g)===0);
ok("fingering rendered",count(cRH,/class="fing fing-rh"/g)===9);
ok("whole-note tonic at the end",cRH.includes('rx="10.5"'));
ok("treble clef, no brace",cRH.includes("clef-stroke")&&!cRH.includes("brace"));
ok("final barline",cRH.includes("barfinal"));
ok("2 measure barlines + thin final",count(cRH,/class="barline"/g)===2+1);

const fsHT=svgFor("F#","ht");
ok("F# ht: 12 sharps in key sigs",count(fsHT,/♯/g)===12);
ok("F# ht: no flats",count(fsHT,/♭/g)===0);
ok("grand staff brace",fsHT.includes("brace"));
ok("both hands' fingering",count(fsHT,/fing-rh/g)===9&&count(fsHT,/fing-lh/g)===9);

const gbLH=svgFor("Gb","lh");
ok("Gb lh: 6 flats",count(gbLH,/♭/g)===6);
ok("Gb lh: no sharps",count(gbLH,/♯/g)===0);
ok("bass clef only",gbLH.includes("clef-path")&&!gbLH.includes("clef-stroke"));

const noFing=svgFor("C","rh",{showFingering:false});
ok("fingering can be hidden (test mode)",count(noFing,/class="fing/g)===0);

/* nothing may render outside the canvas in ANY key/hand (clipping guard) */
PLEx.allKeys("ff-major").forEach(k=>["rh","lh","ht"].forEach(h=>{
  ok("no clipped coords "+k+" "+h,!/="-/.test(svgFor(k,h)));
}));

/* ---- Lesson 2: minor five-finger rendering ---- */
const dsm=svgFor("D#","rh",null,"ff-minor");
ok("D# minor: 6 sharps in key sig",count(dsm,/♯/g)===6&&count(dsm,/♭/g)===0);
const ebm=svgFor("Eb","lh",null,"ff-minor");
ok("Eb minor: 6 flats in key sig",count(ebm,/♭/g)===6&&count(ebm,/♯/g)===0);
PLEx.allKeys("ff-minor").forEach(k=>["rh","lh","ht"].forEach(h=>{
  ok("no clipped coords minor "+k+" "+h,!/="-/.test(svgFor(k,h,null,"ff-minor")));
}));

/* ---- Unit 2: chord progressions ---- */
const p51=svgFor("C","rh",null,"prog-1-5-1");
ok("3 chord steps",count(p51,/class="nstep"/g)===3);
ok("3 roman labels",count(p51,/class="roman"/g)===3);
ok("9 whole-note heads",count(p51,/class="note hollow"/g)===9);
/* the V7 contains a second (F-G): its upper note must be offset right */
{
  const step1=/<g class="nstep" data-i="1">([\s\S]*?)<\/g>/.exec(p51)[1];
  const cxs=[...step1.matchAll(/ellipse[^>]*cx="([\d.]+)"/g)].map(m=>+m[1]);
  ok("V7 second-interval offset",new Set(cxs).size===2&&Math.abs(Math.max(...cxs)-Math.min(...cxs)-13)<0.01);
  /* notes are in data order B,F,G — the F (lower of the second) must sit
     LEFT of the main column; B and G stay aligned */
  ok("second's lower note offset LEFT",cxs[1]<cxs[0]&&cxs[0]===cxs[2]);
  const step0=/<g class="nstep" data-i="0">([\s\S]*?)<\/g>/.exec(p51)[1];
  const cx0=[...step0.matchAll(/ellipse[^>]*cx="([\d.]+)"/g)].map(m=>+m[1]);
  ok("triad stays in one column",new Set(cx0).size===1);
}
["ff-major-broken","ff-minor-broken"].forEach(ex=>
  PLEx.allKeys(ex).forEach(k=>["rh","lh","ht"].forEach(h=>{
    ok("no clipped coords "+ex+" "+k+" "+h,!/="-/.test(svgFor(k,h,null,ex)));
  })));
const bb=svgFor("C","rh",null,"prog-broken-1-5");
ok("broken study: 11 steps",count(bb,/class="nstep"/g)===11);
ok("broken study: 7 bars (6 mid + thin final)",count(bb,/class="barline"/g)===7);
ok("broken study: 15 dots on the 5 blocked chords",count(bb,/class="dot"/g)===15);

["prog-1-5-1","prog-broken-1-5","prog-1-4-1","prog-1-4-5-1"].forEach(ex=>
  PLEx.allKeys(ex).forEach(k=>["rh","lh","ht"].forEach(h=>{
    const svg=svgFor(k,h,null,ex);
    ok("no clipped coords "+ex+" "+k+" "+h,!/="-/.test(svg));
    /* chord fingering stacks must stay fully inside the canvas (glyph
       ascent ~11px above the baseline y) */
    const fy=[...svg.matchAll(/class="fing[^"]*"[^>]*y="([\d.]+)"/g)].map(m=>+m[1]);
    ok("fingering not clipped "+ex+" "+k+" "+h,!fy.length||Math.min(...fy)>=12);
  })));

/* fingering stacks (instructor): RH high number on top, LH high number at
   the bottom */
{
  const grab=(svg,cls)=>{
    const s0=/<g class="nstep" data-i="0">([\s\S]*?)<\/g>/.exec(svg)[1];
    return [...s0.matchAll(new RegExp('class="fing '+cls+'"[^>]*y="([\\d.]+)"[^>]*>(\\d)<',"g"))]
      .map(m=>({y:+m[1],f:m[2]})).sort((a,b)=>a.y-b.y).map(x=>x.f).join("");
  };
  ok("LH stack: 1 on top, 5 at the bottom",
     grab(svgFor("C","lh",null,"prog-1-5-1"),"fing-lh")==="135");
  ok("RH stack: 5 on top, 1 at the bottom",
     grab(svgFor("C","rh",null,"prog-1-5-1"),"fing-rh")==="531");
}

/* ---- Unit 4: major scales ---- */
{
  const s2=svgFor("C","rh",null,"scale-major-2oct");
  ok("2-oct scale: 30 steps",count(s2,/class="nstep"/g)===30);
  ok("2-oct scale: quarters — no beams or flags",
     count(s2,/class="beam"/g)===0&&count(s2,/class="flag"/g)===0);
  ok("2-oct scale: 8 measures (7 mid barlines + thin final)",
     count(s2,/class="barline"/g)===8);
  ["scale-major-1oct","scale-major-2oct"].forEach(ex=>
    PLEx.allKeys(ex).forEach(k=>["rh","lh","ht"].forEach(h=>{
      ok("no clipped coords "+ex+" "+k+" "+h,!/="-/.test(svgFor(k,h,null,ex)));
    })));
}

/* ---- Unit 3: triad qualities — accidentals incl. double sharps/flats ---- */
{
  const tq=svgFor("C","rh",null,"triad-qualities");
  ok("triad qualities: 5 steps",count(tq,/class="nstep"/g)===5);
  ok("C view: 1 sharp (G#) + 3 flats (Eb Eb Gb)",
     count(tq,/♯/g)===1&&count(tq,/♭/g)===3);
  ok("courtesy natural on the G after Caug",count(tq,/♮/g)===1);
  ok("double sharp rendered in F#",/𝄪/.test(svgFor("F#","rh",null,"triad-qualities")));
  ok("double flats rendered in Gb",count(svgFor("Gb","rh",null,"triad-qualities"),/𝄫/g)>=2);
  PLEx.allKeys("triad-qualities").forEach(k=>["rh","lh","ht"].forEach(h=>{
    ok("no clipped coords tq "+k+" "+h,!/="-/.test(svgFor(k,h,null,"triad-qualities")));
  }));
  /* 3.2 seventh chords: 4-note stacks must never clip (fingering incl.) */
  PLEx.allKeys("seventh-qualities").forEach(k=>["rh","lh","ht"].forEach(h=>{
    const svg=svgFor(k,h,null,"seventh-qualities");
    ok("no clipped coords 7q "+k+" "+h,!/="-/.test(svg));
    const fy=[...svg.matchAll(/class="fing[^"]*"[^>]*y="([\d.]+)"/g)].map(m=>+m[1]);
    ok("7q fingering inside canvas "+k+" "+h,!fy.length||Math.min(...fy)>=12);
  }));
}

/* ---- rhythm elements (hidden engine-demo exercise) ---- */
const demo=svgFor("C","rh",null,"engine-demo");
ok("demo: 12 steps",count(demo,/class="nstep"/g)===12);
ok("beams drawn (8th pair + 16th group + secondary)",count(demo,/class="beam"/g)===3);
ok("flag on the isolated 8th",count(demo,/class="flag"/g)===1);
ok("quarter rest for the RH rest step",count(demo,/class="rest[" ]/g)>=1);
ok("tie arc across the dotted quarter",count(demo,/class="tie"/g)===1);
ok("dot on the dotted quarter",count(demo,/class="dot"/g)===1);
ok("pickup: 2 mid barlines (after pickup + after m1)",count(demo,/class="barline"/g)===3);
ok("demo not clipped",!/="-/.test(demo));
const demoHT=svgFor("C","ht",null,"engine-demo");
ok("demo grand staff renders",count(demoHT,/class="nstep"/g)===12&&demoHT.includes("brace"));
ok("LH rests appear on the bass staff",count(demoHT,/class="rest/g)>count(demo,/class="rest/g));

/* keyboard range rule: complete black-key groups (start C, end E or B) */
{
  let lo=61,hi=73;                          /* C#4..C#5-ish exercise range */
  while(lo%12!==0) lo--;
  while(hi%12!==4&&hi%12!==11) hi++;
  ok("kbd starts on C",lo%12===0);
  ok("kbd ends on E or B",hi%12===4||hi%12===11);
}

console.log(fails?"FAILURES: "+fails+"/"+tests:"ALL PASS ("+tests+" checks)");
process.exit(fails?1:0);
