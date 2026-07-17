/* Piano Lab — Web MIDI INPUT ONLY.
   - Listens to every connected input (digital piano → app).
   - MIDI outputs are intentionally NEVER opened: the app cannot send notes to
     the instrument, so it cannot create feedback loops or double-triggering
     on the instrument side.
   - A note-on for a key that is already down is ignored (duplicate guard).
   - MIDI reports pitch and timing only. It CANNOT detect which finger was
     used — never present fingering as something the app can verify. */
const PLMidi=(()=>{
  let access=null, handler=null, onStatus=null, status="init";
  const down=new Set();
  function notify(){ if(onStatus) onStatus(status); }
  function attach(){
    let n=0;
    access.inputs.forEach(inp=>{ inp.onmidimessage=onMsg; n++; });
    status=n?("on:"+n):"none";
    notify();
  }
  function onMsg(e){
    const [st,d1,d2]=e.data, cmd=st&0xf0;
    if(cmd===0x90&&d2>0){
      if(down.has(d1)) return;
      down.add(d1); if(handler) handler(d1,true,d2);
    }else if(cmd===0x80||(cmd===0x90&&d2===0)){
      if(!down.delete(d1)) return;
      if(handler) handler(d1,false,0);
    }
  }
  function init(h,s){
    handler=h; onStatus=s;
    if(!("requestMIDIAccess" in navigator)){
      status=(typeof isSecureContext!=="undefined"&&!isSecureContext)?"insecure":"unsupported";
      notify(); return;
    }
    status="init"; notify();
    /* Chrome/Edge gate MIDI behind a permission popup; while it is
       unanswered the promise just hangs — surface that to the user */
    const pend=setTimeout(()=>{ if(status==="init"){ status="prompt"; notify(); } },2500);
    navigator.requestMIDIAccess({sysex:false}).then(
      a=>{ clearTimeout(pend); access=a; attach(); a.onstatechange=attach; },
      ()=>{ clearTimeout(pend); status="denied"; notify(); });
  }
  /* re-run the permission request (bound to a user click on the chip) */
  function retry(){ if(handler) init(handler,onStatus); }
  return {init,retry,status:()=>status};
})();
if(typeof module!=="undefined") module.exports=PLMidi;
