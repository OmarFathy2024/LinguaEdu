import 'node:process';
import path from 'node:path';
import crypto from 'node:crypto';
import PDFDocument from 'pdfkit';
import reshaper from 'arabic-persian-reshaper';
import bidiFactory from 'bidi-js';
import express from 'express';
import mysql from 'mysql2/promise';
import { createServer as createViteServer } from 'vite';
import { drizzle } from 'drizzle-orm/mysql2';
import { and, desc, eq, inArray, like, or, sql } from 'drizzle-orm';
import * as schema from '../db/schema.js';

const isProduction = process.env.NODE_ENV === 'production';
const port = Number(process.env.PORT || 3000);
const databaseUrl = process.env.DATABASE_URL || process.env.DRIZZLE_DATABASE_URL;
if (!databaseUrl) throw new Error('DATABASE_URL is required to start LinguaEdu');
await import('../db/migrate.js');
const pool = mysql.createPool(databaseUrl);
const db = drizzle(pool, { schema, mode: 'default' });
const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '3mb' }));

const now = () => new Date();
const clean = (value = '') => String(value ?? '').trim();
const normalizeEmail = (email = '') => clean(email).toLowerCase();
const supportedLanguages = new Set(['en', 'es', 'ar']);
const normalizeLanguage = (language = 'en') => supportedLanguages.has(clean(language).toLowerCase()) ? clean(language).toLowerCase() : 'en';
const randomId = () => crypto.randomBytes(32).toString('hex');
const passwordHash = (password) => {
  const salt = crypto.randomBytes(16).toString('hex');
  return `${salt}:${crypto.pbkdf2Sync(password, salt, 120000, 64, 'sha512').toString('hex')}`;
};
const passwordMatches = (password, stored) => {
  const [salt, expected] = String(stored || '').split(':');
  if (!salt || !expected) return false;
  const actual = crypto.pbkdf2Sync(password, salt, 120000, 64, 'sha512').toString('hex');
  return crypto.timingSafeEqual(Buffer.from(actual), Buffer.from(expected));
};
const sanitizeUser = (user) => ({ id: user.id, role: user.role, username: user.username, email: user.email, fullName: user.fullName, phone: user.phone, tenantId: user.tenantId || null, subject: user.tenantSlug || null, language: normalizeLanguage(user.language) });
const tenantBySlug = async (slug) => (await db.select().from(schema.tenants).where(eq(schema.tenants.slug, clean(slug).toLowerCase())).limit(1))[0] || null;
const tenantForUser = async (user) => user.tenantId ? (await db.select().from(schema.tenants).where(eq(schema.tenants.id, user.tenantId)).limit(1))[0] : null;
const adminCookieValue = (req) => cookieValue(req, 'linguaedu_admin_session');
const cookieValue = (req, name) => (req.headers.cookie || '').split(';').map((part) => part.trim()).find((part) => part.startsWith(`${name}=`))?.slice(name.length + 1);
const setSession = async (res, userId) => {
  const token = randomId();
  await db.insert(schema.sessions).values({ id: token, userId, expiresAt: new Date(Date.now() + 2592000000), createdAt: now() });
  res.setHeader('Set-Cookie', `webdev_app_session=${token}; Path=/; HttpOnly; SameSite=None; Secure; Max-Age=2592000`);
};
const clearSession = async (req, res) => {
  const token = cookieValue(req, 'webdev_app_session');
  if (token) await db.delete(schema.sessions).where(eq(schema.sessions.id, token));
  res.setHeader('Set-Cookie', 'webdev_app_session=; Path=/; HttpOnly; SameSite=None; Secure; Max-Age=0');
};
async function currentAdmin(req) {
  const token = adminCookieValue(req);
  if (!token) return false;
  const rows = await db.select().from(schema.adminSessions).where(and(eq(schema.adminSessions.id, token), sql`${schema.adminSessions.expiresAt} > NOW()`)).limit(1);
  return rows.length > 0;
}
const requireAdmin = async (req, res, next) => { try { if (!(await currentAdmin(req))) return res.status(401).json({ error: 'Admin authentication required.', code: 'ADMIN_AUTH_REQUIRED' }); next(); } catch (error) { next(error); } };
async function currentUser(req) {
  const token = cookieValue(req, 'webdev_app_session');
  if (!token) return null;
  const sessions = await db.select().from(schema.sessions).where(and(eq(schema.sessions.id, token), sql`${schema.sessions.expiresAt} > NOW()`)).limit(1);
  if (!sessions.length) return null;
  const user = (await db.select().from(schema.users).where(eq(schema.users.id, sessions[0].userId)).limit(1))[0] || null;
  if (user?.tenantId) user.tenantSlug = (await tenantForUser(user))?.slug || null;
  return user;
}
const requireAuth = (roles = []) => async (req, res, next) => {
  try {
    const user = await currentUser(req);
    if (!user || (roles.length && !roles.includes(user.role))) return res.status(401).json({ error: 'Authentication required', code: 'AUTH_REQUIRED' });
    req.user = user;
    next();
  } catch (error) { next(error); }
};
function validatePassword(password) { return typeof password === 'string' && password.length >= 8; }
function parseQuestions(text = '') {
  return clean(text).split(/\n(?=\s*\d+[.)]\s)/).map((block) => block.trim()).filter(Boolean).map((block, index) => {
    const lines = block.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    const questionLine = lines.find((line) => !/^\s*[A-D][.)]\s/i.test(line) && !/^answer\s*:/i.test(line)) || `Question ${index + 1}`;
    const choices = lines.filter((line) => /^[A-D][.)]\s/i.test(line)).map((line) => ({ key: line.charAt(0).toUpperCase(), text: line.replace(/^[A-D][.)]\s*/i, '') }));
    const answerLine = lines.find((line) => /^answer\s*:/i.test(line));
    return { id: `${index + 1}`, question: questionLine.replace(/^\s*\d+[.)]\s*/, ''), choices, answer: answerLine ? (answerLine.match(/answer\s*:\s*([A-D])/i)?.[1] || '').toUpperCase() : '' };
  });
}
const shuffle = (items) => [...items].sort(() => Math.random() - 0.5);
const publicQuestion = ({ id, question, choices }) => ({ id, question, choices });
const jsonArray = (value) => { if (Array.isArray(value)) return value; if (typeof value !== 'string') return []; try { const parsed = JSON.parse(value); return Array.isArray(parsed) ? parsed : []; } catch { return []; } };
const bidi = bidiFactory();
function shapeArabic(text) {
  const shaped = reshaper.ArabicShaper.convertArabic(String(text || ''));
  const embedding = bidi.getEmbeddingLevels(shaped, 'rtl');
  const chars = shaped.split('');
  for (const [start, end] of bidi.getReorderSegments(shaped, embedding).reverse()) {
    chars.splice(start, end - start + 1, ...chars.slice(start, end + 1).reverse());
  }
  return chars.join('');
}

app.get('/api/health', async (_req, res) => {
  try { await pool.query('SELECT 1'); res.json({ ok: true, database: 'connected' }); }
  catch (error) { res.status(503).json({ ok: false, database: 'unavailable', error: error.message }); }
});
app.get('/api/setup/status', async (_req, res, next) => {
  try { const rows = await db.select({ count: sql`count(*)` }).from(schema.users).where(eq(schema.users.role, 'teacher')); res.json({ teacherExists: Number(rows[0]?.count || 0) > 0 }); }
  catch (error) { next(error); }
});
app.post('/api/teacher/setup', (_req, res) => res.status(410).json({ error: 'Teacher accounts are created exclusively by the Super Admin at /admin.', code: 'ADMIN_CREATION_ONLY' }));
async function loginUser(identifier, password) {
  const rows = await db.select().from(schema.users).where(or(eq(schema.users.email, normalizeEmail(identifier)), eq(schema.users.username, clean(identifier)))).limit(1);
  return rows.length && passwordMatches(password, rows[0].passwordHash) ? rows[0] : null;
}
app.post('/api/admin/login', async (req, res, next) => {
  try {
    const { username, password } = req.body || {};
    if (!process.env.ADMIN_USERNAME || !process.env.ADMIN_PASSWORD || clean(username) !== process.env.ADMIN_USERNAME || password !== process.env.ADMIN_PASSWORD) return res.status(401).json({ error: 'The admin credentials are incorrect.' });
    const token = randomId();
    await db.insert(schema.adminSessions).values({ id: token, expiresAt: new Date(Date.now() + 2592000000), createdAt: now() });
    res.setHeader('Set-Cookie', 'linguaedu_admin_session=' + token + '; Path=/; HttpOnly; SameSite=None; Secure; Max-Age=2592000');
    res.json({ ok: true });
  } catch (error) { next(error); }
});
app.post('/api/admin/logout', async (req, res, next) => { try { const token = adminCookieValue(req); if (token) await db.delete(schema.adminSessions).where(eq(schema.adminSessions.id, token)); res.setHeader('Set-Cookie', 'linguaedu_admin_session=; Path=/; HttpOnly; SameSite=None; Secure; Max-Age=0'); res.json({ ok: true }); } catch (error) { next(error); } });
app.get('/api/admin/me', requireAdmin, (_req, res) => res.json({ authenticated: true }));
app.get('/api/admin/teachers', requireAdmin, async (_req, res, next) => { try { const teachers = await db.select().from(schema.users).where(eq(schema.users.role, 'teacher')).orderBy(desc(schema.users.createdAt)); const data = await Promise.all(teachers.map(async (teacher) => ({ ...sanitizeUser(teacher), createdAt: teacher.createdAt, tenant: await tenantForUser(teacher) }))); res.json({ teachers: data }); } catch (error) { next(error); } });
app.post('/api/admin/teachers', requireAdmin, async (req, res, next) => {
  try {
    const { fullName, email, phone, username, password, confirmPassword, subject = 'spanish' } = req.body || {};
    const normalizedEmail = normalizeEmail(email); const normalizedUsername = clean(username).toLowerCase(); const tenant = await tenantBySlug(subject);
    if (!clean(fullName) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail) || clean(phone).length < 7 || !/^[a-z0-9._-]{3,80}$/.test(normalizedUsername) || !validatePassword(password) || password !== confirmPassword || !tenant) return res.status(400).json({ error: 'Full name, valid email, phone, username, matching 8+ character passwords, and a supported subject are required.' });
    const inserted = await db.insert(schema.users).values({ role: 'teacher', fullName: clean(fullName), email: normalizedEmail, phone: clean(phone), username: normalizedUsername, passwordHash: passwordHash(password), tenantId: tenant.id, createdAt: now() });
    const teacher = (await db.select().from(schema.users).where(eq(schema.users.id, inserted[0].insertId)).limit(1))[0]; teacher.tenantSlug = tenant.slug;
    res.status(201).json({ teacher: sanitizeUser(teacher), tenant });
  } catch (error) { if (error.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'That email or username is already in use.' }); next(error); }
});

async function deleteTeacherData(userId) {
  const courses = await db.select().from(schema.courses).where(eq(schema.courses.createdBy, userId));
  const courseIds = courses.map((course) => course.id);
  const lessons = courseIds.length ? await db.select().from(schema.lessons).where(inArray(schema.lessons.courseId, courseIds)) : [];
  const lessonIds = lessons.map((lesson) => lesson.id);
  const modules = courseIds.length ? await db.select().from(schema.modules).where(inArray(schema.modules.courseId, courseIds)) : [];
  const moduleIds = modules.map((module) => module.id);
  const accessCodes = await db.select().from(schema.accessCodes).where(courseIds.length ? or(eq(schema.accessCodes.createdBy, userId), inArray(schema.accessCodes.courseId, courseIds)) : eq(schema.accessCodes.createdBy, userId));
  const accessCodeIds = accessCodes.map((code) => code.id);
  if (accessCodeIds.length) await db.delete(schema.entitlements).where(inArray(schema.entitlements.accessCodeId, accessCodeIds));
  if (courseIds.length) {
    await db.delete(schema.entitlements).where(inArray(schema.entitlements.courseId, courseIds));
    await db.delete(schema.enrollments).where(inArray(schema.enrollments.courseId, courseIds));
  }
  if (lessonIds.length) {
    await db.delete(schema.questionBanks).where(inArray(schema.questionBanks.lessonId, lessonIds));
    await db.delete(schema.lessonViews).where(inArray(schema.lessonViews.lessonId, lessonIds));
    await db.delete(schema.lessonProgress).where(inArray(schema.lessonProgress.lessonId, lessonIds));
    await db.delete(schema.quizAttempts).where(inArray(schema.quizAttempts.lessonId, lessonIds));
    await db.delete(schema.lessons).where(inArray(schema.lessons.id, lessonIds));
  }
  if (moduleIds.length) await db.delete(schema.modules).where(inArray(schema.modules.id, moduleIds));
  if (courseIds.length) await db.delete(schema.courses).where(inArray(schema.courses.id, courseIds));
  await db.delete(schema.accessCodes).where(eq(schema.accessCodes.createdBy, userId));
  await db.delete(schema.sessions).where(eq(schema.sessions.userId, userId));
  await db.delete(schema.users).where(and(eq(schema.users.id, userId), eq(schema.users.role, 'teacher')));
  return { userId, courses: courseIds.length, lessons: lessonIds.length, accessCodes: accessCodes.length };
}

async function deleteStudentData(userId) {
  const accessCodes = await db.select({ id: schema.accessCodes.id }).from(schema.accessCodes).where(eq(schema.accessCodes.redeemedBy, userId));
  await db.update(schema.accessCodes).set({ redeemedBy: null, redeemedAt: null }).where(eq(schema.accessCodes.redeemedBy, userId));
  await db.delete(schema.entitlements).where(eq(schema.entitlements.userId, userId));
  await db.delete(schema.enrollments).where(eq(schema.enrollments.userId, userId));
  await db.delete(schema.lessonProgress).where(eq(schema.lessonProgress.userId, userId));
  await db.delete(schema.lessonViews).where(eq(schema.lessonViews.userId, userId));
  await db.delete(schema.quizAttempts).where(eq(schema.quizAttempts.userId, userId));
  await db.delete(schema.studentProfiles).where(eq(schema.studentProfiles.userId, userId));
  await db.delete(schema.sessions).where(eq(schema.sessions.userId, userId));
  await db.delete(schema.users).where(and(eq(schema.users.id, userId), eq(schema.users.role, 'student')));
  return { userId, redeemedCodesReset: accessCodes.length };
}

async function cleanupUser(userId, role) {
  const user = (await db.select().from(schema.users).where(and(eq(schema.users.id, Number(userId)), eq(schema.users.role, role))).limit(1))[0];
  if (!user) return null;
  return role === 'teacher' ? deleteTeacherData(user.id) : deleteStudentData(user.id);
}

function cleanupTestUserFilter() {
  return or(
    like(schema.users.email, '%@linguora.test'),
    like(schema.users.username, 'qa\\_%'),
    like(schema.users.username, 'teacher%'),
    like(schema.users.username, 'e2e%'),
    like(schema.users.fullName, 'E2E %'),
    like(schema.users.fullName, 'QA %'),
  );
}

app.get('/api/admin/cleanup/search', requireAdmin, async (req, res, next) => {
  try {
    const query = clean(req.query?.q);
    if (query.length < 2) return res.status(400).json({ error: 'Enter at least 2 characters to search.' });
    const pattern = '%' + query.replace(/[\\%_]/g, '\\$&') + '%';
    const match = or(like(schema.users.fullName, pattern), like(schema.users.email, pattern), like(schema.users.username, pattern));
    const [teachers, students, accessCodes] = await Promise.all([
      db.select().from(schema.users).where(and(eq(schema.users.role, 'teacher'), match)).orderBy(desc(schema.users.createdAt)).limit(50),
      db.select().from(schema.users).where(and(eq(schema.users.role, 'student'), match)).orderBy(desc(schema.users.createdAt)).limit(50),
      db.select().from(schema.accessCodes).orderBy(desc(schema.accessCodes.createdAt)).limit(200),
    ]);
    const matchingCodes = accessCodes.filter((code) => [code.code, code.targetSubject, code.targetGrade].some((value) => String(value || '').toLowerCase().includes(query.toLowerCase())));
    res.json({
      teachers: await Promise.all(teachers.map(async (teacher) => ({ ...sanitizeUser(teacher), tenant: await tenantForUser(teacher) }))),
      students: students.map(sanitizeUser),
      accessCodes: matchingCodes.slice(0, 50),
    });
  } catch (error) { next(error); }
});

app.delete('/api/admin/cleanup/teachers/:userId', requireAdmin, async (req, res, next) => {
  try { const deleted = await cleanupUser(req.params.userId, 'teacher'); if (!deleted) return res.status(404).json({ error: 'Teacher not found.' }); res.json({ ok: true, deleted }); }
  catch (error) { next(error); }
});

app.delete('/api/admin/cleanup/students/:userId', requireAdmin, async (req, res, next) => {
  try { const deleted = await cleanupUser(req.params.userId, 'student'); if (!deleted) return res.status(404).json({ error: 'Student not found.' }); res.json({ ok: true, deleted }); }
  catch (error) { next(error); }
});

app.delete('/api/admin/cleanup/access-codes/:codeId', requireAdmin, async (req, res, next) => {
  try {
    const codeId = Number(req.params.codeId);
    const code = (await db.select().from(schema.accessCodes).where(eq(schema.accessCodes.id, codeId)).limit(1))[0];
    if (!code) return res.status(404).json({ error: 'Access code not found.' });
    await db.delete(schema.entitlements).where(eq(schema.entitlements.accessCodeId, code.id));
    await db.delete(schema.accessCodes).where(eq(schema.accessCodes.id, code.id));
    res.json({ ok: true, deleted: { accessCodeId: code.id, code: code.code } });
  } catch (error) { next(error); }
});

app.post('/api/admin/cleanup/test-data', requireAdmin, async (req, res, next) => {
  try {
    if (clean(req.body?.confirmation) !== 'DELETE TEST DATA') return res.status(400).json({ error: 'Type DELETE TEST DATA exactly to confirm.' });
    const users = await db.select({ id: schema.users.id, role: schema.users.role }).from(schema.users).where(cleanupTestUserFilter());
    const deleted = [];
    for (const user of users) {
      const result = await cleanupUser(user.id, user.role);
      if (result) deleted.push(result);
    }
    res.json({ ok: true, deleted: { users: deleted.length, records: deleted } });
  } catch (error) { next(error); }
});

app.post('/api/teacher/login', async (req, res, next) => {
  try {
    const { username, password, subject } = req.body || {};
    const user = await loginUser(username, password);
    if (!user || user.role !== 'teacher') return res.status(401).json({ error: 'The teacher username or password is incorrect.' });
    const tenant = await tenantForUser(user);
    if (!tenant || (subject && clean(subject).toLowerCase() !== tenant.slug)) return res.status(403).json({ error: 'The selected subject does not match this teacher account.' });
    user.tenantSlug = tenant.slug;
    await setSession(res, user.id);
    res.json({ user: sanitizeUser(user), redirect: '/' });
  } catch (error) { next(error); }
});
app.post('/api/auth/login', async (req, res, next) => {
  try { const { identifier, password } = req.body || {}; if (!clean(identifier) || !clean(password)) return res.status(400).json({ error: 'Username/email and password are required.' }); const user = await loginUser(identifier, password); if (!user) return res.status(401).json({ error: 'The username/email or password is incorrect.' }); if (user.role === 'teacher') return res.status(403).json({ error: 'Use the subject-aware teacher login at /teacher/login.' }); await setSession(res, user.id); res.json({ user: sanitizeUser(user) }); }
  catch (error) { next(error); }
});
app.post('/api/auth/logout', async (req, res, next) => { try { await clearSession(req, res); res.json({ ok: true }); } catch (error) { next(error); } });
app.get('/api/me', async (req, res, next) => { try { const user = await currentUser(req); res.json({ user: user ? sanitizeUser(user) : null }); } catch (error) { next(error); } });
app.put('/api/me/language', requireAuth(), async (req, res, next) => { try { const language = normalizeLanguage(req.body?.language); await db.update(schema.users).set({ language }).where(eq(schema.users.id, req.user.id)); req.user.language = language; res.json({ ok: true, language, user: sanitizeUser(req.user) }); } catch (error) { next(error); } });
app.post('/api/student/signup', async (req, res, next) => {
  try {
    const { firstName, lastName, email, phone, password } = req.body || {};
    if (!clean(firstName) || !clean(lastName) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeEmail(email)) || !clean(phone) || !validatePassword(password)) return res.status(400).json({ error: 'First name, last name, valid email, phone/WhatsApp, and an 8-character password are required.', code: 'INVALID_SIGNUP' });
    const inserted = await db.insert(schema.users).values({ role: 'student', fullName: `${clean(firstName)} ${clean(lastName)}`, email: normalizeEmail(email), phone: clean(phone), username: null, passwordHash: passwordHash(password), createdAt: now() });
    const userId = inserted[0].insertId;
    await db.insert(schema.studentProfiles).values({ userId, firstName: clean(firstName), lastName: clean(lastName), whatsapp: clean(phone), createdAt: now() });
    const user = (await db.select().from(schema.users).where(eq(schema.users.id, userId)).limit(1))[0];
    await setSession(res, userId);
    res.status(201).json({ user: sanitizeUser(user) });
  } catch (error) { if (error.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'An account with that email already exists.', code: 'EMAIL_EXISTS' }); next(error); }
});
app.post('/api/student/login', async (req, res, next) => { try { const user = await loginUser(req.body?.identifier, req.body?.password); if (!user || user.role !== 'student') return res.status(401).json({ error: 'The student credentials are incorrect.' }); await setSession(res, user.id); res.json({ user: sanitizeUser(user) }); } catch (error) { next(error); } });

function helperChatResponse(subject, question) {
  const label = subject === 'english' ? 'English' : subject === 'arabic' ? 'Arabic' : 'Spanish';
  const lower = question.toLowerCase();
  if (subject === 'arabic') {
    if (/(grammar|نحو|قواعد|إعراب)/i.test(lower)) return 'لنراجع قاعدة العربية بهدوء: حدّد الفعل والفاعل والمفعول به، ثم اكتب جملة قصيرة وغيّر زمن الفعل أو عدد الفاعل ولاحظ التغيير. أرسل الجملة كاملة وسأشرحها خطوة بخطوة.';
    if (/(translate|meaning|معنى|ترجم|كلمة|مفردات)/i.test(lower)) return 'لتثبيت مفردة عربية جديدة، انطقها بصوت واضح، ضعها في جملة من حياتك اليومية، ثم قارنها بكلمة قريبة في المعنى. أرسل الكلمة أو الجملة وسأوضح استخدامها في السياق.';
    if (/(study|review|exam|مذاكرة|اختبار|ذاكر)/i.test(lower)) return 'خطة مراجعة عربية قصيرة: ١) راجع خمس مفردات، ٢) اشرح قاعدة واحدة بكلماتك، ٣) حل ثلاثة أسئلة دون ملاحظات، ٤) صحح أخطاءك بلون مختلف، ثم خذ استراحة قصيرة.';
    return 'أنا رفيقك الدراسي لمادة العربية. أستطيع شرح النحو والمفردات، التدريب على جملة، أو إعداد خطة مراجعة. اكتب سؤالك أو الجملة أو موضوع الدرس وسنعمل عليه معًا.';
  }
  if (/(grammar|tense|verb|conjugat|زمن|قواعد)/i.test(lower)) return `Let’s make this ${label} grammar idea manageable. First, identify the subject, the action, and the time. Write one short example, then change only the time or subject and notice what changes. If you share the exact sentence, I can explain it step by step.`;
  if (/(translate|meaning|يعني|ترجم|vocab|word)/i.test(lower)) return `For a useful ${label} vocabulary check, try this: say the word aloud, put it in a short sentence about school or daily life, and compare it with a nearby word that means something different. Send me the word or sentence and I’ll unpack it in context.`;
  if (/(study|review|exam|مذاكرة|اختبار|ذاكر)/i.test(lower)) return `Here is a focused ${label} study plan: 1) review five key words, 2) explain one grammar pattern in your own words, 3) answer three practice questions without notes, and 4) correct your mistakes in a different color. Keep the session to 20 minutes, then take a short break.`;
  return `I’m your ${label} study companion. I can explain grammar, clarify vocabulary, practice a sentence with you, or help you make a revision plan. Tell me the exact question, sentence, or lesson topic and we’ll work through it together.`;
}
app.post('/api/student/chat', requireAuth(['student']), async (req, res, next) => {
  try {
    const question = clean(req.body?.message);
    if (question.length < 2) return res.status(400).json({ error: 'Ask a question to begin.' });
    if (question.length > 1200) return res.status(400).json({ error: 'Please keep your question under 1,200 characters.' });
    const subject = (req.user.tenantSlug || clean(req.body?.subject) || 'spanish').toLowerCase();
    const fallback = helperChatResponse(subject, question);
    const openAiBase = process.env.OPENAI_API_BASE || 'https://api.openai.com/v1';
    if (!process.env.OPENAI_API_KEY) return res.json({ reply: fallback, subject, mode: 'study-helper' });
    const controller = new AbortController(); const timeout = setTimeout(() => controller.abort(), 9000);
    try {
      const response = await fetch(`${openAiBase.replace(/\/$/, '')}/chat/completions`, { method: 'POST', signal: controller.signal, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.OPENAI_API_KEY}` }, body: JSON.stringify({ model: process.env.OPENAI_MODEL || 'gpt-4o-mini', temperature: 0.35, max_tokens: 260, messages: [{ role: 'system', content: `You are LinguaEdu's concise, encouraging secondary-school ${subject} study assistant. Explain grammar and vocabulary clearly, use examples, never claim to be a human teacher, and do not help with cheating. Answer in the student's language when clear; otherwise use English. Keep replies under 140 words.` }, { role: 'user', content: question }] }) });
      const payload = await response.json().catch(() => ({}));
      const reply = payload.choices?.[0]?.message?.content?.trim();
      if (response.ok && reply) return res.json({ reply, subject, mode: 'ai' });
    } finally { clearTimeout(timeout); }
    res.json({ reply: fallback, subject, mode: 'study-helper' });
  } catch (error) { if (error.name === 'AbortError') return res.json({ reply: helperChatResponse((req.user?.tenantSlug || 'spanish'), clean(req.body?.message)), subject: req.user?.tenantSlug || 'spanish', mode: 'study-helper' }); next(error); }
});

app.get('/api/teacher/overview', requireAuth(['teacher']), async (req, res, next) => {
  try {
    const period = [7, 30, 90].includes(Number(req.query.period)) ? Number(req.query.period) : 7;
    const [students, codes, views, average, lessonsToday, completedToday, questionCount, engagementRows] = await Promise.all([
      pool.query('SELECT COUNT(DISTINCT e.user_id) AS count FROM entitlements e INNER JOIN courses c ON c.id = e.course_id WHERE c.created_by = ?', [req.user.id]),
      db.select({ count: sql`count(*)` }).from(schema.accessCodes).where(and(eq(schema.accessCodes.createdBy, req.user.id), sql`${schema.accessCodes.redeemedBy} IS NULL`, sql`(${schema.accessCodes.expiresAt} IS NULL OR ${schema.accessCodes.expiresAt} > NOW())`)),
      pool.query('SELECT COUNT(*) AS count FROM lesson_views v INNER JOIN lessons l ON l.id = v.lesson_id WHERE l.created_by = ?', [req.user.id]),
      pool.query('SELECT COALESCE(AVG(q.score / NULLIF(q.total, 0) * 100), 0) AS average FROM quiz_attempts q INNER JOIN lessons l ON l.id = q.lesson_id WHERE l.created_by = ?', [req.user.id]),
      db.select({ count: sql`count(*)` }).from(schema.lessons).where(and(eq(schema.lessons.createdBy, req.user.id), sql`${schema.lessons.createdAt} >= CURDATE()`)),
      pool.query('SELECT COUNT(*) AS count FROM lesson_progress p INNER JOIN lessons l ON l.id = p.lesson_id WHERE l.created_by = ? AND p.completed = 1 AND p.completed_at >= CURDATE()', [req.user.id]),
      pool.query('SELECT COUNT(*) AS count FROM question_banks q INNER JOIN lessons l ON l.id = q.lesson_id WHERE l.created_by = ?', [req.user.id]),
      pool.query(`SELECT DATE(v.viewed_at) AS day, COUNT(*) AS views FROM lesson_views v INNER JOIN lessons l ON l.id = v.lesson_id WHERE l.created_by = ? AND v.viewed_at >= DATE_SUB(CURDATE(), INTERVAL ${period - 1} DAY) GROUP BY DATE(v.viewed_at) ORDER BY day`, [req.user.id]),
    ]);
    const map = new Map((engagementRows[0] || []).map((row) => [String(row.day).slice(0, 10), Number(row.views || 0)]));
    const engagement = Array.from({ length: period }, (_, index) => { const day = new Date(); day.setHours(0, 0, 0, 0); day.setDate(day.getDate() - (period - 1 - index)); return { label: period === 7 ? day.toLocaleDateString('en-US', { weekday: 'short' }) : `${day.getDate()}/${day.getMonth() + 1}`, views: map.get(day.toISOString().slice(0, 10)) || 0 }; });
    const scalar = (result) => Number(result?.[0]?.[0]?.count || result?.[0]?.count || 0);
    res.json({ students: scalar(students), codes: Number(codes[0]?.count || 0), views: scalar(views), average: Math.round(Number(average[0]?.[0]?.average || 0)), today: { lessons: Number(lessonsToday[0]?.count || 0), completed: scalar(completedToday), questions: scalar(questionCount) }, engagement });
  } catch (error) { next(error); }
});
app.get('/api/teacher/students', requireAuth(['teacher']), async (req, res, next) => {
  try {
    const students = await db.select({ student: schema.users }).from(schema.users).innerJoin(schema.entitlements, eq(schema.entitlements.userId, schema.users.id)).innerJoin(schema.courses, eq(schema.courses.id, schema.entitlements.courseId)).where(and(eq(schema.users.role, 'student'), eq(schema.courses.createdBy, req.user.id))).groupBy(schema.users.id).orderBy(desc(schema.users.createdAt));
    const data = await Promise.all(students.map(async (row) => { const student = row.student; const [enrollments, codes] = await Promise.all([db.select({ count: sql`count(*)` }).from(schema.enrollments).where(eq(schema.enrollments.userId, student.id)), db.select({ count: sql`count(*)` }).from(schema.accessCodes).where(eq(schema.accessCodes.redeemedBy, student.id))]); return { ...sanitizeUser(student), registrationDate: student.createdAt, enrolledCourses: Number(enrollments[0]?.count || 0), activatedCodes: Number(codes[0]?.count || 0) }; }));
    res.json({ students: data });
  } catch (error) { next(error); }
});
app.get('/api/teacher/courses', requireAuth(['teacher']), async (req, res, next) => {
  try {
    const rows = await db.select().from(schema.courses).where(eq(schema.courses.createdBy, req.user.id)).orderBy(desc(schema.courses.createdAt));
    const courses = await Promise.all(rows.map(async (course) => {
      const [modules, lessons] = await Promise.all([db.select().from(schema.modules).where(eq(schema.modules.courseId, course.id)), db.select().from(schema.lessons).where(eq(schema.lessons.courseId, course.id))]);
      const banks = lessons.length ? await db.select().from(schema.questionBanks).where(inArray(schema.questionBanks.lessonId, lessons.map((lesson) => lesson.id))) : [];
      return { ...course, modules: modules.map((module) => ({ ...module, lessonCount: lessons.filter((lesson) => lesson.moduleId === module.id).length })), lessons: lessons.map((lesson) => { const bank = banks.find((item) => item.lessonId === lesson.id); const questions = bank ? jsonArray(bank.questions) : []; return { ...lesson, questionBank: bank ? { id: bank.id, rawText: bank.rawText, questions, questionCount: questions.length } : null }; }), lessonCount: lessons.length };
    }));
    res.json({ courses });
  } catch (error) { next(error); }
});
async function ownedCourse(teacherId, tenantId, courseId) { return (await db.select().from(schema.courses).where(and(eq(schema.courses.id, courseId), eq(schema.courses.createdBy, teacherId), eq(schema.courses.tenantId, tenantId))).limit(1))[0]; }
async function ownedLesson(teacherId, lessonId) { return (await db.select().from(schema.lessons).where(and(eq(schema.lessons.id, lessonId), eq(schema.lessons.createdBy, teacherId))).limit(1))[0]; }
app.delete('/api/teacher/courses/:courseId', requireAuth(['teacher']), async (req, res, next) => {
  try {
    const courseId = Number(req.params.courseId);
    const course = await ownedCourse(req.user.id, req.user.tenantId, courseId);
    if (!course) return res.status(404).json({ error: 'Course not found in your assigned subject.' });
    const modules = await db.select().from(schema.modules).where(eq(schema.modules.courseId, courseId));
    const moduleIds = modules.map((module) => module.id);
    const lessons = await db.select().from(schema.lessons).where(and(eq(schema.lessons.courseId, courseId), eq(schema.lessons.createdBy, req.user.id)));
    const lessonIds = lessons.map((lesson) => lesson.id);
    const teacherCodes = await db.select().from(schema.accessCodes).where(and(eq(schema.accessCodes.createdBy, req.user.id), eq(schema.accessCodes.tenantId, req.user.tenantId)));
    const associatedCodes = teacherCodes.filter((code) => code.courseId === courseId || jsonArray(code.targetCourseIds).map(Number).includes(courseId) || jsonArray(code.targetModuleIds).some((id) => moduleIds.includes(Number(id))));
    for (const code of associatedCodes) {
      await db.delete(schema.entitlements).where(eq(schema.entitlements.accessCodeId, code.id));
      await db.delete(schema.accessCodes).where(eq(schema.accessCodes.id, code.id));
    }
    await db.delete(schema.entitlements).where(eq(schema.entitlements.courseId, courseId));
    await db.delete(schema.enrollments).where(eq(schema.enrollments.courseId, courseId));
    for (const lessonId of lessonIds) {
      await db.delete(schema.questionBanks).where(eq(schema.questionBanks.lessonId, lessonId));
      await db.delete(schema.lessonViews).where(eq(schema.lessonViews.lessonId, lessonId));
      await db.delete(schema.lessonProgress).where(eq(schema.lessonProgress.lessonId, lessonId));
      await db.delete(schema.quizAttempts).where(eq(schema.quizAttempts.lessonId, lessonId));
    }
    if (lessonIds.length) await db.delete(schema.lessons).where(and(inArray(schema.lessons.id, lessonIds), eq(schema.lessons.createdBy, req.user.id)));
    if (moduleIds.length) await db.delete(schema.modules).where(and(inArray(schema.modules.id, moduleIds), eq(schema.modules.courseId, courseId)));
    await db.delete(schema.courses).where(and(eq(schema.courses.id, courseId), eq(schema.courses.createdBy, req.user.id), eq(schema.courses.tenantId, req.user.tenantId)));
    res.json({ ok: true, deletedCourseId: courseId, deletedLessonIds: lessonIds, deletedAccessCodeIds: associatedCodes.map((code) => code.id) });
  } catch (error) { next(error); }
});

async function ownedQuestionBank(teacherId, bankId) { const bank = (await db.select().from(schema.questionBanks).where(eq(schema.questionBanks.id, bankId)).limit(1))[0]; if (!bank) return null; const lesson = await ownedLesson(teacherId, bank.lessonId); return lesson ? { bank, lesson } : null; }
async function upsertQuestions(lessonId, rawText) {
  const parsed = parseQuestions(rawText);
  const existing = (await db.select().from(schema.questionBanks).where(eq(schema.questionBanks.lessonId, lessonId)).limit(1))[0];
  if (existing) await db.update(schema.questionBanks).set({ rawText: clean(rawText), questions: parsed }).where(eq(schema.questionBanks.id, existing.id));
  else await db.insert(schema.questionBanks).values({ lessonId, rawText: clean(rawText), questions: parsed, createdAt: now() });
  return parsed;
}
app.post('/api/teacher/lessons', requireAuth(['teacher']), async (req, res, next) => {
  try {
    const { courseId, grade = 'الصف الأول الثانوي', unitNumber = 1, title, videoUrl = '', pdfUrl = '', coverUrl = '', rawQuestions = '' } = req.body || {};
    const subject = req.user.tenantSlug || 'spanish';
    if (!clean(title)) return res.status(400).json({ error: 'Lesson title is required.' });
    let course = courseId ? (await db.select().from(schema.courses).where(and(eq(schema.courses.id, Number(courseId)), eq(schema.courses.createdBy, req.user.id))).limit(1))[0] : null;
    if (!course) course = (await db.select().from(schema.courses).where(and(eq(schema.courses.subject, clean(subject)), eq(schema.courses.grade, clean(grade)), eq(schema.courses.createdBy, req.user.id))).limit(1))[0];
    if (!course) { const created = await db.insert(schema.courses).values({ subject: clean(subject), title: `${clean(subject) === 'english' ? 'English' : 'Spanish'} Path`, grade: clean(grade), createdBy: req.user.id, tenantId: req.user.tenantId, createdAt: now() }); course = (await db.select().from(schema.courses).where(eq(schema.courses.id, created[0].insertId)).limit(1))[0]; }
    let module = (await db.select().from(schema.modules).where(and(eq(schema.modules.courseId, course.id), eq(schema.modules.unitNumber, Number(unitNumber)))).limit(1))[0];
    if (!module) { const created = await db.insert(schema.modules).values({ courseId: course.id, unitNumber: Number(unitNumber), title: `Unit ${unitNumber}`, createdAt: now() }); module = (await db.select().from(schema.modules).where(eq(schema.modules.id, created[0].insertId)).limit(1))[0]; }
    const inserted = await db.insert(schema.lessons).values({ courseId: course.id, moduleId: module.id, unitNumber: Number(unitNumber), title: clean(title), videoUrl: clean(videoUrl) || null, pdfUrl: clean(pdfUrl) || null, coverUrl: clean(coverUrl) || null, createdBy: req.user.id, createdAt: now() });
    const lesson = (await db.select().from(schema.lessons).where(eq(schema.lessons.id, inserted[0].insertId)).limit(1))[0];
    const questions = clean(rawQuestions) ? await upsertQuestions(lesson.id, rawQuestions) : [];
    res.status(201).json({ course, module, lesson, questionCount: questions.length });
  } catch (error) { next(error); }
});
app.put('/api/teacher/lessons/:lessonId', requireAuth(['teacher']), async (req, res, next) => {
  try {
    const lessonId = Number(req.params.lessonId); const lesson = await ownedLesson(req.user.id, lessonId);
    if (!lesson) return res.status(404).json({ error: 'Lesson not found.' });
    const patch = {}; for (const field of ['title', 'videoUrl', 'pdfUrl', 'coverUrl']) if (field in (req.body || {})) patch[field] = clean(req.body[field]) || null;
    if ('unitNumber' in (req.body || {})) patch.unitNumber = Math.max(1, Number(req.body.unitNumber) || lesson.unitNumber);
    if (Object.keys(patch).length) await db.update(schema.lessons).set(patch).where(eq(schema.lessons.id, lessonId));
    if ('rawQuestions' in (req.body || {})) await upsertQuestions(lessonId, req.body.rawQuestions);
    const updated = (await db.select().from(schema.lessons).where(eq(schema.lessons.id, lessonId)).limit(1))[0];
    res.json({ lesson: updated });
  } catch (error) { next(error); }
});
app.delete('/api/teacher/lessons/:lessonId', requireAuth(['teacher']), async (req, res, next) => {
  try {
    const lessonId = Number(req.params.lessonId); const lesson = await ownedLesson(req.user.id, lessonId);
    if (!lesson) return res.status(404).json({ error: 'Lesson not found.' });
    await db.delete(schema.questionBanks).where(eq(schema.questionBanks.lessonId, lessonId));
    await db.delete(schema.lessonViews).where(eq(schema.lessonViews.lessonId, lessonId));
    await db.delete(schema.lessonProgress).where(eq(schema.lessonProgress.lessonId, lessonId));
    await db.delete(schema.quizAttempts).where(eq(schema.quizAttempts.lessonId, lessonId));
    await db.delete(schema.lessons).where(eq(schema.lessons.id, lessonId));
    res.json({ ok: true, deletedLessonId: lessonId });
  } catch (error) { next(error); }
});
app.put('/api/teacher/question-banks/:questionBankId', requireAuth(['teacher']), async (req, res, next) => {
  try { const owned = await ownedQuestionBank(req.user.id, Number(req.params.questionBankId)); if (!owned) return res.status(404).json({ error: 'Question bank not found.' }); if (!clean(req.body?.rawText)) return res.status(400).json({ error: 'Question text is required.' }); const questions = parseQuestions(req.body.rawText); await db.update(schema.questionBanks).set({ rawText: clean(req.body.rawText), questions }).where(eq(schema.questionBanks.id, owned.bank.id)); res.json({ ok: true, questionBank: { id: owned.bank.id, rawText: clean(req.body.rawText), questions, questionCount: questions.length } }); }
  catch (error) { next(error); }
});
app.delete('/api/teacher/question-banks/:questionBankId', requireAuth(['teacher']), async (req, res, next) => {
  try { const owned = await ownedQuestionBank(req.user.id, Number(req.params.questionBankId)); if (!owned) return res.status(404).json({ error: 'Question bank not found.' }); await db.delete(schema.questionBanks).where(eq(schema.questionBanks.id, owned.bank.id)); res.json({ ok: true, deletedQuestionBankId: owned.bank.id }); }
  catch (error) { next(error); }
});
app.post('/api/teacher/access-codes', requireAuth(['teacher']), async (req, res, next) => {
  try {
    const { targetSubject = req.user.tenantSlug || '', targetGrade = '', unlockScope = 'specific', courseIds = [], moduleIds = [], duration = '30' } = req.body || {};
    const normalizedCourseIds = [...new Set((Array.isArray(courseIds) ? courseIds : []).map(Number).filter(Boolean))]; const normalizedModuleIds = [...new Set((Array.isArray(moduleIds) ? moduleIds : []).map(Number).filter(Boolean))];
    if (clean(targetSubject).toLowerCase() !== req.user.tenantSlug || !clean(targetGrade)) return res.status(400).json({ error: 'Target subject and grade are required.' });
    if (unlockScope === 'specific' && !normalizedCourseIds.length && !normalizedModuleIds.length) return res.status(400).json({ error: 'Select at least one course or module to unlock.' });
    const ownedCourses = await db.select().from(schema.courses).where(eq(schema.courses.createdBy, req.user.id)); const ownedCourseIds = new Set(ownedCourses.filter((course) => course.subject === clean(targetSubject) && course.grade === clean(targetGrade)).map((course) => course.id));
    if (unlockScope === 'all' && !ownedCourseIds.size) return res.status(400).json({ error: 'No course content exists for that subject and grade yet.' });
    const validCourseIds = normalizedCourseIds.filter((id) => ownedCourseIds.has(id)); const validModules = normalizedModuleIds.length ? (await db.select().from(schema.modules).where(inArray(schema.modules.id, normalizedModuleIds))).filter((module) => ownedCourseIds.has(module.courseId)) : [];
    if (unlockScope === 'specific' && !validCourseIds.length && !validModules.length) return res.status(400).json({ error: 'The selected courses or modules are not owned by this teacher.' });
    const durationDays = { '7': 7, '30': 30, '90': 90, '365': 365 }[String(duration)] || 30; const expiresAt = new Date(Date.now() + durationDays * 86400000); const anchorCourseId = unlockScope === 'all' ? [...ownedCourseIds][0] : (validCourseIds[0] || validModules[0]?.courseId); const code = `LNG-${crypto.randomBytes(3).toString('hex').toUpperCase()}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`;
    await db.insert(schema.accessCodes).values({ code, courseId: anchorCourseId, createdBy: req.user.id, tenantId: req.user.tenantId, targetSubject: clean(targetSubject), targetGrade: clean(targetGrade), unlockScope, targetCourseIds: unlockScope === 'all' ? [...ownedCourseIds] : validCourseIds, targetModuleIds: validModules.map((module) => module.id), expiresAt, createdAt: now() });
    res.status(201).json({ code, targetSubject: clean(targetSubject), targetGrade: clean(targetGrade), unlockScope, courseIds: unlockScope === 'all' ? [...ownedCourseIds] : validCourseIds, moduleIds: validModules.map((module) => module.id), expiresAt });
  } catch (error) { next(error); }
});
app.get('/api/teacher/access-codes', requireAuth(['teacher']), async (req, res, next) => { try { const rows = await db.select().from(schema.accessCodes).where(eq(schema.accessCodes.createdBy, req.user.id)).orderBy(desc(schema.accessCodes.createdAt)); const current = Date.now(); res.json({ codes: rows.map((code) => ({ ...code, targetCourseIds: code.targetCourseIds || [], targetModuleIds: code.targetModuleIds || [], status: code.expiresAt && new Date(code.expiresAt).getTime() <= current ? 'expired' : code.redeemedBy ? 'redeemed' : 'active' })) }); } catch (error) { next(error); } });
async function studentEnrollment(userId, courseId) { return (await db.select().from(schema.enrollments).where(and(eq(schema.enrollments.userId, userId), eq(schema.enrollments.courseId, courseId))).limit(1)).length > 0; }
async function studentHasLessonAccess(userId, lesson) { return (await db.select().from(schema.entitlements).where(and(eq(schema.entitlements.userId, userId), eq(schema.entitlements.courseId, lesson.courseId), or(sql`${schema.entitlements.moduleId} IS NULL`, eq(schema.entitlements.moduleId, lesson.moduleId)))).limit(1)).length > 0; }
app.get('/api/student/content', requireAuth(['student']), async (req, res, next) => { try { const entitlements = await db.select().from(schema.entitlements).where(eq(schema.entitlements.userId, req.user.id)); const courseIds = [...new Set(entitlements.map((item) => item.courseId))]; if (!courseIds.length) return res.json({ courses: [] }); const coursesRows = await db.select().from(schema.courses).where(inArray(schema.courses.id, courseIds)); const lessonRows = await db.select().from(schema.lessons).where(inArray(schema.lessons.courseId, courseIds)).orderBy(schema.lessons.unitNumber); const progressRows = await db.select().from(schema.lessonProgress).where(eq(schema.lessonProgress.userId, req.user.id)); const visibleLessons = lessonRows.filter((lesson) => entitlements.some((item) => item.courseId === lesson.courseId && (item.moduleId === null || item.moduleId === lesson.moduleId))); res.json({ courses: coursesRows.map((course) => ({ ...course, lessons: visibleLessons.filter((lesson) => lesson.courseId === course.id).map((lesson) => ({ ...lesson, completed: progressRows.some((progress) => progress.lessonId === lesson.id && progress.completed) })) })).filter((course) => course.lessons.length) }); } catch (error) { next(error); } });
app.post('/api/student/redeem-code', requireAuth(['student']), async (req, res, next) => { try { const code = clean(req.body?.code).toUpperCase(); if (!code) return res.status(400).json({ error: 'Enter an access code.' }); const access = (await db.select().from(schema.accessCodes).where(eq(schema.accessCodes.code, code)).limit(1))[0]; if (!access) return res.status(404).json({ error: 'That access code was not found.' }); if (access.expiresAt && new Date(access.expiresAt).getTime() <= Date.now()) return res.status(410).json({ error: 'That access code has expired.' }); if (access.redeemedBy && access.redeemedBy !== req.user.id) return res.status(409).json({ error: 'That access code has already been redeemed.' }); let courseIds = Array.isArray(access.targetCourseIds) ? access.targetCourseIds.map(Number) : []; const moduleIds = Array.isArray(access.targetModuleIds) ? access.targetModuleIds.map(Number) : []; if (access.unlockScope === 'all') courseIds = (await db.select({ id: schema.courses.id }).from(schema.courses).where(and(eq(schema.courses.subject, access.targetSubject), eq(schema.courses.grade, access.targetGrade), eq(schema.courses.createdBy, access.createdBy)))).map((course) => course.id); if (!courseIds.length && access.courseId) courseIds = [access.courseId]; const modules = moduleIds.length ? await db.select().from(schema.modules).where(inArray(schema.modules.id, moduleIds)) : []; const allCourseIds = [...new Set([...courseIds, ...modules.map((module) => module.courseId)])]; for (const courseId of allCourseIds) { if (!(await studentEnrollment(req.user.id, courseId))) await db.insert(schema.enrollments).values({ userId: req.user.id, courseId, createdAt: now() }); const selectedModules = modules.filter((module) => module.courseId === courseId); const existing = await db.select().from(schema.entitlements).where(and(eq(schema.entitlements.userId, req.user.id), eq(schema.entitlements.courseId, courseId))); if (!selectedModules.length || access.unlockScope === 'all' || (courseIds.includes(courseId) && !moduleIds.length)) { if (!existing.some((item) => item.moduleId === null)) await db.insert(schema.entitlements).values({ userId: req.user.id, courseId, moduleId: null, accessCodeId: access.id, createdAt: now() }); } for (const module of selectedModules) if (!existing.some((item) => item.moduleId === module.id)) await db.insert(schema.entitlements).values({ userId: req.user.id, courseId, moduleId: module.id, accessCodeId: access.id, createdAt: now() }); } await db.update(schema.accessCodes).set({ redeemedBy: req.user.id, redeemedAt: now() }).where(eq(schema.accessCodes.id, access.id)); res.json({ ok: true, unlocked: true, courseIds: allCourseIds, moduleIds }); } catch (error) { next(error); } });
app.post('/api/student/lessons/:lessonId/view', requireAuth(['student']), async (req, res, next) => { try { const lesson = (await db.select().from(schema.lessons).where(eq(schema.lessons.id, Number(req.params.lessonId))).limit(1))[0]; if (!lesson || !(await studentHasLessonAccess(req.user.id, lesson))) return res.status(403).json({ error: 'Lesson is not unlocked.' }); await db.insert(schema.lessonViews).values({ userId: req.user.id, lessonId: lesson.id, viewedAt: now() }); res.json({ ok: true, viewed: true }); } catch (error) { next(error); } });
app.post('/api/student/lessons/:lessonId/complete', requireAuth(['student']), async (req, res, next) => { try { const lessonId = Number(req.params.lessonId); const lesson = (await db.select().from(schema.lessons).where(eq(schema.lessons.id, lessonId)).limit(1))[0]; if (!lesson || !(await studentHasLessonAccess(req.user.id, lesson))) return res.status(403).json({ error: 'Lesson is not unlocked.' }); const existing = (await db.select().from(schema.lessonProgress).where(and(eq(schema.lessonProgress.userId, req.user.id), eq(schema.lessonProgress.lessonId, lessonId))).limit(1))[0]; if (existing) await db.update(schema.lessonProgress).set({ completed: true, completedAt: now() }).where(eq(schema.lessonProgress.id, existing.id)); else await db.insert(schema.lessonProgress).values({ userId: req.user.id, lessonId, completed: true, completedAt: now() }); res.json({ ok: true, completed: true }); } catch (error) { next(error); } });
app.get('/api/student/quiz/:lessonId/start', requireAuth(['student']), async (req, res, next) => { try { const lessonId = Number(req.params.lessonId); const lesson = (await db.select().from(schema.lessons).where(eq(schema.lessons.id, lessonId)).limit(1))[0]; if (!lesson || !(await studentHasLessonAccess(req.user.id, lesson))) return res.status(403).json({ error: 'Lesson is not unlocked.' }); const bank = (await db.select().from(schema.questionBanks).where(eq(schema.questionBanks.lessonId, lessonId)).limit(1))[0]; const all = jsonArray(bank?.questions); const subset = shuffle(all).slice(0, Math.min(5, all.length)); const inserted = await db.insert(schema.quizAttempts).values({ userId: req.user.id, lessonId, score: 0, total: subset.length, passed: false, quizData: subset, createdAt: now() }); res.json({ attemptId: inserted[0].insertId, lessonId, questions: subset.map(publicQuestion), total: subset.length }); } catch (error) { next(error); } });
app.post('/api/student/quiz/:attemptId/submit', requireAuth(['student']), async (req, res, next) => { try { const attempt = (await db.select().from(schema.quizAttempts).where(and(eq(schema.quizAttempts.id, Number(req.params.attemptId)), eq(schema.quizAttempts.userId, req.user.id))).limit(1))[0]; if (!attempt) return res.status(404).json({ error: 'Quiz attempt not found.' }); const questions = jsonArray(attempt.quizData); const answers = req.body?.answers || {}; const score = questions.reduce((sum, question) => sum + (String(answers[question.id] || '').toUpperCase() === String(question.answer || '').toUpperCase() ? 1 : 0), 0); const passed = questions.length > 0 && score === questions.length; await db.update(schema.quizAttempts).set({ score, total: questions.length, passed }).where(eq(schema.quizAttempts.id, attempt.id)); res.json({ score, total: questions.length, passed, certificateAvailable: passed }); } catch (error) { next(error); } });
async function pdfCertificate(name, courseTitle, language = 'en') {
  if (normalizeLanguage(language) !== 'ar') {
    const escapePdf = (value) => String(value).replace(/([\\()])/g, '\\$1'); const body = `BT /F1 25 Tf 78 680 Td (${escapePdf('LINGUAEDU')}) Tj /F1 36 Tf 0 -80 Td (${escapePdf('Certificate of Completion')}) Tj /F1 18 Tf 0 -55 Td (${escapePdf(name)}) Tj /F1 13 Tf 0 -35 Td (${escapePdf(`has completed ${courseTitle}`)}) Tj ET`; const objects = [`<< /Type /Catalog /Pages 2 0 R >>`, `<< /Type /Pages /Kids [3 0 R] /Count 1 >>`, `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>`, `<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>`, `<< /Length ${body.length} >>\nstream\n${body}\nendstream`]; let pdf = '%PDF-1.4\n'; const offsets = [0]; objects.forEach((object, index) => { offsets[index + 1] = Buffer.byteLength(pdf); pdf += `${index + 1} 0 obj\n${object}\nendobj\n`; }); const xref = Buffer.byteLength(pdf); pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets.slice(1).map((offset) => `${String(offset).padStart(10, '0')} 00000 n `).join('\n')}\ntrailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`; return Buffer.from(pdf, 'binary');
  }
  return await new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 72 }); const chunks = [];
    doc.on('data', (chunk) => chunks.push(chunk)); doc.on('end', () => resolve(Buffer.concat(chunks))); doc.on('error', reject);
    const font = path.join(process.cwd(), 'assets', 'fonts', 'Amiri-Regular.ttf'); const bold = path.join(process.cwd(), 'assets', 'fonts', 'Amiri-Bold.ttf');
    doc.font(bold).fontSize(28).fillColor('#2f6f64').text(shapeArabic('شهادة إتمام'), { align: 'right', width: 450 });
    doc.moveDown(1).font(font).fontSize(18).fillColor('#283b36').text(shapeArabic('تشهد LinguaEdu بأن'), { align: 'right', width: 450 });
    doc.moveDown(.4).font(bold).fontSize(24).text(shapeArabic(name), { align: 'right', width: 450 });
    doc.moveDown(.5).font(font).fontSize(17).text(shapeArabic(`أتم بنجاح دورة ${courseTitle}`), { align: 'right', width: 450 });
    doc.moveDown(2).font(font).fontSize(12).fillColor('#65746b').text(shapeArabic('مع تمنياتنا بمزيد من النجاح والتعلم.'), { align: 'right', width: 450 });
    doc.end();
  });
}
app.get('/api/student/certificate/:courseId', requireAuth(['student']), async (req, res, next) => { try { const courseId = Number(req.params.courseId); if (!(await studentEnrollment(req.user.id, courseId))) return res.status(403).json({ error: 'Course is not unlocked.' }); const lessons = await db.select().from(schema.lessons).where(eq(schema.lessons.courseId, courseId)); const completed = await db.select().from(schema.lessonProgress).where(and(eq(schema.lessonProgress.userId, req.user.id), eq(schema.lessonProgress.completed, true), inArray(schema.lessonProgress.lessonId, lessons.map((lesson) => lesson.id || 0)))); const passed = await db.select().from(schema.quizAttempts).where(and(eq(schema.quizAttempts.userId, req.user.id), eq(schema.quizAttempts.passed, true), inArray(schema.quizAttempts.lessonId, lessons.map((lesson) => lesson.id || 0)))); if (!lessons.length || completed.length < lessons.length || !passed.length) return res.status(409).json({ error: 'Complete every lesson and pass the quiz first.' }); const course = (await db.select().from(schema.courses).where(eq(schema.courses.id, courseId)).limit(1))[0]; res.setHeader('Content-Type', 'application/pdf'); res.setHeader('Content-Disposition', `attachment; filename="linguaedu-certificate-${courseId}.pdf"`); res.send(await pdfCertificate(req.user.fullName, course.title, req.user.language)); } catch (error) { next(error); } });

app.get('/_app/health', (_req, res) => res.status(200).json({ ok: true }));
app.use((error, _req, res, _next) => { console.error(error); res.status(500).json({ error: 'Server error', detail: isProduction ? undefined : error.message }); });
if (isProduction) { const dist = path.resolve(process.cwd(), 'dist'); app.use(express.static(dist)); app.get('*', (_req, res) => res.sendFile(path.join(dist, 'index.html'))); } else { const vite = await createViteServer({ server: { middlewareMode: true, host: '0.0.0.0', allowedHosts: true }, appType: 'spa' }); app.use(vite.middlewares); }
app.listen(port, '0.0.0.0', () => console.log(`LinguaEdu server listening on ${port} (${isProduction ? 'production' : 'development'})`));
