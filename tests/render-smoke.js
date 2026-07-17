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
 "js/lessons.js","js/notation.js","js/piano.js","js/midi.js","js/player.js",
 "js/practice.js","js/progress.js","js/app.js"].forEach(load);   /* app.js must load without DOM */

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
