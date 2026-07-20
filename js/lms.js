/* PLTrack — Piano Lab student session + progress sync to the shared Supabase
   LMS (same project as Music Fundamentals; course id "piano-lab").
   Talks to the DB only through SECURITY DEFINER RPCs with the publishable key.

   What is recorded: a "practice" event each time the student FINISHES an
   exercise (Practice or Test mode) — record_lbd(item, exerciseId). The server
   counts these (lbd_attempts = how many times practiced) and marks the
   exercise done the first time; the lesson completes once every exercise in it
   has been finished. Learn-mode playback, on-screen doodling and page visits
   are never sent.

   Offline: events queue in localStorage with client UUIDs (server dedupes on
   them) and original timestamps; "saved" shows only after server confirmation. */
const PLTrack=(()=>{
  const COURSE="piano-lab";
  const cfg=(typeof LMS_CONFIG!=="undefined")?LMS_CONFIG:{SUPABASE_URL:"",SUPABASE_ANON_KEY:""};
  const enabled=!!(cfg.SUPABASE_URL&&cfg.SUPABASE_ANON_KEY);
  const LSS="pl-lms-session", LSQ="pl-lms-queue";

  function get(k,d){ try{return JSON.parse(localStorage.getItem(k))??d;}catch(e){return d;} }
  function set(k,v){ try{localStorage.setItem(k,JSON.stringify(v));}catch(e){} }
  function session(){ return get(LSS,null); }
  function uuid(){ return (crypto.randomUUID?crypto.randomUUID():
    "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g,c=>{const r=Math.random()*16|0;return (c==="x"?r:(r&3|8)).toString(16);})); }

  async function rpc(fn,args){
    const res=await fetch(cfg.SUPABASE_URL+"/rest/v1/rpc/"+fn,{
      method:"POST",
      headers:{"Content-Type":"application/json","apikey":cfg.SUPABASE_ANON_KEY,
               "Authorization":"Bearer "+cfg.SUPABASE_ANON_KEY},
      body:JSON.stringify(args||{})});
    if(!res.ok){ const t=await res.text(); const err=new Error("rpc "+fn+" "+res.status+": "+t); err.status=res.status; throw err; }
    return res.json();
  }

  /* ---------- offline queue ---------- */
  let flushing=false;
  async function flush(){
    if(!enabled||flushing) return;
    const s=session(); if(!s) return;
    flushing=true; paint();
    try{
      for(;;){
        const q=get(LSQ,[]);
        if(!q.length) break;
        const ev=q[0];
        const args=Object.assign({p_token:s.token,p_id:ev.id,p_course:COURSE,p_client_ts:ev.ts},ev.args);
        try{ await rpc(ev.fn,args); }
        catch(err){
          if(err.status>=400&&err.status<500&&String(err.message).includes("invalid_session")){
            logout(false); break;
          }
          throw err;
        }
        const q2=get(LSQ,[]);
        if(q2.length&&q2[0].id===ev.id){ q2.shift(); set(LSQ,q2); }
      }
    }catch(e){ /* stay queued; retried on online/interval */ }
    flushing=false; paint();
  }
  function enqueue(fn,args){
    const q=get(LSQ,[]);
    q.push({id:uuid(),fn,args,ts:new Date().toISOString()});
    set(LSQ,q); paint(); flush();
  }

  /* ---------- status chip (practice screen, signed-in students only) ---------- */
  let chip=null;
  function paint(){
    if(!enabled||!document.body) return;
    const s=session();
    if(!s){ if(chip){chip.remove();chip=null;} return; }
    if(!chip){
      chip=document.createElement("div");
      chip.id="plSyncChip";
      chip.style.cssText="position:fixed;left:10px;bottom:10px;z-index:9999;font:600 12px/1 system-ui,sans-serif;"+
        "padding:7px 12px;border-radius:9999px;box-shadow:0 2px 8px rgba(0,0,0,.18);cursor:pointer;color:#fff";
      chip.title=t("sync.signedIn",{n:s.name});
      chip.onclick=()=>{ location.href="student.html"; };
      document.body.appendChild(chip);
    }
    const pending=get(LSQ,[]).length;
    if(pending){ chip.style.background="#b45309";
      chip.textContent=t("sync.pending",{n:s.name,p:pending}); }
    else { chip.style.background="#166534";
      chip.textContent=t("sync.saved",{n:s.name}); }
  }

  /* ---------- auth ---------- */
  async function login(classCode,accessCode){
    if(!enabled) throw new Error("LMS not configured");
    const r=await rpc("student_login",{p_class_code:classCode,p_access_code:accessCode});
    if(!r.ok) return r;
    set(LSS,{token:r.token,name:r.student.name,class:r.student.class,classCode:r.student.classCode});
    paint(); flush();
    return r;
  }
  function logout(callServer=true){
    const s=session();
    const pending=get(LSQ,[]).length;
    if(pending&&callServer&&!confirm(t("sync.confirmOut",{p:pending}))) return false;
    if(s&&callServer&&enabled){ rpc("student_logout",{p_token:s.token}).catch(()=>{}); }
    localStorage.removeItem(LSS);
    paint();
    return true;
  }
  async function progress(){
    const s=session(); if(!s) return null;
    return rpc("student_progress",{p_token:s.token});
  }

  /* ---------- academic events ---------- */
  /* one practice/finish of an exercise (item = lesson item_id, activity = exId) */
  function practice(item,activity){
    if(!enabled||!session()||!item) return;
    enqueue("record_lbd",{p_item:item,p_activity:activity});
  }
  /* optional graded submission (unused while has_quiz=false; kept for future) */
  function quiz(item,earned,possible){
    if(!enabled||!session()||!item) return;
    enqueue("record_quiz",{p_item:item,p_earned:earned,p_possible:possible});
  }

  if(enabled){
    window.addEventListener("online",flush);
    window.addEventListener("load",()=>{ paint(); flush(); });
    setInterval(flush,45000);
  }
  return {enabled,login,logout,session,progress,practice,quiz,flush,rpc,COURSE,
          _pending:()=>get(LSQ,[]).length};
})();
if(typeof module!=="undefined") module.exports=PLTrack;
