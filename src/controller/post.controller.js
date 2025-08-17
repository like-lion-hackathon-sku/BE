// src/controller/post.controller.js
import { pool } from '../db.config.js';

/**
 * 테이블: `Post`
 * 컬럼: `post_id`(PK, AUTO_INCREMENT), `title`, `content`, `user_id`, `created_at`
 *  - 다른 환경 호환을 위해 백틱으로 감싸 사용
 *  - 프론트 일관 응답을 위해 alias 사용(id, createdAt 등)
 */

// [GET] /api/posts?page=1&size=10
export const getPosts = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const sizeParam = req.query.size ?? req.query.limit; // ← limit도 허용
    const size = Math.min(50, Math.max(1, parseInt(sizeParam, 10) || 10));
    const offset = (page - 1) * size;

    const [rows] = await pool.query(
      `
      SELECT 
        p.\`post_id\`   AS id,
        p.\`title\`,
        p.\`content\`,
        p.\`user_id\`,
        u.\`nickname\`  AS author,
        p.\`created_at\` AS createdAt
      FROM \`Post\` p
      LEFT JOIN \`users\` u ON u.\`user_id\` = p.\`user_id\`
      ORDER BY p.\`post_id\` DESC
      LIMIT ? OFFSET ?
      `,
      [size, offset]
    );

    // 전체 카운트 (간단버전)
    const [[{ total }]] = await pool.query(`SELECT COUNT(*) AS total FROM \`Post\``);
    const totalPages = Math.max(1, Math.ceil(total / size));

    return res.status(200).json({
      page,
      size,
      total,
      totalPages,
      data: rows,
    });
  } catch (err) {
    console.error('[getPosts] error:', err);
    return res.status(500).json({ message: '게시글 목록 조회에 실패하였습니다.' });
  }
};

// [GET] /api/posts/:postId
export const getPost = async (req, res) => {
  const postId = Number(req.params.postId);
  if (!Number.isFinite(postId) || postId <= 0) {
    return res.status(400).json({ message: 'postId가 올바르지 않습니다.' });
  }

  try {
    const [rows] = await pool.query(
      `
      SELECT 
        p.\`post_id\`   AS id,
        p.\`title\`,
        p.\`content\`,
        p.\`user_id\`,
        u.\`nickname\`  AS author,
        p.\`created_at\` AS createdAt
      FROM \`Post\` p
      LEFT JOIN \`users\` u ON u.\`user_id\` = p.\`user_id\`
      WHERE p.\`post_id\` = ?
      LIMIT 1
      `,
      [postId]
    );
    if (rows.length === 0) {
      return res.status(404).json({ message: '게시글을 찾을 수 없습니다.' });
    }
    return res.status(200).json({ data: rows[0] });
  } catch (err) {
    console.error('[getPost] error:', err);
    return res.status(500).json({ message: '게시글 조회에 실패하였습니다.' });
  }
};

// [POST] /api/posts
// body: { title, content }
// 로그인 필요(미들웨어에서 req.session.user 보장)
export const createPost = async (req, res) => {
  try {
    const title = String(req.body?.title ?? '').trim();
    const content = String(req.body?.content ?? '').trim();
    const user = req.session?.user; // { id, email }

    if (!user?.id) {
      return res.status(401).json({ message: '로그인이 필요합니다.' });
    }
    if (!title || !content) {
      return res.status(400).json({ message: '제목과 내용을 입력하세요.' });
    }

    const [r] = await pool.query(
      `
      INSERT INTO \`Post\` (\`title\`, \`content\`, \`user_id\`, \`created_at\`)
      VALUES (?, ?, ?, NOW())
      `,
      [title, content, user.id]
    );

    return res.status(201).json({
      message: '게시글이 작성되었습니다.',
      id: r.insertId,
    });
  } catch (err) {
    console.error('[createPost] error:', err);
    return res.status(500).json({ message: '게시글 작성에 실패했습니다.' });
  }
};

// [PUT] /api/posts/:postId
export const updatePost = async (req, res) => {
  const postId = Number(req.params.postId);
  if (!Number.isFinite(postId) || postId <= 0) {
    return res.status(400).json({ message: 'postId가 올바르지 않습니다.' });
  }

  const title = String(req.body?.title ?? '').trim();
  const content = String(req.body?.content ?? '').trim();
  if (!title || !content) {
    return res.status(400).json({ message: '제목과 내용을 입력하세요.' });
  }

  try {
    const [result] = await pool.query(
      `
      UPDATE \`Post\`
      SET \`title\` = ?, \`content\` = ?
      WHERE \`post_id\` = ?
      `,
      [title, content, postId]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: '수정할 게시글을 찾을 수 없습니다.' });
    }
    return res.status(200).json({ message: '게시글이 수정되었습니다.' });
  } catch (err) {
    console.error('[updatePost] error:', err);
    return res.status(500).json({ message: '게시글 수정에 실패하였습니다.' });
  }
};

// [DELETE] /api/posts/:postId
export const deletePost = async (req, res) => {
  const postId = Number(req.params.postId);
  if (!Number.isFinite(postId) || postId <= 0) {
    return res.status(400).json({ message: 'postId가 올바르지 않습니다.' });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.query('DELETE FROM `comment` WHERE `post_id` = ?', [postId]); // 1) 댓글 먼저
    const [r] = await conn.query('DELETE FROM `Post` WHERE `post_id` = ?', [postId]); // 2) 글 삭제
    await conn.commit();

    if (r.affectedRows === 0) {
      return res.status(404).json({ message: '삭제할 게시글을 찾을 수 없습니다.' });
    }
    return res.status(200).json({ message: '게시글이 삭제되었습니다.' });
  } catch (err) {
    await conn.rollback();
    console.error('[deletePost] error:', err);
    return res.status(500).json({ message: '게시글 삭제에 실패하였습니다.' });
  } finally {
    conn.release();
  }
};