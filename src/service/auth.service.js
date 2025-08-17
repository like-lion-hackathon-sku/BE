import bcrypt from 'bcrypt';
import * as Users from '../repository/user.repository.js';

// 로그인: 그대로 OK (레포에서 alias로 password_hash 받아오는 전제)
export async function login(user_id, password) {
  const email = String(user_id).trim().toLowerCase();
  const user = await Users.findByEmail(email);
  if (!user) throw { code: 'AUTH_INVALID' };

  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) throw { code: 'AUTH_INVALID' };

  // 컨트롤러/프론트가 기대하는 최소 정보 반환
  return { id: user.id, email: user.email, nickname: user.nickname };
}

// 회원가입: create → createUser 로, 해시를 password_hash로 넘김
// nickname을 쓰면 세 번째 인자로 받기 (없으면 undefined/null)
export async function register(user_id, password, nickname = null) {
  const email = String(user_id).trim().toLowerCase();

  const exists = await Users.findByEmail(email);
  if (exists) throw { code: 'AUTH_DUP' };

  const hash = await bcrypt.hash(password, 12);

  // 레포지토리에서 INSERT INTO users (email, password, nickname) VALUES (...)
  const insertId = await Users.createUser({
    email,
    password_hash: hash,
    nickname,
  });

  // 필요시 생성 결과 반환
  return { id: insertId, email };
}

// 중복 확인: 그대로 OK
export async function isDuplicated(user_id) {
  const email = String(user_id).trim().toLowerCase();
  const exists = await Users.findByEmail(email);
  return Boolean(exists);
}