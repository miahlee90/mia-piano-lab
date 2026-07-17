/* Piano Lab — app configuration.
   APP_NAME is a WORKING TITLE; the final brand may change, so nothing else in
   the codebase hardcodes it — always read it from here. */
const PL_CONFIG={
  APP_NAME:"Piano Lab",
  VERSION:"0.1.0",
  LANG:"en"            /* future: "ko", "es" — add locales/<lang>.js */
};

/* LMS — the SAME shared Supabase project as Music Fundamentals (multi-course).
   Only the URL + publishable (anon) key belong here; both are public and
   protected by row-level security. Leave blank to run with the LMS disabled
   (progress then stays on-device only). Piano Lab is registered as the
   'piano-lab' course; teachers approved once (in the owner dashboard) can use
   every course. */
const LMS_CONFIG={
  SUPABASE_URL:"https://aeojiauqujttnqhmvurh.supabase.co",
  SUPABASE_ANON_KEY:"sb_publishable_hWzCbNlPsqD2UHr9RGID6Q_Nj_lCAqT"
};
if(typeof module!=="undefined") module.exports=PL_CONFIG;
