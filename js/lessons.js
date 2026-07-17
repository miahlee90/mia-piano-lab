/* Piano Lab — lesson metadata (data-driven; the lesson screen renders whatever
   is here — no lesson text, formula, or curriculum rule lives in components).
   Each lesson lists its exercises (masters in exercises.js); the Key selector
   order comes from that exercise's KEYS_ENABLED progression. The Exercise
   selector is hidden when a lesson has only one exercise. */
const PLLessons=(()=>{
  const LESSONS=[
    {
      id:"l1-1", level:1, lesson:1,
      exercises:["ff-major"],
      titleKey:"lesson.l1n1.title",
      goalKey:"lesson.l1n1.goal",
      descKey:"lesson.l1n1.desc",
      formula:["W","W","H","W"],
      formulaNoteKey:"lesson.l1n1.halfstep"
    },
    {
      id:"l1-2", level:1, lesson:2,
      exercises:["ff-minor"],
      titleKey:"lesson.l1n2.title",
      goalKey:"lesson.l1n2.goal",
      descKey:"lesson.l1n2.desc",
      formula:["W","H","W","W"],
      formulaNoteKey:"lesson.l1n2.halfstep"
    }
  ];
  return { list:()=>LESSONS,
           get:id=>LESSONS.find(l=>l.id===id),
           current:()=>LESSONS[0] };
})();
if(typeof module!=="undefined") module.exports=PLLessons;
