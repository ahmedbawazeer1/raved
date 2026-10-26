-- RLS and workflow tests for phase 1 tables. Run with scripts/test-db.sh.
\set ON_ERROR_STOP 1
\set QUIET 1
begin;

-- ---------- setup (superuser) ----------
select tests.create_user('student1@example.com', 'يوسف محمد') as s1 \gset
select tests.create_user('student2@example.com', 'سارة علي') as s2 \gset
select tests.create_user('admin@example.com', 'المدير') as ad \gset
update public.profiles set role = 'admin', status = 'active' where id = :'ad';
select id as english from public.paths where slug = 'english' \gset
select id as web from public.paths where slug = 'web' \gset
insert into public.paths (slug, title, status) values ('hidden', 'مسار مخفي', 'draft');

select tests.ok((select count(*) from public.profiles) = 3, 'profile created for every auth user');
select tests.ok((select full_name from public.profiles where id = :'s1') = 'يوسف محمد', 'full name copied from signup metadata');
select tests.ok((select data_saver from public.profiles where id = :'s1'), 'data saver on by default');
select tests.ok((select count(*) from public.governorates) = 22, '22 governorates seeded');

-- ---------- anonymous visitor ----------
set local role anon;
select set_config('request.jwt.claims', '', true);
select tests.ok(tests.count('select * from public.paths') = 4, 'anon sees 4 non-draft paths');
select tests.ok(tests.count('select * from public.paths where slug = ''hidden''') = 0, 'anon cannot see draft path');
select tests.ok(tests.count('select * from public.levels') = 10, 'anon sees levels of visible paths');
select tests.ok(tests.count('select * from public.exams') = 3, 'anon sees exams');
select tests.ok(tests.count('select * from public.profiles') = 0, 'anon sees no profiles');
select tests.ok(tests.count('select * from public.applications') = 0, 'anon sees no applications');
select tests.ok(tests.count('select * from public.settings') = 0, 'anon cannot read settings');
insert into public.path_waitlist (path_id, email) values (:'web', 'visitor@example.com');
select tests.ok(tests.count('select * from public.path_waitlist') = 0, 'anon cannot read the waitlist it wrote to');
select tests.throws(format('insert into public.path_waitlist (path_id, student_id) values (%L, %L)', :'web', :'s1'), 'anon cannot join waitlist as a student');
select tests.ok(tests.count(format('update public.paths set title = ''x'' where id = %L returning id', :'english')) = 0, 'anon cannot edit paths');
select tests.throws('select public.submit_application(true, true)', 'anon cannot submit');
reset role;

-- ---------- student 1 ----------
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', :'s1', 'role', 'authenticated')::text, true);
select tests.ok(tests.count('select * from public.profiles') = 1, 'student sees only own profile');
update public.profiles set birth_date = '2009-03-14', governorate = 'taiz', city = 'المظفر', school = 'مدرسة الشعب',
  grade = 1, stream = 'undecided', phone = '+967771234567' where id = :'s1';
select tests.ok((select city from public.profiles where id = :'s1') = 'المظفر', 'student updates own profile');
select tests.throws(format('update public.profiles set role = ''admin'' where id = %L', :'s1'), 'student cannot become admin');
select tests.throws(format('update public.profiles set status = ''active'' where id = %L', :'s1'), 'student cannot activate self');
select tests.throws(format('update public.profiles set phone = ''+96612'' where id = %L', :'s1'), 'invalid phone rejected');
update public.profiles set full_name = 'hacked' where id = :'s2';
reset role;
select tests.ok((select full_name from public.profiles where id = :'s2') = 'سارة علي', 'student cannot edit another profile');
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', :'s1', 'role', 'authenticated')::text, true);

insert into public.applications (student_id, status, review_note) values (:'s1', 'approved', 'self-approved');
select tests.ok((select status from public.applications where student_id = :'s1') = 'draft', 'insert forced to draft');
select tests.ok((select review_note from public.applications where student_id = :'s1') is null, 'insert cannot set review note');
select tests.throws(format('insert into public.applications (student_id) values (%L)', :'s2'), 'student cannot create application for another');
update public.applications set path_id = :'english', target_exam = 'ielts', target_date = 'grad_summer', daily_minutes = 25,
  motivation = 'منحة' where student_id = :'s1';
select tests.throws(format('update public.applications set status = ''approved'' where student_id = %L', :'s1'), 'student cannot approve own application');
select tests.throws(format('update public.applications set recommendation_path = %L where student_id = %L', :'s2' || '/x.jpg', :'s1'), 'recommendation must be in own folder');
select tests.throws('select public.submit_application(true, true)', 'cannot submit without recommendation');

insert into storage.objects (bucket_id, name, owner) values ('recommendations', :'s1' || '/rec.jpg', :'s1');
select tests.throws(format('insert into storage.objects (bucket_id, name) values (''recommendations'', %L)', :'s2' || '/evil.jpg'), 'cannot upload into another student folder');
update public.applications set recommendation_path = :'s1' || '/rec.jpg', recommendation_name = 'rec.jpg', recommendation_size = 600000 where student_id = :'s1';
select tests.throws('select public.submit_application(false, true)', 'cannot submit without guardian consent');
select tests.ok(public.submit_application(true, true) = 'submitted', 'student submits application');
select tests.ok((select guardian_consent_at is not null and privacy_consent_at is not null from public.applications where student_id = :'s1'), 'consent timestamps recorded');
update public.applications set motivation = 'changed after submit' where student_id = :'s1';
select tests.ok((select motivation from public.applications where student_id = :'s1') = 'منحة', 'submitted application is locked');
select tests.ok(tests.count(format('delete from public.applications where student_id = %L returning 1', :'s1')) = 0, 'student cannot delete application');
select tests.ok(tests.count('select * from storage.objects') = 1, 'student sees own recommendation file');
select tests.ok(tests.count(format('delete from storage.objects where name = %L returning 1', :'s1' || '/rec.jpg')) = 0, 'student cannot delete a submitted recommendation');
select tests.throws(format('select public.review_application(%L, ''approved'')', (select id from public.applications where student_id = :'s1')), 'student cannot review');
select tests.ok(tests.count('select * from public.settings') = 0, 'student cannot read settings');
select tests.ok(tests.count('select * from public.enrollments') = 0, 'no enrollment before approval');
insert into public.path_waitlist (path_id, student_id) values (:'web', :'s1');
select tests.ok(tests.count('select * from public.path_waitlist') = 1, 'student sees own waitlist row only');
select tests.ok(tests.count('select * from public.paths where slug = ''hidden''') = 0, 'student cannot see draft path');
reset role;

-- ---------- student 2 cannot see student 1 ----------
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', :'s2', 'role', 'authenticated')::text, true);
select tests.ok(tests.count('select * from public.applications') = 0, 'student 2 cannot see student 1 application');
select tests.ok(tests.count('select * from storage.objects') = 0, 'student 2 cannot see student 1 file');
select tests.ok(tests.count('select * from public.profiles where phone is not null') = 0, 'student 2 cannot see student 1 phone');
select tests.ok(tests.count('select * from public.audit_log') = 0, 'student cannot read audit log');
reset role;

-- ---------- admin ----------
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', :'ad', 'role', 'authenticated')::text, true);
select tests.ok(tests.count('select * from public.profiles') = 3, 'admin sees all profiles');
select tests.ok(tests.count('select * from public.paths') = 5, 'admin sees draft paths too');
select tests.ok(tests.count('select * from storage.objects') = 1, 'admin can read recommendation files');
select tests.ok(tests.count('select * from public.settings') = 7, 'admin reads settings');
select id as app1 from public.applications where student_id = :'s1' \gset
select tests.throws(format('select public.review_application(%L, ''rejected'', '''')', :'app1'), 'reject needs a note');
select tests.ok((public.review_application(:'app1', 'needs_changes', 'الصورة غير واضحة') ->> 'email') = 'student1@example.com', 'admin requests changes');
reset role;
select tests.ok((select status from public.profiles where id = :'s1') = 'pending', 'still pending after needs_changes');

set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', :'s1', 'role', 'authenticated')::text, true);
select tests.ok(tests.count('select * from public.notifications') = 1, 'student got a notification');
update public.notifications set read_at = now();
select tests.throws('update public.notifications set title = ''x''', 'student cannot rewrite notification text');
update public.applications set motivation = 'منحة دراسية' where student_id = :'s1';
select tests.ok((select motivation from public.applications where student_id = :'s1') = 'منحة دراسية', 'student can edit after needs_changes');
select tests.ok(public.submit_application(true, true) = 'submitted', 'student resubmits');
reset role;

set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', :'ad', 'role', 'authenticated')::text, true);
select tests.ok((public.review_application(:'app1', 'approved') ->> 'decision') = 'approved', 'admin approves');
select tests.ok(tests.count('select * from public.audit_log') = 2, 'decisions are logged');
update public.paths set status = 'published', published_at = now() where id = :'web';
select tests.ok(cardinality(public.notify_path_waitlist(:'web')) = 2, 'waitlist emails returned (visitor + student)');
select tests.ok(cardinality(public.notify_path_waitlist(:'web')) = 0, 'waitlist notified only once');
reset role;

select tests.ok((select status from public.profiles where id = :'s1') = 'active', 'approved student is active');
select tests.ok((select count(*) from public.enrollments where student_id = :'s1' and is_primary) = 1, 'primary enrollment created');
select tests.ok((select l.code from public.enrollments e join public.levels l on l.id = e.current_level_id where e.student_id = :'s1') = 'A1', 'enrollment starts at A1');
select tests.ok((select primary_path_id from public.profiles where id = :'s1') = :'english', 'primary path set');

-- ---------- auto admission ----------
update public.settings set value = '"auto"' where key = 'admission_mode';
update public.profiles set birth_date = '2008-01-01', governorate = 'aden', city = 'كريتر', school = 'مدرسة', grade = 2,
  stream = 'science', phone = '+967731234567' where id = :'s2';
insert into public.applications (student_id, path_id, target_exam, target_date, daily_minutes, recommendation_path)
  values (:'s2', :'english', 'toefl', 'after_grad', 35, :'s2' || '/r.pdf');
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', :'s2', 'role', 'authenticated')::text, true);
select tests.ok(public.submit_application(true, true) = 'approved', 'auto admission approves immediately');
select tests.ok(tests.count('select * from public.enrollments') = 1, 'auto-approved student is enrolled');
select tests.ok((select status from public.profiles where id = :'s2') = 'active', 'auto-approved student active');
reset role;

-- ---------- lessons visible only to active members ----------
insert into public.units (level_id, code, position, title, status)
  select id, 'A1-01', 1, 'Hello!', 'published' from public.levels where code = 'A1' and path_id = :'english';
insert into public.lessons (unit_id, position, skill, title) select id, 1, 'vocab', 'Words' from public.units where code = 'A1-01';
select tests.create_user('pending@example.com') as s3 \gset
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', :'s3', 'role', 'authenticated')::text, true);
select tests.ok(tests.count('select * from public.lessons') = 0, 'pending student cannot read lessons');
select tests.ok(tests.count('select * from public.units') = 1, 'published units are visible (path page)');
select set_config('request.jwt.claims', json_build_object('sub', :'s1', 'role', 'authenticated')::text, true);
select tests.ok(tests.count('select * from public.lessons') = 1, 'active student reads lessons');
reset role;
set local role anon;
select set_config('request.jwt.claims', '', true);
select tests.ok(tests.count('select * from public.lessons') = 0, 'anon cannot read lessons');
reset role;

rollback;
\echo 'ALL RLS TESTS PASSED'
