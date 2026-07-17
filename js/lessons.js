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
    {unit:2, nameKey:"unit.2"},         /* Chord Progressions */
    {unit:3, nameKey:"unit.3"},         /* Triad Qualities (before scales) */
    {unit:4, nameKey:"unit.4"},         /* Major Scales */
    {unit:5, nameKey:"unit.5"},         /* Minor Scales (three forms) */
    {unit:6, nameKey:"unit.6"},         /* Arpeggios */
    {unit:7, nameKey:"unit.7"},         /* Inversions */
    {unit:8, nameKey:"unit.8"}          /* More Scales */
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
      exercises:["prog-1-5-1","prog-m-1-5-1","prog-broken-1-5","prog-m-broken-1-5"],
      titleKey:"lesson.l2n1.title",
      goalKey:"lesson.l2n1.goal",
      descKey:"lesson.l2n1.desc",
      formula:["I","V7","I"], showDegrees:false,
      formulaNoteKey:"lesson.l2n1.motion"
    },
    {
      id:"l2-2", unit:2, label:"2.2",
      exercises:["prog-1-4-1","prog-m-1-4-1"],
      titleKey:"lesson.l2n2.title",
      goalKey:"lesson.l2n2.goal",
      descKey:"lesson.l2n2.desc",
      formula:["I","IV","I"], showDegrees:false,
      formulaNoteKey:"lesson.l2n2.motion"
    },
    {
      id:"l2-3", unit:2, label:"2.3",
      exercises:["prog-1-4-5-1","prog-m-1-4-5-1"],
      titleKey:"lesson.l2n3.title",
      goalKey:"lesson.l2n3.goal",
      descKey:"lesson.l2n3.desc",
      formula:["I","IV","I","V7","I"], showDegrees:false,
      formulaNoteKey:"lesson.l2n3.motion"
    },
    {
      id:"l2-4", unit:2, label:"2.4",
      exercises:["prog-ext-major","prog-ext-minor"],
      titleKey:"lesson.l2n4.title",
      goalKey:"lesson.l2n4.goal",
      descKey:"lesson.l2n4.desc",
      formula:["I","vi","IV","ii6","I6/4","V7","I"], showDegrees:false,
      formulaNoteKey:"lesson.l2.ext"
    },
    {
      id:"l3-1", unit:3, label:"3.1",
      exercises:["triad-qualities"],
      titleKey:"lesson.l3n1.title",
      goalKey:"lesson.l3n1.goal",
      descKey:"lesson.l3n1.desc",
      formula:["M","Aug","m","dim"], showDegrees:false,
      formulaNoteKey:"lesson.l3n1.motion"
    },
    {
      id:"l3-2", unit:3, label:"3.2",
      exercises:["seventh-qualities"],
      titleKey:"lesson.l3n2.title",
      goalKey:"lesson.l3n2.goal",
      descKey:"lesson.l3n2.desc",
      formula:["M","maj7","7","m7","m7♭5","°7"], showDegrees:false,
      formulaNoteKey:"lesson.l3n2.motion"
    },
    {
      id:"l4-1", unit:4, label:"4.1",
      exercises:["scale-major-1oct"],
      titleKey:"lesson.l4n1.title",
      goalKey:"lesson.l4n1.goal",
      descKey:"lesson.l4n1.desc",
      formula:["W","W","H","W","W","W","H"], showDegrees:false,
      formulaNoteKey:"lesson.l4n1.halfstep"
    },
    {
      id:"l4-2", unit:4, label:"4.2",
      exercises:["scale-major-2oct"],
      titleKey:"lesson.l4n2.title",
      goalKey:"lesson.l4n2.goal",
      descKey:"lesson.l4n2.desc",
      formula:["W","W","H","W","W","W","H"], showDegrees:false,
      formulaNoteKey:"lesson.l4n1.halfstep"
    },
    {
      id:"l5-1", unit:5, label:"5.1",
      exercises:["scale-minor-nat-1oct","scale-minor-1oct","scale-minor-mel-1oct"],
      titleKey:"lesson.l5n1.title",
      goalKey:"lesson.l5n1.goal",
      descKey:"lesson.l5n1.desc",
      formula:["W","H","W","W","H","A2","H"], showDegrees:false,
      formulaNoteKey:"lesson.l5n1.raised"
    },
    {
      id:"l5-2", unit:5, label:"5.2",
      exercises:["scale-minor-nat-2oct","scale-minor-2oct","scale-minor-mel-2oct"],
      titleKey:"lesson.l5n2.title",
      goalKey:"lesson.l5n2.goal",
      descKey:"lesson.l5n2.desc",
      formula:["W","H","W","W","H","A2","H"], showDegrees:false,
      formulaNoteKey:"lesson.l5n1.raised"
    },
    {
      id:"l6-1", unit:6, label:"6.1",
      exercises:["arp-major-1oct","arp-minor-1oct"],
      titleKey:"lesson.l6n1.title",
      goalKey:"lesson.l6n1.goal",
      descKey:"lesson.l6n1.desc",
      formula:["1","3","5","8"], showDegrees:false,
      formulaNoteKey:"lesson.l6.maj"
    },
    {
      id:"l6-2", unit:6, label:"6.2",
      exercises:["arp-major-2oct","arp-minor-2oct"],
      titleKey:"lesson.l6n2.title",
      goalKey:"lesson.l6n2.goal",
      descKey:"lesson.l6n2.desc",
      formula:["1","3","5","8"], showDegrees:false,
      formulaNoteKey:"lesson.l6.maj"
    },
    {
      id:"l7-1", unit:7, label:"7.1",
      exercises:["inv-major","inv-minor"],
      titleKey:"lesson.l7n1.title",
      goalKey:"lesson.l7n1.goal",
      descKey:"lesson.l7n1.desc",
      formula:["R","1st","2nd"], showDegrees:false,
      formulaNoteKey:"lesson.l7.inv"
    },
    {
      id:"l7-2", unit:7, label:"7.2",
      exercises:["prog-inv-6","prog-inv-64"],
      titleKey:"lesson.l7n2.title",
      goalKey:"lesson.l7n2.goal",
      descKey:"lesson.l7n2.desc",
      formula:["I","IV","I","V7","I"], showDegrees:false,
      formulaNoteKey:"lesson.l7.prog6"
    },
    {
      id:"l8-1", unit:8, label:"8.1",
      exercises:["chromatic-1oct"],
      titleKey:"lesson.l8n1.title", goalKey:"lesson.l8n1.goal",
      descKey:"lesson.l8n1.desc",
      formula:["H"], showDegrees:false, formulaNoteKey:"lesson.l8.chromatic"
    },
    {
      id:"l8-2", unit:8, label:"8.2",
      exercises:["wholetone-1oct"],
      titleKey:"lesson.l8n2.title", goalKey:"lesson.l8n2.goal",
      descKey:"lesson.l8n2.desc",
      formula:["W"], showDegrees:false, formulaNoteKey:"lesson.l8.wholetone"
    },
    {
      id:"l8-3", unit:8, label:"8.3",
      exercises:["blues-1oct"],
      titleKey:"lesson.l8n3.title", goalKey:"lesson.l8n3.goal",
      descKey:"lesson.l8n3.desc",
      formula:["m3","W","H","H","m3","W"], showDegrees:false,
      formulaNoteKey:"lesson.l8.blues"
    },
    {
      id:"l8-4", unit:8, label:"8.4",
      exercises:["dim-1oct"],
      titleKey:"lesson.l8n4.title", goalKey:"lesson.l8n4.goal",
      descKey:"lesson.l8n4.desc",
      formula:["W","H"], showDegrees:false, formulaNoteKey:"lesson.l8.dim"
    },
    {
      id:"l8-5", unit:8, label:"8.5",
      exercises:["mode-ionian","mode-dorian","mode-phrygian","mode-lydian",
                 "mode-mixolydian","mode-aeolian","mode-locrian"],
      titleKey:"lesson.l8n5.title", goalKey:"lesson.l8n5.goal",
      descKey:"lesson.l8n5.desc",
      formula:["W","W","H","W","W","W","H"], showDegrees:false,
      formulaNoteKey:"lesson.l8.ionian"
    }
  ];
  return { list:()=>LESSONS,
           units:()=>UNITS,
           get:id=>LESSONS.find(l=>l.id===id),
           current:()=>LESSONS[0] };
})();
if(typeof module!=="undefined") module.exports=PLLessons;
