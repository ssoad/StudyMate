// Security + regression tests for the StudyMate API (server.js + PostgREST + RLS).
//
// Run ONLY against a disposable copy of the database: it creates users, enrollments,
// exam submissions, discussions and uploads, and edits a lesson transcript.
//
//   STUDYMATE_URL=http://127.0.0.1:5190 JWT_SECRET=... node scripts/security-test.mjs
//
// JWT_SECRET must match the target server; it is used to mint an admin token.
import crypto from 'crypto';

const BASE = process.env.STUDYMATE_URL || 'http://127.0.0.1:5190';
const SECRET = process.env.JWT_SECRET;
if (!SECRET) { console.error('Set JWT_SECRET to the target server secret'); process.exit(2); }
const OLD_PUBLIC_SECRET = 'super-secret-jwt-token-with-at-least-32-characters-long';

const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
function sign(payload, secret = SECRET, alg = 'HS256') {
  const h = b64({ alg, typ: 'JWT' }), b = b64(payload);
  const sig = alg === 'none' ? '' : crypto.createHmac('sha256', secret).update(`${h}.${b}`).digest('base64url');
  return `${h}.${b}.${sig}`;
}

let pass = 0, fail = 0;
const failures = [];
function check(name, ok, detail = '') {
  if (ok) { pass++; console.log(`  ✓ ${name}`); }
  else { fail++; failures.push(name); console.log(`  ✗ ${name}  ${detail}`); }
}

async function req(method, path, { token, body, headers = {}, raw } = {}) {
  const h = { ...headers };
  if (token) h.Authorization = `Bearer ${token}`;
  if (body !== undefined && !raw) h['Content-Type'] = 'application/json';
  const r = await fetch(BASE + path, { method, headers: h, body: raw ?? (body !== undefined ? JSON.stringify(body) : undefined) });
  const text = await r.text();
  let data; try { data = JSON.parse(text); } catch { data = text; }
  return { status: r.status, data };
}
const rest = (m, p, o) => req(m, '/rest/v1' + p, o);
const rep = { 'Prefer': 'return=representation' };

const stamp = Date.now();
async function signup(email, password = 'Passw0rd!long') {
  const r = await req('POST', '/auth/v1/signup', { body: { email, password, data: { full_name: 'Sec Test' } } });
  return r;
}

console.log('\n== Auth flows');
const emailA = `sectest-a-${stamp}@example.test`, emailB = `sectest-b-${stamp}@example.test`;
let r = await signup(emailA); check('signup A', r.status === 200, JSON.stringify(r.data));
const tokenA0 = r.data.access_token, idA = r.data.user?.id;
r = await signup(emailB); check('signup B', r.status === 200);
const idB = r.data.user?.id;
r = await signup(`weak-${stamp}@example.test`, 'short'); check('signup rejects weak password', r.status === 400);
r = await signup(emailA.toUpperCase()); check('signup rejects duplicate email (case-insensitive)', r.status === 400);
r = await req('POST', '/auth/v1/token?grant_type=password', { body: { email: emailA, password: 'Passw0rd!long' } });
check('password login works (server reads hash via service token)', r.status === 200 && !!r.data.access_token, JSON.stringify(r.data).slice(0, 200));
const tokenA = r.data.access_token || tokenA0;
r = await req('POST', '/auth/v1/token?grant_type=password', { body: { email: emailA, password: 'wrong-password' } });
check('wrong password rejected', r.status === 400);
r = await req('GET', '/auth/v1/user', { token: tokenA });
check('/auth/v1/user returns student role', r.status === 200 && r.data.app_metadata?.role === 'student');

const adminRow = (await rest('GET', '/profiles?select=id,email&email=eq.admin@studymate.org', { token: tokenA })).data?.[0];
const adminId = adminRow?.id || '10101010-1010-1010-1010-101010101010';
const tokenAdmin = sign({ sub: adminId, email: 'admin@studymate.org', role: 'authenticated', aud: 'authenticated', app_role: 'admin', exp: Math.floor(Date.now() / 1000) + 3600 });
r = await req('POST', '/auth/v1/token?grant_type=refresh_token', { body: { refresh_token: tokenAdmin } });
const refreshedClaims = r.data.access_token ? JSON.parse(Buffer.from(r.data.access_token.split('.')[1], 'base64url')) : {};
check('refresh keeps admin role', refreshedClaims.app_role === 'admin');
r = await req('POST', '/auth/v1/token?grant_type=refresh_token', { body: { refresh_token: sign({ role: 'service_role' }) } });
check('refresh refuses non-user tokens', r.status === 400);

console.log('\n== Secrets & private columns');
r = await rest('GET', '/profiles?select=email,password_hash');
check('anon cannot read password_hash', r.status >= 400, `${r.status} ${JSON.stringify(r.data).slice(0, 120)}`);
r = await rest('GET', '/profiles?select=password_hash', { token: tokenA });
check('student cannot read password_hash', r.status >= 400);
r = await rest('GET', '/profiles?select=password_hash', { token: tokenAdmin });
check('admin cannot read password_hash via API', r.status >= 400);
r = await rest('GET', '/profiles?select=last_accessed_ip', { token: tokenA });
check('student cannot read last_accessed_ip', r.status >= 400);
r = await rest('GET', '/profiles?select=email');
check('anon cannot read emails', r.status >= 400);
r = await rest('GET', '/system_settings?select=*');
check('anon cannot read system_settings', r.status >= 400 || (Array.isArray(r.data) && r.data.length === 0), JSON.stringify(r.data).slice(0, 100));
r = await rest('GET', '/system_settings?select=*', { token: tokenA });
check('student cannot read system_settings (LLM key)', Array.isArray(r.data) && r.data.length === 0, JSON.stringify(r.data).slice(0, 100));
r = await rest('GET', '/system_settings?select=key', { token: tokenAdmin });
check('admin can read system_settings', r.status === 200 && Array.isArray(r.data));

console.log('\n== Forged / foreign tokens');
const forgedOld = sign({ sub: adminId, email: 'admin@studymate.org', role: 'authenticated', app_role: 'admin', exp: 9999999999 }, OLD_PUBLIC_SECRET);
r = await rest('GET', '/system_settings?select=*', { token: forgedOld });
check('token signed with old public secret is not admin', !(Array.isArray(r.data) && r.data.length > 0));
r = await req('GET', '/auth/v1/user', { token: forgedOld });
check('old-secret token rejected by /auth/v1/user', r.status === 401);
const algNone = sign({ sub: adminId, role: 'authenticated', app_role: 'admin', exp: 9999999999 }, '', 'none');
r = await req('GET', '/auth/v1/user', { token: algNone });
check('alg=none token rejected', r.status === 401);
r = await rest('GET', '/profiles?select=password_hash', { token: sign({ role: 'service_role' }) });
check('client-sent service_role token is downgraded to anon', r.status >= 400);
r = await rest('GET', '/profiles?select=id&limit=1', { headers: { apikey: 'whatever.local' } });
check('anon catalog read still works with junk apikey', r.status === 200);

console.log('\n== Profiles');
const getProfile = async (id) => (await rest('GET', `/profiles?select=full_name,points&id=eq.${id}`, { token: tokenAdmin })).data?.[0];
const min = { Prefer: 'return=minimal' };
r = await rest('PATCH', `/profiles?id=eq.${idB}`, { token: tokenA, body: { full_name: 'hacked' }, headers: min });
check('student cannot edit another profile', (await getProfile(idB)).full_name !== 'hacked', `${r.status}`);
r = await rest('PATCH', `/profiles?id=eq.${idB}`, { body: { full_name: 'hacked' }, headers: min });
check('anon cannot edit profiles', r.status >= 400);
r = await rest('PATCH', `/profiles?id=eq.${idA}`, { token: tokenA, body: { full_name: 'Sec Tester', bio: 'hi' }, headers: min });
check('student can edit own name/bio (web Profile page)', r.status === 204 && (await getProfile(idA)).full_name === 'Sec Tester', `${r.status} ${JSON.stringify(r.data)}`);
r = await rest('PATCH', `/profiles?id=eq.${idA}`, { token: tokenA, body: { points: 15 } });
check('student can add +15 points (Android/web lesson completion)', r.status === 204 && (await getProfile(idA)).points === 15, `${r.status} ${JSON.stringify(r.data)}`);
r = await rest('PATCH', `/profiles?id=eq.${idA}`, { token: tokenA, body: { points: 100000 } });
check('student cannot set huge points', r.status >= 400);
r = await rest('PATCH', `/profiles?id=eq.${idA}`, { token: tokenA, body: { points: 0 } });
check('student cannot lower points', r.status >= 400);
r = await rest('PATCH', `/profiles?id=eq.${idA}`, { token: tokenA, body: { email: 'admin2@studymate.org' } });
check('student cannot change own email', r.status >= 400);
r = await rest('PATCH', `/profiles?id=eq.${idA}`, { token: tokenA, body: { password_hash: 'x$y' } });
check('student cannot set password_hash', r.status >= 400);
r = await rest('PATCH', `/profiles?id=eq.${idB}`, { token: tokenAdmin, body: { points: 50 } });
check('admin can award points to others', r.status === 204 && (await getProfile(idB)).points === 50, `${r.status} ${JSON.stringify(r.data)}`);
r = await rest('GET', `/profiles?select=id,email,full_name,avatar_url,points,bio,last_accessed_at,created_at&id=eq.${idA}`, { token: tokenA });
check('own profile read with PROFILE_COLUMNS', r.status === 200 && r.data?.length === 1);
r = await rest('GET', '/profiles?select=id,email,points,full_name,avatar_url&order=points.desc&limit=10', { token: tokenA });
check('leaderboard query works', r.status === 200 && r.data.length > 0);
r = await rest('HEAD', '/profiles?select=id', { headers: { Prefer: 'count=exact' } });
check('dashboard user count (select=id) works', r.status === 200 || r.status === 206);
r = await rest('POST', '/rpc/admin_list_users', { token: tokenA, body: {} });
check('student cannot call admin_list_users', r.status >= 400);
r = await rest('POST', '/rpc/admin_list_users', { token: tokenAdmin, body: {} });
check('admin_list_users returns users with IP', r.status === 200 && r.data.length >= 2 && 'last_accessed_ip' in r.data[0]);
r = await rest('POST', '/rpc/update_last_access', { token: tokenA, body: {} });
check('update_last_access still succeeds for clients', r.status === 200);

console.log('\n== Course catalog');
const COURSE_Q = '/courses?select=*,sections:course_sections(*,resources:course_resources(*),lessons:course_lessons(*,resources:course_resources(*))),resources:course_resources(*)';
r = await rest('GET', COURSE_Q);
check('anon nested course query (Android) works', r.status === 200 && r.data.length > 0, `${r.status}`);
const course = r.data?.[0];
const lesson = course?.sections?.flatMap((s) => s.lessons)?.[0];
r = await rest('GET', '/course_resources?select=*');
check('anon course_resources read works', r.status === 200);
r = await rest('PATCH', `/courses?id=eq.${course.id}`, { token: tokenA, body: { title: 'pwned' }, headers: rep });
check('student cannot edit courses', r.status >= 400 || (Array.isArray(r.data) && r.data.length === 0));
r = await rest('PATCH', `/course_lessons?id=eq.${lesson.id}`, { token: tokenA, body: { title: 'pwned' }, headers: rep });
check('student cannot edit lessons', r.status >= 400 || (Array.isArray(r.data) && r.data.length === 0));
r = await rest('POST', '/courses', { token: tokenA, body: { title: 'evil' } });
check('student cannot create courses', r.status >= 400);
r = await rest('DELETE', `/course_sections?course_id=eq.${course.id}`, { token: tokenA, headers: rep });
check('student cannot delete sections', r.status >= 400 || (Array.isArray(r.data) && r.data.length === 0));
r = await rest('PATCH', `/courses?id=eq.${course.id}`, { token: tokenAdmin, body: { title: course.title }, headers: rep });
check('admin can edit courses', r.status === 200 && r.data.length === 1);

console.log('\n== Progress, notes');
r = await rest('POST', '/course_user_progress?on_conflict=user_id,course_id', { token: tokenA, body: { user_id: idA, course_id: course.id, completed_lessons: [lesson.id], last_lesson_id: lesson.id }, headers: { Prefer: 'resolution=merge-duplicates,return=representation' } });
check('student upserts own progress', r.status === 201 || r.status === 200, `${r.status} ${JSON.stringify(r.data).slice(0, 150)}`);
r = await rest('POST', '/course_user_progress', { token: tokenA, body: { user_id: idB, course_id: course.id } });
check('student cannot write progress for others', r.status >= 400);
r = await rest('GET', `/course_user_progress?user_id=eq.${idA}&course_id=eq.${course.id}`, { token: tokenA });
check('student reads own progress', r.status === 200 && r.data.length === 1);
r = await rest('GET', `/course_user_progress?user_id=eq.${idA}`, { token: sign({ sub: idB, role: 'authenticated', exp: 9999999999 }) });
check('other student cannot read progress', r.status === 200 && r.data.length === 0);
r = await rest('POST', '/course_lesson_notes?on_conflict=user_id,lesson_id', { token: tokenA, body: { user_id: idA, lesson_id: lesson.id, note_text: 'note' }, headers: { Prefer: 'resolution=merge-duplicates' } });
check('student upserts own note', r.status < 300, `${r.status} ${JSON.stringify(r.data)}`);

console.log('\n== Enrollments');
r = await rest('POST', '/course_enrollments', { token: tokenA, body: { user_id: idA, course_id: course.id, status: 'approved', transaction_id: 'TRX1', amount: 0 }, headers: rep });
check('student enrollment is forced to pending', r.status === 201 && r.data?.[0]?.status === 'pending', `${r.status} ${JSON.stringify(r.data)}`);
const enrId = r.data?.[0]?.id;
r = await rest('PATCH', `/course_enrollments?id=eq.${enrId}`, { token: tokenA, body: { status: 'approved', transaction_id: 'TRX2' }, headers: rep });
check('student cannot self-approve via update', r.data?.[0]?.status === 'pending' && r.data?.[0]?.transaction_id === 'TRX2', JSON.stringify(r.data));
r = await rest('POST', '/course_enrollments', { token: tokenA, body: { user_id: idB, course_id: course.id } });
check('student cannot enroll someone else', r.status >= 400);
r = await rest('GET', '/course_enrollments?select=*', { token: sign({ sub: idB, role: 'authenticated', exp: 9999999999 }) });
check('student B cannot see A\'s enrollment', r.status === 200 && !r.data.some((e) => e.id === enrId));
r = await rest('GET', '/course_enrollments?select=*,user:profiles!course_enrollments_user_id_fkey(id,email,full_name,avatar_url),course:courses(id,title,thumbnail_url,price,currency)&status=eq.pending', { token: tokenAdmin });
check('admin pending-enrollment join query works', r.status === 200 && r.data.some((e) => e.id === enrId), `${r.status} ${JSON.stringify(r.data).slice(0, 150)}`);
r = await rest('PATCH', `/course_enrollments?id=eq.${enrId}`, { token: tokenAdmin, body: { status: 'approved', approved_at: new Date().toISOString() }, headers: rep });
check('admin can approve', r.data?.[0]?.status === 'approved');
r = await rest('PATCH', `/course_enrollments?id=eq.${enrId}`, { token: tokenA, body: { student_notes: 'x' } });
check('student cannot modify approved enrollment', r.status >= 400);

console.log('\n== Exams');
let exam = (await rest('GET', '/exams?select=id&limit=1', { token: tokenA })).data?.[0];
r = await rest('GET', '/exams?select=id');
check('anon cannot list exams', r.status >= 400 || (Array.isArray(r.data) && r.data.length === 0));
if (!exam) {
  r = await rest('POST', '/exams', { token: tokenAdmin, body: { title: 'sectest exam' }, headers: rep });
  check('admin can create exam', r.status === 201); exam = r.data[0];
}
r = await rest('POST', '/exams', { token: tokenA, body: { title: 'evil' } });
check('student cannot create exams', r.status >= 400);
r = await rest('POST', '/exam_submissions', { token: tokenA, body: { exam_id: exam.id, user_id: idA, status: 'started' }, headers: rep });
check('student can start exam', r.status === 201, `${r.status} ${JSON.stringify(r.data)}`);
const subId = r.data?.[0]?.id;
r = await rest('PATCH', `/exam_submissions?id=eq.${subId}`, { token: tokenA, body: { status: 'submitted', score: 3 }, headers: rep });
check('student can submit exam', r.status === 200 && r.data?.[0]?.status === 'submitted');
r = await rest('PATCH', `/exam_submissions?id=eq.${subId}`, { token: tokenA, body: { status: 'graded', score: 999 } });
check('student cannot mark own exam graded', r.status >= 400);
r = await rest('PATCH', `/exam_submissions?id=eq.${subId}`, { token: tokenAdmin, body: { status: 'graded', score: 5 }, headers: rep });
check('admin can grade', r.data?.[0]?.status === 'graded');
r = await rest('PATCH', `/exam_submissions?id=eq.${subId}`, { token: tokenA, body: { status: 'submitted', score: 999 }, headers: rep });
check('student cannot re-open graded exam', r.status >= 400 || (Array.isArray(r.data) && r.data.length === 0));

console.log('\n== Discussions & study resources');
r = await rest('POST', '/discussions', { token: tokenA, body: { author_id: idA, title: 't', content: 'c' } });
check('student can post discussion', r.status === 201, `${r.status} ${JSON.stringify(r.data)}`);
r = await rest('POST', '/discussions', { token: tokenA, body: { author_id: idB, title: 't', content: 'c' } });
check('student cannot post as someone else', r.status >= 400);
r = await rest('POST', '/study_resources', { token: tokenA, body: { title: 'r', url: '/x', uploader_id: idA, status: 'approved' }, headers: rep });
check('student resource is forced to pending', r.data?.[0]?.status === 'pending', `${r.status} ${JSON.stringify(r.data)}`);
r = await rest('GET', '/study_resources?select=*,uploader:profiles(full_name,email)&status=eq.approved', { token: tokenA });
check('resources page query works for students', r.status === 200, `${r.status} ${JSON.stringify(r.data).slice(0, 150)}`);

console.log('\n== Storage & transcripts');
r = await req('POST', '/api/storage/upload', { raw: 'hello', headers: { 'x-filename': 'a.txt' } });
check('anon upload rejected', r.status === 401);
r = await req('POST', '/api/storage/upload', { token: tokenA, raw: 'hello', headers: { 'x-filename': 'a.txt' } });
check('signed-in upload works', r.status === 200 && r.data.url);
r = await req('GET', r.data.url);
check('uploaded file served', r.status === 200 && r.data === 'hello');
r = await req('POST', '/api/storage/upload', { token: tokenA, raw: Buffer.alloc(2 * 1024 * 1024), headers: { 'x-filename': 'big.bin' } }).catch((e) => ({ status: 'conn-closed' }));
check('oversize upload rejected', r.status === 413 || r.status === 'conn-closed', String(r.status));
r = await req('GET', '/api/storage/files/..%2f..%2fetc%2fpasswd');
check('path traversal blocked', r.status === 403 || r.status === 404);
r = await req('POST', '/api/transcripts/save', { body: { lessonId: lesson.id, transcript: 'x' } });
check('anon transcript save rejected', r.status === 403);
r = await req('POST', '/api/transcripts/save', { token: tokenA, body: { lessonId: lesson.id, transcript: 'x' } });
check('student transcript save rejected', r.status === 403);
r = await req('POST', '/api/transcripts/save', { token: tokenAdmin, body: { lessonId: lesson.id, transcript: lesson.transcript || '' } });
check('admin transcript save works', r.status === 200);

console.log(`\n${pass} passed, ${fail} failed`);
if (fail) { console.log('FAILED: ' + failures.join(' | ')); process.exit(1); }
