/* Piano Lab — lesson metadata (data-driven; the lesson screen renders whatever
   is here — no lesson text, formula, or curriculum rule lives in components).
   Each lesson points at an exercise master in exercises.js; the Key selector
   order comes from that exercise's KEYS_ENABLED progression. This file is the
   template every future technique lesson follows. */
const PLLessons=(()=>{
  const LESSONS=[
    {
      id:"l1-1", level:1, lesson:1,
      exercise:"ff-major",
      titleKey:"lesson.l1n1.title",
      goalKey:"lesson.l1n1.goal",
      descKey:"lesson.l1n1.desc",
      formula:["W","W","H","W"],            /* whole/half-step pattern chip */
      formulaNoteKey:"lesson.l1n1.halfstep"
    }
  ];
  return { list:()=>LESSONS,
           get:id=>LESSONS.find(l=>l.id===id),
           current:()=>LESSONS[0] };
})();
if(typeof module!=="undefined") module.exports=PLLessons;
