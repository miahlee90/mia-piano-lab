/* Piano Lab — UI glue. Owns the app state, routes input (MIDI + on-screen
   clicks) to the audio engine and the practice session, and keeps score
   highlighting and keyboard highlighting synchronized (both are driven from
   the same step events, so they cannot drift apart). */
(function(){
  const $=s=>document.querySelector(s);
  const st={ ex:"ff-major", key:"C", hand:"rh", mode:"learn",
             tempo:72, loop:false, metronome:false, sound:true,
             showFing:true, fingerEdit:false, fall:true, tolMs:180,
             guide:false, subdiv:false };   /* subdiv: 6/8 metronome/count-in
                                               ticks all six eighths */   /* practice: pre-highlight the next key (off —
                                 instructor: react to what is played) */
  let lesson=null, score=null, notation=null, piano=null, cur=-1, countTimer=null;

  /* ---------- helpers ---------- */
  function keyName(tonic,mode){
    const disp=tonic.replace("#","♯").replace("b","♭");
    return t(mode==="minor"?"key.minor":mode==="tonic"?"key.tonic":"key.major",{k:disp});
  }
  function stepTargets(i){
    const s=score.steps[i], out=[];
    if(st.hand!=="lh") s.rh.forEach((sp,k)=>out.push({midi:PLPitch.midi(sp),hand:"rh",f:s.fr[k]}));
    if(st.hand!=="rh") s.lh.forEach((sp,k)=>out.push({midi:PLPitch.midi(sp),hand:"lh",f:s.fl[k]}));
    return out;
  }
  function scoreRange(){
    let lo=127,hi=0;
    score.steps.forEach((s,i)=>stepTargets(i).forEach(x=>{lo=Math.min(lo,x.midi);hi=Math.max(hi,x.midi);}));
    return {lo:lo-2,hi:hi+2};
  }
  function fb(msg){ $("#fbText").innerHTML=msg; }

  /* ---------- build / rebuild ---------- */
  function rebuild(){
    endSession(); PLPlayer.stop();
    score=PLEx.expand(st.ex,st.key);
    $("#exTitle").textContent=t(score.titleKey)+" — "+keyName(st.key,score.mode);
    updateFormulaRef();
    notation=PLNotation.render($("#score"),score,st.hand,
      {showFingering: st.showFing && st.mode!=="test"});
    wireFingerEdit();
    const r=scoreRange();
    piano=PLPiano.render($("#kbd"),{lowMidi:r.lo,highMidi:r.hi,onKey:onScreenKey});
    applyFingerGuide();
    PLFall.attach(piano.canvas,piano.keyRect);
    PLFall.load(fallEvents(),()=>PLPlayer.beatPos());
    PLPlayer.load({ steps:score.steps, time:score.time, pickup:score.pickup,
      tempo:()=>st.tempo, loop:()=>st.loop, metronome:()=>st.metronome,
      subdiv:()=>st.subdiv,
      onStep:playerStep, onState:transport, onEnd:()=>{ if(cur>=0) notation.setStepState(cur,"done"); } });
    cur=-1;
    fb(t(st.mode==="learn"?"fb.learnHint":st.mode==="practice"?"fb.practiceHint":"fb.testHint"));
    renderProgress();
    updateControls();
  }

  /* persistent finger-number guide on the keys (every pattern key, colored by
     hand). Hidden in test mode and when Show fingering is off. */
  function applyFingerGuide(){
    if(!st.showFing||st.mode==="test"){ piano.setGuide([]); return; }
    const seen={}, entries=[];
    for(let i=0;i<score.steps.length;i++) stepTargets(i).forEach(x=>{
      if(!seen[x.midi]){ seen[x.midi]=1; entries.push({midi:x.midi,f:x.f,hand:x.hand}); }
    });
    piano.setGuide(entries);
  }

  /* keep the sounding position visible — hands are on the piano, so the
     keyboard strip and the score scroll by themselves */
  function autoScroll(i){
    try{
      if(piano&&piano.scrollToKeys) piano.scrollToKeys(stepTargets(i).map(x=>x.midi));
      const g=notation&&notation.steps&&notation.steps[i], wrap=$("#score");
      if(g&&wrap&&g.getBoundingClientRect&&wrap.scrollBy){
        const r=g.getBoundingClientRect(), w=wrap.getBoundingClientRect();
        if(r.left<w.left+40||r.right>w.right-40)
          wrap.scrollBy({left:(r.left+r.right)/2-(w.left+w.right)/2,behavior:"smooth"});
      }
    }catch(e){}
  }

  /* ---------- learn / demonstration ---------- */
  function showStep(i,{sound,state}={}){
    if(cur>=0&&cur!==i) notation.setStepState(cur,"done");
    notation.setStepState(i,state||"current");
    piano.clearTargets();
    /* keyboard pre-highlighting: always in Learn; in Practice only when the
       student turns the guide on — otherwise the app only REACTS to what
       is actually played */
    if(st.mode==="learn"||(st.mode==="practice"&&st.guide))
      stepTargets(i).forEach(x=>piano.set(x.midi,"k-target-"+x.hand,true));
    cur=i;
    autoScroll(i);
  }
  /* note events for the waterfall: absolute start beat + duration, ties
     merged, per selected hand */
  function fallEvents(){
    const evts=[]; let beat=0;
    const hs=st.hand==="ht"?["rh","lh"]:[st.hand];
    score.steps.forEach((s,i)=>{
      for(const h of hs){
        const prev=score.steps[i-1];
        s[h].forEach(sp=>{
          if(prev){ const pt=h==="rh"?prev.rhT:prev.lhT;
            if(prev[h].some((ps,j)=>pt&&pt[j]&&ps===sp)) return; }
          let beats=PLNotation.beatsOf(s.d), j=i;
          for(;;){
            const tt=h==="rh"?score.steps[j].rhT:score.steps[j].lhT;
            const ix=score.steps[j][h].indexOf(sp), nx=score.steps[j+1];
            if(tt&&ix>=0&&tt[ix]&&nx&&nx[h].includes(sp)){ beats+=PLNotation.beatsOf(nx.d); j++; }
            else break;
          }
          evts.push({midi:PLPitch.midi(sp),hand:h,beat,beats});
        });
      }
      beat+=PLNotation.beatsOf(s.d);
    });
    return evts;
  }

  /* sound one step: ties extend the duration and tied-in notes are not
     retriggered (one application sound per written note) */
  function soundStep(i){
    const spb=60000/st.tempo, s=score.steps[i], seen=new Set();
    const hs=st.hand==="ht"?["rh","lh"]:[st.hand];
    for(const h of hs){
      const prev=score.steps[i-1];
      s[h].forEach(sp=>{
        const midi=PLPitch.midi(sp);
        if(seen.has(midi)) return;
        if(prev){ const pt=h==="rh"?prev.rhT:prev.lhT;
          if(prev[h].some((ps,j)=>pt&&pt[j]&&ps===sp)) return; }
        seen.add(midi);
        let beats=PLNotation.beatsOf(s.d), j=i;
        for(;;){
          const tt=h==="rh"?score.steps[j].rhT:score.steps[j].lhT;
          const ix=score.steps[j][h].indexOf(sp), nx=score.steps[j+1];
          if(tt&&ix>=0&&tt[ix]&&nx&&nx[h].includes(sp)){ beats+=PLNotation.beatsOf(nx.d); j++; }
          else break;
        }
        PLAudio.blip(midi,beats*spb);
      });
    }
  }
  function playerStep(i){ showStep(i); soundStep(i); }
  function stepManual(dir){
    if(st.mode!=="learn"||PLPlayer.isPlaying()) return;
    const n=score.steps.length, i=Math.max(0,Math.min(n-1,cur+dir));
    if(i===cur&&dir!==0) return;
    playerStep(i);
  }

  /* ---------- practice / test ---------- */
  function startSession(){
    PLPlayer.stop(); notation.clearStates(); piano.clearAll(); cur=-1;
    PLAudio.ensure();
    PLProgress.touch(st.ex,st.key,st.hand);   /* marks this key·hand In Progress */
    const begin=()=>PLSession.start({
      score, hand:st.hand, mode:st.mode, tempo:st.tempo, tolMs:st.tolMs,
      onTarget(i){
        if(st.mode==="test"){ if(cur>=0) notation.setStepState(cur,"done"); notation.setStepState(i,"cursor"); cur=i; autoScroll(i); }
        else showStep(i);
        fb(t("fb.waiting",{i:i+1,n:score.steps.length}));
      },
      onNote(midi,ok){ piano.flash(midi,ok?"k-correct":"k-wrong",ok?260:450); fb(ok?t("fb.correct"):t("fb.wrong")); },
      onRestSkip(i){ notation.setStepState(i,"done"); },
      onStepDone(i){ notation.setStepState(i,"correct"); setTimeout(()=>{ if(!PLSession.isActive()||cur!==i) notation.setStepState(i,"done"); },280); },
      onFinish(sum){
        piano.clearTargets();
        let msg="<b>"+t("fb.done",{p:sum.pitchAcc,w:sum.wrong})+"</b>";
        if(sum.rhythmAcc!=null) msg+=t("fb.doneRhythm",{r:sum.rhythmAcc,t:sum.tempo});
        const next=st.hand==="rh"?t("fb.nextLH"):st.hand==="lh"?t("fb.nextHT"):"";
        fb(msg+(next?"<br>"+next:"")+"<br>"+t("fb.saved"));
        PLProgress.record({ex:st.ex,key:st.key,hand:st.hand,mode:sum.mode,
          tempo:sum.tempo,pitchAcc:sum.pitchAcc,rhythmAcc:sum.rhythmAcc,
          wrong:sum.wrong,completed:sum.completed});
        /* if signed in, also record this finish to the shared LMS so the
           teacher sees it on any device (one practice event per finish) */
        if(sum.completed&&typeof PLTrack!=="undefined"&&PLTrack.enabled&&PLTrack.session()
           &&typeof PL_CURRICULUM!=="undefined")
          PLTrack.practice(PL_CURRICULUM.itemForExercise(st.ex),st.ex);
        renderProgress(); updateControls();
      }
    });
    /* one full measure of count-in before EVERY practice/test session
       (instructor) — follows the exercise's time signature. 6/8 counts two
       pulses (or all six eighths with the subdivision option); 4/4 gets a
       soft secondary tick on beat 3, matching the metronome. */
    fb(t("fb.countIn"));
    const spb=60000/st.tempo, mq=PLNotation.measureQuarters(score.time),
          comp=PLNotation.isCompound(score.time);
    const unit=comp?(st.subdiv?.5:1.5):1, n=Math.round(mq/unit);
    let b=0;
    (function count(){
      const pos=b*unit;
      PLAudio.tick(pos===0?true:(comp?pos%1.5===0:(mq===4&&pos===2))?"soft":false);
      if(++b<n) countTimer=setTimeout(count,unit*spb);
      else countTimer=setTimeout(begin,unit*spb);
    })();
    updateControls();
  }
  function endSession(){ clearTimeout(countTimer); PLSession.abort(); }

  /* Tablet rotation / window resize: re-fit the touch keyboard to the new
     width — but never mid-performance (playing or an active practice/test
     run keeps its keyboard; the next rebuild picks the new size up). */
  let lastW=window.innerWidth, resizeT=null;
  window.addEventListener("resize",()=>{
    clearTimeout(resizeT);
    resizeT=setTimeout(()=>{
      if(Math.abs(window.innerWidth-lastW)<40) return;
      lastW=window.innerWidth;
      if(PLPlayer.isPlaying()||PLSession.isActive()) return;
      rebuild();
    },400);
  });

  /* ---------- input routing (MIDI + clicks) ---------- */
  function onInput(midi,down,vel){
    if(down) PLAudio.noteOn(midi,vel||90); else PLAudio.noteOff(midi);
    piano.setPressed(midi,down);
    PLSession.input(midi,down);
  }
  function onScreenKey(midi,down){ onInput(midi,down,85); }

  /* ---------- fingering editing (instructor) ---------- */
  function wireFingerEdit(){
    if(!st.fingerEdit) return;
    $("#score").querySelectorAll(".fing").forEach(el=>{
      el.classList.add("editable");
      el.addEventListener("click",()=>{
        const v=prompt(t("ui.fingerEdit")+" (1–5):",el.textContent);
        const f=parseInt(v,10);
        if(f>=1&&f<=5){
          PLEx.setLocalFingering(st.ex,st.key,el.dataset.hand,+el.dataset.step,+el.dataset.note,f);
          rebuild();
        }
      });
    });
  }

  /* ---------- progress panel: every key × hand tracked separately ---------- */
  function renderProgress(){
    const rows=PLEx.keysFor(st.ex).map(k=>{
      const cells=["rh","lh","ht"].map(h=>{
        const s=PLProgress.status(st.ex,k,h);
        const b=PLProgress.best(st.ex,k,h);
        const label=s==="completed"?`✓ ♩=${b.tempo} · ${b.pitchAcc}%`
                   :s==="progress"?`● ${t("status.progress")}`:"–";
        const tip=t("status."+s)+(b?` · ${t("prog.best")}: ♩=${b.tempo} · ${b.pitchAcc}%`:"");
        return `<td><span class="pill pill-${s}" title="${tip}">${label}</span></td>`;
      }).join("");
      const active=k===st.key?' class="ps-active"':"";
      return `<tr${active}><td class="ps-key">${keyName(k,score.mode)}</td>${cells}</tr>`;
    });
    $("#progList").innerHTML=
      `<table class="ps"><tr><th>${t("ui.key")}</th><th>${t("hand.rh")}</th><th>${t("hand.lh")}</th><th>${t("hand.ht")}</th></tr>${rows.join("")}</table>`;
  }

  /* ---------- controls ---------- */
  function seg(el,items,get,set){
    el.innerHTML=items.map(x=>`<button data-v="${x.v}" ${get()===x.v?'class="on"':""}>${x.label}</button>`).join("");
    el.querySelectorAll("button").forEach(b=>b.onclick=()=>{ set(b.dataset.v); rebuild();
      el.querySelectorAll("button").forEach(x=>x.classList.toggle("on",x.dataset.v===get())); });
  }
  function updateControls(){
    const learn=st.mode==="learn", busy=PLSession.isActive();
    $("#btnPlay").disabled=!learn; $("#btnRestart").disabled=!learn;
    $("#btnPrev").disabled=!learn; $("#btnNext").disabled=!learn;
    $("#btnStart").style.display=learn?"none":"";
    $("#btnStart").textContent=busy?t("ui.restart"):t("ui.start");
    $("#chkLoop").disabled=!learn;
    $("#chkFall").disabled=!learn;
    $("#tolWrap").style.display=st.mode==="test"?"":"none";
    /* 6/8 subdivision option only makes sense for compound-meter exercises */
    $("#subdivWrap").style.display=(score&&PLNotation.isCompound(score.time))?"":"none";
    /* the next-key guide toggle only applies to Practice */
    $("#guideWrap").style.display=st.mode==="practice"?"":"none";
    /* test mode: the keyboard disappears — score reading only */
    $("#kbd").style.display=st.mode==="test"?"none":"";
    /* waterfall canvas shows only in Learn mode (and when enabled) */
    if(piano&&piano.canvas) piano.canvas.style.display=(learn&&st.fall)?"":"none";
  }
  function transport(state){
    $("#btnPlay").textContent=state==="play"?"⏸":"▶";
    /* fresh start from the top (Play after end, or Restart): wipe the old run's
       highlights so the score doesn't begin gray */
    if(state==="play"&&PLPlayer.beatPos()===0){
      notation.clearStates(); piano.clearTargets(); cur=-1;
    }
    if(st.mode==="learn"&&st.fall){
      if(state==="play") PLFall.play();
      else if(state==="pause") PLFall.pause();
      else PLFall.stop();
    }
  }

  /* ---------- teacher panel: enable/disable keys per exercise ---------- */
  function renderTeacherKeys(){
    $("#teacherKeys").innerHTML=PLEx.allKeys(st.ex).map(k=>{
      const M=PLEx.MASTERS[st.ex];
      return `<label><input type="checkbox" data-k="${k}" ${PLEx.keyEnabled(st.ex,k)?"checked":""}>`+
             `${keyName(k,M.mode)}</label>`;
    }).join("");
    $("#teacherKeys").querySelectorAll("input").forEach(c=>c.onchange=()=>{
      PLEx.setKeyEnabled(st.ex,c.dataset.k,c.checked);
      fillKeysRef(); rebuild(); renderTeacherKeys();
    });
  }
  let fillKeysRef=()=>{}, updateFormulaRef=()=>{};

  function boot(){
    document.title=PL_CONFIG.APP_NAME;
    $("#appName").textContent=PL_CONFIG.APP_NAME;
    document.documentElement.lang=PLI18N.lang();
    PLI18N.apply();
    PLI18N.mountSwitcher();
    PLTrack.mountAuth(".pl-header .inner");   /* header identity + Sign out */

    /* lesson framing — all text/data from lessons.js + locales, none hardcoded */
    const exSel=$("#selEx"), lsSel=$("#selLesson");
    function renderFormula(f,noteKey,degrees){
      const long=f.map(x=>t("formula."+x)).join(" – ");
      const parts=[`${t("formula.pattern")} <b>${f.join("–")}</b> `+
                   `<span class="pattern-long">(${long})</span>`];
      if(degrees) parts.push(t("formula.degrees"));
      parts.push(t(noteKey));
      $("#formulaChip").innerHTML=parts.join(" · ");
    }
    /* an exercise (e.g. a minor-scale FORM) may carry its own formula that
       overrides the lesson's — refreshed on every exercise change */
    updateFormulaRef=()=>{
      const M=PLEx.MASTERS[st.ex];
      if(M&&M.formula) renderFormula(M.formula,M.formulaNoteKey,false);
      else if(lesson) renderFormula(lesson.formula,lesson.formulaNoteKey,lesson.showDegrees!==false);
    };
    function applyLesson(L){
      lesson=L;
      lsSel.value=L.id;
      st.ex=L.exercises[0];
      st.key=PLEx.keysFor(st.ex)[0];
      $("#lessonCrumb").textContent=t("lesson.crumb",{u:L.unit,l:L.label});
      $("#lessonTitle").textContent=t(L.titleKey);
      $("#lessonGoal").textContent=t(L.goalKey);
      $("#lessonDesc").textContent=t(L.descKey);
      renderFormula(L.formula,L.formulaNoteKey,L.showDegrees!==false);
      exSel.innerHTML=L.exercises.map(id=>`<option value="${id}">${t(PLEx.MASTERS[id].titleKey)}</option>`).join("");
      /* one-exercise lessons don't need the Exercise selector */
      $("#exWrap").style.display=L.exercises.length>1?"":"none";
      fillKeys(); fillHands(); applyTempoBounds(); renderTeacherKeys(); rebuild();
    }
    lsSel.innerHTML=PLLessons.units().map(u=>
      `<optgroup label="${t("unit.label",{u:u.unit})} — ${t(u.nameKey)}">`+
      PLLessons.list().filter(l=>l.unit===u.unit).map(l=>
        `<option value="${l.id}">${l.label} — ${t(l.titleKey)}</option>`).join("")+
      `</optgroup>`).join("");
    lsSel.onchange=()=>applyLesson(PLLessons.get(lsSel.value));
    exSel.onchange=()=>{ st.ex=exSel.value; fillKeys(); fillHands(); applyTempoBounds(); renderTeacherKeys(); rebuild(); };
    function fillKeys(){
      const M=PLEx.MASTERS[st.ex], keys=PLEx.keysFor(st.ex);
      if(!keys.includes(st.key)) st.key=keys[0];
      $("#selKey").innerHTML=keys.map(k=>`<option value="${k}" ${k===st.key?"selected":""}>${keyName(k,M.mode)}</option>`).join("");
    }
    /* hands allowed per master (optional `hands` field) — masters without it
       offer all three; the current hand snaps to the first allowed one */
    function fillHands(){
      const allowed=PLEx.MASTERS[st.ex].hands||["rh","lh","ht"];
      if(!allowed.includes(st.hand)) st.hand=allowed[0];
      seg($("#segHand"),
          [{v:"rh",label:t("hand.rh.short")},{v:"lh",label:t("hand.lh.short")},
           {v:"ht",label:t("hand.ht.short")}].filter(x=>allowed.includes(x.v)),
          ()=>st.hand,v=>st.hand=v);
    }
    function applyTempoBounds(){
      const T=PLEx.MASTERS[st.ex].tempo, el=$("#tempo");
      el.min=T.min; el.max=T.max; el.value=st.tempo=T.default;
      $("#tempoVal").textContent=st.tempo;
    }
    fillKeysRef=fillKeys;
    $("#selKey").onchange=e=>{ st.key=e.target.value; rebuild(); };

    seg($("#segMode"),[{v:"learn",label:t("mode.learn")},{v:"practice",label:t("mode.practice")},{v:"test",label:t("mode.test")}],
        ()=>st.mode,v=>st.mode=v);

    const tempoEl=$("#tempo");
    tempoEl.oninput=()=>{ st.tempo=+tempoEl.value; $("#tempoVal").textContent=st.tempo; };
    $("#tol").oninput=e=>{ st.tolMs=+e.target.value; $("#tolVal").textContent=st.tolMs; };
    $("#chkLoop").onchange=e=>st.loop=e.target.checked;
    $("#chkMet").onchange=e=>st.metronome=e.target.checked;
    $("#chkSound").onchange=e=>{ st.sound=e.target.checked; PLAudio.setSound(st.sound); };
    $("#chkFing").onchange=e=>{ st.showFing=e.target.checked; rebuild(); };
    $("#chkFall").onchange=e=>{ st.fall=e.target.checked; updateControls(); if(!st.fall) PLFall.stop(); };
    $("#chkGuide").onchange=e=>st.guide=e.target.checked;
    $("#chkSubdiv").onchange=e=>st.subdiv=e.target.checked;
    $("#chkFingEdit").onchange=e=>{ st.fingerEdit=e.target.checked;
      if(st.fingerEdit) fb(t("fb.fingerEditHint"));
      rebuild(); };

    $("#btnPlay").onclick=()=>{ PLAudio.ensure(); PLPlayer.isPlaying()?PLPlayer.pause():PLPlayer.play(); };
    $("#btnStop").onclick=()=>{ PLPlayer.stop(); endSession(); updateControls(); };
    $("#btnRestart").onclick=()=>{ notation.clearStates(); cur=-1; PLPlayer.restart(); };
    $("#btnPrev").onclick=()=>stepManual(-1);
    $("#btnNext").onclick=()=>stepManual(1);
    $("#btnStart").onclick=startSession;
    $("#btnClearProg").onclick=()=>{
      if(confirm(t("prog.clearConfirm"))){ PLProgress.clear(); renderProgress(); fb(t("prog.cleared")); }
    };

    document.addEventListener("keydown",e=>{
      if(e.target.closest("input,select,textarea,button,summary")) return;
      if(e.code==="Space"){ e.preventDefault(); $("#btnPlay").click(); }
      if(e.code==="ArrowRight"){ e.preventDefault(); stepManual(1); }
      if(e.code==="ArrowLeft"){ e.preventDefault(); stepManual(-1); }
    });

    PLMidi.init(onInput,s=>{
      const chip=$("#midiChip");
      chip.textContent= s.startsWith("on:") ? t("midi.on",{n:s.slice(3)}) : t("midi."+s);
    });
    $("#midiChip").style.cursor="pointer";
    $("#midiChip").onclick=()=>PLMidi.retry();

    /* ?lesson=<id> deep link from the All Lessons index */
    const want=new URLSearchParams(location.search).get("lesson");
    applyLesson(PLLessons.get(want)||PLLessons.current());
  }
  document.addEventListener("DOMContentLoaded",boot);
})();
