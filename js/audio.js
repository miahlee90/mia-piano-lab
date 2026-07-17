/* Piano Lab — Web Audio piano tone + metronome. ALL app sound comes from the
   browser; the app never sends MIDI OUT to the instrument. One application
   sound per note: a note already sounding is never retriggered by duplicate
   events (the active map is the guard). A global sound switch mutes the app
   entirely (students using their digital piano's own sound turn this off, or
   turn the piano's Local Control off — see the setup notice). */
const PLAudio=(()=>{
  let ctx=null, master=null, on=true;
  const active=new Map();
  function ensure(){
    if(!ctx){
      ctx=new (window.AudioContext||window.webkitAudioContext)();
      master=ctx.createGain(); master.gain.value=.8;
      /* gentle safety limiter — default compressor settings pump audibly
         when two hands play together */
      const comp=ctx.createDynamicsCompressor();
      comp.threshold.value=-18; comp.knee.value=24; comp.ratio.value=4;
      comp.attack.value=.005; comp.release.value=.12;
      master.connect(comp); comp.connect(ctx.destination);
    }
    if(ctx.state==="suspended") ctx.resume();
  }
  const freq=m=>440*Math.pow(2,(m-69)/12);
  function noteOn(m,vel){
    if(!on) return;
    ensure();
    if(active.has(m)) return;            /* duplicate-trigger guard */
    const t=ctx.currentTime, f=freq(m), v=Math.min(1,(vel||90)/127)*.34;
    /* low notes: longer attack (a 4ms ramp is shorter than one cycle down
       there and clicks) and a stronger 2nd harmonic instead of raw sine
       level — pure low sine at speaking volume rattles small speakers */
    const att=f<200?.014:.005;
    const h2=f<180?.3:.12;
    const g=ctx.createGain();
    const lp=ctx.createBiquadFilter(); lp.type="lowpass";
    lp.frequency.value=Math.min(6000,Math.max(700,f*5)); lp.Q.value=.4;
    const o1=ctx.createOscillator(); o1.type="sine";     o1.frequency.value=f;
    const o2=ctx.createOscillator(); o2.type="triangle"; o2.frequency.value=f*2;
    const g2=ctx.createGain(); g2.gain.value=h2;
    g.gain.setValueAtTime(0,t);
    g.gain.linearRampToValueAtTime(v,t+att);
    g.gain.exponentialRampToValueAtTime(Math.max(v*.08,.0006),t+1.6);
    o1.connect(g); o2.connect(g2); g2.connect(g); g.connect(lp); lp.connect(master);
    o1.start(t); o2.start(t);
    active.set(m,{o1,o2,g});
  }
  function noteOff(m){
    const a=active.get(m); if(!a) return;
    active.delete(m);
    const t=ctx.currentTime, g=a.g.gain;
    /* click-free release: hold the CURRENT level, then ramp down.
       (cancelScheduledValues alone snaps the gain back to its peak — that was
       the audible tick on every released note) */
    if(g.cancelAndHoldAtTime) g.cancelAndHoldAtTime(t);
    else{ const v=Math.max(g.value,.0006); g.cancelScheduledValues(t); g.setValueAtTime(v,t); }
    g.exponentialRampToValueAtTime(.0004,t+.14);
    a.o1.stop(t+.3); a.o2.stop(t+.3);   /* stop only after the fade is done */
  }
  function blip(m,ms,vel){ noteOn(m,vel); setTimeout(()=>noteOff(m),Math.max(150,(ms||300)*.85)); }
  function tick(accent){
    if(!on) return;
    ensure();
    /* clearly audible woodblock-ish click (triangle = extra harmonics) */
    const t=ctx.currentTime, o=ctx.createOscillator(), g=ctx.createGain();
    o.type="triangle"; o.frequency.value=accent?2093:1568;
    g.gain.setValueAtTime(accent?.6:.45,t);
    g.gain.exponentialRampToValueAtTime(.001,t+.07);
    o.connect(g); g.connect(master); o.start(t); o.stop(t+.08);
  }
  function setSound(v){ on=!!v; if(!on) [...active.keys()].forEach(noteOff); }
  return {noteOn,noteOff,blip,tick,setSound,isOn:()=>on,ensure};
})();
if(typeof module!=="undefined") module.exports=PLAudio;
