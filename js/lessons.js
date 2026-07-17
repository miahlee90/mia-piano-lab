/* Piano Lab — curriculum metadata, Music-Fundamentals style: UNITS group the
   lessons and every lesson carries a Unit.Lesson label ("1.1"). Data-driven:
   the lesson screen and the All Lessons index render whatever is here — no
   lesson text, formula, numbering or curriculum rule lives in components.
   Each lesson lists its exercises (masters in exercises.js); the Key selector
   order comes from that exercise's KEYS_ENABLED progression. The Exercise
   selector is hidden when a lesson has only one exercise. */
const PLLessons=(()=>{
  const UNITS=[
    {unit:1, nameKey:"unit.1"},         /* Five-Finger Patterns */
    {unit:2, nameKey:"unit.2"}          /* Chord Progressions */
  ];
  const LESSONS=[
    {
      id:"l1-1", unit:1, label:"1.1",
      exercises:["ff-major","ff-major-broken"],
      titleKey:"lesson.l1n1.title",
      goalKey:"lesson.l1n1.goal",
      descKey:"lesson.l1n1.desc",
      formula:["W","W","H","W"],
      formulaNoteKey:"lesson.l1n1.halfstep"
    },
    {
      id:"l1-2", unit:1, label:"1.2",
      exercises:["ff-minor","ff-minor-broken"],
      titleKey:"lesson.l1n2.title",
      goalKey:"lesson.l1n2.goal",
      descKey:"lesson.l1n2.desc",
      formula:["W","H","W","W"],
      formulaNoteKey:"lesson.l1n2.halfstep"
    },
    {
      id:"l2-1", unit:2, label:"2.1",
      exercises:["prog-1-5-1","prog-broken-1-5"],
      titleKey:"lesson.l2n1.title",
      goalKey:"lesson.l2n1.goal",
      descKey:"lesson.l2n1.desc",
      formula:["I","V7","I"], showDegrees:false,
      formulaNoteKey:"lesson.l2n1.motion"
    },
    {
      id:"l2-2", unit:2, label:"2.2",
      exercises:["prog-1-4-1"],
      titleKey:"lesson.l2n2.title",
      goalKey:"lesson.l2n2.goal",
      descKey:"lesson.l2n2.desc",
      formula:["I","IV","I"], showDegrees:false,
      formulaNoteKey:"lesson.l2n2.motion"
    },
    {
      id:"l2-3", unit:2, label:"2.3",
      exercises:["prog-1-4-5-1"],
      titleKey:"lesson.l2n3.title",
      goalKey:"lesson.l2n3.goal",
      descKey:"lesson.l2n3.desc",
      formula:["I","IV","I","V7","I"], showDegrees:false,
      formulaNoteKey:"lesson.l2n3.motion"
    }
  ];
  return { list:()=>LESSONS,
           units:()=>UNITS,
           get:id=>LESSONS.find(l=>l.id===id),
           current:()=>LESSONS[0] };
})();
if(typeof module!=="undefined") module.exports=PLLessons;
