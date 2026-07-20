/* Piano Lab — playback engine for Learn / demonstration mode. v2: event-list
   scheduler on fractional beats (eighth/sixteenth notes, dotted values,
   pickup measures), with drift correction against performance.now().
   Metronome ticks land on integer beats with the accent phased by the
   pickup. Sounding/highlighting is done by the caller (app.js). */
const PLPlayer=(()=>{
  let S=null, timer=null, playing=false, evIdx=0, elapsed=0, t0=0, EV=[], total=0;

  function load(opts){
    stop();
    S=opts;   /* {steps,time,pickup,tempo(),loop(),metronome(),subdiv()?,onStep(i),onState(s),onEnd()} */
    EV=[]; total=0;
    const starts=[];
    S.steps.forEach(s=>{ starts.push(total); total+=PLNotation.beatsOf(s.d); });
    const time=S.time||[S.timeTop||4,4];
    const mq=PLNotation.measureQuarters(time), comp=PLNotation.isCompound(time);
    /* compound meter: tick events on every eighth; whether the off-pulse
       eighths actually SOUND is decided at fire time (subdiv checkbox).
       Levels: accent = measure start; soft = secondary (beat 3 in 4/4,
       pulse 2 in 6/8); normal otherwise. */
    const unit=comp?.5:1;
    const phase=(mq-(S.pickup||0))%mq;
    for(let x=0;x*unit<total-1e-6;x++){
      const t=x*unit, pm=(t+phase)%mq;
      EV.push({t,tick:true,pulse:!comp||t%1.5===0,
        level:pm===0?true:(comp?pm%1.5===0:(mq===4&&pm===2))?"soft":false});
    }
    starts.forEach((t,i)=>EV.push({t,step:i}));
    EV.push({t:total,end:true});
    EV.sort((a,b)=>a.t-b.t||((a.tick?0:1)-(b.tick?0:1)));   /* tick before note */
  }
  const spb=()=>60000/S.tempo();
  function schedule(){
    const ev=EV[evIdx];
    timer=setTimeout(fire,Math.max(0,t0+ev.t*spb()-performance.now()));
  }
  function fire(){
    if(!playing) return;
    const ev=EV[evIdx];
    if(ev.end){
      if(S.loop()){ t0=performance.now(); evIdx=0; schedule(); return; }
      playing=false; evIdx=EV.length; elapsed=0;
      S.onState("stop"); if(S.onEnd) S.onEnd(); return;
    }
    if(ev.tick){ if(S.metronome()&&(ev.pulse||(S.subdiv&&S.subdiv()))) PLAudio.tick(ev.level); }
    else S.onStep(ev.step);
    evIdx++; schedule();
  }
  function play(){
    if(!S||playing) return;
    PLAudio.ensure();
    if(evIdx>=EV.length){ evIdx=0; elapsed=0; }   /* replay after the end */
    playing=true;
    t0=performance.now()-elapsed*spb();
    S.onState("play"); schedule();
  }
  function pause(){
    if(!playing) return;
    clearTimeout(timer);
    elapsed=(performance.now()-t0)/spb();
    playing=false; S.onState("pause");
  }
  function stop(){ clearTimeout(timer); playing=false; evIdx=0; elapsed=0; if(S) S.onState("stop"); }
  function restart(){ stop(); play(); }
  return {load,play,pause,stop,restart,isPlaying:()=>playing,
          beatPos:()=>playing?(performance.now()-t0)/spb():elapsed};
})();
if(typeof module!=="undefined") module.exports=PLPlayer;
