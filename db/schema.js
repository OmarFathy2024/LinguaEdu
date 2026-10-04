import { mysqlTable, int, varchar, text, datetime, boolean, json, index, uniqueIndex } from 'drizzle-orm/mysql-core';

const createdAt = (name = 'created_at') => datetime(name).notNull().default(new Date());

export const users = mysqlTable('users', {
  id: int('id').autoincrement().primaryKey(),
  role: varchar('role', { length: 24 }).notNull(),
  username: varchar('username', { length: 80 }),
  email: varchar('email', { length: 190 }),
  passwordHash: text('password_hash').notNull(),
  fullName: varchar('full_name', { length: 160 }).notNull(),
  phone: varchar('phone', { length: 50 }).notNull(),
  createdAt: datetime('created_at').notNull(),
}, (table) => ({
  usernameUnique: uniqueIndex('users_username_unique').on(table.username),
  emailUnique: uniqueIndex('users_email_unique').on(table.email),
  roleIndex: index('users_role_idx').on(table.role),
}));

export const studentProfiles = mysqlTable('student_profiles', {
  id: int('id').autoincrement().primaryKey(),
  userId: int('user_id').notNull(),
  firstName: varchar('first_name', { length: 80 }).notNull(),
  lastName: varchar('last_name', { length: 80 }).notNull(),
  whatsapp: varchar('whatsapp', { length: 50 }).notNull(),
  createdAt: datetime('created_at').notNull(),
}, (table) => ({ userUnique: uniqueIndex('student_profiles_user_unique').on(table.userId) }));

export const courses = mysqlTable('courses', {
  id: int('id').autoincrement().primaryKey(),
  subject: varchar('subject', { length: 24 }).notNull(),
  title: varchar('title', { length: 190 }).notNull(),
  grade: varchar('grade', { length: 120 }).notNull(),
  createdBy: int('created_by').notNull(),
  createdAt: datetime('created_at').notNull(),
});

export const modules = mysqlTable('modules', {
  id: int('id').autoincrement().primaryKey(),
  courseId: int('course_id').notNull(),
  unitNumber: int('unit_number').notNull(),
  title: varchar('title', { length: 190 }).notNull(),
  createdAt: datetime('created_at').notNull(),
}, (table) => ({ moduleUnique: uniqueIndex('modules_course_unit_unique').on(table.courseId, table.unitNumber) }));

export const lessons = mysqlTable('lessons', {
  id: int('id').autoincrement().primaryKey(),
  courseId: int('course_id').notNull(),
  moduleId: int('module_id'),
  unitNumber: int('unit_number').notNull(),
  title: varchar('title', { length: 190 }).notNull(),
  videoUrl: text('video_url'),
  pdfUrl: text('pdf_url'),
  coverUrl: text('cover_url'),
  createdBy: int('created_by').notNull(),
  createdAt: datetime('created_at').notNull(),
}, (table) => ({ courseIndex: index('lessons_course_idx').on(table.courseId) }));

export const questionBanks = mysqlTable('question_banks', {
  id: int('id').autoincrement().primaryKey(),
  lessonId: int('lesson_id').notNull(),
  rawText: text('raw_text').notNull(),
  questions: json('questions').notNull(),
  createdAt: datetime('created_at').notNull(),
}, (table) => ({ lessonUnique: uniqueIndex('question_banks_lesson_unique').on(table.lessonId) }));

export const accessCodes = mysqlTable('access_codes', {
  id: int('id').autoincrement().primaryKey(),
  code: varchar('code', { length: 64 }).notNull(),
  courseId: int('course_id').notNull(),
  createdBy: int('created_by').notNull(),
  targetSubject: varchar('target_subject', { length: 24 }),
  targetGrade: varchar('target_grade', { length: 120 }),
  unlockScope: varchar('unlock_scope', { length: 16 }),
  targetCourseIds: json('target_course_ids'),
  targetModuleIds: json('target_module_ids'),
  expiresAt: datetime('expires_at'),
  redeemedBy: int('redeemed_by'),
  redeemedAt: datetime('redeemed_at'),
  createdAt: datetime('created_at').notNull(),
}, (table) => ({ codeUnique: uniqueIndex('access_codes_code_unique').on(table.code) }));

export const entitlements = mysqlTable('entitlements', {
  id: int('id').autoincrement().primaryKey(),
  userId: int('user_id').notNull(),
  courseId: int('course_id').notNull(),
  moduleId: int('module_id'),
  accessCodeId: int('access_code_id').notNull(),
  createdAt: datetime('created_at').notNull(),
}, (table) => ({ entitlementIndex: index('entitlements_user_course_module_idx').on(table.userId, table.courseId, table.moduleId) }));

export const enrollments = mysqlTable('enrollments', {
  id: int('id').autoincrement().primaryKey(),
  userId: int('user_id').notNull(),
  courseId: int('course_id').notNull(),
  createdAt: datetime('created_at').notNull(),
}, (table) => ({ enrollmentUnique: uniqueIndex('enrollments_user_course_unique').on(table.userId, table.courseId) }));

export const sessions = mysqlTable('sessions', {
  id: varchar('id', { length: 128 }).primaryKey(),
  userId: int('user_id').notNull(),
  expiresAt: datetime('expires_at').notNull(),
  createdAt: datetime('created_at').notNull(),
});

export const lessonProgress = mysqlTable('lesson_progress', {
  id: int('id').autoincrement().primaryKey(),
  userId: int('user_id').notNull(),
  lessonId: int('lesson_id').notNull(),
  completed: boolean('completed').notNull().default(false),
  completedAt: datetime('completed_at'),
}, (table) => ({ progressUnique: uniqueIndex('lesson_progress_user_lesson_unique').on(table.userId, table.lessonId) }));

export const lessonViews = mysqlTable('lesson_views', {
  id: int('id').autoincrement().primaryKey(),
  userId: int('user_id').notNull(),
  lessonId: int('lesson_id').notNull(),
  viewedAt: datetime('viewed_at').notNull(),
}, (table) => ({ viewLessonIndex: index('lesson_views_lesson_viewed_idx').on(table.lessonId, table.viewedAt), viewUserIndex: index('lesson_views_user_viewed_idx').on(table.userId, table.viewedAt) }));

export const quizAttempts = mysqlTable('quiz_attempts', {
  id: int('id').autoincrement().primaryKey(),
  userId: int('user_id').notNull(),
  lessonId: int('lesson_id').notNull(),
  score: int('score').notNull(),
  total: int('total').notNull(),
  passed: boolean('passed').notNull(),
  quizData: json('quiz_data').notNull(),
  createdAt: datetime('created_at').notNull(),
}, (table) => ({ attemptIndex: index('quiz_attempts_user_lesson_idx').on(table.userId, table.lessonId) }));
