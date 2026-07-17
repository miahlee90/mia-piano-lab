/* Piano Lab — tiny i18n layer. Strings live in locales/<lang>.js; components
   call t("key") or t("key",{vars}). Adding a language = one new locale file
   + PL_CONFIG.LANG (or a future user setting). */
const PLI18N=(()=>{
  const dicts={ en:(typeof I18N_EN!=="undefined")?I18N_EN:{} };
  let lang=(typeof PL_CONFIG!=="undefined"&&PL_CONFIG.LANG)||"en";
  function t(key,vars){
    let s=(dicts[lang]&&dicts[lang][key])??dicts.en[key]??key;
    if(vars) for(const v in vars) s=s.split("{"+v+"}").join(vars[v]);
    return s;
  }
  function apply(root){ /* fill every [data-i18n] element */
    (root||document).querySelectorAll("[data-i18n]").forEach(el=>{ el.textContent=t(el.dataset.i18n); });
    (root||document).querySelectorAll("[data-i18n-title]").forEach(el=>{ el.title=t(el.dataset.i18nTitle); });
  }
  return {t,apply,setLang:l=>{lang=l;},lang:()=>lang};
})();
const t=PLI18N.t;
if(typeof module!=="undefined") module.exports=PLI18N;
