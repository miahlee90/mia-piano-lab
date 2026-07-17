-- ============================================================
-- Piano Lab LMS — 02: additive function (paste AFTER the shared schema/
-- functions from Music Fundamentals are already installed).
-- Music Fundamentals' own functions are NOT modified.
--
-- Why this exists: the shared class_matrix() hardcodes the
-- 'practical-music-theory' course. class_matrix_course() is the same query
-- with the course passed in, so the Piano Lab teacher dashboard can show the
-- 'piano-lab' unit grid. All other RPCs (student_login, record_lbd,
-- student_report, create_class, add_student, …) are already course-generic
-- and are reused as-is.
-- ============================================================
create or replace function class_matrix_course(p_class uuid, p_course text)
returns jsonb language plpgsql stable security definer set search_path=public,extensions as $$
declare res jsonb;
begin
  if not exists(select 1 from classes where id=p_class and (teacher_id=auth.uid() or is_owner())) then
    raise exception 'not_your_class'; end if;
  select jsonb_build_object('ok',true,
    'class',(select jsonb_build_object('id',c.id,'name',c.name,'code',c.class_code) from classes c where c.id=p_class),
    'students',(select coalesce(jsonb_agg(t.r order by t.r->>'name'),'[]'::jsonb) from (
      select jsonb_build_object('id',s.id,'name',s.display_name,'archived',s.archived,
        'lastActive',(select max(lp.last_active_at) from learning_progress lp
                        where lp.student_id=s.id and lp.course_id=p_course),
        'completedPages',(select count(*) from learning_progress lp
                        where lp.student_id=s.id and lp.course_id=p_course and lp.status='completed'),
        'practiceTotal',(select coalesce(sum(lp.lbd_attempts),0) from learning_progress lp
                        where lp.student_id=s.id and lp.course_id=p_course),
        'courseCompletedAt',(select min(cc.completed_at) from course_completions cc
                        where cc.student_id=s.id and cc.course_id=p_course),
        'units',(select coalesce(jsonb_object_agg(u.unit,u.obj),'{}'::jsonb) from (
            select ci.unit,
              jsonb_build_object(
                'done',count(*) filter (where lp.status='completed'),
                'total',count(*),
                'unitCompletedAt',min(uc.completed_at)) as obj
            from curriculum_items ci
            left join learning_progress lp on lp.student_id=s.id and lp.course_id=ci.course_id and lp.item_id=ci.item_id
            left join unit_completions uc on uc.student_id=s.id and uc.course_id=ci.course_id and uc.unit=ci.unit
            where ci.course_id=p_course and ci.status='active'
            group by ci.unit) u)) as r
      from students s
      join class_enrollments e on e.student_id=s.id and e.class_id=p_class and e.archived=false
    ) t)) into res;
  return res;
end $$;

grant execute on function class_matrix_course(uuid,text) to authenticated;
