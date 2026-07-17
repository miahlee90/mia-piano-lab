/* Piano Lab — original SVG notation renderer v2: single staff or grand staff,
   key/time signatures, ledger lines, chords, fingering numbers, Roman
   numerals, per-step highlight states — now with eighth/sixteenth notes
   (flags + automatic per-beat beaming), dotted notes, rests (whole/half/
   quarter/eighth/sixteenth, stylized glyphs), ties, and pickup (anacrusis)
   measures. Clef drawing adapted from the studio's proven staff engine.
   Spelling-faithful: draws exactly the letters/accidentals it is given.
   Remaining limits: level (horizontal) beams only, uniform beam groups
   (mixed dotted-8th+16th figures fall back to flags), no dotted rests,
   no chord second-interval offsets (triadic chords only). */
const PLNotation=(()=>{
  const GAP=15, LEFT=12;
  const BEATS={w:4,h:2,q:1,"8":.5,"16":.25};
  const SPACING={w:112,h:80,q:56,"8":42,"16":34};
  const KSPOS={ sharp:{treble:["F5","C5","G5","D5","A4","E5","B4"],bass:["F3","C3","G3","D3","A2","E3","B2"]},
                flat:{treble:["B4","E5","A4","D5","G4","C5","F4"],bass:["B2","E3","A2","D3","G2","C3","F2"]} };

  function normD(d){ d=String(d); return d.endsWith(".")?d.slice(0,-1):d; }
  function isDot(d){ return String(d).endsWith("."); }
  function beatsOf(d){ return BEATS[normD(d)]*(isDot(d)?1.5:1); }
  function spacingOf(d){ return SPACING[normD(d)]*(isDot(d)?1.2:1); }

  function baseIdx(clef){ return clef==="bass"?18:30; }
  function midLine(clef){ return clef==="bass"?22:34; }
  function yFor(p,clef,y0){ return (y0+4*GAP)-(PLPitch.dia(p)-baseIdx(clef))*(GAP/2); }

  function clefSVG(parts,clef,y0){
    if(clef==="treble"){
      const g=y0;
      [`M 34 ${g-22} L 34 ${g+70}`,
       `M 34 ${g-22} C 44 ${g-17} 45 ${g} 38 ${g+10} C 36 ${g+13} 35 ${g+14} 34 ${g+15}`,
       `M 34 ${g+15} C 22.4 ${g+15} 13 ${g+25} 13 ${g+37.5} C 13 ${g+50} 22.4 ${g+60} 34 ${g+60}`,
       `M 34 ${g+60} C 44 ${g+60} 47 ${g+48} 41 ${g+38} C 37 ${g+31} 29 ${g+29} 25 ${g+36} C 22 ${g+41} 25 ${g+47} 30 ${g+48}`,
       `M 34 ${g+70} C 35 ${g+77} 25 ${g+80} 21 ${g+74} C 18 ${g+69} 24 ${g+66} 27 ${g+69}`
      ].forEach(d=>parts.push(`<path class="clef-stroke" d="${d}"/>`));
    }else{
      parts.push(`<circle class="clefdot" cx="${LEFT+7.5}" cy="${y0+GAP}" r="5.4"/>`);
      parts.push(`<path class="clef-path" d="M ${LEFT+5} ${y0+9} C ${LEFT+10} ${y0-2}, ${LEFT+22} ${y0-3}, ${LEFT+26} ${y0+6} C ${LEFT+30} ${y0+15}, ${LEFT+26} ${y0+32}, ${LEFT+8} ${y0+50} C ${LEFT+6} ${y0+52}, ${LEFT+5} ${y0+50}, ${LEFT+7} ${y0+48} C ${LEFT+20} ${y0+34}, ${LEFT+24} ${y0+18}, ${LEFT+21} ${y0+8} C ${LEFT+18} ${y0+1}, ${LEFT+10} ${y0+2}, ${LEFT+5} ${y0+9} Z"/>`);
      parts.push(`<circle class="clefdot" cx="${LEFT+31}" cy="${y0+GAP*0.5}" r="3.1"/>`);
      parts.push(`<circle class="clefdot" cx="${LEFT+31}" cy="${y0+GAP*1.5}" r="3.1"/>`);
    }
  }
  function accGlyph(acc){ return {"-2":"𝄫","-1":"♭","0":"♮","1":"♯","2":"𝄪"}[acc]; }
  function accSVG(x,y,acc){
    const dy=acc<0?4:8;
    return `<text class="acc" x="${x}" y="${y+dy}" font-size="30" text-anchor="middle">${accGlyph(acc)}</text>`;
  }
  function keysigSVG(parts,clef,y0,sig){
    const type=sig>0?"sharp":"flat", n=Math.abs(sig);
    for(let i=0;i<n;i++){
      const p=PLPitch.parse(KSPOS[type][clef][i]);
      parts.push(accSVG(LEFT+52+i*13,yFor(p,clef,y0),sig>0?1:-1));
    }
  }
  function timeSVG(parts,y0,x,time){
    parts.push(`<text class="tsig" x="${x}" y="${y0+2*GAP-3}" font-size="28" text-anchor="middle">${time[0]}</text>`);
    parts.push(`<text class="tsig" x="${x}" y="${y0+4*GAP-3}" font-size="28" text-anchor="middle">${time[1]}</text>`);
  }
  function ledgerSVG(parts,x,d,clef,y0){
    const b=baseIdx(clef);
    for(let L=b-2; L>=d; L-=2){ const y=(y0+4*GAP)-(L-b)*(GAP/2); parts.push(`<line class="ledger" x1="${x-16}" y1="${y}" x2="${x+16}" y2="${y}"/>`); }
    for(let L=b+10; L<=d; L+=2){ const y=(y0+4*GAP)-(L-b)*(GAP/2); parts.push(`<line class="ledger" x1="${x-16}" y1="${y}" x2="${x+16}" y2="${y}"/>`); }
  }
  /* stylized rest glyphs (portable paths — no reliance on music fonts) */
  function restSVG(parts,x,y0,d){
    const m=y0+2*GAP, nd=normD(d);
    if(nd==="w"){ parts.push(`<rect class="rest" x="${x-9}" y="${y0+GAP}" width="18" height="6.5"/>`); return; }
    if(nd==="h"){ parts.push(`<rect class="rest" x="${x-9}" y="${m-6.5}" width="18" height="6.5"/>`); return; }
    if(nd==="q"){
      parts.push(`<path class="rest" d="M ${x-4} ${m-16} L ${x+4.5} ${m-6.5} `+
        `C ${x-0.5} ${m-2} ${x-1} ${m+1} ${x+3.5} ${m+6} `+
        `C ${x-3} ${m+4} ${x-5.5} ${m+7} ${x-2.5} ${m+13} `+
        `C ${x-8} ${m+9} ${x-7.5} ${m+4} ${x-4.5} ${m+2.5} `+
        `C ${x-7} ${m-1} ${x-6.5} ${m-3} ${x-4} ${m-16} Z"/>`);
      return;
    }
    /* 8th / 16th */
    parts.push(`<circle class="rest" cx="${x-3}" cy="${m-5}" r="3"/>`);
    parts.push(`<path class="rest-stroke" d="M ${x-3} ${m-5} C ${x+1} ${m-1.5} ${x+3.5} ${m-3} ${x+5.5} ${m-8}"/>`);
    parts.push(`<line class="rest-stroke" x1="${x+5.5}" y1="${m-8}" x2="${x-0.5}" y2="${m+10}"/>`);
    if(nd==="16"){
      parts.push(`<circle class="rest" cx="${x-4.2}" cy="${m+1.5}" r="3"/>`);
      parts.push(`<path class="rest-stroke" d="M ${x-4.2} ${m+1.5} C ${x-0.5} ${m+5} ${x+1} ${m+3.5} ${x+2.5} ${m+1}"/>`);
    }
  }
  function flagSVG(parts,sx,tipY,up,dbl){
    const s=up?1:-1;
    parts.push(`<path class="flag" d="M ${sx} ${tipY} C ${sx+9} ${tipY+8*s}, ${sx+10} ${tipY+16*s}, ${sx+4} ${tipY+24*s}"/>`);
    if(dbl) parts.push(`<path class="flag" d="M ${sx} ${tipY+9*s} C ${sx+8} ${tipY+16*s}, ${sx+9} ${tipY+22*s}, ${sx+4} ${tipY+30*s}"/>`);
  }

  /* automatic beaming: consecutive 8th/16th notes (per hand) inside the same
     metric beat are beamed; anything else gets a flag. Dotted small values
     fall back to flags. Returns [{idx:[stepIdx…]}] */
  function beamGroups(steps,hand,pickup,timeTop){
    const groups=[]; let cur=null, pos=pickup?(timeTop-pickup):0;
    steps.forEach((s,i)=>{
      const nd=normD(s.d);
      const eligible=(nd==="8"||nd==="16")&&!isDot(s.d)&&s[hand].length>0;
      const beat=Math.floor(pos+1e-6);
      if(eligible){
        if(cur&&cur.beat===beat&&cur.last===i-1){ cur.idx.push(i); cur.last=i; }
        else{ cur={beat,idx:[i],last:i}; groups.push(cur); }
      } else cur=null;
      pos+=beatsOf(s.d);
    });
    return groups.filter(g=>g.idx.length>=2);
  }

  /* render(container, score, hand, {showFingering}) */
  function render(container,score,hand,opts){
    opts=opts||{};
    const showFing=opts.showFingering!==false;
    const hands=hand==="ht"?["rh","lh"]:[hand];
    const pickup=score.pickup||0;

    /* ---- dynamic vertical geometry (nothing may clip) ---- */
    function diaRange(h){
      let mn=99,mx=-99;
      score.steps.forEach(s=>s[h].forEach(sp=>{
        const d=PLPitch.dia(sp); if(d<mn)mn=d; if(d>mx)mx=d; }));
      if(mn>mx){ mn=mx=midLine(h==="rh"?"treble":"bass"); }  /* all-rest hand */
      return {mn,mx};
    }
    const topHand=hands[0], botHand=hands[hands.length-1];
    const tBase=baseIdx(topHand==="rh"?"treble":"bass");
    const bBase=baseIdx(botHand==="rh"?"treble":"bass");
    const rT=diaRange(topHand), rB=diaRange(botHand);
    const overTop=Math.max(0,rT.mx-(tBase+8))*(GAP/2)+9;
    const overBot=Math.max(0,bBase-rB.mn)*(GAP/2)+9;
    /* fingering stacks one number per chord note — reserve room for the
       tallest chord, above (RH) and below (LH) */
    const nT=Math.max(1,...score.steps.map(s=>s[topHand].length));
    const nB=Math.max(1,...score.steps.map(s=>s[botHand].length));
    const padTop=Math.max(34,overTop+(showFing&&topHand==="rh"?38+15*(nT-1):26));
    const geo={};
    if(hand==="ht"){
      const innerT=Math.max(0,tBase-rT.mn)*(GAP/2);
      const innerB=Math.max(0,rB.mx-(bBase+8))*(GAP/2);
      geo.yT=padTop;
      geo.yB=geo.yT+4*GAP+Math.max(64,innerT+innerB+30);
    }
    else if(hand==="rh") geo.yT=padTop;
    else geo.yB=padTop;
    const topY   = hand==="lh"?geo.yB:geo.yT;
    const botY   = hand==="rh"?geo.yT:geo.yB;
    const sysBot = botY+4*GAP;
    const romanY = sysBot+overBot+(hands.includes("lh")&&showFing?52+15*(nB-1):30);
    const H      = romanY+16;

    const ksN=Math.abs(score.sig);
    const xTime=LEFT+62+ksN*13;
    const x0=xTime+32;

    /* ---- pass 1: x positions + barlines from the time signature ---- */
    const xs=[], bars=[];
    let x=x0, beatAcc=pickup?(score.time[0]-pickup):0;
    score.steps.forEach((s,i)=>{
      xs.push(x+20);
      x+=spacingOf(s.d);
      beatAcc+=beatsOf(s.d);
      if(beatAcc>=score.time[0]-1e-6&&i<score.steps.length-1){ bars.push(x); x+=16; beatAcc=0; }
    });
    const endX=x+14.5;   /* right edge of the final thick barline */
    const W=x+26;

    /* ---- pass 2: beam geometry per hand ---- */
    const beamed={rh:{},lh:{}}, beamRects=[];
    for(const h of hands){
      const clef=h==="rh"?"treble":"bass", y0=h==="rh"?geo.yT:geo.yB;
      beamGroups(score.steps,h,pickup,score.time[0]).forEach(g=>{
        const dias=g.idx.flatMap(i=>score.steps[i][h].map(sp=>PLPitch.dia(sp)));
        const up=dias.reduce((a,b)=>a+b,0)/dias.length<midLine(clef);
        const sxOff=up?8.5:-8.5;
        const tips=g.idx.map(i=>{
          const ys=score.steps[i][h].map(sp=>yFor(sp,clef,y0));
          return up?Math.min(...ys)-3.3*GAP:Math.max(...ys)+3.3*GAP;
        });
        const beamY=up?Math.min(...tips):Math.max(...tips);
        g.idx.forEach(i=>{ beamed[h][i]={up,beamY,sxOff}; });
        const xA=xs[g.idx[0]]+sxOff, xB=xs[g.idx[g.idx.length-1]]+sxOff;
        beamRects.push(`<rect class="beam" x="${Math.min(xA,xB)}" y="${up?beamY:beamY-4.2}" width="${Math.abs(xB-xA)}" height="4.2"/>`);
        /* secondary beam for sixteenth runs */
        let run=[];
        const flush=()=>{ if(run.length>=2){
          const a=xs[run[0]]+sxOff, b=xs[run[run.length-1]]+sxOff, yy=up?beamY+7:beamY-7-4.2;
          beamRects.push(`<rect class="beam" x="${Math.min(a,b)}" y="${yy}" width="${Math.abs(b-a)}" height="4.2"/>`);
        } run=[]; };
        g.idx.forEach(i=>{ if(normD(score.steps[i].d)==="16") run.push(i); else flush(); });
        flush();
      });
    }

    /* ---- pass 3: heads/stems/flags/rests/dots/fingering per step ---- */
    function handSVG(step,h,xC,stepIdx){
      const parts=[];
      const clef=h==="rh"?"treble":"bass";
      const y0=h==="rh"?geo.yT:geo.yB;
      const sps=step[h];
      if(!sps.length){ restSVG(parts,xC,y0,step.d); return parts; }
      const notes=sps.map(PLPitch.parse);
      const ys=notes.map(p=>yFor(p,clef,y0));
      const nd=normD(step.d), hollow=(nd==="w"||nd==="h");
      /* chords containing a second: the LOWER note of the pair is offset to
         the LEFT (instructor rule) — the other notes keep the main column,
         so chord columns stay aligned across the score */
      const dias=notes.map(p=>PLPitch.dia(p));
      const off=notes.map(()=>0);
      for(let i=1;i<notes.length;i++)
        if(dias[i]-dias[i-1]===1&&off[i-1]===0&&off[i]===0) off[i-1]=-13;
      notes.forEach((p,i)=>{
        const nx=xC+off[i];
        ledgerSVG(parts,nx,PLPitch.dia(p),clef,y0);
        if(p.acc!==PLPitch.sigAccFor(score.sig,p.letter)) parts.push(accSVG(xC-22,ys[i],p.acc));
        parts.push(nd==="w"
          ?`<ellipse class="note hollow" cx="${nx}" cy="${ys[i]}" rx="10.5" ry="6.5"/>`
          :`<ellipse class="note${hollow?" hollow":""}" cx="${nx}" cy="${ys[i]}" rx="9" ry="6.5" transform="rotate(-14 ${nx} ${ys[i]})"/>`);
        if(isDot(step.d)){
          const onLine=(PLPitch.dia(p)-baseIdx(clef))%2===0;
          parts.push(`<circle class="dot" cx="${nx+15}" cy="${ys[i]-(onLine?GAP/2:0)}" r="2.7"/>`);
        }
      });
      if(nd!=="w"){
        const bm=beamed[h][stepIdx];
        const yTop=Math.min(...ys), yBot=Math.max(...ys);
        if(bm){
          parts.push(`<line class="stem" x1="${xC+bm.sxOff}" y1="${bm.up?yBot-1:yTop+1}" x2="${xC+bm.sxOff}" y2="${bm.beamY}"/>`);
        }else{
          const up=notes.reduce((a,p)=>a+PLPitch.dia(p),0)/notes.length<midLine(clef);
          const tip=up?yTop-3.4*GAP:yBot+3.4*GAP;
          parts.push(up
            ?`<line class="stem" x1="${xC+8.5}" y1="${yBot-1}" x2="${xC+8.5}" y2="${tip}"/>`
            :`<line class="stem" x1="${xC-8.5}" y1="${yTop+1}" x2="${xC-8.5}" y2="${tip}"/>`);
          if(nd==="8"||nd==="16") flagSVG(parts,xC+(up?8.5:-8.5),tip,up,nd==="16");
        }
      }
      if(showFing){
        const fingers=h==="rh"?step.fr:step.fl;
        /* stacks read top-down in NOTE order for both hands: highest note's
           finger on top — RH shows 1/3/5, LH shows 1/3/5 (1 = top note) */
        const order=notes.map((p,i)=>({i,d:PLPitch.dia(p)}))
                         .sort((a,b)=>b.d-a.d);
        const base=h==="rh"
          ? Math.min(Math.min(...ys)-16, y0-12)
          : Math.max(Math.max(...ys)+22, y0+4*GAP+22);
        order.forEach((o,k)=>{
          const fy=h==="rh"?base-k*15:base+k*15;
          parts.push(`<text class="fing fing-${h}" data-hand="${h}" data-step="${stepIdx}" data-note="${o.i}" x="${xC}" y="${fy}" text-anchor="middle">${fingers[o.i]??""}</text>`);
        });
      }
      return parts;
    }

    /* ---- pass 4: ties (arc to the next step's same spelling) ---- */
    const tieArcs=[];
    for(const h of hands){
      const clef=h==="rh"?"treble":"bass", y0=h==="rh"?geo.yT:geo.yB;
      score.steps.forEach((s,i)=>{
        const ties=h==="rh"?(s.rhT||[]):(s.lhT||[]);
        const nxt=score.steps[i+1];
        if(!nxt) return;
        s[h].forEach((sp,k)=>{
          if(!ties[k]||!nxt[h].includes(sp)) return;
          const y=yFor(sp,clef,y0);
          const below=PLPitch.dia(sp)<midLine(clef);   /* opposite the stem */
          const yo=below?9:-9, cp=below?17:-17;
          tieArcs.push(`<path class="tie" d="M ${xs[i]+6} ${y+yo} Q ${(xs[i]+xs[i+1])/2} ${y+cp} ${xs[i+1]-6} ${y+yo}"/>`);
        });
      });
    }

    /* ---- assemble ---- */
    const head=[], body=[];
    for(const h of hands){
      const y0=h==="rh"?geo.yT:geo.yB;
      /* staff lines stop exactly at the final barline — no tail past it */
      for(let i=0;i<5;i++) head.push(`<line class="staffline" x1="${LEFT}" y1="${y0+i*GAP}" x2="${endX}" y2="${y0+i*GAP}"/>`);
      clefSVG(head,h==="rh"?"treble":"bass",y0);
      keysigSVG(head,h==="rh"?"treble":"bass",y0,score.sig);
      timeSVG(head,y0,xTime,score.time);
    }
    if(hand==="ht"){
      head.push(`<path class="brace" d="M ${LEFT-4} ${geo.yT} C ${LEFT-16} ${geo.yT+45} ${LEFT-16} ${geo.yB+15} ${LEFT-4} ${geo.yB+60}"/>`);
      head.push(`<line class="barline" x1="${LEFT}" y1="${geo.yT}" x2="${LEFT}" y2="${geo.yB+4*GAP}"/>`);
    }
    score.steps.forEach((s,i)=>{
      const frag=[];
      for(const h of hands) frag.push(...handSVG(s,h,xs[i],i));
      if(s.roman) frag.push(`<text class="roman" x="${xs[i]}" y="${romanY}" text-anchor="middle">${s.roman}</text>`);
      body.push(`<g class="nstep" data-i="${i}">${frag.join("")}</g>`);
    });
    body.push(...beamRects,...tieArcs);
    bars.forEach(bx=>body.push(`<line class="barline" x1="${bx}" y1="${topY}" x2="${bx}" y2="${sysBot}"/>`));
    body.push(`<line class="barline" x1="${x+4}" y1="${topY}" x2="${x+4}" y2="${sysBot}"/>`);
    body.push(`<rect class="barfinal" x="${x+9}" y="${topY}" width="5.5" height="${sysBot-topY}"/>`);

    const svg=`<svg class="pl-score" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" role="img">`+
      head.join("")+body.join("")+`</svg>`;
    container.innerHTML=svg;

    const el=container.querySelector("svg");
    /* constant visual scale regardless of step count — short exercises
       (e.g. 3-chord progressions) must not blow up to fill the card */
    if(el&&el.style) el.style.maxWidth=Math.round(W*1.3)+"px";
    const steps=el.querySelectorAll(".nstep");
    function setStepState(i,state){
      const g=steps[i]; if(!g) return;
      g.classList.remove("st-current","st-correct","st-wrong","st-done","st-cursor");
      if(state&&state!=="none") g.classList.add("st-"+state);
    }
    function clearStates(){ for(let i=0;i<steps.length;i++) setStepState(i,"none"); }
    return {el,steps,count:score.steps.length,setStepState,clearStates};
  }

  return {render,BEATS,beatsOf,normD,isDot};
})();
if(typeof module!=="undefined") module.exports=PLNotation;
