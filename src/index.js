// src/index.js
import express from 'express';
import session from 'express-session';
import MySQLStoreFactory from 'express-mysql-session';
import helmet from 'helmet';
import 'dotenv/config';
import cors from 'cors';

import { pool } from './db.config.js';
import authRouter from './route/auth.route.js';
import postRouter from './route/post.route.js';
import commentRouter from './route/comment.route.js';

// Swagger (동적)
import swaggerAutogen from 'swagger-autogen';
import swaggerUiExpress from 'swagger-ui-express';

const app = express();

// ──────────────────────────────────────────────
// CORS
// 프론트가 5173에서 뜨므로 localhost/127.0.0.1 둘 다 허용
const ALLOWED_ORIGINS = new Set([
  'http://localhost:5173',
  'http://127.0.0.1:5173',
]);

app.use(cors({
  origin(origin, cb) {
    // 모바일 앱/포스트맨/서버-서버 등 origin이 없는 경우 허용
    if (!origin || ALLOWED_ORIGINS.has(origin)) return cb(null, true);
    return cb(new Error(`CORS blocked for origin: ${origin}`));
  },
  credentials: true,
}));

// ──────────────────────────────────────────────
// 보안 헤더 (정적 파일 제공 안 하면 기본값으로 충분)
app.use(helmet());
// 만약 정적 파일도 같이 서빙한다면 (지금은 아님)
// app.use(helmet({ crossOriginResourcePolicy: false }));

// JSON 파서 (라우터보다 반드시 먼저)
app.use(express.json());

// ──────────────────────────────────────────────
// 세션 스토어 (MySQL)
const MySQLStore = MySQLStoreFactory(session);
const sessionStore = new MySQLStore(
  {
    createDatabaseTable: true,
    schema: {
      tableName: 'sessions',
      columnNames: { session_id: 'session_id', expires: 'expires', data: 'data' },
    },
  },
  pool // mysql2/promise pool
);

// HTTPS 프록시 뒤에서 secure 쿠키 쓸 경우 활성화
// app.set('trust proxy', 1);

app.use(session({
  name: 'sid',
  secret: process.env.SESSION_SECRET ?? 'change-me',
  resave: false,
  saveUninitialized: false,
  store: sessionStore,
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    secure: false, // 프록시 뒤 HTTPS면 true + app.set('trust proxy', 1)
    maxAge: 1000 * 60 * 60 * 24 * 7, // 7일
  },
}));

// ──────────────────────────────────────────────
// 헬스체크
app.get('/health', (req, res) => res.json({ ok: true }));

// 라우터 마운트
app.use('/auth', authRouter);      // POST /auth/register, /auth/login, etc.
app.use('/api/posts', postRouter); // /api/posts/*
app.use('/api', commentRouter);    // /api/posts/:postId/comments

// ──────────────────────────────────────────────
// Swagger UI & OpenAPI JSON
app.use('/docs', swaggerUiExpress.serve, swaggerUiExpress.setup({}, {
  swaggerOptions: { url: '/openapi.json' },
}));

app.get('/openapi.json', async (req, res) => {
  // #swagger.ignore = true
  const options = {
    openapi: '3.0.0',
    disableLogs: true,
    writeOutputFile: false,
  };
  const outputFile = '/dev/null';
  const routes = ['./src/index.js'];

  const port = Number(process.env.PORT ?? 5174);
  const doc = {
    info: { title: 'Time Attack BBS', description: 'Time Attack 팀 게시판 입니다.' },
    host: `localhost:${port}`,
    schemes: ['http'],
  };

  const result = await swaggerAutogen(options)(outputFile, routes, doc);
  res.json(result ? result.data : null);
});

// ──────────────────────────────────────────────
// 404 / 에러 핸들러 (디버깅 유용)
app.use((req, res) => {
  res.status(404).json({ ok: false, message: 'Not Found' });
});

app.use((err, req, res, next) => {
  console.error('[ERROR]', err);
  const status = err.status || 500;
  res.status(status).json({ ok: false, message: err.message || 'Server Error' });
});

// ──────────────────────────────────────────────
// 서버 시작
const PORT = Number(process.env.PORT ?? 3000);
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});