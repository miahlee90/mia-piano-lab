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
      /* high-pass kills sub-bass rumble from summed low tails ("woofer" boom) */
      const hp=ctx.createBiquadFilter();
      hp.type="highpass"; hp.frequency.value=70; hp.Q.value=.5;
      /* gentle safety limiter — default compressor settings pump audibly
         when two hands play together */
      const comp=ctx.createDynamicsCompressor();
      comp.threshold.value=-18; comp.knee.value=24; comp.ratio.value=4;
      comp.attack.value=.005; comp.release.value=.12;
      master.connect(hp); hp.connect(comp); comp.connect(ctx.destination);
    }
    if(ctx.state==="suspended") ctx.resume();
  }
  const freq=m=>440*Math.pow(2,(m-69)/12);
  function noteOn(m,vel){
    if(!on) return;
    ensure();
    if(active.has(m)) return;            /* duplicate-trigger guard */
    const t=ctx.currentTime, f=freq(m);
    /* low notes: quieter fundamental + stronger harmonics — a loud pure
       low sine held for a whole note booms like a subwoofer */
    const v=Math.min(1,(vel||90)/127)*.34*(f<180?.72:1);
    const att=f<200?.014:.005;
    const h2=f<180?.34:.14;
    const g=ctx.createGain();
    const lp=ctx.createBiquadFilter(); lp.type="lowpass";
    lp.frequency.value=Math.min(6000,Math.max(800,f*5)); lp.Q.value=.4;
    const o1=ctx.createOscillator(); o1.type="sine";     o1.frequency.value=f;
    const o2=ctx.createOscillator(); o2.type="triangle"; o2.frequency.value=f*2;
    const o3=ctx.createOscillator(); o3.type="sine";     o3.frequency.value=f*3;
    const g2=ctx.createGain(); g2.gain.value=h2;
    const g3=ctx.createGain(); g3.gain.value=f<400?.09:.05;
    /* piano-like envelope: keeps DECAYING through long notes — no held
       sustain level to ring against the room */
    g.gain.setValueAtTime(0,t);
    g.gain.linearRampToValueAtTime(v,t+att);
    g.gain.exponentialRampToValueAtTime(v*.28,t+.7);
    g.gain.exponentialRampToValueAtTime(.0008,t+3.6);
    o1.connect(g); o2.connect(g2); g2.connect(g); o3.connect(g3); g3.connect(g);
    g.connect(lp); lp.connect(master);
    o1.start(t); o2.start(t); o3.start(t);
    active.set(m,{o1,o2,o3,g});
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
    if(a.o3) a.o3.stop(t+.3);
  }
  function blip(m,ms,vel){ noteOn(m,vel); setTimeout(()=>noteOff(m),Math.max(150,(ms||300)*.85)); }
  function tick(level){
    if(!on) return;
    ensure();
    /* clearly audible woodblock-ish click (triangle = extra harmonics).
       level: true = accent (beat 1) · "soft" = secondary accent (4/4 beat 3,
       6/8 pulse 2) · falsy = plain tick */
    const acc=level===true, soft=level==="soft";
    const t=ctx.currentTime, o=ctx.createOscillator(), g=ctx.createGain();
    o.type="triangle"; o.frequency.value=acc?2093:soft?1760:1568;
    g.gain.setValueAtTime(acc?.6:soft?.52:.45,t);
    g.gain.exponentialRampToValueAtTime(.001,t+.07);
    o.connect(g); g.connect(master); o.start(t); o.stop(t+.08);
  }
  function setSound(v){ on=!!v; if(!on) [...active.keys()].forEach(noteOff); }
  return {noteOn,noteOff,blip,tick,setSound,isOn:()=>on,ensure};
})();
if(typeof module!=="undefined") module.exports=PLAudio;
