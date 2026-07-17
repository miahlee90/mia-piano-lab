/* Piano Lab — interactive on-screen keyboard. Displays target / correct /
   wrong / completed states and distinguishes RH vs LH targets by color.
   Clickable for testing and for students without MIDI (not a substitute for a
   real keyboard — see the setup notice). The visible range always starts on C
   and ends on E or B, so the 2-and-3 black-key groups are never cut mid-group. */
const PLPiano=(()=>{
  const WHITE_PC=[0,2,4,5,7,9,11];
  const NAMES=["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"];

  /* render(container,{lowMidi,highMidi,onKey}) — onKey(midi,isDown) */
  function render(container,opts){
    let lo=opts.lowMidi-0, hi=opts.highMidi-0;
    lo=Math.max(21,Math.min(lo,hi));
    while(lo%12!==0) lo--;                       /* start on C */
    while(hi%12!==4&&hi%12!==11) hi++;           /* end on E or B */
    const whites=[]; for(let m=lo;m<=hi;m++) if(WHITE_PC.includes(m%12)) whites.push(m);
    /* FIXED key size — every exercise and hand shows keys at the same scale
       (wider ranges scroll horizontally instead of shrinking the keys) */
    const KW=52, BW=Math.round(KW*.6);
    const frag=[];
    whites.forEach((m,i)=>{
      const label=(m%12===0)?("C"+(Math.floor(m/12)-1)):"";
      frag.push(`<div class="pk pk-w" data-midi="${m}" style="left:${i*KW}px;width:${KW}px">`+
                `<span class="pk-fing"></span>`+
                (label?`<span class="pk-lbl">${label}</span>`:"")+`</div>`);
    });
    whites.forEach((m,i)=>{
      if([0,2,5,7,9].includes(m%12)&&m+1<=hi)
        frag.push(`<div class="pk pk-b" data-midi="${m+1}" style="left:${(i+1)*KW-BW/2}px;width:${BW}px">`+
                  `<span class="pk-fing"></span></div>`);
    });
    container.innerHTML=`<div class="pl-kbd"><div class="pl-kbd-inner" style="width:${whites.length*KW}px">${frag.join("")}</div></div>`;
    const keys={};
    container.querySelectorAll(".pk").forEach(k=>{
      keys[+k.dataset.midi]=k;
      k.addEventListener("pointerdown",e=>{ e.preventDefault(); k.setPointerCapture(e.pointerId); opts.onKey(+k.dataset.midi,true); });
      k.addEventListener("pointerup",  e=>{ opts.onKey(+k.dataset.midi,false); });
      k.addEventListener("pointercancel",()=>opts.onKey(+k.dataset.midi,false));
    });
    const STATES=["k-target-rh","k-target-lh","k-correct","k-wrong","k-done","k-pressed"];
    function set(midi,cls,on){ const k=keys[midi]; if(k) k.classList.toggle(cls,!!on); }
    /* persistent finger-number guide ON the keys (recommendation only — never
       something MIDI can verify). entries=[{midi,f,hand}] */
    function setGuide(entries){
      for(const m in keys){ const s=keys[m].querySelector(".pk-fing");
        s.textContent=""; s.classList.remove("pk-fing-rh","pk-fing-lh"); }
      (entries||[]).forEach(e=>{ const k=keys[e.midi]; if(!k) return;
        const s=k.querySelector(".pk-fing");
        s.textContent=e.f??""; s.classList.add("pk-fing-"+e.hand); });
    }
    function clearTargets(){ for(const m in keys)
      keys[m].classList.remove("k-target-rh","k-target-lh","k-correct","k-wrong","k-done"); }
    function clearAll(){ clearTargets(); for(const m in keys) keys[m].classList.remove("k-pressed"); }
    function flash(midi,cls,ms){ set(midi,cls,true); setTimeout(()=>set(midi,cls,false),ms||350); }
    return {set,setGuide,flash,clearTargets,clearAll,lo,hi,
            setPressed:(m,on)=>set(m,"k-pressed",on)};
  }
  return {render,name:m=>NAMES[m%12]+(Math.floor(m/12)-1)};
})();
if(typeof module!=="undefined") module.exports=PLPiano;
