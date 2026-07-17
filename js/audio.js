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
      master=ctx.createGain(); master.gain.value=.9;
      const comp=ctx.createDynamicsCompressor();
      master.connect(comp); comp.connect(ctx.destination);
    }
    if(ctx.state==="suspended") ctx.resume();
  }
  const freq=m=>440*Math.pow(2,(m-69)/12);
  function noteOn(m,vel){
    if(!on) return;
    ensure();
    if(active.has(m)) return;            /* duplicate-trigger guard */
    const t=ctx.currentTime, f=freq(m), v=Math.min(1,(vel||90)/127)*.4;
    const g=ctx.createGain();
    const lp=ctx.createBiquadFilter(); lp.type="lowpass";
    lp.frequency.value=Math.min(6000,f*6); lp.Q.value=.5;
    const o1=ctx.createOscillator(); o1.type="sine";     o1.frequency.value=f;
    const o2=ctx.createOscillator(); o2.type="triangle"; o2.frequency.value=f*2;
    const g2=ctx.createGain(); g2.gain.value=.12;
    g.gain.setValueAtTime(0,t);
    g.gain.linearRampToValueAtTime(v,t+.004);
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
    const t=ctx.currentTime, o=ctx.createOscillator(), g=ctx.createGain();
    o.type="sine"; o.frequency.value=accent?1568:1046;   /* soft woodblock-ish ping */
    g.gain.setValueAtTime(.16,t); g.gain.exponentialRampToValueAtTime(.0006,t+.05);
    o.connect(g); g.connect(master); o.start(t); o.stop(t+.06);
  }
  function setSound(v){ on=!!v; if(!on) [...active.keys()].forEach(noteOff); }
  return {noteOn,noteOff,blip,tick,setSound,isOn:()=>on,ensure};
})();
if(typeof module!=="undefined") module.exports=PLAudio;
