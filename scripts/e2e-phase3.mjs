const base = process.env.E2E_BASE_URL || 'http://127.0.0.1:3000';
const unique = Date.now().toString(36);
const student = { firstName: 'E2E', lastName: `Learner${unique}`, email: `e2e-${unique}@linguora.test`, phone: '+20 100 000 0000', password: 'phase3-test-pass' };
const teacher = { fullName: `E2E Teacher ${unique}`, email: `teacher-${unique}@linguora.test`, phone: '+20 100 000 0001', username: `teacher${unique}`, password: 'phase3-teacher-pass', confirmPassword: 'phase3-teacher-pass', subject: 'spanish' };
let teacherCookie = '';
let studentCookie = '';
let adminCookie = '';

async function request(path, { method = 'GET', body, cookie = '' } = {}) {
  const response = await fetch(`${base}${path}`, { method, headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...(cookie ? { Cookie: cookie } : {}) }, body: body ? JSON.stringify(body) : undefined });
  const setCookie = response.headers.get('set-cookie');
  const json = response.headers.get('content-type')?.includes('application/json') ? await response.json() : null;
  const result = { response, json };
  if (setCookie) result.cookie = setCookie.split(';')[0];
  return result;
}
function expect(condition, message) { if (!condition) throw new Error(message); }

const health = await request('/api/health');
expect(health.json?.database === 'connected', 'Database is not connected');
console.log('1. Database health: PASS');

const studentSignup = await request('/api/student/signup', { method: 'POST', body: student });
expect(studentSignup.response.status === 201 && studentSignup.cookie, `Student signup failed: ${JSON.stringify(studentSignup.json)}`);
studentCookie = studentSignup.cookie;
console.log('2. Student signup persisted: PASS');

const adminLogin = await request('/api/admin/login', { method: 'POST', body: { username: process.env.ADMIN_USERNAME, password: process.env.ADMIN_PASSWORD } });
expect(adminLogin.response.status === 200 && adminLogin.cookie, `Admin login failed: ${JSON.stringify(adminLogin.json)}`);
adminCookie = adminLogin.cookie;
const createdTeacher = await request('/api/admin/teachers', { method: 'POST', cookie: adminCookie, body: teacher });
expect(createdTeacher.response.status === 201 && createdTeacher.json?.teacher?.username === teacher.username, `Admin teacher creation failed: ${JSON.stringify(createdTeacher.json)}`);
const setupBlocked = await request('/api/teacher/setup', { method: 'POST', body: { ...teacher, bootstrapSecret: process.env.LINGUORA_BOOTSTRAP_SECRET } });
expect(setupBlocked.response.status === 410, `Public teacher setup was not blocked: ${JSON.stringify(setupBlocked.json)}`);
console.log('3. Admin-only teacher creation and blocked public setup: PASS');
const wrongSubjectLogin = await request('/api/teacher/login', { method: 'POST', body: { username: teacher.username, password: teacher.password, subject: 'english' } });
expect(wrongSubjectLogin.response.status === 403, 'Teacher login accepted the wrong subject');
const teacherLogin = await request('/api/teacher/login', { method: 'POST', body: { username: teacher.username, password: teacher.password, subject: teacher.subject } });
expect(teacherLogin.response.status === 200 && teacherLogin.cookie, `Teacher subject login failed: ${JSON.stringify(teacherLogin.json)}`);
teacherCookie = teacherLogin.cookie;
console.log('4. Subject-aware teacher login and direct dashboard session: PASS');

const directory = await request('/api/teacher/students', { cookie: teacherCookie });
expect(!directory.json?.students?.some((item) => item.email === student.email), 'Unredeemed student leaked into teacher directory');
console.log('5. Student directory is isolated until redemption: PASS');

const questions = '1. What does hola mean?\nA) Goodbye\nB) Hello\nC) Please\nAnswer: B';
const lesson = await request('/api/teacher/lessons', { method: 'POST', cookie: teacherCookie, body: { subject: 'spanish', grade: 'الصف الأول الثانوي', unitNumber: 1, title: `E2E Hello ${unique}`, videoUrl: 'https://example.com/e2e-video.mp4', pdfUrl: 'e2e-study-sheet.pdf', coverUrl: 'e2e-cover.png', rawQuestions: questions } });
expect(lesson.response.status === 201 && lesson.json?.lesson?.id && lesson.json.questionCount === 1, `Lesson creation failed: ${JSON.stringify(lesson.json)}`);
console.log('6. Teacher CMS lesson and question bank persisted: PASS');

const codeResult = await request('/api/teacher/access-codes', { method: 'POST', cookie: teacherCookie, body: { targetSubject: 'spanish', targetGrade: 'الصف الأول الثانوي', unlockScope: 'specific', courseIds: [], moduleIds: [lesson.json.module.id], duration: '7' } });
expect(codeResult.response.status === 201 && codeResult.json?.code && codeResult.json.moduleIds.includes(lesson.json.module.id) && new Date(codeResult.json.expiresAt).getTime() > Date.now(), `Targeted access-code creation failed: ${JSON.stringify(codeResult.json)}`);
const codeHistory = await request('/api/teacher/access-codes', { cookie: teacherCookie });
expect(codeHistory.json?.codes?.[0]?.status === 'active' && codeHistory.json.codes[0].targetModuleIds.includes(lesson.json.module.id), 'Access-code history did not persist targeting and active status');
console.log('7. Targeted access code with expiry and history: PASS');

const redeem = await request('/api/student/redeem-code', { method: 'POST', cookie: studentCookie, body: { code: codeResult.json.code } });
expect(redeem.response.ok && redeem.json?.unlocked === true, `Code redemption failed: ${JSON.stringify(redeem.json)}`);
const content = await request('/api/student/content', { cookie: studentCookie });
const unlockedLesson = content.json?.courses?.[0]?.lessons?.find((item) => item.id === lesson.json.lesson.id);
expect(unlockedLesson && unlockedLesson.videoUrl === 'https://example.com/e2e-video.mp4' && unlockedLesson.pdfUrl === 'e2e-study-sheet.pdf', 'Unlocked media metadata is missing from student content');
const refreshedDirectory = await request('/api/teacher/students', { cookie: teacherCookie });
expect(refreshedDirectory.json?.students?.some((item) => item.email === student.email), 'Redeemed student is missing from the teacher directory');
expect(refreshedDirectory.json?.students?.find((item) => item.email === student.email)?.activatedCodes === 1, 'Activated-code count did not update in the teacher directory');
console.log('8. Student entitlement, targeting, and instant media access: PASS');

const completed = await request(`/api/student/lessons/${lesson.json.lesson.id}/complete`, { method: 'POST', cookie: studentCookie });
expect(completed.response.ok && completed.json.completed, `Lesson completion failed: ${JSON.stringify(completed.json)}`);
const quiz = await request(`/api/student/quiz/${lesson.json.lesson.id}/start`, { cookie: studentCookie });
expect(quiz.response.ok && quiz.json.attemptId && quiz.json.questions?.length === 1 && !('answer' in quiz.json.questions[0]), 'Randomized quiz did not return a protected question subset');
const submit = await request(`/api/student/quiz/${quiz.json.attemptId}/submit`, { method: 'POST', cookie: studentCookie, body: { answers: { [quiz.json.questions[0].id]: 'B' } } });
expect(submit.response.ok && submit.json.passed === true && submit.json.score === 1, `Quiz grading failed: ${JSON.stringify(submit.json)}`);
console.log('9. Lesson completion, randomized quiz, and automatic grading: PASS');

const certificate = await request(`/api/student/certificate/${lesson.json.course.id}`, { cookie: studentCookie });
const pdfBytes = await certificate.response.arrayBuffer();
expect(certificate.response.ok && certificate.response.headers.get('content-type')?.includes('application/pdf') && Buffer.from(pdfBytes).subarray(0, 5).toString() === '%PDF-', 'Certificate PDF was not issued');
console.log('10. Downloadable PDF certificate issued: PASS');

const persisted = await request('/api/student/content', { cookie: studentCookie });
expect(persisted.json?.courses?.[0]?.lessons?.[0]?.completed === true, 'Completion did not persist across a second request');
console.log('11. Persistent reload verification: PASS');

const analytics = await request('/api/teacher/overview?period=7', { cookie: teacherCookie });
expect(analytics.response.ok && analytics.json?.engagement?.length === 7 && typeof analytics.json.students === 'number', 'Live analytics did not return database aggregates and date buckets');
const beforeCrud = await request('/api/teacher/courses', { cookie: teacherCookie });
const crudLesson = beforeCrud.json?.courses?.flatMap((course) => course.lessons || []).find((item) => item.id === lesson.json.lesson.id);
expect(crudLesson?.questionBank?.id, 'CRUD fixture is missing its question bank');
const editedLesson = await request(`/api/teacher/lessons/${crudLesson.id}`, { method: 'PUT', cookie: teacherCookie, body: { title: `${crudLesson.title} edited`, videoUrl: 'https://example.com/edited-video.mp4', pdfUrl: null, coverUrl: null } });
expect(editedLesson.response.ok, `Lesson/media edit failed: ${JSON.stringify(editedLesson.json)}`);
const editedBank = await request(`/api/teacher/question-banks/${crudLesson.questionBank.id}`, { method: 'PUT', cookie: teacherCookie, body: { rawText: '1. Edited question?\nA) No\nB) Yes\nAnswer: B' } });
expect(editedBank.response.ok && editedBank.json?.questionBank?.questionCount === 1, `Question-bank edit failed: ${JSON.stringify(editedBank.json)}`);
const afterEdit = await request('/api/teacher/courses', { cookie: teacherCookie });
const persistedEdit = afterEdit.json?.courses?.flatMap((course) => course.lessons || []).find((item) => item.id === crudLesson.id);
expect(persistedEdit?.title === `${crudLesson.title} edited` && persistedEdit.videoUrl === 'https://example.com/edited-video.mp4' && persistedEdit.pdfUrl === null && persistedEdit.questionBank?.rawText.includes('Edited question'), 'Edited lesson assets did not persist');
const deletedBank = await request(`/api/teacher/question-banks/${crudLesson.questionBank.id}`, { method: 'DELETE', cookie: teacherCookie });
expect(deletedBank.response.ok, `Question-bank delete failed: ${JSON.stringify(deletedBank.json)}`);
const deletedLesson = await request(`/api/teacher/lessons/${crudLesson.id}`, { method: 'DELETE', cookie: teacherCookie });
expect(deletedLesson.response.ok, `Lesson delete failed: ${JSON.stringify(deletedLesson.json)}`);
const afterDelete = await request('/api/teacher/courses', { cookie: teacherCookie });
expect(!afterDelete.json?.courses?.flatMap((course) => course.lessons || []).some((item) => item.id === crudLesson.id), 'Deleted lesson is still returned');
console.log('12. Persistent analytics and lesson/media/question-bank CRUD: PASS');
console.log(`E2E PASS: student=${student.email}; course=${lesson.json.course.id}; lesson=${lesson.json.lesson.id}; code=${codeResult.json.code}`);
