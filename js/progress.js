/* Piano Lab — student progress store. Phase 1: localStorage on this device
   (attempts log + best result per exercise/key/hand). The record() shape is
   the future server sync payload — a Supabase-style RPC layer can be attached
   here later without touching the practice engine. */
const PLProgress=(()=>{
  const KEY="pl-progress-v1";
  function all(){
    try{ return JSON.parse(localStorage.getItem(KEY))||{attempts:[],best:{}}; }
    catch(e){ return {attempts:[],best:{}}; }
  }
  function save(d){ try{ localStorage.setItem(KEY,JSON.stringify(d)); }catch(e){} }
  /* a = {ex,key,hand,mode,tempo,pitchAcc,rhythmAcc,completed} */
  function record(a){
    const d=all();
    a.at=new Date().toISOString();
    d.attempts.push(a);
    if(d.attempts.length>300) d.attempts=d.attempts.slice(-300);
    if(a.completed){
      const k=[a.ex,a.key,a.hand].join("|");
      const b=d.best[k];
      if(!b||a.tempo>b.tempo||(a.tempo===b.tempo&&a.pitchAcc>b.pitchAcc))
        d.best[k]={tempo:a.tempo,pitchAcc:a.pitchAcc,rhythmAcc:a.rhythmAcc,mode:a.mode,at:a.at};
    }
    save(d);
  }
  function best(ex,key,hand){ return all().best[[ex,key,hand].join("|")]||null; }
  function recent(n){ return all().attempts.slice(-(n||5)).reverse(); }
  return {record,best,recent,all};
})();
if(typeof module!=="undefined") module.exports=PLProgress;
