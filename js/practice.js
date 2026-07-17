/* Piano Lab — Practice / Test session engine. Pitch is validated from input
   events (MIDI or on-screen clicks); chords are validated as GROUPS: a chord
   step completes only when every required key is down at the same time.
   Wrong notes give calm feedback and are counted; the student simply tries
   again. Test mode adds a count-in and rhythm scoring against the beat grid
   with an adjustable tolerance. Fingering is NEVER graded — MIDI cannot
   detect fingers. */
const PLSession=(()=>{
  let S=null, active=false, idx=0, wrong=0, t0=0;
  const downs=new Set();
  let stepTimes=[], startBeats=[], totalBeats=0;

  function targets(i){
    const set=new Set();
    const st=S.score.steps[i];
    if(S.hand!=="lh") st.rh.forEach(sp=>set.add(PLPitch.midi(sp)));
    if(S.hand!=="rh") st.lh.forEach(sp=>set.add(PLPitch.midi(sp)));
    return set;
  }
  function targetCount(){
    let n=0;
    for(let i=0;i<S.score.steps.length;i++) n+=targets(i).size;
    return n;
  }

  /* start(opts) — {score,hand,mode,tempo,tolMs,onTarget(i,targets),
     onNote(midi,ok),onStepDone(i),onFinish(summary)} */
  function start(opts){
    S=opts; active=true; idx=0; wrong=0; stepTimes=[]; downs.clear();
    startBeats=[]; totalBeats=0;
    S.score.steps.forEach(st=>{ startBeats.push(totalBeats); totalBeats+=PLNotation.BEATS[st.d]; });
    begin();
  }
  function begin(){
    t0=performance.now();
    S.onTarget(idx,targets(idx));
  }
  /* test mode: caller runs the count-in, then calls markZero() at beat 0 */
  function markZero(){ t0=performance.now(); }

  function input(midi,down){
    if(!active||!S) return;
    if(!down){ downs.delete(midi); return; }
    downs.add(midi);
    const exp=targets(idx);
    if(!exp.has(midi)){ wrong++; S.onNote(midi,false); return; }
    S.onNote(midi,true);
    for(const m of exp) if(!downs.has(m)) return;   /* chord: wait for the full group */
    stepTimes[idx]=performance.now();
    S.onStepDone(idx);
    idx++;
    if(idx>=S.score.steps.length) finish();
    else S.onTarget(idx,targets(idx));
  }

  function finish(){
    active=false;
    const n=S.score.steps.length, tN=targetCount();
    const pitchAcc=tN/(tN+wrong);
    let rhythmAcc=null;
    if(S.mode==="test"){
      const spb=60000/S.tempo;
      let ok=0;
      for(let i=0;i<n;i++){
        const expected=t0+startBeats[i]*spb;
        if(Math.abs(stepTimes[i]-expected)<=S.tolMs) ok++;
      }
      rhythmAcc=ok/n;
    }
    S.onFinish({
      mode:S.mode, completed:true,
      pitchAcc:Math.round(pitchAcc*100), wrong,
      rhythmAcc:rhythmAcc==null?null:Math.round(rhythmAcc*100),
      tempo:S.tempo, durationMs:Math.round(stepTimes[n-1]-t0)
    });
  }
  function abort(){ active=false; downs.clear(); }
  return {start,markZero,input,abort,isActive:()=>active};
})();
if(typeof module!=="undefined") module.exports=PLSession;
