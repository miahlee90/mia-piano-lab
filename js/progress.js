/* Piano Lab — student progress store. Phase 1: localStorage on this device.
   Every key × hand combination is tracked separately with a status:
     completed   — finished at least once (completion date kept)
     progress    — practiced but not yet completed
     none        — not started
   Saved per attempt: key, hand, mode, tempo, accuracy, wrong attempts,
   completion flag, timestamp. Bests keep highest completed tempo (+ accuracy).
   The record() shape is the future server-sync payload — a Supabase-style RPC
   layer can be attached here later without touching the practice engine. */
const PLProgress=(()=>{
  const KEY="pl-progress-v1";
  function all(){
    try{
      const d=JSON.parse(localStorage.getItem(KEY))||{};
      return {attempts:d.attempts||[],best:d.best||{},seen:d.seen||{}};
    }catch(e){ return {attempts:[],best:{},seen:{}}; }
  }
  function save(d){ try{ localStorage.setItem(KEY,JSON.stringify(d)); }catch(e){} }
  const kk=(ex,key,hand)=>[ex,key,hand].join("|");

  /* a practice/test session began — marks the combination "In Progress" */
  function touch(ex,key,hand){
    const d=all();
    d.seen[kk(ex,key,hand)]=new Date().toISOString();
    save(d);
  }
  /* a = {ex,key,hand,mode,tempo,pitchAcc,rhythmAcc,wrong,completed} */
  function record(a){
    const d=all();
    a.at=new Date().toISOString();
    d.attempts.push(a);
    if(d.attempts.length>300) d.attempts=d.attempts.slice(-300);
    const k=kk(a.ex,a.key,a.hand);
    d.seen[k]=a.at;
    if(a.completed){
      const b=d.best[k]||{};
      if(!b.completedAt) b.completedAt=a.at;            /* first completion date */
      if(!b.tempo||a.tempo>b.tempo||(a.tempo===b.tempo&&a.pitchAcc>(b.pitchAcc||0))){
        b.tempo=a.tempo; b.pitchAcc=a.pitchAcc; b.rhythmAcc=a.rhythmAcc;
        b.wrong=a.wrong; b.mode=a.mode; b.at=a.at;
      }
      d.best[k]=b;
    }
    save(d);
  }
  function best(ex,key,hand){ return all().best[kk(ex,key,hand)]||null; }
  function lastPracticed(ex,key,hand){ return all().seen[kk(ex,key,hand)]||null; }
  function status(ex,key,hand){
    const d=all(), k=kk(ex,key,hand);
    if(d.best[k]&&d.best[k].completedAt) return "completed";
    if(d.seen[k]) return "progress";
    return "none";
  }
  function recent(n){ return all().attempts.slice(-(n||5)).reverse(); }
  /* wipe this device's local progress matrix (used by the Clear button — the
     "My Progress" table is device-local and is NOT cleared by signing out) */
  function clear(){ try{ localStorage.removeItem(KEY); }catch(e){} }
  return {record,touch,best,status,lastPracticed,recent,all,clear};
})();
if(typeof module!=="undefined") module.exports=PLProgress;
