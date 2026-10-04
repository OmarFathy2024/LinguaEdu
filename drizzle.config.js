export default {
  schema: './db/schema.js',
  out: './migrations',
  dialect: 'mysql',
  dbCredentials: { url: process.env.DATABASE_URL || process.env.DRIZZLE_DATABASE_URL },
};
