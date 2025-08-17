// node >=18
import mysql from 'mysql2/promise';
import 'dotenv/config';

// A안 쓴다면 B로:
const useUrl = !!process.env.DATABASE_URL;
const cfg = useUrl
  ? process.env.DATABASE_URL
  : {
      host: process.env.DB_HOST || '127.0.0.1',
      port: Number(process.env.DB_PORT || 3306),
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'test',
    };

console.log('CFG =', cfg);

try {
  const pool = mysql.createPool(cfg);
  const [rows] = await pool.query('SELECT 1 AS ok');
  console.log('DB OK:', rows);
  process.exit(0);
} catch (e) {
  console.error('DB FAIL:', e.code, e.message);
  process.exit(1);
}