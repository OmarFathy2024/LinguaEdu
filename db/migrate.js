import fs from 'node:fs/promises';
import path from 'node:path';
import mysql from 'mysql2/promise';

const databaseUrl = process.env.DATABASE_URL || process.env.DRIZZLE_DATABASE_URL;
if (!databaseUrl) throw new Error('DATABASE_URL is required for migrations');

const connection = await mysql.createConnection({ uri: databaseUrl, multipleStatements: true });
await connection.query(`CREATE TABLE IF NOT EXISTS drizzle_migrations (id VARCHAR(190) PRIMARY KEY, applied_at DATETIME NOT NULL)`);
const migrationsDir = path.resolve(process.cwd(), 'migrations');
const files = (await fs.readdir(migrationsDir)).filter((file) => file.endsWith('.sql')).sort();
for (const file of files) {
  const [rows] = await connection.query('SELECT id FROM drizzle_migrations WHERE id = ?', [file]);
  if (rows.length) continue;
  const sql = await fs.readFile(path.join(migrationsDir, file), 'utf8');
  await connection.query(sql);
  await connection.query('INSERT INTO drizzle_migrations (id, applied_at) VALUES (?, NOW())', [file]);
  console.log(`Applied migration ${file}`);
}
await connection.end();
console.log('Database migrations are up to date.');
