/* Piano Lab — i18n layer (Aural Lab model).
   Languages: en (default + complete fallback), es.

   - Strings live in locales/<lang>.js as flat key → string dicts (UTF-8).
   - t(key,vars): current language → English fallback → the key itself
     (a visible key on screen = a missing translation, easy to spot).
   - The student's choice persists in localStorage ("pl-lang") on this
     device; it is independent from progress, MIDI, audio and settings.
   - mountSwitcher() adds an English/Español select to the .pl-header .inner
     of pages that call it (teacher.html never calls it — English only).
   - Note names (C, D, E… C4), fingering numbers and standard musical
     symbols are never translated — embedded via {vars} or kept literal. */
const PLI18N=(()=>{
  const LS="pl-lang";
  /* LANGUAGE UI SWITCH (instructor 2026-07-20): English-only for school use
     until the whole studio ships es/ko together. Translations stay in
     locales/es.js — flip this to true to bring the selector back. */
  const LANG_UI_ENABLED=false;
  const dicts={
    en:(typeof I18N_EN!=="undefined")?I18N_EN:{},
    es:(typeof I18N_ES!=="undefined")?I18N_ES:{}
  };
  const NAMES={en:"English",es:"Español"};
  const AVAILABLE=LANG_UI_ENABLED?["en","es"]:["en"];

  let lang=(function(){
    if(!LANG_UI_ENABLED){ try{ localStorage.setItem(LS,"en"); }catch(e){} return "en"; }
    /* A ?lang=xx in the URL wins and is written back to localStorage — this is
       how setLang() reliably applies a switch even when localStorage writes
       silently fail (private mode / quota) or a stale page is bfcache-served.
       The param is then stripped so the address bar stays clean. */
    let fromUrl=null;
    try{ fromUrl=new URLSearchParams(location.search).get("lang"); }catch(e){}
    if(fromUrl&&AVAILABLE.includes(fromUrl)){
      try{ localStorage.setItem(LS,fromUrl); }catch(e){}
      try{ const u=new URL(location.href); u.searchParams.delete("lang");
        history.replaceState(null,"",u.pathname+(u.search||"")+u.hash); }catch(e){}
      return fromUrl;
    }
    try{ const s=localStorage.getItem(LS); if(s&&AVAILABLE.includes(s)) return s; }catch(e){}
    const d=(typeof PL_CONFIG!=="undefined"&&PL_CONFIG.LANG)||"en";
    return AVAILABLE.includes(d)?d:"en";
  })();

  function t(key,vars){
    let s=(dicts[lang]&&dicts[lang][key])??dicts.en[key]??key;
    if(vars) for(const v in vars) s=s.split("{"+v+"}").join(vars[v]);
    return s;
  }
  function apply(root){ /* fill every [data-i18n] / [data-i18n-html] / title */
    (root||document).querySelectorAll("[data-i18n]").forEach(el=>{ el.textContent=t(el.dataset.i18n); });
    (root||document).querySelectorAll("[data-i18n-html]").forEach(el=>{ el.innerHTML=t(el.dataset.i18nHtml); });
    (root||document).querySelectorAll("[data-i18n-title]").forEach(el=>{ el.title=t(el.dataset.i18nTitle); });
  }
  function setLang(l){
    if(!AVAILABLE.includes(l)) return;
    lang=l;
    try{ localStorage.setItem(LS,l); }catch(e){}
    /* reload WITH the choice in the URL — guarantees the new language applies
       even if the localStorage write above failed, and dodges bfcache by
       navigating to a distinct URL */
    try{ const u=new URL(location.href); u.searchParams.set("lang",l);
      location.replace(u.toString()); }
    catch(e){ location.reload(); }
  }
  /* English / Español selector — mounted into the page header by the pages
     that support the full student path (never auto-mounted: teacher.html
     stays English-only per studio precedent) */
  function mountSwitcher(){
    if(!LANG_UI_ENABLED) return;   /* selector hidden until languages launch */
    const host=document.querySelector(".pl-header .inner");
    if(!host||document.getElementById("langSel")) return;
    const sel=document.createElement("select");
    sel.id="langSel"; sel.className="lang-sel";
    sel.setAttribute("aria-label","Language / Idioma");
    AVAILABLE.forEach(l=>{
      const o=document.createElement("option");
      o.value=l; o.textContent=NAMES[l]; if(l===lang) o.selected=true;
      sel.appendChild(o);
    });
    sel.onchange=()=>setLang(sel.value);
    host.appendChild(sel);
  }
  return {t,apply,setLang,mountSwitcher,lang:()=>lang,
          available:()=>AVAILABLE.slice(),NAMES};
})();
const t=PLI18N.t;
if(typeof module!=="undefined") module.exports=PLI18N;
