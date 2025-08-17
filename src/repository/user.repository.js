import { pool } from '../db.config.js';

export async function findByEmail(email) {
  const [rows] = await pool.query(
    `SELECT
       user_id     AS id,
       email       AS email,
       password    AS password_hash,
       nickname
     FROM users
     WHERE email = ?
     LIMIT 1`,
    [email]
  );  
  return rows[0] ?? null;

}

export async function createUser({ email, password_hash, nickname }) {
  const [r] = await pool.query(
    `INSERT INTO users (email, password, nickname)
     VALUES (?, ?, COALESCE(?, ''))`,
    [email, password_hash, nickname]
  );
  return r.insertId;           // user_id가 AUTO_INCREMENT면 여기 값이 PK
}