/* Piano Lab — UI glue. Owns the app state, routes input (MIDI + on-screen
   clicks) to the audio engine and the practice session, and keeps score
   highlighting and keyboard highlighting synchronized (both are driven from
   the same step events, so they cannot drift apart). */
(function(){
  const $=s=>document.querySelector(s);
  const st={ ex:"ff-major", key:"C", hand:"rh", mode:"learn",
             tempo:72, loop:false, metronome:false, sound:true,
             showFing:true, fingerEdit:false, tolMs:180 };
  let lesson=null, score=null, notation=null, piano=null, cur=-1, countTimer=null;

  /* ---------- helpers ---------- */
  function keyName(tonic,mode){
    const disp=tonic.replace("#","♯").replace("b","♭");
    return t(mode==="major"?"key.major":"key.minor",{k:disp});
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
    notation=PLNotation.render($("#score"),score,st.hand,
      {showFingering: st.showFing && st.mode!=="test"});
    wireFingerEdit();
    const r=scoreRange();
    piano=PLPiano.render($("#kbd"),{lowMidi:r.lo,highMidi:r.hi,onKey:onScreenKey});
    PLPlayer.load({ steps:score.steps, timeTop:score.time[0],
      tempo:()=>st.tempo, loop:()=>st.loop, metronome:()=>st.metronome,
      onStep:playerStep, onState:transport, onEnd:()=>{ if(cur>=0) notation.setStepState(cur,"done"); } });
    cur=-1;
    fb(t(st.mode==="learn"?"fb.learnHint":st.mode==="practice"?"fb.practiceHint":"fb.testHint"));
    renderProgress();
    updateControls();
  }

  /* ---------- learn / demonstration ---------- */
  function showStep(i,{sound,state}={}){
    if(cur>=0&&cur!==i) notation.setStepState(cur,"done");
    notation.setStepState(i,state||"current");
    piano.clearTargets();
    stepTargets(i).forEach(x=>{
      piano.set(x.midi,"k-target-"+x.hand,true);
      if(st.showFing) piano.setFinger(x.midi,x.f);
    });
    cur=i;
  }
  function playerStep(i,durMs){
    showStep(i);
    const seen=new Set();
    stepTargets(i).forEach(x=>{ if(!seen.has(x.midi)){ seen.add(x.midi); PLAudio.blip(x.midi,durMs); } });
  }
  function stepManual(dir){
    if(st.mode!=="learn"||PLPlayer.isPlaying()) return;
    const n=score.steps.length, i=Math.max(0,Math.min(n-1,cur+dir));
    if(i===cur&&dir!==0) return;
    playerStep(i,60000/st.tempo*PLNotation.BEATS[score.steps[i].d]);
  }

  /* ---------- practice / test ---------- */
  function startSession(){
    PLPlayer.stop(); notation.clearStates(); piano.clearAll(); cur=-1;
    PLAudio.ensure();
    PLProgress.touch(st.ex,st.key,st.hand);   /* marks this key·hand In Progress */
    const begin=()=>PLSession.start({
      score, hand:st.hand, mode:st.mode, tempo:st.tempo, tolMs:st.tolMs,
      onTarget(i){
        if(st.mode==="test"){ if(cur>=0) notation.setStepState(cur,"done"); notation.setStepState(i,"cursor"); cur=i; }
        else showStep(i);
        fb(t("fb.waiting",{i:i+1,n:score.steps.length}));
      },
      onNote(midi,ok){ piano.flash(midi,ok?"k-correct":"k-wrong",ok?260:450); fb(ok?t("fb.correct"):t("fb.wrong")); },
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
        renderProgress(); updateControls();
      }
    });
    if(st.mode==="test"){
      fb(t("fb.countIn"));
      const spb=60000/st.tempo, beats=score.time[0];
      let b=0;
      (function count(){
        PLAudio.tick(b===0);
        if(++b<beats) countTimer=setTimeout(count,spb);
        else countTimer=setTimeout(begin,spb);
      })();
    } else begin();
    updateControls();
  }
  function endSession(){ clearTimeout(countTimer); PLSession.abort(); }

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
        const icon=s==="completed"?"✓":s==="progress"?"●":"–";
        const tip=b?`${t("prog.best")}: ♩=${b.tempo} · ${b.pitchAcc}%`:t("status."+s);
        return `<td class="ps-${s}" title="${tip}">${icon}</td>`;
      }).join("");
      return `<tr><td>${keyName(k,score.mode)}</td>${cells}</tr>`;
    });
    $("#progList").innerHTML=
      `<table class="ps"><tr><th>${t("ui.key")}</th><th>${t("hand.rh.short")}</th><th>${t("hand.lh.short")}</th><th>${t("hand.ht.short")}</th></tr>${rows.join("")}</table>`+
      `<p class="ps-legend">✓ ${t("status.completed")} · ● ${t("status.progress")} · – ${t("status.none")}</p>`;
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
    $("#tolWrap").style.display=st.mode==="test"?"":"none";
    /* test mode: the keyboard disappears — score reading only */
    $("#kbd").style.display=st.mode==="test"?"none":"";
  }
  function transport(state){
    $("#btnPlay").textContent=state==="play"?"⏸":"▶";
    if(state==="stop"){ /* leave last highlight for review */ }
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
  let fillKeysRef=()=>{};

  function boot(){
    document.title=PL_CONFIG.APP_NAME;
    $("#appName").textContent=PL_CONFIG.APP_NAME;
    PLI18N.apply();

    /* lesson framing — all text/data from lessons.js + locales, none hardcoded */
    lesson=PLLessons.current();
    st.ex=lesson.exercise;
    $("#lessonCrumb").textContent=t("lesson.crumb",{l:lesson.level,n:lesson.lesson});
    $("#lessonTitle").textContent=t(lesson.titleKey);
    $("#lessonGoal").textContent=t(lesson.goalKey);
    $("#lessonDesc").textContent=t(lesson.descKey);
    $("#formulaChip").innerHTML=`<b>${lesson.formula.join("–")}</b> · ${t("formula.degrees")} · ${t(lesson.formulaNoteKey)}`;

    const exSel=$("#selEx");
    exSel.innerHTML=PLEx.list().map(m=>`<option value="${m.id}">${t(m.titleKey)}</option>`).join("");
    exSel.onchange=()=>{ st.ex=exSel.value; fillKeys(); applyTempoBounds(); rebuild(); };
    function fillKeys(){
      const M=PLEx.MASTERS[st.ex], keys=PLEx.keysFor(st.ex);
      if(!keys.includes(st.key)) st.key=keys[0];
      $("#selKey").innerHTML=keys.map(k=>`<option value="${k}" ${k===st.key?"selected":""}>${keyName(k,M.mode)}</option>`).join("");
    }
    function applyTempoBounds(){
      const T=PLEx.MASTERS[st.ex].tempo, el=$("#tempo");
      el.min=T.min; el.max=T.max; el.value=st.tempo=T.default;
      $("#tempoVal").textContent=st.tempo;
    }
    fillKeysRef=fillKeys;
    fillKeys();
    renderTeacherKeys();
    $("#selKey").onchange=e=>{ st.key=e.target.value; rebuild(); };

    seg($("#segHand"),[{v:"rh",label:t("hand.rh.short")},{v:"lh",label:t("hand.lh.short")},{v:"ht",label:t("hand.ht.short")}],
        ()=>st.hand,v=>st.hand=v);
    seg($("#segMode"),[{v:"learn",label:t("mode.learn")},{v:"practice",label:t("mode.practice")},{v:"test",label:t("mode.test")}],
        ()=>st.mode,v=>st.mode=v);

    applyTempoBounds();
    const tempoEl=$("#tempo");
    tempoEl.oninput=()=>{ st.tempo=+tempoEl.value; $("#tempoVal").textContent=st.tempo; };
    $("#tol").oninput=e=>{ st.tolMs=+e.target.value; $("#tolVal").textContent=st.tolMs; };
    $("#chkLoop").onchange=e=>st.loop=e.target.checked;
    $("#chkMet").onchange=e=>st.metronome=e.target.checked;
    $("#chkSound").onchange=e=>{ st.sound=e.target.checked; PLAudio.setSound(st.sound); };
    $("#chkFing").onchange=e=>{ st.showFing=e.target.checked; rebuild(); };
    $("#chkFingEdit").onchange=e=>{ st.fingerEdit=e.target.checked;
      if(st.fingerEdit) fb(t("fb.fingerEditHint"));
      rebuild(); };

    $("#btnPlay").onclick=()=>{ PLAudio.ensure(); PLPlayer.isPlaying()?PLPlayer.pause():PLPlayer.play(); };
    $("#btnStop").onclick=()=>{ PLPlayer.stop(); endSession(); updateControls(); };
    $("#btnRestart").onclick=()=>{ notation.clearStates(); cur=-1; PLPlayer.restart(); };
    $("#btnPrev").onclick=()=>stepManual(-1);
    $("#btnNext").onclick=()=>stepManual(1);
    $("#btnStart").onclick=startSession;

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

    rebuild();
  }
  document.addEventListener("DOMContentLoaded",boot);
})();
