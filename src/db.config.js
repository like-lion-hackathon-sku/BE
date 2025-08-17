// src/db.config.js
import 'dotenv/config';
import mysql from 'mysql2/promise';

const {
  DB_HOST = '0.tcp.jp.ngrok.io',
  DB_PORT = 18404,
  DB_USER = 'time',
  DB_PASSWORD = '비밀번호',
  DB_NAME = 'project_board',
} = process.env;
export const pool = mysql.createPool({
  host: DB_HOST,
  port: Number(DB_PORT),
  user: DB_USER,
  password: DB_PASSWORD,
  database: DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});