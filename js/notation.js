/* Piano Lab — original SVG notation renderer: single staff or grand staff,
   key signatures, time signature, ledger lines, chords, fingering numbers,
   Roman-numeral labels, and per-step highlight states for playback/practice.
   Clef drawing is adapted from the studio's proven in-house staff engine.
   Spelling-faithful: draws exactly the letters/accidentals it is given and
   never respells enharmonics (Cb stays Cb, E# stays E#).
   Limitations (enough for phase 1): durations w/h/q, no beams, no chord
   second-interval offsets (triadic chords only), fixed step spacing. */
const PLNotation=(()=>{
  const GAP=15, LEFT=12;
  const BEATS={w:4,h:2,q:1};
  const SPACING={q:56,h:80,w:112};
  const KSPOS={ sharp:{treble:["F5","C5","G5","D5","A4","E5","B4"],bass:["F3","C3","G3","D3","A2","E3","B2"]},
                flat:{treble:["B4","E5","A4","D5","G4","C5","F4"],bass:["B2","E3","A2","D3","G2","C3","F2"]} };

  function baseIdx(clef){ return clef==="bass"?18:30; }   /* dia of bottom line */
  function midLine(clef){ return clef==="bass"?22:34; }   /* dia of middle line */
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
    const dy=acc<0?4:8;   /* flat glyph sits on its stem; sharps/naturals center */
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

  /* draw one hand's material of a step; returns svg fragments */
  function handSVG(step,hand,x,geo,sig,showFing,stepIdx){
    const parts=[];
    const clef=hand==="rh"?"treble":"bass";
    const y0=hand==="rh"?geo.yT:geo.yB;
    const sps=step[hand]; if(!sps.length) return parts;
    const notes=sps.map(PLPitch.parse);
    const ys=notes.map(p=>yFor(p,clef,y0));
    const hollow=step.d!=="q";
    notes.forEach((p,i)=>{
      ledgerSVG(parts,x,PLPitch.dia(p),clef,y0);
      if(p.acc!==PLPitch.sigAccFor(sig,p.letter)) parts.push(accSVG(x-22,ys[i],p.acc));
      parts.push(step.d==="w"
        ?`<ellipse class="note hollow" cx="${x}" cy="${ys[i]}" rx="10.5" ry="6.5"/>`
        :`<ellipse class="note${hollow?" hollow":""}" cx="${x}" cy="${ys[i]}" rx="9" ry="6.5" transform="rotate(-14 ${x} ${ys[i]})"/>`);
    });
    if(step.d!=="w"){
      const avg=notes.reduce((a,p)=>a+PLPitch.dia(p),0)/notes.length;
      const up=avg<midLine(clef);
      const yTop=Math.min(...ys), yBot=Math.max(...ys);
      parts.push(up
        ?`<line class="stem" x1="${x+8.5}" y1="${yBot-1}" x2="${x+8.5}" y2="${yTop-3.4*GAP}"/>`
        :`<line class="stem" x1="${x-8.5}" y1="${yTop+1}" x2="${x-8.5}" y2="${yBot+3.4*GAP}"/>`);
    }
    if(showFing){
      const fingers=hand==="rh"?step.fr:step.fl;
      /* RH numbers stack above the treble staff (top note first);
         LH numbers stack below the bass staff (bottom note first) */
      const order=notes.map((p,i)=>({i,d:PLPitch.dia(p)}))
                       .sort((a,b)=>hand==="rh"?b.d-a.d:a.d-b.d);
      const base=hand==="rh"
        ? Math.min(Math.min(...ys)-16, y0-12)
        : Math.max(Math.max(...ys)+22, y0+4*GAP+22);
      order.forEach((o,k)=>{
        const fy=hand==="rh"?base-k*15:base+k*15;
        parts.push(`<text class="fing fing-${hand}" data-hand="${hand}" data-step="${stepIdx}" data-note="${o.i}" x="${x}" y="${fy}" text-anchor="middle">${fingers[o.i]??""}</text>`);
      });
    }
    return parts;
  }

  /* render(container, score, hand, {showFingering}) */
  function render(container,score,hand,opts){
    opts=opts||{};
    const showFing=opts.showFingering!==false;
    const hands=hand==="ht"?["rh","lh"]:[hand];
    const geo={};
    if(hand==="ht"){ geo.yT=46; geo.yB=46+60+72; }
    else if(hand==="rh"){ geo.yT=46; }
    else { geo.yB=40; }
    const topY   = hand==="lh"?geo.yB:geo.yT;
    const botY   = hand==="rh"?geo.yT:geo.yB;
    const sysBot = botY+4*GAP;
    const romanY = sysBot+ (hands.includes("lh")&&showFing?58:34);
    const H      = romanY+16;

    const ksN=Math.abs(score.sig);
    const xTime=LEFT+62+ksN*13;
    const x0=xTime+32;

    const head=[], body=[], stepRefs=[];
    /* staves */
    for(const h of hands){
      const y0=h==="rh"?geo.yT:geo.yB;
      for(let i=0;i<5;i++) head.push(`<line class="staffline" data-w x1="${LEFT}" y1="${y0+i*GAP}" x2="__W__" y2="${y0+i*GAP}"/>`);
      clefSVG(head,h==="rh"?"treble":"bass",y0);
      keysigSVG(head,h==="rh"?"treble":"bass",y0,score.sig);
      timeSVG(head,y0,xTime,score.time);
    }
    if(hand==="ht"){
      head.push(`<path class="brace" d="M ${LEFT-4} ${geo.yT} C ${LEFT-16} ${geo.yT+45} ${LEFT-16} ${geo.yB+15} ${LEFT-4} ${geo.yB+60}"/>`);
      head.push(`<line class="barline" x1="${LEFT}" y1="${geo.yT}" x2="${LEFT}" y2="${geo.yB+4*GAP}"/>`);
    }

    /* steps + automatic barlines from the time signature */
    let x=x0, beatAcc=0;
    score.steps.forEach((s,i)=>{
      const nx=x+20;   /* notehead center inside the slot */
      const frag=[];
      for(const h of hands) frag.push(...handSVG(s,h,nx,geo,score.sig,showFing,i));
      if(s.roman) frag.push(`<text class="roman" x="${nx}" y="${romanY}" text-anchor="middle">${s.roman}</text>`);
      body.push(`<g class="nstep" data-i="${i}">${frag.join("")}</g>`);
      x+=SPACING[s.d];
      beatAcc+=BEATS[s.d];
      if(beatAcc>=score.time[0]&&i<score.steps.length-1){
        body.push(`<line class="barline" x1="${x}" y1="${topY}" x2="${x}" y2="${sysBot}"/>`);
        x+=16; beatAcc=0;
      }
    });
    /* final barline (thin + thick) */
    body.push(`<line class="barline" x1="${x+4}" y1="${topY}" x2="${x+4}" y2="${sysBot}"/>`);
    body.push(`<rect class="barfinal" x="${x+9}" y="${topY}" width="5.5" height="${sysBot-topY}"/>`);
    const W=x+26;

    const svg=`<svg class="pl-score" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" role="img">`+
      head.join("").replace(/__W__/g,W-6)+body.join("")+`</svg>`;
    container.innerHTML=svg;

    const el=container.querySelector("svg");
    const steps=el.querySelectorAll(".nstep");
    function setStepState(i,state){
      const g=steps[i]; if(!g) return;
      g.classList.remove("st-current","st-correct","st-wrong","st-done","st-cursor");
      if(state&&state!=="none") g.classList.add("st-"+state);
    }
    function clearStates(){ for(let i=0;i<steps.length;i++) setStepState(i,"none"); }
    return {el,steps,count:score.steps.length,setStepState,clearStates};
  }

  return {render,BEATS};
})();
if(typeof module!=="undefined") module.exports=PLNotation;
