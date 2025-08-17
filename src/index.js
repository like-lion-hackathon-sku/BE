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

/* ─────────────────────────────────────────────
 * 기본 설정
 * ────────────────────────────────────────────*/
const NODE_ENV = process.env.NODE_ENV ?? 'development';
const PORT = Number(process.env.PORT ?? 3000);

// 프록시(예: Nginx) 뒤에서 HTTPS 쓰는 경우에만 1로 설정
if (process.env.TRUST_PROXY === '1') {
  app.set('trust proxy', 1);
}

/* ─────────────────────────────────────────────
 * CORS
 * 기본: 로컬호스트 + Netlify 도메인
 * 추가: FRONTEND_ORIGINS(.env, 쉼표분리)에서 더 허용 가능
 * ────────────────────────────────────────────*/
const defaultOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'https://timeattack01.netlify.app', // ✅ Netlify 프론트
];
const envOrigins = (process.env.FRONTEND_ORIGINS ?? '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);
const ALLOWED_ORIGINS = new Set([...defaultOrigins, ...envOrigins]);

app.use(cors({
  origin(origin, cb) {
    // 모바일 앱/포스트맨/서버-서버 등 origin이 없는 경우 허용
    if (!origin || ALLOWED_ORIGINS.has(origin)) return cb(null, true);
    return cb(new Error(`CORS blocked for origin: ${origin}`));
  },
  credentials: true,
}));

/* ─────────────────────────────────────────────
 * 보안 헤더
 * ────────────────────────────────────────────*/
app.use(helmet());

/* ─────────────────────────────────────────────
 * 바디 파서
 * ────────────────────────────────────────────*/
app.use(express.json());

/* ─────────────────────────────────────────────
 * 세션 (MySQL Store)
 * ────────────────────────────────────────────*/
const MySQLStore = MySQLStoreFactory(session);
const sessionStore = new MySQLStore(
  {
    createDatabaseTable: true,
    schema: {
      tableName: 'sessions',
      columnNames: { session_id: 'session_id', expires: 'expires', data: 'data' },
    },
  },
  pool
);

// 운영 HTTPS + 프록시 환경에서는 secure:true + trust proxy 필요
const useSecureCookie = NODE_ENV === 'production' && process.env.USE_SECURE_COOKIE === '1';

app.use(session({
  name: 'sid',
  secret: process.env.SESSION_SECRET ?? 'change-me',
  resave: false,
  saveUninitialized: false,
  store: sessionStore,
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    secure: useSecureCookie, // 운영 HTTPS에서만 true 권장
    maxAge: 1000 * 60 * 60 * 24 * 7, // 7일
  },
}));

/* ─────────────────────────────────────────────
 * 프리플라이트(OPTIONS) 빠른 응답 (선택)
 * ────────────────────────────────────────────*/
app.options('*', cors());

/* ─────────────────────────────────────────────
 * 헬스체크 & 루트 안내
 * ────────────────────────────────────────────*/
app.get('/health', (req, res) => res.json({ ok: true, env: NODE_ENV }));

// 루트 접근 시 404 대신 문구
app.get('/', (req, res) => {
  res.status(200).send('Backend is running. See /docs for Swagger UI.');
});

/* ─────────────────────────────────────────────
 * 라우터
 * ────────────────────────────────────────────*/
app.use('/auth', authRouter);      // POST /auth/register, /auth/login, /auth/logout, /auth/me
app.use('/api/posts', postRouter); // /api/posts/*
app.use('/api', commentRouter);    // /api/posts/:postId/comments

/* ─────────────────────────────────────────────
 * Swagger UI & OpenAPI JSON (동적 생성)
 * ────────────────────────────────────────────*/
app.use('/docs', swaggerUiExpress.serve, swaggerUiExpress.setup({}, {
  swaggerOptions: { url: '/openapi.json' },
}));

app.get('/openapi.json', async (req, res, next) => {
  try {
    const options = {
      openapi: '3.0.0',
      disableLogs: true,
      writeOutputFile: false,
    };
    const outputFile = '/dev/null';
    const routes = ['./src/index.js'];

    // 요청 기준으로 host/프로토콜 계산
    const scheme = (req.headers['x-forwarded-proto'] ?? req.protocol) || 'http';
    const host = req.get('host') ?? `localhost:${PORT}`;

    const doc = {
      info: { title: 'Time Attack BBS', description: 'Time Attack 팀 게시판 입니다.' },
      host,
      schemes: [scheme],
    };

    const result = await swaggerAutogen(options)(outputFile, routes, doc);
    res.json(result ? result.data : null);
  } catch (err) {
    next(err);
  }
});

/* ─────────────────────────────────────────────
 * 404 / 에러 핸들러
 * ────────────────────────────────────────────*/
app.use((req, res) => {
  res.status(404).json({ ok: false, message: 'Not Found' });
});

app.use((err, req, res, next) => {
  const status = err.status || 500;
  const payload = { ok: false, message: err.message || 'Server Error' };
  if (NODE_ENV !== 'production') {
    payload.stack = err.stack;
  }
  console.error('[ERROR]', err);
  res.status(status).json(payload);
});

/* ─────────────────────────────────────────────
 * 서버 시작
 * ────────────────────────────────────────────*/
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});