/* Piano Lab — falling-note waterfall (Synthesia-style) for Learn-mode
   demonstration playback. Purely visual — notes land on their keys exactly
   when they sound (driven by PLPlayer.beatPos each animation frame, so it
   can never drift from the audio scheduler). RH indigo, LH amber, matching
   the rest of the app. Toggleable; hidden outside Learn mode. */
const PLFall=(()=>{
  const PX_PER_BEAT=110;
  let cv=null,ctx=null,keyRect=null,events=[],raf=0,running=false,getBeat=null,W=0,H=0;

  function attach(canvas,rectFn){
    cv=canvas; ctx=cv?cv.getContext("2d"):null; keyRect=rectFn;
    if(cv){ W=cv.width; H=cv.height; }
    clear();
  }
  function load(evts,beatFn){ events=evts||[]; getBeat=beatFn; clear(); }

  const colorFor=(hand,black)=>hand==="rh"?(black?"#4a5fd6":"#6b8cff"):(black?"#c9821c":"#E8A33D");
  function roundRect(c,x,y,w,h,r){
    r=Math.max(0,Math.min(r,h/2,w/2)); c.beginPath();
    c.moveTo(x+r,y); c.arcTo(x+w,y,x+w,y+h,r); c.arcTo(x+w,y+h,x,y+h,r);
    c.arcTo(x,y+h,x,y,r); c.arcTo(x,y,x+w,y,r); c.closePath();
  }
  function drawFrame(curBeat){
    if(!ctx) return;
    ctx.clearRect(0,0,W,H);
    const g=ctx.createLinearGradient(0,0,0,H);
    g.addColorStop(0,"#0b0e2a"); g.addColorStop(1,"#191d4c");
    ctx.fillStyle=g; ctx.fillRect(0,0,W,H);
    ctx.strokeStyle="rgba(255,255,255,.05)"; ctx.lineWidth=1;
    for(let m=0;m<128;m+=12){ const r=keyRect&&keyRect(m); if(!r) continue;
      ctx.beginPath(); ctx.moveTo(r.x+.5,0); ctx.lineTo(r.x+.5,H); ctx.stroke(); }
    ctx.fillStyle="rgba(255,255,255,.16)"; ctx.fillRect(0,H-2,W,2);
    if(curBeat==null) return;
    for(const e of events){
      const r=keyRect(e.midi); if(!r) continue;
      const yB=H-(e.beat-curBeat)*PX_PER_BEAT;
      const yT=yB-e.beats*PX_PER_BEAT;
      if(yB<0||yT>H) continue;
      const active=curBeat>=e.beat&&curBeat<e.beat+e.beats;
      const top=Math.max(-40,yT);
      ctx.save();
      ctx.shadowColor=colorFor(e.hand,r.black);
      ctx.shadowBlur=active?20:9;
      ctx.fillStyle=colorFor(e.hand,r.black);
      ctx.globalAlpha=active?1:.86;
      roundRect(ctx,r.x+2,top,r.w-4,yB-top,5);
      ctx.fill();
      if(active){ ctx.shadowBlur=26; ctx.globalAlpha=.55; ctx.fillRect(r.x,H-5,r.w,5); }
      ctx.restore();
    }
  }
  function clear(){ drawFrame(null); }
  function tick(){ if(!running) return; drawFrame(getBeat?getBeat():0); raf=requestAnimationFrame(tick); }
  function play(){ if(!cv||running) return; running=true; tick(); }
  function pause(){ running=false; cancelAnimationFrame(raf); }
  function stop(){ pause(); clear(); }
  return {attach,load,play,pause,stop,clear};
})();
if(typeof module!=="undefined") module.exports=PLFall;
