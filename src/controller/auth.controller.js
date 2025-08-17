// src/controller/auth.controller.js
import * as AuthService from '../service/auth.service.js';

// 공통 헬퍼: user_id 꺼내기 + 정규화(trim + lower)
function pickUserId(req) {
  const raw =
    req.body?.user_id ??
    req.body?.email ??
    req.query?.user_id ??
    req.params?.user_id ??
    '';
  return String(raw).trim().toLowerCase();
}

export async function login(req, res) {
  try {
    const email = pickUserId(req);
    const { password} = req.body ?? {};
    if (!email || !password) {
      return res.status(400).json({ ok: false, message: '아이디/비밀번호를 입력하세요.' });
    }

    const { id, email: normalizedEmail,nickname} = await AuthService.login(email, password);
    req.session.user = { id, email: normalizedEmail, nickname };

    return res.json({
      ok: true,
      user: { id, email: normalizedEmail, nickname },
    });
  } catch (err) {
    if (err?.code === 'AUTH_INVALID') {
      return res.status(401).json({ ok: false, message: '이메일 또는 비밀번호가 올바르지 않습니다.' });
    }
    console.error('[LOGIN ERROR]', err);
    return res.status(500).json({ ok: false, message: '서버 에러' });
  }
}

export async function logout(req, res) {
  try {
    // 세션 파괴 + sid 쿠키 제거
    const sidName = (req.session?.cookie?.name) || 'sid';
    req.session?.destroy(() => {});
    res.clearCookie(sidName, {
      httpOnly: true,
      sameSite: 'lax',
      secure: false,
    });
    return res.json({ ok: true, message: '로그아웃 완료' });
  } catch (e) {
    console.error('[LOGOUT ERROR]', e);
    return res.status(500).json({ ok: false, message: '서버 에러' });
  }
}

export async function register(req, res) {
  try {
    const email = pickUserId(req);
    const { password, nickname } = req.body ?? {};
    if (!email || !password) {
      return res.status(400).json({ ok: false, message: 'user_id, password required' });
    }

    await AuthService.register(email, password, nickname);
    return res.status(201).json({ ok: true, message: 'Registered' });
  } catch (err) {
    if (err?.code === 'AUTH_DUP') {
      return res.status(409).json({ ok: false, message: '이미 가입된 이메일입니다.' });
    }
    console.error('[REGISTER ERROR]', err);
    return res.status(500).json({ ok: false, message: '서버 에러' });
  }
}

export async function checkDuplication(req, res) {
  try {
    const email = pickUserId(req); // GET ?user_id= / POST body 둘 다 지원
    if (!email) return res.status(400).json({ ok: false, message: 'user_id required' });

    const duplicated = await AuthService.isDuplicated(email);
    return res.json({ ok: true, duplicated });
  } catch (e) {
    console.error('[CHECK DUP ERROR]', e);
    return res.status(500).json({ ok: false, message: '서버 에러' });
  }
}
export async function me(req, res) {
  const user = req.session?.user;         // { id, email }를 로그인에서 넣음
  if (!user) return res.status(401).json({ ok: false, message: 'Unauthorized' });
  return res.json({ ok: true, data: user });
}