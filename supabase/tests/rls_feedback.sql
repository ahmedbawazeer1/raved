-- RLS tests for feedback notes (reports.kind = 'feedback') and the error log. Run with scripts/test-db.sh.
\set ON_ERROR_STOP 1
\set QUIET 1
begin;

select tests.create_user('fb-admin@example.com', 'المدير') as ad \gset
select tests.create_user('fb-student@example.com', 'طالب') as st \gset
select tests.create_user('fb-other@example.com', 'طالب آخر') as other \gset
update public.profiles set role = 'admin', status = 'active' where id = :'ad';
update public.profiles set status = 'active' where id in (:'st', :'other');

-- ---------- the server logs an error (service role) ----------
insert into public.app_errors (source, message, page) values ('client', 'TypeError: x is undefined', '/student');

-- ---------- a student sends feedback and cannot see the error log ----------
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', :'st', 'role', 'authenticated')::text, true);
insert into public.reports (student_id, kind, note, page) values (:'st', 'feedback', 'الدرس جميل لكن الصوت منخفض', '/student');
select tests.throws(format('insert into public.reports (student_id, kind, note) values (%L, ''feedback'', ''x'')', :'other'), 'a student cannot send feedback as someone else');
select tests.throws('insert into public.reports (student_id, kind, note) values (auth.uid(), ''spam'', ''x'')', 'unknown kinds are refused');
select tests.ok(tests.count('select * from public.app_errors') = 0, 'student cannot read the error log');
select tests.throws('insert into public.app_errors (source, message) values (''client'', ''fake'')', 'student cannot write the error log directly');
reset role;

set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', :'other', 'role', 'authenticated')::text, true);
select tests.ok(tests.count('select * from public.reports') = 0, 'another student cannot read the feedback');
reset role;

-- ---------- the admin reads and resolves ----------
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', :'ad', 'role', 'authenticated')::text, true);
select tests.ok(tests.count('select * from public.reports where kind = ''feedback''') = 1, 'admin reads feedback');
select tests.ok(tests.count('select * from public.app_errors') = 1, 'admin reads the error log');
update public.app_errors set status = 'resolved';
select tests.ok((select status from public.app_errors) = 'resolved', 'admin resolves errors');
reset role;

rollback;
