/* Piano Lab — LMS curriculum map. Derived at load time from PLLessons so it
   can never drift from the site: each lesson is a curriculum "item" (item_id =
   its position in the list, 1-based), and the lesson's exercises are its
   Learn-by-Doing activities. Finishing an exercise (Practice or Test) records
   one activity; the item is "completed" once every exercise has been finished
   at least once. No quiz. The SQL seed (supabase/01-course-seed.sql) is
   generated from this exact mapping — keep them in sync via tools/gen-lms-seed.js. */
const PL_CURRICULUM=(()=>{
  const courseId="piano-lab", courseTitle="Piano Lab";
  const lessons=(typeof PLLessons!=="undefined")?PLLessons.list():[];
  const units=(typeof PLLessons!=="undefined"?PLLessons.units():[])
    .map(u=>({unit:u.unit,title:(typeof PLI18N!=="undefined")?PLI18N.t(u.nameKey):u.nameKey}));
  const pages=lessons.map((l,i)=>({
    item:i+1, id:l.id, label:l.label, unit:l.unit,
    title:(typeof PLI18N!=="undefined")?PLI18N.t(l.titleKey):l.titleKey,
    route:"index.html?lesson="+l.id,
    lbdIds:l.exercises.slice(), lbdCount:l.exercises.length,
    hasQuiz:false, status:"active", version:1
  }));
  const exToItem={}, lessonToItem={};
  pages.forEach(p=>{ lessonToItem[p.id]=p.item; p.lbdIds.forEach(ex=>exToItem[ex]=p.item); });
  return {courseId,courseTitle,units,pages,
    itemForExercise:ex=>exToItem[ex],
    itemForLesson:id=>lessonToItem[id],
    page:item=>pages.find(p=>p.item===item)};
})();
if(typeof module!=="undefined") module.exports=PL_CURRICULUM;
