/* Piano Lab — playback engine for Learn / demonstration mode. Beat-based
   scheduler with drift correction; fires onStep at each step boundary and an
   optional metronome tick every beat. Sounding/highlighting is done by the
   caller (app.js) so this stays UI-free. */
const PLPlayer=(()=>{
  let S=null, timer=null, playing=false, beat=0, startBeats=[], total=0;

  function load(opts){
    stop();
    S=opts;   /* {steps,timeTop,tempo(),loop(),metronome(),onStep(i),onState(s)} */
    startBeats=[]; total=0;
    S.steps.forEach(st=>{ startBeats.push(total); total+=PLNotation.BEATS[st.d]; });
  }
  const spb=()=>60000/S.tempo();
  let t0=0, beatsDone=0;
  function schedule(){
    const due=t0+beatsDone*spb();
    timer=setTimeout(fire,Math.max(0,due-performance.now()));
  }
  function fire(){
    if(!playing) return;
    if(beat>=total){
      if(S.loop()){ beat=0; }
      else{ playing=false; S.onState("stop"); if(S.onEnd) S.onEnd(); return; }
    }
    if(S.metronome()) PLAudio.tick(beat%S.timeTop===0);
    const i=startBeats.indexOf(beat);
    if(i>=0) S.onStep(i,PLNotation.BEATS[S.steps[i].d]*spb());
    beat++; beatsDone++;
    schedule();
  }
  function play(){
    if(!S||playing) return;
    PLAudio.ensure();
    if(beat>=total) beat=0;      /* pressing Play after the end = replay */
    playing=true; t0=performance.now(); beatsDone=0;
    S.onState("play"); fire();
  }
  function pause(){ if(!playing) return; clearTimeout(timer); playing=false; S.onState("pause"); }
  function stop(){ clearTimeout(timer); playing=false; beat=0; if(S) S.onState("stop"); }
  function restart(){ stop(); play(); }
  return {load,play,pause,stop,restart,isPlaying:()=>playing,beatPos:()=>beat};
})();
if(typeof module!=="undefined") module.exports=PLPlayer;
