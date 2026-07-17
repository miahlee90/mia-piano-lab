/* Piano Lab — app configuration.
   APP_NAME is a WORKING TITLE; the final brand may change, so nothing else in
   the codebase hardcodes it — always read it from here. */
const PL_CONFIG={
  APP_NAME:"Piano Lab",
  VERSION:"0.1.0",
  LANG:"en"            /* future: "ko", "es" — add locales/<lang>.js */
};
if(typeof module!=="undefined") module.exports=PL_CONFIG;
